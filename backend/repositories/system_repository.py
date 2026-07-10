"""System repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/")
def home():
    return jsonify({
        "message": "Somali Mental Health API Running"
    })




@app.route("/api/health", methods=["GET"])
def health():

    db_ok = False
    model_ready = ensure_prediction_model_loaded()

    if mysql:
        try:
            cur = mysql.connection.cursor()
            cur.execute("SELECT 1")
            cur.close()
            db_ok = True
        except Exception:
            pass

    return jsonify({
        "status": "ok",
        "model": model_ready,
        "model_type": model.__class__.__name__ if model_ready else None,
        "vectorizer": vectorizer.__class__.__name__ if model_ready and vectorizer else None,
        "model_path": str(MODEL_PATH),
        "model_error": None if model_ready else model_load_error,
        "db": db_ok
    })




@app.route("/api/admin/financial-ledger", methods=["GET"])
def get_financial_ledger():
    admin_user, auth_error = require_admin_or_super_admin()
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 25))))
        offset = (page - 1) * limit
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        cur.execute("SELECT COUNT(*) FROM financial_ledger")
        total = int((cur.fetchone() or [0])[0] or 0)
        cur.execute(
            """
            SELECT fl.id, fl.payment_id, fl.appointment_id, fl.patient_id, fl.doctor_id,
                   fl.event_type, fl.original_amount, fl.refund_amount, fl.remaining_amount,
                   fl.refund_reason, fl.approved_by, fl.event_at, fl.revenue_after_event,
                   p.payment_method, p.transaction_id, p.payment_status,
                   COALESCE(u.fullname, u.username, 'Unknown Patient') AS patient_name,
                   COALESCE(d.name, du.fullname, du.username, 'Unknown Doctor') AS doctor_name
            FROM financial_ledger fl
            LEFT JOIN payments p ON p.id = fl.payment_id
            LEFT JOIN users u ON u.id = fl.patient_id
            LEFT JOIN doctors d ON d.id = fl.doctor_id
            LEFT JOIN users du ON du.id = d.user_id
            ORDER BY fl.event_at DESC, fl.id DESC
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        columns = [item[0] for item in cur.description]
        records = [dict(zip(columns, row)) for row in cur.fetchall()]
        cur.close()
        for record in records:
            for key in ("original_amount", "refund_amount", "remaining_amount", "revenue_after_event"):
                record[key] = float(record.get(key) or 0)
            record["event_at"] = record["event_at"].isoformat() if record.get("event_at") else None
            record["gross_amount"] = record["original_amount"]
            record["net_amount"] = record["remaining_amount"]
        return jsonify({
            "ledger": records,
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max(1, math.ceil(total / limit)),
        })
    except Exception as e:
        log_info(f"GET FINANCIAL LEDGER ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load the financial ledger."}), 500




