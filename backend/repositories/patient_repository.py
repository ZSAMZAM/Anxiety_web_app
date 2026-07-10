"""Patient repository handlers."""

from utils.runtime import *  # noqa: F401,F403
from utils.uploads import save_avatar_file

@app.route("/api/profile", methods=["GET", "PUT"])
def profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if request.method == 'GET':
        try:
            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT u.id, u.username, u.fullname, u.email, u.phone, u.avatar, COALESCE(u.gender, d.gender) AS gender,
                       COALESCE(u.age, d.age) AS age, u.date_of_birth, u.address, u.district, u.city, u.role, u.status, u.created_at,
                       COALESCE(u.must_change_password, 0) AS must_change_password,
                       COALESCE(d.specialization, d.specialty) AS specialty, d.hospital_name, COALESCE(d.experience, CAST(d.experience_years AS CHAR)) AS experience,
                       d.clinic_name, d.clinic_address, d.district as doctor_district, d.city as doctor_city, d.license_number, d.bio, d.rating,
                       d.availability_schedule, COALESCE(d.photo, u.avatar) AS doctor_photo
                FROM users u
                LEFT JOIN doctors d ON u.id = d.user_id
                WHERE u.id = %s
            """, (user.get('user_id'),))
            row = cur.fetchone()
            cur.close()

            if not row:
                return jsonify({"error": "User not found."}), 404

            columns = ['id', 'username', 'fullname', 'email', 'phone', 'avatar', 'gender', 'age', 'date_of_birth', 'address', 'district', 'city', 'role', 'status', 'created_at', 'must_change_password', 'specialty', 'hospital_name', 'experience', 'clinic_name', 'clinic_address', 'doctor_district', 'doctor_city', 'license_number', 'bio', 'rating', 'availability_schedule', 'doctor_photo']
            user_data = dict(zip(columns, row))

            return jsonify({
                "user": {
                    "id": user_data.get('id'),
                    "username": user_data.get('username'),
                    "fullname": user_data.get('fullname'),
                    "email": user_data.get('email'),
                    "phone": user_data.get('phone'),
                    "avatar": user_data.get('avatar') or user_data.get('doctor_photo'),
                    "gender": user_data.get('gender'),
                    "age": user_data.get('age'),
                    "date_of_birth": str(user_data.get('date_of_birth')) if user_data.get('date_of_birth') else None,
                    "address": user_data.get('address'),
                    "district": user_data.get('district') or user_data.get('doctor_district'),
                    "city": user_data.get('city') or user_data.get('doctor_city'),
                    "role": user_data.get('role'),
                    "status": user_data.get('status'),
                    "created_at": str(user_data.get('created_at')) if user_data.get('created_at') else None,
                    "must_change_password": bool(user_data.get('must_change_password')),
                    "hospital": user_data.get('hospital_name'),
                    "specialty": user_data.get('specialty'),
                    "experience": user_data.get('experience'),
                    "clinic_name": user_data.get('clinic_name'),
                    "clinic_address": user_data.get('clinic_address'),
                    "license_number": user_data.get('license_number'),
                    "bio": user_data.get('bio'),
                    "rating": user_data.get('rating'),
                    "availability_schedule": user_data.get('availability_schedule'),
                }
            })
        except Exception as e:
            log_info(f"âŒ PROFILE GET ERROR: {e}")
            logger.exception("Unhandled backend error")
            return jsonify({"error": "Unable to load profile. Please try again."}), 500

    data = request.get_json(force=True) or {}

    raw_fullname = data.get('fullname', '')
    fullname = raw_fullname.strip() if isinstance(raw_fullname, str) else ''
    raw_username = data.get('username')
    username = raw_username.strip() if isinstance(raw_username, str) and raw_username.strip() else None
    raw_email = data.get('email')
    email = raw_email.strip().lower() if isinstance(raw_email, str) and raw_email.strip() else None
    raw_phone = data.get('phone')
    phone = None
    if isinstance(raw_phone, str):
        cleaned_phone = raw_phone.strip()
        phone = re.sub(r'[^\d+]', '', cleaned_phone) if cleaned_phone else None
    elif raw_phone is not None:
        phone = str(raw_phone).strip() or None
    raw_gender = data.get('gender')
    gender = raw_gender.strip() if isinstance(raw_gender, str) and raw_gender.strip() else None
    raw_hospital = data.get('hospital')
    hospital = raw_hospital.strip() if isinstance(raw_hospital, str) and raw_hospital.strip() else None
    raw_age = data.get('age')
    age = raw_age if raw_age is not None else None
    raw_date_of_birth = data.get('date_of_birth')
    date_of_birth = raw_date_of_birth.strip() if isinstance(raw_date_of_birth, str) and raw_date_of_birth.strip() else None
    raw_address = data.get('address')
    address = raw_address.strip() if isinstance(raw_address, str) and raw_address.strip() else None
    raw_district = data.get('district')
    district = raw_district.strip() if isinstance(raw_district, str) and raw_district.strip() else None
    raw_city = data.get('city')
    city = raw_city.strip() if isinstance(raw_city, str) and raw_city.strip() else None
    raw_avatar = data.get('avatar')
    avatar = raw_avatar.strip() if isinstance(raw_avatar, str) and raw_avatar.strip() else None
    password = data.get('password', '')
    current_password = data.get('current_password', '')

    # Sanitize inputs
    if fullname:
        fullname = re.sub(r'[<>"\']', '', fullname)
    if phone:
        phone = re.sub(r'[^\d+]', '', phone)
    if address:
        address = re.sub(r'[<>"\']', '', address)
    if district:
        district = re.sub(r'[<>"\']', '', district)
    if city:
        city = re.sub(r'[<>"\']', '', city)

    # Validate backend fields and return structured errors
    errors = {}
    if 'fullname' in data and not fullname:
        errors['fullname'] = 'Full name is required.'

    if raw_email is not None and raw_email.strip() and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', raw_email):
        errors['email'] = 'Please enter a valid email address.'

    if gender and gender not in ['Male', 'Female', 'Other', 'Prefer not to say']:
        errors['gender'] = 'Please select a valid gender.'

    if date_of_birth:
        try:
            datetime.strptime(date_of_birth, '%Y-%m-%d')
        except Exception:
            errors['date_of_birth'] = 'Date of birth must be a valid date in YYYY-MM-DD format.'

    if errors:
        return jsonify({
            'success': False,
            'error': 'Please correct the highlighted fields.',
            'errors': errors
        }), 400

    # Doctor-specific fields
    specialty = data.get('specialty', '').strip()
    hospital = data.get('hospital', '').strip()
    raw_experience = data.get('experience', '')
    experience = raw_experience.strip() if isinstance(raw_experience, str) else str(raw_experience) if raw_experience is not None else ''
    clinic_name = data.get('clinic_name', '').strip()
    clinic_address = data.get('clinic_address', '').strip()
    experience_years = data.get('experience_years')
    license_number = data.get('license_number', '').strip()
    bio = data.get('bio', '').strip()
    rating = data.get('rating')
    availability_schedule = data.get('availability_schedule', '').strip()

    # Sanitize doctor-specific fields
    if specialty:
        specialty = re.sub(r'[<>"\']', '', specialty)
    if hospital:
        hospital = re.sub(r'[<>"\']', '', hospital)
    if experience:
        experience = re.sub(r'[<>"\']', '', experience)
    if clinic_name:
        clinic_name = re.sub(r'[<>"\']', '', clinic_name)
    if clinic_address:
        clinic_address = re.sub(r'[<>"\']', '', clinic_address)
    if bio:
        bio = re.sub(r'[<>"\']', '', bio)

    cur = None
    try:
        cur = mysql.connection.cursor()

        update_fields = []
        update_params = []

        if fullname is not None:
            update_fields.append('fullname = %s')
            update_params.append(fullname)
        if username is not None:
            update_fields.append('username = %s')
            update_params.append(username)
        if 'email' in data:
            update_fields.append('email = %s')
            update_params.append(email)
        if 'phone' in data:
            update_fields.append('phone = %s')
            update_params.append(phone)
        if 'gender' in data:
            update_fields.append('gender = %s')
            update_params.append(gender)
        if 'age' in data:
            update_fields.append('age = %s')
            update_params.append(age)
        if 'date_of_birth' in data:
            update_fields.append('date_of_birth = %s')
            update_params.append(date_of_birth)
        if 'address' in data:
            update_fields.append('address = %s')
            update_params.append(address)
        if 'district' in data:
            update_fields.append('district = %s')
            update_params.append(district)
        if 'city' in data:
            update_fields.append('city = %s')
            update_params.append(city)
        if 'avatar' in data:
            update_fields.append('avatar = %s')
            update_params.append(avatar)
        if password:
            password_error = validate_password_strength(password)
            if password_error:
                return jsonify({"success": False, "error": password_error}), 400
            if not current_password:
                return jsonify({"success": False, "error": "Current password is required to change password."}), 400
            cur.execute("SELECT password FROM users WHERE id = %s", (user.get('user_id'),))
            password_row = cur.fetchone()
            if not password_row or not check_password_hash(password_row[0], current_password):
                return jsonify({"success": False, "error": "Current password is incorrect."}), 400
            hashed_password = generate_password_hash(password)
            update_fields.append('password = %s')
            update_params.append(hashed_password)
            update_fields.append('must_change_password = 0')
            password_was_changed = True
        else:
            password_was_changed = False

        if not update_fields:
            return jsonify({"success": False, "error": "No profile fields provided to update."}), 400

        update_users_query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        update_params.append(user.get('user_id'))

        cur.execute(update_users_query, tuple(update_params))
        if password_was_changed and canonical_role(user.get('role')) == 'doctor':
            mark_doctor_password_changed_by_doctor(cur, user.get('user_id'), 'Changed')
        mysql.connection.commit()

        # Update or create doctors record for doctor users
        if user.get('role') == 'doctor':
            cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user.get('user_id'),))
            doctor_exists = cur.fetchone()

            if doctor_exists:
                # Update existing doctor record
                update_doctors_query = "UPDATE doctors SET"
                update_doctors_params = []
                first_field = True

                if specialty is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " specialization = %s"
                    update_doctors_params.append(specialty)
                    first_field = False
                if hospital is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " hospital_name = %s"
                    update_doctors_params.append(hospital)
                    first_field = False
                if experience is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " experience = %s"
                    update_doctors_params.append(experience)
                    first_field = False
                if age is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " age = %s"
                    update_doctors_params.append(age)
                    first_field = False
                if gender is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " gender = %s"
                    update_doctors_params.append(gender)
                    first_field = False
                if clinic_name:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " clinic_name = %s"
                    update_doctors_params.append(clinic_name)
                    first_field = False
                if clinic_address:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " clinic_address = %s"
                    update_doctors_params.append(clinic_address)
                    first_field = False
                if district:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " district = %s"
                    update_doctors_params.append(district)
                    first_field = False
                if city:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " city = %s"
                    update_doctors_params.append(city)
                    first_field = False
                if license_number:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " license_number = %s"
                    update_doctors_params.append(license_number)
                    first_field = False
                if bio:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " bio = %s"
                    update_doctors_params.append(bio)
                    first_field = False
                if availability_schedule:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " availability_schedule = %s"
                    update_doctors_params.append(availability_schedule)
                    first_field = False
                if phone is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " phone = %s"
                    update_doctors_params.append(phone)
                    first_field = False
                if avatar:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " photo = %s, avatar = %s"
                    update_doctors_params.append(avatar)
                    update_doctors_params.append(avatar)
                    first_field = False

                if update_doctors_params:
                    update_doctors_query += " WHERE user_id = %s"
                    update_doctors_params.append(user.get('user_id'))
                    cur.execute(update_doctors_query, tuple(update_doctors_params))
                    mysql.connection.commit()
            else:
                # Create new doctor record
                cur.execute("""
                    INSERT INTO doctors (user_id, name, specialization, hospital_name, experience, age, gender, clinic_name, clinic_address, district, city, experience_years, license_number, bio, availability_schedule)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user.get('user_id'),
                    fullname,
                    specialty if specialty else None,
                    hospital if hospital else None,
                    experience if experience else None,
                    age if age is not None else None,
                    gender if gender else None,
                    clinic_name if clinic_name else None,
                    clinic_address if clinic_address else None,
                    district if district else None,
                    city if city else None,
                    experience_years if experience_years is not None else None,
                    license_number if license_number else None,
                    bio if bio else None,
                    availability_schedule if availability_schedule else None
                ))
                mysql.connection.commit()

        cur.execute("SELECT username, fullname, email, phone, avatar, gender, age, date_of_birth, address, district, city, role, status, created_at, must_change_password FROM users WHERE id = %s", (user.get('user_id'),))
        updated_row = cur.fetchone()

        if updated_row:
            updated_columns = ['username', 'fullname', 'email', 'phone', 'avatar', 'gender', 'age', 'date_of_birth', 'address', 'district', 'city', 'role', 'status', 'created_at', 'must_change_password']
            updated_user = dict(zip(updated_columns, updated_row))
            updated_user['must_change_password'] = bool(updated_user.get('must_change_password'))
            response_payload = {
                "success": True,
                "message": "Profile updated successfully.",
                "user": updated_user
            }
            return jsonify(response_payload)

        return jsonify({"success": True, "message": "Profile updated successfully."})
    except Exception as e:
        error_message = str(e) or 'Unknown error while updating profile.'
        log_info(f"âŒ PROFILE UPDATE ERROR: {error_message}")
        logger.exception("Unhandled backend error")
        return jsonify({
            "success": False,
            "message": error_message,
            "error": error_message
        }), 500
    finally:
        if cur is not None:
            try:
                cur.close()
            except Exception as close_error:
                log_info('Error closing cursor:', close_error)




@app.route("/api/profile/avatar", methods=["POST"])
def upload_avatar():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if 'avatar' not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400

    # Update database with avatar path
    try:
        avatar_path = save_avatar_file(app, file, user.get('user_id'))
        cur = mysql.connection.cursor()
        
        # Always update users table
        cur.execute(
            "UPDATE users SET avatar = %s WHERE id = %s",
            (avatar_path, user.get('user_id'))
        )
        mysql.connection.commit()
        
        # If user is a doctor, also update doctors.photo
        if user.get('role') == 'doctor':
            cur.execute(
                "UPDATE doctors SET photo = %s, avatar = %s WHERE user_id = %s",
                (avatar_path, avatar_path, user.get('user_id'))
            )
            mysql.connection.commit()
        
        cur.close()

        return jsonify({
            "message": "Avatar uploaded successfully.",
            "avatar": avatar_path
        })
    except Exception as e:
        log_info(f"âŒ AVATAR UPLOAD ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to save avatar."}), 500




@app.route("/api/user/stats", methods=["GET"])
def get_user_stats():
    """Get user-specific statistics: predictions, appointments, payments, and available doctors."""
    if not mysql:
        return jsonify({
            "stats": {
                "totalPredictions": 0,
                "doctorsAvailable": 0,
                "myAppointments": 0,
                "paymentsMade": 0,
            },
            "error": "Database connection failed"
        }), 500

    try:
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized - No valid JWT token"}), 401
        if canonical_role(user.get('role')) != 'user':
            return jsonify({"error": "Patient dashboard statistics are available to patient accounts only."}), 403

        # Try both 'user_id' and 'id' keys
        user_id = user.get("user_id") or user.get("id")
        if not user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        cur = mysql.connection.cursor()

        # Get total predictions for the logged-in user
        cur.execute("SELECT COUNT(*) FROM predictions WHERE user_id = %s", (user_id,))
        total_predictions = cur.fetchone()[0]

        # Get total active doctors available
        cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'Active'")
        doctors_available = cur.fetchone()[0]

        # Get total appointments for the logged-in user
        cur.execute("SELECT COUNT(*) FROM appointments WHERE user_id = %s", (user_id,))
        my_appointments = cur.fetchone()[0]

        # Get total successful payments for the logged-in user
        cur.execute(
            "SELECT COUNT(*) FROM payments WHERE user_id = %s AND payment_status = 'Completed'",
            (user_id,)
        )
        payments_made = cur.fetchone()[0]

        # Bonus: get total amount paid
        cur.execute(
            "SELECT SUM(COALESCE(net_amount, amount - COALESCE(refunded_amount, 0), amount)) FROM payments WHERE user_id = %s AND payment_status = 'Completed'",
            (user_id,)
        )
        total_amount_paid = cur.fetchone()[0] or 0.0

        cur.close()

        return jsonify({
            "stats": {
                "totalPredictions": total_predictions,
                "doctorsAvailable": doctors_available,
                "myAppointments": my_appointments,
                "paymentsMade": payments_made,
                "totalAmountPaid": float(total_amount_paid),
            }
        })

    except Exception as e:
        log_info(f"âŒ USER STATS ERROR: {e}")
        return jsonify({"error": str(e)}), 500




@app.route("/api/public/stats", methods=["GET"])
def get_public_stats():
    """Get public statistics for landing page (no authentication required)"""
    if not mysql:
        return jsonify({"stats": {"totalPatients": 0, "totalDoctors": 0, "totalAssessments": 0, "successfulAppointments": 0}}), 500

    try:
        cur = mysql.connection.cursor()

        # Total patients (users with role 'user')
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'user'")
        total_patients = cur.fetchone()[0] or 0

        # Total doctors (active doctors)
        cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'Active'")
        total_doctors = cur.fetchone()[0] or 0

        # Total assessments (predictions)
        cur.execute("SELECT COUNT(*) FROM predictions")
        total_assessments = cur.fetchone()[0] or 0

        # Successful appointments (completed)
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Completed'")
        successful_appointments = cur.fetchone()[0] or 0

        cur.close()

        return jsonify({
            "stats": {
                "totalPatients": total_patients,
                "totalDoctors": total_doctors,
                "totalAssessments": total_assessments,
                "successfulAppointments": successful_appointments
            }
        })
    except Exception as e:
        log_info(f"âŒ PUBLIC STATS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"stats": {"totalPatients": 0, "totalDoctors": 0, "totalAssessments": 0, "successfulAppointments": 0}}), 500




@app.route("/api/public/featured-doctors", methods=["GET"])
def get_featured_doctors():
    """Get featured doctors for landing page (no authentication required)"""
    if not mysql:
        return jsonify({"doctors": []}), 500

    try:
        limit = int(request.args.get('limit', 6))
        cur = mysql.connection.cursor()

        # Query using only columns that exist in the actual database schema
        query = """
            SELECT d.id, d.name, d.specialization, d.rating, d.status, d.photo, d.phone,
                   u.email
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.status = 'Active'
              AND COALESCE(d.sandbox_mode, 0) = 0
            ORDER BY d.rating DESC
            LIMIT %s
        """
        cur.execute(query, (limit,))
        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        doctors = []
        for row in rows:
            record = dict(zip(columns, row))
            doctors.append({
                "id": record.get("id"),
                "name": record.get("name"),
                "specialization": record.get("specialization"),
                "experience": "5+ years",  # Default experience since column may not exist
                "rating": float(record.get("rating", 0)) if record.get("rating") else 0,
                "status": record.get("status"),
                "photo": record.get("photo"),
                "phone": record.get("phone"),
                "email": record.get("email"),
                "availability": "Available" if record.get("status") == "Active" else "Unavailable"
            })

        return jsonify({"doctors": doctors})
    except Exception as e:
        log_info(f"âŒ FEATURED DOCTORS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"doctors": []}), 500




@app.route("/api/public/testimonials", methods=["GET"])
def get_testimonials():
    """Get real patient testimonials for landing page (no authentication required)."""
    if not mysql:
        return jsonify({"testimonials": []}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT COUNT(*)
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'testimonials'
        """, (app.config['MYSQL_DB'],))
        if cur.fetchone()[0] == 0:
            cur.close()
            return jsonify({"testimonials": []})

        cur.execute("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'testimonials'
        """, (app.config['MYSQL_DB'],))
        columns = {row[0] for row in cur.fetchall()}

        text_column = next((column for column in ["feedback", "message", "story", "content", "testimonial"] if column in columns), None)
        if not text_column:
            cur.close()
            return jsonify({"testimonials": []})

        select_parts = ["t.id", f"t.{text_column} AS feedback"]
        select_parts.append("t.rating" if "rating" in columns else "NULL AS rating")
        select_parts.append("t.avatar" if "avatar" in columns else "u.avatar AS avatar")
        select_parts.append("t.name" if "name" in columns else "COALESCE(u.fullname, 'Patient') AS name")
        select_parts.append("t.created_at" if "created_at" in columns else "NULL AS created_at")

        join_clause = "LEFT JOIN users u ON u.id = t.user_id" if "user_id" in columns else "LEFT JOIN users u ON 1=0"
        where_parts = [f"t.{text_column} IS NOT NULL", f"TRIM(t.{text_column}) <> ''"]
        if "status" in columns:
            where_parts.append("LOWER(t.status) IN ('approved', 'active', 'published')")

        cur.execute(f"""
            SELECT {", ".join(select_parts)}
            FROM testimonials t
            {join_clause}
            WHERE {" AND ".join(where_parts)}
            ORDER BY {("t.created_at" if "created_at" in columns else "t.id")} DESC
            LIMIT 6
        """)
        rows = cur.fetchall()
        cur.close()

        testimonials = []
        for row in rows:
            testimonials.append({
                "id": row[0],
                "feedback": row[1],
                "rating": float(row[2]) if row[2] is not None else None,
                "avatar": row[3],
                "name": row[4],
                "created_at": row[5].isoformat() if hasattr(row[5], "isoformat") else row[5],
            })

        return jsonify({"testimonials": testimonials})
    except Exception as e:
        log_info(f"âŒ TESTIMONIALS ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"testimonials": []}), 500




@app.route("/api/public/contact", methods=["POST"])
def submit_contact_form():
    """Handle contact form submission (no authentication required)."""
    if not mysql:
        return jsonify({"error": "Database unavailable."}), 500

    data = request.get_json(force=True) or {}
    name = data.get('name', '').strip()
    phone = normalize_phone(data.get('phone', ''))
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not name or not phone or not message:
        return jsonify({"error": "Name, phone number, and message are required."}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'contacts'
            """,
            (app.config['MYSQL_DB'],),
        )
        if cur.fetchone()[0] == 0:
            cur.close()
            return jsonify({"error": "Contact storage is not configured in the existing database."}), 503

        cur.execute(
            """
            INSERT INTO contacts (name, phone, subject, message, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (name, phone, subject, message, utc_now_naive()),
        )
        contact_id = cur.lastrowid
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Contact request submitted.", "contact_id": contact_id}), 201
    except Exception as e:
        mysql.connection.rollback()
        app.logger.exception("CONTACT FORM ERROR: %s", e)
        return jsonify({"error": "Unable to submit contact form."}), 500




