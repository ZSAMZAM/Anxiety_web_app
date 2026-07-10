"""Schedule repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/admin/doctor-schedules", methods=["GET"])
def get_admin_doctor_schedules():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    selected_date = parse_schedule_date(request.args.get('date')) or datetime.today().date()
    period = request.args.get('period', 'week')
    range_start, range_end = admin_schedule_period_range(selected_date, period)
    search = str(request.args.get('search') or '').strip().lower()
    doctor_filter = str(request.args.get('doctor_id') or '').strip()
    specialization_filter = str(request.args.get('specialization') or '').strip().lower()
    status_filter = str(request.args.get('status') or '').strip().lower()

    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        cur.execute(
            """
            SELECT d.id, d.user_id, d.username, d.name, COALESCE(d.specialization, d.specialty),
                   d.status, COALESCE(d.photo, d.avatar, u.avatar), d.hospital_name,
                   d.availability_schedule
            FROM doctors d
            LEFT JOIN users u ON u.id = d.user_id
            WHERE COALESCE(d.environment, 'production') = 'production'
              AND COALESCE(d.sandbox_mode, 0) = 0
            ORDER BY d.name
            """
        )
        doctor_rows = cur.fetchall() or []

        cur.execute(
            """
            SELECT id, doctor_id, appointment_date, appointment_time, status, COALESCE(notes, '')
            FROM appointments
            WHERE appointment_date BETWEEN %s AND %s
              AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'failed')
            ORDER BY appointment_date, appointment_time
            """,
            (range_start, range_end)
        )
        appointment_rows = cur.fetchall() or []
        appointments_by_doctor = {}
        for row in appointment_rows:
            record = {
                "id": row[0],
                "doctor_id": row[1],
                "date": format_date(row[2]),
                "time": format_time(row[3])[:5] if row[3] else None,
                "status": row[4],
                "notes": row[5],
            }
            appointments_by_doctor.setdefault(row[1], []).append(record)

        doctors = []
        summaries = {
            "total_doctors": 0,
            "available_today": 0,
            "on_leave": 0,
            "working_slots_today": 0,
            "booked_appointments_today": 0,
            "conflicting_schedules": 0,
        }
        all_warnings = []
        specializations = set()

        for row in doctor_rows:
            doctor_id, user_id, username, name, specialization, raw_status, photo, hospital, legacy_schedule = row
            calendar_slots, rules, blocked_dates = get_doctor_calendar_slots(cur, doctor_id, range_start, range_end, legacy_schedule)
            today_key = selected_date.isoformat()
            today_slot_data = calendar_slots.get(today_key, {"slots": [], "blocked": False, "available": False})
            today_slots = today_slot_data.get("slots", [])
            booked_today = len([slot for slot in today_slots if slot.get("booked")])
            available_today = len([slot for slot in today_slots if not slot.get("booked")])
            working_hours = "Offline"
            if today_slots:
                working_hours = f"{today_slots[0].get('start')} - {today_slots[-1].get('end')}"

            normalized_db_status = normalize_doctor_status(raw_status) or str(raw_status or 'Active')
            if str(normalized_db_status).lower() != 'active':
                today_status = 'Offline'
            elif today_slot_data.get("blocked"):
                today_status = 'On Leave'
            elif today_slots and available_today == 0:
                today_status = 'Busy'
            elif available_today > 0:
                today_status = 'Available'
            else:
                today_status = 'Offline'

            next_available = None
            for date_key, day in sorted(calendar_slots.items()):
                if date_key >= today_key and any(not slot.get("booked") for slot in day.get("slots", [])) and not day.get("blocked"):
                    next_available = date_key
                    break

            doctor_appointments = appointments_by_doctor.get(doctor_id, [])
            warnings = admin_schedule_warnings(rules, blocked_dates.keys(), doctor_appointments)
            if warnings:
                summaries["conflicting_schedules"] += 1
                for warning in warnings:
                    all_warnings.append({"doctor_id": doctor_id, "doctor": name, "message": warning})

            vacation_dates = [
                {"id": meta.get("id"), "date": date_key, "reason": meta.get("reason", "Unavailable"), "created_by": "System", "created_date": None}
                for date_key, meta in sorted(blocked_dates.items())
            ]
            doctor_payload = {
                "id": doctor_id,
                "user_id": user_id,
                "username": username,
                "name": name,
                "photo": photo,
                "specialization": specialization or "General",
                "hospital": hospital,
                "status": normalized_db_status,
                "today_status": today_status,
                "working_hours": working_hours,
                "today_slots": len(today_slots),
                "booked_today": booked_today,
                "available_today": available_today,
                "vacation": today_slot_data.get("reason") if today_slot_data.get("blocked") else "",
                "next_available_date": next_available,
                "calendar_slots": calendar_slots,
                "availability_rules": [
                    {
                "id": rule.get("id"),
                "start_date": format_date(rule.get("start_date")),
                "end_date": format_date(rule.get("end_date")),
                "start_time": rule.get("start_time"),
                "end_time": rule.get("end_time"),
                "appointment_duration_minutes": rule.get("appointment_duration_minutes") or 30,
                "duration_minutes": rule.get("appointment_duration_minutes") or 30,
                "recurrence_type": rule.get("recurrence_type"),
                        "recurrence_days": rule.get("recurrence_days"),
                        "recurrence_metadata": rule.get("recurrence_metadata") or {},
                        "timezone": rule.get("timezone") or "Africa/Mogadishu",
                        "day_of_week": rule.get("day_of_week"),
                        "legacy": bool(rule.get("legacy")),
                    }
                    for rule in rules
                ],
                "vacations": vacation_dates,
                "appointments": doctor_appointments[:12],
                "warnings": warnings,
                "statistics": {
                    "slots_in_period": sum(len(day.get("slots", [])) for day in calendar_slots.values()),
                    "available_in_period": sum(len([slot for slot in day.get("slots", []) if not slot.get("booked")]) for day in calendar_slots.values()),
                    "booked_in_period": sum(len([slot for slot in day.get("slots", []) if slot.get("booked")]) for day in calendar_slots.values()),
                    "vacation_days": len(vacation_dates),
                },
            }

            if specialization:
                specializations.add(specialization)
            summaries["total_doctors"] += 1
            summaries["working_slots_today"] += len(today_slots)
            summaries["booked_appointments_today"] += booked_today
            if today_status == 'Available':
                summaries["available_today"] += 1
            if today_status == 'On Leave':
                summaries["on_leave"] += 1

            if search and search not in str(name or '').lower() and search not in str(username or '').lower() and search not in str(specialization or '').lower():
                continue
            if doctor_filter and str(doctor_id) != doctor_filter:
                continue
            if specialization_filter and specialization_filter not in str(specialization or '').lower():
                continue
            if status_filter and status_filter not in ['all', ''] and today_status.lower().replace(' ', '_') != status_filter.replace(' ', '_'):
                continue
            doctors.append(doctor_payload)

        analytics = {
            "most_busy_doctors": sorted(
                [{"name": doctor["name"], "value": doctor["statistics"]["booked_in_period"]} for doctor in doctors],
                key=lambda item: item["value"],
                reverse=True
            )[:6],
            "available_hours_week": [
                {"name": doctor["name"], "value": doctor["statistics"]["available_in_period"]}
                for doctor in doctors[:6]
            ],
            "appointments_per_doctor": [
                {"name": doctor["name"], "value": doctor["statistics"]["booked_in_period"]}
                for doctor in doctors[:6]
            ],
            "vacation_distribution": [
                {"name": doctor["name"], "value": doctor["statistics"]["vacation_days"]}
                for doctor in doctors[:6]
            ],
        }
        cur.close()
        return jsonify({
            "date": selected_date.isoformat(),
            "period": period,
            "range": {"start": range_start.isoformat(), "end": range_end.isoformat()},
            "summary": summaries,
            "warnings": all_warnings[:20],
            "doctors": doctors,
            "filters": {"specializations": sorted(specializations)},
            "analytics": analytics,
        })
    except Exception as e:
        log_info(f"ADMIN DOCTOR SCHEDULES ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor schedules."}), 500




@app.route("/api/admin/doctor-schedules/<int:doctor_id>/blocked-dates", methods=["POST"])
def admin_block_doctor_dates(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json(force=True) or {}
    start_date = parse_schedule_date(data.get('date') or data.get('start_date'))
    end_date = parse_schedule_date(data.get('end_date')) or start_date
    reason = str(data.get('reason') or 'Blocked by administrator').strip()
    if not start_date:
        return jsonify({"error": "Date is required."}), 400
    if start_date < datetime.today().date():
        return jsonify({"error": "Blocked dates cannot be created in the past."}), 400
    if end_date < start_date:
        return jsonify({"error": "End date must be after start date."}), 400
    if end_date > datetime.today().date() + timedelta(days=365):
        return jsonify({"error": "Leave can only be blocked for the next 12 months."}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        cur.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404
        rules = fetch_availability_rules(cur, doctor_id, start_date, end_date)
        cursor_date = start_date
        while cursor_date <= end_date:
            if any(recurrence_matches_date(cursor_date, rule) for rule in rules):
                cur.close()
                return jsonify({"error": f"Blocked dates cannot overlap active availability on {cursor_date.isoformat()}."}), 400
            cursor_date += timedelta(days=1)
        cur.execute(
            """
            SELECT appointment_date, appointment_time
            FROM appointments
            WHERE doctor_id = %s
              AND appointment_date BETWEEN %s AND %s
              AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'failed')
            ORDER BY appointment_date, appointment_time
            LIMIT 1
            """,
            (doctor_id, start_date, end_date)
        )
        booked_row = cur.fetchone()
        if booked_row:
            cur.close()
            return jsonify({"error": f"Blocked dates cannot cover a booked appointment on {format_date(booked_row[0])} at {format_time(booked_row[1])[:5]}."}), 400
        cursor_date = start_date
        created = 0
        while cursor_date <= end_date:
            cur.execute(
                """
                INSERT INTO doctor_unavailable_dates (doctor_id, blocked_date, reason)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE reason = VALUES(reason)
                """,
                (doctor_id, cursor_date, reason)
            )
            created += 1
            cursor_date += timedelta(days=1)
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Date blocked.", "records": created})
    except Exception as e:
        log_info(f"ADMIN BLOCK DATE ERROR: {e}")
        return jsonify({"error": "Unable to block date."}), 500




@app.route("/api/admin/doctor-schedules/<int:doctor_id>/availability", methods=["POST"])
def admin_create_doctor_availability(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json(force=True) or {}
    candidate_rule, validation_error = parse_availability_payload(data)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        cur.execute("SELECT id FROM doctors WHERE id = %s", (doctor_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404

        candidate_rule['doctor_id'] = doctor_id
        today = datetime.today().date()
        if candidate_rule['start_date'] <= today <= candidate_rule['end_date'] and rule_occurs_today(candidate_rule, today) and parse_schedule_time(candidate_rule['start_time']) <= datetime.now().time():
            cur.close()
            return jsonify({"error": "Start time cannot be earlier than the current time for today's schedule."}), 400
        blocked_overlap, blocked_date = availability_overlaps_blocked_dates(cur, doctor_id, candidate_rule)
        if blocked_overlap:
            cur.close()
            return jsonify({"error": f"Availability cannot overlap vacation or unavailable day on {blocked_date}."}), 400
        overlap_ok, overlap_error = validate_availability_overlap(cur, doctor_id, candidate_rule)
        if not overlap_ok:
            cur.close()
            return jsonify({"error": overlap_error}), 400

        cur.execute(
            """
            INSERT INTO doctor_availability
                (doctor_id, day_of_week, start_date, end_date, start_time, end_time, recurrence_type, recurrence_days, recurrence_metadata, timezone, appointment_duration_minutes, is_available, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, CURRENT_TIMESTAMP)
            """,
            (
                doctor_id,
                candidate_rule['day_of_week'],
                candidate_rule['start_date'],
                candidate_rule['end_date'],
                candidate_rule['start_time'],
                candidate_rule['end_time'],
                candidate_rule['recurrence_type'],
                candidate_rule['recurrence_days'],
                candidate_rule['recurrence_metadata'],
                candidate_rule['timezone'],
                candidate_rule['appointment_duration_minutes'],
            )
        )
        mysql.connection.commit()
        new_id = cur.lastrowid
        cur.close()
        return jsonify({"success": True, "id": new_id, "message": "Availability rule created."}), 201
    except Exception as e:
        log_info(f"ADMIN AVAILABILITY CREATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to create availability."}), 500




@app.route("/api/admin/doctor-schedules/<int:doctor_id>/availability/<int:rule_id>", methods=["PUT"])
def admin_update_doctor_availability(doctor_id, rule_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    data = request.get_json(force=True) or {}
    candidate_rule, validation_error = parse_availability_payload(data)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        cur.execute(
            """
            SELECT id, doctor_id, day_of_week, start_date, end_date, start_time, end_time,
                   COALESCE(recurrence_type, 'weekly'), recurrence_days, is_available, COALESCE(appointment_duration_minutes, 30),
                   recurrence_metadata, COALESCE(timezone, 'Africa/Mogadishu')
            FROM doctor_availability
            WHERE id = %s AND doctor_id = %s AND COALESCE(is_available, 1) = 1
            """,
            (rule_id, doctor_id)
        )
        existing_row = cur.fetchone()
        if not existing_row:
            cur.close()
            return jsonify({"error": "Availability rule not found."}), 404
        existing_rule = {
            "id": existing_row[0],
            "doctor_id": existing_row[1],
            "day_of_week": existing_row[2],
            "start_date": existing_row[3],
            "end_date": existing_row[4],
            "start_time": format_time(existing_row[5])[:5] if existing_row[5] else None,
            "end_time": format_time(existing_row[6])[:5] if existing_row[6] else None,
            "recurrence_type": existing_row[7],
            "recurrence_days": existing_row[8],
            "is_available": existing_row[9],
            "appointment_duration_minutes": existing_row[10],
            "recurrence_metadata": parse_recurrence_metadata(existing_row[11]),
            "timezone": existing_row[12],
        }

        candidate_rule['doctor_id'] = doctor_id
        today = datetime.today().date()
        if candidate_rule['start_date'] <= today <= candidate_rule['end_date'] and rule_occurs_today(candidate_rule, today) and parse_schedule_time(candidate_rule['start_time']) <= datetime.now().time():
            cur.close()
            return jsonify({"error": "Start time cannot be earlier than the current time for today's schedule."}), 400
        blocked_overlap, blocked_date = availability_overlaps_blocked_dates(cur, doctor_id, candidate_rule)
        if blocked_overlap:
            cur.close()
            return jsonify({"error": f"Availability cannot overlap vacation or unavailable day on {blocked_date}."}), 400
        overlap_ok, overlap_error = validate_availability_overlap(cur, doctor_id, candidate_rule, exclude_rule_id=rule_id)
        if not overlap_ok:
            cur.close()
            return jsonify({"error": overlap_error}), 400
        uncovered_bookings = booked_appointments_not_covered(cur, doctor_id, existing_rule, candidate_rule)
        if uncovered_bookings:
            first = uncovered_bookings[0]
            cur.close()
            return jsonify({"error": f"This update would remove a booked appointment on {first['date'].isoformat()} at {first['time'].strftime('%H:%M')}. Handle the appointment before changing this rule."}), 400

        cur.execute(
            """
            UPDATE doctor_availability
            SET day_of_week = %s,
                start_date = %s,
                end_date = %s,
                start_time = %s,
                end_time = %s,
                recurrence_type = %s,
                recurrence_days = %s,
                recurrence_metadata = %s,
                timezone = %s,
                appointment_duration_minutes = %s,
                is_available = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND doctor_id = %s
            """,
            (
                candidate_rule['day_of_week'],
                candidate_rule['start_date'],
                candidate_rule['end_date'],
                candidate_rule['start_time'],
                candidate_rule['end_time'],
                candidate_rule['recurrence_type'],
                candidate_rule['recurrence_days'],
                candidate_rule['recurrence_metadata'],
                candidate_rule['timezone'],
                candidate_rule['appointment_duration_minutes'],
                rule_id,
                doctor_id,
            )
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "id": rule_id, "message": "Availability rule updated."})
    except Exception as e:
        log_info(f"ADMIN AVAILABILITY UPDATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update availability."}), 500




@app.route("/api/admin/doctor-schedules/<int:doctor_id>/availability/<int:rule_id>", methods=["DELETE"])
def admin_delete_doctor_availability(doctor_id, rule_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT id, doctor_id, day_of_week, start_date, end_date, start_time, end_time,
                   COALESCE(recurrence_type, 'weekly'), recurrence_days, is_available, COALESCE(appointment_duration_minutes, 30),
                   recurrence_metadata, COALESCE(timezone, 'Africa/Mogadishu')
            FROM doctor_availability
            WHERE id = %s AND doctor_id = %s
            """,
            (rule_id, doctor_id)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Availability rule not found."}), 404
        rule = {
            "id": row[0],
            "doctor_id": row[1],
            "day_of_week": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "start_time": format_time(row[5])[:5] if row[5] else None,
            "end_time": format_time(row[6])[:5] if row[6] else None,
            "recurrence_type": row[7],
            "recurrence_days": row[8],
            "is_available": row[9],
            "appointment_duration_minutes": row[10],
            "recurrence_metadata": parse_recurrence_metadata(row[11]),
            "timezone": row[12],
        }
        if row[4] and parse_schedule_date(row[4]) and parse_schedule_date(row[4]) < datetime.today().date():
            cur.close()
            return jsonify({"error": "Past availability rules are automatically disabled and cannot be deleted."}), 400
        booked = booked_appointments_for_rule(cur, doctor_id, rule)
        if booked:
            first = booked[0]
            cur.close()
            return jsonify({"error": f"This rule has a booked appointment on {first['date'].isoformat()} at {first['time'].strftime('%H:%M')}. Handle the appointment before deleting the rule."}), 400
        cur.execute("DELETE FROM doctor_availability WHERE id = %s AND doctor_id = %s", (rule_id, doctor_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "message": "Availability rule removed."})
    except Exception as e:
        log_info(f"ADMIN AVAILABILITY DELETE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to remove availability."}), 500




@app.route("/api/admin/doctor-schedules/blocked-dates/<int:block_id>", methods=["DELETE"])
def admin_unblock_doctor_date(block_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM doctor_unavailable_dates WHERE id = %s", (block_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Date unblocked."})
    except Exception as e:
        log_info(f"ADMIN UNBLOCK DATE ERROR: {e}")
        return jsonify({"error": "Unable to unblock date."}), 500




@app.route("/api/doctors/<int:doctor_id>/availability", methods=["GET"])
def get_doctor_availability(doctor_id):
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Doctor profiles are available to patient accounts only."}), 403

    try:
        cur = mysql.connection.cursor()
        ensure_doctor_reviews_table(cur)
        booking_state = can_patient_book_therapist(cur, user.get('user_id'))
        if not booking_state["can_book_therapist"]:
            cur.close()
            return booking_not_allowed_response(booking_state)
        cur.execute(
            """
            SELECT d.id, d.name, d.specialization, d.specialty, d.hospital_name,
                   d.clinic_name, d.clinic_address, d.address, d.district, d.city,
                   d.experience, d.experience_years, COALESCE(d.cons_fee, d.consultation_fee),
                   COALESCE(rs.average_rating, 0) AS average_rating,
                   COALESCE(rs.total_reviews, 0) AS total_reviews,
                   d.photo, d.avatar, d.bio, d.availability_schedule,
                   u.fullname, u.avatar
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN (
                SELECT doctor_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS total_reviews
                FROM doctor_reviews
                GROUP BY doctor_id
            ) rs ON rs.doctor_id = d.id
            WHERE d.id = %s
            """,
            (doctor_id,)
        )
        doctor_info = cur.fetchone()

        if not doctor_info:
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404

        (
            doctor_id,
            doctor_name,
            specialization,
            specialty,
            hospital_name,
            clinic_name,
            clinic_address,
            address,
            district,
            city,
            experience,
            experience_years,
            consultation_fee,
            rating,
            total_reviews,
            photo,
            doctor_avatar,
            bio,
            availability_schedule,
            user_fullname,
            user_avatar,
        ) = doctor_info
        schedule = get_doctor_schedule(doctor_id, availability_schedule)

        # Get existing appointments to show booked slots
        cur.execute(
            "SELECT appointment_date, appointment_time FROM appointments WHERE doctor_id = %s AND appointment_date >= CURDATE() AND status IN ('Confirmed', 'Completed') AND COALESCE(sandbox_mode, 0) = 0",
            (doctor_id,)
        )
        booked_slots = cur.fetchall()
        cur.execute(
            """
            SELECT r.rating, r.feedback, r.created_at, COALESCE(u.fullname, u.username, 'Patient') AS patient_name
            FROM doctor_reviews r
            LEFT JOIN users u ON u.id = r.patient_id
            WHERE r.doctor_id = %s
            ORDER BY r.created_at DESC
            LIMIT 5
            """,
            (doctor_id,)
        )
        recent_reviews = [
            {
                "rating": int(row[0] or 0),
                "feedback": row[1] or "",
                "created_at": row[2].isoformat() if row[2] else None,
                "patient_name": row[3],
            }
            for row in cur.fetchall()
        ]
        start_param = request.args.get('start')
        end_param = request.args.get('end')
        start_date = parse_schedule_date(start_param) or datetime.today().date()
        end_date = parse_schedule_date(end_param) or (start_date + timedelta(days=365))
        calendar_slots, availability_rules, blocked_dates = get_doctor_calendar_slots(
            cur,
            doctor_id,
            start_date,
            end_date,
            availability_schedule,
        )
        cur.close()

        booked_slots_list = [
            {
                "date": str(slot[0]),
                "appointment_date": str(slot[0]),
                "time": format_time(slot[1])[:5] if slot[1] else None,
                "appointment_time": format_time(slot[1])[:5] if slot[1] else None,
            }
            for slot in booked_slots
        ]
        doctor_fee = float(consultation_fee) if consultation_fee is not None else None
        doctor_rating = float(rating) if rating is not None else 0.0
        doctor_experience = experience_years if experience_years is not None else experience

        return jsonify({
            "doctor": {
                "id": doctor_id,
                "name": doctor_name or user_fullname,
                "specialty": specialty or specialization,
                "specialization": specialization or specialty,
                "hospital": hospital_name or clinic_name,
                "hospital_name": hospital_name,
                "clinic_name": clinic_name,
                "location": clinic_address or address,
                "clinic_address": clinic_address,
                "address": address,
                "district": district,
                "city": city,
                "experience": doctor_experience,
                "experience_years": experience_years,
                "consultation_fee": doctor_fee,
                "cons_fee": doctor_fee,
                "fee": doctor_fee,
                "rating": doctor_rating,
                "average_rating": doctor_rating,
                "review_count": int(total_reviews or 0),
                "total_reviews": int(total_reviews or 0),
                "recent_reviews": recent_reviews,
                "photo": photo or doctor_avatar or user_avatar,
                "avatar": doctor_avatar or user_avatar,
                "bio": bio,
                "availability_schedule": schedule,
                "availabilitySchedule": schedule,
                "calendar_slots": calendar_slots,
                "availability_rules": [
                    {
                        "id": rule.get("id"),
                        "start_date": format_date(rule.get("start_date")),
                        "end_date": format_date(rule.get("end_date")),
                        "start_time": rule.get("start_time"),
                        "end_time": rule.get("end_time"),
                        "appointment_duration_minutes": rule.get("appointment_duration_minutes") or 30,
                        "duration_minutes": rule.get("appointment_duration_minutes") or 30,
                        "recurrence_type": rule.get("recurrence_type"),
                        "recurrence_days": rule.get("recurrence_days"),
                        "recurrence_metadata": rule.get("recurrence_metadata") or {},
                        "timezone": rule.get("timezone") or "Africa/Mogadishu",
                        "day_of_week": rule.get("day_of_week"),
                        "legacy": bool(rule.get("legacy")),
                    }
                    for rule in availability_rules
                ],
                "unavailable_dates": [
                    {"id": meta.get("id"), "date": date, "reason": meta.get("reason", "")}
                    for date, meta in sorted(blocked_dates.items())
                ],
                "schedule": schedule,
            },
            "booked_slots": booked_slots_list,
            "calendar_slots": calendar_slots,
            "availability_rules": [
                {
                    "id": rule.get("id"),
                    "start_date": format_date(rule.get("start_date")),
                    "end_date": format_date(rule.get("end_date")),
                    "start_time": rule.get("start_time"),
                    "end_time": rule.get("end_time"),
                    "appointment_duration_minutes": rule.get("appointment_duration_minutes") or 30,
                    "duration_minutes": rule.get("appointment_duration_minutes") or 30,
                    "recurrence_type": rule.get("recurrence_type"),
                    "recurrence_days": rule.get("recurrence_days"),
                    "recurrence_metadata": rule.get("recurrence_metadata") or {},
                    "timezone": rule.get("timezone") or "Africa/Mogadishu",
                    "day_of_week": rule.get("day_of_week"),
                    "legacy": bool(rule.get("legacy")),
                }
                for rule in availability_rules
            ],
            "unavailable_dates": [
                {"id": meta.get("id"), "date": date, "reason": meta.get("reason", "")}
                for date, meta in sorted(blocked_dates.items())
            ],
        })
    except Exception as e:
        log_info(f"âŒ GET DOCTOR AVAILABILITY ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor availability. Please try again."}), 500




@app.route("/api/doctor/schedule", methods=["GET"])
def get_current_doctor_schedule():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        doctor_id, legacy_schedule = current_doctor_record(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor profile not found."}), 404
        start_date = parse_schedule_date(request.args.get('start')) or datetime.today().date()
        end_date = parse_schedule_date(request.args.get('end')) or (start_date + timedelta(days=365))
        calendar_slots, _visible_rules, blocked_dates = get_doctor_calendar_slots(cur, doctor_id, start_date, end_date, legacy_schedule)
        rules = fetch_availability_rules(
            cur,
            doctor_id,
            datetime.today().date(),
            datetime.today().date() + timedelta(days=365),
            legacy_schedule,
        )
        cur.close()
        return jsonify({
            "doctor_id": doctor_id,
            "calendar_slots": calendar_slots,
            "availability_rules": [
                {
                    "id": rule.get("id"),
                    "start_date": format_date(rule.get("start_date")),
                    "end_date": format_date(rule.get("end_date")),
                    "start_time": rule.get("start_time"),
                    "end_time": rule.get("end_time"),
                    "appointment_duration_minutes": rule.get("appointment_duration_minutes") or 30,
                    "duration_minutes": rule.get("appointment_duration_minutes") or 30,
                    "recurrence_type": rule.get("recurrence_type"),
                    "recurrence_days": rule.get("recurrence_days"),
                    "recurrence_metadata": rule.get("recurrence_metadata") or {},
                    "timezone": rule.get("timezone") or "Africa/Mogadishu",
                    "day_of_week": rule.get("day_of_week"),
                    "legacy": bool(rule.get("legacy")),
                }
                for rule in rules
            ],
            "unavailable_dates": [
                {"id": meta.get("id"), "date": date, "reason": meta.get("reason", "")}
                for date, meta in sorted(blocked_dates.items())
            ],
        })
    except Exception as e:
        log_info(f"DOCTOR SCHEDULE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor schedule."}), 500




@app.route("/api/doctor/availability", methods=["POST"])
def create_current_doctor_availability():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    data = request.get_json(force=True) or {}
    candidate_rule, validation_error = parse_availability_payload(data)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        doctor_id, _legacy_schedule = current_doctor_record(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor profile not found."}), 404
        candidate_rule['doctor_id'] = doctor_id
        today = datetime.today().date()
        if candidate_rule['start_date'] <= today <= candidate_rule['end_date'] and rule_occurs_today(candidate_rule, today) and parse_schedule_time(candidate_rule['start_time']) <= datetime.now().time():
            cur.close()
            return jsonify({"error": "Start time cannot be earlier than the current time for today's schedule."}), 400
        blocked_overlap, blocked_date = availability_overlaps_blocked_dates(cur, doctor_id, candidate_rule)
        if blocked_overlap:
            cur.close()
            return jsonify({"error": f"Availability cannot overlap vacation or unavailable day on {blocked_date}."}), 400
        overlap_ok, overlap_error = validate_availability_overlap(cur, doctor_id, candidate_rule)
        if not overlap_ok:
            cur.close()
            return jsonify({"error": overlap_error}), 400
        cur.execute(
            """
            INSERT INTO doctor_availability
                (doctor_id, day_of_week, start_date, end_date, start_time, end_time, recurrence_type, recurrence_days, recurrence_metadata, timezone, appointment_duration_minutes, is_available, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, CURRENT_TIMESTAMP)
            """,
            (
                doctor_id,
                candidate_rule['day_of_week'],
                candidate_rule['start_date'],
                candidate_rule['end_date'],
                candidate_rule['start_time'],
                candidate_rule['end_time'],
                candidate_rule['recurrence_type'],
                candidate_rule['recurrence_days'],
                candidate_rule['recurrence_metadata'],
                candidate_rule['timezone'],
                candidate_rule['appointment_duration_minutes'],
            )
        )
        mysql.connection.commit()
        new_id = cur.lastrowid
        cur.close()
        return jsonify({"success": True, "id": new_id, "message": "Availability rule created."}), 201
    except Exception as e:
        log_info(f"DOCTOR AVAILABILITY CREATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to create availability."}), 500




@app.route("/api/doctor/availability/<int:rule_id>", methods=["PUT"])
def update_current_doctor_availability(rule_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    data = request.get_json(force=True) or {}
    candidate_rule, validation_error = parse_availability_payload(data)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        doctor_id, _legacy_schedule = current_doctor_record(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor profile not found."}), 404
        cur.execute(
            """
            SELECT id, doctor_id, day_of_week, start_date, end_date, start_time, end_time,
                   COALESCE(recurrence_type, 'weekly'), recurrence_days, is_available, COALESCE(appointment_duration_minutes, 30),
                   recurrence_metadata, COALESCE(timezone, 'Africa/Mogadishu')
            FROM doctor_availability
            WHERE id = %s AND doctor_id = %s AND COALESCE(is_available, 1) = 1
            """,
            (rule_id, doctor_id)
        )
        existing_row = cur.fetchone()
        if not existing_row:
            cur.close()
            return jsonify({"error": "Availability rule not found."}), 404
        existing_rule = {
            "id": existing_row[0],
            "doctor_id": existing_row[1],
            "day_of_week": existing_row[2],
            "start_date": existing_row[3],
            "end_date": existing_row[4],
            "start_time": format_time(existing_row[5])[:5] if existing_row[5] else None,
            "end_time": format_time(existing_row[6])[:5] if existing_row[6] else None,
            "recurrence_type": existing_row[7],
            "recurrence_days": existing_row[8],
            "is_available": existing_row[9],
            "appointment_duration_minutes": existing_row[10],
            "recurrence_metadata": parse_recurrence_metadata(existing_row[11]),
            "timezone": existing_row[12],
        }

        candidate_rule['doctor_id'] = doctor_id
        today = datetime.today().date()
        if candidate_rule['start_date'] <= today <= candidate_rule['end_date'] and rule_occurs_today(candidate_rule, today) and parse_schedule_time(candidate_rule['start_time']) <= datetime.now().time():
            cur.close()
            return jsonify({"error": "Start time cannot be earlier than the current time for today's schedule."}), 400
        blocked_overlap, blocked_date = availability_overlaps_blocked_dates(cur, doctor_id, candidate_rule)
        if blocked_overlap:
            cur.close()
            return jsonify({"error": f"Availability cannot overlap vacation or unavailable day on {blocked_date}."}), 400
        overlap_ok, overlap_error = validate_availability_overlap(cur, doctor_id, candidate_rule, exclude_rule_id=rule_id)
        if not overlap_ok:
            cur.close()
            return jsonify({"error": overlap_error}), 400
        uncovered_bookings = booked_appointments_not_covered(cur, doctor_id, existing_rule, candidate_rule)
        if uncovered_bookings:
            first = uncovered_bookings[0]
            cur.close()
            return jsonify({"error": f"This update would remove a booked appointment on {first['date'].isoformat()} at {first['time'].strftime('%H:%M')}. Handle the appointment before changing this rule."}), 400

        cur.execute(
            """
            UPDATE doctor_availability
            SET day_of_week = %s,
                start_date = %s,
                end_date = %s,
                start_time = %s,
                end_time = %s,
                recurrence_type = %s,
                recurrence_days = %s,
                recurrence_metadata = %s,
                timezone = %s,
                appointment_duration_minutes = %s,
                is_available = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND doctor_id = %s
            """,
            (
                candidate_rule['day_of_week'],
                candidate_rule['start_date'],
                candidate_rule['end_date'],
                candidate_rule['start_time'],
                candidate_rule['end_time'],
                candidate_rule['recurrence_type'],
                candidate_rule['recurrence_days'],
                candidate_rule['recurrence_metadata'],
                candidate_rule['timezone'],
                candidate_rule['appointment_duration_minutes'],
                rule_id,
                doctor_id,
            )
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "id": rule_id, "message": "Availability rule updated."})
    except Exception as e:
        log_info(f"DOCTOR AVAILABILITY UPDATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update availability."}), 500




@app.route("/api/doctor/availability/<int:rule_id>", methods=["DELETE"])
def delete_current_doctor_availability(rule_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        doctor_id, _legacy_schedule = current_doctor_record(cur, user)
        cur.execute(
            """
            SELECT id, doctor_id, day_of_week, start_date, end_date, start_time, end_time,
                   COALESCE(recurrence_type, 'weekly'), recurrence_days, is_available, COALESCE(appointment_duration_minutes, 30),
                   recurrence_metadata, COALESCE(timezone, 'Africa/Mogadishu')
            FROM doctor_availability
            WHERE id = %s AND doctor_id = %s
            """,
            (rule_id, doctor_id)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Availability rule not found."}), 404
        rule = {
            "id": row[0],
            "doctor_id": row[1],
            "day_of_week": row[2],
            "start_date": row[3],
            "end_date": row[4],
            "start_time": format_time(row[5])[:5] if row[5] else None,
            "end_time": format_time(row[6])[:5] if row[6] else None,
            "recurrence_type": row[7],
            "recurrence_days": row[8],
            "is_available": row[9],
            "appointment_duration_minutes": row[10],
            "recurrence_metadata": parse_recurrence_metadata(row[11]),
            "timezone": row[12],
        }
        if row[4] and parse_schedule_date(row[4]) and parse_schedule_date(row[4]) < datetime.today().date():
            cur.close()
            return jsonify({"error": "Past availability rules are automatically disabled and cannot be deleted."}), 400
        booked = booked_appointments_for_rule(cur, doctor_id, rule)
        if booked:
            first = booked[0]
            cur.close()
            return jsonify({"error": f"This rule has a booked appointment on {first['date'].isoformat()} at {first['time'].strftime('%H:%M')}. Handle the appointment before deleting the rule."}), 400
        cur.execute("DELETE FROM doctor_availability WHERE id = %s AND doctor_id = %s", (rule_id, doctor_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "message": "Availability rule removed."})
    except Exception as e:
        log_info(f"DOCTOR AVAILABILITY DELETE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to remove availability."}), 500




@app.route("/api/doctor/unavailable-dates", methods=["POST"])
def create_current_doctor_unavailable_dates():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    data = request.get_json(force=True) or {}
    start_date = parse_schedule_date(data.get('date') or data.get('start_date'))
    end_date = parse_schedule_date(data.get('end_date')) or start_date
    reason = str(data.get('reason') or 'Unavailable').strip()[:255]
    if not start_date or not end_date:
        return jsonify({"error": "Blocked date is required."}), 400
    if start_date < datetime.today().date():
        return jsonify({"error": "Blocked dates cannot be created in the past."}), 400
    if end_date < start_date:
        return jsonify({"error": "End date must be after start date."}), 400
    if end_date > datetime.today().date() + timedelta(days=365):
        return jsonify({"error": "Leave can only be blocked for the next 12 months."}), 400
    try:
        cur = mysql.connection.cursor()
        ensure_yearly_schedule_tables(cur)
        doctor_id, _legacy_schedule = current_doctor_record(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor profile not found."}), 404
        rules = fetch_availability_rules(cur, doctor_id, start_date, end_date)
        cursor_date = start_date
        while cursor_date <= end_date:
            if any(recurrence_matches_date(cursor_date, rule) for rule in rules):
                cur.close()
                return jsonify({"error": f"Vacation or unavailable dates cannot overlap active availability on {cursor_date.isoformat()}."}), 400
            cursor_date += timedelta(days=1)
        cur.execute(
            """
            SELECT appointment_date, appointment_time
            FROM appointments
            WHERE doctor_id = %s
              AND appointment_date BETWEEN %s AND %s
              AND COALESCE(sandbox_mode, 0) = 0
              AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'failed')
            ORDER BY appointment_date, appointment_time
            LIMIT 1
            """,
            (doctor_id, start_date, end_date)
        )
        booked_row = cur.fetchone()
        if booked_row:
            cur.close()
            return jsonify({"error": f"Vacation or unavailable dates cannot cover a booked appointment on {format_date(booked_row[0])} at {format_time(booked_row[1])[:5]}."}), 400
        blocked = []
        cursor_date = start_date
        while cursor_date <= end_date:
            cur.execute(
                """
                INSERT INTO doctor_unavailable_dates (doctor_id, blocked_date, reason)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE reason = VALUES(reason)
                """,
                (doctor_id, cursor_date, reason)
            )
            blocked.append(cursor_date.isoformat())
            cursor_date += timedelta(days=1)
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "blocked_dates": blocked, "message": "Unavailable dates saved."}), 201
    except Exception as e:
        log_info(f"DOCTOR UNAVAILABLE CREATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to save unavailable dates."}), 500




@app.route("/api/doctor/unavailable-dates/<int:block_id>", methods=["DELETE"])
def delete_current_doctor_unavailable_date(block_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403
    try:
        cur = mysql.connection.cursor()
        doctor_id, _legacy_schedule = current_doctor_record(cur, user)
        cur.execute("DELETE FROM doctor_unavailable_dates WHERE id = %s AND doctor_id = %s", (block_id, doctor_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"success": True, "message": "Unavailable date removed."})
    except Exception as e:
        log_info(f"DOCTOR UNAVAILABLE DELETE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to remove unavailable date."}), 500




