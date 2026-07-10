"""Refund repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/refunds", methods=["POST"])
def request_refund():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Only patients can request refunds."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    appointment_id = data.get("appointment_id")
    reason = str(data.get("reason") or "").strip()
    notes = str(data.get("notes") or "").strip()
    if not appointment_id:
        return jsonify({"error": "Appointment is required."}), 400
    if reason not in ALLOWED_REFUND_REASONS:
        return jsonify({"error": "Select a valid refund reason."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        ensure_payment_link_columns(cur)
        appointment = load_appointment_for_refund(cur, appointment_id, user.get("user_id"))
        if not appointment:
            cur.close()
            return jsonify({"error": "Appointment not found."}), 404
        payment = latest_successful_payment_for_appointment(cur, appointment_id, user.get("user_id"))
        if not payment:
            cur.close()
            return jsonify({"error": "A successful payment is required before requesting a refund."}), 400
        existing = get_existing_refund_for_payment(cur, appointment_id, payment.get("id"))
        if existing:
            cur.close()
            return jsonify({"error": "A refund request already exists for this appointment.", "refund": existing}), 409

        qualifies, reasons, evidence = appointment_qualifies_for_refund(appointment, payment)
        if not qualifies and reason != "Wrong payment":
            cur.close()
            return jsonify({"error": "This appointment is not eligible for a refund yet.", "reasons": reasons}), 400

        amount = float(payment.get("amount") or 0)
        cur.execute(
            """
            INSERT INTO refund_requests
              (appointment_id, payment_id, patient_id, doctor_id, amount, refund_amount, reason, notes, status, evidence, requested_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending Review', %s, NOW())
            """,
            (
                appointment_id,
                payment.get("id"),
                user.get("user_id"),
                appointment.get("doctor_id") or payment.get("doctor_id"),
                amount,
                amount,
                reason,
                notes or None,
                json.dumps({"system_reasons": reasons, "validation": evidence}),
            )
        )
        refund_id = cur.lastrowid
        mysql.connection.commit()
        cur.close()

        create_user_notification(user.get("user_id"), "Refund submitted", "Your refund request is pending review.", "refund_submitted", reference_id=str(refund_id))
        write_audit_log(user, "REFUND_REQUEST_SUBMITTED", json.dumps({"refund_id": refund_id, "appointment_id": appointment_id}))
        return jsonify({"message": "Refund request submitted.", "refund": {"id": refund_id, "status": "Pending Review"}}), 201
    except Exception as e:
        mysql.connection.rollback()
        log_info(f"REQUEST REFUND ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to submit refund request."}), 500




@app.route("/api/refunds", methods=["GET"])
def get_patient_refunds():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get("role")) != "user":
        return jsonify({"error": "Only patients can view patient refunds."}), 403
    if not mysql:
        return jsonify({"refunds": []})

    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        cur.execute("""
            SELECT rr.id, rr.appointment_id, rr.payment_id, rr.amount, rr.refund_amount, rr.reason,
                   rr.notes, rr.status, rr.requested_at, rr.processed_at, rr.admin_notes,
                   a.appointment_date, a.appointment_time, d.name AS doctor_name
            FROM refund_requests rr
            LEFT JOIN appointments a ON a.id = rr.appointment_id
            LEFT JOIN doctors d ON d.id = rr.doctor_id
            WHERE rr.patient_id = %s
            ORDER BY rr.requested_at DESC, rr.id DESC
        """, (user.get("user_id"),))
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()
        refunds = []
        for row in rows or []:
            record = dict(zip(columns, row))
            refunds.append({
                "id": record.get("id"),
                "appointment_id": record.get("appointment_id"),
                "payment_id": record.get("payment_id"),
                "amount": float(record.get("amount") or 0),
                "refund_amount": float(record.get("refund_amount") or 0),
                "reason": record.get("reason"),
                "notes": record.get("notes"),
                "status": record.get("status"),
                "doctor_name": record.get("doctor_name"),
                "appointment_date": record.get("appointment_date").strftime("%Y-%m-%d") if record.get("appointment_date") else None,
                "appointment_time": format_time(record.get("appointment_time"))[:5] if record.get("appointment_time") else None,
                "requested_at": record.get("requested_at").isoformat() if record.get("requested_at") else None,
                "processed_at": record.get("processed_at").isoformat() if record.get("processed_at") else None,
                "admin_notes": record.get("admin_notes"),
            })
        return jsonify({"refunds": refunds})
    except Exception as e:
        log_info(f"PATIENT REFUNDS ERROR: {e}")
        return jsonify({"refunds": []}), 500




@app.route("/api/admin/refunds", methods=["GET"])
def get_admin_refunds():
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"refunds": [], "total": 0, "page": 1, "limit": 10, "pages": 0})
    try:
        page = max(int(request.args.get("page", 1)), 1)
        limit = min(max(int(request.args.get("limit", 10)), 1), 100)
    except ValueError:
        page, limit = 1, 10
    offset = (page - 1) * limit

    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        where_sql, values = build_admin_refund_filters(request.args)
        count_sql = "SELECT COUNT(*) FROM refund_requests rr LEFT JOIN users up ON up.id = rr.patient_id LEFT JOIN doctors d ON d.id = rr.doctor_id LEFT JOIN appointments a ON a.id = rr.appointment_id LEFT JOIN payments p ON p.id = rr.payment_id"
        cur.execute(f"{count_sql} {where_sql}", tuple(values))
        total = int(cur.fetchone()[0] or 0)
        cur.execute(f"{ADMIN_REFUND_SELECT} {where_sql} ORDER BY rr.requested_at DESC, rr.id DESC LIMIT %s OFFSET %s", tuple(values + [limit, offset]))
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()
        refunds = [serialize_admin_refund(dict(zip(columns, row))) for row in rows or []]
        return jsonify({"refunds": refunds, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit})
    except Exception as e:
        log_info(f"ADMIN REFUNDS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"refunds": [], "total": 0, "page": page, "limit": limit, "pages": 0}), 500




@app.route("/api/admin/refunds/stats", methods=["GET"])
def get_admin_refund_stats():
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({})
    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        cur.execute("""
            SELECT
              SUM(CASE WHEN status = 'Pending Review' THEN 1 ELSE 0 END),
              SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END),
              SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END),
              COALESCE(SUM(CASE WHEN status IN ('Approved','Processing','Completed') THEN refund_amount ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN status = 'Completed' AND YEAR(COALESCE(processed_at, updated_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(processed_at, updated_at)) = MONTH(CURDATE()) THEN refund_amount ELSE 0 END), 0),
              COALESCE(AVG(CASE WHEN processed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, requested_at, processed_at) ELSE NULL END), 0)
            FROM refund_requests
        """)
        row = cur.fetchone() or [0, 0, 0, 0, 0, 0]
        cur.close()
        return jsonify({
            "pending_refunds": int(row[0] or 0),
            "approved_refunds": int(row[1] or 0),
            "rejected_refunds": int(row[2] or 0),
            "total_refund_amount": float(row[3] or 0),
            "refunded_this_month": float(row[4] or 0),
            "average_processing_time": float(row[5] or 0),
        })
    except Exception as e:
        log_info(f"REFUND STATS ERROR: {e}")
        return jsonify({}), 500




@app.route("/api/admin/refunds/<int:refund_id>", methods=["GET"])
def get_admin_refund_detail(refund_id):
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500
    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        cur.execute(f"{ADMIN_REFUND_SELECT} WHERE rr.id = %s", (refund_id,))
        record = fetch_one_dict(cur)
        if not record:
            cur.close()
            return jsonify({"error": "Refund request not found."}), 404
        refund = serialize_admin_refund(record)
        cur.execute("""
            SELECT action, description, created_at
            FROM audit_logs
            WHERE description LIKE %s OR description LIKE %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (f'%"refund_id": {refund_id}%', f'%"refund_id": "{refund_id}"%'))
        audit_rows = cur.fetchall()
        audit_columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()
        timeline = []
        for row in audit_rows or []:
            item = dict(zip(audit_columns, row))
            if item.get("created_at"):
                item["created_at"] = item["created_at"].isoformat()
            timeline.append(item)
        refund["timeline"] = timeline
        refund["evidence"] = json.loads(record.get("evidence") or "{}") if record.get("evidence") else {}
        return jsonify({"refund": refund})
    except Exception as e:
        log_info(f"REFUND DETAIL ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load refund details."}), 500




@app.route("/api/admin/refunds/<int:refund_id>/action", methods=["PUT"])
def update_admin_refund_action(refund_id):
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    action = str(data.get("action") or "").strip().lower()
    admin_notes = str(data.get("admin_notes") or data.get("notes") or "").strip()
    action_map = {
        "approve": "Approved",
        "reject": "Rejected",
        "request_info": "More Information Requested",
        "processing": "Processing",
        "complete": "Completed",
        "cancel": "Cancelled",
    }
    if action not in action_map:
        return jsonify({"error": "Invalid refund action."}), 400
    if action in ["approve", "reject", "request_info"] and not admin_notes:
        return jsonify({"error": "Admin notes are required for this action."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        ensure_payment_link_columns(cur)
        cur.execute("SELECT * FROM refund_requests WHERE id = %s", (refund_id,))
        refund = fetch_one_dict(cur)
        if not refund:
            cur.close()
            return jsonify({"error": "Refund request not found."}), 404
        appointment = load_appointment_for_refund(cur, refund.get("appointment_id"), refund.get("patient_id"))
        payment = latest_successful_payment_for_appointment(cur, refund.get("appointment_id"), refund.get("patient_id"))
        if not payment or int(payment.get("id")) != int(refund.get("payment_id")):
            cur.close()
            return jsonify({"error": "A valid successful payment is required."}), 400
        if str(payment.get("payment_status")) == "Refunded" and action not in ["reject", "cancel"]:
            cur.close()
            return jsonify({"error": "Payment has already been refunded."}), 400
        qualifies, reasons, evidence = appointment_qualifies_for_refund(appointment, payment)
        if action in ["approve", "processing", "complete"] and not qualifies and refund.get("reason") != "Wrong payment":
            cur.close()
            return jsonify({"error": "Refund no longer qualifies.", "reasons": reasons}), 400

        next_status = action_map[action]
        gateway_status = refund.get("gateway_status")
        manual_required = refund.get("manual_refund_required")
        processed_sql = ", processed_at = NOW(), processed_by = %s"
        processed_values = [admin_user.get("user_id")]
        if action == "approve":
            gateway_status = "Manual Refund Required"
            manual_required = 1
        elif action == "complete":
            gateway_status = gateway_status or "Manual Refund Completed"
            manual_required = manual_required if manual_required is not None else 1
            original_amount = round(float(payment.get("amount") or refund.get("amount") or 0), 2)
            already_refunded = round(float(payment.get("refunded_amount") or 0), 2)
            request_refund_amount = round(float(refund.get("refund_amount") or original_amount), 2)
            remaining_refundable = round(max(0, original_amount - already_refunded), 2)
            if request_refund_amount <= 0 or request_refund_amount > remaining_refundable:
                cur.close()
                return jsonify({"error": "Refund amount exceeds the remaining paid amount."}), 400
            new_refunded_total = round(already_refunded + request_refund_amount, 2)
            remaining_amount = round(max(0, original_amount - new_refunded_total), 2)
            new_payment_status = "Refunded" if remaining_amount <= 0 else "Partial Refund"
            new_service_status = "Refunded" if remaining_amount <= 0 else payment.get("service_status") or "Waiting"
            cur.execute(
                """
                UPDATE payments
                SET payment_status = %s,
                    service_status = %s,
                    refund_reason = %s,
                    refund_notes = %s,
                    refunded_amount = %s,
                    net_amount = %s,
                    refunded_by = %s,
                    refunded_at = NOW()
                WHERE id = %s
                """,
                (new_payment_status, new_service_status, refund.get("reason"), admin_notes or refund.get("notes"), new_refunded_total, remaining_amount, admin_user.get("user_id"), refund.get("payment_id"))
            )
            log_financial_event(
                cur,
                refund.get("payment_id"),
                "PAYMENT_REFUNDED" if new_payment_status == "Refunded" else "PAYMENT_PARTIAL_REFUND",
                original_amount,
                request_refund_amount,
                remaining_amount,
                reason=refund.get("reason"),
                approved_by=admin_user.get("user_id"),
                metadata={"refund_id": refund_id, "admin_notes": admin_notes, "previous_refunded_amount": already_refunded, "total_refunded_amount": new_refunded_total},
            )
        elif action == "cancel":
            if str(refund.get("status")) != "Completed":
                cur.close()
                return jsonify({"error": "Only a completed refund can be cancelled."}), 400
            original_amount = round(float(payment.get("amount") or refund.get("amount") or 0), 2)
            already_refunded = round(float(payment.get("refunded_amount") or 0), 2)
            reversal_amount = round(float(refund.get("refund_amount") or original_amount), 2)
            if reversal_amount <= 0 or reversal_amount > already_refunded:
                cur.close()
                return jsonify({"error": "Refund reversal amount is inconsistent with the payment ledger."}), 409
            new_refunded_total = round(max(0, already_refunded - reversal_amount), 2)
            remaining_amount = round(max(0, original_amount - new_refunded_total), 2)
            new_payment_status = "Paid" if new_refunded_total <= 0 else "Partial Refund"
            cur.execute(
                """
                UPDATE payments
                SET payment_status = %s,
                    service_status = CASE WHEN service_status = 'Refunded' THEN 'Waiting' ELSE service_status END,
                    refunded_amount = %s,
                    net_amount = %s,
                    refund_notes = %s,
                    refunded_by = %s,
                    refunded_at = NOW()
                WHERE id = %s
                """,
                (new_payment_status, new_refunded_total, remaining_amount, admin_notes or "Refund cancelled", admin_user.get("user_id"), refund.get("payment_id")),
            )
            log_financial_event(
                cur,
                refund.get("payment_id"),
                "REFUND_CANCELLED",
                original_amount,
                -reversal_amount,
                remaining_amount,
                reason=admin_notes or "Refund cancelled",
                approved_by=admin_user.get("user_id"),
                metadata={"refund_id": refund_id, "restored_amount": reversal_amount, "total_refunded_amount": new_refunded_total},
            )
        elif action in ["processing", "request_info"]:
            processed_sql = ", processed_by = %s"

        cur.execute(
            f"""
            UPDATE refund_requests
            SET status = %s,
                admin_notes = %s,
                gateway_status = %s,
                manual_refund_required = %s,
                evidence = %s
                {processed_sql}
            WHERE id = %s
            """,
            tuple([next_status, admin_notes or refund.get("admin_notes"), gateway_status, manual_required, json.dumps({"system_reasons": reasons, "validation": evidence})] + processed_values + [refund_id])
        )
        mysql.connection.commit()
        cur.close()

        notification_map = {
            "approve": ("Refund approved", "Your refund was approved and is awaiting processing.", "refund_approved"),
            "reject": ("Refund rejected", "Your refund request was rejected.", "refund_rejected"),
            "request_info": ("Refund information requested", "Admin requested more information for your refund.", "refund_information_requested"),
            "processing": ("Refund processing", "Your refund is now being processed.", "refund_processing"),
            "cancel": ("Refund cancelled", "The completed refund was cancelled and the payment balance was restored.", "refund_cancelled"),
            "complete": ("Refund completed", "Your refund has been completed.", "refund_completed"),
        }
        title, message, notification_type = notification_map[action]
        create_user_notification(refund.get("patient_id"), title, message, notification_type, reference_id=str(refund_id))
        if action in ["approve", "complete"]:
            notify_doctor_for_refund(refund.get("doctor_id"), "Refund approved", "A refund was approved for one of your appointments.", "refund_approved")
        write_audit_log(admin_user, f"REFUND_{next_status.upper().replace(' ', '_')}", json.dumps({
            "refund_id": refund_id,
            "appointment_id": refund.get("appointment_id"),
            "payment_id": refund.get("payment_id"),
            "status": next_status,
            "admin_notes": admin_notes,
            "manual_refund_required": bool(manual_required),
        }))
        return jsonify({"message": f"Refund marked {next_status}.", "status": next_status})
    except Exception as e:
        mysql.connection.rollback()
        log_info(f"REFUND ACTION ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update refund request."}), 500




@app.route("/api/admin/refunds/export", methods=["GET"])
def export_admin_refunds():
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    export_format = str(request.args.get("format") or "csv").lower()
    if export_format not in ["csv", "excel", "pdf"]:
        return jsonify({"error": "Unsupported export format."}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_refund_requests_table(cur)
        where_sql, values = build_admin_refund_filters(request.args)
        cur.execute(f"{ADMIN_REFUND_SELECT} {where_sql} ORDER BY rr.requested_at DESC, rr.id DESC", tuple(values))
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()
        records = [serialize_admin_refund(dict(zip(columns, row))) for row in rows or []]
        headers = ["Refund ID", "Patient", "Doctor", "Appointment", "Amount", "Refund Amount", "Payment Method", "Reason", "Request Date", "Status", "Admin"]
        csv_lines = [",".join(headers)]
        for item in records:
            values = [
                item["refund_id"],
                item["patient"]["name"],
                item["doctor"]["name"],
                str(item["appointment_id"]),
                f"{item['amount']:.2f}",
                f"{item['refund_amount']:.2f}",
                item.get("payment_method") or "",
                item.get("reason") or "",
                item.get("requested_at") or "",
                item.get("status") or "",
                item.get("admin") or "",
            ]
            csv_lines.append(",".join('"' + str(value).replace('"', '""') + '"' for value in values))
        content = "\n".join(csv_lines)
        if export_format == "pdf":
            content = simple_pdf_bytes("AnxietyCare Refund Requests", csv_lines)
            mimetype = "application/pdf"
            filename = "refund_requests.pdf"
        elif export_format == "excel":
            mimetype = "application/vnd.ms-excel"
            filename = "refund_requests.xls"
        else:
            mimetype = "text/csv"
            filename = "refund_requests.csv"
        return Response(content, mimetype=mimetype, headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e:
        log_info(f"REFUND EXPORT ERROR: {e}")
        return jsonify({"error": "Unable to export refunds."}), 500




