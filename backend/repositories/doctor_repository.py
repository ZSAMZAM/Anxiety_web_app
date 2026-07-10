"""Doctor repository handlers."""

from utils.runtime import *  # noqa: F401,F403
from utils.uploads import resolve_upload_filename, save_avatar_data_url, upload_dir

@app.route("/api/doctors", methods=["GET"])
def get_doctors():
    if not mysql:
        return jsonify({"doctors": []})

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if user and canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Doctor search is available to patient accounts only."}), 403
    try:
        search = request.args.get('search', '').strip()
        status_param = request.args.get('status', '').strip().lower()

        cur = mysql.connection.cursor()
        ensure_doctor_reviews_table(cur)
        booking_state = can_patient_book_therapist(cur, user.get('user_id'))
        if not booking_state["can_book_therapist"]:
            cur.close()
            return booking_not_allowed_response(booking_state)

        # Build base query: select doctor fields and live review stats.
        query = """
            SELECT d.*, COALESCE(u.username, d.username) as username,
                   COALESCE(rs.average_rating, 0) AS review_average_rating,
                   COALESCE(rs.total_reviews, 0) AS review_count
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN (
                SELECT doctor_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS total_reviews
                FROM doctor_reviews
                GROUP BY doctor_id
            ) rs ON rs.doctor_id = d.id
            WHERE COALESCE(d.sandbox_mode, 0) = 0
        """
        params = []

        # Status filtering: support 'active', 'inactive', 'all' (or empty)
        if status_param in ['', 'active']:
            query += " AND UPPER(d.status) = 'ACTIVE'"
        elif status_param in ['inactive']:
            query += " AND (UPPER(d.status) = 'INACTIVE' OR UPPER(d.status) = 'DEACTIVE')"
        # else 'all' or empty -> no status filter (return all)

        # Search by name, username, or specialization
        if search:
            query += " AND (d.name LIKE %s OR d.specialization LIKE %s OR COALESCE(u.username, d.username) LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        query += " ORDER BY d.created_at DESC"

        cur.execute(query, params)
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        doctors = []
        for row in rows or []:
            record = dict(zip(columns, row))
            doctors.append({
                "id": record.get("id"),
                "name": record.get("name"),
                "email": record.get("email"),
                "user_id": record.get("user_id"),
                "specialization": record.get("specialization"),
                "specialty": record.get("specialty") or record.get("specialization"),
                "hospital": record.get("hospital_name") or record.get("clinic_name"),
                "hospital_name": record.get("hospital_name"),
                "clinic_name": record.get("clinic_name"),
                "location": record.get("clinic_address") or record.get("address"),
                "address": record.get("address"),
                "district": record.get("district"),
                "city": record.get("city"),
                "experience": record.get("experience"),
                "experience_years": record.get("experience_years"),
                "phone": record.get("phone"),
                "rating": float(record.get("review_average_rating", 0) or 0),
                "average_rating": float(record.get("review_average_rating", 0) or 0),
                "review_count": int(record.get("review_count", 0) or 0),
                "total_reviews": int(record.get("review_count", 0) or 0),
                "status": (str(record.get("status") or '').upper()),
                "username": record.get("username"),
            "image": record.get("photo") or record.get("image"),
                "photo": record.get("photo") or record.get("image"),
                "bio": record.get("bio"),
                "availability_schedule": get_doctor_schedule(record.get("id"), record.get("availability_schedule")),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "consultation_fee": float(record.get("consultation_fee") or record.get("cons_fee") or 0),
                "cons_fee": float(record.get("cons_fee") or record.get("consultation_fee") or 0),
                "fee": float(record.get("cons_fee") or record.get("consultation_fee") or 0),
            })

        return jsonify({"doctors": doctors})

    except Exception as e:
        log_info(f"âŒ DOCTORS ERROR: {e}")
        return jsonify({"doctors": []}), 500




@app.route("/api/admin/doctors", methods=["GET"])
def get_admin_doctors():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '').strip().upper()
        if status_filter == 'INACTIVE':
            status_filter = 'DEACTIVE'

        offset = (page - 1) * limit

        # Build query with filters
        query = """
            SELECT id, user_id, username, name, specialization, experience, phone, hospital_name, age, gender, rating, status, photo as image, created_at, consultation_fee, cons_fee,
                   (SELECT COUNT(*) FROM appointments WHERE doctor_id = doctors.id) as appointment_count,
                   doctors.rating as avg_rating
            FROM doctors
            WHERE 1=1
        """
        params = []

        if search:
            query += " AND (name LIKE %s OR specialization LIKE %s OR username LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

        if status_filter:
            query += " AND status = %s"
            params.append(status_filter)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur = mysql.connection.cursor()
        cur.execute(query, params)
        doctors = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as total
            FROM doctors
            WHERE 1=1
        """
        count_params = []

        if search:
            count_query += " AND (name LIKE %s OR specialization LIKE %s)"
            count_params.extend([f'%{search}%', f'%{search}%'])

        if status_filter:
            count_query += " AND status = %s"
            count_params.append(status_filter)

        cur.execute(count_query, count_params)
        total_result = cur.fetchone()
        total = total_result[0] if total_result else 0

        cur.close()

        doctors_list = []
        for row in doctors:
            record = dict(zip(columns, row))
            doctors_list.append({
                "id": record.get("id"),
                "user_id": record.get("user_id"),
                "username": record.get("username"),
                "name": record.get("name"),
                "specialization": record.get("specialization"),
                "experience": record.get("experience"),
                "phone": record.get("phone"),
                "hospital": record.get("hospital_name"),
                "hospital_name": record.get("hospital_name"),
                "age": record.get("age"),
                "gender": record.get("gender"),
                "rating": float(record.get("rating", 0)) if record.get("rating") is not None else 0,
                "consultation_fee": float(record.get("consultation_fee") or record.get("cons_fee") or 0),
                "cons_fee": float(record.get("cons_fee") or record.get("consultation_fee") or 0),
                "fee": float(record.get("cons_fee") or record.get("consultation_fee") or 0),
                "status": normalize_doctor_status(record.get("status")) or 'ACTIVE',
                "image": record.get("image"),
                "photo": record.get("image"),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "appointment_count": record.get("appointment_count", 0),
                "avg_rating": float(record.get("avg_rating", 0)) if record.get("avg_rating") else None,
            })

        return jsonify({
            "doctors": doctors_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })

    except Exception as e:
        return jsonify({"doctors": [], "pagination": {"page": 1, "limit": 10, "total": 0, "pages": 0}}), 500




@app.route("/api/admin/doctors", methods=["POST"])
@app.route("/api/doctors/create", methods=["POST"])
def create_doctor():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    full_name = (data.get("full_name", "") or data.get("name", "")).strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    specialty = (data.get("specialty", "") or data.get("specialization", "")).strip()
    experience = data.get("experience", "").strip()
    phone = data.get("phone", "").strip()
    hospital = data.get("hospital", "").strip()
    age = data.get("age")
    gender = data.get("gender", "").strip()
    fee_input = data.get("cons_fee", data.get("consultation_fee", data.get("fee")))
    # rating and photo fields removed from doctor creation

    if not full_name or not username or not password or not specialty or not hospital or not phone or not gender or age is None or age == '' or not str(experience or '').strip() or fee_input is None or fee_input == '':
        missing = []
        if not full_name:
            missing.append("Full name")
        if not username:
            missing.append("Username")
        if not password:
            missing.append("Password")
        if not specialty:
            missing.append("Specialty")
        if not hospital:
            missing.append("Hospital")
        if not phone:
            missing.append("Phone")
        if not gender:
            missing.append("Gender")
        if age is None or age == '':
            missing.append("Age")
        if not str(experience or '').strip():
            missing.append("Experience")
        if fee_input is None or fee_input == '':
            missing.append("Consultation fee")
        return jsonify({"error": f"{', '.join(missing)} is required."}), 400

    try:
        full_name = validate_person_name(full_name)
        username = validate_username_value(username)
        phone = validate_somalia_phone(phone)
    except ValueError as validation_error:
        return jsonify({"error": str(validation_error)}), 400

    if len(hospital) > 120:
        return jsonify({"error": "Hospital name must be 120 characters or less."}), 400
    if len(specialty) > 120:
        return jsonify({"error": "Specialty must be 120 characters or less."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if not re.search(r'[A-Z]', password):
        return jsonify({"error": "Password must contain at least one uppercase letter."}), 400
    if not re.search(r'[a-z]', password):
        return jsonify({"error": "Password must contain at least one lowercase letter."}), 400
    if not re.search(r'[0-9]', password):
        return jsonify({"error": "Password must contain at least one number."}), 400
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return jsonify({"error": "Password must contain at least one special character."}), 400

    try:
        cur = mysql.connection.cursor()

        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Username is already taken."}), 400
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Phone number is already registered."}), 400

        if gender not in ['Male', 'Female']:
            cur.close()
            return jsonify({"error": "Gender must be Male or Female."}), 400

        age_value = None
        try:
            age_value = int(age)
        except (TypeError, ValueError):
            cur.close()
            return jsonify({"error": "Age must be a valid number."}), 400

        if age_value < 25 or age_value > 80:
            cur.close()
            return jsonify({"error": "Age must be between 25 and 80."}), 400

        if experience:
            try:
                experience_value = int(experience)
            except (TypeError, ValueError):
                cur.close()
                return jsonify({"error": "Experience must be a valid whole number."}), 400
            if experience_value < 0 or experience_value > 60:
                cur.close()
                return jsonify({"error": "Experience must be between 0 and 60 years."}), 400
            experience = str(experience_value)

        try:
            cons_fee = parse_positive_money(fee_input)
        except ValueError as fee_error:
            cur.close()
            return jsonify({"error": str(fee_error)}), 400

        hashed_password = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users (username, fullname, phone, email, password, role, status, phone_verified, must_change_password) VALUES (%s, %s, %s, %s, %s, 'doctor', 'Active', 1, 1)",
            (username, full_name, phone, None, hashed_password)
        )
        mysql.connection.commit()
        user_id = cur.lastrowid

        cur.execute(
            "INSERT INTO doctors (user_id, username, name, specialization, hospital_name, age, gender, experience, phone, consultation_fee, cons_fee, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active')",
            (user_id, username, full_name, specialty, hospital, age_value, gender, experience, phone, cons_fee, cons_fee)
        )
        mysql.connection.commit()
        doctor_id = cur.lastrowid
        sync_doctor_password_record(
            cur,
            doctor_id,
            user_id,
            password,
            'generated',
            'Admin',
            'Created',
            changed_by_user_id=user.get('user_id') or user.get('super_admin_id'),
        )
        mysql.connection.commit()
        cur.close()

        response = {
            "doctor": {
                "id": doctor_id,
                "user_id": user_id,
                "username": username,
                "full_name": full_name,
                "name": full_name,
                "specialty": specialty,
                "specialization": specialty,
                "hospital": hospital,
                "hospital_name": hospital,
                "age": age_value,
                "gender": gender,
                "experience": experience,
                "phone": phone,
                "consultation_fee": cons_fee,
                "cons_fee": cons_fee,
                "fee": cons_fee,
                "status": "Active",
            }
        }

        if user_id:
            response["user"] = {
                "id": user_id,
                "username": username,
                "name": full_name,
                "role": "doctor",
                "status": "Active",
            }

        return jsonify(response), 201
    except Exception as e:
        log_info(f"âŒ CREATE DOCTOR ERROR: {e}")
        return jsonify({"error": "Unable to create doctor."}), 500




@app.route("/api/admin/doctors/<int:doctor_id>", methods=["PUT"])
def update_doctor(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    phone = data.get("phone", "").strip()
    hospital = data.get("hospital", "").strip()
    age = data.get("age")
    gender = data.get("gender", "").strip()
    specialization = data.get("specialization", "").strip()
    experience = data.get("experience", "").strip()
    fee_input = data.get("cons_fee", data.get("consultation_fee", data.get("fee")))
    # rating and photo fields removed from doctor update
    status = normalize_doctor_status_db(data.get("status", "ACTIVE")) or 'ACTIVE'

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT user_id, username, name, specialization, hospital_name, age, gender, experience, COALESCE(cons_fee, consultation_fee), phone
            FROM doctors
            WHERE id = %s
            """,
            (doctor_id,)
        )
        current = cur.fetchone()
        cur.close()
    except Exception as e:
        log_info(f"Ã¢ÂÅ’ UPDATE DOCTOR LOAD ERROR: {e}")
        return jsonify({"error": "Unable to update doctor."}), 500

    if not current:
        return jsonify({"error": "Doctor not found."}), 404

    current_user_id, current_username, current_name, current_specialization, current_hospital, current_age, current_gender, current_experience, current_fee, current_phone = current
    username = username or (current_username or "")
    name = name or (current_name or "")
    phone = phone or (current_phone or "")
    specialization = specialization or (current_specialization or "")
    hospital = hospital or (current_hospital or "")
    age = age if age is not None and age != "" else current_age
    gender = gender or (current_gender or "")
    experience = experience or (current_experience or "")
    fee_input = fee_input if fee_input is not None and fee_input != "" else current_fee

    try:
        username = validate_username_value(username)
        name = validate_person_name(name)
        phone = validate_somalia_phone(phone)
    except ValueError as validation_error:
        return jsonify({"error": str(validation_error)}), 400
    if len(hospital) > 120:
        return jsonify({"error": "Hospital name must be 120 characters or less."}), 400
    if len(specialization) > 120:
        return jsonify({"error": "Specialization must be 120 characters or less."}), 400
    if gender and gender not in ['Male', 'Female']:
        return jsonify({"error": "Gender must be Male or Female."}), 400
    if age is not None and age != '':
        try:
            age_value = int(age)
            if age_value < 25 or age_value > 80:
                return jsonify({"error": "Age must be between 25 and 80."}), 400
        except (TypeError, ValueError):
            return jsonify({"error": "Age must be a valid number."}), 400
    else:
        age_value = None
    if experience:
        try:
            experience_value = int(experience)
        except (TypeError, ValueError):
            return jsonify({"error": "Experience must be a valid whole number."}), 400
        if experience_value < 0 or experience_value > 60:
            return jsonify({"error": "Experience must be between 0 and 60 years."}), 400
        experience = str(experience_value)
    try:
        cons_fee = parse_positive_money(fee_input)
    except ValueError as fee_error:
        return jsonify({"error": str(fee_error)}), 400

    try:
        cur = mysql.connection.cursor()

        if username:
            user_id = current_user_id
            if user_id:
                cur.execute("SELECT id FROM users WHERE username = %s AND id != %s", (username, user_id))
                if cur.fetchone():
                    cur.close()
                    return jsonify({"error": "Username is already taken."}), 400
                cur.execute("SELECT id FROM users WHERE phone = %s AND id != %s", (phone, user_id))
                if cur.fetchone():
                    cur.close()
                    return jsonify({"error": "Phone number is already registered."}), 400
                cur.execute("UPDATE users SET username = %s, fullname = %s, phone = %s WHERE id = %s", (username, name, phone, user_id))
            else:
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    cur.close()
                    return jsonify({"error": "Username is already taken."}), 400
                cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
                if cur.fetchone():
                    cur.close()
                    return jsonify({"error": "Phone number is already registered."}), 400
            cur.execute("UPDATE doctors SET username = %s WHERE id = %s", (username, doctor_id))

        cur.execute(
            "UPDATE doctors SET name = %s, specialization = %s, hospital_name = %s, phone = %s, age = %s, gender = %s, experience = %s, consultation_fee = %s, cons_fee = %s, status = %s WHERE id = %s",
            (name, specialization, hospital, phone, age_value, gender or None, experience, cons_fee, cons_fee, status, doctor_id)
        )
        
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Doctor updated successfully.",
            "doctor": {
                "id": doctor_id,
                "username": username,
                "name": name,
                "specialization": specialization,
                "hospital": hospital,
                "hospital_name": hospital,
                "phone": phone,
                "age": age_value,
                "gender": gender,
                "experience": experience,
                "consultation_fee": cons_fee,
                "cons_fee": cons_fee,
                "fee": cons_fee,
                "status": status,
            }
        })
    except Exception as e:
        log_info(f"âŒ UPDATE DOCTOR ERROR: {e}")
        return jsonify({"error": "Unable to update doctor."}), 500




@app.route("/api/admin/doctors/<int:doctor_id>", methods=["DELETE"])
def delete_doctor(doctor_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE appointments SET doctor_id = NULL WHERE doctor_id = %s", (doctor_id,))
        cur.execute("UPDATE payments SET doctor_id = NULL WHERE doctor_id = %s", (doctor_id,))
        cur.execute("DELETE FROM doctors WHERE id = %s", (doctor_id,))
        mysql.connection.commit()
        rows_affected = cur.rowcount
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Doctor not found."}), 404

        return jsonify({"message": "Doctor deleted successfully."})
    except Exception as e:
        log_info(f"âŒ DELETE DOCTOR ERROR: {e}")
        return jsonify({"error": "Unable to delete doctor."}), 500




@app.route("/api/doctor/payments", methods=["GET"])
def get_doctor_payments():
    user, auth_error = require_roles('doctor')
    if auth_error:
        return auth_error
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        ensure_refund_requests_table(cur)
        doctor_id = current_doctor_id(cur, user)
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Active doctor profile not found."}), 403

        cur.execute(
            """
            SELECT
              p.id AS payment_id, p.amount, p.payment_method, p.payment_status,
              p.created_at, p.paid_at, p.transaction_id, p.reference_id,
              p.invoice_id, p.provider_transaction_id, p.provider_name,
              p.failure_reason, p.refund_reason, p.refund_notes, p.refunded_at,
              COALESCE(p.refunded_amount, 0) AS payment_refunded_amount,
              p.net_amount,
              COALESCE(p.currency, 'USD') AS currency,
              a.id AS appointment_id, a.appointment_date, a.appointment_time,
              a.status AS appointment_status, a.notes AS appointment_notes,
              COALESCE(u.fullname, u.username, 'Patient') AS patient_name,
              COALESCE(u.phone, p.payment_phone, a.phone) AS patient_phone,
              COALESCE(d.name, d.fullname, 'Doctor') AS doctor_name,
              COALESCE(d.specialization, d.specialty) AS doctor_specialization,
              d.hospital_name AS doctor_hospital, d.phone AS doctor_phone,
              pr.prediction_result AS assessment_result,
              pr.confidence_score AS assessment_confidence,
              COALESCE(rr.status, 'Not requested') AS refund_status,
              rr.refund_amount, rr.reason AS refund_request_reason,
              rr.processed_at AS refund_processed_at
            FROM payments p
            INNER JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            INNER JOIN doctors d ON d.id = a.doctor_id
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN predictions pr ON pr.id = a.prediction_id AND pr.user_id = a.user_id
            LEFT JOIN refund_requests rr ON rr.appointment_id = a.id AND rr.payment_id = p.id
            WHERE a.doctor_id = %s
              AND COALESCE(p.sandbox_mode, 0) = 0
            ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC
            """,
            (doctor_id,)
        )
        rows = cur.fetchall() or []
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        try:
            platform_fee_percent = max(0.0, min(100.0, float(app.config.get("PLATFORM_FEE_PERCENT") or 0)))
        except (TypeError, ValueError):
            platform_fee_percent = 0.0

        def normalized_payment_status(record):
            raw = str(record.get("payment_status") or "Pending").strip().lower()
            refund = str(record.get("refund_status") or "").strip().lower()
            if raw in ("partial refund", "partially refunded", "partial_refund"):
                return "Partial Refund"
            if raw == "refunded" or refund in ("refunded", "completed"):
                return "Refunded"
            if raw in ("completed", "paid", "success", "successful"):
                return "Completed"
            if raw in ("failed", "declined", "cancelled", "canceled", "expired"):
                return "Failed"
            return "Pending"

        all_payments = []
        for row in rows:
            record = dict(zip(columns, row))
            paid_at = record.get("paid_at") or record.get("created_at")
            amount = float(record.get("amount") or 0)
            status = normalized_payment_status(record)
            gross_amount, refund_amount, net_amount = financial_amounts(amount, status, record.get("payment_refunded_amount") or record.get("refund_amount") or 0)
            doctor_earnings, platform_fee, _fee_percent = doctor_platform_amounts(net_amount)
            doctor_gross_earnings, _gross_platform_fee, _ = doctor_platform_amounts(gross_amount)
            doctor_refunded_amount = round(max(0, doctor_gross_earnings - doctor_earnings), 2)
            all_payments.append({
                "payment_id": record.get("payment_id"),
                "id": record.get("payment_id"),
                "patient_name": record.get("patient_name"),
                "patient_phone": record.get("patient_phone"),
                "appointment_id": record.get("appointment_id"),
                "consultation_fee": amount,
                "amount": amount,
                "gross_amount": gross_amount,
                "refund_amount": refund_amount,
                "net_amount": net_amount,
                "platform_fee_percent": platform_fee_percent,
                "platform_fee": platform_fee,
                "doctor_earnings": doctor_earnings,
                "doctor_gross_earnings": doctor_gross_earnings,
                "doctor_refunded_amount": doctor_refunded_amount,
                "currency": record.get("currency") or "USD",
                "payment_method": record.get("payment_method"),
                "provider_name": record.get("provider_name"),
                "payment_date": paid_at.isoformat() if paid_at else None,
                "paid_at": paid_at.isoformat() if paid_at else None,
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "payment_status": status,
                "refund_status": record.get("refund_status") or "Not requested",
                "transaction_reference": record.get("reference_id") or record.get("transaction_id"),
                "transaction_id": record.get("transaction_id"),
                "reference_id": record.get("reference_id"),
                "provider_transaction_id": record.get("provider_transaction_id"),
                "receipt_number": record.get("invoice_id") or record.get("reference_id") or f"PAY-{record.get('payment_id')}",
                "appointment_date": str(record.get("appointment_date")) if record.get("appointment_date") else None,
                "appointment_time": format_time(record.get("appointment_time"))[:5] if record.get("appointment_time") else None,
                "appointment_status": record.get("appointment_status"),
                "appointment_notes": record.get("appointment_notes"),
                "doctor_name": record.get("doctor_name"),
                "doctor_specialization": record.get("doctor_specialization"),
                "doctor_hospital": record.get("doctor_hospital"),
                "doctor_phone": record.get("doctor_phone"),
                "assessment_result": record.get("assessment_result"),
                "assessment_confidence": round(float(record.get("assessment_confidence") or 0) * 100, 1),
                "failure_reason": record.get("failure_reason"),
                "refund_reason": record.get("refund_reason") or record.get("refund_request_reason"),
                "refund_notes": record.get("refund_notes"),
                "refund_amount": refund_amount,
                "refunded_at": (record.get("refunded_at") or record.get("refund_processed_at")).isoformat() if (record.get("refunded_at") or record.get("refund_processed_at")) else None,
                "receipt_url": f"/api/payments/{record.get('payment_id')}/receipt",
            })

        paid_records = [item for item in all_payments if item["payment_status"] in ["Completed", "Partial Refund", "Refunded"]]
        now = utc_now_naive()
        today = now.date()
        week_start = today - timedelta(days=today.weekday())
        month_start_date = today.replace(day=1)

        def payment_day(item):
            value = item.get("paid_at") or item.get("created_at")
            try:
                return datetime.fromisoformat(value).date() if value else None
            except (TypeError, ValueError):
                return None

        summary = {
            "total_earnings": round(sum(item["doctor_gross_earnings"] for item in paid_records), 2),
            "gross_earnings": round(sum(item["doctor_gross_earnings"] for item in paid_records), 2),
            "net_earnings": round(sum(item["doctor_earnings"] for item in paid_records), 2),
            "refunded_amount": round(sum(item["doctor_refunded_amount"] for item in paid_records), 2),
            "today_earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) == today), 2),
            "week_earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) and payment_day(item) >= week_start), 2),
            "month_earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) and payment_day(item) >= month_start_date), 2),
            "pending_payments": sum(item["payment_status"] == "Pending" for item in all_payments),
            "completed_payments": sum(item["payment_status"] == "Completed" for item in all_payments),
            "refunded_payments": sum(item["payment_status"] == "Refunded" for item in all_payments),
            "partial_refund_payments": sum(item["payment_status"] == "Partial Refund" for item in all_payments),
            "failed_payments": sum(item["payment_status"] == "Failed" for item in all_payments),
            "total_paid_appointments": len({item["appointment_id"] for item in paid_records if item.get("appointment_id")}),
            "completed_consultations": len({item["appointment_id"] for item in paid_records if item.get("appointment_id")}),
            "currency": paid_records[0]["currency"] if paid_records else "USD",
        }

        def earnings_series(period, count):
            values = []
            if period == "day":
                for offset in range(count - 1, -1, -1):
                    point = today - timedelta(days=offset)
                    values.append({"label": point.strftime("%b %d"), "earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) == point), 2)})
            elif period == "week":
                for offset in range(count - 1, -1, -1):
                    start = week_start - timedelta(weeks=offset)
                    end = start + timedelta(days=6)
                    values.append({"label": start.strftime("%b %d"), "earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) and start <= payment_day(item) <= end), 2)})
            else:
                for offset in range(count - 1, -1, -1):
                    month_index = today.year * 12 + today.month - 1 - offset
                    year, month_zero = divmod(month_index, 12)
                    values.append({"label": datetime(year, month_zero + 1, 1).strftime("%b %Y"), "earnings": round(sum(item["doctor_earnings"] for item in paid_records if payment_day(item) and payment_day(item).year == year and payment_day(item).month == month_zero + 1), 2)})
            return values

        methods = {}
        for item in paid_records:
            method = item.get("payment_method") or item.get("provider_name") or "Unknown"
            methods[method] = methods.get(method, 0) + 1

        analytics = {
            "daily_earnings": earnings_series("day", 7),
            "weekly_earnings": earnings_series("week", 8),
            "monthly_earnings": earnings_series("month", 12),
            "payment_methods": [{"name": key, "value": value} for key, value in sorted(methods.items())],
            "payment_statuses": [{"name": status, "value": sum(item["payment_status"] == status for item in all_payments)} for status in ("Completed", "Partial Refund", "Pending", "Refunded", "Failed")],
        }

        method_filter = str(request.args.get("method") or "").strip().lower()
        search = str(request.args.get("search") or "").strip().lower()

        filtered = []
        for item in paid_records:
            haystack = f"{item.get('patient_name') or ''} {item.get('patient_phone') or ''}".lower()
            if method_filter and method_filter != "all" and method_filter not in str(item.get("payment_method") or item.get("provider_name") or "").lower():
                continue
            if search and search not in haystack:
                continue
            item["accounting_status"] = item["payment_status"]
            item["payment_status"] = "Completed"
            filtered.append(item)

        return jsonify({
            "payments": filtered,
            "total": len(filtered),
            "summary": summary,
            "analytics": analytics,
            "payment_methods": sorted({item.get("payment_method") or item.get("provider_name") for item in paid_records if item.get("payment_method") or item.get("provider_name")}),
            "platform_fee_percent": platform_fee_percent,
        })
    except Exception as e:
        log_info(f"GET DOCTOR PAYMENTS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor payments. Please try again."}), 500



@app.route("/api/doctor/profile", methods=["GET"])
def doctor_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if str(user.get('role') or '').strip().lower() != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT d.username,
                   COALESCE(u.fullname, d.name, '') AS fullname,
                   COALESCE(d.phone, u.phone, '') AS phone,
                   COALESCE(d.specialization, d.specialty, '') AS specialty,
                   COALESCE(d.experience_years, d.experience, CAST(d.experience_years AS CHAR), '') AS experience_years,
                   d.hospital_name,
                   d.age,
                   d.gender,
                   COALESCE(d.photo, d.avatar, u.avatar, '') AS avatar,
                   d.id,
                   u.email,
                   COALESCE(d.cons_fee, d.consultation_fee, 0) AS cons_fee,
                   d.availability_schedule
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.user_id = %s
            """,
            (user.get('user_id'),)
        )
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"error": "Doctor profile not found."}), 404

        (
            username,
            fullname,
            phone,
            specialty,
            experience_years,
            hospital_name,
            age,
            gender,
            avatar,
            doctor_id,
            email,
            cons_fee,
            availability_schedule,
        ) = row

        doctor_profile = {
            'username': username or '',
            'fullname': fullname or '',
            'phone': phone or '',
            'specialty': specialty or '',
            'experience_years': experience_years or '',
            'hospital_name': hospital_name or '',
            'hospital': hospital_name or '',
            'age': age or '',
            'gender': gender or '',
            'avatar': avatar or '',
            'doctor_id': doctor_id,
            'email': email or '',
            'consultation_fee': float(cons_fee or 0),
            'cons_fee': float(cons_fee or 0),
            'fee': float(cons_fee or 0),
            'availability_schedule': availability_schedule or '',
        }
        return jsonify({"doctor": doctor_profile})
    except Exception as e:
        log_info(f"âŒ DOCTOR PROFILE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor profile. Please try again."}), 500




@app.route("/api/doctor/profileUpdate", methods=["PUT"])
def update_doctor_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if str(user.get('role') or '').strip().lower() != 'doctor':
        return jsonify({"error": "Forbidden. Doctor access only."}), 403

    data = request.get_json(force=True) or {}

    fullname = str(data.get('fullname', '') or '').strip()
    phone = str(data.get('phone', '') or '').strip()
    hospital_name = str(data.get('hospital_name', '') or '').strip()
    raw_age = data.get('age')
    specialty = str(data.get('specialty', '') or '').strip()
    gender = str(data.get('gender', '') or '').strip()
    raw_experience = data.get('experience_years')
    avatar = data.get('avatar')
    availability_schedule = data.get('availability_schedule')

    if availability_schedule is not None and not any(
        key in data
        for key in ['fullname', 'phone', 'hospital_name', 'hospital', 'age', 'specialty', 'gender', 'experience_years', 'avatar']
    ):
        cur = None
        try:
            cur = mysql.connection.cursor()
            cur.execute(
                "UPDATE doctors SET availability_schedule = %s WHERE user_id = %s",
                (str(availability_schedule), user.get('user_id'))
            )
            mysql.connection.commit()
            return jsonify({
                "success": True,
                "message": "Doctor schedule updated successfully.",
                "doctor": {"availability_schedule": str(availability_schedule)}
            })
        except Exception as e:
            log_info(f"Ã¢ÂÅ’ DOCTOR SCHEDULE UPDATE ERROR: {e}")
            logger.exception("Unhandled backend error")
            return jsonify({"error": "Unable to update doctor schedule."}), 500
        finally:
            if cur is not None:
                try:
                    cur.close()
                except Exception:
                    pass

    # Basic validations
    if not fullname:
        return jsonify({"error": "Full name is required."}), 400
    if not phone:
        return jsonify({"error": "Phone number is required."}), 400
    if not hospital_name:
        return jsonify({"error": "Hospital name is required."}), 400

    age = None
    if raw_age is not None and raw_age != '':
        try:
            age = int(raw_age)
        except Exception:
            return jsonify({"error": "Age must be a number."}), 400
        if age < 25 or age > 80:
            return jsonify({"error": "Age must be between 25 and 80."}), 400

    experience_years = None
    if raw_experience is not None and raw_experience != '':
        try:
            experience_years = int(raw_experience)
        except Exception:
            return jsonify({"error": "Experience years must be a number."}), 400
        if experience_years < 0:
            return jsonify({"error": "Experience years cannot be negative."}), 400

    # Handle avatar if it's a data URL (base64) or path
    avatar_path = None
    try:
        if isinstance(avatar, str) and avatar.startswith('data:'):
            avatar_path = save_avatar_data_url(app, avatar, user.get('user_id'))
        elif isinstance(avatar, str) and avatar:
            # Assume already a path like /uploads/...
            avatar_path = avatar
    except Exception as e:
        log_info('Avatar save error:', e)
        return jsonify({"error": "Invalid avatar data."}), 400

    cur = None
    try:
        cur = mysql.connection.cursor()

        # Update users table (fullname, phone, avatar)
        u_params = [fullname, phone]
        u_query = "UPDATE users SET fullname = %s, phone = %s"
        if avatar_path:
            u_query += ", avatar = %s"
            u_params.append(avatar_path)
        u_query += " WHERE id = %s"
        u_params.append(user.get('user_id'))

        cur.execute(u_query, tuple(u_params))
        mysql.connection.commit()

        # Update doctors table
        # Use specialization column for specialty if present
        cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user.get('user_id'),))
        exists = cur.fetchone()
        if exists:
            d_query = "UPDATE doctors SET name = %s, hospital_name = %s, phone = %s, gender = %s,"
            d_params = [fullname, hospital_name, phone, gender]
            d_query += " age = %s, specialization = %s, experience_years = %s"
            d_params.extend([age if age is not None else None, specialty if specialty else None, experience_years if experience_years is not None else None])
            if availability_schedule is not None:
                d_query += ", availability_schedule = %s"
                d_params.append(str(availability_schedule))
            if avatar_path:
                d_query += ", photo = %s, avatar = %s"
                d_params.append(avatar_path)
                d_params.append(avatar_path)
            d_query += " WHERE user_id = %s"
            d_params.append(user.get('user_id'))
            cur.execute(d_query, tuple(d_params))
            mysql.connection.commit()
        else:
            # Insert minimal doctor record
            cur.execute(
                "INSERT INTO doctors (user_id, name, hospital_name, phone, gender, age, specialization, experience_years, photo, avatar) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    user.get('user_id'),
                    fullname,
                    hospital_name if hospital_name else None,
                    phone if phone else None,
                    gender if gender else None,
                    age if age is not None else None,
                    specialty if specialty else None,
                    experience_years if experience_years is not None else None,
                    avatar_path if avatar_path else None,
                    avatar_path if avatar_path else None,
                )
            )
            mysql.connection.commit()

        # Return updated doctor profile
        cur.execute(
            """
            SELECT d.username,
                   COALESCE(u.fullname, d.name, '') AS fullname,
                   COALESCE(d.phone, u.phone, '') AS phone,
                   COALESCE(d.specialization, d.specialty, '') AS specialty,
                   COALESCE(d.experience_years, d.experience, CAST(d.experience_years AS CHAR), '') AS experience_years,
                   d.hospital_name,
                   d.age,
                   d.gender,
                   COALESCE(d.photo, d.avatar, u.avatar, '') AS avatar,
                   d.id,
                   u.email,
                   d.availability_schedule
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.user_id = %s
            """,
            (user.get('user_id'),)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": True, "message": "Profile updated."})

        (
            username,
            fullname,
            phone,
            specialty,
            experience_years,
            hospital_name,
            age,
            gender,
            avatar,
            doctor_id,
            email,
            availability_schedule,
        ) = row

        doctor_profile = {
            'username': username or '',
            'fullname': fullname or '',
            'phone': phone or '',
            'specialty': specialty or '',
            'experience_years': experience_years or '',
            'hospital_name': hospital_name or '',
            'hospital': hospital_name or '',
            'age': age or '',
            'gender': gender or '',
            'avatar': avatar or '',
            'doctor_id': doctor_id,
            'email': email or '',
            'availability_schedule': availability_schedule or '',
        }

        return jsonify({"success": True, "message": "Doctor profile updated successfully.", "doctor": doctor_profile})

    except Exception as e:
        log_info(f"âŒ DOCTOR PROFILE UPDATE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update doctor profile."}), 500
    finally:
        if cur is not None:
            try:
                cur.close()
            except Exception:
                pass




@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    try:
        safe_name = resolve_upload_filename(filename)
    except ValueError:
        return jsonify({"error": "Invalid filename."}), 400
    return send_from_directory(upload_dir(app), safe_name)




@app.route("/api/doctors/<int:doctor_id>/reviews", methods=["GET"])
def get_doctor_reviews(doctor_id):
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_doctor_reviews_table(cur)
        cur.execute(
            """
            SELECT
              COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
              COUNT(*) AS total_reviews,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star
            FROM doctor_reviews
            WHERE doctor_id = %s
            """,
            (doctor_id,)
        )
        stats = cur.fetchone() or (0, 0, 0, 0, 0, 0, 0)
        cur.execute(
            """
            SELECT r.id, r.appointment_id, r.rating, r.feedback, r.created_at,
                   COALESCE(u.fullname, u.username, 'Patient') AS patient_name
            FROM doctor_reviews r
            LEFT JOIN users u ON u.id = r.patient_id
            WHERE r.doctor_id = %s
            ORDER BY r.created_at DESC
            """,
            (doctor_id,)
        )
        reviews = [
            {
                "id": row[0],
                "appointment_id": row[1],
                "rating": int(row[2] or 0),
                "feedback": row[3] or "",
                "created_at": row[4].isoformat() if row[4] else None,
                "patient_name": row[5],
            }
            for row in cur.fetchall()
        ]
        cur.close()
        return jsonify({
            "average_rating": float(stats[0] or 0),
            "total_reviews": int(stats[1] or 0),
            "rating_distribution": {
                "5": int(stats[2] or 0),
                "4": int(stats[3] or 0),
                "3": int(stats[4] or 0),
                "2": int(stats[5] or 0),
                "1": int(stats[6] or 0),
            },
            "reviews": reviews,
        })
    except Exception as e:
        log_info(f"GET DOCTOR REVIEWS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor reviews. Please try again."}), 500




@app.route("/api/doctor/reviews", methods=["GET"])
def get_current_doctor_reviews():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user.get("user_id"),))
        row = cur.fetchone()
        cur.close()
        role = canonical_role(user.get("role"))
        if role != "doctor" and not row:
            return jsonify({"error": "Doctor access required."}), 403
        if not row:
            return jsonify({"error": "Doctor profile not found."}), 404
        return get_doctor_reviews(int(row[0]))
    except Exception as e:
        log_info(f"GET CURRENT DOCTOR REVIEWS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor reviews. Please try again."}), 500




@app.route("/api/admin/doctor-reviews", methods=["GET"])
def get_admin_doctor_reviews():
    user = get_current_user()
    if not user or not is_admin_role(user.get("role")):
        return jsonify({"error": "Admin access required."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_id = request.args.get("doctor_id")
        rating = request.args.get("rating")
        search = request.args.get("search", "").strip()
        cur = mysql.connection.cursor()
        ensure_doctor_reviews_table(cur)

        filters = []
        params = []
        if doctor_id:
            filters.append("r.doctor_id = %s")
            params.append(doctor_id)
        if rating:
            filters.append("r.rating = %s")
            params.append(rating)
        if search:
            filters.append("(r.feedback LIKE %s OR d.name LIKE %s OR u.fullname LIKE %s)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        where_sql = "WHERE " + " AND ".join(filters) if filters else ""

        cur.execute(
            f"""
            SELECT r.id, r.appointment_id, r.doctor_id, d.name AS doctor_name,
                   r.patient_id, COALESCE(u.fullname, u.username, 'Patient') AS patient_name,
                   r.rating, r.feedback, r.created_at
            FROM doctor_reviews r
            LEFT JOIN doctors d ON d.id = r.doctor_id
            LEFT JOIN users u ON u.id = r.patient_id
            {where_sql}
            ORDER BY r.created_at DESC
            """,
            params
        )
        reviews = [
            {
                "id": row[0],
                "appointment_id": row[1],
                "doctor_id": row[2],
                "doctor_name": row[3] or "Doctor",
                "patient_id": row[4],
                "patient_name": row[5],
                "rating": int(row[6] or 0),
                "feedback": row[7] or "",
                "created_at": row[8].isoformat() if row[8] else None,
            }
            for row in cur.fetchall()
        ]
        cur.execute("SELECT COALESCE(ROUND(AVG(rating), 1), 0), COUNT(*) FROM doctor_reviews")
        avg_rating, total_reviews = cur.fetchone() or (0, 0)
        cur.execute(
            """
            SELECT d.name, ROUND(AVG(r.rating), 1) AS avg_rating, COUNT(*) AS total_reviews
            FROM doctor_reviews r
            JOIN doctors d ON d.id = r.doctor_id
            GROUP BY d.id, d.name
            HAVING COUNT(*) > 0
            ORDER BY avg_rating DESC, total_reviews DESC
            LIMIT 1
            """
        )
        highest = cur.fetchone()
        cur.execute(
            """
            SELECT d.name, ROUND(AVG(r.rating), 1) AS avg_rating, COUNT(*) AS total_reviews
            FROM doctor_reviews r
            JOIN doctors d ON d.id = r.doctor_id
            GROUP BY d.id, d.name
            HAVING COUNT(*) > 0
            ORDER BY avg_rating ASC, total_reviews DESC
            LIMIT 1
            """
        )
        lowest = cur.fetchone()
        cur.close()
        return jsonify({
            "reviews": reviews,
            "stats": {
                "total_reviews": int(total_reviews or 0),
                "average_platform_rating": float(avg_rating or 0),
                "highest_rated_doctor": {
                    "name": highest[0],
                    "average_rating": float(highest[1] or 0),
                    "total_reviews": int(highest[2] or 0),
                } if highest else None,
                "lowest_rated_doctor": {
                    "name": lowest[0],
                    "average_rating": float(lowest[1] or 0),
                    "total_reviews": int(lowest[2] or 0),
                } if lowest else None,
            }
        })
    except Exception as e:
        log_info(f"ADMIN DOCTOR REVIEWS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to load doctor reviews. Please try again."}), 500




