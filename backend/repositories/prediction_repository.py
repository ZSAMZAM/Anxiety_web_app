"""Prediction repository handlers."""

from utils.runtime import *  # noqa: F401,F403

@app.route("/api/predict", methods=["POST"])
def predict():

    try:
        user, auth_error = require_current_user()
        if auth_error:
            return auth_error
        if canonical_role(user.get('role')) != 'user':
            return jsonify({"error": "Only patient accounts can submit anxiety assessments."}), 403

        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid prediction request body."}), 400

        text = str(data.get("text", "")).strip()

        if not text:
            return jsonify({"error": "Assessment text is required."}), 400
        if len(text) < 20:
            return jsonify({"error": "Assessment text must be at least 20 characters."}), 400

        cleaned = clean_text(text)
        if not cleaned:
            return jsonify({"error": "Assessment text does not contain enough readable content."}), 400
        try:
            class_index, prediction_label, confidence = predict_assessment_text(cleaned)
        except RuntimeError:
            logger.exception("Prediction model inference failed")
            return jsonify({
                "error": "The assessment model is temporarily unavailable. Please try again shortly.",
                "code": "PREDICTION_MODEL_FAILED",
            }), 503

        if "anxiety" in prediction_label.lower():
            result_type = "anxiety"
            risk_level = "Anxiety"
        elif "depression" in prediction_label.lower():
            result_type = "depression"
            risk_level = "Depression"
        elif "neutral" in prediction_label.lower():
            result_type = "neutral"
            risk_level = "Neutral"
        else:
            result_type = "neutral"
            risk_level = "Neutral"

        confidence_percent = round(float(confidence or 0) * 100, 1)
        recommendation = (
            f"Detected {prediction_label} with {confidence_percent}% confidence. "
            "Review your result, practice a calming exercise, and consider booking a consultation if symptoms feel difficult to manage."
        )
        created_at = utc_now_naive()
        prediction_id = None
        booking_state = None

        if not mysql:
            logger.error("Prediction save failed: MySQL extension is not initialized")
            return jsonify({
                "error": "Assessment storage is temporarily unavailable. Please try again.",
                "code": "PREDICTION_DATABASE_UNAVAILABLE",
            }), 503

        if mysql:
            try:
                cur = mysql.connection.cursor()
                cur.execute(
                    """
                    INSERT INTO predictions
                      (user_id, input_text, cleaned_text, prediction_result, confidence_score, score,
                       anxiety_level, recommendation, completion_status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Completed', %s)
                    """,
                    (
                        user.get('user_id'),
                        text,
                        cleaned,
                        prediction_label,
                        confidence,
                        confidence_percent,
                        risk_level,
                        recommendation,
                        created_at,
                    )
                )
                prediction_id = cur.lastrowid
                mysql.connection.commit()
                booking_state = patient_assessment_booking_state(cur, user.get('user_id'))
                cur.close()
            except Exception:
                try:
                    mysql.connection.rollback()
                except Exception:
                    logger.exception("Prediction save rollback failed")
                logger.exception("Prediction database save failed")
                return jsonify({
                    "error": "Assessment could not be saved. Please try again.",
                    "code": "PREDICTION_SAVE_FAILED",
                }), 500

        if prediction_id is None or booking_state is None:
            logger.error(
                "Prediction save returned incomplete state: prediction_id=%s booking_state=%s",
                prediction_id,
                booking_state,
            )
            return jsonify({
                "error": "Assessment could not be saved. Please try again.",
                "code": "PREDICTION_SAVE_INCOMPLETE",
            }), 500

        return jsonify({
            "id": prediction_id,
            "prediction_id": prediction_id,
            "prediction": int(class_index) if class_index is not None else None,
            "class_name": prediction_label,
            "result": result_type,
            "confidence": confidence,
            "risk_level": risk_level,
            "anxiety_level": risk_level,
            "recommendation": recommendation,
            "completion_status": "Completed",
            "created_at": created_at.isoformat(),
            **booking_state,
        })

    except Exception:
        logger.exception("Unhandled prediction endpoint error")
        return jsonify({
            "error": "Unable to complete assessment analysis. Please try again.",
            "code": "PREDICTION_UNHANDLED_ERROR",
        }), 500




@app.route("/api/history", methods=["GET"])
def history():
    if not mysql:
        return jsonify({"history": []})

    user = get_current_user()
    try:
        cur = mysql.connection.cursor()
        booking_state = None
        if user and is_admin_role(user.get('role')):
            cur.execute("""
                SELECT id, input_text, prediction_result, confidence_score, anxiety_level, recommendation, created_at,
                       sharing_status
                FROM predictions
                WHERE sharing_status = 'shared_with_doctor'
                ORDER BY created_at DESC
                LIMIT 50
            """)
        elif user and canonical_role(user.get('role')) == 'user':
            booking_state = patient_assessment_booking_state(cur, user.get('user_id'))
            cur.execute("""
                SELECT p.id, p.input_text, p.prediction_result, p.confidence_score, p.anxiety_level, p.recommendation, p.created_at,
                       CASE
                         WHEN EXISTS (SELECT 1 FROM reports r WHERE r.appointment_id = p.shared_appointment_id AND LOWER(COALESCE(r.report_status, r.status, '')) = 'completed') THEN 'consultation_completed'
                         WHEN p.sharing_status = 'shared_with_doctor' THEN 'shared_with_doctor'
                         ELSE 'self_assessment'
                       END AS sharing_status
                FROM predictions p
                WHERE user_id = %s
                  AND LOWER(COALESCE(p.completion_status, 'completed')) = 'completed'
                ORDER BY created_at DESC
                LIMIT 50
            """, (user.get('user_id'),))
        elif user:
            return jsonify({"error": "Permission denied."}), 403
        else:
            return jsonify({"error": "Authentication required."}), 401

        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        history = []
        for row in rows or []:
            record = dict(zip(columns, row))
            prediction_result = record.get("prediction_result") or ''
            normalized_result = 'neutral'
            if isinstance(prediction_result, str):
                lower_result = prediction_result.strip().lower()
                if 'anxiety' in lower_result:
                    normalized_result = 'anxiety'
                elif 'depression' in lower_result:
                    normalized_result = 'depression'
                elif 'neutral' in lower_result:
                    normalized_result = 'neutral'

            history.append({
                "id": record.get("id"),
                "date": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "result": normalized_result,
                "anxietyLevel": record.get("prediction_result"),
                "riskLevel": record.get("anxiety_level") or record.get("prediction_result"),
                "confidence": round(float(record.get("confidence_score", 0)) * 100),
                "recommendation": record.get("recommendation"),
                "summary": record.get("recommendation") or f"Detected {record.get('prediction_result')} with {round(float(record.get('confidence_score', 0)) * 100)}% confidence.",
                "sharing_status": record.get("sharing_status") or "self_assessment",
                "status_label": {
                    "shared_with_doctor": "Shared with Doctor",
                    "consultation_completed": "Consultation Completed",
                }.get(record.get("sharing_status"), "Self Assessment (Not Shared)"),
            })

        response = {"history": history}
        if booking_state is not None:
            response.update(booking_state)
        return jsonify(response)

    except Exception as e:
        log_info(f"âŒ HISTORY ERROR: {e}")
        return jsonify({"history": []}), 500




@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    text = request.args.get('text', '').strip()
    prediction = request.args.get('prediction', '').strip() or 'Neutral'
    confidence = request.args.get('confidence', 0)
    user, auth_error = require_current_user()
    if auth_error:
        return auth_error
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patient accounts can request recommendations."}), 403

    if not text:
        return jsonify({"error": "Text parameter is required for recommendations."}), 400

    gemini_output = None
    if is_low_anxiety(prediction, confidence):
        prompt = build_recommendation_prompt(text, prediction, confidence)
        gemini_output = fetch_gemini_recommendations(prompt)
        recommendations = []

        if gemini_output:
            recommendations = [line.strip() for line in re.split(r'[\n]+', gemini_output) if line.strip()]
        else:
            recommendations = [
                'Practice deep breathing exercises for 5 minutes.',
                'Create a short walking routine to refresh your mind.',
                'Use a gratitude journal to focus on positive thoughts.',
                'Try a simple meditation before sleep.',
                'Stay hydrated and follow a balanced meal plan.'
            ]
    else:
        recommendations = []

    if mysql:
        try:
            cur = mysql.connection.cursor()
            cur.execute(
                "INSERT INTO recommendations (user_id, input_text, prediction_result, confidence_score, recommendation_json) VALUES (%s, %s, %s, %s, %s)",
                (
                    user.get('user_id'),
                    text,
                    prediction,
                    float(confidence),
                    json.dumps(recommendations),
                )
            )
            mysql.connection.commit()
            cur.close()
        except Exception as e:
            log_info(f"âŒ RECOMMENDATIONS DB ERROR: {e}")

    return jsonify({
        "recommendations": recommendations,
        "source": GEMINI_API_KEY and is_low_anxiety(prediction, confidence) and gemini_output is not None and 'gemini' or 'fallback'
    })




@app.route("/api/admin/predictions", methods=["GET"])
def get_admin_predictions():
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
        result_filter = request.args.get('result', 'all')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        confidence_min = request.args.get('confidence_min', '')
        confidence_max = request.args.get('confidence_max', '')

        filter_sql = ""
        filter_params = []

        if result_filter != 'all':
            filter_sql += " AND LOWER(p.prediction_result) LIKE %s"
            filter_params.append(f"%{result_filter.lower()}%")

        if date_from:
            filter_sql += " AND p.created_at >= %s"
            filter_params.append(date_from)

        if date_to:
            filter_sql += " AND p.created_at <= %s"
            filter_params.append(date_to + ' 23:59:59')

        if confidence_min:
            filter_sql += " AND p.confidence_score >= %s"
            filter_params.append(float(confidence_min))

        if confidence_max:
            filter_sql += " AND p.confidence_score <= %s"
            filter_params.append(float(confidence_max))

        # Build query
        query = """
            SELECT p.id, p.user_id, p.input_text, p.prediction_result, p.confidence_score, p.created_at,
                    u.fullname, u.phone
            FROM predictions p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE COALESCE(p.sandbox_mode, 0) = 0
              AND p.sharing_status = 'shared_with_doctor'
        """

        query += filter_sql
        query += " ORDER BY p.created_at DESC LIMIT %s OFFSET %s"
        params = [*filter_params, limit, (page - 1) * limit]

        cur.execute(query, params)
        predictions = cur.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM predictions p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE COALESCE(p.sandbox_mode, 0) = 0
              AND p.sharing_status = 'shared_with_doctor'
        """
        count_query += filter_sql
        cur.execute(count_query, filter_params)
        total = cur.fetchone()[0]

        cur.close()

        return jsonify({
            "predictions": [{
                "id": p[0],
                "user_id": p[1],
                "input_text": p[2],
                "prediction_result": p[3],
                "confidence_score": p[4],
                "created_at": p[5].isoformat() if p[5] else None,
                "user_name": p[6],
                "user_phone": p[7]
            } for p in predictions],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        log_info(f"âŒ GET ADMIN PREDICTIONS ERROR: {e}")
        return jsonify({"error": "Unable to load predictions. Please try again."}), 500




@app.route("/api/admin/predictions/stats", methods=["GET"])
def get_prediction_stats():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        # Get prediction counts by result
        cur.execute("""
            SELECT prediction_result, COUNT(*) as count
            FROM predictions
            WHERE COALESCE(sandbox_mode, 0) = 0
              AND sharing_status = 'shared_with_doctor'
            GROUP BY prediction_result
        """)
        result_counts = dict(cur.fetchall())

        # Get confidence score distribution
        cur.execute("""
            SELECT
                CASE
                    WHEN confidence_score >= 0.8 THEN 'High (80-100%)'
                    WHEN confidence_score >= 0.6 THEN 'Medium (60-79%)'
                    ELSE 'Low (0-59%)'
                END as confidence_range,
                COUNT(*) as count
            FROM predictions
            WHERE COALESCE(sandbox_mode, 0) = 0
              AND sharing_status = 'shared_with_doctor'
            GROUP BY confidence_range
        """)
        confidence_distribution = dict(cur.fetchall())

        # Get predictions by date (last 30 days)
        cur.execute("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND COALESCE(sandbox_mode, 0) = 0
              AND sharing_status = 'shared_with_doctor'
            GROUP BY DATE(created_at)
            ORDER BY date
        """)
        daily_predictions = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

        # Get high-risk users (multiple high anxiety/depression predictions)
        cur.execute("""
            SELECT u.id, u.fullname, u.phone, COUNT(*) as prediction_count
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            WHERE (LOWER(p.prediction_result) LIKE '%anxiety%' OR LOWER(p.prediction_result) LIKE '%depression%') AND p.confidence_score > 0.7
              AND COALESCE(p.sandbox_mode, 0) = 0
              AND p.sharing_status = 'shared_with_doctor'
            GROUP BY u.id, u.fullname, u.phone
            HAVING prediction_count >= 3
            ORDER BY prediction_count DESC
            LIMIT 10
        """)
        high_risk_users = [{
            "id": row[0],
            "name": row[1],
            "phone": row[2],
            "prediction_count": row[3]
        } for row in cur.fetchall()]

        cur.close()

        return jsonify({
            "result_counts": result_counts,
            "confidence_distribution": confidence_distribution,
            "daily_predictions": daily_predictions,
            "high_risk_users": high_risk_users
        })

    except Exception as e:
        log_info(f"âŒ GET PREDICTION STATS ERROR: {e}")
        return jsonify({"error": "Unable to load prediction stats. Please try again."}), 500




@app.route("/api/prediction-distribution", methods=["GET"])
def prediction_distribution():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT prediction_result, COUNT(*) FROM predictions WHERE COALESCE(sandbox_mode, 0) = 0 AND sharing_status = 'shared_with_doctor' GROUP BY prediction_result")
        rows = cur.fetchall()
        counts = {row[0].lower(): int(row[1]) for row in rows} if rows else {"anxiety": 0, "depression": 0, "neutral": 0}
        # normalize keys to ensure anxiety/depression/neutral exist
        response = {
            "anxiety": counts.get('anxiety', 0) or counts.get('Anxiety', 0),
            "depression": counts.get('depression', 0) or counts.get('Depression', 0),
            "neutral": counts.get('neutral', 0) or counts.get('Neutral', 0),
        }
        cur.close()
        return jsonify(response)
    except Exception as e:
        log_info(f"âŒ PREDICTION DISTRIBUTION ERROR: {e}")
        return jsonify({"anxiety": 0, "depression": 0, "neutral": 0}), 500




