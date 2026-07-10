"""Notification repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/admin/notifications", methods=["GET"])
def get_admin_notifications():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        type_filter = request.args.get('type', 'all')
        read_filter = request.args.get('read', 'all')

        # Build query
        query = """
            SELECT n.id, n.user_id, n.recipient, n.title, n.message, COALESCE(n.type, n.notification_type), n.role_target, n.reference_id, n.is_read, n.recipient_type, n.status, n.created_at,
                    u.fullname, u.phone
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE COALESCE(n.sandbox_mode, 0) = 0
        """
        params = []

        if type_filter != 'all':
            query += " AND (n.type = %s OR n.notification_type = %s)"
            params.extend([normalize_notification_type(type_filter), type_filter])

        if read_filter != 'all':
            status_value = 'Read' if read_filter == 'read' else 'Unread'
            query += " AND n.status = %s"
            params.append(status_value)

        query += " ORDER BY n.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cur.execute(query, params)
        notifications = cur.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE COALESCE(n.sandbox_mode, 0) = 0
        """
        count_params = []
        if type_filter != 'all':
            count_query += " AND (n.type = %s OR n.notification_type = %s)"
            count_params.extend([normalize_notification_type(type_filter), type_filter])
        if read_filter != 'all':
            status_value = 'Read' if read_filter == 'read' else 'Unread'
            count_query += " AND n.status = %s"
            count_params.append(status_value)

        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]

        cur.close()

        return jsonify({
            "notifications": [{
                "id": n[0],
                "user_id": n[1],
                "recipient": n[2] or n[12] or n[13] or 'All Users',
                "title": n[3] or n[5] or 'Notification',
                "message": n[4],
                "type": n[5] or 'SYSTEM',
                "role_target": n[6],
                "reference_id": n[7],
                "is_read": bool(n[8]) or str(n[10] or '').lower() == 'read',
                "recipient_type": n[9] or n[6] or 'all',
                "status": n[10],
                "created_at": n[11].isoformat() if n[11] else None,
                "user_name": n[12],
                "user_phone": n[13]
            } for n in notifications],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN NOTIFICATIONS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load notifications. Please try again."}), 500




@app.route("/api/admin/notifications", methods=["POST"])
def create_notification():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    try:
        data = request.get_json(force=True)
        if data is None:
            raise ValueError('JSON payload is required')
    except Exception as parse_error:
        log_info(f"âŒ CREATE NOTIFICATION JSON ERROR: {parse_error}")
        return jsonify({"error": "Invalid JSON payload."}), 400
    data = data or {}
    message = data.get('message', '').strip()
    notification_type = data.get('type', 'general').strip()
    recipient_type = str(data.get('recipientType', 'all') or 'all').strip().lower()
    user_ids = data.get('user_ids', [])  # Empty list means broadcast to matching role group

    if not message:
        return jsonify({"error": "Message is required."}), 400

    if recipient_type not in ['all', 'users', 'doctors']:
        recipient_type = 'all'

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        query = "SELECT id, email FROM users"
        filters = []
        params = []

        if user_ids:
            placeholders = ','.join(['%s'] * len(user_ids))
            filters.append(f"id IN ({placeholders})")
            params.extend(user_ids)

        if recipient_type == 'users':
            filters.append("role = 'user'")
        elif recipient_type == 'doctors':
            filters.append("role = 'doctor'")

        if filters:
            query += " WHERE " + " AND ".join(filters)

        cur.execute(query, params)
        user_rows = cur.fetchall()

        sent_count = 0
        normalized_type = normalize_notification_type(notification_type)
        legacy_type = notification_legacy_type(normalized_type)
        for user_row in user_rows:
            recipient = user_row[1] or 'All Users'
            cur.execute(
                """
                INSERT INTO notifications
                  (user_id, role_target, title, recipient, message, type, reference_id, is_read, notification_type, recipient_type, status)
                VALUES (%s, %s, %s, %s, %s, %s, NULL, 0, %s, %s, 'Unread')
                """,
                (user_row[0], recipient_type, data.get('title', '').strip() or normalized_type, recipient, message, normalized_type, legacy_type, recipient_type)
            )
            sent_count += 1

        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Notification sent successfully.",
            "recipient_type": recipient_type,
            "sent_count": sent_count
        })
    except Exception as e:
        log_info(f"âŒ CREATE NOTIFICATION ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to send notification."}), 500




@app.route("/api/user/notifications", methods=["GET"]) 
def get_user_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not mysql:
        return jsonify({"notifications": []})

    try:
        cur = mysql.connection.cursor()
        # Fetch notifications for this user ordered by latest first
        cur.execute(
            """
            SELECT id, user_id, role_target, title, recipient, message, COALESCE(type, notification_type) AS type,
                   reference_id, is_read, notification_type, status, created_at
            FROM notifications
            WHERE user_id = %s
              AND COALESCE(sandbox_mode, 0) = 0
            ORDER BY created_at DESC
            """,
            (user.get('user_id'),)
        )
        rows = cur.fetchall()
        columns = [c[0] for c in cur.description] if cur.description else []
        cur.close()

        notifications = []
        for row in rows or []:
            record = dict(zip(columns, row))
            notifications.append({
                "id": record.get('id'),
                "user_id": record.get('user_id'),
                "role_target": record.get('role_target'),
                "title": record.get('title') or record.get('type') or record.get('notification_type') or 'Notification',
                "recipient": record.get('recipient'),
                "message": record.get('message'),
                "type": record.get('type') or record.get('notification_type') or 'SYSTEM',
                "reference_id": record.get('reference_id'),
                "status": record.get('status') or 'Unread',
                "is_read": bool(record.get('is_read')) or str(record.get('status') or 'Unread').lower() == 'read',
                "created_at": record.get('created_at').isoformat() if record.get('created_at') else None,
            })

        return jsonify({"notifications": notifications})
    except Exception as e:
        log_info(f"âŒ GET USER NOTIFICATIONS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"notifications": []}), 500




@app.route('/api/user/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE notifications SET status = 'Read', is_read = 1 WHERE id = %s AND user_id = %s", (notification_id, user.get('user_id')))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        if rows == 0:
            return jsonify({"error": "Notification not found or access denied."}), 404
        return jsonify({"message": "Notification marked as read."})
    except Exception as e:
        log_info(f"âŒ MARK NOTIFICATION READ ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update notification."}), 500




@app.route('/api/user/notifications/<int:notification_id>/unread', methods=['PUT'])
def mark_notification_unread(notification_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE notifications SET status = 'Unread', is_read = 0 WHERE id = %s AND user_id = %s", (notification_id, user.get('user_id')))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        if rows == 0:
            return jsonify({"error": "Notification not found or access denied."}), 404
        return jsonify({"message": "Notification marked as unread."})
    except Exception as e:
        log_info(f"âŒ MARK NOTIFICATION UNREAD ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update notification."}), 500




@app.route('/api/user/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_read():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE notifications SET status = 'Read', is_read = 1 WHERE user_id = %s AND status != 'Read'", (user.get('user_id'),))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        return jsonify({"message": f"{rows} notifications marked as read."})
    except Exception as e:
        log_info(f"âŒ MARK ALL READ ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update notifications."}), 500




@app.route('/api/user/notifications/<int:notification_id>', methods=['DELETE'])
def delete_user_notification(notification_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        # Check if notification belongs to the user
        cur.execute("SELECT id, user_id FROM notifications WHERE id = %s", (notification_id,))
        notification = cur.fetchone()
        
        if not notification:
            cur.close()
            return jsonify({"error": "Notification not found."}), 404
        
        notification_user_id = notification[1]
        
        # Only allow the authenticated account to delete its own notifications
        if user.get('user_id') != notification_user_id:
            cur.close()
            return jsonify({"error": "Permission denied."}), 403
        
        # Delete the notification
        cur.execute("DELETE FROM notifications WHERE id = %s", (notification_id,))
        mysql.connection.commit()
        cur.close()
        
        return jsonify({"message": "Notification deleted successfully."})
    except Exception as e:
        log_info(f"âŒ DELETE NOTIFICATION ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to delete notification."}), 500




@app.route("/api/admin/sms", methods=["GET"])
def get_admin_sms_management():
    user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_sms_tables(cur)
        cur.execute("SELECT COUNT(*) FROM sms_logs")
        total_sms = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM sms_logs WHERE LOWER(status) IN ('failed', 'error')")
        failed_sms = cur.fetchone()[0]
        cur.execute("""
            SELECT sms_type, COUNT(*)
            FROM sms_logs
            GROUP BY sms_type
            ORDER BY COUNT(*) DESC
        """)
        by_type = {row[0]: row[1] for row in cur.fetchall() or []}
        cur.execute("""
            SELECT id, phone_number, message, sms_type, status, gateway_response, error_reason, created_at
            FROM sms_logs
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cur.fetchall() or []
        cur.close()

        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "phone_number": row[1],
                "message": row[2],
                "sms_type": row[3],
                "status": row[4],
                "gateway_response": row[5],
                "error_reason": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
            })

        balance, balance_error = get_tabaarak_sms_balance()
        return jsonify({
            "total_sms": total_sms,
            "failed_sms": failed_sms,
            "successful_sms": max(total_sms - failed_sms, 0),
            "by_type": by_type,
            "balance": balance,
            "balance_error": balance_error,
            "logs": logs,
        })
    except Exception as e:
        log_info(f"ADMIN SMS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load SMS management data."}), 500




