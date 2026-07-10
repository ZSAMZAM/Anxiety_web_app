"""Report repository handlers."""

from utils.runtime import *  # noqa: F401,F403


def _treatment_plan_payload(report):
    data = report.get("report_data") or {}
    medications = report.get("medications") or []
    if not medications and report.get("prescription"):
        medications = [item.strip() for item in str(report.get("prescription") or "").replace(",", "\n").splitlines() if item.strip()]
    recommendations = report.get("recommendations") or []
    if not recommendations and report.get("follow_up_recommendation"):
        recommendations = [str(report.get("follow_up_recommendation"))]
    lifestyle_advice = report.get("lifestyle_advice") or report_data_value(data, "lifestyle_advice", "lifestyleAdvice", "lifestyle", default=[]) or []
    if isinstance(lifestyle_advice, str):
        lifestyle_advice = [item.strip() for item in lifestyle_advice.replace(",", "\n").splitlines() if item.strip()]
    return {
        "id": report.get("id"),
        "report_id": report.get("report_id") or str(report.get("id") or ""),
        "appointment_id": report.get("appointment_id"),
        "doctor_id": report.get("doctor_id"),
        "doctor_name": report.get("doctor_name") or "Doctor",
        "doctor_specialization": report_data_value(data, "doctor_specialization", default="") or "",
        "doctor_hospital": report_data_value(data, "doctor_hospital", default="") or "",
        "appointment_date": report.get("appointment_date") or "",
        "appointment_time": report.get("appointment_time") or "",
        "assessment_prediction": report.get("prediction_result") or report.get("prediction_type") or "Not recorded",
        "prediction_result": report.get("prediction_result") or report.get("prediction_type") or "Not recorded",
        "prediction_confidence": report.get("prediction_confidence") or report.get("confidence_score") or 0,
        "risk_level": report.get("severity") or report_data_value(data, "risk_level", "severity", default="Not recorded"),
        "diagnosis": report.get("diagnosis") or "Not recorded",
        "treatment_plan": report.get("treatment_plan") or "",
        "recommendations": recommendations,
        "lifestyle_advice": lifestyle_advice,
        "medications": medications,
        "prescription": report.get("prescription") or "",
        "follow_up_date": report.get("follow_up_date") or "",
        "follow_up_recommendation": report.get("follow_up_recommendation") or "",
        "doctor_notes": report.get("doctor_notes") or "",
        "consultation_outcome": report.get("consultation_outcome") or "",
        "summary": report.get("summary") or "",
        "status": report.get("status") or "Completed",
        "created_at": report.get("created_at"),
        "updated_at": report.get("updated_at"),
        "export_pdf_url": f"/api/patient/treatment-plan/{report.get('id')}/export/pdf" if report.get("id") else None,
    }


def _treatment_plan_access_where(user, alias="r"):
    role = canonical_role(user.get("role"))
    if role == "user":
        return f"{alias}.user_id = %s", [user.get("user_id")]
    if role == "doctor":
        return f"{alias}.doctor_id = %s", [user.get("doctor_id")]
    if is_admin_role(role):
        return "1 = 1", []
    return None, []


def _fetch_treatment_plan(cur, user, report_id=None, latest=False):
    where, params = _treatment_plan_access_where(user)
    if not where:
        return None
    if canonical_role(user.get("role")) == "doctor" and not params[0]:
        doctor_id = current_doctor_id_for_reports(cur, user)
        if not doctor_id:
            return None
        params[0] = doctor_id
    clauses = [
        where,
        "COALESCE(r.sandbox_mode, 0) = 0",
        "LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'",
        "LOWER(COALESCE(r.report_type, 'clinical')) = 'clinical'",
    ]
    if report_id is not None:
        clauses.append("r.id = %s")
        params.append(report_id)
    order_limit = "ORDER BY r.created_at DESC, r.id DESC LIMIT 1" if latest or report_id is not None else "ORDER BY r.created_at DESC, r.id DESC"
    query = f"{DOCTOR_REPORTS_SELECT} WHERE {' AND '.join(clauses)} {order_limit}"
    cur.execute(query, params)
    row = cur.fetchone()
    return _treatment_plan_payload(format_doctor_report_row(row)) if row else None


@app.route("/api/patient/treatment-plan/latest", methods=["GET"])
def get_latest_patient_treatment_plan():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Patient access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        plan = _fetch_treatment_plan(cur, user, latest=True)
        cur.close()
        if not plan:
            return jsonify({
                "treatment_plan": None,
                "message": "No treatment plan is available yet. Please wait until your doctor completes your consultation.",
            })
        return jsonify({"treatment_plan": plan})
    except Exception as e:
        log_info(f"PATIENT LATEST TREATMENT PLAN ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load treatment plan."}), 500


@app.route("/api/patient/treatment-plans", methods=["GET"])
def get_patient_treatment_plans():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Patient access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        query = f"""
            {DOCTOR_REPORTS_SELECT}
            WHERE r.user_id = %s
              AND COALESCE(r.sandbox_mode, 0) = 0
              AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'
              AND LOWER(COALESCE(r.report_type, 'clinical')) = 'clinical'
            ORDER BY r.created_at DESC, r.id DESC
        """
        cur.execute(query, (user.get("user_id"),))
        plans = [_treatment_plan_payload(format_doctor_report_row(row)) for row in (cur.fetchall() or [])]
        cur.close()
        return jsonify({"treatment_plans": plans, "total": len(plans)})
    except Exception as e:
        log_info(f"PATIENT TREATMENT PLANS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load treatment plans."}), 500


@app.route("/api/patient/treatment-plan/<int:report_id>", methods=["GET"])
def get_patient_treatment_plan(report_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Patient access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        plan = _fetch_treatment_plan(cur, user, report_id=report_id)
        cur.close()
        if not plan:
            return jsonify({"error": "Treatment plan not found."}), 404
        return jsonify({"treatment_plan": plan})
    except Exception as e:
        log_info(f"PATIENT TREATMENT PLAN DETAILS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load treatment plan."}), 500


@app.route("/api/patient/treatment-plan/<int:report_id>/export/pdf", methods=["GET"])
def export_patient_treatment_plan_pdf(report_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Patient access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        plan = _fetch_treatment_plan(cur, user, report_id=report_id)
        if not plan:
            cur.close()
            return jsonify({"error": "Treatment plan not found."}), 404
        cur.execute(
            "UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s AND user_id = %s AND COALESCE(sandbox_mode, 0) = 0",
            (report_id, user.get("user_id")),
        )
        mysql.connection.commit()
        cur.close()
        lines = [
            f"Report ID: {plan.get('report_id')}",
            f"Doctor: {plan.get('doctor_name')}",
            f"Specialization: {plan.get('doctor_specialization') or 'Not recorded'}",
            f"Appointment: {plan.get('appointment_date') or 'Not recorded'} {plan.get('appointment_time') or ''}",
            f"Assessment Prediction: {plan.get('assessment_prediction')}",
            f"Risk Level: {plan.get('risk_level')}",
            f"Diagnosis: {plan.get('diagnosis')}",
            f"Treatment Plan: {plan.get('treatment_plan') or 'Not recorded'}",
            f"Recommendations: {', '.join(plan.get('recommendations') or []) or 'Not recorded'}",
            f"Lifestyle Advice: {', '.join(plan.get('lifestyle_advice') or []) or 'Not recorded'}",
            f"Medication: {', '.join(plan.get('medications') or []) or 'No medicines prescribed'}",
            f"Follow-up Date: {plan.get('follow_up_date') or 'Not scheduled'}",
            f"Doctor Notes: {plan.get('doctor_notes') or 'Not recorded'}",
            f"Report Created: {plan.get('created_at') or 'Not recorded'}",
        ]
        response = app.make_response(simple_pdf_bytes("ANXIETYCARE TREATMENT PLAN", lines))
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = f"attachment; filename=treatment-plan-{report_id}.pdf"
        return response
    except Exception as e:
        log_info(f"PATIENT TREATMENT PLAN PDF ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to export treatment plan."}), 500

@app.route("/api/doctor/reports", methods=["GET"])
def get_doctor_reports():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))
        offset = (page - 1) * limit
        sort_by = str(request.args.get('sort_by') or 'created_at').strip()
        sort_dir = 'ASC' if str(request.args.get('sort_dir') or 'desc').lower() == 'asc' else 'DESC'
        sort_columns = {
            'created_at': 'r.created_at',
            'appointment_date': 'a.appointment_date',
            'patient': 'COALESCE(u.fullname, r.user_name)',
            'prediction': 'COALESCE(r.prediction_result, r.prediction_type)',
            'status': 'COALESCE(r.report_status, r.status)',
        }
        order_column = sort_columns.get(sort_by, 'r.created_at')
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor profile not found."}), 404
        where_sql, params = build_doctor_reports_filters(doctor_id)
        cur.execute(f"SELECT COUNT(*) FROM reports r LEFT JOIN users u ON u.id = r.user_id WHERE {where_sql}", params)
        total = int(cur.fetchone()[0] or 0)
        query = f"{DOCTOR_REPORTS_SELECT} WHERE {where_sql} ORDER BY {order_column} {sort_dir} LIMIT %s OFFSET %s"
        cur.execute(query, [*params, limit, offset])
        reports = [format_doctor_report_row(row) for row in (cur.fetchall() or [])]
        cur.close()
        return jsonify({
            "reports": reports,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
        })
    except Exception as e:
        log_info(f"DOCTOR REPORTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor reports."}), 500




@app.route("/api/doctor/reports/<int:report_id>", methods=["GET"])
def get_doctor_report_details(report_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        query = f"{DOCTOR_REPORTS_SELECT} WHERE r.id = %s AND r.doctor_id = %s AND COALESCE(r.sandbox_mode, 0) = 0 AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'"
        cur.execute(query, (report_id, doctor_id))
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"error": "Report not found."}), 404
        return jsonify({"report": format_doctor_report_row(row)})
    except Exception as e:
        log_info(f"DOCTOR REPORT DETAILS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load report details."}), 500




@app.route("/api/doctor/reports/<int:report_id>", methods=["PUT"])
def update_doctor_report(report_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    data = request.get_json(force=True) or {}
    allowed_statuses = {"draft": "Draft", "completed": "Completed"}
    requested_status = str(data.get("status") or data.get("report_status") or "").strip().lower()
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        cur.execute("SELECT report_data, summary, report_status, status FROM reports WHERE id = %s AND doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0", (report_id, doctor_id))
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404
        report_data = parse_report_json(row[0])
        editable_fields = [
            "doctor_notes", "diagnosis", "treatment_plan", "follow_up_date",
            "payment_status", "doctor_signature"
        ]
        for field in editable_fields:
            if field in data:
                report_data[field] = data.get(field)
        for field in ["symptoms", "recommendations", "medications"]:
            if field in data:
                value = data.get(field)
                if isinstance(value, list):
                    report_data[field] = value
                else:
                    report_data[field] = [item.strip() for item in str(value or "").split("\n") if item.strip()]
        status_value = allowed_statuses.get(requested_status) or row[2] or row[3] or "Draft"
        diagnosis = report_data.get("diagnosis") or data.get("diagnosis") or "Not recorded"
        notes = report_data.get("doctor_notes") or data.get("doctor_notes") or row[1] or ""
        summary = f"Diagnosis: {diagnosis}. {notes}".strip()
        cur.execute("""
            UPDATE reports
            SET report_status = %s,
                status = %s,
                summary = %s,
                admin_notes = %s,
                report_data = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0
        """, (status_value, status_value, summary, notes, json.dumps(report_data, default=str), report_id, doctor_id))
        mysql.connection.commit()
        query = f"{DOCTOR_REPORTS_SELECT} WHERE r.id = %s AND r.doctor_id = %s AND COALESCE(r.sandbox_mode, 0) = 0 AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'"
        cur.execute(query, (report_id, doctor_id))
        updated = format_doctor_report_row(cur.fetchone())
        cur.close()
        return jsonify({"message": "Report saved successfully.", "report": updated})
    except Exception as e:
        log_info(f"DOCTOR REPORT UPDATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to save report."}), 500




@app.route("/api/doctor/reports/<int:report_id>", methods=["DELETE"])
def delete_doctor_report(report_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        cur.execute("SELECT COALESCE(report_status, status, 'Draft') FROM reports WHERE id = %s AND doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0", (report_id, doctor_id))
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404
        if str(row[0] or "").strip().lower() != "draft":
            cur.close()
            return jsonify({"error": "Only draft reports can be deleted."}), 400
        cur.execute("DELETE FROM reports WHERE id = %s AND doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0", (report_id, doctor_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Draft report deleted successfully.", "id": report_id})
    except Exception as e:
        log_info(f"DOCTOR REPORT DELETE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to delete report."}), 500




@app.route("/api/doctor/reports/stats", methods=["GET"])
def get_doctor_report_stats():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        today = datetime.today().date()
        month_start = today.replace(day=1)
        prev_month_end = month_start - timedelta(days=1)
        prev_month_start = prev_month_end.replace(day=1)
        week_start = today - timedelta(days=today.weekday())
        completed_reports_sql = "doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0 AND LOWER(COALESCE(report_status, status, '')) = 'completed' AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical' AND appointment_id IS NOT NULL"
        cur.execute(f"SELECT COUNT(*) FROM reports WHERE {completed_reports_sql}", (doctor_id,))
        total = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COUNT(*) FROM reports WHERE {completed_reports_sql} AND DATE(created_at) >= %s", (doctor_id, month_start))
        month = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COUNT(*) FROM reports WHERE {completed_reports_sql} AND DATE(created_at) BETWEEN %s AND %s", (doctor_id, prev_month_start, prev_month_end))
        prev_month = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COUNT(*) FROM reports WHERE {completed_reports_sql} AND DATE(created_at) >= %s", (doctor_id, week_start))
        week = int(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT COUNT(*) FROM reports WHERE {completed_reports_sql} AND DATE(created_at) = %s", (doctor_id, today))
        today_count = int(cur.fetchone()[0] or 0)
        cur.execute("SELECT COUNT(*) FROM appointments WHERE doctor_id = %s AND LOWER(COALESCE(status, '')) = 'completed' AND COALESCE(sandbox_mode, 0) = 0", (doctor_id,))
        completed = int(cur.fetchone()[0] or 0)
        cur.execute("SELECT COALESCE(ROUND(AVG(COALESCE(ar.rating, dr.rating)), 1), 0) FROM appointments a LEFT JOIN appointment_ratings ar ON ar.appointment_id = a.id LEFT JOIN doctor_reviews dr ON dr.appointment_id = a.id WHERE a.doctor_id = %s AND COALESCE(a.sandbox_mode, 0) = 0", (doctor_id,))
        avg_rating = float(cur.fetchone()[0] or 0)
        cur.execute(f"SELECT report_data, created_at FROM reports WHERE {completed_reports_sql}", (doctor_id,))
        durations = []
        risk_counts = {"high": 0, "moderate": 0, "low": 0}
        active_days = set()
        for row in (cur.fetchall() or []):
            value = report_data_value(parse_report_json(row[0]), 'consultation_minutes', 'duration_minutes', 'duration', default=0)
            try:
                if float(value) > 0:
                    durations.append(float(value))
            except Exception:
                pass
            risk = str(report_data_value(parse_report_json(row[0]), 'severity', 'risk_level', default='low') or 'low').lower()
            if 'high' in risk:
                risk_counts["high"] += 1
            elif 'moderate' in risk or 'medium' in risk:
                risk_counts["moderate"] += 1
            else:
                risk_counts["low"] += 1
            if row[1]:
                active_days.add(str(row[1])[:10])
        avg_duration = round(sum(durations) / len(durations), 1) if durations else 0
        avg_per_day = round(total / max(1, len(active_days)), 1) if total else 0
        cur.execute("""
            SELECT DATE(created_at), COUNT(*)
            FROM reports
            WHERE doctor_id = %s AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY) AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(report_status, status, '')) = 'completed'
              AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical'
              AND appointment_id IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """, (doctor_id,))
        spark = [{"name": str(row[0])[5:], "value": int(row[1] or 0)} for row in (cur.fetchall() or [])]
        cur.close()
        return jsonify({
            "totalReports": total,
            "completedToday": today_count,
            "reportsThisMonth": month,
            "reportsThisWeek": week,
            "highRiskCases": risk_counts["high"],
            "moderateRiskCases": risk_counts["moderate"],
            "lowRiskCases": risk_counts["low"],
            "pendingReports": 0,
            "averageReportsPerDay": avg_per_day,
            "completedConsultations": completed,
            "averageConsultationTime": avg_duration,
            "averagePatientRating": avg_rating,
            "previousMonthReports": prev_month,
            "monthlyTrend": month - prev_month,
            "sparkline": spark,
        })
    except Exception as e:
        log_info(f"DOCTOR REPORT STATS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load report statistics."}), 500




@app.route("/api/doctor/reports/charts", methods=["GET"])
def get_doctor_report_charts():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%%Y-%%m') AS month, COUNT(*)
            FROM reports
            WHERE doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(report_status, status, '')) = 'completed'
              AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical'
              AND appointment_id IS NOT NULL
            GROUP BY DATE_FORMAT(created_at, '%%Y-%%m')
            ORDER BY month DESC
            LIMIT 6
        """, (doctor_id,))
        monthly = [{"name": row[0], "value": int(row[1] or 0)} for row in reversed(cur.fetchall() or [])]
        cur.execute("""
            SELECT COALESCE(prediction_result, prediction_type, 'Neutral'), COUNT(*)
            FROM reports
            WHERE doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(report_status, status, '')) = 'completed'
              AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical'
              AND appointment_id IS NOT NULL
            GROUP BY COALESCE(prediction_result, prediction_type, 'Neutral')
        """, (doctor_id,))
        prediction = [{"name": row[0] or 'Neutral', "value": int(row[1] or 0)} for row in (cur.fetchall() or [])]
        cur.execute("""
            SELECT DATE(created_at), COUNT(*)
            FROM reports
            WHERE doctor_id = %s AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY) AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(report_status, status, '')) = 'completed'
              AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical'
              AND appointment_id IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """, (doctor_id,))
        weekly = [{"name": str(row[0])[5:], "value": int(row[1] or 0)} for row in (cur.fetchall() or [])]
        cur.execute("SELECT report_data, prediction_type, prediction_result FROM reports WHERE doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0 AND LOWER(COALESCE(report_status, status, '')) = 'completed' AND LOWER(COALESCE(report_type, 'clinical')) = 'clinical' AND appointment_id IS NOT NULL", (doctor_id,))
        diagnosis_counts = {}
        for row in (cur.fetchall() or []):
            data = parse_report_json(row[0])
            diagnosis = report_data_value(data, 'diagnosis', default=row[1] or row[2] or 'Not recorded')
            diagnosis_counts[str(diagnosis or 'Not recorded')] = diagnosis_counts.get(str(diagnosis or 'Not recorded'), 0) + 1
        diagnoses = [{"name": key, "value": value} for key, value in sorted(diagnosis_counts.items(), key=lambda item: item[1], reverse=True)[:6]]
        cur.execute("""
            SELECT DATE_FORMAT(appointment_date, '%%Y-%%m') AS month, COUNT(*)
            FROM appointments
            WHERE doctor_id = %s AND LOWER(COALESCE(status, '')) = 'completed' AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY DATE_FORMAT(appointment_date, '%%Y-%%m')
            ORDER BY month DESC
            LIMIT 6
        """, (doctor_id,))
        completed = [{"name": row[0], "value": int(row[1] or 0)} for row in reversed(cur.fetchall() or [])]
        cur.close()
        return jsonify({
            "monthlyReports": monthly,
            "predictionDistribution": prediction,
            "completedConsultations": completed,
            "mostCommonDiagnoses": diagnoses,
            "weeklyActivity": weekly,
        })
    except Exception as e:
        log_info(f"DOCTOR REPORT CHARTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load report charts."}), 500




@app.route("/api/doctor/reports/<int:report_id>/export/<string:export_format>", methods=["GET"])
def export_doctor_report(report_id, export_format):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        query = f"{DOCTOR_REPORTS_SELECT} WHERE r.id = %s AND r.doctor_id = %s AND COALESCE(r.sandbox_mode, 0) = 0 AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'"
        cur.execute(query, (report_id, doctor_id))
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404
        report = format_doctor_report_row(row)
        cur.execute("UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s AND doctor_id = %s", (report_id, doctor_id))
        mysql.connection.commit()
        cur.close()
        if export_format.lower() == 'csv':
            content = rows_to_csv([report])
            response = app.make_response(content)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.csv'
            return response
        lines = [
            f"Report ID: {report.get('report_id')}",
            f"Patient: {report.get('patient_name')}",
            f"Phone: {report.get('patient_phone')}",
            f"Appointment: {report.get('appointment_date')} {report.get('appointment_time')}",
            f"Diagnosis: {report.get('diagnosis')}",
            f"Prediction: {report.get('prediction_result')} ({report.get('prediction_confidence')}%)",
            f"Severity: {report.get('severity')}",
            f"Doctor Notes: {report.get('doctor_notes') or report.get('summary') or 'No notes recorded.'}",
            f"Treatment Plan: {report.get('treatment_plan') or 'Not recorded.'}",
            f"Recommendations: {report.get('recommendations') or 'Not recorded.'}",
            f"Medications: {report.get('medications') or 'Not recorded.'}",
            f"Follow-up Date: {report.get('follow_up_date') or 'Not recorded.'}",
        ]
        content = simple_pdf_bytes("ANXIETYCARE CLINICAL REPORT", lines) if export_format.lower() == 'pdf' else "\n".join(lines)
        response = app.make_response(content)
        response.headers['Content-Type'] = 'application/pdf' if export_format.lower() == 'pdf' else 'text/plain'
        response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.{export_format.lower()}'
        return response
    except Exception as e:
        log_info(f"DOCTOR REPORT EXPORT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to export report."}), 500




@app.route("/api/doctor/reports/export", methods=["GET"])
def export_doctor_reports_bulk():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        export_format = str(request.args.get('format') or 'csv').lower()
        selected = [item.strip() for item in str(request.args.get('ids') or '').split(',') if item.strip()]
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        doctor_id = current_doctor_id_for_reports(cur, user)
        where_sql, params = build_doctor_reports_filters(doctor_id)
        if selected:
            placeholders = ",".join(["%s"] * len(selected))
            where_sql += f" AND r.id IN ({placeholders})"
            params.extend(selected)
        query = f"{DOCTOR_REPORTS_SELECT} WHERE {where_sql} ORDER BY r.created_at DESC"
        cur.execute(query, params)
        reports = [format_doctor_report_row(row) for row in (cur.fetchall() or [])]
        cur.close()
        if export_format == 'pdf':
            lines = [f"Filtered reports: {len(reports)}"]
            for report in reports[:40]:
                lines.append(
                    f"{report.get('report_id')} | {report.get('patient_name')} | {report.get('appointment_date')} | {report.get('diagnosis')} | {report.get('severity')} | {report.get('status')}"
                )
            response = app.make_response(simple_pdf_bytes("ANXIETYCARE FILTERED REPORTS", lines))
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=doctor-reports.pdf'
            return response
        content = rows_to_csv(reports)
        response = app.make_response(content)
        if export_format in ('excel', 'xlsx'):
            response.headers['Content-Type'] = 'application/vnd.ms-excel'
            response.headers['Content-Disposition'] = 'attachment; filename=doctor-reports.xls'
        else:
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = 'attachment; filename=doctor-reports.csv'
        return response
    except Exception as e:
        log_info(f"DOCTOR REPORT BULK EXPORT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to export reports."}), 500




@app.route("/api/reports", methods=["GET"])
@app.route("/api/admin/reports", methods=["GET"])
def get_admin_reports():
    """Get list of reports with filtering, searching, and pagination"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        prediction_type = request.args.get('type', '').strip()
        report_category = request.args.get('report_category', '').strip().lower()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()

        # Build WHERE clause
        where_clauses = ["COALESCE(sandbox_mode, 0) = 0"]
        params = []

        if search:
            where_clauses.append("(report_id LIKE %s OR user_name LIKE %s OR doctor_name LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if prediction_type:
            where_clauses.append("prediction_type = %s")
            params.append(prediction_type)

        if report_category:
            if report_category == 'payments':
                where_clauses.append("(LOWER(COALESCE(report_type, '')) = 'payment' OR report_id LIKE 'PAY-%')")
            elif report_category == 'appointments':
                where_clauses.append("(LOWER(COALESCE(report_type, '')) = 'appointment' OR LOWER(COALESCE(summary, '')) LIKE %s OR LOWER(COALESCE(summary, '')) LIKE %s)")
                params.extend(["%appointment%", "%booking%"])
            elif report_category == 'prediction':
                where_clauses.append("(LOWER(COALESCE(report_type, 'prediction')) IN ('', 'prediction') AND report_id NOT LIKE 'PAY-%')")

        if start_date:
            where_clauses.append("DATE(created_at) >= %s")
            params.append(start_date)

        if end_date:
            where_clauses.append("DATE(created_at) <= %s")
            params.append(end_date)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Get total count
        count_sql = f"SELECT COUNT(*) FROM reports WHERE {where_sql}"
        cur.execute(count_sql, params)
        total = int(cur.fetchone()[0])

        # Get reports
        reports_sql = f"""
            SELECT id, report_id, user_id, user_name, doctor_id, doctor_name,
                   prediction_type, prediction_result, prediction_confidence, confidence_score,
                   status, report_status, summary, admin_notes, downloads, exported_count,
                   created_at, updated_at, report_type
            FROM reports
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        cur.execute(reports_sql, params)

        reports = []
        for row in cur.fetchall():
            reports.append({
                "id": row[0],
                "report_id": row[1],
                "user_id": row[2],
                "user_name": row[3],
                "doctor_id": row[4],
                "doctor_name": row[5],
                "prediction_type": row[6],
                "prediction_result": row[7],
                "prediction_confidence": row[8],
                "confidence_score": row[9],
                "status": row[10],
                "report_status": row[11],
                "summary": row[12],
                "admin_notes": row[13],
                "downloads": row[14],
                "exported_count": row[15],
                "created_at": str(row[16]) if row[16] else None,
                "updated_at": str(row[17]) if row[17] else None,
                "report_type": row[18],
            })

        cur.close()

        return jsonify({
            "reports": reports,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN REPORTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load reports. Please try again."}), 500




@app.route("/api/reports/<int:report_id>", methods=["GET"])
@app.route("/api/admin/reports/<int:report_id>", methods=["GET"])
def get_admin_report_details(report_id):
    """Get detailed information for a specific report"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, report_id, user_id, user_name, doctor_id, doctor_name,
                   prediction_type, prediction_result, prediction_confidence, confidence_score,
                   status, report_status, summary, admin_notes, report_data, downloads, exported_count,
                   created_at, updated_at, report_type
            FROM reports
            WHERE id = %s
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        report = {
            "id": row[0],
            "report_id": row[1],
            "user_id": row[2],
            "user_name": row[3],
            "doctor_id": row[4],
            "doctor_name": row[5],
            "prediction_type": row[6],
            "prediction_result": row[7],
            "prediction_confidence": row[8],
            "confidence_score": row[9],
            "status": row[10],
            "report_status": row[11],
            "summary": row[12],
            "admin_notes": row[13],
            "report_data": json.loads(row[14]) if row[14] else None,
            "downloads": row[15],
            "exported_count": row[16],
            "created_at": str(row[17]) if row[17] else None,
            "updated_at": str(row[18]) if row[18] else None,
            "report_type": row[19],
        }

        cur.close()
        return jsonify({"report": report})

    except Exception as e:
        log_info(f"âŒ GET REPORT DETAILS ERROR: {e}")
        return jsonify({"error": "Unable to load report details. Please try again."}), 500




@app.route("/api/reports/<int:report_id>", methods=["DELETE"])
@app.route("/api/admin/reports/<int:report_id>", methods=["DELETE"])
def delete_admin_report(report_id):
    """Delete a report from the admin report center."""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "DELETE FROM reports WHERE id = %s AND COALESCE(sandbox_mode, 0) = 0",
            (report_id,)
        )
        deleted = cur.rowcount
        mysql.connection.commit()
        cur.close()

        if deleted == 0:
            return jsonify({"error": "Report not found."}), 404

        return jsonify({"message": "Report deleted successfully.", "id": report_id})
    except Exception as e:
        log_info(f"DELETE REPORT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to delete report."}), 500




@app.route("/api/admin/reports/<int:report_id>/export/pdf", methods=["GET"])
def export_report_pdf(report_id):
    """Export a report as PDF"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT report_id, user_name, prediction_type, prediction_confidence,
                   status, summary, admin_notes, doctor_name, created_at
            FROM reports
            WHERE id = %s
              AND COALESCE(sandbox_mode, 0) = 0
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        # Update download and exported count
        cur.execute("UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s AND COALESCE(sandbox_mode, 0) = 0", (report_id,))
        mysql.connection.commit()
        cur.close()

        # Generate PDF content as formatted text
        pdf_content = f"""
ANXIETY PREDICTION SYSTEM - REPORT
===================================
Report ID: {row[0]}
Generated Date: {row[8]}

USER INFORMATION
----------------
Name: {row[1]}
Status: {row[4]}

PREDICTION DETAILS
------------------
Prediction Type: {row[2]}
Confidence Score: {row[3]}%
Doctor: {row[7] or 'Not Assigned'}

REPORT SUMMARY
--------------
{row[5] or 'No summary available'}

ADMIN NOTES
-----------
{row[6] or 'No notes available'}

===================================
End of Report
"""
        
        # For now, return as text/plain that can be saved as PDF
        # In production, you'd use a library like reportlab or wkhtmltopdf
        response = app.make_response(pdf_content)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.pdf'
        return response

    except Exception as e:
        log_info(f"âŒ EXPORT REPORT PDF ERROR: {e}")
        return jsonify({"error": "Unable to export report as PDF."}), 500




@app.route("/api/admin/reports/<int:report_id>/export/csv", methods=["GET"])
def export_report_csv(report_id):
    """Export a report as CSV"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT report_id, user_name, prediction_type, prediction_confidence,
                   status, summary, admin_notes, doctor_name, created_at
            FROM reports
            WHERE id = %s
              AND COALESCE(sandbox_mode, 0) = 0
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        # Update download and exported count
        cur.execute("UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s AND COALESCE(sandbox_mode, 0) = 0", (report_id,))
        mysql.connection.commit()
        cur.close()

        # Generate CSV content
        csv_content = "Field,Value\n"
        csv_content += f"Report ID,{row[0]}\n"
        csv_content += f"User Name,{row[1]}\n"
        csv_content += f"Prediction Type,{row[2]}\n"
        csv_content += f"Confidence Score,{row[3]}%\n"
        csv_content += f"Status,{row[4]}\n"
        csv_content += f"Doctor,{row[7] or 'Not Assigned'}\n"
        csv_content += f"Created Date,{row[8]}\n"
        csv_content += f"Summary,\"{row[5] or 'No summary available'}\"\n"
        csv_content += f"Admin Notes,\"{row[6] or 'No notes available'}\"\n"

        response = app.make_response(csv_content)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.csv'
        return response

    except Exception as e:
        log_info(f"âŒ EXPORT REPORT CSV ERROR: {e}")
        return jsonify({"error": "Unable to export report as CSV."}), 500




@app.route("/api/admin/reports", methods=["POST"])
@app.route("/api/reports", methods=["POST"])
def create_sample_reports():
    """Reject manual report creation. Reports are created by consultation completion."""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    return jsonify({"error": "Reports are created only after a doctor completes a consultation."}), 405

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
        users = cur.fetchall()

        if not users:
            sample_user_data = [
                ('Amina Yusuf', 'amina.user@example.com'),
                ('Mohamed Ali', 'mohamed.ali@example.com'),
                ('Sara Abdullahi', 'sara.abdullahi@example.com'),
                ('Hassan Omar', 'hassan.omar@example.com'),
                ('Nadia Farah', 'nadia.farah@example.com')
            ]
            for fullname, email in sample_user_data:
                cur.execute(
                    "INSERT IGNORE INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, 'user', 'Active')",
                    (fullname, email, generate_password_hash('Password@123'))
                )
            mysql.connection.commit()
            cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
            users = cur.fetchall()

        prediction_types = ['Anxiety', 'Depression', 'Neutral', 'Wellness']
        statuses = ['Completed', 'Draft', 'Pending', 'Archived']
        doctor_names = ['Dr. Amina Noor', 'Dr. Yusuf Farah', 'Dr. Hana Ali', 'Dr. Abdullahi Omar']

        created_reports = []

        for idx, (user_id, user_name) in enumerate(users):
            report_id = f"RPT-{datetime.now().strftime('%Y%m%d')}-{1000 + idx}"
            prediction_type = prediction_types[idx % len(prediction_types)]
            status = statuses[idx % len(statuses)]
            confidence = min(98, 60 + idx * 8)
            report_date = utc_now_naive() - timedelta(days=idx * 4)

            summary = f"Prediction analysis for {user_name}. This report contains detailed insights into the detected {prediction_type.lower()} patterns based on the assessment results."
            admin_notes = f"Reviewed on {report_date.strftime('%Y-%m-%d')}. Recommendation: Monitor closely."
            report_data = json.dumps({
                'riskLevel': prediction_type,
                'confidence': confidence,
                'recommendations': [
                    'Practice daily breathing exercises.',
                    'Schedule a follow-up consultation.',
                    'Track symptoms in a wellness journal.'
                ]
            })
            exported = idx * 3

            cur.execute("""
                INSERT INTO reports 
                (report_id, user_id, user_name, doctor_name, prediction_type, prediction_result,
                 prediction_confidence, confidence_score, status, report_status, summary,
                 admin_notes, report_data, downloads, exported_count, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                report_id,
                user_id,
                user_name,
                doctor_names[idx % len(doctor_names)],
                prediction_type,
                prediction_type,
                confidence,
                float(confidence),
                status,
                status,
                summary,
                admin_notes,
                report_data,
                exported,
                exported,
                report_date,
                report_date,
            ))

            created_reports.append({
                "id": cur.lastrowid,
                "report_id": report_id,
                "user_name": user_name,
                "prediction_type": prediction_type,
                "status": status
            })

        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": f"Created {len(created_reports)} sample reports",
            "reports": created_reports
        })

    except Exception as e:
        log_info(f"âŒ CREATE SAMPLE REPORTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to create sample reports."}), 500




@app.route("/api/reports/stats", methods=["GET"])
@app.route("/api/admin/reports/stats", methods=["GET"])
def get_report_stats():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT COUNT(*) FROM reports WHERE COALESCE(sandbox_mode, 0) = 0")
        total = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'Completed' AND COALESCE(sandbox_mode, 0) = 0")
        completed = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT AVG(confidence_score) FROM reports WHERE COALESCE(sandbox_mode, 0) = 0")
        avg_confidence = float(cur.fetchone()[0] or 0)

        cur.execute("SELECT SUM(exported_count) FROM reports WHERE COALESCE(sandbox_mode, 0) = 0")
        export_count = int(cur.fetchone()[0] or 0)

        cur.close()

        return jsonify({
            "totalReports": total,
            "generatedReports": completed,
            "predictionAccuracy": round(avg_confidence),
            "exportDownloads": export_count,
        })
    except Exception as e:
        log_info(f"âŒ GET REPORT STATS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load report stats. Please try again."}), 500




@app.route("/api/reports/charts", methods=["GET"])
@app.route("/api/admin/reports/charts", methods=["GET"])
def get_report_charts():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
            FROM reports
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY month
            ORDER BY month
        """)
        monthly_activity = [{"month": row[0], "count": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT prediction_result, COUNT(*) AS count
            FROM reports
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY prediction_result
        """)
        prediction_trends = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT user_name, COUNT(*) AS count
            FROM reports
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY user_name
            ORDER BY count DESC
            LIMIT 6
        """)
        user_analytics = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT prediction_type, COUNT(*) AS count
            FROM reports
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY prediction_type
        """)
        mental_health_stats = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.close()

        return jsonify({
            "monthlyActivity": monthly_activity,
            "predictionTrends": prediction_trends,
            "userAnalytics": user_analytics,
            "mentalHealthStats": mental_health_stats,
        })
    except Exception as e:
        log_info(f"âŒ GET REPORT CHARTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load report charts. Please try again."}), 500




@app.route("/api/reports/export/pdf", methods=["POST"])
@app.route("/api/admin/reports/export/pdf", methods=["POST"])
def export_report_pdf_post():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    report_id = data.get('report_id')
    if not report_id:
        return jsonify({"error": "report_id is required."}), 400

    try:
        return export_report_pdf(int(report_id))
    except Exception as e:
        log_info(f"âŒ EXPORT REPORT PDF POST ERROR: {e}")
        return jsonify({"error": "Unable to export report as PDF."}), 500




@app.route("/api/reports/export/csv", methods=["POST"])
@app.route("/api/admin/reports/export/csv", methods=["POST"])
def export_report_csv_post():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    report_id = data.get('report_id')
    if not report_id:
        return jsonify({"error": "report_id is required."}), 400

    try:
        return export_report_csv(int(report_id))
    except Exception as e:
        log_info(f"âŒ EXPORT REPORT CSV POST ERROR: {e}")
        return jsonify({"error": "Unable to export report as CSV."}), 500




