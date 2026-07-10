"""Dashboard repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/admin/users", methods=["GET"])
def get_admin_users():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        role_filter = request.args.get('role', '')

        offset = (page - 1) * limit
        cur = mysql.connection.cursor()
        cur.execute("SHOW COLUMNS FROM users")
        user_columns = {row[0] for row in cur.fetchall()}

        def select_column(column_name, fallback="NULL"):
            return column_name if column_name in user_columns else fallback

        # Keep the user-management list compatible with older databases. Optional
        # analytics tables/columns should not make basic user management fail.
        select_fields = [
            "id",
            f"{select_column('username')} AS username",
            f"{select_column('fullname')} AS fullname",
            f"{select_column('phone')} AS phone",
            f"{select_column('email')} AS email",
            f"{select_column('role', chr(39) + 'user' + chr(39))} AS role",
            f"{select_column('status', chr(39) + 'Active' + chr(39))} AS status",
            f"{select_column('avatar')} AS avatar",
            f"{select_column('gender')} AS gender",
            f"{select_column('age')} AS age",
            f"{select_column('created_at')} AS created_at",
        ]
        where_sql = "1 = 1"

        query = """
            SELECT {fields}
            FROM users
            WHERE {where_sql}
        """.format(fields=", ".join(select_fields), where_sql=where_sql)
        params = []

        if search:
            searchable_columns = [column for column in ['fullname', 'username', 'phone', 'role'] if column in user_columns]
            if searchable_columns:
                query += " AND (" + " OR ".join(f"{column} LIKE %s" for column in searchable_columns) + ")"
                params.extend([f'%{search}%'] * len(searchable_columns))

        if status_filter and 'status' in user_columns:
            query += " AND UPPER(status) = %s"
            params.append(status_filter.upper())

        if role_filter and 'role' in user_columns:
            query += " AND role = %s"
            params.append(role_filter)

        order_column = "created_at" if "created_at" in user_columns else "id"
        query += f" ORDER BY {order_column} DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        users = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as total
            FROM users
            WHERE {where_sql}
        """.format(where_sql=where_sql)
        count_params = []

        if search:
            searchable_columns = [column for column in ['fullname', 'username', 'phone', 'role'] if column in user_columns]
            if searchable_columns:
                count_query += " AND (" + " OR ".join(f"{column} LIKE %s" for column in searchable_columns) + ")"
                count_params.extend([f'%{search}%'] * len(searchable_columns))

        if status_filter and 'status' in user_columns:
            count_query += " AND UPPER(status) = %s"
            count_params.append(status_filter.upper())

        if role_filter and 'role' in user_columns:
            count_query += " AND role = %s"
            count_params.append(role_filter)

        cur.execute(count_query, count_params)
        total_result = cur.fetchone()
        total = total_result[0] if total_result else 0

        cur.close()

        users_list = []
        for row in users:
            record = dict(zip(columns, row))
            users_list.append({
                "id": record.get("id"),
                "username": record.get("username"),
                "name": record.get("fullname"),
                "phone": record.get("phone"),
                "email": record.get("email"),
                "role": record.get("role"),
                "status": record.get("status"),
                "avatar": record.get("avatar"),
                "gender": record.get("gender"),
                "age": record.get("age"),
                "createdAt": record.get("created_at").isoformat() if record.get("created_at") else None,
                "prediction_count": 0,
                "appointment_count": 0,
            })

        return jsonify({
            "users": users_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })

    except Exception as e:
        log_info(f"âŒ ADMIN USERS ERROR: {e}")
        logger.exception("Unhandled backend error")
        log_info("ADMIN USERS ERROR:", str(e))
        return jsonify({"users": [], "pagination": {"page": 1, "limit": 10, "total": 0, "pages": 0}}), 500




@app.route("/api/admin/users", methods=["POST"])
def create_admin_user():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    fullname = data.get('name', '').strip()
    username = data.get('username', '').strip()
    raw_phone = data.get('phone')
    phone = raw_phone.strip() if isinstance(raw_phone, str) else ''
    role = data.get('role', 'user').strip()
    status = data.get('status', 'Active').strip()
    password = data.get('password', '').strip() or os.getenv('DEFAULT_USER_PASSWORD', 'ChangeMe123')

    if not fullname or not username or not phone or not role:
        return jsonify({"error": "Name, username, phone, and role are required."}), 400

    try:
        hashed_password = generate_password_hash(password)
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE username = %s OR phone = %s", (username, phone))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Username or phone number is already registered."}), 400
        cur.execute(
            "INSERT INTO users (username, fullname, phone, email, password, role, status, environment, sandbox_mode, phone_verified) VALUES (%s, %s, %s, %s, %s, %s, %s, 'production', 0, 1)",
            (username, fullname, phone, None, hashed_password, role, status)
        )
        mysql.connection.commit()
        user_id = cur.lastrowid
        cur.close()

        return jsonify({
            "user": {
                "id": user_id,
                "username": username,
                "name": fullname,
                "phone": phone,
                "role": role,
                "status": status,
                "createdAt": utc_now_naive().isoformat(),
            }
        }), 201
    except Exception as e:
        log_info(f"âŒ CREATE ADMIN USER ERROR: {e}")
        return jsonify({"error": "Unable to create user."}), 500




@app.route("/api/admin/analytics", methods=["GET"])
def get_admin_analytics():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        # User growth over time (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY month
            ORDER BY month
        """)
        user_growth = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Prediction trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY month
            ORDER BY month
        """)
        prediction_trends = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Appointment trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM appointments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY month
            ORDER BY month
        """)
        appointment_trends = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Revenue trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
                   SUM(COALESCE(net_amount, amount - COALESCE(refunded_amount, 0), amount)) as revenue
            FROM payments
            WHERE payment_status = 'Completed'
              AND COALESCE(sandbox_mode, 0) = 0
              AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        revenue_trends = [{"month": row[0], "revenue": float(row[1]) if row[1] else 0} for row in cur.fetchall()]

        # Anxiety trends over time
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM predictions
            WHERE prediction_result = 'Anxiety'
              AND COALESCE(sandbox_mode, 0) = 0
              AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        anxiety_trends = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        cur.close()

        return jsonify({
            "user_growth": user_growth,
            "prediction_trends": prediction_trends,
            "appointment_trends": appointment_trends,
            "revenue_trends": revenue_trends,
            "anxiety_trends": anxiety_trends
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN ANALYTICS ERROR: {e}")
        return jsonify({"error": "Unable to load analytics. Please try again."}), 500




@app.route("/api/admin/dashboard-stats", methods=["GET"])
def get_admin_dashboard_stats():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        # Totals
        cur.execute("SELECT COUNT(*) FROM predictions WHERE COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor'")
        total_predictions = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM users WHERE COALESCE(sandbox_mode, 0) = 0")
        total_users = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM doctors WHERE COALESCE(sandbox_mode, 0) = 0")
        total_doctors = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM appointments WHERE COALESCE(sandbox_mode, 0) = 0")
        total_appointments = int(cur.fetchone()[0] or 0)

        # Prediction result counts
        cur.execute("SELECT prediction_result, COUNT(*) as count FROM predictions WHERE COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor' GROUP BY prediction_result")
        rows = cur.fetchall()
        result_counts = {row[0]: int(row[1]) for row in rows} if rows else {}

        anxiety_count = int(result_counts.get('Anxiety', result_counts.get('anxiety', 0)))
        depression_count = int(result_counts.get('Depression', result_counts.get('depression', 0)))
        neutral_count = int(result_counts.get('Neutral', result_counts.get('neutral', 0)))

        # Monthly insights for predictions (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY month
            ORDER BY month
        """)
        monthly = [{"month": row[0], "count": int(row[1])} for row in cur.fetchall()]

        # Distribution percentages
        total_for_distribution = anxiety_count + depression_count + neutral_count
        if total_for_distribution == 0:
            distribution = {"anxiety": 0, "depression": 0, "neutral": 0}
        else:
            distribution = {
                "anxiety": round((anxiety_count / total_for_distribution) * 100, 2),
                "depression": round((depression_count / total_for_distribution) * 100, 2),
                "neutral": round((neutral_count / total_for_distribution) * 100, 2),
            }

        cur.close()

        return jsonify({
            "stats": {
                "totalPredictions": total_predictions,
                "totalUsers": total_users,
                "totalAppointments": total_appointments,
                "totalDoctors": total_doctors,
                # Backwards-compatible keys used by frontend
                "anxietyCases": anxiety_count,
                "depressionCases": depression_count,
                "neutralCases": neutral_count,
                "anxiety": anxiety_count,
                "depression": depression_count,
                "neutral": neutral_count,
            },
            "monthlyInsights": monthly,
            "distribution": distribution,
            "raw_result_counts": result_counts,
        })

    except Exception as e:
        log_info(f"âŒ DASHBOARD STATS ERROR: {e}")
        return jsonify({"error": "Unable to load dashboard stats. Please try again."}), 500




@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
def update_user_status(user_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    
    # Check if this is a full user update or just status update
    if 'name' in data or 'phone' in data or 'email' in data or 'role' in data:
        # Full user update
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        role = data.get('role', '').strip()
        status = data.get('status', '').strip()
        password = data.get('password', '').strip()

        if not mysql:
            return jsonify({"error": "Database unavailable"}), 500

        try:
            cur = mysql.connection.cursor()
            
            # Build update query dynamically based on provided fields
            update_fields = []
            update_values = []
            
            if name:
                update_fields.append("fullname = %s")
                update_values.append(name)
            if phone:
                update_fields.append("phone = %s")
                update_values.append(phone)
            if role:
                update_fields.append("role = %s")
                update_values.append(role)
            if status:
                valid_statuses = ['Active', 'Inactive', 'Suspended']
                if status not in valid_statuses:
                    return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
                update_fields.append("status = %s")
                update_values.append(status)
            if password:
                # Hash password
                import hashlib
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                update_fields.append("password = %s")
                update_values.append(password_hash)
            
            if not update_fields:
                return jsonify({"error": "No fields to update."}), 400
            
            update_values.append(user_id)
            
            cur.execute(f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s", update_values)
            mysql.connection.commit()
            rows_affected = cur.rowcount
            cur.close()

            if rows_affected == 0:
                return jsonify({"error": "User not found."}), 404

            return jsonify({"message": "User updated successfully."})
        except Exception as e:
            log_info(f"âŒ UPDATE USER ERROR: {e}")
            logger.exception("Unhandled backend error")
            return jsonify({"error": "Unable to update user."}), 500
    else:
        # Status-only update (backward compatibility)
        status = data.get('status', '').strip()

        if not status:
            return jsonify({"error": "Status is required."}), 400

        valid_statuses = ['Active', 'Inactive', 'Suspended']
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        if not mysql:
            return jsonify({"error": "Database unavailable"}), 500

        try:
            cur = mysql.connection.cursor()
            cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
            mysql.connection.commit()
            rows_affected = cur.rowcount
            cur.close()

            if rows_affected == 0:
                return jsonify({"error": "User not found."}), 404

            return jsonify({"message": "User status updated successfully."})
        except Exception as e:
            log_info(f"âŒ UPDATE USER STATUS ERROR: {e}")
            return jsonify({"error": "Unable to update user status."}), 500




@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        user_exists = cur.fetchone()
        if not user_exists:
            cur.close()
            return jsonify({"error": "User not found."}), 404

        # Delete dependent records first to avoid foreign key constraint failures.
        dependent_tables = [
            'notifications',
            'recommendations',
            'payments',
            'appointments',
            'predictions',
            'admins',
            'doctors'
        ]
        for table in dependent_tables:
            cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))

        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        mysql.connection.commit()
        rows_affected = cur.rowcount
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "User not found."}), 404

        return jsonify({"message": "User deleted successfully."})
    except Exception as e:
        log_info(f"âŒ DELETE USER ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to delete user."}), 500




@app.route("/api/users", methods=["GET"])
def get_users():
    user, auth_error = require_roles('admin')
    if auth_error:
        return auth_error

    if not mysql:
        return jsonify({"users": []})

    try:
        cur = mysql.connection.cursor()

        cur.execute("""
            SELECT id, fullname, email, role, status, created_at
            FROM users
            ORDER BY created_at DESC
        """)

        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        cur.close()

        users = []
        for row in rows or []:
            record = dict(zip(columns, row))
            users.append({
                "id": record.get("id"),
                "name": record.get("fullname"),
                "email": record.get("email"),
                "role": record.get("role"),
                "status": record.get("status"),
                "createdAt": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
            })

        return jsonify({"users": users})

    except Exception as e:
        log_info(f"âŒ USERS ERROR: {e}")
        return jsonify({"users": []}), 500




@app.route("/api/dashboard-stats", methods=["GET"])
def get_dashboard_stats():
    user, auth_error = require_roles('admin')
    if auth_error:
        return auth_error

    if not mysql:
        return jsonify({"stats": {"totalUsers": 0, "totalPredictions": 0, "totalAppointments": 0, "totalPayments": 0}})

    try:
        cur = mysql.connection.cursor()

        # Get total users
        cur.execute("SELECT COUNT(*) FROM users WHERE COALESCE(sandbox_mode, 0) = 0")
        total_users = cur.fetchone()[0]

        # Get active users
        cur.execute("SELECT COUNT(*) FROM users WHERE status = 'Active' AND COALESCE(sandbox_mode, 0) = 0")
        active_users = cur.fetchone()[0]

        # Get total predictions
        cur.execute("SELECT COUNT(*) FROM predictions WHERE COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor'")
        total_predictions = cur.fetchone()[0]

        # Get anxiety cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Anxiety' AND COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor'")
        anxiety_cases = cur.fetchone()[0]

        # Get depression cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Depression' AND COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor'")
        depression_cases = cur.fetchone()[0]

        # Get neutral cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Neutral' AND COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor'")
        neutral_cases = cur.fetchone()[0]

        # Get total appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE COALESCE(sandbox_mode, 0) = 0")
        total_appointments = cur.fetchone()[0]

        # Get pending appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Pending' AND COALESCE(sandbox_mode, 0) = 0")
        pending_appointments = cur.fetchone()[0]

        # Get completed appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Completed' AND COALESCE(sandbox_mode, 0) = 0")
        completed_appointments = cur.fetchone()[0]

        # Get cancelled appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled' AND COALESCE(sandbox_mode, 0) = 0")
        cancelled_appointments = cur.fetchone()[0]

        # Get total payments
        cur.execute("SELECT COUNT(*) FROM payments WHERE COALESCE(sandbox_mode, 0) = 0")
        total_payments = cur.fetchone()[0]

        # Get total payment amount
        cur.execute("SELECT SUM(COALESCE(net_amount, amount - COALESCE(refunded_amount, 0), amount)) FROM payments WHERE payment_status = 'Completed' AND COALESCE(sandbox_mode, 0) = 0")
        total_payment_amount = cur.fetchone()[0] or 0

        # Get active doctors
        cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'Active' AND COALESCE(sandbox_mode, 0) = 0")
        active_doctors = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'Active' AND COALESCE(sandbox_mode, 0) = 0 AND DATE(created_at) = CURDATE()")
        new_doctors_today = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM predictions WHERE COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor' AND DATE(created_at) = CURDATE()")
        new_assessments_today = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM appointments WHERE COALESCE(sandbox_mode, 0) = 0 AND DATE(created_at) = CURDATE()")
        new_appointments_today = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM payments WHERE payment_status = 'Completed' AND COALESCE(sandbox_mode, 0) = 0 AND DATE(COALESCE(paid_at, created_at)) = CURDATE()")
        new_payments_today = cur.fetchone()[0]

        # Get recent predictions (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND COALESCE(sandbox_mode, 0) = 0
              AND sharing_status = 'shared_with_doctor'
        """)
        recent_predictions = cur.fetchone()[0]

        # Get recent users (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND COALESCE(sandbox_mode, 0) = 0
        """)
        recent_users = cur.fetchone()[0]

        # Get failed payments
        cur.execute("SELECT COUNT(*) FROM payments WHERE payment_status = 'Failed' AND COALESCE(sandbox_mode, 0) = 0")
        failed_payments = cur.fetchone()[0]

        # Get unread notifications
        cur.execute("SELECT COUNT(*) FROM notifications WHERE status = 'Unread' AND COALESCE(sandbox_mode, 0) = 0")
        unread_notifications = cur.fetchone()[0]

        cur.close()

        return jsonify({
            "stats": {
                "totalUsers": total_users,
                "activeUsers": active_users,
                "totalPredictions": total_predictions,
                "anxietyCases": anxiety_cases,
                "depressionCases": depression_cases,
                "neutralCases": neutral_cases,
                "totalAppointments": total_appointments,
                "pendingAppointments": pending_appointments,
                "completedAppointments": completed_appointments,
                "cancelledAppointments": cancelled_appointments,
                "totalPayments": total_payments,
                "totalPaymentAmount": float(total_payment_amount),
                "activeDoctors": active_doctors,
                "totalDoctors": active_doctors,
                "newDoctors": new_doctors_today,
                "newDoctorsToday": new_doctors_today,
                "newAssessmentsToday": new_assessments_today,
                "newAppointmentsToday": new_appointments_today,
                "newPaymentsToday": new_payments_today,
                "recentPredictions": recent_predictions,
                "recentUsers": recent_users,
                "failedPayments": failed_payments,
                "unreadNotifications": unread_notifications,
            }
        })

    except Exception as e:
        log_info(f"âŒ DASHBOARD STATS ERROR: {e}")
        return jsonify({"stats": {"totalUsers": 0, "totalPredictions": 0, "totalAppointments": 0, "totalPayments": 0}}), 500




@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    """User-facing dashboard stats endpoint.
    Returns top-level JSON with four counts for the logged-in user.
    """
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    if request.args.get('test') == 'true':
        return jsonify({"message": "API working", "endpoint": "/api/dashboard/stats"}), 200

    try:
        user = get_current_user()
        if not user or not user.get('user_id'):
            return jsonify({"error": "Unauthorized"}), 401
        if canonical_role(user.get('role')) != 'user':
            return jsonify({"error": "Patient dashboard statistics are available to patient accounts only."}), 403

        user_id = user.get('user_id')
        cur = mysql.connection.cursor()

        # totalPredictions
        try:
            cur.execute("SELECT COUNT(*) FROM predictions WHERE user_id = %s", (user_id,))
            totalPredictions = cur.fetchone()[0] or 0
        except Exception as q1e:
            log_info(f"âŒ QUERY totalPredictions ERROR: {q1e}")
            totalPredictions = 0

        # doctorsAvailable (global)
        try:
            cur.execute("SELECT COUNT(*) FROM doctors")
            doctorsAvailable = cur.fetchone()[0] or 0
        except Exception as q2e:
            log_info(f"âŒ QUERY doctorsAvailable ERROR: {q2e}")
            doctorsAvailable = 0

        # myAppointments
        try:
            cur.execute("SELECT COUNT(*) FROM appointments WHERE user_id = %s", (user_id,))
            myAppointments = cur.fetchone()[0] or 0
        except Exception as q3e:
            log_info(f"âŒ QUERY myAppointments ERROR: {q3e}")
            myAppointments = 0

        # paymentsMade
        try:
            cur.execute("SELECT COUNT(*) FROM payments WHERE user_id = %s", (user_id,))
            paymentsMade = cur.fetchone()[0] or 0
        except Exception as q4e:
            log_info(f"âŒ QUERY paymentsMade ERROR: {q4e}")
            paymentsMade = 0

        cur.close()

        return jsonify({
            "totalPredictions": int(totalPredictions),
            "doctorsAvailable": int(doctorsAvailable),
            "myAppointments": int(myAppointments),
            "paymentsMade": int(paymentsMade),
        })

    except Exception as e:
        log_info(f"âŒ DASHBOARD/STATS ERROR: {e}")
        return jsonify({"error": "Unable to load dashboard statistics. Please try again."}), 500




