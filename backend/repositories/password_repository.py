"""Password repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/admin/doctor-passwords", methods=["GET"])
def get_admin_doctor_passwords():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    search = str(request.args.get('search') or '').strip()
    status_filter = str(request.args.get('status') or '').strip().lower()
    recent_only = status_filter == 'recent'

    try:
        cur = mysql.connection.cursor()
        query = """
            SELECT d.id AS doctor_id, d.user_id, d.name, COALESCE(d.username, u.username) AS username,
                   COALESCE(d.phone, u.phone) AS phone, d.created_at AS doctor_created_at,
                   u.last_login, COALESCE(u.must_change_password, 0) AS must_change_password,
                   r.generated_password, r.current_password_visible, r.status AS password_status,
                   r.password_last_changed, r.changed_by, r.require_change_next_login
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            LEFT JOIN doctor_password_records r ON r.doctor_id = d.id
            WHERE u.role = 'doctor'
        """
        params = []
        if search:
            query += """
                AND (
                    d.name LIKE %s OR u.fullname LIKE %s OR d.username LIKE %s OR
                    u.username LIKE %s OR d.phone LIKE %s OR u.phone LIKE %s OR
                    COALESCE(r.status, '') LIKE %s
                )
            """
            like = f"%{search}%"
            params.extend([like, like, like, like, like, like, like])
        if status_filter and not recent_only and status_filter != 'all':
            query += " AND COALESCE(r.status, 'generated') = %s"
            params.append(status_filter)
        if recent_only:
            query += " AND r.password_last_changed >= DATE_SUB(NOW(), INTERVAL 7 DAY)"

        query += " ORDER BY COALESCE(r.password_last_changed, d.created_at) DESC, d.id DESC"
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        records = []
        for row in rows:
            item = dict(zip(columns, row))
            status = item.get('password_status') or ('temporary' if item.get('must_change_password') else 'changed')
            records.append({
                "doctor_id": item.get('doctor_id'),
                "user_id": item.get('user_id'),
                "doctor_name": item.get('name'),
                "username": item.get('username'),
                "phone": item.get('phone'),
                "generated_password": None,
                "generated_password_available": bool(item.get('generated_password')),
                "current_password": None,
                "current_password_available": bool(item.get('current_password_visible')),
                "password_status": status,
                "password_status_label": status_label_for_password(status),
                "password_last_changed": serialize_datetime(item.get('password_last_changed')),
                "changed_by": item.get('changed_by') or 'System',
                "account_created_date": serialize_datetime(item.get('doctor_created_at')),
                "last_login": serialize_datetime(item.get('last_login')),
                "must_change_password": bool(item.get('must_change_password')),
                "require_change_next_login": bool(item.get('require_change_next_login')),
            })

        return jsonify({"passwords": records})
    except Exception as e:
        log_info(f"ADMIN DOCTOR PASSWORDS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor passwords."}), 500




@app.route("/api/admin/doctor-passwords/<int:doctor_id>/access", methods=["POST"])
def access_admin_doctor_password(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "System administrator access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    field = str(data.get("field") or "").strip().lower()
    action = str(data.get("action") or "view").strip().lower()
    if field not in ["generated_password", "current_password"] or action not in ["view", "copy"]:
        return jsonify({"error": "Invalid password access request."}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT d.name, r.generated_password, r.current_password_visible, r.status
            FROM doctors d
            JOIN users u ON u.id = d.user_id AND u.role = 'doctor'
            LEFT JOIN doctor_password_records r ON r.doctor_id = d.id
            WHERE d.id = %s
            """,
            (doctor_id,),
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"error": "Doctor password record not found."}), 404

        doctor_name, generated_password, current_password, status = row
        password = generated_password if field == "generated_password" else current_password
        if not password:
            return jsonify({
                "error": "Doctor-chosen passwords are protected by one-way hashing and cannot be viewed or copied. Reset the password to create a temporary credential."
            }), 409

        event = "VIEWED_DOCTOR_TEMPORARY_PASSWORD" if action == "view" else "COPIED_DOCTOR_TEMPORARY_PASSWORD"
        write_audit_log(user, event, json.dumps({
            "admin_id": user.get("user_id") or user.get("super_admin_id"),
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "field": field,
            "action": "Viewed" if action == "view" else "Copied",
            "status": status,
            "ip_address": request.headers.get("X-Forwarded-For", request.remote_addr),
            "date": utc_now_naive().isoformat(),
        }))
        return jsonify({"password": password, "field": field})
    except Exception as e:
        log_info(f"DOCTOR PASSWORD ACCESS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to access temporary password."}), 500




@app.route("/api/admin/doctor-passwords/<int:doctor_id>/history", methods=["GET"])
def get_admin_doctor_password_history(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT h.id, h.doctor_id, h.changed_by, h.reason, h.status, h.change_date, d.name
            FROM doctor_password_history h
            JOIN doctors d ON d.id = h.doctor_id
            WHERE h.doctor_id = %s
            ORDER BY h.change_date DESC, h.id DESC
            """,
            (doctor_id,)
        )
        rows = cur.fetchall()
        cur.close()
        history = []
        for row in rows:
            history.append({
                "history_id": row[0],
                "doctor_id": row[1],
                "old_password": None,
                "new_password": None,
                "changed_by": row[2],
                "reason": row[3],
                "status": row[4],
                "status_label": status_label_for_password(row[4]),
                "change_date": serialize_datetime(row[5]),
                "doctor_name": row[6],
            })
        return jsonify({"history": history})
    except Exception as e:
        log_info(f"ADMIN DOCTOR PASSWORD HISTORY ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load password history."}), 500




@app.route("/api/admin/doctor-passwords/<int:doctor_id>/reset", methods=["POST"])
def reset_admin_doctor_password(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT d.id, d.user_id, d.name, COALESCE(d.username, u.username), u.created_at
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            WHERE d.id = %s AND u.role = 'doctor'
            """,
            (doctor_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404

        _doctor_id, user_id, doctor_name, username, account_created_at = row
        new_password = generate_secure_doctor_password()
        hashed_password = generate_password_hash(new_password)
        cur.execute(
            "UPDATE users SET password = %s, must_change_password = 1 WHERE id = %s",
            (hashed_password, user_id)
        )
        sync_doctor_password_record(
            cur,
            doctor_id,
            user_id,
            new_password,
            'reset',
            'Admin',
            'Reset',
            changed_by_user_id=user.get('user_id') or user.get('super_admin_id'),
            account_created_at=account_created_at,
        )
        mysql.connection.commit()
        write_audit_log(user, "RESET_DOCTOR_PASSWORD", json.dumps({"doctor_id": doctor_id, "doctor_name": doctor_name, "username": username}))
        cur.close()
        return jsonify({
            "message": "Doctor password reset successfully.",
            "doctor_id": doctor_id,
            "generated_password": new_password,
            "password_status": "reset",
            "password_status_label": status_label_for_password("reset"),
        })
    except Exception as e:
        mysql.connection.rollback()
        log_info(f"ADMIN DOCTOR PASSWORD RESET ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to reset doctor password."}), 500




