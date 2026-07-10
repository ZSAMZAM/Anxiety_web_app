"""Payment repository handlers."""

from utils.runtime import *  # noqa: F401,F403


def _decoded_merchant_response(raw_response):
    if isinstance(raw_response, dict):
        return raw_response
    if not raw_response:
        return {}
    try:
        return json.loads(raw_response)
    except Exception:
        return {}


def _merchant_purchase_confirms_payment(raw_response, amount):
    response_data = _decoded_merchant_response(raw_response)
    if not response_data:
        return False
    if normalize_hormuud_status(response_data) != "Completed":
        return False
    return merchant_amount_matches(response_data, amount)


def _payment_success_message(amount, currency, patient_name, doctor_name, transaction_id):
    return (
        f"Amount: {float(amount or 0):.2f} {currency}. Patient: {patient_name}. "
        f"Doctor: {doctor_name or 'Selected doctor'}. Transaction ID: {transaction_id}."
    )


def _create_payment_success_notifications(cur, payment_id, owner_id, doctor_id, amount, currency, transaction_id):
    cur.execute("SELECT fullname, username FROM users WHERE id = %s", (owner_id,))
    patient_row = cur.fetchone()
    patient_name = (patient_row[0] or patient_row[1]) if patient_row else f"Patient {owner_id}"
    doctor_user_id = None
    doctor_name = None
    if doctor_id:
        cur.execute("SELECT user_id, name FROM doctors WHERE id = %s", (doctor_id,))
        doctor_row = cur.fetchone()
        if doctor_row:
            doctor_user_id = doctor_row[0]
            doctor_name = doctor_row[1]

    payment_message = _payment_success_message(amount, currency, patient_name, doctor_name, transaction_id)
    create_user_notification(
        owner_id,
        "Payment completed successfully",
        f"Payment completed successfully. {payment_message}",
        "PAYMENT",
        reference_id=payment_id,
        role_target='user',
    )
    if doctor_user_id:
        create_user_notification(
            doctor_user_id,
            "Appointment payment received",
            f"Appointment payment received. {payment_message}",
            "PAYMENT",
            reference_id=payment_id,
            role_target='doctor',
        )
    create_role_notifications(
        'admin',
        'New payment received',
        f"New payment received. {payment_message}",
        'PAYMENT',
        payment_id,
        roles=['admin', 'super_admin', 'it_admin'],
    )


def _ledger_has_payment_completed(cur, payment_id):
    try:
        cur.execute(
            """
            SELECT id
            FROM financial_ledger
            WHERE payment_id = %s AND event_type = 'PAYMENT_COMPLETED'
            LIMIT 1
            """,
            (payment_id,),
        )
        return cur.fetchone() is not None
    except Exception:
        return False


def _confirm_paid_appointment(cur, payment_id, appointment_id, owner_id):
    cur.execute(
        """
        UPDATE appointments
        SET status = 'Confirmed',
            payment_status = 'Completed',
            payment_id = %s
        WHERE id = %s
          AND user_id = %s
          AND LOWER(COALESCE(payment_status, 'pending')) NOT IN ('paid', 'completed', 'success', 'successful')
        """,
        (payment_id, appointment_id, owner_id),
    )
    cur.execute(
        """
        SELECT id
        FROM appointments
        WHERE id = %s
          AND user_id = %s
          AND LOWER(COALESCE(status, '')) IN ('confirmed', 'completed')
          AND LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
        LIMIT 1
        """,
        (appointment_id, owner_id),
    )
    if not cur.fetchone():
        return None
    mark_paid_appointment_slot_booked(cur, appointment_id)
    return share_paid_appointment_assessment(cur, appointment_id, owner_id)


def _mark_payment_completed(cur, payment_id, amount, merchant_response=None, source="payment_reconciliation"):
    cur.execute(
        """
        UPDATE payments
        SET payment_status = 'Completed',
            failure_reason = NULL,
            paid_at = COALESCE(paid_at, NOW()),
            net_amount = %s,
            merchant_response = COALESCE(%s, merchant_response)
        WHERE id = %s
        """,
        (amount, json.dumps(merchant_response, default=str) if merchant_response else None, payment_id),
    )
    if not _ledger_has_payment_completed(cur, payment_id):
        log_financial_event(
            cur,
            payment_id,
            "PAYMENT_COMPLETED",
            amount,
            0,
            amount,
            metadata={"source": source},
        )


def _write_payment_reconciliation_audit(cur, payment_id, appointment_id, transaction_id, provider_transaction_id, reason):
    try:
        cur.execute(
            """
            INSERT INTO audit_logs (actor, role, action, description, ip_address)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                "system",
                "system",
                "PAYMENT_RECONCILED",
                json.dumps({
                    "payment_id": payment_id,
                    "appointment_id": appointment_id,
                    "transaction_id": transaction_id,
                    "provider_transaction_id": provider_transaction_id,
                    "reason": reason,
                }, default=str),
                "127.0.0.1",
            ),
        )
    except Exception as exc:
        log_info(f"PAYMENT RECONCILIATION AUDIT ERROR: {exc}")


def _successful_payment_status(value):
    return str(value or '').strip().lower() in {'completed', 'paid', 'success', 'successful', 'approved'}


def _payment_http_status(payment_status):
    status_key = str(payment_status or '').strip().lower()
    if status_key in {'completed', 'paid', 'success', 'successful', 'approved'}:
        return 200
    if status_key in {'failed', 'failure', 'cancelled', 'canceled', 'declined', 'rejected', 'error'}:
        return 402
    return 202


def _payment_response_body(payment_id, amount, payment_method, payment_status, transaction_id,
                           reference_id, invoice_id, provider_transaction_id, payment_phone,
                           currency, description, booking_id, doctor_id, failure_reason):
    body = {
        "payment": {
            "id": payment_id,
            "amount": float(amount) if amount is not None else 0,
            "paymentMethod": payment_method,
            "status": payment_status,
            "transactionId": transaction_id,
            "referenceId": reference_id,
            "invoiceId": invoice_id,
            "providerTransactionId": provider_transaction_id,
            "paymentPhone": payment_phone,
            "currency": currency,
            "description": description,
            "bookingId": booking_id,
            "appointmentId": booking_id,
            "doctorId": doctor_id,
            "failureReason": failure_reason,
            "message": user_friendly_payment_error(failure_reason) if _payment_http_status(payment_status) == 402 else None,
        }
    }
    if _payment_http_status(payment_status) == 402:
        body["error"] = user_friendly_payment_error(failure_reason)
    return body


def _find_payment_by_merchant_refs(cur, reference_id=None, provider_transaction_id=None):
    clauses = []
    params = []
    if reference_id:
        clauses.append("reference_id = %s")
        params.append(reference_id)
    if provider_transaction_id:
        clauses.append("provider_transaction_id = %s")
        params.append(provider_transaction_id)
    if not clauses:
        return None
    cur.execute(
        f"""
        SELECT id, user_id, amount, payment_method, payment_status, transaction_id,
               reference_id, invoice_id, provider_transaction_id, payment_phone, currency,
               description, COALESCE(appointment_id, booking_id), doctor_id, failure_reason,
               merchant_response
        FROM payments
        WHERE {' OR '.join(clauses)}
        ORDER BY id DESC
        LIMIT 1
        """,
        tuple(params),
    )
    return cur.fetchone()

@app.route("/api/admin/payments", methods=["GET"])
def get_admin_payments():
    user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status_filter = request.args.get('status', 'all')
        service_status_filter = request.args.get('service_status', 'all')
        method_filter = request.args.get('method', 'all')
        provider_filter = request.args.get('provider', 'all')
        doctor_filter = request.args.get('doctor_id', 'all')
        patient_filter = request.args.get('patient_id', 'all')
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')
        sort_dir = request.args.get('sort_dir', 'desc').lower()

        sort_columns = {
            'id': 'p.id',
            'amount': 'p.amount',
            'created_at': 'p.created_at',
            'paid_at': 'p.paid_at',
            'payment_status': 'p.payment_status',
            'service_status': 'p.service_status',
            'doctor_name': 'd.name',
            'user_name': 'u.fullname',
        }
        sort_column = sort_columns.get(sort_by, 'p.created_at')
        sort_direction = 'ASC' if sort_dir == 'asc' else 'DESC'

        base_query = """
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            LEFT JOIN doctors d ON d.id = COALESCE(p.doctor_id, a.doctor_id)
            LEFT JOIN users du ON du.id = d.user_id
            LEFT JOIN users avu ON avu.id = p.service_verified_by
            WHERE COALESCE(p.sandbox_mode, 0) = 0
        """
        params = []

        if status_filter != 'all':
            base_query += " AND p.payment_status = %s"
            params.append(status_filter)
        if service_status_filter != 'all':
            base_query += " AND COALESCE(p.service_status, 'Waiting') = %s"
            params.append(service_status_filter)
        if method_filter != 'all':
            base_query += " AND p.payment_method = %s"
            params.append(method_filter)
        if provider_filter != 'all':
            base_query += " AND COALESCE(p.provider_name, 'WaafiPay') = %s"
            params.append(provider_filter)
        if doctor_filter != 'all':
            base_query += " AND d.id = %s"
            params.append(doctor_filter)
        if patient_filter != 'all':
            base_query += " AND u.id = %s"
            params.append(patient_filter)
        if start_date:
            base_query += " AND DATE(p.created_at) >= %s"
            params.append(start_date)
        if end_date:
            base_query += " AND DATE(p.created_at) <= %s"
            params.append(end_date)
        if search:
            like = f"%{search}%"
            base_query += """
                AND (
                    p.transaction_id LIKE %s OR p.reference_id LIKE %s OR p.invoice_id LIKE %s
                    OR u.fullname LIKE %s OR u.phone LIKE %s
                    OR d.name LIKE %s OR a.doctor_name LIKE %s
                )
            """
            params.extend([like, like, like, like, like, like, like])

        select_query = f"""
            SELECT p.id, p.user_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at,
                   u.fullname, u.phone,
                   p.reference_id, p.invoice_id, p.provider_transaction_id, p.payment_phone, p.currency, p.description,
                   p.booking_id, p.appointment_id, p.doctor_id, COALESCE(p.provider_name, 'WaafiPay') AS provider_name,
                   p.merchant_response, p.failure_reason, p.paid_at, COALESCE(p.service_status, 'Waiting') AS service_status,
                   p.service_verified,
                   p.service_verified_by, p.service_verified_at, p.verification_notes, p.patient_response,
                   p.refund_reason, p.refund_notes, COALESCE(p.refunded_amount, 0) AS refunded_amount,
                   p.net_amount, p.refunded_by, p.refunded_at,
                   a.appointment_date, a.appointment_time, a.status AS appointment_status,
                   d.name AS doctor_name, d.specialization, d.specialty, d.hospital_name, d.clinic_name, d.phone AS doctor_phone,
                   avu.fullname AS service_verified_by_name
            {base_query}
            ORDER BY {sort_column} {sort_direction}
            LIMIT %s OFFSET %s
        """
        query_params = params + [limit, (page - 1) * limit]

        cur.execute(select_query, query_params)
        payments = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        count_query = f"SELECT COUNT(*) {base_query}"
        count_params = list(params)
        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]

        cur.close()

        payment_rows = []
        for row in payments:
            record = dict(zip(columns, row))
            amount = float(record.get("amount")) if record.get("amount") is not None else 0
            gross_amount, refund_amount, net_amount = financial_amounts(amount, record.get("payment_status"), record.get("refunded_amount"))
            doctor_earnings, platform_earnings, fee_percent = doctor_platform_amounts(net_amount)
            payment_rows.append({
                "id": record.get("id"),
                "payment_id": record.get("id"),
                "user_id": record.get("user_id"),
                "amount": amount,
                "gross_amount": gross_amount,
                "refund_amount": refund_amount,
                "net_amount": net_amount,
                "doctor_earnings": doctor_earnings,
                "platform_earnings": platform_earnings,
                "platform_fee_percent": fee_percent,
                "payment_method": record.get("payment_method"),
                "payment_status": normalized_financial_status(record.get("payment_status")),
                "transaction_id": record.get("transaction_id"),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "user_name": record.get("fullname"),
                "user_phone": record.get("phone"),
                "reference_id": record.get("reference_id"),
                "invoice_id": record.get("invoice_id"),
                "provider_transaction_id": record.get("provider_transaction_id"),
                "payment_phone": record.get("payment_phone"),
                "currency": record.get("currency"),
                "description": record.get("description"),
                "booking_id": record.get("booking_id"),
                "appointment_id": record.get("appointment_id"),
                "doctor_id": record.get("doctor_id"),
                "doctor_name": record.get("doctor_name"),
                "doctor_specialization": record.get("specialization") or record.get("specialty"),
                "doctor_hospital": record.get("hospital_name") or record.get("clinic_name"),
                "doctor_phone": record.get("doctor_phone"),
                "provider_name": record.get("provider_name"),
                "merchant_response": record.get("merchant_response"),
                "failure_reason": record.get("failure_reason"),
                "paid_at": record.get("paid_at").isoformat() if record.get("paid_at") else None,
                "appointment_date": str(record.get("appointment_date")) if record.get("appointment_date") else None,
                "appointment_time": str(record.get("appointment_time")) if record.get("appointment_time") else None,
                "appointment_status": record.get("appointment_status"),
                "service_status": record.get("service_status"),
                "service_verified": bool(record.get("service_verified")) if record.get("service_verified") is not None else None,
                "service_verified_by": record.get("service_verified_by"),
                "service_verified_by_name": record.get("service_verified_by_name"),
                "service_verified_at": record.get("service_verified_at").isoformat() if record.get("service_verified_at") else None,
                "verification_notes": record.get("verification_notes"),
                "patient_response": record.get("patient_response"),
                "refund_reason": record.get("refund_reason"),
                "refund_notes": record.get("refund_notes"),
                "refunded_by": record.get("refunded_by"),
                "refunded_at": record.get("refunded_at").isoformat() if record.get("refunded_at") else None,
            })

        return jsonify({
            "payments": payment_rows,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN PAYMENTS ERROR: {e}")
        return jsonify({"error": "Unable to load payments. Please try again."}), 500




@app.route("/api/admin/payments/stats", methods=["GET"])
def get_payment_stats():
    user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)

        cur.execute("""
            SELECT payment_status, COUNT(*) as count
            FROM payments
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY payment_status
        """)
        status_counts = dict(cur.fetchall())

        cur.execute("""
            SELECT payment_method, COUNT(*) as count
            FROM payments
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY payment_method
        """)
        method_counts = dict(cur.fetchall())

        cur.execute("""
            SELECT COALESCE(service_status, 'Waiting'), COUNT(*)
            FROM payments
            WHERE COALESCE(sandbox_mode, 0) = 0
            GROUP BY COALESCE(service_status, 'Waiting')
        """)
        service_status_counts = dict(cur.fetchall())

        net_expr = """
            CASE
              WHEN LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              THEN GREATEST(0, COALESCE(amount, 0) - LEAST(COALESCE(amount, 0), CASE WHEN LOWER(payment_status) = 'refunded' AND COALESCE(refunded_amount, 0) = 0 THEN COALESCE(amount, 0) ELSE COALESCE(refunded_amount, 0) END))
              ELSE 0
            END
        """
        gross_expr = """
            CASE
              WHEN LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded') THEN COALESCE(amount, 0)
              ELSE 0
            END
        """
        refund_expr = """
            CASE
              WHEN LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              THEN LEAST(COALESCE(amount, 0), CASE WHEN LOWER(payment_status) = 'refunded' AND COALESCE(refunded_amount, 0) = 0 THEN COALESCE(amount, 0) ELSE COALESCE(refunded_amount, 0) END)
              ELSE 0
            END
        """
        p_net_expr = """
            CASE
              WHEN LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              THEN GREATEST(0, COALESCE(p.amount, 0) - LEAST(COALESCE(p.amount, 0), CASE WHEN LOWER(p.payment_status) = 'refunded' AND COALESCE(p.refunded_amount, 0) = 0 THEN COALESCE(p.amount, 0) ELSE COALESCE(p.refunded_amount, 0) END))
              ELSE 0
            END
        """

        cur.execute(f"""
            SELECT
              COALESCE(SUM({gross_expr}), 0),
              COALESCE(SUM({refund_expr}), 0),
              COALESCE(SUM({net_expr}), 0),
              COALESCE(SUM(CASE WHEN DATE(COALESCE(paid_at, created_at)) = CURDATE() THEN {net_expr} ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN YEARWEEK(COALESCE(paid_at, created_at), 1) = YEARWEEK(CURDATE(), 1) THEN {net_expr} ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN YEAR(COALESCE(paid_at, created_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(paid_at, created_at)) = MONTH(CURDATE()) THEN {net_expr} ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN YEAR(COALESCE(paid_at, created_at)) = YEAR(CURDATE()) THEN {net_expr} ELSE 0 END), 0),
              SUM(CASE WHEN LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded') THEN 1 ELSE 0 END),
              SUM(CASE WHEN LOWER(payment_status) = 'pending' THEN 1 ELSE 0 END),
              SUM(CASE WHEN LOWER(payment_status) = 'failed' THEN 1 ELSE 0 END),
              SUM(CASE WHEN LOWER(payment_status) = 'refunded' THEN 1 ELSE 0 END),
              SUM(CASE WHEN LOWER(payment_status) IN ('partial refund', 'partially refunded', 'partial_refund') THEN 1 ELSE 0 END),
              COUNT(*)
            FROM payments
            WHERE COALESCE(sandbox_mode, 0) = 0
        """)
        summary_row = cur.fetchone()
        fee_percent = platform_fee_percent()
        net_revenue = float(summary_row[2] or 0)
        summary = {
            "grossRevenue": float(summary_row[0] or 0),
            "totalRevenue": net_revenue,
            "netRevenue": net_revenue,
            "totalRefunded": float(summary_row[1] or 0),
            "todayRevenue": float(summary_row[3] or 0),
            "weekRevenue": float(summary_row[4] or 0),
            "monthRevenue": float(summary_row[5] or 0),
            "yearRevenue": float(summary_row[6] or 0),
            "doctorEarnings": round(net_revenue * (100 - fee_percent) / 100, 2),
            "platformEarnings": round(net_revenue * fee_percent / 100, 2),
            "successfulPayments": int(summary_row[7] or 0),
            "pendingPayments": int(summary_row[8] or 0),
            "failedPayments": int(summary_row[9] or 0),
            "refundedPayments": int(summary_row[10] or 0),
            "partialRefundPayments": int(summary_row[11] or 0),
            "totalTransactions": int(summary_row[12] or 0),
        }

        cur.execute(f"""
            SELECT DATE(COALESCE(paid_at, created_at)) as date, SUM({net_expr}) as revenue
            FROM payments
            WHERE LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              AND COALESCE(sandbox_mode, 0) = 0
              AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(COALESCE(paid_at, created_at))
            ORDER BY date
        """)
        daily_revenue = [{"date": str(row[0]), "revenue": float(row[1] or 0)} for row in cur.fetchall()]

        cur.execute(f"""
            SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m') as month, SUM({net_expr}) as revenue
            FROM payments
            WHERE LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m')
            ORDER BY month
        """)
        monthly_revenue = [{"month": str(row[0]), "revenue": float(row[1] or 0)} for row in cur.fetchall()]

        cur.execute(f"""
            SELECT COALESCE(d.name, a.doctor_name, 'Unknown Doctor') as doctor_name,
                   COUNT(*) as total_consultations,
                   SUM(CASE WHEN LOWER(p.payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded') THEN 1 ELSE 0 END) as paid_consultations,
                   COALESCE(SUM({p_net_expr}), 0) as total_revenue
            FROM payments p
            LEFT JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            LEFT JOIN doctors d ON d.id = COALESCE(p.doctor_id, a.doctor_id)
            WHERE COALESCE(p.sandbox_mode, 0) = 0
            GROUP BY COALESCE(d.name, a.doctor_name, 'Unknown Doctor')
            ORDER BY total_revenue DESC
        """)
        doctor_revenue = [{
            "doctorName": row[0],
            "totalConsultations": int(row[1] or 0),
            "paidConsultations": int(row[2] or 0),
            "totalRevenue": float(row[3] or 0),
        } for row in cur.fetchall()]

        cur.execute(f"""
            SELECT COALESCE(payment_method, 'Unknown') as payment_method, SUM({net_expr}) as revenue
            FROM payments
            WHERE LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              AND COALESCE(sandbox_mode, 0) = 0
            GROUP BY COALESCE(payment_method, 'Unknown')
            ORDER BY revenue DESC
        """)
        revenue_by_method = [{"method": row[0], "revenue": float(row[1] or 0)} for row in cur.fetchall()]

        cur.close()

        return jsonify({
            "status_counts": status_counts,
            "method_counts": method_counts,
            "service_status_counts": service_status_counts,
            "daily_revenue": daily_revenue,
            "monthly_revenue": monthly_revenue,
            "doctor_revenue": doctor_revenue,
            "revenue_by_method": revenue_by_method,
            "summary": summary,
            "total_revenue": summary["totalRevenue"]
        })

    except Exception as e:
        log_info(f"âŒ GET PAYMENT STATS ERROR: {e}")
        return jsonify({"error": "Unable to load payment stats. Please try again."}), 500




@app.route("/api/admin/payments/<int:payment_id>/service", methods=["PUT"])
def update_payment_service_status(payment_id):
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    notes = str(data.get('verification_notes') or '').strip()
    raw_verified = data.get('service_verified')
    if isinstance(raw_verified, bool):
        service_verified = raw_verified
    else:
        answer = str(data.get('patient_response') or data.get('answer') or '').strip().lower()
        if answer in ['yes', 'y', 'true', '1']:
            service_verified = True
        elif answer in ['no', 'n', 'false', '0']:
            service_verified = False
        else:
            return jsonify({"error": "Service verification answer must be YES or NO."}), 400

    patient_response = 'YES' if service_verified else 'NO'
    new_status = 'Verified' if service_verified else 'Follow Up Required'

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        cur.execute(
            """
            SELECT p.id, p.user_id, p.doctor_id, p.payment_status,
                   COALESCE(p.service_status, 'Waiting'), a.status
            FROM payments p
            LEFT JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            WHERE p.id = %s
            """,
            (payment_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Payment not found."}), 404

        _, patient_id, doctor_id, payment_status, old_status, appointment_status = row
        if payment_status != 'Completed':
            cur.close()
            return jsonify({"error": "Cannot verify unpaid consultations."}), 400
        if appointment_status != 'Completed':
            cur.close()
            return jsonify({"error": "Service can only be verified after appointment is completed."}), 400
        if old_status == 'Refunded':
            cur.close()
            return jsonify({"error": "Cannot verify already refunded services."}), 400

        cur.execute(
            """
            UPDATE payments
            SET service_status = %s,
                service_verified = %s,
                service_verified_by = %s,
                service_verified_at = NOW(),
                verification_notes = %s,
                patient_response = %s
            WHERE id = %s
            """,
            (new_status, 1 if service_verified else 0, admin_user.get('user_id'), notes or None, patient_response, payment_id)
        )
        mysql.connection.commit()
        cur.close()

        audit_action = "SERVICE_VERIFIED" if service_verified else "SERVICE_NOT_PROVIDED"
        admin_name = admin_user.get('fullname') or admin_user.get('username') or str(admin_user.get('user_id'))
        write_audit_log(
            admin_user,
            audit_action,
            json.dumps({
                "payment_id": payment_id,
                "admin_name": admin_name,
                "action": audit_action,
                "old": old_status,
                "new": new_status,
                "reason": notes,
                "date": utc_now_naive().isoformat(),
                "service_verified": service_verified,
            })
        )

        if service_verified:
            create_user_notification(patient_id, "Service verified", "Your consultation service has been verified.", "service_verified")
            if doctor_id:
                try:
                    cur = mysql.connection.cursor()
                    cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                    doctor_user_row = cur.fetchone()
                    cur.close()
                    if doctor_user_row:
                        create_user_notification(doctor_user_row[0], "Consultation verified", "Admin verified a completed consultation.", "consultation_verified")
                except Exception:
                    pass
        else:
            create_user_notification(patient_id, "Service issue recorded", "Admin recorded that your consultation service was not provided.", "service_issue")
            if doctor_id:
                try:
                    cur = mysql.connection.cursor()
                    cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                    doctor_user_row = cur.fetchone()
                    cur.close()
                    if doctor_user_row:
                        create_user_notification(doctor_user_row[0], "Service issue reported", "Admin recorded a service issue for a completed consultation.", "service_issue")
                except Exception:
                    pass

        return jsonify({"message": "Service status updated successfully."})
    except Exception as e:
        log_info(f"UPDATE PAYMENT SERVICE STATUS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update service status."}), 500




@app.route("/api/admin/payments/<int:payment_id>/refund", methods=["POST"])
def refund_payment(payment_id):
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    reason = str(data.get('reason') or '').strip()
    notes = str(data.get('notes') or '').strip()
    decision = str(data.get('decision') or 'approve').strip().lower()
    raw_refund_amount = data.get('refund_amount', data.get('amount'))
    if decision not in ['approve', 'reject']:
        return jsonify({"error": "Refund decision must be approve or reject."}), 400
    if not reason:
        return jsonify({"error": "Refund reason is required."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        cur.execute(
            """
            SELECT p.id, p.user_id, p.doctor_id, p.payment_status, COALESCE(p.service_status, 'Waiting'),
                   COALESCE(p.amount, 0), COALESCE(p.refunded_amount, 0)
            FROM payments p
            WHERE p.id = %s
            FOR UPDATE
            """,
            (payment_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Payment not found."}), 404
        _, patient_id, doctor_id, payment_status, old_service_status, original_amount, already_refunded = row

        if normalized_financial_status(payment_status) not in ['Paid', 'Partial Refund']:
            cur.close()
            return jsonify({"error": "Cannot refund unpaid transactions."}), 400
        original_amount = round(float(original_amount or 0), 2)
        already_refunded = round(float(already_refunded or 0), 2)
        remaining_refundable = round(max(0, original_amount - already_refunded), 2)
        if old_service_status == 'Refunded' or remaining_refundable <= 0:
            cur.close()
            return jsonify({"error": "Payment has already been refunded."}), 400
        if raw_refund_amount in (None, ""):
            refund_amount = remaining_refundable
        else:
            try:
                refund_amount = round(float(raw_refund_amount), 2)
            except (TypeError, ValueError):
                cur.close()
                return jsonify({"error": "Refund amount must be a valid number."}), 400
        if refund_amount <= 0:
            cur.close()
            return jsonify({"error": "Refund amount must be greater than zero."}), 400
        if refund_amount > remaining_refundable:
            cur.close()
            return jsonify({"error": "Refund amount cannot exceed the remaining paid amount."}), 400

        if decision == 'reject':
            admin_name = admin_user.get('fullname') or admin_user.get('username') or str(admin_user.get('user_id'))
            write_audit_log(
                admin_user,
                "PAYMENT_REFUND_REJECTED",
                json.dumps({
                    "payment_id": payment_id,
                    "admin_name": admin_name,
                    "action": "PAYMENT_REFUND_REJECTED",
                    "old": payment_status,
                    "new": payment_status,
                    "reason": reason,
                    "notes": notes,
                    "date": utc_now_naive().isoformat(),
                })
            )
            cur.close()
            create_user_notification(patient_id, "Refund rejected", "Your refund request was reviewed and rejected.", "refund_rejected")
            if doctor_id:
                try:
                    cur = mysql.connection.cursor()
                    cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                    doctor_user_row = cur.fetchone()
                    cur.close()
                    if doctor_user_row:
                        create_user_notification(doctor_user_row[0], "Refund rejected", "Admin rejected a refund request for your consultation.", "refund_rejected")
                except Exception:
                    pass
            return jsonify({"message": "Refund rejected."})

        new_refunded_total = round(already_refunded + refund_amount, 2)
        remaining_amount = round(max(0, original_amount - new_refunded_total), 2)
        new_payment_status = 'Refunded' if remaining_amount <= 0 else 'Partial Refund'
        new_service_status = 'Refunded' if remaining_amount <= 0 else old_service_status

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
            (new_payment_status, new_service_status, reason, notes or None, new_refunded_total, remaining_amount, admin_user.get('user_id'), payment_id)
        )
        log_financial_event(
            cur,
            payment_id,
            "PAYMENT_REFUNDED" if new_payment_status == "Refunded" else "PAYMENT_PARTIAL_REFUND",
            original_amount,
            refund_amount,
            remaining_amount,
            reason=reason,
            approved_by=admin_user.get('user_id'),
            metadata={"notes": notes, "previous_refunded_amount": already_refunded, "total_refunded_amount": new_refunded_total},
        )
        mysql.connection.commit()
        cur.close()

        admin_name = admin_user.get('fullname') or admin_user.get('username') or str(admin_user.get('user_id'))
        write_audit_log(
            admin_user,
            "PAYMENT_REFUNDED",
            json.dumps({
                "payment_id": payment_id,
                "admin_name": admin_name,
                "action": "PAYMENT_REFUNDED" if new_payment_status == "Refunded" else "PAYMENT_PARTIAL_REFUND",
                "old": payment_status,
                "new": new_payment_status,
                "original_amount": original_amount,
                "refund_amount": refund_amount,
                "remaining_amount": remaining_amount,
                "reason": reason,
                "notes": notes,
                "date": utc_now_naive().isoformat(),
            })
        )
        create_user_notification(patient_id, "Refund processed", f"Your refund of {refund_amount:.2f} has been processed.", "refund_processed")
        if doctor_id:
            try:
                cur = mysql.connection.cursor()
                cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                doctor_user_row = cur.fetchone()
                cur.close()
                if doctor_user_row:
                    create_user_notification(doctor_user_row[0], "Payment refunded", "A consultation payment was refunded by admin and earnings were recalculated.", "payment_refunded")
            except Exception:
                pass

        return jsonify({"message": "Refund processed successfully.", "refund_amount": refund_amount, "remaining_amount": remaining_amount, "payment_status": new_payment_status})
    except Exception as e:
        log_info(f"REFUND PAYMENT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to process refund."}), 500




@app.route("/api/admin/payments/<int:payment_id>/audit", methods=["GET"])
def get_payment_audit_history(payment_id):
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT actor, role, action, description, created_at
            FROM audit_logs
            WHERE description LIKE %s OR description LIKE %s
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (f'%"payment_id": {payment_id}%', f'%"payment_id":{payment_id}%')
        )
        logs = []
        for actor, role, action, description, created_at in cur.fetchall():
            details = {}
            try:
                details = json.loads(description or '{}')
            except Exception:
                details = {"description": description}
            logs.append({
                "actor": actor,
                "admin_name": details.get("admin_name") or actor,
                "role": role,
                "action": action,
                "payment_id": details.get("payment_id"),
                "previous_status": details.get("old"),
                "new_status": details.get("new"),
                "reason": details.get("reason"),
                "notes": details.get("notes"),
                "created_at": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
            })
        cur.close()
        return jsonify({"audit_logs": logs})
    except Exception as e:
        log_info(f"GET PAYMENT AUDIT HISTORY ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load payment audit history. Please try again."}), 500




@app.route("/api/payments/<int:payment_id>/status", methods=["GET"])
def get_payment_status(payment_id):
    user, auth_error = require_current_user()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        cur.execute(
            """
            SELECT id, user_id, amount, payment_method, payment_status, transaction_id,
                   reference_id, invoice_id, payment_phone, currency, description,
                   booking_id, appointment_id, doctor_id, provider_transaction_id, failure_reason,
                   merchant_response
            FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Payment not found."}), 404

        (
            row_id, owner_id, amount, payment_method, payment_status, transaction_id,
            reference_id, invoice_id, payment_phone, currency, description,
            booking_id, appointment_id, doctor_id, provider_transaction_id, failure_reason,
            merchant_response
        ) = row

        if canonical_role(user.get('role')) not in ['admin', 'super_admin', 'it_admin'] and user.get('user_id') != owner_id:
            cur.close()
            return jsonify({"error": "Permission denied."}), 403

        status_key = str(payment_status or '').strip().lower()
        if status_key in ['pending', 'failed', 'failure', 'cancelled', 'canceled'] and _merchant_purchase_confirms_payment(merchant_response, amount):
            merchant_data = _decoded_merchant_response(merchant_response)
            payment_status = 'Completed'
            failure_reason = None
            _mark_payment_completed(
                cur,
                row_id,
                amount,
                merchant_response=merchant_data,
                source="stored_merchant_response_reconciliation",
            )
            _write_payment_reconciliation_audit(
                cur,
                row_id,
                appointment_id,
                transaction_id,
                provider_transaction_id,
                "Stored Hormuud/WaafiPay purchase response confirmed payment after a non-success local status.",
            )
            shared_assessment = None
            if appointment_id:
                shared_assessment = _confirm_paid_appointment(cur, row_id, appointment_id, owner_id)
            mysql.connection.commit()
            _create_payment_success_notifications(cur, row_id, owner_id, doctor_id, amount, currency, transaction_id)
            if shared_assessment:
                create_assessment_notifications(
                    owner_id,
                    shared_assessment['prediction_id'],
                    shared_assessment['prediction_result'],
                    shared_assessment['confidence'],
                    shared_assessment['created_at'],
                    appointment_id=appointment_id,
                )

        elif status_key == 'pending':
            if appointment_id and canonical_role(user.get('role')) == 'user':
                booking_state = patient_booking_payment_state(cur, owner_id, appointment_id)
                if not booking_state["can_book_therapist"]:
                    cur.close()
                    return booking_not_allowed_response(booking_state)
            status_lookup_id = provider_transaction_id or transaction_id
            status_result = check_hormuud_payment_status(status_lookup_id, reference_id or transaction_id)
            if status_result:
                verified_status = status_result.get("status", payment_status)
                next_reference_id = status_result.get("reference_id") or reference_id
                next_invoice_id = status_result.get("invoice_id") or invoice_id
                next_provider_transaction_id = status_result.get("provider_transaction_id") or provider_transaction_id
                failure_reason = None
                if verified_status == 'Completed':
                    if not merchant_amount_matches(status_result.get('raw') or {}, amount):
                        verified_status = 'Failed'
                        failure_reason = 'Invalid amount returned by merchant verification.'
                    elif appointment_id:
                        cur.execute(
                            """
                            SELECT id, status, payment_status, appointment_date, appointment_time
                            FROM appointments
                            WHERE id = %s AND user_id = %s
                            """,
                            (appointment_id, owner_id)
                        )
                        appointment_row = cur.fetchone()
                        if not appointment_row:
                            verified_status = 'Failed'
                            failure_reason = 'Booking not found for this payment.'
                        else:
                            _, appointment_status, appointment_payment_status, appointment_date, appointment_time = appointment_row
                            status_key = str(appointment_status or '').strip().lower()
                            payment_key = str(appointment_payment_status or '').strip().lower()
                            if payment_key in ['paid', 'completed']:
                                verified_status = 'Failed'
                                failure_reason = 'This appointment has already been paid.'
                            elif status_key in ['cancelled', 'canceled', 'rejected', 'refunded', 'expired']:
                                verified_status = 'Failed'
                                failure_reason = 'Payment is not allowed for this appointment status.'
                            elif appointment_date and appointment_time:
                                appointment_dt = datetime.combine(parse_schedule_date(appointment_date), parse_schedule_time(appointment_time))
                                if appointment_dt <= utc_now_naive():
                                    verified_status = 'Failed'
                                    failure_reason = 'Transaction expired.'
                    if next_provider_transaction_id:
                        cur.execute(
                            """
                            SELECT id FROM payments
                            WHERE id != %s
                              AND provider_transaction_id = %s
                              AND LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
                            LIMIT 1
                            """,
                            (payment_id, next_provider_transaction_id)
                        )
                        if cur.fetchone():
                            verified_status = 'Failed'
                            failure_reason = 'Duplicate transaction.'

                payment_status = 'Completed' if verified_status == 'Completed' else verified_status
                reference_id = next_reference_id
                invoice_id = next_invoice_id
                provider_transaction_id = next_provider_transaction_id
                cur.execute(
                    """
                    UPDATE payments
                    SET payment_status = %s,
                        reference_id = %s,
                        invoice_id = %s,
                        provider_transaction_id = %s,
                        merchant_response = %s,
                        failure_reason = %s,
                        paid_at = CASE WHEN %s = 'Completed' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
                    WHERE id = %s
                    """,
                    (payment_status, reference_id, invoice_id, provider_transaction_id, json.dumps(status_result.get('raw') or {}), failure_reason, payment_status, payment_id)
                )
                mysql.connection.commit()
                if payment_status == 'Completed' and appointment_id:
                    cur.execute(
                        """
                        UPDATE appointments
                        SET status = 'Confirmed', payment_status = 'Completed', payment_id = %s
                        WHERE id = %s AND user_id = %s
                          AND LOWER(COALESCE(payment_status, 'pending')) NOT IN ('paid', 'completed')
                        """,
                        (payment_id, appointment_id, owner_id)
                    )
                    if cur.rowcount == 0:
                        cur.execute(
                            "UPDATE payments SET payment_status = 'Failed', failure_reason = 'This appointment has already been paid.' WHERE id = %s",
                            (payment_id,)
                        )
                        mysql.connection.commit()
                        payment_status = 'Failed'
                    else:
                        mark_paid_appointment_slot_booked(cur, appointment_id)
                        shared_assessment = share_paid_appointment_assessment(
                            cur, appointment_id, owner_id
                        )
                        mysql.connection.commit()
                elif payment_status == 'Failed' and appointment_id:
                    cur.execute(
                        """
                        UPDATE appointments
                        SET status = 'Failed',
                            payment_status = 'Failed'
                        WHERE id = %s
                          AND user_id = %s
                          AND status IN ('Pending Payment', 'Reserved')
                        """,
                        (appointment_id, owner_id)
                    )
                    cur.execute(
                        """
                        UPDATE appointment_slots
                        SET status = 'released',
                            appointment_id = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE appointment_id = %s
                          AND LOWER(COALESCE(status, '')) = 'pending_payment'
                        """,
                        (appointment_id,)
                    )
                    mysql.connection.commit()
                if payment_status == 'Completed' and appointment_id:
                    cur.execute("SELECT fullname, username FROM users WHERE id = %s", (owner_id,))
                    patient_row = cur.fetchone()
                    patient_name = (patient_row[0] or patient_row[1]) if patient_row else f"Patient {owner_id}"
                    doctor_name = None
                    doctor_user_id = None
                    if doctor_id:
                        cur.execute("SELECT user_id, name FROM doctors WHERE id = %s", (doctor_id,))
                        doctor_user_row = cur.fetchone()
                        if doctor_user_row:
                            doctor_user_id = doctor_user_row[0]
                            doctor_name = doctor_user_row[1]
                    doctor_label = doctor_name or 'Selected doctor'
                    payment_message = (
                        f"Amount: {float(amount or 0):.2f} {currency}. Patient: {patient_name}. "
                        f"Doctor: {doctor_label}. Transaction ID: {transaction_id}."
                    )
                    create_user_notification(
                        owner_id,
                        "Payment completed successfully",
                        f"Payment completed successfully. {payment_message}",
                        "PAYMENT",
                        reference_id=payment_id,
                        role_target='user',
                    )
                    if doctor_user_id:
                        create_user_notification(
                            doctor_user_id,
                            "Appointment payment received",
                            f"Appointment payment received. {payment_message}",
                            "PAYMENT",
                            reference_id=payment_id,
                            role_target='doctor',
                        )
                    create_role_notifications(
                        'admin',
                        'New payment received',
                        f"New payment received. {payment_message}",
                        'PAYMENT',
                        payment_id,
                        roles=['admin', 'super_admin', 'it_admin'],
                    )
                    if shared_assessment:
                        create_assessment_notifications(
                            owner_id,
                            shared_assessment['prediction_id'],
                            shared_assessment['prediction_result'],
                            shared_assessment['confidence'],
                            shared_assessment['created_at'],
                            appointment_id=appointment_id,
                        )

        cur.close()
        return jsonify({
            "payment": {
                "id": row_id,
                "amount": float(amount) if amount is not None else 0,
                "paymentMethod": payment_method,
                "status": payment_status,
                "transactionId": transaction_id,
                "referenceId": reference_id,
                "invoiceId": invoice_id,
                "providerTransactionId": provider_transaction_id,
                "paymentPhone": payment_phone,
                "currency": currency,
                "description": description,
                "bookingId": booking_id,
                "appointmentId": appointment_id,
                "doctorId": doctor_id,
                "failureReason": failure_reason,
                "message": user_friendly_payment_error(failure_reason) if str(payment_status or '').strip().lower() in ['failed', 'failure', 'cancelled', 'canceled', 'declined', 'rejected', 'error'] else None,
            }
        })
    except Exception as e:
        log_info(f"PAYMENT STATUS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load payment status. Please try again."}), 500




@app.route("/api/payments/<int:payment_id>/receipt", methods=["GET"])
def download_payment_receipt(payment_id):
    user, auth_error = require_current_user()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        shared_assessment = None
        ensure_payment_link_columns(cur)
        ensure_yearly_schedule_tables(cur)
        release_unpaid_pending_slots(cur)
        cur.execute(
            """
            SELECT p.id, p.user_id, p.amount, p.currency, p.payment_method, p.payment_status,
                   p.transaction_id, p.reference_id, COALESCE(p.paid_at, p.created_at) AS payment_time,
                   a.id AS appointment_id, a.appointment_date, a.appointment_time,
                   a.doctor_id, COALESCE(d.name, a.doctor_name, 'Doctor') AS doctor_name,
                   COALESCE(u.fullname, u.username, 'Patient') AS patient_name
            FROM payments p
            LEFT JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            LEFT JOIN doctors d ON d.id = a.doctor_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.id = %s
            """,
            (payment_id,)
        )
        record = fetch_one_dict(cur)
        if not record:
            cur.close()
            return jsonify({"error": "Payment not found."}), 404

        role = canonical_role(user.get('role'))
        allowed = user.get('user_id') == record.get('user_id') or role in ['admin', 'super_admin', 'it_admin']
        if not allowed and role == 'doctor':
            doctor_id = current_doctor_id(cur, user)
            allowed = bool(doctor_id and doctor_id == record.get('doctor_id'))
        cur.close()
        if not allowed:
            return jsonify({"error": "Permission denied."}), 403
        if str(record.get("payment_status") or "").strip().lower() not in ['paid', 'completed', 'success', 'successful']:
            return jsonify({"error": "Receipt is available only after successful payment."}), 400

        lines = [
            f"Payment ID: {record.get('id')}",
            f"Transaction Reference: {record.get('reference_id') or record.get('transaction_id') or '-'}",
            f"Booking ID: {record.get('appointment_id') or '-'}",
            f"Patient: {record.get('patient_name')}",
            f"Doctor: {record.get('doctor_name')}",
            f"Appointment Date: {record.get('appointment_date') or '-'}",
            f"Appointment Time: {format_time(record.get('appointment_time'))[:5] if record.get('appointment_time') else '-'}",
            f"Consultation Fee: {float(record.get('amount') or 0):.2f} {record.get('currency') or 'USD'}",
            f"Payment Method: {record.get('payment_method') or '-'}",
            f"Payment Time: {record.get('payment_time')}",
        ]
        pdf = simple_pdf_bytes("AnxietyCare Payment Receipt", lines)
        return Response(
            pdf,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=payment-receipt-{payment_id}.pdf"},
        )
    except Exception as e:
        log_info(f"PAYMENT RECEIPT ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to generate receipt. Please try again."}), 500




@app.route("/api/payments", methods=["GET"])
def get_payments():
    if not mysql:
        return jsonify({"payments": []})

    user = get_current_user()
    query_user_id = request.args.get("user_id")

    if not user:
        return jsonify({"error": "Authentication required."}), 401

    try:
        cur = mysql.connection.cursor()
        role = canonical_role(user.get('role'))
        if is_admin_role(user.get('role')) and query_user_id:
            cur.execute("""
                SELECT id, amount, payment_method, payment_status, transaction_id, reference_id, invoice_id, payment_phone, currency, description, created_at
                FROM payments
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (query_user_id,))
        elif is_admin_role(user.get('role')):
            cur.execute("""
                SELECT id, amount, payment_method, payment_status, transaction_id, reference_id, invoice_id, payment_phone, currency, description, created_at
                FROM payments
                ORDER BY created_at DESC
            """)
        elif role == 'user':
            cur.execute("""
                SELECT id, amount, payment_method, payment_status, transaction_id, reference_id, invoice_id, payment_phone, currency, description, created_at
                FROM payments
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user.get('user_id'),))
        else:
            cur.close()
            return jsonify({"error": "Permission denied."}), 403

        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        cur.close()

        payments = []
        for row in rows or []:
            record = dict(zip(columns, row))
            payments.append({
                "id": record.get("id"),
                "amount": float(record.get("amount", 0)),
                "paymentMethod": record.get("payment_method"),
                "status": record.get("payment_status"),
                "transactionId": record.get("transaction_id"),
                "referenceId": record.get("reference_id"),
                "invoiceId": record.get("invoice_id"),
                "paymentPhone": record.get("payment_phone"),
                "currency": record.get("currency"),
                "description": record.get("description"),
                "createdAt": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
            })

        return jsonify({"payments": payments})

    except Exception as e:
        log_info(f"âŒ PAYMENTS ERROR: {e}")
        return jsonify({"payments": []}), 500




@app.route("/api/payments", methods=["POST"])
# Production payment endpoint. Successful merchant responses connect the
# payment to patient, doctor, and appointment records before notifying roles.
def create_payment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patient accounts can make appointment payments."}), 403

    data = request.get_json(force=True) or {}
    amount = data.get('amount')
    payment_method = str(data.get('payment_method') or app.config.get("HORMUUD_PAYMENT_METHOD") or 'mwallet_account')
    payment_phone = re.sub(r'[^\d+]', '', str(data.get('payment_phone') or '').strip())
    description = str(data.get('description') or 'Mental health payment')
    booking_id = data.get('booking_id')
    currency = str(data.get('currency') or 'USD').upper()
    slot_lock_name = None

    if amount is None:
        return jsonify({"error": "Payment amount is required."}), 400
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Payment amount must be a valid number."}), 400
    if amount_value <= 0:
        return jsonify({"error": "Payment amount must be greater than zero."}), 400
    if not payment_phone:
        return jsonify({"error": "Payment phone number is required."}), 400
    if len(re.sub(r'\D', '', payment_phone)) < 7:
        return jsonify({"error": "Invalid phone number."}), 400
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_id = None
        doctor_user_id = None
        doctor_name = None
        shared_assessment = None
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        ensure_yearly_schedule_tables(cur)
        release_unpaid_pending_slots(cur)
        ensure_yearly_schedule_tables(cur)
        release_unpaid_pending_slots(cur)
        if booking_id:
            cur.execute(
                """
                SELECT a.id, a.user_id, a.doctor_id, a.status, COALESCE(NULLIF(d.cons_fee, 0), NULLIF(d.consultation_fee, 0)), d.user_id, d.name,
                       a.appointment_date, a.appointment_time, d.availability_schedule
                FROM appointments a
                LEFT JOIN doctors d ON a.doctor_id = d.id
                WHERE a.id = %s AND a.user_id = %s
                """,
                (booking_id, user.get('user_id'))
            )
            booking_row = cur.fetchone()
            if not booking_row:
                cur.close()
                return jsonify({"error": "Booking not found for this user."}), 404

            appointment_id, _, doctor_id, appointment_status, consultation_fee, doctor_user_id, doctor_name, appointment_date, appointment_time, doctor_schedule = booking_row
            booking_state = patient_booking_payment_state(cur, user.get('user_id'), appointment_id)
            if not booking_state["can_book_therapist"]:
                cur.close()
                return booking_not_allowed_response(booking_state)
            if not doctor_id:
                cur.close()
                return jsonify({"error": "Doctor is missing for this appointment."}), 400
            appointment_status_key = str(appointment_status or '').strip().lower()
            if appointment_status_key in ["cancelled", "canceled", "rejected", "expired", "failed"]:
                cur.close()
                return jsonify({"error": "Cannot pay for a cancelled or expired appointment."}), 400
            if appointment_status_key == "completed":
                cur.close()
                return jsonify({"error": "Cannot pay for a completed appointment."}), 400
            if appointment_status_key in ["confirmed", "upcoming"]:
                cur.close()
                return jsonify({"error": "This appointment has already been paid."}), 400
            appointment_dt = None
            if appointment_date and appointment_time:
                appointment_dt = datetime.combine(parse_schedule_date(appointment_date), parse_schedule_time(appointment_time))
            if appointment_dt and appointment_dt <= utc_now_naive():
                cur.execute("UPDATE appointments SET status = 'Expired' WHERE id = %s AND status = 'Pending Payment'", (appointment_id,))
                mysql.connection.commit()
                cur.close()
                return jsonify({"error": "Cannot pay for an expired appointment."}), 400
            slot_available, slot_error = is_doctor_slot_available(
                cur,
                doctor_id,
                parse_schedule_date(appointment_date),
                parse_schedule_time(appointment_time),
                doctor_schedule,
            )
            if not slot_available:
                cur.execute(
                    "UPDATE appointments SET status = 'Expired', payment_status = 'Expired' WHERE id = %s AND user_id = %s AND status IN ('Pending Payment', 'Reserved')",
                    (appointment_id, user.get('user_id')),
                )
                mysql.connection.commit()
                cur.close()
                return jsonify({"error": slot_error or "This therapist is not available on the selected day."}), 409
            if str(appointment_status).lower() in ["confirmed", "completed"]:
                cur.close()
                return jsonify({"error": "This appointment has already been paid or completed."}), 400
            if consultation_fee is not None:
                expected_amount = round(float(consultation_fee), 2)
                if round(amount_value, 2) != expected_amount:
                    cur.close()
                    return jsonify({"error": "Payment amount must match the doctor's consultation fee."}), 400
                amount_value = expected_amount
            cur.execute(
                """
                SELECT id, payment_status
                FROM payments
                WHERE COALESCE(appointment_id, booking_id) = %s
                  AND user_id = %s
                  AND LOWER(COALESCE(payment_status, '')) IN ('pending', 'processing', 'completed', 'paid', 'success', 'successful', 'refunded')
                ORDER BY id DESC
                LIMIT 1
                """,
                (appointment_id, user.get('user_id'))
            )
            duplicate_payment = cur.fetchone()
            if duplicate_payment:
                duplicate_status = str(duplicate_payment[1] or '').strip().lower()
                if duplicate_status in ['completed', 'paid', 'success', 'successful', 'refunded']:
                    cur.close()
                    return jsonify({"error": "This appointment has already been paid."}), 409
                if duplicate_status in ['processing']:
                    cur.close()
                    return jsonify({"error": "A payment is already processing for this appointment. Please wait or check payment status."}), 409
                cur.execute(
                    """
                    UPDATE payments
                    SET payment_status = 'Cancelled',
                        failure_reason = COALESCE(failure_reason, 'Superseded by retry')
                    WHERE COALESCE(appointment_id, booking_id) = %s
                      AND user_id = %s
                      AND LOWER(COALESCE(payment_status, '')) = 'pending'
                    """,
                    (appointment_id, user.get('user_id'))
                )
                cur.execute(
                    """
                    UPDATE appointments
                    SET payment_status = 'Pending'
                    WHERE id = %s AND user_id = %s AND status IN ('Pending Payment', 'Reserved')
                    """,
                    (appointment_id, user.get('user_id'))
                )
                mysql.connection.commit()
            cur.execute(
                """
                SELECT id, amount, payment_method, payment_status, transaction_id, reference_id,
                       invoice_id, provider_transaction_id, payment_phone, currency, description,
                       doctor_id, failure_reason, merchant_response
                FROM payments
                WHERE COALESCE(appointment_id, booking_id) = %s
                  AND user_id = %s
                  AND LOWER(COALESCE(payment_status, '')) IN ('failed', 'failure', 'cancelled', 'canceled', 'pending')
                  AND merchant_response IS NOT NULL
                ORDER BY id DESC
                """,
                (appointment_id, user.get('user_id')),
            )
            for previous_payment in cur.fetchall() or []:
                (
                    previous_id, previous_amount, previous_method, _previous_status,
                    previous_transaction_id, previous_reference_id, previous_invoice_id,
                    previous_provider_transaction_id, previous_phone, previous_currency,
                    previous_description, previous_doctor_id, _previous_failure_reason,
                    previous_merchant_response,
                ) = previous_payment
                if not _merchant_purchase_confirms_payment(previous_merchant_response, previous_amount):
                    continue
                cur.execute("START TRANSACTION")
                _mark_payment_completed(
                    cur,
                    previous_id,
                    previous_amount,
                    merchant_response=_decoded_merchant_response(previous_merchant_response),
                    source="pre_retry_merchant_response_reconciliation",
                )
                shared_assessment = _confirm_paid_appointment(cur, previous_id, appointment_id, user.get('user_id'))
                _write_payment_reconciliation_audit(
                    cur,
                    previous_id,
                    appointment_id,
                    previous_transaction_id,
                    previous_provider_transaction_id,
                    "Retry suppressed; prior merchant response already confirmed payment.",
                )
                mysql.connection.commit()
                cur.close()
                if shared_assessment:
                    create_assessment_notifications(
                        user.get('user_id'),
                        shared_assessment['prediction_id'],
                        shared_assessment['prediction_result'],
                        shared_assessment['confidence'],
                        shared_assessment['created_at'],
                        appointment_id=appointment_id,
                    )
                return jsonify(_payment_response_body(
                    previous_id,
                    previous_amount,
                    previous_method,
                    'Completed',
                    previous_transaction_id,
                    previous_reference_id,
                    previous_invoice_id,
                    previous_provider_transaction_id,
                    previous_phone,
                    previous_currency,
                    previous_description,
                    appointment_id,
                    previous_doctor_id,
                    None,
                )), 200
            booking_id = appointment_id
        else:
            booking_state = can_patient_book_therapist(cur, user.get('user_id'))
            if not booking_state["can_book_therapist"]:
                cur.close()
                return booking_not_allowed_response(booking_state)

        if not hormuud_merchant_config_ready(require_status=True):
            cur.close()
            return jsonify({"error": real_hormuud_unavailable_message()}), 503

        transaction_id = generate_payment_transaction_id()
        cur.execute("SELECT id FROM payments WHERE transaction_id = %s LIMIT 1", (transaction_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Transaction ID already exists."}), 409
        if booking_id and doctor_id:
            slot_lock_name = f"appointment-slot:{doctor_id}:{appointment_date}:{format_time(appointment_time)[:5]}"
            cur.execute("SELECT GET_LOCK(%s, 35)", (slot_lock_name,))
            lock_row = cur.fetchone()
            if not lock_row or int(lock_row[0] or 0) != 1:
                cur.close()
                return jsonify({"error": "This appointment slot is currently being paid for. Please try another time."}), 409
            slot_available, slot_error = is_doctor_slot_available(
                cur, doctor_id, parse_schedule_date(appointment_date),
                parse_schedule_time(appointment_time), doctor_schedule,
            )
            if not slot_available:
                cur.execute("SELECT RELEASE_LOCK(%s)", (slot_lock_name,))
                slot_lock_name = None
                cur.close()
                return jsonify({"error": slot_error or "This therapist is not available on the selected day."}), 409
        merchant_result = process_hormuud_payment(
            amount=amount_value,
            payment_phone=payment_phone,
            payment_method=payment_method,
            transaction_id=transaction_id,
            description=description,
            currency=currency,
        )
        if merchant_result.get('status') == 'Completed':
            purchase_raw = merchant_result.get('raw') or {}
            verified_result = check_hormuud_payment_status(
                merchant_result.get('provider_transaction_id') or transaction_id,
                merchant_result.get('reference_id'),
            )
            if (
                verified_result
                and verified_result.get('status') == 'Completed'
                and merchant_amount_matches(verified_result.get('raw') or {}, amount_value)
            ):
                merchant_result = {
                    **merchant_result,
                    "reference_id": verified_result.get('reference_id') or merchant_result.get('reference_id'),
                    "invoice_id": verified_result.get('invoice_id') or merchant_result.get('invoice_id'),
                    "provider_transaction_id": verified_result.get('provider_transaction_id') or merchant_result.get('provider_transaction_id'),
                    "raw": {"payment": merchant_result.get('raw') or {}, "verification": verified_result.get('raw') or {}},
                }
            elif _merchant_purchase_confirms_payment(purchase_raw, amount_value):
                merchant_result = {
                    **merchant_result,
                    "status": "Completed",
                    "failure_reason": None,
                    "raw": {
                        "payment": purchase_raw,
                        "verification_attempt": (verified_result or {}).get('raw') if verified_result else None,
                        "verification_note": "Purchase response confirmed payment; status lookup was unavailable or not accepted.",
                    },
                }
                log_info("PAYMENT_VERIFICATION_FALLBACK", json.dumps({
                    "transaction_id": transaction_id,
                    "provider_transaction_id": merchant_result.get('provider_transaction_id'),
                    "reason": "purchase_response_confirmed_status_lookup_failed",
                }, default=str))
            else:
                merchant_result = {
                    **merchant_result,
                    "status": "Pending" if verified_result is None or verified_result.get('status') == 'Pending' else "Failed",
                    "failure_reason": "Payment has not been verified by Hormuud Merchant.",
                    "verification": verified_result,
                }
        merchant_status = merchant_result.get('status', 'Pending')
        payment_status = 'Completed' if merchant_status == 'Completed' else ('Failed' if merchant_status == 'Failed' else 'Pending')
        reference_id = merchant_result.get('reference_id')
        invoice_id = merchant_result.get('invoice_id')
        provider_transaction_id = merchant_result.get('provider_transaction_id')
        failure_reason = merchant_result.get('failure_reason')

        cur.execute("START TRANSACTION")
        existing_payment = _find_payment_by_merchant_refs(cur, reference_id, provider_transaction_id)
        if existing_payment:
            (
                existing_id, existing_owner_id, existing_amount, existing_method, existing_status,
                existing_transaction_id, existing_reference_id, existing_invoice_id,
                existing_provider_transaction_id, existing_phone, existing_currency,
                existing_description, existing_booking_id, existing_doctor_id,
                existing_failure_reason, existing_merchant_response,
            ) = existing_payment
            if existing_owner_id != user.get('user_id'):
                mysql.connection.rollback()
                cur.close()
                return jsonify({"error": "Duplicate merchant transaction reference."}), 409
            if _merchant_purchase_confirms_payment(merchant_result.get('raw') or existing_merchant_response, existing_amount):
                _mark_payment_completed(
                    cur,
                    existing_id,
                    existing_amount,
                    merchant_response=merchant_result.get('raw') or _decoded_merchant_response(existing_merchant_response),
                    source="merchant_reference_idempotency",
                )
                if existing_booking_id:
                    shared_assessment = _confirm_paid_appointment(cur, existing_id, existing_booking_id, existing_owner_id)
                _write_payment_reconciliation_audit(
                    cur,
                    existing_id,
                    existing_booking_id,
                    existing_transaction_id,
                    existing_provider_transaction_id,
                    "Duplicate merchant reference/provider transaction id reconciled idempotently.",
                )
                existing_status = 'Completed'
                existing_failure_reason = None
            mysql.connection.commit()
            if existing_status == 'Completed' and shared_assessment:
                create_assessment_notifications(
                    existing_owner_id,
                    shared_assessment['prediction_id'],
                    shared_assessment['prediction_result'],
                    shared_assessment['confidence'],
                    shared_assessment['created_at'],
                    appointment_id=existing_booking_id,
                )
            body = _payment_response_body(
                existing_id,
                existing_amount,
                existing_method,
                existing_status,
                existing_transaction_id,
                existing_reference_id,
                existing_invoice_id,
                existing_provider_transaction_id,
                existing_phone,
                existing_currency,
                existing_description,
                existing_booking_id,
                existing_doctor_id,
                existing_failure_reason,
            )
            if slot_lock_name:
                cur.execute("SELECT RELEASE_LOCK(%s)", (slot_lock_name,))
                slot_lock_name = None
            cur.close()
            return jsonify(body), _payment_http_status(existing_status)

        cur.execute(
            """
            INSERT INTO payments
              (user_id, amount, payment_method, payment_status, transaction_id, reference_id, invoice_id, payment_phone, currency, description, booking_id, appointment_id, doctor_id, provider_name, provider_transaction_id, merchant_response, failure_reason, paid_at, refunded_amount, net_amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s)
            """,
            (
                user.get('user_id'),
                amount_value,
                payment_method,
                payment_status,
                transaction_id,
                reference_id,
                invoice_id,
                payment_phone,
                currency,
                description,
                booking_id,
                booking_id,
                doctor_id,
                "WaafiPay",
                provider_transaction_id,
                json.dumps(merchant_result.get('raw') or {}),
                failure_reason,
                utc_now_naive() if payment_status == 'Completed' else None,
                amount_value if payment_status == 'Completed' else 0,
            )
        )
        payment_id = cur.lastrowid
        if payment_status == 'Completed':
            log_financial_event(cur, payment_id, "PAYMENT_COMPLETED", amount_value, 0, amount_value, metadata={"source": "patient_payment"})
            if isinstance(merchant_result.get('raw'), dict) and merchant_result.get('raw', {}).get('verification_note'):
                _write_payment_reconciliation_audit(
                    cur,
                    payment_id,
                    booking_id,
                    transaction_id,
                    provider_transaction_id,
                    merchant_result.get('raw', {}).get('verification_note'),
                )

        if booking_id and payment_status == 'Completed':
            cur.execute(
                """
                UPDATE appointments
                SET status = 'Confirmed',
                    payment_status = 'Completed',
                    payment_id = %s
                WHERE id = %s
                  AND user_id = %s
                  AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'rejected', 'expired', 'completed')
                  AND LOWER(COALESCE(payment_status, 'pending')) NOT IN ('paid', 'completed')
                """,
                (payment_id, booking_id, user.get('user_id'))
            )
            if cur.rowcount == 0:
                cur.execute(
                    """
                    SELECT payment_status, status
                    FROM appointments
                    WHERE id = %s AND user_id = %s
                    """,
                    (booking_id, user.get('user_id')),
                )
                appointment_after_payment = cur.fetchone()
                appointment_payment_key = str((appointment_after_payment or [None])[0] or '').strip().lower()
                appointment_status_key = str((appointment_after_payment or [None, None])[1] or '').strip().lower()
                if appointment_payment_key in ['paid', 'completed'] or appointment_status_key in ['confirmed', 'completed']:
                    _write_payment_reconciliation_audit(
                        cur,
                        payment_id,
                        booking_id,
                        transaction_id,
                        provider_transaction_id,
                        "Approved payment preserved; appointment was already confirmed/paid.",
                    )
                else:
                    _write_payment_reconciliation_audit(
                        cur,
                        payment_id,
                        booking_id,
                        transaction_id,
                        provider_transaction_id,
                        "Approved payment preserved; appointment confirmation needs manual review.",
                    )
            else:
                mark_paid_appointment_slot_booked(cur, booking_id)
                shared_assessment = share_paid_appointment_assessment(
                    cur, booking_id, user.get('user_id')
                )

        if booking_id and payment_status == 'Failed':
            cur.execute(
                "UPDATE appointments SET payment_status = 'Failed', status = 'Failed' WHERE id = %s AND user_id = %s",
                (booking_id, user.get('user_id'))
            )
            cur.execute(
                """
                UPDATE appointment_slots
                SET status = 'released',
                    appointment_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE appointment_id = %s
                  AND LOWER(COALESCE(status, '')) = 'pending_payment'
                """,
                (booking_id,)
            )
        mysql.connection.commit()

        if slot_lock_name:
            cur.execute("SELECT RELEASE_LOCK(%s)", (slot_lock_name,))
            slot_lock_name = None
        cur.close()

        if payment_status == 'Completed':
            patient_name = user.get('name') or user.get('username') or f"Patient {user.get('user_id')}"
            payment_message = (
                f"Amount: {float(amount_value or 0):.2f} {currency}. Patient: {patient_name}. "
                f"Doctor: {doctor_name or 'Selected doctor'}. Transaction ID: {transaction_id}."
            )
            create_user_notification(
                user.get('user_id'),
                "Payment completed successfully",
                f"Payment completed successfully. {payment_message}",
                "PAYMENT",
                reference_id=payment_id,
                role_target='user',
            )
            if doctor_user_id:
                create_user_notification(
                    doctor_user_id,
                    "Appointment payment received",
                    f"Appointment payment received. {payment_message}",
                    "PAYMENT",
                    reference_id=payment_id,
                    role_target='doctor',
                )
            create_role_notifications(
                'admin',
                'New payment received',
                f"New payment received. {payment_message}",
                'PAYMENT',
                payment_id,
                roles=['admin', 'super_admin', 'it_admin'],
            )
            if shared_assessment:
                create_assessment_notifications(
                    user.get('user_id'),
                    shared_assessment['prediction_id'],
                    shared_assessment['prediction_result'],
                    shared_assessment['confidence'],
                    shared_assessment['created_at'],
                    appointment_id=booking_id,
                )

        if payment_status == 'Failed':
            create_user_notification(
                user.get('user_id'),
                "Payment failed",
                user_friendly_payment_error(failure_reason),
                "payment_failed",
                reference_id=payment_id,
                role_target='user',
            )
            if doctor_user_id:
                create_user_notification(
                    doctor_user_id,
                    "Appointment payment failed",
                    f"A payment attempt for appointment #{booking_id} failed. No earnings were recorded.",
                    "payment_failed",
                    reference_id=payment_id,
                    role_target='doctor',
                )

        response_body = {
            "payment": {
                "id": payment_id,
                "amount": amount_value,
                "paymentMethod": payment_method,
                "status": payment_status,
                "transactionId": transaction_id,
                "referenceId": reference_id,
                "invoiceId": invoice_id,
                "providerTransactionId": provider_transaction_id,
                "paymentPhone": payment_phone,
                "currency": currency,
                "description": description,
                "bookingId": booking_id,
                "appointmentId": booking_id,
                "doctorId": doctor_id,
                "failureReason": failure_reason,
                "message": user_friendly_payment_error(failure_reason) if payment_status == 'Failed' else None,
            }
        }
        if payment_status == 'Failed':
            response_body["error"] = user_friendly_payment_error(failure_reason)
            return jsonify(response_body), 402
        return jsonify(response_body), 200 if payment_status == 'Completed' else 202
    except Exception as e:
        try:
            mysql.connection.rollback()
        except Exception:
            pass
        if slot_lock_name:
            try:
                lock_cur = mysql.connection.cursor()
                lock_cur.execute("SELECT RELEASE_LOCK(%s)", (slot_lock_name,))
                lock_cur.close()
            except Exception:
                pass
        log_info(f"âŒ CREATE PAYMENT ERROR: {e}")
        return jsonify({"error": "Unable to process payment."}), 500





