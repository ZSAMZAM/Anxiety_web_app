"""Appointment repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/admin/appointments", methods=["GET"])
def get_admin_appointments():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)

        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status_filter = request.args.get('status', 'all')

        # Build query
        query = """
            SELECT a.id, a.user_id, a.doctor_name, a.appointment_date, a.appointment_time, a.status, a.created_at,
                   u.fullname, u.phone, a.appointment_end_time,
                   COALESCE(a.extension_minutes, 0), COALESCE(a.emergency_extension, 0),
                   a.extension_reason, a.original_appointment_time, a.original_appointment_end_time,
                   (SELECT h.affected_appointments FROM appointment_extension_history h WHERE h.appointment_id = a.id ORDER BY h.id DESC LIMIT 1),
                   (SELECT h.affected_details FROM appointment_extension_history h WHERE h.appointment_id = a.id ORDER BY h.id DESC LIMIT 1)
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE COALESCE(a.sandbox_mode, 0) = 0
        """
        params = []

        if status_filter != 'all':
            query += " AND a.status = %s"
            params.append(status_filter)

        query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cur.execute(query, params)
        appointments = cur.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE COALESCE(a.sandbox_mode, 0) = 0
        """
        count_params = params[:-2]  # Remove limit and offset
        if status_filter != 'all':
            count_query += " AND a.status = %s"
            count_params = [status_filter]
        else:
            count_params = []

        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]

        cur.close()

        return jsonify({
            "appointments": [{
                "id": a[0],
                "user_id": a[1],
                "doctor_name": a[2],
                "appointment_date": str(a[3]) if a[3] else None,
                "appointment_time": str(a[4]) if a[4] else None,
                "status": a[5],
                "created_at": a[6].isoformat() if a[6] else None,
                "user_name": a[7],
                "user_phone": a[8],
                "appointment_end_time": format_time(a[9])[:5] if a[9] else None,
                "extension_minutes": int(a[10] or 0),
                "emergency_extension": bool(a[11]),
                "extension_reason": a[12],
                "original_appointment_time": format_time(a[13])[:5] if a[13] else None,
                "original_appointment_end_time": format_time(a[14])[:5] if a[14] else None,
                "affected_appointments": int(a[15] or 0),
                "affected_details": json.loads(a[16]) if a[16] else [],
            } for a in appointments],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN APPOINTMENTS ERROR: {e}")
        return jsonify({"error": "Unable to load appointments. Please try again."}), 500




@app.route("/api/admin/consultation-extensions", methods=["GET"])
def get_admin_consultation_extensions():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT
              SUM(CASE WHEN DATE(l.created_at) = CURDATE() THEN 1 ELSE 0 END),
              COUNT(*),
              COALESCE(AVG(l.added_minutes), 0),
              COALESCE(SUM(l.added_minutes), 0)
            FROM consultation_extension_logs l
            INNER JOIN appointments a ON a.id = l.appointment_id
            WHERE COALESCE(a.sandbox_mode, 0) = 0
            """
        )
        stats = cur.fetchone() or (0, 0, 0, 0)

        cur.execute(
            """
            SELECT d.id, COALESCE(d.name, d.username, 'Doctor'),
                   COUNT(*), COALESCE(SUM(l.added_minutes), 0)
            FROM consultation_extension_logs l
            INNER JOIN doctors d ON d.id = l.doctor_id
            INNER JOIN appointments a ON a.id = l.appointment_id
            WHERE COALESCE(a.sandbox_mode, 0) = 0
            GROUP BY d.id, COALESCE(d.name, d.username, 'Doctor')
            ORDER BY COUNT(*) DESC, COALESCE(SUM(l.added_minutes), 0) DESC
            LIMIT 5
            """
        )
        doctor_rows = cur.fetchall() or []

        cur.execute(
            """
            SELECT l.id, l.appointment_id, l.doctor_id,
                   COALESCE(d.name, d.username, a.doctor_name, 'Doctor'),
                   a.user_id, COALESCE(u.fullname, u.username, 'Patient'),
                   a.appointment_date, a.appointment_time, l.original_end_time,
                   l.extended_end_time, l.added_minutes, l.reason, l.created_at,
                   COALESCE(approver.fullname, approver.username, d.name, 'Doctor'), l.status
            FROM consultation_extension_logs l
            INNER JOIN appointments a ON a.id = l.appointment_id
            LEFT JOIN doctors d ON d.id = l.doctor_id
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN users approver ON approver.id = l.created_by
            WHERE COALESCE(a.sandbox_mode, 0) = 0
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT 50
            """
        )
        history_rows = cur.fetchall() or []
        cur.close()

        return jsonify({
            "stats": {
                "emergency_extensions_today": int(stats[0] or 0),
                "total_extended_consultations": int(stats[1] or 0),
                "average_extra_minutes": round(float(stats[2] or 0), 1),
                "total_extra_minutes": int(stats[3] or 0),
            },
            "doctors": [{
                "doctor_id": row[0],
                "doctor_name": row[1],
                "extension_count": int(row[2] or 0),
                "total_minutes": int(row[3] or 0),
            } for row in doctor_rows],
            "history": [{
                "id": row[0],
                "appointment_id": row[1],
                "doctor_id": row[2],
                "doctor_name": row[3],
                "patient_id": row[4],
                "patient_name": row[5],
                "appointment_date": str(row[6]) if row[6] else None,
                "appointment_time": format_time(row[7])[:5] if row[7] else None,
                "original_end_time": format_time(row[8])[:5] if row[8] else None,
                "extended_end_time": format_time(row[9])[:5] if row[9] else None,
                "added_minutes": int(row[10] or 0),
                "reason": row[11],
                "created_at": row[12].isoformat() if row[12] else None,
                "approved_by": row[13],
                "status": row[14] or "Applied",
            } for row in history_rows],
        })
    except Exception as e:
        log_info(f"ADMIN CONSULTATION EXTENSIONS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load consultation extension history."}), 500


@app.route("/api/admin/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment_status(appointment_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    status = data.get('status', '').strip()

    if not status:
        return jsonify({"error": "Status is required."}), 400

    valid_statuses = ['Pending', 'Approved', 'Completed', 'Cancelled']
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        cur.execute("UPDATE appointments SET status = %s WHERE id = %s", (status, appointment_id))
        rows_affected = cur.rowcount
        mysql.connection.commit()
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Appointment not found."}), 404

        return jsonify({
            "message": "Appointment status updated successfully.",
        })
    except Exception as e:
        log_info(f"âŒ UPDATE APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to update appointment."}), 500




@app.route("/api/doctor/appointments", methods=["GET"])
def get_doctor_appointments():
    user = get_current_user()
    if not user or user.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_user_id = user.get('user_id')
        doctor_id = user.get('doctor_id')
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)

        if not doctor_id:
            cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (doctor_user_id,))
            doctor_row = cur.fetchone()
            if not doctor_row:
                cur.close()
                return jsonify({"error": "Active doctor profile not found."}), 403
            doctor_id = doctor_row[0]

        query = """
            SELECT a.id, a.user_id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.status, a.created_at,
                    u.fullname, u.phone AS patient_phone, u.age, u.gender,
                   p.prediction_result, p.confidence_score, p.anxiety_level, p.input_text, p.recommendation,
                   pay.amount, pay.payment_status,
                   r.id AS report_id,
                   a.appointment_end_time, a.duration_minutes,
                   a.original_appointment_time, a.original_appointment_end_time,
                   COALESCE(a.extension_minutes, 0), COALESCE(a.emergency_extension, 0),
                   a.extension_reason
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            INNER JOIN predictions p
              ON p.id = a.prediction_id
             AND p.user_id = a.user_id
             AND p.sharing_status = 'shared_with_doctor'
             AND p.shared_doctor_id = a.doctor_id
            LEFT JOIN (
                SELECT appointment_id, MAX(amount) AS amount, MAX(payment_status) AS payment_status
                FROM payments
                GROUP BY appointment_id
            ) pay ON pay.appointment_id = a.id
            LEFT JOIN reports r
              ON r.appointment_id = a.id
             AND r.doctor_id = a.doctor_id
             AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'
             AND COALESCE(r.sandbox_mode, 0) = 0
            WHERE a.doctor_id = %s
              AND COALESCE(a.sandbox_mode, 0) = 0
              AND LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
              AND LOWER(COALESCE(a.status, '')) IN ('confirmed', 'completed')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        """
        cur.execute(query, (doctor_id,))
        appointments = cur.fetchall()

        appointment_list = []
        patient_ids = set()
        upcoming_count = 0
        pending_count = 0

        for row in appointments:
            appointment = {
                "id": row[0],
                "user_id": row[1],
                "doctor_id": row[2],
                "doctor_name": row[3],
                "phone": row[4],
                "appointment_date": str(row[5]) if row[5] else None,
                "appointment_time": format_time(row[6])[:5] if row[6] else None,
                "status": row[7],
                "created_at": row[8].isoformat() if row[8] else None,
                "patient_name": row[9],
                "patient_phone": row[10] or row[4],
                "patient_age": row[11],
                "patient_gender": row[12],
                "prediction_result": row[13] or row[15],
                "prediction_confidence": float(row[14]) if row[14] is not None else None,
                "risk_level": assessment_risk_level(row[13] or row[15] or '', row[14] or 0),
                "symptoms": row[16] or "",
                "prediction_recommendation": row[17] or "",
                "fee": float(row[18]) if row[18] is not None else 0,
                "payment_status": row[19],
                "report_id": row[20],
                "has_report": row[20] is not None,
                "appointment_end_time": format_time(row[21])[:5] if row[21] else None,
                "duration_minutes": int(row[22] or 30),
                "original_appointment_time": format_time(row[23])[:5] if row[23] else (format_time(row[6])[:5] if row[6] else None),
                "original_appointment_end_time": format_time(row[24])[:5] if row[24] else None,
                "extension_minutes": int(row[25] or 0),
                "emergency_extension": bool(row[26]),
                "extension_reason": row[27],
            }
            appointment_list.append(appointment)
            if appointment["user_id"]:
                patient_ids.add(appointment["user_id"])

            if str(appointment["status"] or '').lower() in ['pending', 'pending payment', 'confirmed']:
                pending_count += 1
            if appointment["appointment_date"] and str(appointment["status"] or '').lower() not in ['completed', 'cancelled', 'rejected']:
                upcoming_count += 1

        summary = {
            "totalAppointments": len(appointment_list),
            "upcomingBookings": upcoming_count,
            "patientCount": len(patient_ids),
            "pendingRequests": pending_count,
        }

        cur.close()

        return jsonify({
            "summary": summary,
            "appointments": appointment_list,
        })
    except Exception as e:
        log_info(f"âŒ GET DOCTOR APPOINTMENTS ERROR: {e}")
        return jsonify({"error": "Unable to load doctor appointments. Please try again."}), 500




@app.route("/api/doctor/appointments/<int:appointment_id>", methods=["PUT"])
def update_doctor_appointment_status(appointment_id):
    user = get_current_user()
    if not user or user.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required."}), 403

    data = request.get_json(force=True) or {}
    status = data.get('status', '').strip()

    if not status:
        return jsonify({"error": "Status is required."}), 400

    status_aliases = {
        'accept': 'Accepted',
        'accepted': 'Accepted',
        'confirm': 'Confirmed',
        'confirmed': 'Confirmed',
        'complete': 'Completed',
        'completed': 'Completed',
        'cancel': 'Cancelled',
        'cancelled': 'Cancelled',
        'canceled': 'Cancelled',
        'reject': 'Rejected',
        'rejected': 'Rejected',
    }
    status = status_aliases.get(status.lower(), status)
    valid_statuses = ['Accepted', 'Confirmed', 'Rejected', 'Cancelled']
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_user_id = user.get('user_id')
        doctor_id = user.get('doctor_id')
        cur = mysql.connection.cursor()
        if not doctor_id:
            cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (doctor_user_id,))
            row = cur.fetchone()
            if not row:
                cur.close()
                return jsonify({"error": "Active doctor profile not found."}), 403
            doctor_id = row[0]

        cur.execute(
            """
            SELECT id, doctor_id, appointment_date, appointment_time, status
            FROM appointments
            WHERE id = %s AND doctor_id = %s
              AND LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
              AND prediction_id IS NOT NULL
              AND LOWER(COALESCE(status, '')) IN ('confirmed', 'accepted', 'completed')
            """,
            (appointment_id, doctor_id)
        )
        appointment_row = cur.fetchone()
        if not appointment_row:
            cur.close()
            return jsonify({"error": "Appointment not found or not assigned to this doctor."}), 404

        _, _, appointment_date, appointment_time, current_status = appointment_row
        current_status_normalized = str(current_status or '').strip().lower()
        if current_status_normalized in ['pending payment', 'reserved']:
            cur.close()
            return jsonify({"error": "Appointment is pending payment and cannot be modified by doctor yet."}), 400

        cur.execute(
            "UPDATE appointments SET status = %s WHERE id = %s AND doctor_id = %s",
            (status, appointment_id, doctor_id)
        )
        rows_affected = cur.rowcount
        mysql.connection.commit()
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Appointment not found or not assigned to this doctor."}), 404

        return jsonify({
            "message": "Appointment status updated successfully.",
        })
    except Exception as e:
        log_info(f"âŒ UPDATE DOCTOR APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to update appointment."}), 500




@app.route("/api/doctor/appointments/<int:appointment_id>/extend", methods=["POST"])
def extend_doctor_appointment(appointment_id):
    user, auth_error = require_roles('doctor')
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    try:
        extension_minutes = int(data.get("minutes"))
    except (TypeError, ValueError):
        return jsonify({"error": "Extension duration must be a whole number of minutes."}), 400
    emergency_mode = bool(data.get("emergency_mode", True))
    reason = str(data.get("reason") or "").strip()[:500]
    if extension_minutes < 1:
        return jsonify({"error": "Extension duration must be at least one minute."}), 400
    if extension_minutes > 60:
        return jsonify({"error": "A single consultation extension cannot exceed 60 minutes."}), 400
    if not reason:
        return jsonify({"error": "Extension reason is required."}), 400

    notifications = []
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        doctor_id = current_doctor_id(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Active doctor profile not found."}), 403

        cur.execute(
            """
            SELECT a.id, a.user_id, a.appointment_date, a.appointment_time,
                   COALESCE(a.appointment_end_time, a.slot_end_time),
                   COALESCE(a.duration_minutes, 30), a.status,
                   COALESCE(a.extension_minutes, 0), COALESCE(a.emergency_extension, 0),
                   COALESCE(d.name, a.doctor_name, 'Doctor')
            FROM appointments a
            LEFT JOIN doctors d ON d.id = a.doctor_id
            WHERE a.id = %s AND a.doctor_id = %s AND COALESCE(a.sandbox_mode, 0) = 0
            FOR UPDATE
            """,
            (appointment_id, doctor_id),
        )
        active = cur.fetchone()
        if not active:
            cur.close()
            return jsonify({"error": "Appointment not found or not assigned to this doctor."}), 404
        status = str(active[6] or "").strip().lower()
        if status not in ["accepted", "confirmed"]:
            cur.close()
            return jsonify({"error": "Only an accepted or confirmed active consultation can be extended."}), 400

        appointment_date = parse_schedule_date(active[2])
        start_time = parse_schedule_time(active[3])
        current_end_time = parse_schedule_time(active[4])
        base_duration = int(active[5] or 30)
        if not appointment_date or not start_time:
            cur.close()
            return jsonify({"error": "Appointment schedule is incomplete."}), 409
        start_dt = datetime.combine(appointment_date, start_time)
        current_end_dt = datetime.combine(appointment_date, current_end_time) if current_end_time else start_dt + timedelta(minutes=base_duration)
        now_dt = datetime.now()
        if now_dt < start_dt:
            cur.close()
            return jsonify({"error": "Future appointments cannot be extended before the consultation starts."}), 400
        if now_dt > current_end_dt:
            cur.close()
            return jsonify({"error": "This consultation has already ended and cannot be extended."}), 400
        new_end_dt = current_end_dt + timedelta(minutes=extension_minutes)
        if new_end_dt.date() != appointment_date:
            cur.close()
            return jsonify({"error": "The extension would move the schedule into the next day."}), 409

        cur.execute(
            """
            SELECT id, user_id, appointment_time,
                   COALESCE(appointment_end_time, slot_end_time), COALESCE(duration_minutes, 30)
            FROM appointments
            WHERE doctor_id = %s AND appointment_date = %s AND appointment_time > %s
              AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'rejected', 'failed', 'expired')
              AND COALESCE(sandbox_mode, 0) = 0
            ORDER BY appointment_time ASC, id ASC
            FOR UPDATE
            """,
            (doctor_id, appointment_date, start_time),
        )
        following = cur.fetchall() or []
        shifted = []
        protected_start = new_end_dt
        for row in following:
            old_start = datetime.combine(appointment_date, parse_schedule_time(row[2]))
            old_end_time = parse_schedule_time(row[3])
            old_end = datetime.combine(appointment_date, old_end_time) if old_end_time else old_start + timedelta(minutes=int(row[4] or 30))
            if old_start >= protected_start:
                break
            delay_minutes = int((protected_start - old_start).total_seconds() // 60)
            new_start = protected_start
            new_end = old_end + timedelta(minutes=delay_minutes)
            if new_end.date() != appointment_date:
                cur.close()
                mysql.connection.rollback()
                return jsonify({"error": "The extension would push a later appointment into the next day."}), 409
            shifted.append({
                "id": row[0], "user_id": row[1],
                "old_start": old_start, "old_end": old_end,
                "new_start": new_start, "new_end": new_end,
                "delay_minutes": delay_minutes,
            })
            protected_start = new_end

        affected_ids = [appointment_id] + [item["id"] for item in shifted]
        placeholders = ",".join(["%s"] * len(affected_ids))
        cur.execute(f"DELETE FROM appointment_slots WHERE appointment_id IN ({placeholders})", tuple(affected_ids))

        total_extension = int(active[7] or 0) + extension_minutes
        total_duration = int((new_end_dt - start_dt).total_seconds() // 60)
        cur.execute(
            """
            UPDATE appointments
            SET original_appointment_time = COALESCE(original_appointment_time, appointment_time),
                original_appointment_end_time = COALESCE(original_appointment_end_time, appointment_end_time, slot_end_time),
                appointment_end_time = %s, slot_end_time = %s, duration_minutes = %s,
                extension_minutes = %s, emergency_extension = %s, extension_reason = %s
            WHERE id = %s AND doctor_id = %s
            """,
            (new_end_dt.time(), new_end_dt.time(), total_duration, total_extension, 1 if emergency_mode else int(active[8] or 0), reason or None, appointment_id, doctor_id),
        )
        # Preserve emergency mode once any extension is marked as an emergency.
        if emergency_mode:
            cur.execute("UPDATE appointments SET emergency_extension = 1 WHERE id = %s", (appointment_id,))

        for item in shifted:
            cur.execute(
                """
                UPDATE appointments
                SET original_appointment_time = COALESCE(original_appointment_time, appointment_time),
                    original_appointment_end_time = COALESCE(original_appointment_end_time, appointment_end_time, slot_end_time),
                    appointment_time = %s, appointment_end_time = %s, slot_end_time = %s,
                    extension_minutes = COALESCE(extension_minutes, 0) + %s,
                    emergency_extension = 1,
                    extension_reason = %s
                WHERE id = %s AND doctor_id = %s
                """,
                (
                    item["new_start"].time(),
                    item["new_end"].time(),
                    item["new_end"].time(),
                    item["delay_minutes"],
                    f"Delayed {item['delay_minutes']} minutes because the doctor extended appointment #{appointment_id}.",
                    item["id"],
                    doctor_id,
                ),
            )
            notifications.append((item["user_id"], item["new_start"], item["delay_minutes"], active[9], emergency_mode))

        scheduled = [{"id": appointment_id, "start": start_dt, "end": new_end_dt, "duration": total_duration}]
        scheduled.extend({"id": item["id"], "start": item["new_start"], "end": item["new_end"], "duration": int((item["new_end"] - item["new_start"]).total_seconds() // 60)} for item in shifted)
        for item in scheduled:
            cur.execute(
                """
                INSERT INTO appointment_slots
                    (doctor_id, appointment_date, start_time, end_time, duration_minutes, status, appointment_id)
                VALUES (%s, %s, %s, %s, %s, 'booked', %s)
                ON DUPLICATE KEY UPDATE end_time = VALUES(end_time), duration_minutes = VALUES(duration_minutes), status = 'booked', appointment_id = VALUES(appointment_id)
                """,
                (doctor_id, appointment_date, item["start"].time(), item["end"].time(), item["duration"], item["id"]),
            )

        affected_details = [{
            "appointment_id": item["id"],
            "old_time": item["old_start"].strftime("%H:%M"),
            "new_time": item["new_start"].strftime("%H:%M"),
            "delay_minutes": item["delay_minutes"],
        } for item in shifted]
        cur.execute(
            """
            INSERT INTO appointment_extension_history
                (appointment_id, doctor_id, extension_minutes, reason, emergency_mode,
                 previous_end_time, new_end_time, total_consultation_minutes,
                 affected_appointments, affected_details, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (appointment_id, doctor_id, extension_minutes, reason or None, 1 if emergency_mode else 0,
             current_end_dt.time(), new_end_dt.time(), total_duration, len(shifted), json.dumps(affected_details), user.get("user_id")),
        )
        cur.execute(
            """
            INSERT INTO consultation_extension_logs
                (appointment_id, doctor_id, original_end_time, extended_end_time, added_minutes, reason, created_by, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Applied')
            """,
            (appointment_id, doctor_id, current_end_dt.time(), new_end_dt.time(), extension_minutes, reason or None, user.get("user_id")),
        )
        mysql.connection.commit()
        cur.close()

        for patient_id, new_start, delay_minutes, doctor_name, emergency in notifications:
            if patient_id:
                try:
                    create_user_notification(
                        patient_id,
                        "Appointment delayed",
                        f"Your therapist needs additional time with the previous patient. Your appointment with Dr. {doctor_name} has been delayed by {delay_minutes} minutes. Your new appointment time is {new_start.strftime('%I:%M %p')}.",
                        "appointment_rescheduled",
                    )
                except Exception as notification_error:
                    log_info(f"APPOINTMENT SHIFT NOTIFICATION ERROR: {notification_error}")

        return jsonify({
            "message": "Consultation extended and following appointments rescheduled.",
            "appointment_id": appointment_id,
            "appointment_time": start_dt.strftime("%H:%M"),
            "appointment_end_time": new_end_dt.strftime("%H:%M"),
            "extension_minutes": total_extension,
            "total_consultation_minutes": total_duration,
            "emergency_extension": emergency_mode,
            "affected_appointments": affected_details,
        })
    except Exception as e:
        mysql.connection.rollback()
        log_info(f"EXTEND DOCTOR APPOINTMENT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to extend this consultation safely."}), 500


# Consultation completion is the only doctor-facing path that creates a report.


@app.route("/api/doctor/appointments/<int:appointment_id>/consultation", methods=["POST"])
def complete_doctor_consultation(appointment_id):
    user = get_current_user()
    if not user or canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Doctor access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    payload = request.get_json(force=True) or {}
    required_fields = {
        "symptoms": "Symptoms",
        "diagnosis": "Diagnosis",
        "treatment_plan": "Treatment plan",
        "prescription": "Prescription",
        "doctor_notes": "Doctor notes",
        "follow_up_recommendation": "Follow-up recommendation",
        "consultation_outcome": "Consultation outcome",
    }
    missing = []
    for field, label in required_fields.items():
        value = payload.get(field)
        if isinstance(value, list):
            empty = not [str(item).strip() for item in value if str(item).strip()]
        else:
            empty = not str(value or "").strip()
        if empty:
            missing.append(label)
    if missing:
        return jsonify({"error": f"Required fields missing: {', '.join(missing)}."}), 400

    def text_value(key):
        return str(payload.get(key) or "").strip()

    def list_value(key):
        value = payload.get(key)
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [item.strip() for item in str(value or "").replace(",", "\n").splitlines() if item.strip()]

    try:
        cur = mysql.connection.cursor()
        ensure_reports_runtime_columns(cur)
        ensure_appointment_completion_columns(cur)
        doctor_user_id = user.get('user_id')
        doctor_id = user.get('doctor_id')
        if not doctor_id:
            cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (doctor_user_id,))
            row = cur.fetchone()
            if not row:
                cur.close()
                return jsonify({"error": "Active doctor profile not found."}), 403
            doctor_id = row[0]

        cur.execute("""
            SELECT
              a.id, a.user_id, a.doctor_id, a.doctor_name, a.phone,
              a.appointment_date, a.appointment_time, a.status, a.payment_status, a.notes,
              COALESCE(u.fullname, u.username) AS patient_name, u.phone AS patient_phone,
              u.email, u.age, u.gender, u.avatar,
              COALESCE(d.name, a.doctor_name) AS doctor_display_name,
              COALESCE(d.specialization, d.specialty) AS doctor_specialization,
              d.hospital_name,
              p.id AS prediction_id, p.input_text, p.prediction_result, p.confidence_score,
              p.anxiety_level, p.recommendation, p.created_at AS prediction_created_at
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN doctors d ON d.id = a.doctor_id
            INNER JOIN predictions p
              ON p.id = a.prediction_id
             AND p.user_id = a.user_id
             AND p.sharing_status = 'shared_with_doctor'
             AND p.shared_doctor_id = a.doctor_id
            WHERE a.id = %s AND a.doctor_id = %s AND COALESCE(a.sandbox_mode, 0) = 0
            LIMIT 1
        """, (appointment_id, doctor_id))
        row = fetch_one_dict(cur)
        if not row:
            cur.close()
            return jsonify({"error": "Appointment not found or not assigned to this doctor."}), 404

        current_status = str(row.get("status") or "").strip().lower()
        if current_status in ("cancelled", "canceled", "rejected", "pending", "pending payment", "reserved", "failed", "expired"):
            cur.close()
            return jsonify({"error": "Only accepted, confirmed, or completed appointments can start consultation."}), 400

        if not appointment_has_successful_payment(cur, appointment_id) or str(row.get("payment_status") or "").strip().lower() not in ["paid", "completed", "success", "successful"]:
            cur.close()
            return jsonify({"error": "Payment must be completed before consultation can be completed."}), 400

        if not row.get("prediction_id"):
            cur.close()
            return jsonify({"error": "Patient assessment prediction is required before creating a consultation report."}), 400

        cur.execute("SELECT id FROM reports WHERE appointment_id = %s AND doctor_id = %s AND COALESCE(sandbox_mode, 0) = 0", (appointment_id, doctor_id))
        existing = cur.fetchone()
        if existing:
            cur.close()
            return jsonify({"error": "A completed consultation report already exists for this appointment.", "report_id": existing[0]}), 409

        prediction_result = text_value("prediction_result") or row.get("prediction_result") or row.get("anxiety_level") or "Not recorded"
        confidence = normalize_report_confidence(payload.get("confidence_score", row.get("confidence_score")))
        risk_level = text_value("risk_level") or assessment_risk_level(prediction_result, confidence / 100 if confidence > 1 else confidence)
        appointment_date = format_date(row.get("appointment_date"))
        appointment_time = format_time(row.get("appointment_time"))[:5] if row.get("appointment_time") else ""
        symptoms = list_value("symptoms")
        recommendations = list_value("follow_up_recommendation")
        lifestyle_advice = list_value("lifestyle_advice")
        medications = list_value("prescription")
        diagnosis = text_value("diagnosis")
        treatment_plan = text_value("treatment_plan")
        doctor_notes = text_value("doctor_notes")
        consultation_outcome = text_value("consultation_outcome")
        completed_at = utc_now_naive()
        report_public_id = f"RPT-{completed_at.strftime('%Y%m%d')}-{int(appointment_id):06d}"
        report_data = {
            "appointment_id": row.get("id"),
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "patient_phone": row.get("patient_phone") or row.get("phone"),
            "patient_email": row.get("email"),
            "patient_age": row.get("age"),
            "patient_gender": row.get("gender"),
            "patient_avatar": row.get("avatar"),
            "doctor_specialization": row.get("doctor_specialization"),
            "doctor_hospital": row.get("hospital_name"),
            "prediction_id": row.get("prediction_id"),
            "prediction_created_at": str(row.get("prediction_created_at")) if row.get("prediction_created_at") else None,
            "prediction_result": prediction_result,
            "risk_level": risk_level,
            "severity": risk_level,
            "risk_percent": confidence,
            "mental_health_score": confidence,
            "symptoms": symptoms,
            "diagnosis": diagnosis,
            "treatment_plan": treatment_plan,
            "prescription": text_value("prescription"),
            "medications": medications,
            "doctor_notes": doctor_notes,
            "follow_up_recommendation": text_value("follow_up_recommendation"),
            "recommendations": recommendations,
            "lifestyle_advice": lifestyle_advice,
            "consultation_outcome": consultation_outcome,
            "follow_up_date": text_value("follow_up_date"),
            "doctor_signature": row.get("doctor_display_name") or row.get("doctor_name") or "",
            "completed_at": completed_at.isoformat(sep=" ", timespec="seconds"),
            "completed_by_doctor_id": doctor_id,
        }
        summary = f"Diagnosis: {diagnosis}. Outcome: {consultation_outcome}. Risk level: {risk_level}."
        cur.execute("""
            INSERT INTO reports (
              report_id, appointment_id, user_id, user_name, doctor_id, doctor_name,
              prediction_type, prediction_result, prediction_confidence, confidence_score,
              status, report_status, summary, admin_notes, report_data, downloads,
              exported_count, report_type, environment, sandbox_mode
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Completed', 'Completed', %s, %s, %s, 0, 0, 'clinical', 'production', 0)
        """, (
            report_public_id,
            appointment_id,
            row.get("user_id"),
            row.get("patient_name") or "Patient",
            doctor_id,
            row.get("doctor_display_name") or row.get("doctor_name") or "Doctor",
            prediction_result,
            prediction_result,
            int(round(confidence)),
            float(confidence),
            summary,
            doctor_notes,
            json.dumps(report_data, default=str),
        ))
        report_db_id = cur.lastrowid
        cur.execute(
            """
            UPDATE appointments
            SET status = 'Completed',
                completed_at = %s,
                completed_by_doctor_id = %s
            WHERE id = %s AND doctor_id = %s
            """,
            (completed_at, doctor_id, appointment_id, doctor_id)
        )
        mysql.connection.commit()
        try:
            create_user_notification(
                row.get("user_id"),
                "Treatment plan ready",
                f"Your treatment plan has been prepared by Dr. {row.get('doctor_display_name') or row.get('doctor_name') or 'your doctor'}.",
                "treatment_plan_ready",
                reference_id=report_db_id,
                role_target='user',
            )
        except Exception as notification_error:
            log_info(f"TREATMENT PLAN NOTIFICATION ERROR: {notification_error}")
        query = f"{DOCTOR_REPORTS_SELECT} WHERE r.id = %s AND r.doctor_id = %s AND COALESCE(r.sandbox_mode, 0) = 0 AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'"
        cur.execute(query, (report_db_id, doctor_id))
        report = format_doctor_report_row(cur.fetchone())
        cur.close()
        return jsonify({"message": "Consultation completed successfully.", "report": report})
    except Exception as e:
        try:
            mysql.connection.rollback()
        except Exception:
            pass
        log_info(f"COMPLETE CONSULTATION ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to complete consultation."}), 500




@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patient accounts can book appointments."}), 403

    data = request.get_json(force=True) or {}
    doctor_id = data.get('doctor_id')
    doctor_name = data.get('doctor_name', '').strip()
    appointment_date = data.get('appointment_date', '').strip()
    appointment_time = data.get('appointment_time', '').strip()
    notes = data.get('notes', '').strip()

    if doctor_id and not doctor_name:
        try:
            lookup_cur = mysql.connection.cursor()
            lookup_cur.execute("SELECT name FROM doctors WHERE id = %s", (doctor_id,))
            row = lookup_cur.fetchone()
            lookup_cur.close()
            if row:
                doctor_name = row[0]
        except Exception:
            doctor_name = doctor_name

    if not doctor_id and not doctor_name:
        return jsonify({"error": "Doctor selection is required."}), 400

    if not appointment_date or not appointment_time:
        return jsonify({"error": "Date and time are required."}), 400

    try:
        appointment_date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid appointment date format."}), 400

    if appointment_date_obj < datetime.today().date():
        return jsonify({"error": "You cannot select a past date. Please choose today or a future date."}), 400

    try:
        appointment_time_obj = datetime.strptime(appointment_time, '%H:%M').time()
    except ValueError:
        return jsonify({"error": "Invalid appointment time format. Use HH:MM."}), 400

    if appointment_date_obj == datetime.today().date() and appointment_time_obj <= datetime.now().time():
        return jsonify({"error": "This appointment time has already passed."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        release_unpaid_pending_slots(cur)

        booking_state = can_patient_book_therapist(cur, user.get('user_id'))
        if not booking_state["can_book_therapist"]:
            cur.close()
            return booking_not_allowed_response(booking_state)
        prediction_id = booking_state["latest_assessment"]["id"]

        # Check if doctor exists and get their availability schedule
        if doctor_id:
            cur.execute("SELECT id, name, specialty, rating, availability_schedule, COALESCE(cons_fee, consultation_fee), status, user_id FROM doctors WHERE id = %s", (doctor_id,))
        else:
            cur.execute("SELECT d.id, d.name, d.specialty, d.rating, d.availability_schedule, COALESCE(d.cons_fee, d.consultation_fee), d.status, d.user_id FROM doctors d WHERE d.name = %s", (doctor_name,))
        
        doctor_info = cur.fetchone()
        if not doctor_info:
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404

        doctor_id, db_doctor_name, specialty, rating, availability_schedule, consultation_fee, doctor_status, doctor_user_id = doctor_info
        doctor_name = db_doctor_name or doctor_name
        if str(doctor_status or '').strip().upper() != 'ACTIVE':
            cur.close()
            return jsonify({"error": "Doctor is inactive and cannot be booked."}), 400

        slot_available, availability_error = is_doctor_slot_available(
            cur,
            doctor_id,
            appointment_date_obj,
            appointment_time_obj,
            availability_schedule,
        )
        if not slot_available:
            cur.close()
            return jsonify({"error": availability_error or "Selected time slot is not available."}), 400

        # Check for double booking - prevent overlapping paid/confirmed doctor appointments.
        slot_meta = availability_error if slot_available and isinstance(availability_error, dict) else {}
        slot_end_time = parse_schedule_time((slot_meta or {}).get('end_time') or (slot_meta or {}).get('end'))
        slot_duration = parse_slot_duration((slot_meta or {}).get('duration_minutes')) or 30
        schedule_rule_id = (slot_meta or {}).get('doctor_schedule_id')
        if not slot_end_time:
            slot_end_time = (datetime.combine(appointment_date_obj, appointment_time_obj) + timedelta(minutes=slot_duration)).time()

        def pending_payment_response(existing_id):
            return jsonify({
                "message": "You already reserved this appointment. Please complete payment to confirm it.",
                "appointment": {
                    "id": existing_id,
                    "doctorId": doctor_id,
                    "doctor_id": doctor_id,
                    "doctorName": doctor_name,
                    "doctor_name": doctor_name,
                    "date": appointment_date,
                    "appointment_date": appointment_date,
                    "time": appointment_time,
                    "appointment_time": appointment_time,
                    "appointment_end_time": slot_end_time.strftime('%H:%M'),
                    "end_time": slot_end_time.strftime('%H:%M'),
                    "duration_minutes": slot_duration,
                    "duration": f"{slot_duration} minutes",
                    "notes": notes,
                    "status": "Pending Payment",
                    "fee": float(consultation_fee) if consultation_fee is not None else 5.0,
                    "consultation_fee": float(consultation_fee) if consultation_fee is not None else 5.0,
                    "payment_status": "Pending",
                    "reservation_timeout_minutes": BOOKING_RESERVATION_TIMEOUT_MINUTES,
                    "existing_reservation": True,
                }
            })

        cur.execute(
            """
            SELECT id, user_id, status, payment_status
            FROM appointments
            WHERE doctor_id = %s
              AND appointment_date = %s
              AND (
                LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
                OR LOWER(COALESCE(status, '')) IN ('confirmed', 'accepted', 'completed', 'upcoming')
              )
              AND appointment_time < %s
              AND COALESCE(appointment_end_time, slot_end_time, appointment_time) > %s
              AND COALESCE(sandbox_mode, 0) = 0
            LIMIT 1
            """,
            (doctor_id, appointment_date, slot_end_time.strftime('%H:%M'), appointment_time)
        )
        existing_appointment = cur.fetchone()
        if existing_appointment:
            existing_id, existing_user_id, existing_status, existing_payment_status = existing_appointment
            existing_status_key = str(existing_status or '').strip().lower()
            existing_payment_key = str(existing_payment_status or '').strip().lower()
            cur.close()
            return jsonify({"error": "This time slot is already booked. Please choose a different time."}), 400

        cur.execute(
            """
            SELECT id FROM appointments
            WHERE user_id = %s AND doctor_id = %s
              AND appointment_date = %s AND appointment_time = %s
              AND LOWER(COALESCE(status, '')) IN ('pending payment', 'reserved')
              AND LOWER(COALESCE(payment_status, '')) NOT IN ('paid', 'completed', 'success', 'successful')
            ORDER BY id DESC LIMIT 1
            """,
            (user.get('user_id'), doctor_id, appointment_date, appointment_time)
        )
        own_draft = cur.fetchone()
        if own_draft:
            cur.close()
            return pending_payment_response(own_draft[0])

        cur.execute(
            """
            SELECT id, status, payment_status
            FROM appointments
            WHERE user_id = %s
              AND appointment_date = %s
              AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'rejected', 'failed', 'expired')
              AND (LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful') OR LOWER(COALESCE(status, '')) IN ('confirmed', 'accepted', 'completed', 'upcoming'))
              AND (
                appointment_time = %s
                OR (
                  appointment_time < %s
                  AND COALESCE(appointment_end_time, slot_end_time, appointment_time) > %s
                )
              )
            LIMIT 1
            """,
            (
                user.get('user_id'),
                appointment_date,
                appointment_time,
                slot_end_time.strftime('%H:%M'),
                appointment_time,
            )
        )
        overlapping_appointment = cur.fetchone()
        if overlapping_appointment:
            overlapping_id, overlapping_status, overlapping_payment_status = overlapping_appointment
            overlapping_status_key = str(overlapping_status or '').strip().lower()
            overlapping_payment_key = str(overlapping_payment_status or '').strip().lower()
            if overlapping_status_key in ['pending payment', 'reserved'] and overlapping_payment_key not in ['paid', 'completed', 'success', 'successful']:
                cur.close()
                return pending_payment_response(overlapping_id)
            cur.close()
            return jsonify({"error": "You already have an appointment during this time period."}), 400
        cur.execute(
            """
            SELECT id
            FROM appointment_slots
            WHERE doctor_id = %s
              AND appointment_date = %s
              AND start_time = %s
              AND LOWER(COALESCE(status, '')) = 'booked'
            """,
            (doctor_id, appointment_date, appointment_time)
        )
        existing_slot = cur.fetchone()
        if existing_slot:
            cur.close()
            return jsonify({"error": "This time slot is already booked. Please choose a different time."}), 400

        # Create the appointment
        cur.execute(
            """
            INSERT INTO appointments
              (user_id, doctor_id, doctor_name, prediction_id, appointment_date, appointment_time, appointment_end_time, slot_end_time, duration_minutes, consultation_fee, doctor_schedule_id, payment_status, notes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending', %s, 'Pending Payment')
            """,
            (user.get('user_id'), doctor_id, doctor_name, prediction_id, appointment_date, appointment_time, slot_end_time.strftime('%H:%M'), slot_end_time.strftime('%H:%M'), slot_duration, consultation_fee, schedule_rule_id, notes)
        )
        mysql.connection.commit()
        appointment_id = cur.lastrowid
        cur.close()

        create_user_notification(
            user.get('user_id'),
            "Appointment created",
            "Your appointment is pending payment.",
            "appointment_created",
            reference_id=appointment_id,
            role_target='user',
        )
        return jsonify({
            "appointment": {
                "id": appointment_id,
                "doctorId": doctor_id,
                "doctor_id": doctor_id,
                "doctorName": doctor_name,
                "doctor_name": doctor_name,
                "prediction_id": prediction_id,
                "date": appointment_date,
                "appointment_date": appointment_date,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "appointment_end_time": slot_end_time.strftime('%H:%M'),
                "end_time": slot_end_time.strftime('%H:%M'),
                "duration_minutes": slot_duration,
                "duration": f"{slot_duration} minutes",
                "notes": notes,
                "status": "Pending Payment",
                "fee": float(consultation_fee) if consultation_fee is not None else 5.0,
                "consultation_fee": float(consultation_fee) if consultation_fee is not None else 5.0,
                "payment_status": "Pending",
                "reservation_timeout_minutes": BOOKING_RESERVATION_TIMEOUT_MINUTES,
            }
        })
    except Exception as e:
        log_info(f"âŒ CREATE APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to book appointment."}), 500




@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    if not mysql:
        return jsonify({"appointments": []})

    user = get_current_user()
    query_user_id = request.args.get("user_id")

    try:
        cur = mysql.connection.cursor()
        ensure_appointment_ratings_table(cur)
        ensure_doctor_reviews_table(cur)
        ensure_refund_requests_table(cur)
        ensure_yearly_schedule_tables(cur)
        role = canonical_role(user.get('role')) if user else None
        review_select = """
                       dr.id AS review_id, dr.rating, dr.feedback, dr.created_at AS review_created_at,
                       COALESCE(pay.payment_count, 0) AS payment_count,
                       COALESCE(pay.paid_count, 0) AS paid_count,
                       COALESCE(pay.failed_count, 0) AS failed_count,
                       pay.paid_payment_id, pay.paid_amount, pay.payment_method,
                       pay.payment_status AS latest_payment_status, pay.transaction_id, pay.reference_id,
                       rr.id AS refund_request_id, rr.status AS refund_status,
                       d.specialization, d.specialty, COALESCE(d.cons_fee, d.consultation_fee) AS doctor_consultation_fee,
                       COALESCE(d.photo, d.avatar) AS doctor_photo
        """
        review_joins = """
                LEFT JOIN doctor_reviews dr ON dr.appointment_id = a.id
                LEFT JOIN doctors d ON d.id = a.doctor_id
                LEFT JOIN (
                    SELECT COALESCE(appointment_id, booking_id) AS appointment_id,
                           COUNT(*) AS payment_count,
                           SUM(CASE WHEN LOWER(payment_status) IN ('completed', 'paid', 'success', 'successful') THEN 1 ELSE 0 END) AS paid_count,
                           SUM(CASE WHEN LOWER(payment_status) IN ('failed', 'cancelled', 'canceled', 'rejected') THEN 1 ELSE 0 END) AS failed_count,
                           MAX(CASE WHEN LOWER(payment_status) IN ('completed', 'paid', 'success', 'successful') THEN id ELSE NULL END) AS paid_payment_id,
                           MAX(CASE WHEN LOWER(payment_status) IN ('completed', 'paid', 'success', 'successful') THEN amount ELSE NULL END) AS paid_amount,
                           MAX(CASE WHEN LOWER(payment_status) IN ('completed', 'paid', 'success', 'successful') THEN payment_method ELSE NULL END) AS payment_method,
                           MAX(payment_status) AS payment_status,
                           MAX(transaction_id) AS transaction_id,
                           MAX(reference_id) AS reference_id
                    FROM payments
                    WHERE COALESCE(appointment_id, booking_id) IS NOT NULL
                    GROUP BY COALESCE(appointment_id, booking_id)
                ) pay ON pay.appointment_id = a.id
                LEFT JOIN refund_requests rr ON rr.appointment_id = a.id AND rr.payment_id = pay.paid_payment_id
        """
        if user and is_admin_role(user.get('role')) and query_user_id:
            cur.execute(f"""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       a.appointment_end_time, a.slot_end_time, a.duration_minutes, a.consultation_fee, a.payment_status AS appointment_payment_status,
                       a.original_appointment_time, a.original_appointment_end_time, COALESCE(a.extension_minutes, 0) AS extension_minutes,
                       COALESCE(a.emergency_extension, 0) AS emergency_extension, a.extension_reason,
                       {review_select}
                FROM appointments a
                {review_joins}
                WHERE a.user_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """, (query_user_id,))
        elif user and is_admin_role(user.get('role')):
            cur.execute(f"""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       a.appointment_end_time, a.slot_end_time, a.duration_minutes, a.consultation_fee, a.payment_status AS appointment_payment_status,
                       a.original_appointment_time, a.original_appointment_end_time, COALESCE(a.extension_minutes, 0) AS extension_minutes,
                       COALESCE(a.emergency_extension, 0) AS emergency_extension, a.extension_reason,
                       {review_select}
                FROM appointments a
                {review_joins}
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """)
        elif user and role == 'user':
            cur.execute(f"""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       a.appointment_end_time, a.slot_end_time, a.duration_minutes, a.consultation_fee, a.payment_status AS appointment_payment_status,
                       a.original_appointment_time, a.original_appointment_end_time, COALESCE(a.extension_minutes, 0) AS extension_minutes,
                       COALESCE(a.emergency_extension, 0) AS emergency_extension, a.extension_reason,
                       {review_select}
                FROM appointments a
                {review_joins}
                WHERE a.user_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """, (user.get('user_id'),))
        elif user:
            return jsonify({"error": "Permission denied."}), 403
        else:
            return jsonify({"error": "Authentication required."}), 401

        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        appointments = []
        for row in rows or []:
            record = dict(zip(columns, row))
            appointment_date = record.get("appointment_date")
            appointment_time = format_time(record.get("appointment_time"))[:5] if record.get("appointment_time") else None
            doctor_name = record.get("doctor_name")
            payment_count = int(record.get("payment_count") or 0)
            paid_count = int(record.get("paid_count") or 0)
            failed_count = int(record.get("failed_count") or 0)
            payment_ok = payment_count == 0 or paid_count > 0
            completed = str(record.get("status") or "").lower() == "completed"
            has_review = record.get("review_id") is not None
            can_request_refund = False
            if role == 'user' and paid_count > 0 and not record.get("refund_request_id"):
                can_request_refund, _, _ = appointment_qualifies_for_refund(record, {
                    "service_status": None,
                    "payment_status": "Completed",
                })
            appointments.append({
                "id": record.get("id"),
                "doctorId": record.get("doctor_id"),
                "doctor_id": record.get("doctor_id"),
                "doctorName": doctor_name,
                "doctor_name": doctor_name,
                "phone": record.get("phone"),
                "date": appointment_date.strftime("%Y-%m-%d") if appointment_date else None,
                "appointment_date": appointment_date.strftime("%Y-%m-%d") if appointment_date else None,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "notes": record.get("notes"),
                "status": record.get("status"),
                "createdAt": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
                "created_at": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
                "rating": record.get("rating"),
                "ratingComment": record.get("feedback"),
                "rating_comment": record.get("feedback"),
                "feedback": record.get("feedback"),
                "reviewCreatedAt": record.get("review_created_at").isoformat() if record.get("review_created_at") else None,
                "review_created_at": record.get("review_created_at").isoformat() if record.get("review_created_at") else None,
                "endTime": format_time(record.get("appointment_end_time") or record.get("slot_end_time"))[:5] if (record.get("appointment_end_time") or record.get("slot_end_time")) else None,
                "appointment_end_time": format_time(record.get("appointment_end_time") or record.get("slot_end_time"))[:5] if (record.get("appointment_end_time") or record.get("slot_end_time")) else None,
                "duration": f"{int(record.get('duration_minutes') or 30)} minutes",
                "duration_minutes": int(record.get("duration_minutes") or 30),
                "original_appointment_time": format_time(record.get("original_appointment_time"))[:5] if record.get("original_appointment_time") else None,
                "original_appointment_end_time": format_time(record.get("original_appointment_end_time"))[:5] if record.get("original_appointment_end_time") else None,
                "extension_minutes": int(record.get("extension_minutes") or 0),
                "emergency_extension": bool(record.get("emergency_extension")),
                "extension_reason": record.get("extension_reason"),
                "consultationFee": float(record.get("consultation_fee") or record.get("doctor_consultation_fee") or record.get("paid_amount") or 0),
                "consultation_fee": float(record.get("consultation_fee") or record.get("doctor_consultation_fee") or record.get("paid_amount") or 0),
                "specialization": record.get("specialization") or record.get("specialty"),
                "doctorPhoto": record.get("doctor_photo"),
                "doctor_photo": record.get("doctor_photo"),
                "paymentStatus": "Paid" if paid_count > 0 else ("Failed" if failed_count > 0 else (record.get("appointment_payment_status") or record.get("latest_payment_status") or "Pending")),
                "payment_status": "Paid" if paid_count > 0 else ("Failed" if failed_count > 0 else (record.get("appointment_payment_status") or record.get("latest_payment_status") or "Pending")),
                "paymentId": record.get("paid_payment_id"),
                "payment_id": record.get("paid_payment_id"),
                "paymentAmount": float(record.get("paid_amount") or 0),
                "payment_amount": float(record.get("paid_amount") or 0),
                "paymentMethod": record.get("payment_method"),
                "payment_method": record.get("payment_method"),
                "paymentTransactionId": record.get("transaction_id") or record.get("reference_id"),
                "payment_transaction_id": record.get("transaction_id") or record.get("reference_id"),
                "refundRequestId": record.get("refund_request_id"),
                "refund_request_id": record.get("refund_request_id"),
                "refundStatus": record.get("refund_status"),
                "refund_status": record.get("refund_status"),
                "canRequestRefund": can_request_refund,
                "can_request_refund": can_request_refund,
                "canRate": completed and payment_ok and not has_review,
                "can_rate": completed and payment_ok and not has_review,
                "hasRating": has_review,
                "has_rating": has_review,
            })

        return jsonify({"appointments": appointments})

    except Exception as e:
        log_info(f"âŒ APPOINTMENTS ERROR: {e}")
        return jsonify({"appointments": []}), 500




@app.route("/api/reviews", methods=["POST"])
def submit_review():
    data = request.get_json(force=True) or {}
    appointment_id = data.get("appointment_id")
    try:
        appointment_id = int(appointment_id)
    except (TypeError, ValueError):
        return jsonify({"error": "appointment_id is required."}), 400
    return submit_doctor_review_for_current_user(
        appointment_id,
        data.get("rating"),
        data.get("feedback", data.get("comment", "")),
    )




@app.route("/api/appointments/<int:appointment_id>/rating", methods=["POST"])
def rate_completed_appointment(appointment_id):
    data = request.get_json(force=True) or {}
    return submit_doctor_review_for_current_user(
        appointment_id,
        data.get("rating"),
        data.get("feedback", data.get("comment", "")),
    )

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patients can rate completed appointments."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    rating = data.get('rating')
    comment = str(data.get('comment') or '').strip()

    try:
        rating_value = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "Rating must be a number from 1 to 5."}), 400
    if rating_value < 1 or rating_value > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400
    if len(comment) > 1000:
        return jsonify({"error": "Comment must be 1000 characters or less."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_appointment_ratings_table(cur)
        cur.execute(
            """
            SELECT a.id, a.user_id, a.doctor_id, a.status, d.user_id
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = %s AND a.user_id = %s
            """,
            (appointment_id, user.get('user_id'))
        )
        appointment = cur.fetchone()
        if not appointment:
            cur.close()
            return jsonify({"error": "Appointment not found."}), 404

        _, owner_id, doctor_id, status, doctor_user_id = appointment
        if str(status or '').lower() != 'completed':
            cur.close()
            return jsonify({"error": "You can rate only after the appointment is completed."}), 400
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor is missing for this appointment."}), 400

        cur.execute("SELECT id FROM appointment_ratings WHERE appointment_id = %s", (appointment_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "This appointment has already been rated."}), 400

        cur.execute(
            """
            INSERT INTO appointment_ratings (appointment_id, user_id, doctor_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (appointment_id, owner_id, doctor_id, rating_value, comment or None)
        )
        cur.execute(
            """
            UPDATE doctors d
            SET rating = (
                SELECT ROUND(AVG(ar.rating), 1)
                FROM appointment_ratings ar
                WHERE ar.doctor_id = d.id
            )
            WHERE d.id = %s
            """,
            (doctor_id,)
        )
        mysql.connection.commit()
        cur.close()

        create_user_notification(
            doctor_user_id,
            "New patient rating",
            f"A completed appointment received a {rating_value}-star rating.",
            "doctor_rating",
        )

        return jsonify({
            "message": "Thank you for rating your session.",
            "rating": {
                "appointmentId": appointment_id,
                "doctorId": doctor_id,
                "rating": rating_value,
                "comment": comment,
            }
        })
    except Exception as e:
        log_info(f"RATE APPOINTMENT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to submit rating."}), 500




@app.route("/api/appointments/user/<int:user_id>", methods=["GET"])
def get_user_appointments(user_id):
    if not mysql:
        return jsonify({"appointments": []})

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not is_admin_role(user.get('role')) and user.get('user_id') != user_id:
        return jsonify({"error": "Permission denied."}), 403

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, doctor_id, doctor_name, phone, appointment_date, appointment_time, notes, status, created_at
            FROM appointments
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        rows = cur.fetchall()
        cur.close()

        appointments = []
        for row in rows or []:
            if not row:
                continue
            appointment_date = format_date(row[4])
            appointment_time = format_time(row[5])[:5] if row[5] else None
            appointments.append({
                "id": row[0],
                "doctorId": row[1],
                "doctor_id": row[1],
                "doctorName": row[2],
                "doctor_name": row[2],
                "phone": row[3],
                "date": appointment_date,
                "appointment_date": appointment_date,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "notes": row[6],
                "status": row[7],
                "createdAt": format_date(row[8]),
                "created_at": format_date(row[8]),
            })

        return jsonify({"appointments": appointments})
    except Exception as e:
        log_info(f"âŒ USER APPOINTMENTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load appointments."}), 500




@app.route("/api/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    if not mysql:
        return jsonify({"error": "Database connection not available."}), 500

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    try:
        data = request.get_json(force=True) or {}
        new_status = data.get('status', '').strip()

        # Validate status
        valid_statuses = ['Pending', 'Pending Payment', 'Confirmed', 'Completed', 'Cancelled', 'Rejected']
        if new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        # Get the appointment
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, user_id, doctor_id, status FROM appointments WHERE id = %s", (appointment_id,))
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"error": "Appointment not found."}), 404

        appointment_user_id = row[1]
        appointment_doctor_id = row[2]
        current_status = row[3]

        # Permission check
        # Users can only cancel their own appointments
        # Doctors can update appointments assigned to them
        # Admins can update any appointment
        role = canonical_role(user.get('role'))
        if role == 'user':
            if user.get('user_id') != appointment_user_id:
                return jsonify({"error": "Permission denied. You can only cancel your own appointments."}), 403
            # Users can only cancel pending or confirmed appointments
            if new_status not in ['Cancelled']:
                return jsonify({"error": "Users can only cancel appointments."}), 403
            if current_status not in ['Pending', 'Pending Payment', 'Confirmed']:
                return jsonify({"error": "Cannot cancel an appointment that is already completed or cancelled."}), 400
        elif role == 'doctor':
            doctor_profile_id = user.get('doctor_id')
            if not doctor_profile_id:
                cur = mysql.connection.cursor()
                cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user.get('user_id'),))
                doctor_row = cur.fetchone()
                cur.close()
                doctor_profile_id = doctor_row[0] if doctor_row else None
            if doctor_profile_id != appointment_doctor_id:
                return jsonify({"error": "Permission denied. You can only update your assigned appointments."}), 403
        elif not is_admin_role(user.get('role')):
            return jsonify({"error": "Permission denied."}), 403

        # Update the appointment
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE appointments SET status = %s WHERE id = %s",
            (new_status, appointment_id)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Appointment updated successfully", "status": new_status})
    except Exception as e:
        log_info(f"âŒ UPDATE APPOINTMENT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update appointment."}), 500




