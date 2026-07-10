"""Authentication repository handlers."""

from utils.runtime import *  # noqa: F401,F403

LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
LOGIN_RATE_LIMIT_MAX_FAILURES = 5
login_failure_attempts = {}


def auth_db_unavailable_response(action):
    logger.error(
        "Authentication database unavailable during %s. mysql=%r app=%r db=%r host=%r",
        action,
        mysql,
        app,
        app.config.get("MYSQL_DB"),
        app.config.get("MYSQL_HOST"),
    )
    return jsonify({"error": "Authentication service is temporarily unavailable."}), 503


def login_rate_key(username):
    return f"{request.remote_addr or 'local'}:{str(username or '').strip().lower()}"


def login_rate_limited(username):
    key = login_rate_key(username)
    now_ts = utc_now().timestamp()
    attempts = [
        ts for ts in login_failure_attempts.get(key, [])
        if now_ts - ts < LOGIN_RATE_LIMIT_WINDOW_SECONDS
    ]
    login_failure_attempts[key] = attempts
    return len(attempts) >= LOGIN_RATE_LIMIT_MAX_FAILURES


def record_login_failure(username):
    key = login_rate_key(username)
    now_ts = utc_now().timestamp()
    attempts = [
        ts for ts in login_failure_attempts.get(key, [])
        if now_ts - ts < LOGIN_RATE_LIMIT_WINDOW_SECONDS
    ]
    attempts.append(now_ts)
    login_failure_attempts[key] = attempts


def clear_login_failures(username):
    login_failure_attempts.pop(login_rate_key(username), None)


@app.route("/api/register/phone-availability", methods=["POST"])
@app.route("/api/phone/check", methods=["POST"])
def check_registration_phone_availability():
    if not mysql:
        return auth_db_unavailable_response("phone availability check")

    data = request.get_json(force=True) or {}
    try:
        phone = validate_somalia_phone(data.get("phone", ""))
    except ValueError as validation_error:
        return jsonify({"success": False, "message": str(validation_error)}), 400

    try:
        cur = mysql.connection.cursor()
        exists = phone_number_exists(cur, phone, include_pending=True)
        cur.close()
        if exists:
            return jsonify({
                "success": False,
                "error": PHONE_ALREADY_REGISTERED_MESSAGE,
                "message": PHONE_ALREADY_REGISTERED_MESSAGE,
            }), 409
        return jsonify({
            "success": True,
            "message": "Phone number is available.",
            "phone": phone,
        }), 200
    except Exception as e:
        try:
            mysql.connection.rollback()
        except Exception:
            pass
        if is_duplicate_key_error(e):
            return jsonify({"success": False, "error": PHONE_ALREADY_REGISTERED_MESSAGE, "message": PHONE_ALREADY_REGISTERED_MESSAGE}), 409
        log_info(f"PHONE AVAILABILITY ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"success": False, "message": "Unable to validate phone number."}), 500




@app.route("/api/register", methods=["POST"])
@app.route("/register", methods=["POST"])
def register_user():
    if not mysql:
        return auth_db_unavailable_response("registration")

    data = request.get_json(force=True) or {}
    fullname = data.get("fullname", "").strip()
    username = data.get("username", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip().lower()
    gender = data.get("gender", "").strip()
    age = data.get("age")
    date_of_birth = data.get("date_of_birth", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    # Sanitize phone number - remove any non-digit characters except +
    phone = re.sub(r'[^\d+]', '', phone)

    # Sanitize username - remove any special characters except alphanumeric and underscore
    username = re.sub(r'[^\w]', '', username)

    # Sanitize fullname - remove any potentially dangerous characters
    fullname = re.sub(r'[<>"\']', '', fullname)

    # Validation
    if not fullname:
        return jsonify({"error": "Full name is required."}), 400
    if len(fullname) < 3:
        return jsonify({"error": "Full name must be at least 3 characters."}), 400
    if not re.match(r'^[a-zA-Z\s]+$', fullname):
        return jsonify({"error": "Full name can only contain letters and spaces."}), 400
    
    if not username:
        return jsonify({"error": "Username is required."}), 400
    if len(username) < 4 or len(username) > 30:
        return jsonify({"error": "Username must be between 4 and 30 characters."}), 400
    if re.search(r'\s', username):
        return jsonify({"error": "Username cannot contain spaces."}), 400
    
    if not phone:
        return jsonify({"error": "Phone number is required."}), 400
    # Validate Somalia international format: +25261, +25262, +25263, +25265 followed by 7 digits
    if not phone.startswith('+252'):
        return jsonify({"error": "Phone number must start with +252 (Somalia country code)."}), 400
    # Validate Somalia network codes: 61, 62, 63, 65
    phone_prefix = phone[4:6]
    valid_prefixes = ['61', '62', '63', '65', '66', '67', '68', '69', '77', '90']
    if phone_prefix not in valid_prefixes:
        return jsonify({"error": "Phone number has an unsupported Somalia network prefix."}), 400
    # Remove +252 and validate the remaining 9 digits (network code + phone number)
    phone_digits = phone.replace('+252', '')
    if not phone_digits.isdigit() or len(phone_digits) != 9:
        return jsonify({"error": "Phone number must be in format +25261XXXXXXX (9 digits after country code)."}), 400
    phone = normalize_somalia_phone(phone)
    
    if not gender:
        return jsonify({"error": "Gender is required."}), 400
    if gender not in ['Male', 'Female']:
        return jsonify({"error": "Gender must be Male or Female."}), 400
    
    if not age:
        return jsonify({"error": "Age is required."}), 400
    try:
        age_int = int(age)
        if age_int < 13 or age_int > 120:
            return jsonify({"error": "Age must be between 13 and 120."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Age must be a valid number."}), 400
    
    if not date_of_birth:
        return jsonify({"error": "Date of birth is required."}), 400
    try:
        dob = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
        if dob > datetime.now().date():
            return jsonify({"error": "Date of birth cannot be in the future."}), 400
        # Validate age matches DOB
        today = datetime.now().date()
        calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if calculated_age != age_int:
            return jsonify({"error": f"Date of birth does not match age (calculated age: {calculated_age})."}), 400
    except ValueError:
        return jsonify({"error": "Date of birth must be in YYYY-MM-DD format."}), 400
    
    if not password:
        return jsonify({"error": "Password is required."}), 400
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
    
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM pending_registrations WHERE expires_at <= %s", (utc_now_naive(),))
        
        # Check if username already exists
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Username is already taken."}), 400

        cur.execute("SELECT id FROM pending_registrations WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            return jsonify({"success": False, "error": "Username is already pending verification.", "message": "Username is already pending verification."}), 409

        if phone_number_exists(cur, phone, include_pending=True):
            cur.close()
            return jsonify({"success": False, "error": PHONE_ALREADY_REGISTERED_MESSAGE, "message": PHONE_ALREADY_REGISTERED_MESSAGE}), 409

        email = None

        hashed_password = generate_password_hash(password)
        
        # Store the validated registration until OTP verification succeeds.
        pending_expires = utc_now_naive() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        cur.execute(
            """
            INSERT INTO pending_registrations
                (username, fullname, phone, email, gender, age, date_of_birth, password_hash, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (username, fullname, phone, email, gender, age_int, dob, hashed_password, pending_expires)
        )
        pending_id = cur.lastrowid
        delivered, delivery_error, _ = create_and_send_otp(cur, None, phone, 'registration_otp')
        if not delivered:
            cur.execute("DELETE FROM pending_registrations WHERE id = %s", (pending_id,))
            mysql.connection.commit()
            cur.close()
            message = delivery_error or "Unable to send verification code."
            return jsonify({"success": False, "error": message, "message": message}), 503
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "success": True,
            "message": "A verification code has been sent to your phone number.",
            "pending_registration_id": pending_id,
            "username": username,
            "phone": phone,
            "requires_verification": True
        }), 200
    except Exception as e:
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        logger.exception(
            "Registration failed for username=%r using database=%r host=%r: %s",
            username,
            app.config.get("MYSQL_DB"),
            app.config.get("MYSQL_HOST"),
            e,
        )
        return jsonify({"error": "Unable to create account."}), 500




@app.route("/api/login", methods=["POST"])
@app.route("/login", methods=["POST"])
def login_user():
    if not mysql:
        logger.error(
            "Authentication repository has no initialized MySQL connection. mysql=%r app=%r",
            mysql,
            app,
        )
        return jsonify({"error": "Authentication service is temporarily unavailable."}), 503

    data = request.get_json(force=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    requested_platform = (
        data.get("platform")
        or data.get("requested_platform")
        or request.headers.get("X-Client-Platform")
        or ""
    )

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400
    if login_rate_limited(username):
        logger.warning("Login rate limit exceeded for username=%r from %s", username, request.remote_addr)
        return jsonify({"error": "Too many failed login attempts. Please try again later."}), 429

    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT u.id, u.username, u.fullname, u.phone, u.email, u.password, u.role, u.status, u.avatar, d.specialty,
                   COALESCE(u.must_change_password, 0) AS must_change_password
            FROM users u
            LEFT JOIN doctors d ON u.id = d.user_id
            WHERE u.username = %s
        """, (username,))
        row = cur.fetchone()
        cur.close()
        cur = None

        if not row:
            cur = mysql.connection.cursor()
            cur.execute(f"""
                SELECT id, username, password_hash, 'SUPER_ADMIN' AS role, status
                FROM {super_admin_table_name()}
                WHERE username = %s
            """, (username,))
            super_admin_row = cur.fetchone()
            cur.close()
            cur = None

            if not super_admin_row:
                record_login_failure(username)
                return jsonify({"error": "No account found for this username."}), 404

            admin_id, admin_username, admin_password, admin_role, admin_status = super_admin_row
            if not verify_stored_password(admin_password, password):
                record_login_failure(username)
                return jsonify({"error": "Password is incorrect."}), 401
            if canonical_role(admin_role) not in ['super_admin', 'it_admin']:
                return jsonify({"error": "Access denied. IT administrator role required."}), 403
            if str(admin_status).strip().lower() != 'active':
                return jsonify({"error": "Account is not active."}), 403

            platform_denial = forbidden_for_platform('SUPER_ADMIN', requested_platform or 'web')
            if platform_denial:
                return jsonify({"error": platform_denial}), 403
            clear_login_failures(username)

            token = jwt.encode({
                'super_admin_id': admin_id,
                'user_id': admin_id,
                'username': admin_username,
                'role': 'SUPER_ADMIN',
                'exp': utc_now_naive() + timedelta(hours=24)
            }, app.config.get("JWT_SECRET") or JWT_SECRET, algorithm=app.config.get("JWT_ALGORITHM") or JWT_ALGORITHM)

            return jsonify({
                "token": token,
                "role": "super_admin",
                "user": {
                    "id": admin_id,
                    "username": admin_username,
                    "name": admin_username,
                    "role": "super_admin",
                    "status": admin_status,
                    "token": token,
                }
            }), 200

        user_id, user_username, fullname, phone, email, hashed_password, user_role, status, avatar, specialty, must_change_password = row

        if not check_password_hash(hashed_password, password):
            record_login_failure(username)
            return jsonify({"error": "Password is incorrect."}), 401

        status_normalized = str(status).strip().lower()
        if status_normalized != 'active':
            if status_normalized == 'pending':
                return jsonify({"error": "Account is pending verification. Please verify your phone number to activate your account."}), 403
            return jsonify({"error": f"Account is {status}. Please contact support."}), 403

        platform_denial = forbidden_for_platform(user_role, requested_platform)
        if platform_denial:
            return jsonify({"error": platform_denial}), 403
        clear_login_failures(username)

        token = generate_jwt(user_id, user_role)
        try:
            cur = mysql.connection.cursor()
            cur.execute("UPDATE users SET last_login = %s WHERE id = %s", (utc_now_naive(), user_id))
            mysql.connection.commit()
            cur.close()
            cur = None
        except Exception as login_update_error:
            logger.warning("Last-login update failed for user_id=%s: %s", user_id, login_update_error)

        return jsonify({
            "token": token,
            "role": user_role,
            "user": {
                "id": user_id,
                "username": user_username,
                "name": fullname,
                "phone": phone,
                "email": email,
                "role": user_role,
                "status": status,
                "avatar": avatar,
                "specialty": specialty,
                "isSystemDemo": False,
                "must_change_password": bool(must_change_password),
                "token": token,
            }
        }), 200
    except Exception as e:
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        logger.exception(
            "Authentication query failed for username=%r using database=%r host=%r: %s",
            username,
            app.config.get("MYSQL_DB"),
            app.config.get("MYSQL_HOST"),
            e,
        )
        return jsonify({"error": "Unable to authenticate."}), 500



@app.route("/api/logout", methods=["POST"])
@app.route("/logout", methods=["POST"])
def logout_user():
    token = get_auth_token()
    if not token:
        return jsonify({"error": "Authentication required."}), 401

    payload = decode_jwt(token)
    if not payload:
        return jsonify({"error": "Authentication required."}), 401

    revoke_jwt_token(token)
    return jsonify({"message": "Logged out successfully."}), 200



@app.route("/api/auth/force-password-change", methods=["POST"])
def force_password_change():
    if not mysql:
        return auth_db_unavailable_response("forced password change")

    data = request.get_json(force=True) or {}
    token = str(data.get("token") or "").strip()
    current_password = str(data.get("current_password") or "").strip()
    new_password = str(data.get("password") or data.get("new_password") or "").strip()

    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        return jsonify({"error": "Authentication required."}), 401
    if not current_password:
        return jsonify({"error": "Current password is required."}), 400
    if not new_password:
        return jsonify({"error": "New password is required."}), 400

    password_error = validate_password_strength(new_password)
    if password_error:
        return jsonify({"error": password_error}), 400
    if new_password == current_password:
        return jsonify({"error": "Choose a password different from the generated password."}), 400

    payload = decode_jwt(token)
    if not payload or not payload.get("user_id"):
        return jsonify({"error": "Authentication required."}), 401

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT id, username, fullname, phone, email, password, role, status, avatar, COALESCE(must_change_password, 0)
            FROM users
            WHERE id = %s
            """,
            (payload.get("user_id"),)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Account not found."}), 404

        user_id, username, fullname, phone, email, stored_password, role, status, avatar, must_change_password = row
        if canonical_role(role) != "doctor":
            cur.close()
            return jsonify({"error": "Only doctor accounts can use first-login password change."}), 403
        if str(status or "").strip().lower() != "active":
            cur.close()
            return jsonify({"error": "Account is not active."}), 403
        if not must_change_password:
            cur.close()
            return jsonify({"error": "Password change is not required for this account."}), 400
        if not check_password_hash(stored_password, current_password):
            cur.close()
            return jsonify({"error": "Current password is incorrect."}), 400

        hashed_password = generate_password_hash(new_password)
        cur.execute(
            "UPDATE users SET password = %s, must_change_password = 0 WHERE id = %s",
            (hashed_password, user_id)
        )
        mark_doctor_password_changed_by_doctor(cur, user_id, 'Changed')
        invalidate_user_sessions(user_id)
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Password updated successfully.",
            "token": token,
            "role": role,
            "user": {
                "id": user_id,
                "username": username,
                "name": fullname,
                "fullname": fullname,
                "phone": phone,
                "email": email,
                "role": role,
                "status": status,
                "avatar": avatar,
                "must_change_password": False,
                "token": token,
            },
        })
    except Exception as e:
        mysql.connection.rollback()
        log_info(f"FORCE PASSWORD CHANGE ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to update password."}), 500




@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    if not mysql:
        return auth_db_unavailable_response("forgot password")

    data = request.get_json(force=True) or {}
    phone = re.sub(r'[^\d+]', '', data.get('phone', '').strip())
    if not phone:
        return jsonify({"error": "Phone number is required."}), 400
    if not phone.startswith('+252') or len(phone) != 13:
        return jsonify({"error": "Phone number must be in format +25261XXXXXXX."}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, phone, status FROM users WHERE phone = %s AND role = 'user'",
            (phone,)
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            return jsonify({"error": "User not found."}), 404

        user_id, phone, status = row
        if str(status or '').strip().lower() != 'active':
            cur.close()
            return jsonify({"error": "Account is not active. Please verify your phone first."}), 403

        delivered, delivery_error, _ = create_and_send_otp(
            cur,
            user_id,
            phone,
            'password_reset'
        )
        if not delivered:
            mysql.connection.commit()
            cur.close()
            return jsonify({"error": delivery_error or "Unable to send reset code."}), 503
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Password reset OTP sent to your phone number."})
    except Exception as e:
        log_info(f"âŒ FORGOT PASSWORD ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to send password reset OTP."}), 500




@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    if not mysql:
        return auth_db_unavailable_response("password reset")

    data = request.get_json(force=True) or {}
    token = data.get('token', '').strip()
    phone = re.sub(r'[^\d+]', '', data.get('phone', '').strip())
    otp_code = re.sub(r'[^\d]', '', data.get('otp_code', '').strip())
    password = data.get('password', '').strip()

    if not password:
        return jsonify({"error": "New password is required."}), 400
    password_error = validate_password_strength(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    try:
        if phone and otp_code:
            cur = mysql.connection.cursor()
            ensure_sms_tables(cur)
            cur.execute(
                """
                SELECT id, otp_code, expires_at, attempts
                FROM otp_verifications
                WHERE phone_number = %s AND otp_type = 'password_reset' AND verified = 0
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (phone,)
            )
            otp_row = cur.fetchone()
            if not otp_row:
                cur.close()
                return jsonify({"error": "No password reset OTP found. Please request a new code."}), 400

            otp_id, stored_otp, expires_at, attempts = otp_row
            if attempts and attempts >= OTP_MAX_VERIFY_ATTEMPTS:
                cur.close()
                return jsonify({"error": "Maximum OTP attempts reached. Please request a new code."}), 400
            if expires_at and utc_now_naive() > expires_at.replace(tzinfo=None):
                cur.close()
                return jsonify({"error": "OTP has expired. Please request a new one."}), 400
            if otp_code != stored_otp:
                cur.execute(
                    "UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = %s",
                    (otp_id,)
                )
                cur.execute(
                    "UPDATE users SET verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE phone = %s",
                    (phone,)
                )
                mysql.connection.commit()
                cur.close()
                return jsonify({"error": "Invalid OTP code."}), 400

            hashed_password = generate_password_hash(password)
            cur.execute(
                """
                UPDATE users
                SET password = %s,
                    otp_code = NULL,
                    otp_type = NULL,
                    otp_expires = NULL,
                    verification_attempts = 0,
                    password_reset_token = NULL,
                    password_reset_expires = NULL
                WHERE phone = %s AND role = 'user'
                """,
                (hashed_password, phone)
            )
            if cur.rowcount == 0:
                cur.close()
                return jsonify({"error": "User not found."}), 404
            cur.execute("SELECT id FROM users WHERE phone = %s AND role = 'user'", (phone,))
            user_row = cur.fetchone()
            if user_row:
                invalidate_user_sessions(user_row[0])
            cur.execute(
                "UPDATE otp_verifications SET verified = 1, verified_at = %s WHERE id = %s",
                (utc_now_naive(), otp_id)
            )
            mysql.connection.commit()
            cur.close()
            return jsonify({"message": "Password updated successfully."})

        if not token:
            return jsonify({"error": "Phone number and OTP are required."}), 400

        payload = decode_jwt(token)
        if not payload or 'user_id' not in payload:
            return jsonify({"error": "Invalid or expired reset token."}), 400

        user_id = payload['user_id']
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT password_reset_token FROM users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        if not row or row[0] != token:
            cur.close()
            return jsonify({"error": "Reset token mismatch."}), 400

        hashed_password = generate_password_hash(password)
        cur.execute(
            "UPDATE users SET password = %s, password_reset_token = NULL, password_reset_expires = NULL WHERE id = %s",
            (hashed_password, user_id)
        )
        invalidate_user_sessions(user_id)
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Password updated successfully."})
    except Exception as e:
        log_info(f"âŒ RESET PASSWORD ERROR: {e}")
        return jsonify({"error": "Unable to reset password."}), 500


# ML prediction module: cleans patient input, runs the trained model, stores
# prediction/recommendation records, then emits database notifications.


@app.route("/api/otp/send", methods=["POST"])
def send_otp():
    if not mysql:
        return auth_db_unavailable_response("send OTP")

    data = request.get_json(force=True) or {}
    phone = data.get("phone", "").strip()

    if not phone:
        return jsonify({"error": "Phone number is required."}), 400

    # Sanitize phone number - remove any non-digit characters except +
    phone = re.sub(r'[^\d+]', '', phone)

    # Validate phone format
    if not phone.startswith('+252'):
        return jsonify({"error": "Phone number must start with +252 (Somalia country code)."}), 400
    phone_prefix = phone[4:6]
    valid_prefixes = ['61', '62', '63', '65', '66', '67', '68', '69', '77', '90']
    if phone_prefix not in valid_prefixes:
        return jsonify({"error": "Phone number has an unsupported Somalia network prefix."}), 400

    # Validate Somalia format accepted by registration: +252 plus 9 local digits.
    if len(phone) != 13:
        return jsonify({"error": "Invalid phone number length."}), 400

    try:
        cur = mysql.connection.cursor()

        otp_type = data.get("otp_type", "registration_otp").strip() or "registration_otp"
        if otp_type not in ["registration_otp", "password_reset"]:
            cur.close()
            return jsonify({"error": "Invalid OTP type."}), 400

        user_id = None
        if otp_type == "registration_otp":
            if phone_number_exists(cur, phone, include_pending=False):
                cur.close()
                return jsonify({"success": False, "error": PHONE_ALREADY_REGISTERED_MESSAGE, "message": PHONE_ALREADY_REGISTERED_MESSAGE}), 409
            cur.execute(
                """
                SELECT id FROM pending_registrations
                WHERE phone = %s AND expires_at > %s
                LIMIT 1
                """,
                (phone, utc_now_naive()),
            )
            pending_registration = cur.fetchone()
            if not pending_registration:
                cur.close()
                return jsonify({"error": "Registration cannot continue. Please complete the registration form again."}), 404
        else:
            cur.execute("SELECT id, phone_verified, verification_attempts FROM users WHERE phone = %s", (phone,))
            user_data = cur.fetchone()
            if not user_data:
                cur.close()
                return jsonify({"error": "Phone number is not registered."}), 404
            user_id, phone_verified, verification_attempts = user_data
            if verification_attempts and verification_attempts >= OTP_MAX_VERIFY_ATTEMPTS:
                cur.close()
                return jsonify({"error": "Maximum verification attempts reached. Please request a new OTP later."}), 400

        delivered, delivery_error, _ = create_and_send_otp(cur, user_id, phone, otp_type)
        if not delivered:
            mysql.connection.commit()
            cur.close()
            return jsonify({"error": delivery_error or "Unable to send OTP."}), 503

        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "OTP sent successfully.",
            "user_id": user_id
        }), 200
    except Exception as e:
        log_info(f"âŒ SEND OTP ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to send OTP."}), 500




@app.route("/api/otp/verify", methods=["POST"])
def verify_otp():
    if not mysql:
        return auth_db_unavailable_response("verify OTP")

    data = request.get_json(force=True) or {}
    phone = data.get("phone", "").strip()
    otp_code = data.get("otp_code", "").strip()
    otp_type = data.get("otp_type", "registration_otp").strip() or "registration_otp"

    if not phone or not otp_code:
        return jsonify({"error": "Phone number and OTP are required."}), 400

    # Sanitize phone number - remove any non-digit characters except +
    phone = re.sub(r'[^\d+]', '', phone)
    try:
        phone = validate_somalia_phone(phone)
    except ValueError as validation_error:
        return jsonify({"error": str(validation_error)}), 400

    # Sanitize OTP code - only digits allowed
    otp_code = re.sub(r'[^\d]', '', otp_code)

    try:
        cur = mysql.connection.cursor()
        ensure_sms_tables(cur)

        user_id = None
        phone_verified = 0
        verification_attempts = 0
        pending_registration = None
        if otp_type == "registration_otp":
            cur.execute(
                """
                SELECT id, username, fullname, phone, email, gender, age, date_of_birth, password_hash, expires_at
                FROM pending_registrations
                WHERE phone = %s
                LIMIT 1
                """,
                (phone,),
            )
            pending_registration = cur.fetchone()
            if not pending_registration:
                cur.close()
                return jsonify({"error": "Registration cannot continue. Please complete the registration form again."}), 404
            if pending_registration[9] and utc_now_naive() > pending_registration[9].replace(tzinfo=None):
                cur.execute("DELETE FROM pending_registrations WHERE id = %s", (pending_registration[0],))
                mysql.connection.commit()
                cur.close()
                return jsonify({"error": "Registration verification expired. Please register again."}), 400
            if phone_number_exists(cur, phone, include_pending=False):
                cur.execute("DELETE FROM pending_registrations WHERE id = %s", (pending_registration[0],))
                mysql.connection.commit()
                cur.close()
                return jsonify({"success": False, "error": PHONE_ALREADY_REGISTERED_MESSAGE, "message": PHONE_ALREADY_REGISTERED_MESSAGE}), 409
        else:
            cur.execute(
                "SELECT id, phone_verified, verification_attempts FROM users WHERE phone = %s",
                (phone,)
            )
            user_data = cur.fetchone()
            if not user_data:
                cur.close()
                return jsonify({"error": "Phone number not found."}), 404
            user_id, phone_verified, verification_attempts = user_data

        if otp_type == "registration_otp" and phone_verified:
            cur.close()
            return jsonify({"error": "Phone number is already verified."}), 400

        cur.execute(
            """
            SELECT id, otp_code, expires_at, attempts
            FROM otp_verifications
            WHERE phone_number = %s AND otp_type = %s AND verified = 0
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (phone, otp_type)
        )
        otp_row = cur.fetchone()
        if not otp_row:
            cur.close()
            return jsonify({"error": "No OTP sent to this phone number."}), 400

        otp_id, stored_otp, otp_expires, otp_attempts = otp_row

        # Check if OTP expired
        if otp_expires and utc_now_naive() > otp_expires.replace(tzinfo=None):
            cur.close()
            return jsonify({"error": "OTP has expired. Please request a new one."}), 400

        # Check if max attempts reached
        if (otp_attempts and otp_attempts >= OTP_MAX_VERIFY_ATTEMPTS) or (
            verification_attempts and verification_attempts >= OTP_MAX_VERIFY_ATTEMPTS
        ):
            cur.close()
            return jsonify({"error": "Maximum verification attempts reached. Please request a new OTP."}), 400

        # Verify OTP
        if otp_code != stored_otp:
            cur.execute(
                "UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = %s",
                (otp_id,)
            )
            if user_id:
                cur.execute(
                    "UPDATE users SET verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE id = %s",
                    (user_id,)
                )
            mysql.connection.commit()
            cur.close()
            return jsonify({"error": "Invalid OTP code."}), 400

        # OTP verified successfully
        if otp_type == "registration_otp":
            pending_id, username, fullname, pending_phone, email, gender, age, date_of_birth, password_hash, _ = pending_registration
            cur.execute(
                """
                INSERT INTO users
                    (username, fullname, phone, email, gender, age, date_of_birth, password, role, status, phone_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'user', 'Active', 1)
                """,
                (username, fullname, pending_phone, email, gender, age, date_of_birth, password_hash)
            )
            user_id = cur.lastrowid
            cur.execute("DELETE FROM pending_registrations WHERE id = %s", (pending_id,))
        else:
            cur.execute(
                "UPDATE users SET otp_code = NULL, otp_type = NULL, otp_expires = NULL, verification_attempts = 0 WHERE id = %s",
                (user_id,)
            )
        cur.execute(
            "UPDATE otp_verifications SET verified = 1, verified_at = %s WHERE id = %s",
            (utc_now_naive(), otp_id)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Phone verified successfully.",
            "user_id": user_id
        }), 200
    except Exception as e:
        try:
            mysql.connection.rollback()
        except Exception:
            pass
        if is_duplicate_key_error(e):
            return jsonify({"success": False, "error": PHONE_ALREADY_REGISTERED_MESSAGE, "message": PHONE_ALREADY_REGISTERED_MESSAGE}), 409
        log_info(f"âŒ VERIFY OTP ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to verify OTP."}), 500




