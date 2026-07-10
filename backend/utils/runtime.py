"""
Somali Mental Health Text Classification API
"""

import os
import logging
import random
import re
import json
import requests
import base64
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

logger = logging.getLogger(__name__)


def log_info(*args, **_kwargs):
    logger.info(" ".join(str(arg) for arg in args))

from flask import Flask, request, jsonify, Blueprint, send_from_directory, Response
from flask_cors import CORS
try:
    from flask_mysqldb import MySQL
except Exception as e:
    MySQL = None
    log_info(f"⚠ Warning: flask_mysqldb import failed: {e}")
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
try:
    import joblib
except Exception as e:
    joblib = None
    log_info(f"⚠ Warning: joblib import failed: {e}")

# Import IT Management Blueprint
try:
    from repositories import super_admin_repository as super_admin
    SUPER_ADMIN_BP_AVAILABLE = True
except Exception as e:
    log_info(f"Warning: IT Management routes import failed: {e}")
    SUPER_ADMIN_BP_AVAILABLE = False

BACKEND_DIR = Path(__file__).resolve().parent.parent

# FLASK APP

def load_local_env():
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and not os.environ.get(key):
            os.environ[key] = value


load_local_env()

app = Flask(__name__)

def _csv_env(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def _env_value(*names, default=None):
    for name in names:
        value = os.getenv(name)
        if value is not None and value != "":
            return value
    return default


def _env_int(*names, default):
    return int(_env_value(*names, default=str(default)))


DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

# CORS CONFIGURATION
app.config['CORS_HEADERS'] = 'Content-Type,Authorization'
app.config['CORS_SUPPORTS_CREDENTIALS'] = True
app.config['ALLOWED_ORIGINS'] = _csv_env("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
CORS(
    app,
    origins=app.config['ALLOWED_ORIGINS'],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# Rate limiting for OTP requests (database-backed in normal flows)
otp_rate_limit = {}  # {phone: [timestamp1, timestamp2, ...]}
OTP_RATE_LIMIT_WINDOW = 3600  # 1 hour
OTP_MAX_REQUESTS = 5  # Max 5 requests per hour
OTP_MAX_VERIFY_ATTEMPTS = 3
OTP_EXPIRY_MINUTES = 5
BOOKING_RESERVATION_TIMEOUT_MINUTES = int(os.getenv("BOOKING_RESERVATION_TIMEOUT_MINUTES", "15"))
@app.before_request
def log_incoming_request():
    return None


# Add response headers for all routes
@app.after_request
def add_response_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = current_allowed_origins()
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    if not response.headers.get('Content-Type'):
        response.headers['Content-Type'] = 'application/json'
    return response


def current_allowed_origins():
    configured = app.config.get("ALLOWED_ORIGINS")
    if configured:
        return configured
    return _csv_env("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)

# MYSQL CONFIG

app.config["MYSQL_HOST"] = _env_value("DB_HOST", "MYSQL_HOST", default="localhost")
app.config["MYSQL_USER"] = _env_value("DB_USER", "MYSQL_USER", default="root")
app.config["MYSQL_PASSWORD"] = _env_value("DB_PASSWORD", "MYSQL_PASSWORD", default="")
app.config["MYSQL_DB"] = _env_value("DB_NAME", "MYSQL_DB", default="anxiety_prediction(web+app))")
app.config["MYSQL_PORT"] = _env_int("DB_PORT", "MYSQL_PORT", default=3306)
app.config["SUPER_ADMIN_MYSQL_DB"] = _env_value("SUPER_ADMIN_DB_NAME", "SUPER_ADMIN_MYSQL_DB", default="super_admins")
app.config["SUPER_ADMIN_TABLE"] = os.getenv("SUPER_ADMIN_TABLE", "super_admins")
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
app.config["JWT_ALGORITHM"] = os.getenv("JWT_ALGORITHM", "HS256")
app.config["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY", "")
app.config["GEMINI_API_URL"] = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta2")
app.config["GEMINI_MODEL_NAME"] = os.getenv("GEMINI_MODEL_NAME", "models/text-bison-001")
app.config["HORMUUD_MERCHANT_API_URL"] = os.getenv("HORMUUD_MERCHANT_API_URL", "")
app.config["HORMUUD_MERCHANT_STATUS_URL"] = os.getenv("HORMUUD_MERCHANT_STATUS_URL", "")
app.config["HORMUUD_MERCHANT_API_KEY"] = os.getenv("HORMUUD_MERCHANT_API_KEY", "")
app.config["HORMUUD_MERCHANT_ID"] = os.getenv("HORMUUD_MERCHANT_ID", "")
app.config["HORMUUD_MERCHANT_UID"] = os.getenv("HORMUUD_MERCHANT_UID", os.getenv("HORMUUD_MERCHANT_ID", ""))
app.config["HORMUUD_API_USER_ID"] = os.getenv("HORMUUD_API_USER_ID", "")
app.config["HORMUUD_CHANNEL_NAME"] = os.getenv("HORMUUD_CHANNEL_NAME", "WEB")
app.config["HORMUUD_SERVICE_NAME"] = os.getenv("HORMUUD_SERVICE_NAME", "API_PURCHASE")
app.config["HORMUUD_PAYMENT_METHOD"] = os.getenv("HORMUUD_PAYMENT_METHOD", "mwallet_account")
app.config["PLATFORM_FEE_PERCENT"] = os.getenv("PLATFORM_FEE_PERCENT", "0")
app.config["TABAARAK_SMS_AUTH_URL"] = os.getenv("TABAARAK_SMS_AUTH_URL", "https://sms.tabaarak.com/Auth/SMSLogin")
app.config["TABAARAK_SMS_SEND_URL"] = os.getenv("TABAARAK_SMS_SEND_URL", "https://sms.tabaarak.com/Sms/sendsms")
app.config["TABAARAK_SMS_BALANCE_URL"] = os.getenv("TABAARAK_SMS_BALANCE_URL", "https://sms.tabaarak.com/sms/GetSmsBalance")
app.config["TABAARAK_SMS_USERNAME"] = os.getenv("TABAARAK_SMS_USERNAME", os.getenv("TABAARAK_USERNAME", ""))
app.config["TABAARAK_SMS_PASSWORD"] = os.getenv("TABAARAK_SMS_PASSWORD", os.getenv("TABAARAK_PASSWORD", ""))
app.config["TABAARAK_SMS_SENDER_ID"] = os.getenv("TABAARAK_SMS_SENDER_ID", os.getenv("TABAARAK_SENDER_ID", "AnxietyCare"))
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
app.config["UPLOAD_DIR"] = os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "uploads"))

# MYSQL INIT

mysql = MySQL() if MySQL is not None else None
tabaarak_sms_token = {"value": None, "expires_at": None}

def quote_mysql_identifier(identifier):
    return f"`{str(identifier).replace('`', '``')}`"


def qualified_table(database, table):
    return f"{quote_mysql_identifier(database)}.{quote_mysql_identifier(table)}"


def super_admin_table_name():
    return qualified_table(app.config["SUPER_ADMIN_MYSQL_DB"], app.config["SUPER_ADMIN_TABLE"])


def verify_stored_password(stored_password, candidate_password):
    if not stored_password:
        return False
    try:
        if check_password_hash(stored_password, candidate_password):
            return True
    except Exception:
        pass
    return str(stored_password) == str(candidate_password)

def normalize_doctor_status(value):
    if not value:
        return None
    status = str(value).strip().upper()
    if status in ['INACTIVE', 'DEACTIVE']:
        return 'Inactive'
    if status == 'ACTIVE':
        return 'Active'
    return None

def normalize_doctor_status_db(value):
    if not value:
        return None
    status = str(value).strip().upper()
    if status == 'INACTIVE' or status == 'DEACTIVE':
        return 'DEACTIVE'
    if status == 'ACTIVE':
        return 'ACTIVE'
    return None


def parse_positive_money(value, field_label="Consultation fee"):
    if value is None or value == "":
        raise ValueError(f"{field_label} is required.")
    try:
        amount = round(float(value), 2)
    except (TypeError, ValueError):
        raise ValueError(f"{field_label} must be numeric.")
    if amount <= 0:
        raise ValueError(f"{field_label} must be greater than zero.")
    return amount


SOMALIA_PHONE_PREFIXES = {'61', '62', '63', '65', '66', '67', '68', '69', '77', '90'}


def normalize_somalia_phone(phone):
    raw_phone = str(phone or '').strip()
    digits = re.sub(r'\D', '', raw_phone)
    if raw_phone.startswith('+252'):
        return f"+252{digits[3:]}"
    if digits.startswith('252'):
        return f"+{digits}"
    if digits.startswith('0'):
        return f"+252{digits[1:]}"
    if len(digits) == 9:
        return f"+252{digits}"
    return re.sub(r'[^\d+]', '', raw_phone)


def validate_somalia_phone(phone, field_label="Phone number"):
    normalized = normalize_somalia_phone(phone)
    if not normalized:
        raise ValueError(f"{field_label} is required.")
    if not re.match(r'^\+252\d{9}$', normalized):
        raise ValueError(f"{field_label} must be in Somalia format +25261XXXXXXX.")
    if normalized[4:6] not in SOMALIA_PHONE_PREFIXES:
        raise ValueError(f"{field_label} has an unsupported Somalia network prefix.")
    return normalized


PHONE_ALREADY_REGISTERED_MESSAGE = "This phone number is already registered."


def phone_lookup_values(phone):
    normalized = normalize_somalia_phone(phone)
    digits = re.sub(r'\D', '', normalized)
    values = {normalized}
    if digits.startswith('252') and len(digits) == 12:
        local = digits[3:]
        values.add(digits)
        values.add(f"0{local}")
        values.add(local)
    return [value for value in values if value]


def _table_exists(cur, schema_name, table_name):
    cur.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        """,
        (schema_name, table_name),
    )
    return cur.fetchone()[0] > 0


def _column_exists(cur, schema_name, table_name, column_name):
    cur.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (schema_name, table_name, column_name),
    )
    return cur.fetchone()[0] > 0


def phone_number_exists(cur, phone, include_pending=True):
    lookup_values = phone_lookup_values(phone)
    if not lookup_values:
        return False
    placeholders = ', '.join(['%s'] * len(lookup_values))
    schema_name = app.config['MYSQL_DB']

    if _table_exists(cur, schema_name, 'users') and _column_exists(cur, schema_name, 'users', 'phone'):
        cur.execute(
            f"""
            SELECT id FROM users
            WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND phone IN ({placeholders})
            LIMIT 1
            """,
            tuple(lookup_values),
        )
        if cur.fetchone():
            return True

    if _table_exists(cur, schema_name, 'doctors') and _column_exists(cur, schema_name, 'doctors', 'phone'):
        cur.execute(
            f"""
            SELECT id FROM doctors
            WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND phone IN ({placeholders})
            LIMIT 1
            """,
            tuple(lookup_values),
        )
        if cur.fetchone():
            return True

    if _table_exists(cur, schema_name, 'admins'):
        cur.execute(
            f"""
            SELECT a.id
            FROM admins a
            JOIN users u ON u.id = a.user_id
            WHERE u.phone IS NOT NULL AND TRIM(u.phone) <> '' AND u.phone IN ({placeholders})
            LIMIT 1
            """,
            tuple(lookup_values),
        )
        if cur.fetchone():
            return True

    super_admin_schema = app.config.get("SUPER_ADMIN_MYSQL_DB") or schema_name
    super_admin_table = app.config.get("SUPER_ADMIN_TABLE") or "super_admins"
    if (
        _table_exists(cur, super_admin_schema, super_admin_table)
        and _column_exists(cur, super_admin_schema, super_admin_table, 'phone')
    ):
        cur.execute(
            f"""
            SELECT id FROM `{super_admin_schema}`.`{super_admin_table}`
            WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND phone IN ({placeholders})
            LIMIT 1
            """,
            tuple(lookup_values),
        )
        if cur.fetchone():
            return True

    if (
        include_pending
        and _table_exists(cur, schema_name, 'pending_registrations')
        and _column_exists(cur, schema_name, 'pending_registrations', 'phone')
    ):
        cur.execute(
            f"""
            SELECT id FROM pending_registrations
            WHERE expires_at > %s AND phone IN ({placeholders})
            LIMIT 1
            """,
            (utc_now_naive(), *lookup_values),
        )
        if cur.fetchone():
            return True

    return False


def add_unique_index_if_missing(cur, table_name, index_name, column_name, nullable=True):
    return None


def is_duplicate_key_error(error):
    args = getattr(error, 'args', ())
    return bool(args and args[0] == 1062)


def validate_person_name(name, field_label="Full name"):
    normalized = re.sub(r'\s+', ' ', str(name or '').strip())
    if not normalized:
        raise ValueError(f"{field_label} is required.")
    if len(normalized) < 3:
        raise ValueError(f"{field_label} must be at least 3 characters.")
    if len(normalized) > 80:
        raise ValueError(f"{field_label} must be 80 characters or less.")
    if not re.match(r"^[A-Za-z][A-Za-z.' -]*$", normalized):
        raise ValueError(f"{field_label} can only contain letters, spaces, apostrophes, periods, and hyphens.")
    return normalized


def validate_username_value(username):
    normalized = str(username or '').strip()
    if not normalized:
        raise ValueError("Username is required.")
    if len(normalized) < 4 or len(normalized) > 30:
        raise ValueError("Username must be between 4 and 30 characters.")
    if not re.match(r'^[A-Za-z0-9_]+$', normalized):
        raise ValueError("Username can only contain letters, numbers, and underscores.")
    return normalized


def ensure_database_tables():
    return None


# LOAD MODEL


BASE_DIR = BACKEND_DIR
MODEL_PATH = BASE_DIR / "models"
model_load_error = None


def load_model():
    global model_load_error
    try:
        model_load_error = None
        if joblib is None:
            model_load_error = "joblib is not installed in the active backend Python environment."
            log_info(f" Models unavailable: {model_load_error}")
            return None, None, None

        model_file = MODEL_PATH / "best_model.pkl"
        vectorizer_file = MODEL_PATH / "tfidf_vectorizer.pkl"
        label_encoder_file = MODEL_PATH / "label_encoder.pkl"

        missing_files = [str(path) for path in [model_file, vectorizer_file] if not path.exists()]
        if missing_files:
            raise FileNotFoundError(f"Missing trained ML artifact(s): {', '.join(missing_files)}")

        model = joblib.load(model_file)
        vectorizer = joblib.load(vectorizer_file)

        # Some SVC pickles created by older/newer sklearn versions may not carry
        # this private runtime attribute. predict_proba can then fail even though
        # the trained model itself is valid.
        if model.__class__.__name__ == "SVC" and not hasattr(model, "_effective_probability"):
            setattr(model, "_effective_probability", bool(getattr(model, "probability", False)))
            log_info(" Models compatibility: added SVC._effective_probability")

        label_encoder = None
        try:
            if label_encoder_file.exists():
                label_encoder = joblib.load(label_encoder_file)
        except Exception:
            pass

        sample_vec = vectorizer.transform(["startup model validation sample"])
        sample_pred = model.predict(sample_vec)[0]
        if callable(getattr(model, "predict_proba", None)):
            _ = model.predict_proba(sample_vec)[0]

        log_info(
            " Models loaded "
            f"(model={model.__class__.__name__}, vectorizer={vectorizer.__class__.__name__}, "
            f"features={getattr(vectorizer, 'max_features', None) or getattr(sample_vec, 'shape', [None, None])[1]}, "
            f"sample_prediction={sample_pred})"
        )

        return model, vectorizer, label_encoder

    except Exception as e:
        model_load_error = str(e)
        log_info(f" Models failed: {model_load_error}")
        logger.exception("Prediction model load failed")
        return None, None, None


model, vectorizer, label_encoder = load_model()


def ensure_prediction_model_loaded():
    global model, vectorizer, label_encoder

    if model is not None and vectorizer is not None:
        return True

    log_info("Models unavailable at request time; retrying trained artifact load.")
    loaded_model, loaded_vectorizer, loaded_label_encoder = load_model()
    if loaded_model is not None and loaded_vectorizer is not None:
        model = loaded_model
        vectorizer = loaded_vectorizer
        label_encoder = loaded_label_encoder
        return True

    return False

JWT_SECRET = app.config['JWT_SECRET']
JWT_ALGORITHM = app.config['JWT_ALGORITHM']
GEMINI_API_KEY = app.config['GEMINI_API_KEY']
GEMINI_API_URL = app.config['GEMINI_API_URL']
GEMINI_MODEL_NAME = app.config['GEMINI_MODEL_NAME']
revoked_jwt_tokens = {}
user_session_invalid_after = {}


def clean_text(text):
    text = re.sub(r"[^\w\s']", ' ', text or '')
    text = re.sub(r"\s+", ' ', text).strip().lower()
    return text


def generate_jwt(user_id, role):
    issued_at = utc_now()
    payload = {
        'user_id': user_id,
        'role': role,
        'jti': secrets.token_urlsafe(24),
        'iat': issued_at,
        'exp': issued_at + timedelta(hours=24)
    }
    secret = app.config.get("JWT_SECRET") or JWT_SECRET
    algorithm = app.config.get("JWT_ALGORITHM") or JWT_ALGORITHM
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_jwt(token):
    try:
        cleanup_revoked_jwt_tokens()
        if token in revoked_jwt_tokens:
            return None
        secret = app.config.get("JWT_SECRET") or JWT_SECRET
        algorithm = app.config.get("JWT_ALGORITHM") or JWT_ALGORITHM
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        user_id = payload.get("user_id")
        issued_at = float(payload.get("iat") or 0)
        invalid_after = user_session_invalid_after.get(int(user_id)) if user_id is not None else None
        if invalid_after and issued_at < invalid_after:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError as e:
        log_info(f"Invalid JWT token: {e}")
        return None


def cleanup_revoked_jwt_tokens():
    now_ts = utc_now().timestamp()
    expired = [token for token, expires_at in revoked_jwt_tokens.items() if expires_at <= now_ts]
    for token in expired:
        revoked_jwt_tokens.pop(token, None)


def revoke_jwt_token(token):
    if not token:
        return False
    try:
        secret = app.config.get("JWT_SECRET") or JWT_SECRET
        algorithm = app.config.get("JWT_ALGORITHM") or JWT_ALGORITHM
        payload = jwt.decode(token, secret, algorithms=[algorithm], options={"verify_exp": False})
        exp = payload.get("exp")
        expires_at = float(exp) if exp else (utc_now() + timedelta(hours=24)).timestamp()
    except Exception:
        expires_at = (utc_now() + timedelta(hours=24)).timestamp()
    revoked_jwt_tokens[token] = expires_at
    cleanup_revoked_jwt_tokens()
    return True


def invalidate_user_sessions(user_id):
    if user_id is None:
        return
    user_session_invalid_after[int(user_id)] = utc_now().timestamp()


def write_audit_log(user, action, description):
    if not mysql:
        logger.warning("Audit log skipped because MySQL is unavailable: action=%s", action)
        return False
    try:
        actor = (
            (user or {}).get("username")
            or (user or {}).get("name")
            or (user or {}).get("fullname")
            or str((user or {}).get("user_id") or (user or {}).get("super_admin_id") or "system")
        )
        role = (user or {}).get("role") or "system"
        ip_address = None
        try:
            ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
        except RuntimeError:
            ip_address = None
        cur = mysql.connection.cursor()
        cur.execute(
            """
            INSERT INTO audit_logs (actor, role, action, description, ip_address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (actor, role, action, description, ip_address, utc_now_naive()),
        )
        mysql.connection.commit()
        cur.close()
        return True
    except Exception as audit_error:
        try:
            mysql.connection.rollback()
        except Exception:
            pass
        logger.warning("Audit log write failed for action=%s: %s", action, audit_error)
        return False


def validate_password_strength(password):
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one number."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return "Password must contain at least one special character."
    return None


def generate_secure_doctor_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if not validate_password_strength(password):
            return password


def serialize_datetime(value):
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)


def status_label_for_password(status):
    labels = {
        'generated': 'Generated (Initial Password)',
        'changed': 'Changed by Doctor',
        'reset': 'Reset by Admin',
        'temporary': 'Temporary Password',
        'expired': 'Expired',
    }
    normalized = str(status or '').strip().lower()
    return labels.get(normalized, status or 'Generated (Initial Password)')


def utc_now():
    return datetime.now(timezone.utc)


def utc_now_naive():
    return utc_now().replace(tzinfo=None)


def get_auth_token():
    auth_header = request.headers.get('Authorization', '')
    match = re.match(r'^Bearer\s+(.*)$', auth_header)
    return match.group(1) if match else None


def format_date(value, fmt='%Y-%m-%d'):
    if value is None:
        return None
    try:
        return value.strftime(fmt)
    except Exception:
        return str(value)


def format_time(value):
    if value is None:
        return None
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours = (total_seconds // 3600) % 24
        minutes = (total_seconds % 3600) // 60
        return f"{hours:02}:{minutes:02}"
    try:
        return value.strftime('%H:%M')
    except Exception:
        return str(value)


# Authentication helper used by every protected API path. It validates JWT
# integrity, expiry, and role claims before downstream route checks run.
def get_current_user():
    token = get_auth_token()
    if not token:
        return None
    payload = decode_jwt(token)
    if not payload:
        return None

    # Normalize payload to always contain 'user_id'
    normalized = dict(payload)
    if 'user_id' not in normalized and 'id' in normalized:
        normalized['user_id'] = normalized.get('id')

    # Also support nested identity payloads (e.g., {'identity': {'id':...}})
    if 'user_id' not in normalized and 'identity' in normalized and isinstance(normalized['identity'], dict):
        nested = normalized['identity']
        if 'user_id' in nested:
            normalized['user_id'] = nested.get('user_id')
        elif 'id' in nested:
            normalized['user_id'] = nested.get('id')

    role = str(normalized.get('role') or '').strip()
    if not mysql:
        return None

    try:
        cur = mysql.connection.cursor()
        if canonical_role(role) in ['super_admin', 'it_admin']:
            super_admin_id = normalized.get('super_admin_id') or normalized.get('user_id')
            if not super_admin_id:
                cur.close()
                return None
            cur.execute(
                f"SELECT id, username, %s AS role, status FROM {super_admin_table_name()} WHERE id = %s",
                ('IT_ADMIN' if canonical_role(role) == 'it_admin' else 'SUPER_ADMIN', super_admin_id)
            )
            row = cur.fetchone()
            cur.close()
            if not row:
                return None
            admin_id, username, db_role, status = row
            if canonical_role(db_role) not in ['super_admin', 'it_admin'] or str(status).strip().lower() != 'active':
                return None
            effective_role = 'admin' if request.path == '/api/admin' or request.path.startswith('/api/admin/') else db_role
            normalized.update({
                'super_admin_id': admin_id,
                'username': username,
                'role': effective_role,
                'original_role': db_role,
                'status': status,
            })
            return normalized

        user_id = normalized.get('user_id')
        if not user_id:
            cur.close()
            return None
        cur.execute(
            "SELECT id, username, fullname, role, status FROM users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return None

        db_user_id, username, fullname, db_role, status = row
        if str(status).strip().lower() != 'active':
            cur.close()
            return None

        normalized.update({
            'user_id': db_user_id,
            'username': username,
            'name': fullname,
            'role': str(db_role).strip(),
            'status': status,
        })

        if normalized.get('role') == 'doctor':
            cur.execute(
                "SELECT id, status FROM doctors WHERE user_id = %s",
                (db_user_id,)
            )
            doctor_row = cur.fetchone()
            cur.close()
            if not doctor_row:
                return None
            doctor_id, doctor_status = doctor_row
            if str(doctor_status).strip().upper() not in ['ACTIVE']:
                return None
            normalized['doctor_id'] = doctor_id
            normalized['doctor_status'] = doctor_status
        else:
            cur.close()

        return normalized
    except Exception as e:
        log_info(f"CURRENT USER VALIDATION ERROR: {e}")
        try:
            cur.close()
        except Exception:
            pass
        return None


def require_current_user():
    user = get_current_user()
    if not user:
        return None, (jsonify({"error": "Authentication required."}), 401)
    return user, None


def require_roles(*roles):
    user = get_current_user()
    if not user:
        return None, (jsonify({"error": "Authentication required."}), 401)
    allowed_roles = {canonical_role(role) for role in roles}
    user_role = canonical_role(user.get('role'))
    if allowed_roles and user_role not in allowed_roles and not ('admin' in allowed_roles and user_role == 'super_admin'):
        return None, (jsonify({"error": "Permission denied."}), 403)
    return user, None


def require_admin_or_super_admin():
    user = get_current_user()
    if not user:
        return None, (jsonify({"error": "Authentication required."}), 401)
    if not is_admin_role(user.get("role")):
        return None, (jsonify({"error": "System administrator access required."}), 403)
    return user, None


def canonical_role(role):
    value = str(role or '').strip().lower()
    if value in ['patient']:
        return 'user'
    if value in ['super_admin', 'super-admin', 'super admin']:
        return 'super_admin'
    if value in ['it_admin', 'it-admin', 'it admin', 'it administrator', 'it_administrator']:
        return 'it_admin'
    return value


def is_admin_role(role):
    return canonical_role(role) in ['admin', 'super_admin', 'it_admin']


def forbidden_for_platform(role, platform):
    role = canonical_role(role)
    platform = str(platform or '').strip().lower().replace('-', '_')

    if not platform:
        return None
    if platform in ['mobile', 'mobile_app', 'patient_mobile']:
        if role != 'user':
            return "This mobile application is for patient accounts only."
        return None
    if platform in ['admin', 'admin_web', 'admin_dashboard']:
        if role == 'user':
            return "Patients can only use the mobile application."
        if role == 'doctor':
            return "Admin access required."
        if role not in ['admin', 'super_admin']:
            return "Admin access required."
        return None
    if platform in ['doctor', 'doctor_web', 'doctor_dashboard']:
        if role == 'user':
            return "Patients are not authorized for doctor portal."
        if role in ['admin', 'super_admin', 'it_admin']:
            return "Administrators are not authorized for doctor portal."
        if role != 'doctor':
            return "Doctor access required."
        return None
    if platform in ['web', 'web_dashboard']:
        if role == 'user':
            return "Patients can only use the mobile application."
        if role not in ['admin', 'super_admin', 'doctor']:
            return "Web dashboard access denied for this role."
    return None


def forbidden_for_path(path, role):
    if path == '/api/admin' or path.startswith('/api/admin/'):
        return forbidden_for_platform(role, 'admin_web')
    if path == '/api/doctor' or path.startswith('/api/doctor/'):
        return forbidden_for_platform(role, 'doctor_web')
    if path == '/api/super-admin' or path.startswith('/api/super-admin/'):
        if canonical_role(role) not in ['super_admin', 'it_admin']:
            return "IT Management Panel access required."
    return None


def role_allowed_for_prefix(path, role):
    return forbidden_for_path(path, role) is None


def create_security_log(username, role, status, description, action='LOGIN_ATTEMPT', requested_platform=None):
    if not mysql:
        return
    try:
        user_agent = request.headers.get('User-Agent', '')
        browser = 'Unknown'
        for name in ['Chrome', 'Firefox', 'Edg', 'Safari', 'Opera']:
            if name in user_agent:
                browser = 'Edge' if name == 'Edg' else name
                break
        device = 'Mobile' if any(token in user_agent.lower() for token in ['mobile', 'android', 'iphone']) else 'Desktop'
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO security_logs
              (action, description, ip_address, username, role, browser, device, platform, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            action,
            description,
            request.remote_addr,
            username,
            role,
            browser,
            device,
            requested_platform or request.headers.get('X-Client-Platform') or 'web',
            status,
            utc_now_naive(),
        ))
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        log_info(f"SECURITY LOG ERROR: {e}")
        try:
            cur.close()
        except Exception:
            pass


@app.before_request
def enforce_protected_api_role_access():
    if request.method == 'OPTIONS':
        return None

    path = request.path
    public_paths = {
        '/api/super-admin/login',
    }
    if path in public_paths:
        return None

    is_protected_prefix = (
        path == '/api/admin' or path.startswith('/api/admin/') or
        path == '/api/doctor' or path.startswith('/api/doctor/') or
        path == '/api/super-admin' or path.startswith('/api/super-admin/')
    )
    if not is_protected_prefix:
        return None

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required or account inactive."}), 401

    role = user.get('role')
    denial_message = forbidden_for_path(path, role)
    if denial_message:
        create_security_log(
            user.get('username') or user.get('name') or 'unknown',
            role,
            'BLOCKED',
            f"{canonical_role(role).upper()} attempted unauthorized path {path}",
            'BLOCKED_ACCESS',
            'web',
        )
        return jsonify({"error": denial_message}), 403

    return None


NOTIFICATION_TYPE_ALIASES = {
    'assessment': 'ASSESSMENT',
    'prediction_alert': 'ASSESSMENT',
    'appointment': 'APPOINTMENT',
    'appointment_created': 'APPOINTMENT',
    'appointment_confirmed': 'APPOINTMENT',
    'payment': 'PAYMENT',
    'payment_confirmation': 'PAYMENT',
    'payment_failed': 'PAYMENT',
    'doctor_approved': 'DOCTOR_APPROVED',
    'system': 'SYSTEM',
    'security': 'SECURITY',
}


def normalize_notification_type(notification_type):
    raw = str(notification_type or 'SYSTEM').strip()
    if not raw:
        return 'SYSTEM'
    upper = raw.upper()
    if upper in ['ASSESSMENT', 'APPOINTMENT', 'PAYMENT', 'DOCTOR_APPROVED', 'SYSTEM', 'SECURITY']:
        return upper
    return NOTIFICATION_TYPE_ALIASES.get(raw.lower(), 'SYSTEM')


def notification_legacy_type(notification_type):
    return normalize_notification_type(notification_type).lower()


def create_notification_record(user_id, role_target, title, message, notification_type='SYSTEM', reference_id=None, recipient=None):
    if not mysql or not user_id:
        return
    try:
        cur = mysql.connection.cursor()
        normalized_type = normalize_notification_type(notification_type)
        legacy_type = notification_legacy_type(normalized_type)
        role_target = str(role_target or 'user').strip().lower()
        cur.execute(
            """
            INSERT INTO notifications
              (user_id, role_target, title, message, type, reference_id, is_read, notification_type, recipient, recipient_type, status)
            VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s, 'Unread')
            """,
            (user_id, role_target, title, message, normalized_type, reference_id, legacy_type, recipient, role_target)
        )
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        log_info(f"Notification create error: {e}")


# Notification service: every cross-role event is stored in the database so
# mobile and web panels read the same source of truth.
def create_user_notification(user_id, title, message, notification_type='general', reference_id=None, role_target='user'):
    create_notification_record(
        user_id=user_id,
        role_target=role_target,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
    )


def fetch_user_recipients_by_roles(cur, roles):
    normalized_roles = [str(role).strip().lower() for role in roles if str(role).strip()]
    if not normalized_roles:
        return []
    placeholders = ','.join(['%s'] * len(normalized_roles))
    cur.execute(
        f"""
        SELECT id, COALESCE(email, phone, username, fullname, CONCAT('user-', id)) AS recipient, LOWER(role)
        FROM users
        WHERE LOWER(role) IN ({placeholders})
          AND COALESCE(sandbox_mode, 0) = 0
        """,
        normalized_roles
    )
    return cur.fetchall()


def create_role_notifications(role_target, title, message, notification_type='SYSTEM', reference_id=None, roles=None):
    if not mysql:
        return 0
    roles = roles or [role_target]
    sent_count = 0
    cur = None
    try:
        cur = mysql.connection.cursor()
        recipients = fetch_user_recipients_by_roles(cur, roles)
        normalized_type = normalize_notification_type(notification_type)
        legacy_type = notification_legacy_type(normalized_type)
        role_target_value = str(role_target or 'all').strip().lower()
        for user_id, recipient, _role in recipients:
            cur.execute(
                """
                INSERT INTO notifications
                  (user_id, role_target, title, message, type, reference_id, is_read, notification_type, recipient, recipient_type, status)
                VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s, 'Unread')
                """,
                (user_id, role_target_value, title, message, normalized_type, reference_id, legacy_type, recipient, role_target_value)
            )
            sent_count += 1
        mysql.connection.commit()
    except Exception as e:
        log_info(f"Role notification create error: {e}")
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
    return sent_count


def format_event_datetime(value):
    if not value:
        return None
    if hasattr(value, 'strftime'):
        return value.strftime('%Y-%m-%d %H:%M')
    return str(value)


def assessment_risk_level(prediction_label, confidence):
    label = str(prediction_label or '').lower()
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = 0.0
    if 'depression' in label:
        return 'High'
    if 'anxiety' in label:
        return 'High' if confidence_value >= 0.85 else 'Moderate'
    return 'Low'


def create_assessment_notifications(patient_user_id, prediction_id, prediction_label, confidence, assessment_created_at=None, appointment_id=None):
    if not mysql or not patient_user_id or not appointment_id:
        return
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT fullname, username FROM users WHERE id = %s", (patient_user_id,))
        patient_row = cur.fetchone()
        patient_name = (patient_row[0] or patient_row[1]) if patient_row else f"Patient {patient_user_id}"
        risk_level = assessment_risk_level(prediction_label, confidence)
        created_at_label = format_event_datetime(assessment_created_at or utc_now_naive())

        cur.execute(
            """
            SELECT d.user_id
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
            WHERE a.id = %s AND a.user_id = %s AND a.prediction_id = %s
              AND LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
              AND LOWER(COALESCE(a.status, '')) IN ('confirmed', 'completed')
            """,
            (appointment_id, patient_user_id, prediction_id),
        )
        doctor_row = cur.fetchone()
        if not doctor_row or not doctor_row[0]:
            cur.close()
            return

        admin_message = (
            f"Patient {patient_name} completed a new anxiety assessment. "
            f"Prediction Result: {prediction_label}. Risk Level: {risk_level}. Date/Time: {created_at_label}."
        )
        cur.close()
        create_role_notifications(
            'admin',
            'New assessment completed',
            admin_message,
            'ASSESSMENT',
            prediction_id,
            roles=['admin', 'super_admin', 'it_admin']
        )

        doctor_message = (
            f"Your patient {patient_name} shared an assessment through a paid consultation. "
            f"Prediction Result: {prediction_label}. Severity Level: {risk_level}. Assessment Date: {created_at_label}."
        )
        create_user_notification(
            doctor_row[0],
            'Patient assessment shared',
            doctor_message,
            'ASSESSMENT',
            reference_id=prediction_id,
            role_target='doctor',
        )
    except Exception as e:
        log_info(f"Assessment notification error: {e}")


def normalize_tabaarak_mobile(phone):
    digits = re.sub(r'\D', '', str(phone or ''))
    if digits.startswith('252'):
        digits = digits[3:]
    if digits.startswith('0'):
        digits = digits[1:]
    return digits


def parse_tabaarak_token(payload):
    if not isinstance(payload, dict):
        return None
    for key in ('token', 'access_token', 'Token', 'AccessToken'):
        if payload.get(key):
            return str(payload[key])
    data = payload.get('data') or payload.get('Data')
    if isinstance(data, dict):
        for key in ('token', 'access_token', 'Token', 'AccessToken'):
            if data.get(key):
                return str(data[key])
    return None


def ensure_sms_tables(cur):
    return None


def log_sms(phone, message, sms_type, status, gateway_response=None, error_reason=None):
    if not mysql:
        return
    try:
        cur = mysql.connection.cursor()
        ensure_sms_tables(cur)
        response_text = gateway_response
        if isinstance(gateway_response, (dict, list)):
            response_text = json.dumps(gateway_response, default=str)
        cur.execute(
            """
            INSERT INTO sms_logs (phone_number, message, sms_type, status, gateway_response, error_reason)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (phone, message, sms_type, status, response_text, error_reason)
        )
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        log_info(f"SMS log error: {e}")


def get_tabaarak_sms_token(force_refresh=False):
    load_local_env()
    for config_key, env_key in (
        ("TABAARAK_SMS_USERNAME", "TABAARAK_SMS_USERNAME"),
        ("TABAARAK_SMS_PASSWORD", "TABAARAK_SMS_PASSWORD"),
        ("TABAARAK_SMS_AUTH_URL", "TABAARAK_SMS_AUTH_URL"),
        ("TABAARAK_SMS_SEND_URL", "TABAARAK_SMS_SEND_URL"),
        ("TABAARAK_SMS_BALANCE_URL", "TABAARAK_SMS_BALANCE_URL"),
    ):
        env_value = os.getenv(env_key)
        if env_value and not app.config.get(config_key):
            app.config[config_key] = env_value

    cached = tabaarak_sms_token.get("value")
    expires_at = tabaarak_sms_token.get("expires_at")
    if cached and not force_refresh and expires_at and utc_now_naive() < expires_at:
        return cached, None

    username = app.config.get("TABAARAK_SMS_USERNAME")
    password = app.config.get("TABAARAK_SMS_PASSWORD")
    if not username or not password:
        return None, "Tabaarak SMS credentials are not configured."

    try:
        response = requests.post(
            app.config["TABAARAK_SMS_AUTH_URL"],
            json={
                "Name": username,
                "Password": password,
                "username": username,
                "password": password,
            },
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=25,
        )
        payload = response.json() if response.content else {}
        token = parse_tabaarak_token(payload)
        if response.ok and token:
            tabaarak_sms_token["value"] = token
            tabaarak_sms_token["expires_at"] = utc_now_naive() + timedelta(minutes=50)
            return token, None
        return None, f"Tabaarak authentication failed: {payload or response.text}"
    except Exception as e:
        log_info(f"Tabaarak SMS auth error: {e}")
        return None, "Unable to authenticate with Tabaarak SMS."


def send_tabaarak_sms(phone, message, sms_type):
    mobile = normalize_tabaarak_mobile(phone)
    if not re.fullmatch(r'\d{9}', mobile):
        error = "Invalid Somalia phone number for SMS delivery."
        log_sms(phone, message, sms_type, "failed", error_reason=error)
        return False, error, None

    token, token_error = get_tabaarak_sms_token()
    if token_error:
        log_sms(phone, message, sms_type, "failed", error_reason=token_error)
        return False, token_error, None

    payload = {"smsMessage": message, "mobile": [mobile]}
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        response = requests.post(
            app.config["TABAARAK_SMS_SEND_URL"],
            json=payload,
            headers=headers,
            timeout=25,
        )
        if response.status_code == 401:
            token, token_error = get_tabaarak_sms_token(force_refresh=True)
            if token_error:
                log_sms(phone, message, sms_type, "failed", error_reason=token_error)
                return False, token_error, None
            headers["Authorization"] = f"Bearer {token}"
            response = requests.post(
                app.config["TABAARAK_SMS_SEND_URL"],
                json=payload,
                headers=headers,
                timeout=25,
            )

        try:
            gateway_payload = response.json()
        except Exception:
            gateway_payload = {"raw": response.text}

        if response.ok:
            log_sms(phone, message, sms_type, "sent", gateway_response=gateway_payload)
            return True, None, "tabaarak"

        error = "Tabaarak SMS gateway rejected the message."
        log_sms(phone, message, sms_type, "failed", gateway_response=gateway_payload, error_reason=error)
        return False, error, None
    except requests.Timeout:
        error = "Tabaarak SMS gateway timed out."
        log_sms(phone, message, sms_type, "failed", error_reason=error)
        return False, error, None
    except Exception as e:
        error = "Unable to send SMS through Tabaarak."
        log_info(f"Tabaarak SMS send error: {e}")
        log_sms(phone, message, sms_type, "failed", error_reason=str(e))
        return False, error, None


def get_tabaarak_sms_balance():
    token, token_error = get_tabaarak_sms_token()
    if token_error:
        return None, token_error
    try:
        response = requests.get(
            app.config["TABAARAK_SMS_BALANCE_URL"],
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=20,
        )
        if response.status_code == 401:
            token, token_error = get_tabaarak_sms_token(force_refresh=True)
            if token_error:
                return None, token_error
            response = requests.get(
                app.config["TABAARAK_SMS_BALANCE_URL"],
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                timeout=20,
            )
        try:
            payload = response.json()
        except Exception:
            payload = {"raw": response.text}
        if response.ok:
            return payload, None
        return None, f"Unable to load SMS balance: {payload}"
    except Exception as e:
        log_info(f"Tabaarak balance error: {e}")
        return None, "Unable to load SMS balance."


def deliver_otp(phone, otp_code, otp_type='registration_otp'):
    message = f"Your AnxietyCare OTP is {otp_code}. It expires in {OTP_EXPIRY_MINUTES} minutes."
    return send_tabaarak_sms(phone, message, otp_type)


def create_and_send_otp(cur, user_id, phone, otp_type='registration_otp'):
    ensure_sms_tables(cur)
    cur.execute(
        """
        SELECT COUNT(*) FROM otp_verifications
        WHERE phone_number = %s
          AND otp_type = %s
          AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        """,
        (phone, otp_type)
    )
    recent_count = cur.fetchone()[0]
    if recent_count >= OTP_MAX_REQUESTS:
        return False, "Too many OTP requests. Please try again later.", None

    cur.execute(
        """
        UPDATE otp_verifications
        SET verified = 0, expires_at = NOW()
        WHERE phone_number = %s AND otp_type = %s AND verified = 0
        """,
        (phone, otp_type)
    )

    otp_code = ''.join(str(random.randint(0, 9)) for _ in range(6))
    otp_expires = utc_now_naive() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    cur.execute(
        """
        UPDATE users
        SET otp_code = %s, otp_type = %s, otp_expires = %s, verification_attempts = 0
        WHERE id = %s
        """,
        (otp_code, otp_type, otp_expires, user_id)
    )
    cur.execute(
        """
        INSERT INTO otp_verifications (user_id, phone_number, otp_code, otp_type, expires_at, verified, attempts)
        VALUES (%s, %s, %s, %s, %s, 0, 0)
        """,
        (user_id, phone, otp_code, otp_type, otp_expires)
    )
    delivered, delivery_error, delivery_mode = deliver_otp(phone, otp_code, otp_type)
    if not delivered:
        return False, delivery_error or "Unable to send OTP.", None
    return True, None, delivery_mode


def is_low_anxiety(prediction_label, confidence):
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = 0.0
    return prediction_label == 'Neutral' or (prediction_label == 'Anxiety' and confidence_value < 0.70)


def find_doctor_user_by_name(doctor_name):
    if not mysql or not doctor_name:
        return None
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE role = 'doctor' AND fullname = %s", (doctor_name,))
        row = cur.fetchone()
        cur.close()
        return row[0] if row else None
    except Exception:
        return None


WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def ensure_yearly_schedule_tables(cur):
    return None


def parse_schedule_date(value):
    if value is None:
        return None
    if hasattr(value, 'strftime') and not isinstance(value, str):
        return value
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d').date()
    except Exception:
        return None


def parse_schedule_time(value):
    if value is None:
        return None
    text = format_time(value)
    try:
        return datetime.strptime(str(text)[:5], '%H:%M').time()
    except Exception:
        return None


def parse_slot_duration(value):
    try:
        duration = int(value)
    except (TypeError, ValueError):
        duration = 30
    if duration not in [10, 15, 20, 30, 45, 60, 90, 120]:
        return None
    return duration


def parse_recurrence_metadata(value):
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def is_valid_month_day(month, day, year=None):
    try:
        month = int(month)
        day = int(day)
        year = int(year or 2028)
        datetime(year, month, day)
        return True
    except Exception:
        return False


def time_ranges_overlap(start_a, end_a, start_b, end_b):
    return start_a < end_b and start_b < end_a


def normalize_recurrence_days(raw_days, fallback_day=None):
    days = []
    if raw_days:
        if isinstance(raw_days, (list, tuple)):
            parts = raw_days
        else:
            parts = re.split(r'[,| ]+', str(raw_days))
        for part in parts:
            key = str(part).strip().lower()
            if key in WEEKDAY_NAMES and key not in days:
                days.append(key)
    fallback = str(fallback_day or '').strip().lower()
    if not days and fallback in WEEKDAY_NAMES:
        days.append(fallback)
    return days


def recurrence_matches_date(date_obj, rule):
    start_date = parse_schedule_date(rule.get('start_date'))
    end_date = parse_schedule_date(rule.get('end_date'))
    if start_date and date_obj < start_date:
        return False
    if end_date and date_obj > end_date:
        return False

    recurrence_type = str(rule.get('recurrence_type') or 'weekly').strip().lower()
    if recurrence_type in ['specific_date', 'once']:
        recurrence_type = 'one_time'
    day_name = WEEKDAY_NAMES[date_obj.weekday()]
    days = normalize_recurrence_days(rule.get('recurrence_days'), rule.get('day_of_week'))
    metadata = parse_recurrence_metadata(rule.get('recurrence_metadata'))

    if recurrence_type == 'one_time':
        return bool(start_date and date_obj == start_date)
    if recurrence_type in ['daily', 'date_range']:
        return True
    if recurrence_type == 'weekdays':
        return date_obj.weekday() < 5
    if recurrence_type == 'weekends':
        return date_obj.weekday() >= 5
    if recurrence_type == 'biweekly':
        if not start_date:
            return False
        weeks_since_start = (date_obj - start_date).days // 7
        return weeks_since_start >= 0 and weeks_since_start % 2 == 0 and day_name in days
    if recurrence_type == 'monthly':
        monthly_day = metadata.get('day_of_month') or (start_date.day if start_date else None)
        try:
            return date_obj.day == int(monthly_day)
        except (TypeError, ValueError):
            return False
    if recurrence_type == 'yearly':
        yearly_month = metadata.get('month') or (start_date.month if start_date else None)
        yearly_day = metadata.get('day') or (start_date.day if start_date else None)
        try:
            return date_obj.month == int(yearly_month) and date_obj.day == int(yearly_day)
        except (TypeError, ValueError):
            return False
    if recurrence_type == 'first_monday':
        return day_name == 'monday' and 1 <= date_obj.day <= 7
    return day_name in days


def availability_rule_duration_hours(rule):
    start_time = parse_schedule_time(rule.get('start_time'))
    end_time = parse_schedule_time(rule.get('end_time'))
    if not start_time or not end_time:
        return 0
    return (
        datetime.combine(datetime.today().date(), end_time)
        - datetime.combine(datetime.today().date(), start_time)
    ).total_seconds() / 3600


def generate_rule_slots_for_date(rule, date_obj):
    start_time = parse_schedule_time(rule.get('start_time'))
    end_time = parse_schedule_time(rule.get('end_time'))
    duration = parse_slot_duration(rule.get('appointment_duration_minutes') or rule.get('duration_minutes')) or 30
    if not start_time or not end_time or end_time <= start_time:
        return []
    cursor = datetime.combine(date_obj, start_time)
    end_dt = datetime.combine(date_obj, end_time)
    slots = []
    while cursor + timedelta(minutes=duration) <= end_dt:
        slot_end = cursor + timedelta(minutes=duration)
        slots.append({
            'start': cursor.strftime('%H:%M'),
            'end': slot_end.strftime('%H:%M'),
            'start_time': cursor.strftime('%H:%M'),
            'end_time': slot_end.strftime('%H:%M'),
            'duration_minutes': duration,
            'doctor_schedule_id': rule.get('id'),
        })
        cursor = slot_end
    return slots


def availability_overlaps_blocked_dates(cur, doctor_id, candidate_rule):
    start_date = parse_schedule_date(candidate_rule.get('start_date'))
    end_date = parse_schedule_date(candidate_rule.get('end_date'))
    if not start_date or not end_date:
        return False, None
    cur.execute(
        """
        SELECT blocked_date
        FROM doctor_unavailable_dates
        WHERE doctor_id = %s AND blocked_date BETWEEN %s AND %s
        ORDER BY blocked_date
        """,
        (doctor_id, start_date, end_date)
    )
    for row in (cur.fetchall() or []):
        blocked_date = parse_schedule_date(row[0])
        if blocked_date and recurrence_matches_date(blocked_date, candidate_rule):
            return True, blocked_date.isoformat()
    return False, None


def booked_appointments_for_rule(cur, doctor_id, rule):
    start_date = parse_schedule_date(rule.get('start_date')) or datetime.today().date()
    end_date = parse_schedule_date(rule.get('end_date')) or (datetime.today().date() + timedelta(days=365))
    start_time = parse_schedule_time(rule.get('start_time'))
    end_time = parse_schedule_time(rule.get('end_time'))
    if not start_time or not end_time:
        return []
    cur.execute(
        """
        SELECT id, appointment_date, appointment_time, status
        FROM appointments
        WHERE doctor_id = %s
          AND appointment_date BETWEEN %s AND %s
          AND appointment_date >= %s
          AND COALESCE(sandbox_mode, 0) = 0
          AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'failed')
        ORDER BY appointment_date, appointment_time
        """,
        (doctor_id, start_date, end_date, datetime.today().date())
    )
    booked = []
    for row in (cur.fetchall() or []):
        appointment_date = parse_schedule_date(row[1])
        appointment_time = parse_schedule_time(row[2])
        if (
            appointment_date
            and appointment_time
            and recurrence_matches_date(appointment_date, rule)
            and start_time <= appointment_time < end_time
        ):
            booked.append({
                "id": row[0],
                "date": appointment_date,
                "time": appointment_time,
                "status": row[3],
            })
    return booked


def booked_appointments_not_covered(cur, doctor_id, old_rule, new_rule):
    uncovered = []
    new_start = parse_schedule_time(new_rule.get('start_time'))
    new_end = parse_schedule_time(new_rule.get('end_time'))
    for appointment in booked_appointments_for_rule(cur, doctor_id, old_rule):
        appointment_date = appointment["date"]
        appointment_time = appointment["time"]
        if not (
            recurrence_matches_date(appointment_date, new_rule)
            and new_start
            and new_end
            and new_start <= appointment_time < new_end
        ):
            uncovered.append(appointment)
    return uncovered


def rule_occurs_today(rule, today=None):
    today = today or datetime.today().date()
    return recurrence_matches_date(today, rule)


def validate_availability_overlap(cur, doctor_id, candidate_rule, exclude_rule_id=None):
    start_date = parse_schedule_date(candidate_rule.get('start_date'))
    end_date = parse_schedule_date(candidate_rule.get('end_date'))
    start_time = parse_schedule_time(candidate_rule.get('start_time'))
    end_time = parse_schedule_time(candidate_rule.get('end_time'))
    if not all([start_date, end_date, start_time, end_time]):
        return False, "Start date, end date, start time, and end time are required."

    existing_rules = fetch_availability_rules(cur, doctor_id, start_date, end_date)
    cursor_date = start_date
    while cursor_date <= end_date:
        if recurrence_matches_date(cursor_date, candidate_rule):
            for existing in existing_rules:
                if exclude_rule_id is not None and str(existing.get('id')) == str(exclude_rule_id):
                    continue
                if not recurrence_matches_date(cursor_date, existing):
                    continue
                existing_start = parse_schedule_time(existing.get('start_time'))
                existing_end = parse_schedule_time(existing.get('end_time'))
                if not existing_start or not existing_end:
                    continue
                if start_time == existing_start and end_time == existing_end:
                    return False, f"Duplicate slot already exists on {cursor_date.isoformat()}."
                if time_ranges_overlap(start_time, end_time, existing_start, existing_end):
                    return False, (
                        f"Time slot overlaps with an existing slot on {cursor_date.isoformat()} "
                        f"({existing_start.strftime('%H:%M')} - {existing_end.strftime('%H:%M')})."
                    )
        cursor_date += timedelta(days=1)
    return True, None


def legacy_schedule_rules(doctor_id, legacy_schedule=None):
    schedule = get_doctor_schedule(doctor_id, legacy_schedule)
    today = datetime.today().date()
    one_year = today + timedelta(days=365)
    rules = []
    for day, value in schedule.items():
        slots = value.get('slots') if isinstance(value, dict) else []
        if not value.get('available') or not isinstance(slots, list):
            continue
        for slot in slots:
            start_value = str(slot.get('start') or slot.get('start_time') or '').strip()[:5]
            end_value = str(slot.get('end') or slot.get('end_time') or '').strip()[:5]
            if start_value and end_value:
                rules.append({
                    'id': f'legacy-{day}-{start_value}',
                    'doctor_id': doctor_id,
                    'day_of_week': day,
                    'start_date': today,
                    'end_date': one_year,
                    'start_time': start_value,
                    'end_time': end_value,
                    'recurrence_type': 'weekly',
                    'recurrence_days': day,
                    'is_available': 1,
                    'legacy': True,
                })
    return rules


def fetch_availability_rules(cur, doctor_id, start_date, end_date, legacy_schedule=None):
    ensure_yearly_schedule_tables(cur)
    cur.execute(
        """
        SELECT id, doctor_id, day_of_week, start_date, end_date, start_time, end_time,
               COALESCE(recurrence_type, 'weekly') AS recurrence_type,
               recurrence_days, is_available, COALESCE(appointment_duration_minutes, 30),
               recurrence_metadata, COALESCE(timezone, 'Africa/Mogadishu')
        FROM doctor_availability
        WHERE doctor_id = %s
          AND COALESCE(is_available, 1) = 1
          AND (start_date IS NULL OR start_date <= %s)
          AND (end_date IS NULL OR end_date >= %s)
        ORDER BY start_date IS NULL, start_date, start_time
        """,
        (doctor_id, end_date, start_date)
    )
    rows = cur.fetchall() or []
    rules = []
    for row in rows:
        rule = {
            'id': row[0],
            'doctor_id': row[1],
            'day_of_week': row[2],
            'start_date': row[3],
            'end_date': row[4],
            'start_time': format_time(row[5])[:5] if row[5] else None,
            'end_time': format_time(row[6])[:5] if row[6] else None,
            'recurrence_type': row[7],
            'recurrence_days': row[8],
            'is_available': row[9],
            'appointment_duration_minutes': row[10],
            'recurrence_metadata': parse_recurrence_metadata(row[11]),
            'timezone': row[12],
        }
        if rule['start_time'] and rule['end_time']:
            rules.append(rule)
    if not rules:
        rules = legacy_schedule_rules(doctor_id, legacy_schedule)
    return rules


def get_doctor_calendar_slots(cur, doctor_id, start_date=None, end_date=None, legacy_schedule=None):
    release_unpaid_pending_slots(cur)
    today = datetime.today().date()
    start_date = parse_schedule_date(start_date) or today
    end_date = parse_schedule_date(end_date) or (start_date + timedelta(days=60))
    max_end = today + timedelta(days=365)
    if start_date < today:
        start_date = today
    if end_date > max_end:
        end_date = max_end
    if end_date < start_date:
        end_date = start_date

    rules = fetch_availability_rules(cur, doctor_id, start_date, end_date, legacy_schedule)
    cur.execute(
        "SELECT id, blocked_date, COALESCE(reason, '') FROM doctor_unavailable_dates WHERE doctor_id = %s AND blocked_date BETWEEN %s AND %s",
        (doctor_id, start_date, end_date)
    )
    blocked = {format_date(row[1]): {"id": row[0], "reason": row[2]} for row in (cur.fetchall() or [])}
    cur.execute(
        """
        SELECT appointment_date, appointment_time, status
        FROM appointments
        WHERE doctor_id = %s
          AND appointment_date BETWEEN %s AND %s
          AND status IN ('Confirmed', 'Completed', 'Accepted')
          AND LOWER(COALESCE(payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
          AND COALESCE(sandbox_mode, 0) = 0
        """,
        (doctor_id, start_date, end_date)
    )
    booked = {
        (format_date(row[0]), format_time(row[1])[:5] if row[1] else '')
        for row in (cur.fetchall() or [])
    }
    cur.execute(
        """
        SELECT appointment_date, start_time, status
        FROM appointment_slots
        WHERE doctor_id = %s
          AND appointment_date BETWEEN %s AND %s
          AND LOWER(COALESCE(status, '')) = 'booked'
        """,
        (doctor_id, start_date, end_date)
    )
    for row in (cur.fetchall() or []):
        booked.add((format_date(row[0]), format_time(row[1])[:5] if row[1] else ''))

    dates = {}
    cursor_date = start_date
    while cursor_date <= end_date:
        date_key = cursor_date.isoformat()
        day_slots = []
        if date_key not in blocked:
            for rule in rules:
                if recurrence_matches_date(cursor_date, rule):
                    for generated_slot in generate_rule_slots_for_date(rule, cursor_date):
                        start_value = generated_slot['start']
                        is_booked = (date_key, start_value) in booked
                        day_slots.append({
                            **generated_slot,
                            'booked': is_booked,
                            'status': 'booked' if is_booked else 'available',
                        })
        if day_slots or date_key in blocked:
            deduped = {}
            for slot in day_slots:
                deduped[(slot['start'], slot['end'])] = slot
            dates[date_key] = {
                'date': date_key,
                'available': any(not slot.get('booked') for slot in deduped.values()),
                'blocked': date_key in blocked,
                'reason': (blocked.get(date_key) or {}).get('reason', ''),
                'slots': sorted(deduped.values(), key=lambda item: item['start']),
            }
        cursor_date += timedelta(days=1)
    return dates, rules, blocked


def is_doctor_slot_available(cur, doctor_id, appointment_date_obj, appointment_time_obj, legacy_schedule=None):
    today = datetime.today().date()
    if appointment_date_obj < today:
        return False, "You cannot select a past date. Please choose today or a future date."
    if appointment_date_obj > today + timedelta(days=365):
        return False, "Appointments can only be scheduled within the next 12 months."
    if appointment_date_obj == today and appointment_time_obj <= datetime.now().time():
        return False, "This appointment time has already passed."

    calendar, _rules, blocked = get_doctor_calendar_slots(
        cur,
        doctor_id,
        appointment_date_obj,
        appointment_date_obj,
        legacy_schedule,
    )
    date_key = appointment_date_obj.isoformat()
    if date_key in blocked:
        return False, "Doctor is unavailable on the selected date."
    day = calendar.get(date_key)
    if not day:
        return False, "Doctor is not available on the selected date."
    requested = appointment_time_obj.strftime('%H:%M')
    for slot in day.get('slots', []):
        start_time = parse_schedule_time(slot.get('start'))
        end_time = parse_schedule_time(slot.get('end'))
        if start_time and end_time and appointment_time_obj == start_time:
            if appointment_date_obj == today and end_time <= datetime.now().time():
                return False, "This appointment time has already passed."
            if slot.get('booked'):
                return False, "This time slot is already booked. Please choose a different time."
            return True, slot
    return False, "Selected time slot is not available. Please check the doctor's calendar."


def mark_paid_appointment_slot_booked(cur, appointment_id):
    if not appointment_id:
        return
    cur.execute(
        """
        INSERT INTO appointment_slots
          (doctor_id, appointment_date, start_time, end_time, duration_minutes, doctor_schedule_id, status, appointment_id)
        SELECT a.doctor_id, a.appointment_date, a.appointment_time,
               COALESCE(a.appointment_end_time, a.slot_end_time, a.appointment_time),
               COALESCE(a.duration_minutes, 30), a.doctor_schedule_id, 'booked', a.id
        FROM appointments a
        WHERE a.id = %s
          AND a.status IN ('Confirmed', 'Completed')
          AND LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
        ON DUPLICATE KEY UPDATE
          status = 'booked', appointment_id = VALUES(appointment_id),
          end_time = VALUES(end_time), duration_minutes = VALUES(duration_minutes),
          doctor_schedule_id = VALUES(doctor_schedule_id), updated_at = CURRENT_TIMESTAMP
        """,
        (appointment_id,)
    )


def release_unpaid_pending_slots(cur):
    timeout_minutes = max(1, int(BOOKING_RESERVATION_TIMEOUT_MINUTES or 15))
    cur.execute(
        """
        UPDATE appointments a
        LEFT JOIN payments p ON p.appointment_id = a.id
          AND LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund')
        SET a.status = 'Expired',
            a.payment_status = 'Expired'
        WHERE a.status IN ('Pending Payment', 'Reserved')
          AND p.id IS NULL
          AND a.created_at < DATE_SUB(NOW(), INTERVAL %s MINUTE)
        """,
        (timeout_minutes,)
    )
    cur.execute(
        """
        UPDATE appointment_slots s
        JOIN appointments a ON a.id = s.appointment_id
        SET s.status = 'released',
            s.appointment_id = NULL,
            s.updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(COALESCE(s.status, '')) IN ('pending_payment', 'booked')
          AND a.status IN ('Expired', 'Cancelled', 'Canceled', 'Rejected', 'Failed')
        """
    )
    cur.execute(
        """
        UPDATE appointment_slots s
        JOIN appointments a ON a.id = s.appointment_id
        LEFT JOIN payments p ON p.appointment_id = a.id
          AND p.payment_status = 'Completed'
        SET s.status = 'released', s.appointment_id = NULL, s.updated_at = CURRENT_TIMESTAMP
        WHERE s.status = 'booked'
          AND a.status IN ('Pending Payment', 'Reserved')
          AND p.id IS NULL
        """
    )


def patient_has_completed_assessment(cur, patient_id):
    cur.execute(
        """
        SELECT id
        FROM predictions
        WHERE user_id = %s
          AND COALESCE(sandbox_mode, 0) = 0
          AND LOWER(COALESCE(completion_status, 'completed')) = 'completed'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (patient_id,)
    )
    return cur.fetchone() is not None


def prediction_requires_professional_support(prediction_result, anxiety_level=None):
    value = f"{prediction_result or ''} {anxiety_level or ''}".strip().lower()
    healthy_terms = ('neutral', 'normal', 'healthy', 'low risk', 'low-risk', 'stable')
    clinical_terms = ('anxiety', 'depression', 'moderate', 'high risk', 'high-risk')
    if any(term in value for term in clinical_terms):
        return True
    if any(term in value for term in healthy_terms):
        return False
    return False


BOOKING_ASSESSMENT_REQUIRED_MESSAGE = "Please complete your mental health assessment before booking a therapist."
BOOKING_HEALTHY_ASSESSMENT_MESSAGE = (
    "Your latest assessment does not indicate that professional therapy is needed at this time. "
    "Continue following the recommended wellness tips and complete another assessment if your condition changes."
)
BOOKING_ASSESSMENT_ALREADY_USED_MESSAGE = (
    "Please complete a new mental health assessment before booking another therapist. "
    "Each booking must be based on a fresh assessment."
)
BOOKING_NOT_ALLOWED_CODE = "BOOKING_NOT_ALLOWED"


def latest_bookable_prediction(cur, patient_id):
    cur.execute(
        """
        SELECT id, prediction_result, anxiety_level, confidence_score, created_at
        FROM predictions
        WHERE user_id = %s AND COALESCE(sandbox_mode, 0) = 0
          AND LOWER(COALESCE(completion_status, 'completed')) = 'completed'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (patient_id,),
    )
    row = cur.fetchone()
    if not row or not prediction_requires_professional_support(row[1], row[2]):
        return None
    return row


def prediction_used_for_booking(cur, patient_id, prediction_id):
    cur.execute(
        """
        SELECT id, status, payment_status
        FROM appointments
        WHERE user_id = %s
          AND prediction_id = %s
          AND COALESCE(sandbox_mode, 0) = 0
          AND LOWER(COALESCE(status, '')) NOT IN ('failed', 'expired')
        ORDER BY id DESC
        LIMIT 1
        """,
        (patient_id, prediction_id),
    )
    return cur.fetchone()


def can_patient_book_therapist(cur, patient_id):
    """Single source of truth for new booking eligibility."""
    cur.execute(
        """
        SELECT id, prediction_result, anxiety_level, confidence_score, created_at
        FROM predictions
        WHERE user_id = %s AND COALESCE(sandbox_mode, 0) = 0
          AND LOWER(COALESCE(completion_status, 'completed')) = 'completed'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (patient_id,),
    )
    row = cur.fetchone()
    if not row:
        return {
            "has_assessment": False,
            "can_book_therapist": False,
            "latest_assessment": None,
            "booking_block_reason": "no_assessment",
            "booking_message": BOOKING_ASSESSMENT_REQUIRED_MESSAGE,
        }
    can_book = prediction_requires_professional_support(row[1], row[2])
    used_booking = prediction_used_for_booking(cur, patient_id, row[0]) if can_book else None
    if used_booking:
        can_book = False
        block_reason = "assessment_already_used"
        booking_message = BOOKING_ASSESSMENT_ALREADY_USED_MESSAGE
    else:
        block_reason = None if can_book else "healthy_assessment"
        booking_message = None if can_book else BOOKING_HEALTHY_ASSESSMENT_MESSAGE
    return {
        "has_assessment": True,
        "can_book_therapist": can_book,
        "latest_assessment": {
            "id": row[0],
            "prediction_result": row[1],
            "anxiety_level": row[2],
            "confidence": round(float(row[3] or 0) * 100),
            "created_at": row[4].isoformat() if row[4] else None,
        },
        "booking_block_reason": block_reason,
        "booking_message": booking_message,
    }


def patient_assessment_booking_state(cur, patient_id):
    return can_patient_book_therapist(cur, patient_id)


def booking_not_allowed_payload(booking_state):
    message = (booking_state or {}).get("booking_message") or "Complete an assessment requiring professional support before booking a therapist."
    return {
        "success": False,
        "code": BOOKING_NOT_ALLOWED_CODE,
        "message": message,
        "error": message,
        "has_assessment": bool((booking_state or {}).get("has_assessment")),
        "can_book_therapist": False,
        "booking_block_reason": (booking_state or {}).get("booking_block_reason"),
        "latest_assessment": (booking_state or {}).get("latest_assessment"),
        "redirect": "/assessment",
    }


def booking_not_allowed_response(booking_state):
    return jsonify(booking_not_allowed_payload(booking_state)), 403


def patient_booking_payment_state(cur, patient_id, appointment_id):
    cur.execute(
        """
        SELECT a.id, a.prediction_id, a.status, a.payment_status,
               p.prediction_result, p.anxiety_level, p.completion_status, p.created_at
        FROM appointments a
        LEFT JOIN predictions p ON p.id = a.prediction_id AND p.user_id = a.user_id
        WHERE a.id = %s
          AND a.user_id = %s
          AND COALESCE(a.sandbox_mode, 0) = 0
        LIMIT 1
        """,
        (appointment_id, patient_id),
    )
    row = cur.fetchone()
    if not row:
        return {
            "has_assessment": False,
            "can_book_therapist": False,
            "latest_assessment": None,
            "booking_block_reason": "appointment_not_found",
            "booking_message": "Booking not found for this user.",
        }
    prediction_id, prediction_result, anxiety_level, completion_status, created_at = row[1], row[4], row[5], row[6], row[7]
    completed = str(completion_status or "completed").strip().lower() == "completed"
    qualifies = completed and prediction_id and prediction_requires_professional_support(prediction_result, anxiety_level)
    return {
        "has_assessment": bool(prediction_id),
        "can_book_therapist": bool(qualifies),
        "latest_assessment": {
            "id": prediction_id,
            "prediction_result": prediction_result,
            "anxiety_level": anxiety_level,
            "created_at": created_at.isoformat() if created_at else None,
        } if prediction_id else None,
        "booking_block_reason": None if qualifies else "appointment_assessment_not_eligible",
        "booking_message": None if qualifies else "This booking is not linked to a completed Anxiety or Depression assessment.",
    }


def share_paid_appointment_assessment(cur, appointment_id, patient_id):
    cur.execute(
        """
        SELECT a.prediction_id, a.doctor_id, p.prediction_result, p.confidence_score, p.created_at
        FROM appointments a
        JOIN predictions p ON p.id = a.prediction_id AND p.user_id = a.user_id
        WHERE a.id = %s AND a.user_id = %s
          AND LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'completed', 'success', 'successful')
          AND LOWER(COALESCE(a.status, '')) IN ('confirmed', 'completed')
        LIMIT 1
        """,
        (appointment_id, patient_id),
    )
    row = cur.fetchone()
    if not row:
        return None
    prediction_id, doctor_id, prediction_result, confidence, created_at = row
    cur.execute(
        """
        UPDATE predictions
        SET sharing_status = 'shared_with_doctor', shared_at = COALESCE(shared_at, NOW()),
            shared_doctor_id = %s, shared_appointment_id = %s
        WHERE id = %s AND user_id = %s
        """,
        (doctor_id, appointment_id, prediction_id, patient_id),
    )
    return {
        'prediction_id': prediction_id,
        'prediction_result': prediction_result,
        'confidence': confidence,
        'created_at': created_at,
    }


def appointment_has_successful_payment(cur, appointment_id):
    cur.execute(
        """
        SELECT id
        FROM payments
        WHERE COALESCE(appointment_id, booking_id) = %s
          AND LOWER(COALESCE(payment_status, '')) IN ('completed', 'paid', 'success', 'successful')
        ORDER BY COALESCE(paid_at, created_at) DESC, id DESC
        LIMIT 1
        """,
        (appointment_id,)
    )
    return cur.fetchone() is not None


def current_doctor_id(cur, user):
    doctor_id = user.get('doctor_id')
    if doctor_id:
        return doctor_id
    cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (user.get('user_id'),))
    row = cur.fetchone()
    return row[0] if row else None


def get_doctor_schedule(doctor_id, legacy_schedule=None):
    schedule = {}
    if mysql and doctor_id:
        try:
            cur = mysql.connection.cursor()
            cur.execute(
                """
                SELECT day_of_week, start_time, end_time, is_available
                FROM doctor_availability
                WHERE doctor_id = %s
                ORDER BY FIELD(LOWER(day_of_week), 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), start_time
                """,
                (doctor_id,)
            )
            rows = cur.fetchall()
            cur.close()
            for day, start_time, end_time, is_available in rows or []:
                key = str(day).strip().lower()
                if not key:
                    continue
                if key not in schedule:
                    schedule[key] = {"available": bool(is_available), "slots": []}
                schedule[key]["available"] = schedule[key]["available"] or bool(is_available)
                if is_available:
                    start_value = format_time(start_time)[:5]
                    end_value = format_time(end_time)[:5]
                    schedule[key]["slots"].append({
                        "start": start_value,
                        "end": end_value,
                        "start_time": start_value,
                        "end_time": end_value,
                    })
        except Exception as e:
            log_info(f"Doctor availability table error: {e}")

    if legacy_schedule:
        try:
            parsed = json.loads(legacy_schedule) if isinstance(legacy_schedule, str) else legacy_schedule
            if isinstance(parsed, dict):
                for day, value in parsed.items():
                    key = str(day).strip().lower()
                    if not key or key in schedule:
                        continue
                    if isinstance(value, dict):
                        raw_slots = value.get("slots") or value.get("time_slots") or []
                        slots = []
                        for slot in raw_slots if isinstance(raw_slots, list) else []:
                            if isinstance(slot, dict):
                                start_value = str(slot.get("start") or slot.get("start_time") or "").strip()[:5]
                                end_value = str(slot.get("end") or slot.get("end_time") or "").strip()[:5]
                            else:
                                parts = str(slot).replace("–", "-").split("-")
                                start_value = parts[0].strip()[:5] if parts else ""
                                end_value = parts[1].strip()[:5] if len(parts) > 1 else ""
                            if start_value and end_value:
                                slots.append({
                                    "start": start_value,
                                    "end": end_value,
                                    "start_time": start_value,
                                    "end_time": end_value,
                                })
                        schedule[key] = {
                            "available": bool(
                                value.get("available") is True
                                or value.get("is_available") is True
                                or str(value.get("available") or value.get("is_available") or "").lower() in ["1", "true", "yes"]
                                or slots
                            ),
                            "slots": slots,
                        }
        except Exception:
            pass

    return schedule


def fetch_gemini_recommendations(prompt_text):
    if not GEMINI_API_KEY:
        return None
    try:
        endpoint = f"{GEMINI_API_URL}/{GEMINI_MODEL_NAME}:generateText"
        headers = {
            'Authorization': f'Bearer {GEMINI_API_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'prompt': {
                'text': prompt_text
            },
            'temperature': 0.7,
            'maxOutputTokens': 250,
        }
        response = requests.post(endpoint, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        result = response.json()
        if isinstance(result, dict):
            if 'candidates' in result and len(result['candidates']) > 0:
                return result['candidates'][0].get('output', '')
            if 'output' in result and isinstance(result['output'], dict):
                return result['output'].get('text', '')
            if 'text' in result:
                return result['text']
        return None
    except Exception as e:
        log_info(f"❌ Gemini request failed: {e}")
        return None


def build_recommendation_prompt(text, prediction_label, confidence):
    return (
        f"You are a compassionate mental health assistant. The user input is: \"{text}\". "
        f"The predicted mental health state is {prediction_label} with {round(float(confidence) * 100, 1)}% confidence. "
        "Provide 5 wellness recommendations including meditation tips, breathing exercises, healthy lifestyle advice, and positive affirmations. "
        "Use a warm supportive tone and include both Somali and English guidance when possible. "
        "Return the result as a numbered list separated by new lines."
    )


# CLASS LABELS


CLASS_LABELS = {
    0: {
        "name": "Neutral",
        "color": "blue",
        "icon": "emoticon",
    },
    1: {
        "name": "Depression",
        "color": "red",
        "icon": "sad",
    },
    2: {
        "name": "Anxiety",
        "color": "orange",
        "icon": "worried",
    },
}


def normalize_prediction(raw_pred):
    class_index = None
    prediction_label = "Unknown"

    if isinstance(raw_pred, str):
        normalized = raw_pred.strip().lower()
        for idx, label in CLASS_LABELS.items():
            if label["name"].lower() == normalized:
                return idx, label["name"]
        return None, raw_pred

    try:
        class_index = int(raw_pred)
        prediction_label = CLASS_LABELS.get(class_index, {}).get("name", str(raw_pred))
    except (TypeError, ValueError):
        prediction_label = str(raw_pred)

    if label_encoder is not None and class_index is None:
        try:
            decoded = label_encoder.inverse_transform([raw_pred])[0]
            prediction_label = str(decoded)
        except Exception:
            pass

    return class_index, prediction_label


def predict_assessment_text(cleaned_text):
    if not ensure_prediction_model_loaded():
        raise RuntimeError("Trained prediction model is unavailable.")

    try:
        vec = vectorizer.transform([cleaned_text])
        raw_pred = model.predict(vec)[0]
        class_index, prediction_label = normalize_prediction(raw_pred)

        predict_proba = getattr(model, 'predict_proba', None)
        if not callable(predict_proba):
            raise RuntimeError("Trained prediction model does not expose probability scores.")
        proba = predict_proba(vec)[0]
        confidence = float(max(proba))

        return class_index, prediction_label, confidence
    except Exception as prediction_error:
        log_info("❌ MODEL PREDICTION ERROR:", str(prediction_error))
        log_info(
            "MODEL DEBUG:",
            {
                "model_type": model.__class__.__name__ if model else None,
                "vectorizer_type": vectorizer.__class__.__name__ if vectorizer else None,
                "input_length": len(cleaned_text or ""),
                "input_preview": (cleaned_text or "")[:120],
            },
        )
        logger.exception("Unhandled backend error")
        raise RuntimeError(f"Trained prediction model failed: {prediction_error}") from prediction_error

# =========================================================
# ROUTES
# =========================================================

def admin_schedule_period_range(base_date, period):
    period = str(period or 'week').lower()
    if period == 'day':
        return base_date, base_date
    if period == 'month':
        start = base_date.replace(day=1)
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        return start, next_month - timedelta(days=1)
    if period == 'year':
        return base_date.replace(month=1, day=1), base_date.replace(month=12, day=31)
    start = base_date - timedelta(days=base_date.weekday())
    return start, start + timedelta(days=6)


def admin_schedule_warnings(rules, blocked_dates, appointments):
    warnings = []
    normalized_rules = []
    for rule in rules:
        start_date = parse_schedule_date(rule.get('start_date'))
        end_date = parse_schedule_date(rule.get('end_date'))
        start_time = parse_schedule_time(rule.get('start_time'))
        end_time = parse_schedule_time(rule.get('end_time'))
        if not start_time or not end_time:
            warnings.append("Invalid time range in availability rule.")
            continue
        if end_time <= start_time:
            warnings.append(f"Invalid time range: {rule.get('start_time')} - {rule.get('end_time')}.")
        if end_date and end_date < datetime.today().date():
            warnings.append("Past schedule rule is still present.")
        duration_hours = (
            datetime.combine(datetime.today().date(), end_time)
            - datetime.combine(datetime.today().date(), start_time)
        ).total_seconds() / 3600
        if duration_hours > 12:
            warnings.append("Working hours exceed 12 hours in a rule.")
        normalized_rules.append({**rule, "start": start_time, "end": end_time})

    for index, rule in enumerate(normalized_rules):
        for other in normalized_rules[index + 1:]:
            overlap_start = max(
                parse_schedule_date(rule.get('start_date')) or datetime.today().date(),
                parse_schedule_date(other.get('start_date')) or datetime.today().date(),
            )
            overlap_end = min(
                parse_schedule_date(rule.get('end_date')) or (datetime.today().date() + timedelta(days=365)),
                parse_schedule_date(other.get('end_date')) or (datetime.today().date() + timedelta(days=365)),
            )
            if overlap_end < overlap_start:
                continue
            cursor = overlap_start
            while cursor <= overlap_end:
                if recurrence_matches_date(cursor, rule) and recurrence_matches_date(cursor, other):
                    if rule["start"] == other["start"] and rule["end"] == other["end"]:
                        warnings.append(f"Duplicate slot on {cursor.isoformat()} at {rule['start'].strftime('%H:%M')}.")
                        break
                    if time_ranges_overlap(rule["start"], rule["end"], other["start"], other["end"]):
                        warnings.append(f"Overlapping schedule on {cursor.isoformat()}.")
                        break
                cursor += timedelta(days=1)

    blocked_set = set(blocked_dates or [])
    for appt in appointments:
        appt_date = parse_schedule_date(appt.get('date'))
        appt_time = parse_schedule_time(appt.get('time'))
        if not appt_date or not appt_time:
            continue
        if appt_date.isoformat() in blocked_set:
            warnings.append(f"Appointment scheduled during vacation on {appt_date.isoformat()}.")
        if appt_date < datetime.today().date():
            continue
        matching_rule = any(
            recurrence_matches_date(appt_date, rule)
            and (parse_schedule_time(rule.get('start_time')) or appt_time) <= appt_time < (parse_schedule_time(rule.get('end_time')) or appt_time)
            for rule in rules
        )
        if not matching_rule:
            warnings.append(f"Appointment outside working hours on {appt_date.isoformat()}.")

    deduped = []
    for warning in warnings:
        if warning not in deduped:
            deduped.append(warning)
    return deduped


def get_doctor_password_record(cur, doctor_id):
    cur.execute(
        """
        SELECT id, doctor_id, user_id, generated_password, current_password_visible, status,
               password_last_changed, changed_by, changed_by_user_id, account_created_at,
               require_change_next_login, created_at, updated_at
        FROM doctor_password_records
        WHERE doctor_id = %s
        """,
        (doctor_id,)
    )
    row = cur.fetchone()
    if not row:
        return None
    keys = [
        'id', 'doctor_id', 'user_id', 'generated_password', 'current_password_visible', 'status',
        'password_last_changed', 'changed_by', 'changed_by_user_id', 'account_created_at',
        'require_change_next_login', 'created_at', 'updated_at'
    ]
    return dict(zip(keys, row))


def sync_doctor_password_record(cur, doctor_id, user_id, new_visible_password, status, changed_by, reason, changed_by_user_id=None, account_created_at=None):
    now = utc_now_naive()
    existing = get_doctor_password_record(cur, doctor_id)
    old_visible = existing.get('current_password_visible') if existing else None
    normalized_status = str(status or '').strip().lower() or 'generated'
    expose_current = normalized_status in ['generated', 'reset', 'temporary']
    current_visible = new_visible_password if expose_current else None
    generated_visible = existing.get('generated_password') if existing else None
    if normalized_status in ['generated', 'reset', 'temporary'] and new_visible_password:
        generated_visible = new_visible_password

    cur.execute(
        """
        INSERT INTO doctor_password_records
            (doctor_id, user_id, generated_password, current_password_visible, status,
             password_last_changed, changed_by, changed_by_user_id, account_created_at,
             require_change_next_login)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, %s), %s)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            generated_password = VALUES(generated_password),
            current_password_visible = VALUES(current_password_visible),
            status = VALUES(status),
            password_last_changed = VALUES(password_last_changed),
            changed_by = VALUES(changed_by),
            changed_by_user_id = VALUES(changed_by_user_id),
            account_created_at = COALESCE(account_created_at, VALUES(account_created_at)),
            require_change_next_login = VALUES(require_change_next_login)
        """,
        (
            doctor_id,
            user_id,
            generated_visible,
            current_visible,
            normalized_status,
            now,
            changed_by,
            changed_by_user_id,
            account_created_at,
            now,
            1 if normalized_status in ['generated', 'reset', 'temporary'] else 0,
        )
    )

    cur.execute(
        """
        INSERT INTO doctor_password_history
            (doctor_id, user_id, old_password_visible, new_password_visible, changed_by,
             changed_by_user_id, reason, status, change_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            doctor_id,
            user_id,
            old_visible,
            current_visible,
            changed_by,
            changed_by_user_id,
            reason,
            normalized_status,
            now,
        )
    )


def mark_doctor_password_changed_by_doctor(cur, user_id, reason='Changed'):
    cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user_id,))
    doctor_row = cur.fetchone()
    if not doctor_row:
        return
    sync_doctor_password_record(
        cur,
        doctor_row[0],
        user_id,
        None,
        'changed',
        'Doctor',
        reason,
        changed_by_user_id=user_id,
    )


# =========================================================
# ADMIN PREDICTIONS MONITORING
# =========================================================

# =========================================================
# ADMIN APPOINTMENTS MANAGEMENT
# =========================================================

# =========================================================
# ADMIN PAYMENTS MONITORING
# =========================================================

ALLOWED_REFUND_REASONS = {
    "Doctor did not join",
    "Appointment never started",
    "Doctor cancelled",
    "Wrong payment",
    "Other",
}
MIN_REFUND_CONSULTATION_MINUTES = int(os.getenv("MIN_REFUND_CONSULTATION_MINUTES", "10"))


def load_appointment_for_refund(cur, appointment_id, patient_id=None):
    params = [appointment_id]
    patient_filter = ""
    if patient_id:
        patient_filter = " AND a.user_id = %s"
        params.append(patient_id)
    cur.execute(f"""
        SELECT a.*, d.name AS doctor_display_name, d.specialization,
               u.fullname AS patient_name, u.phone AS patient_phone
        FROM appointments a
        LEFT JOIN doctors d ON d.id = a.doctor_id
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.id = %s {patient_filter}
        LIMIT 1
    """, tuple(params))
    return fetch_one_dict(cur)


def build_admin_refund_filters(args):
    clauses = []
    values = []
    search = str(args.get("search") or "").strip()
    status = str(args.get("status") or "").strip()
    doctor = str(args.get("doctor") or "").strip()
    patient = str(args.get("patient") or "").strip()
    start_date = str(args.get("start_date") or "").strip()
    end_date = str(args.get("end_date") or "").strip()
    min_amount = str(args.get("min_amount") or "").strip()
    max_amount = str(args.get("max_amount") or "").strip()
    if search:
        clauses.append("(rr.id LIKE %s OR up.fullname LIKE %s OR up.phone LIKE %s OR d.name LIKE %s OR a.id LIKE %s OR p.transaction_id LIKE %s OR rr.reason LIKE %s)")
        like = f"%{search}%"
        values.extend([like, like, like, like, like, like, like])
    if status and status.lower() != "all":
        clauses.append("LOWER(rr.status) = LOWER(%s)")
        values.append(status)
    if doctor:
        clauses.append("(d.name LIKE %s OR rr.doctor_id = %s)")
        values.extend([f"%{doctor}%", doctor if doctor.isdigit() else 0])
    if patient:
        clauses.append("(up.fullname LIKE %s OR up.phone LIKE %s OR rr.patient_id = %s)")
        values.extend([f"%{patient}%", f"%{patient}%", patient if patient.isdigit() else 0])
    if start_date:
        clauses.append("DATE(rr.requested_at) >= %s")
        values.append(start_date)
    if end_date:
        clauses.append("DATE(rr.requested_at) <= %s")
        values.append(end_date)
    if min_amount:
        clauses.append("rr.refund_amount >= %s")
        values.append(min_amount)
    if max_amount:
        clauses.append("rr.refund_amount <= %s")
        values.append(max_amount)
    return (" WHERE " + " AND ".join(clauses)) if clauses else "", values


ADMIN_REFUND_SELECT = """
    SELECT rr.id, rr.appointment_id, rr.payment_id, rr.patient_id, rr.doctor_id,
           rr.amount, rr.refund_amount, rr.reason, rr.notes, rr.status, rr.gateway_refund_id,
           rr.gateway_status, rr.manual_refund_required, rr.admin_notes, rr.requested_at,
           rr.processed_at, rr.processed_by, rr.created_at, rr.updated_at, rr.evidence,
           up.fullname AS patient_name, up.phone AS patient_phone,
           d.name AS doctor_name, d.specialization AS doctor_specialization,
           a.appointment_date, a.appointment_time, a.status AS appointment_status,
           p.payment_method, p.payment_status, p.transaction_id, p.provider_transaction_id,
           p.reference_id, p.invoice_id, p.service_status, p.paid_at,
           ua.fullname AS admin_name
    FROM refund_requests rr
    LEFT JOIN users up ON up.id = rr.patient_id
    LEFT JOIN doctors d ON d.id = rr.doctor_id
    LEFT JOIN appointments a ON a.id = rr.appointment_id
    LEFT JOIN payments p ON p.id = rr.payment_id
    LEFT JOIN users ua ON ua.id = rr.processed_by
"""


def serialize_admin_refund(record):
    return {
        "id": record.get("id"),
        "refund_id": f"RF-{int(record.get('id') or 0):06d}",
        "appointment_id": record.get("appointment_id"),
        "payment_id": record.get("payment_id"),
        "patient_id": record.get("patient_id"),
        "doctor_id": record.get("doctor_id"),
        "patient": {"name": record.get("patient_name") or "Unknown patient", "phone": record.get("patient_phone")},
        "doctor": {"name": record.get("doctor_name") or "Unknown doctor", "specialization": record.get("doctor_specialization")},
        "amount": float(record.get("amount") or 0),
        "refund_amount": float(record.get("refund_amount") or 0),
        "payment_method": record.get("payment_method"),
        "payment_status": record.get("payment_status"),
        "transaction_id": record.get("transaction_id") or record.get("provider_transaction_id") or record.get("reference_id"),
        "reason": record.get("reason"),
        "notes": record.get("notes"),
        "status": record.get("status"),
        "gateway_refund_id": record.get("gateway_refund_id"),
        "gateway_status": record.get("gateway_status"),
        "manual_refund_required": bool(record.get("manual_refund_required")),
        "admin_notes": record.get("admin_notes"),
        "admin": record.get("admin_name"),
        "appointment": {
            "date": record.get("appointment_date").strftime("%Y-%m-%d") if record.get("appointment_date") else None,
            "time": format_time(record.get("appointment_time"))[:5] if record.get("appointment_time") else None,
            "status": record.get("appointment_status"),
            "service_status": record.get("service_status"),
        },
        "requested_at": record.get("requested_at").isoformat() if record.get("requested_at") else None,
        "processed_at": record.get("processed_at").isoformat() if record.get("processed_at") else None,
        "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
        "updated_at": record.get("updated_at").isoformat() if record.get("updated_at") else None,
    }


# =========================================================
# ADMIN NOTIFICATIONS MANAGEMENT
# =========================================================

# =========================================================
# USER NOTIFICATIONS
# =========================================================

# =========================================================
# ADMIN ANALYTICS & REPORTS
# =========================================================

# =========================================================
# ADMIN REPORTS API
# =========================================================

def current_doctor_id_for_reports(cur, user):
    cur.execute("SELECT id FROM doctors WHERE user_id = %s", (user.get('user_id'),))
    row = cur.fetchone()
    return row[0] if row else None


def parse_report_json(value):
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def report_data_value(data, *keys, default=None):
    for key in keys:
        if isinstance(data, dict) and data.get(key) not in (None, ''):
            return data.get(key)
    return default


def ensure_reports_runtime_columns(cur):
    return None


def ensure_appointment_completion_columns(cur):
    return None


def normalize_report_confidence(value):
    try:
        confidence = float(value or 0)
    except Exception:
        return 0
    if confidence <= 1:
        confidence *= 100
    return max(0, min(100, round(confidence, 1)))


def create_or_update_clinical_report_for_appointment(cur, appointment_id):
    ensure_reports_runtime_columns(cur)
    cur.execute("""
        SELECT
          a.id, a.user_id, a.doctor_id, a.doctor_name, a.phone,
          a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
          COALESCE(u.fullname, u.username) AS patient_name, u.phone AS patient_phone,
          u.email, u.age, u.gender, u.avatar,
          COALESCE(d.name, a.doctor_name) AS doctor_display_name,
          COALESCE(d.specialization, d.specialty) AS doctor_specialization,
          d.hospital_name,
          p.id AS prediction_id, p.input_text, p.prediction_result, p.confidence_score,
          p.anxiety_level, p.recommendation, p.created_at AS prediction_created_at,
          pay.payment_status, pay.amount, pay.service_status
        FROM appointments a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN doctors d ON d.id = a.doctor_id
        INNER JOIN predictions p
          ON p.id = a.prediction_id
         AND p.user_id = a.user_id
         AND p.sharing_status = 'shared_with_doctor'
         AND p.shared_doctor_id = a.doctor_id
        LEFT JOIN (
            SELECT p1.*
            FROM payments p1
            INNER JOIN (
                SELECT COALESCE(appointment_id, booking_id) AS linked_appointment_id, MAX(created_at) AS max_created
                FROM payments
                WHERE COALESCE(sandbox_mode, 0) = 0
                GROUP BY COALESCE(appointment_id, booking_id)
            ) latest_payment
              ON latest_payment.linked_appointment_id = COALESCE(p1.appointment_id, p1.booking_id)
             AND latest_payment.max_created = p1.created_at
        ) pay ON COALESCE(pay.appointment_id, pay.booking_id) = a.id
        WHERE a.id = %s AND COALESCE(a.sandbox_mode, 0) = 0
        LIMIT 1
    """, (appointment_id,))
    row = fetch_one_dict(cur)
    if not row:
        return None
    if str(row.get("status") or "").strip().lower() != "completed":
        return None
    if str(row.get("payment_status") or "").strip().lower() not in ["paid", "completed", "success", "successful"]:
        return None
    if not row.get("prediction_id"):
        return None

    prediction_result = row.get("prediction_result") or row.get("anxiety_level") or "Neutral"
    confidence = normalize_report_confidence(row.get("confidence_score"))
    severity = assessment_risk_level(prediction_result, (confidence / 100) if confidence > 1 else confidence)
    appointment_date = format_date(row.get("appointment_date"))
    appointment_time = format_time(row.get("appointment_time"))[:5] if row.get("appointment_time") else ""
    report_id = f"RPT-{datetime.utcnow().strftime('%Y%m%d')}-{int(appointment_id):06d}"
    diagnosis = prediction_result if prediction_result != "Neutral" else "No high-risk anxiety or depression signal recorded"
    treatment_plan = "Review symptoms, continue monitoring, and schedule follow-up if symptoms persist or intensify."
    recommendations = []
    if row.get("recommendation"):
        recommendations.append(str(row.get("recommendation")))
    recommendations.extend([
        "Document patient progress after consultation.",
        "Encourage evidence-based coping strategies and follow-up care as clinically appropriate.",
    ])
    report_data = {
        "appointment_id": row.get("id"),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "patient_phone": row.get("patient_phone") or row.get("phone"),
        "patient_email": row.get("email"),
        "patient_age": row.get("age"),
        "patient_gender": row.get("gender"),
        "patient_avatar": row.get("avatar"),
        "doctor_specialization": row.get("doctor_specialization"),
        "doctor_hospital": row.get("hospital_name"),
        "prediction_id": row.get("prediction_id"),
        "prediction_created_at": str(row.get("prediction_created_at")) if row.get("prediction_created_at") else None,
        "risk_level": severity,
        "severity": severity,
        "risk_percent": confidence,
        "mental_health_score": confidence,
        "symptoms": [row.get("input_text")] if row.get("input_text") else [],
        "doctor_notes": row.get("notes") or "",
        "diagnosis": diagnosis,
        "treatment_plan": treatment_plan,
        "recommendations": recommendations,
        "medications": [],
        "follow_up_date": "",
        "payment_status": row.get("payment_status") or "Not recorded",
        "payment_amount": float(row.get("amount") or 0),
        "service_status": row.get("service_status") or "",
        "doctor_signature": row.get("doctor_display_name") or row.get("doctor_name") or "",
        "generated_at": utc_now_naive().isoformat(sep=" ", timespec="seconds"),
    }
    summary = (
        f"Clinical report for appointment #{appointment_id}. "
        f"Prediction: {prediction_result} ({confidence}%). "
        f"Risk level: {severity}. Appointment: {appointment_date or '-'} {appointment_time or ''}."
    )
    cur.execute("""
        INSERT INTO reports (
          report_id, appointment_id, user_id, user_name, doctor_id, doctor_name,
          prediction_type, prediction_result, prediction_confidence, confidence_score,
          status, report_status, summary, admin_notes, report_data, downloads,
          exported_count, report_type, environment, sandbox_mode
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Completed', 'Completed', %s, %s, %s, 0, 0, 'clinical', 'production', 0)
        ON DUPLICATE KEY UPDATE
          user_name = VALUES(user_name),
          doctor_name = VALUES(doctor_name),
          prediction_type = VALUES(prediction_type),
          prediction_result = VALUES(prediction_result),
          prediction_confidence = VALUES(prediction_confidence),
          confidence_score = VALUES(confidence_score),
          status = 'Completed',
          report_status = 'Completed',
          summary = VALUES(summary),
          admin_notes = VALUES(admin_notes),
          report_data = VALUES(report_data),
          report_type = 'clinical',
          updated_at = CURRENT_TIMESTAMP
    """, (
        report_id,
        row.get("id"),
        row.get("user_id"),
        row.get("patient_name") or "Patient",
        row.get("doctor_id"),
        row.get("doctor_display_name") or row.get("doctor_name") or "Doctor",
        prediction_result,
        prediction_result,
        int(round(confidence)),
        float(confidence),
        summary,
        row.get("notes") or "",
        json.dumps(report_data, default=str),
    ))
    return report_id


def backfill_completed_reports_for_doctor(cur, doctor_id):
    ensure_reports_runtime_columns(cur)
    cur.execute("""
        SELECT a.id
        FROM appointments a
        LEFT JOIN reports r ON r.appointment_id = a.id AND COALESCE(r.sandbox_mode, 0) = 0
        WHERE a.doctor_id = %s
          AND LOWER(COALESCE(a.status, '')) = 'completed'
          AND COALESCE(a.sandbox_mode, 0) = 0
          AND r.id IS NULL
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
        LIMIT 100
    """, (doctor_id,))
    appointment_ids = [row[0] for row in (cur.fetchall() or [])]
    created = 0
    for appointment_id in appointment_ids:
        if create_or_update_clinical_report_for_appointment(cur, appointment_id):
            created += 1
    if created:
        mysql.connection.commit()
    return created


def doctor_reports_date_range(date_range, start_date, end_date):
    today = datetime.today().date()
    if date_range == 'today':
        return today, today
    if date_range == 'week':
        return today - timedelta(days=today.weekday()), today
    if date_range == 'month':
        return today.replace(day=1), today
    if date_range == 'custom':
        return parse_schedule_date(start_date), parse_schedule_date(end_date)
    return None, None


def build_doctor_reports_filters(doctor_id):
    search = str(request.args.get('search') or '').strip()
    status = str(request.args.get('status') or '').strip()
    risk_level = str(request.args.get('risk_level') or '').strip()
    specialization = str(request.args.get('specialization') or '').strip()
    date_range = str(request.args.get('date_range') or 'all').strip().lower()
    start_date, end_date = doctor_reports_date_range(
        date_range,
        request.args.get('start_date'),
        request.args.get('end_date'),
    )
    where = [
        "r.doctor_id = %s",
        "COALESCE(r.sandbox_mode, 0) = 0",
        "LOWER(COALESCE(r.report_status, r.status, '')) = 'completed'",
        "LOWER(COALESCE(r.report_type, 'clinical')) = 'clinical'",
        "r.appointment_id IS NOT NULL",
    ]
    params = [doctor_id]
    if search:
        like = f"%{search}%"
        where.append("""
            (
              r.report_id LIKE %s OR r.user_name LIKE %s OR COALESCE(u.fullname, '') LIKE %s
              OR COALESCE(u.phone, '') LIKE %s OR COALESCE(r.summary, '') LIKE %s
              OR COALESCE(r.admin_notes, '') LIKE %s OR COALESCE(r.prediction_result, '') LIKE %s
              OR COALESCE(r.report_data, '') LIKE %s
            )
        """)
        params.extend([like, like, like, like, like, like, like, like])
    if status and status.lower() != 'all':
        where.append("(LOWER(COALESCE(r.report_status, r.status, '')) = %s OR LOWER(COALESCE(r.status, '')) = %s)")
        normalized = status.lower()
        params.extend([normalized, normalized])
    if risk_level and risk_level.lower() != 'all':
        where.append("""
            LOWER(CASE
              WHEN JSON_VALID(r.report_data) THEN COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.severity')),
                JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.risk_level')),
                ''
              )
              ELSE ''
            END) = %s
        """)
        params.append(risk_level.lower())
    if specialization:
        where.append("""
            LOWER(CASE
              WHEN JSON_VALID(r.report_data) THEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.doctor_specialization')), '')
              ELSE ''
            END) LIKE %s
        """)
        params.append(f"%{specialization.lower()}%")
    if start_date:
        where.append("DATE(r.created_at) >= %s")
        params.append(start_date)
    if end_date:
        where.append("DATE(r.created_at) <= %s")
        params.append(end_date)
    return " AND ".join(where), params


def format_doctor_report_row(row):
    data = parse_report_json(row[20])
    confidence = row[9] if row[9] is not None else row[8]
    severity = report_data_value(data, 'severity', 'risk', 'risk_level', default=None)
    if not severity:
        try:
            confidence_value = float(confidence or 0)
            severity = 'High' if confidence_value >= 80 else 'Medium' if confidence_value >= 50 else 'Low'
        except Exception:
            severity = 'Low'
    return {
        "id": row[0],
        "report_id": row[1],
        "appointment_id": report_data_value(data, 'appointment_id', 'appointmentId', default=row[21]),
        "user_id": row[2],
        "patient_name": row[3] or row[22] or 'Patient',
        "patient_phone": row[23] or '',
        "patient_email": row[24] or '',
        "patient_age": row[25],
        "patient_gender": row[26] or '',
        "patient_avatar": row[27] or '',
        "doctor_id": row[4],
        "doctor_name": row[5],
        "prediction_type": row[6],
        "prediction_result": row[7] or row[6] or 'Neutral',
        "prediction_confidence": confidence or 0,
        "confidence_score": row[9] or 0,
        "mental_health_score": report_data_value(data, 'mental_health_score', 'score', default=confidence or 0),
        "status": row[11] or row[10] or 'Draft',
        "summary": row[12] or '',
        "doctor_notes": row[13] or report_data_value(data, 'doctor_notes', 'notes', default='') or '',
        "diagnosis": report_data_value(data, 'diagnosis', default=row[6] or row[7] or 'Not recorded'),
        "severity": str(severity).title(),
        "symptoms": report_data_value(data, 'symptoms', default=[]),
        "treatment_plan": report_data_value(data, 'treatment_plan', 'treatmentPlan', default=''),
        "prescription": report_data_value(data, 'prescription', default=''),
        "recommendations": report_data_value(data, 'recommendations', default=[]),
        "lifestyle_advice": report_data_value(data, 'lifestyle_advice', 'lifestyleAdvice', 'lifestyle', default=[]),
        "follow_up_recommendation": report_data_value(data, 'follow_up_recommendation', default=''),
        "consultation_outcome": report_data_value(data, 'consultation_outcome', default=''),
        "medications": report_data_value(data, 'medications', default=[]),
        "follow_up_date": report_data_value(data, 'follow_up_date', 'followUpDate', default=''),
        "appointment_date": report_data_value(data, 'appointment_date', 'appointmentDate', default=str(row[28])[:10] if row[28] else str(row[16])[:10] if row[16] else ''),
        "appointment_time": format_time(row[29])[:5] if row[29] else report_data_value(data, 'appointment_time', 'appointmentTime', default=''),
        "consultation_minutes": int(report_data_value(data, 'consultation_minutes', 'duration_minutes', 'duration', default=0) or 0),
        "rating": float(row[30] or 0),
        "created_at": str(row[16]) if row[16] else None,
        "updated_at": str(row[17]) if row[17] else None,
        "report_type": row[18],
        "downloads": row[14] or 0,
        "exported_count": row[15] or 0,
        "report_data": data,
    }


DOCTOR_REPORTS_SELECT = """
    SELECT r.id, r.report_id, r.user_id, r.user_name, r.doctor_id, r.doctor_name,
           r.prediction_type, r.prediction_result, r.prediction_confidence, r.confidence_score,
           r.status, r.report_status, r.summary, r.admin_notes, r.downloads, r.exported_count,
           r.created_at, r.updated_at, r.report_type, r.environment, r.report_data,
           COALESCE(r.appointment_id, a.id) AS appointment_id, COALESCE(u.fullname, u.username) AS patient_fullname,
           u.phone, u.email, u.age, u.gender, u.avatar, a.appointment_date, a.appointment_time,
           COALESCE(ar.rating, dr.rating) AS patient_rating
    FROM reports r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN appointments a ON a.id = COALESCE(r.appointment_id, CAST(
        CASE
          WHEN JSON_VALID(r.report_data) THEN JSON_UNQUOTE(JSON_EXTRACT(r.report_data, '$.appointment_id'))
          ELSE NULL
        END AS UNSIGNED
    ))
    LEFT JOIN appointment_ratings ar ON ar.appointment_id = a.id
    LEFT JOIN doctor_reviews dr ON dr.appointment_id = a.id
"""


def rows_to_csv(rows):
    header = [
        'Report ID', 'Patient', 'Phone', 'Appointment ID', 'Appointment Date',
        'Diagnosis', 'Prediction', 'Severity', 'Status', 'Created Date', 'Doctor Notes'
    ]
    body = []
    for report in rows:
        body.append([
            report.get('report_id'),
            report.get('patient_name'),
            report.get('patient_phone'),
            report.get('appointment_id') or '',
            report.get('appointment_date') or '',
            report.get('diagnosis') or '',
            report.get('prediction_result') or '',
            report.get('severity') or '',
            report.get('status') or '',
            report.get('created_at') or '',
            report.get('doctor_notes') or report.get('summary') or '',
        ])
    csv_lines = [header, *body]
    return "\n".join(",".join(f'"{str(cell or "").replace(chr(34), chr(34) + chr(34))}"' for cell in row) for row in csv_lines)


def ensure_payment_link_columns(cur):
    return None


def platform_fee_percent():
    try:
        return max(0.0, min(100.0, float(app.config.get("PLATFORM_FEE_PERCENT") or 0)))
    except (TypeError, ValueError):
        return 0.0


def normalized_financial_status(status):
    raw = str(status or "Pending").strip().lower()
    if raw in ("completed", "paid", "success", "successful"):
        return "Paid"
    if raw in ("partial refund", "partially refunded", "partial_refund"):
        return "Partial Refund"
    if raw in ("refunded", "refund"):
        return "Refunded"
    if raw in ("failed", "declined", "cancelled", "canceled", "expired"):
        return "Failed"
    return "Pending"


def financial_amounts(amount, status, refunded_amount=0):
    gross = round(float(amount or 0), 2)
    normalized = normalized_financial_status(status)
    refund = float(refunded_amount or 0)
    if normalized == "Refunded" and refund <= 0:
        refund = gross
    refund = round(max(0.0, min(gross, refund)), 2)
    if normalized in ("Paid", "Partial Refund", "Refunded"):
        net = round(max(0.0, gross - refund), 2)
    else:
        gross = 0.0
        net = 0.0
        refund = 0.0
    return gross, refund, net


def doctor_platform_amounts(net_amount):
    fee_percent = platform_fee_percent()
    platform = round(float(net_amount or 0) * fee_percent / 100, 2)
    doctor = round(float(net_amount or 0) - platform, 2)
    return doctor, platform, fee_percent


def current_net_revenue(cur):
    cur.execute("""
        SELECT COALESCE(SUM(
            CASE
              WHEN LOWER(payment_status) IN ('paid', 'completed', 'success', 'successful', 'partial refund', 'partially refunded', 'partial_refund', 'refunded')
              THEN GREATEST(0, COALESCE(amount, 0) - LEAST(COALESCE(amount, 0), CASE WHEN LOWER(payment_status) = 'refunded' AND COALESCE(refunded_amount, 0) = 0 THEN COALESCE(amount, 0) ELSE COALESCE(refunded_amount, 0) END))
              ELSE 0
            END
        ), 0)
        FROM payments
        WHERE COALESCE(sandbox_mode, 0) = 0
    """)
    return float(cur.fetchone()[0] or 0)


def log_financial_event(cur, payment_id, event_type, original_amount, refund_amount, remaining_amount, reason=None, approved_by=None, metadata=None):
    revenue_after_event = current_net_revenue(cur)
    cur.execute("""
        INSERT INTO financial_ledger
          (payment_id, appointment_id, patient_id, doctor_id, event_type, original_amount, refund_amount, remaining_amount, refund_reason, approved_by, event_at, revenue_after_event, metadata)
        SELECT id, COALESCE(appointment_id, booking_id), user_id, doctor_id, %s, %s, %s, %s, %s, %s, NOW(), %s, %s
        FROM payments
        WHERE id = %s
    """, (
        event_type,
        round(float(original_amount or 0), 2),
        round(float(refund_amount or 0), 2),
        round(float(remaining_amount or 0), 2),
        reason,
        approved_by,
        revenue_after_event,
        json.dumps(metadata or {}, default=str),
        payment_id,
    ))


def ensure_refund_requests_table(cur):
    return None


def fetch_one_dict(cur):
    row = cur.fetchone()
    if not row:
        return None
    columns = [column[0] for column in cur.description] if cur.description else []
    return dict(zip(columns, row))


def parse_appointment_datetime(appointment):
    date_value = appointment.get("appointment_date")
    time_value = appointment.get("appointment_time")
    if not date_value:
        return None
    if hasattr(date_value, "strftime"):
        date_text = date_value.strftime("%Y-%m-%d")
    else:
        date_text = str(date_value)[:10]
    time_text = format_time(time_value)[:5] if time_value else "00:00"
    try:
        return datetime.strptime(f"{date_text} {time_text}", "%Y-%m-%d %H:%M")
    except Exception:
        return None


def latest_successful_payment_for_appointment(cur, appointment_id, patient_id=None):
    params = [appointment_id]
    patient_filter = ""
    if patient_id:
        patient_filter = " AND p.user_id = %s"
        params.append(patient_id)
    cur.execute(f"""
        SELECT p.*
        FROM payments p
        WHERE COALESCE(p.appointment_id, p.booking_id) = %s
          {patient_filter}
          AND LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid', 'success', 'successful')
        ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC
        LIMIT 1
    """, tuple(params))
    return fetch_one_dict(cur)


def get_existing_refund_for_payment(cur, appointment_id, payment_id):
    cur.execute(
        """
        SELECT id, status, requested_at, processed_at
        FROM refund_requests
        WHERE appointment_id = %s AND payment_id = %s
        LIMIT 1
        """,
        (appointment_id, payment_id)
    )
    return fetch_one_dict(cur)


def appointment_qualifies_for_refund(appointment, payment):
    if not appointment or not payment:
        return False, ["Payment record is required."], {}

    reasons = []
    status = str(appointment.get("status") or "").strip().lower()
    service_status = str(payment.get("service_status") or "").strip().lower()
    appointment_dt = parse_appointment_datetime(appointment)
    now = utc_now_naive()

    if status in ["no show", "noshow", "doctor no show"]:
        reasons.append("Appointment status is No Show.")
    if "cancel" in status:
        reasons.append("Appointment was cancelled after payment.")
    if "absent" in status or "absent" in service_status:
        reasons.append("Doctor attendance issue was recorded.")
    if "not provided" in service_status or "issue" in service_status:
        reasons.append("Consultation service was not provided.")
    if appointment_dt and appointment_dt < now and status not in ["completed", "complete"]:
        reasons.append("Appointment expired without being completed.")

    duration_minutes = None
    report_data = appointment.get("report_data")
    if report_data:
        try:
            report_json = json.loads(report_data) if isinstance(report_data, str) else report_data
            duration_minutes = report_json.get("consultation_duration_minutes") or report_json.get("duration_minutes")
        except Exception:
            duration_minutes = None
    if duration_minutes is not None:
        try:
            if float(duration_minutes) < MIN_REFUND_CONSULTATION_MINUTES:
                reasons.append(f"Consultation lasted less than {MIN_REFUND_CONSULTATION_MINUTES} minutes.")
        except (TypeError, ValueError):
            pass

    return bool(reasons), reasons, {
        "appointment_status": appointment.get("status"),
        "service_status": payment.get("service_status"),
        "minimum_minutes": MIN_REFUND_CONSULTATION_MINUTES,
        "appointment_datetime": appointment_dt.isoformat() if appointment_dt else None,
    }


def notify_doctor_for_refund(doctor_id, title, message, notification_type):
    if not doctor_id:
        return
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
        row = cur.fetchone()
        cur.close()
        if row and row[0]:
            create_user_notification(row[0], title, message, notification_type, reference_id=None, role_target='doctor')
    except Exception:
        pass


def simple_pdf_bytes(title, lines):
    safe_lines = [str(title)] + [str(line) for line in lines]
    text_commands = ["BT", "/F1 12 Tf", "50 790 Td"]
    for index, line in enumerate(safe_lines[:45]):
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if index:
            text_commands.append("0 -16 Td")
        text_commands.append(f"({escaped[:110]}) Tj")
    text_commands.append("ET")
    stream = "\n".join(text_commands).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for idx, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{idx} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref_at = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode("ascii"))
    return bytes(pdf)


def ensure_appointment_ratings_table(cur):
    return None


def ensure_doctor_reviews_table(cur):
    return None


def refresh_doctor_rating(cur, doctor_id):
    cur.execute(
        """
        UPDATE doctors d
        SET rating = COALESCE((
            SELECT ROUND(AVG(r.rating), 1)
            FROM doctor_reviews r
            WHERE r.doctor_id = d.id
        ), 0)
        WHERE d.id = %s
        """,
        (doctor_id,)
    )


def payment_allows_review(cur, appointment_id):
    cur.execute(
        """
        SELECT
          COUNT(*) AS payment_count,
          SUM(CASE WHEN LOWER(payment_status) IN ('completed', 'paid', 'success', 'successful') THEN 1 ELSE 0 END) AS paid_count,
          SUM(CASE WHEN LOWER(payment_status) IN ('failed', 'cancelled', 'canceled', 'rejected') THEN 1 ELSE 0 END) AS failed_count
        FROM payments
        WHERE appointment_id = %s OR booking_id = %s
        """,
        (appointment_id, appointment_id)
    )
    payment_count, paid_count, failed_count = cur.fetchone() or (0, 0, 0)
    payment_count = int(payment_count or 0)
    paid_count = int(paid_count or 0)
    failed_count = int(failed_count or 0)
    if payment_count == 0:
        return True, None
    if paid_count > 0:
        return True, None
    if failed_count > 0:
        return False, "Payment failed for this appointment, so review is not available."
    return False, "Payment is not completed yet."


def hormuud_merchant_config_ready(require_status=True):
    required = [
        app.config.get("HORMUUD_MERCHANT_API_URL"),
        app.config.get("HORMUUD_MERCHANT_API_KEY"),
        app.config.get("HORMUUD_MERCHANT_UID") or app.config.get("HORMUUD_MERCHANT_ID"),
        app.config.get("HORMUUD_API_USER_ID"),
    ]
    if require_status:
        required.append(app.config.get("HORMUUD_MERCHANT_STATUS_URL"))
    return all(bool(value) for value in required)


def real_hormuud_unavailable_message():
    return "Real Hormuud Merchant credentials are not configured. Payments are unavailable until valid merchant credentials are provided."


def generate_payment_transaction_id():
    return f"PAY-{utc_now_naive().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:12].upper()}"


def extract_merchant_amount(response_data):
    for key in ["amount", "paidAmount", "transactionAmount", "totalAmount", "paymentAmount"]:
        value = extract_nested(response_data, key)
        if value is None:
            continue
        try:
            return round(float(value), 2)
        except (TypeError, ValueError):
            continue
    return None


def merchant_amount_matches(response_data, expected_amount):
    merchant_amount = extract_merchant_amount(response_data)
    if merchant_amount is None:
        # Some merchant status responses confirm the transaction without
        # echoing the amount. Validate the amount whenever it is present, but
        # do not block an otherwise successful provider confirmation solely
        # because the status endpoint omits it.
        return True
    return merchant_amount == round(float(expected_amount), 2)


# Merchant integration is isolated here so production and sandbox payments use
# the same Hormuud request, response, and failure handling.
def process_hormuud_payment(amount, payment_phone, payment_method, transaction_id, description, currency):
    merchant_url = app.config.get("HORMUUD_MERCHANT_API_URL")
    api_key = app.config.get("HORMUUD_MERCHANT_API_KEY")
    merchant_uid = app.config.get("HORMUUD_MERCHANT_UID") or app.config.get("HORMUUD_MERCHANT_ID")
    api_user_id = app.config.get("HORMUUD_API_USER_ID")
    service_name = app.config.get("HORMUUD_SERVICE_NAME") or "API_PURCHASE"
    channel_name = app.config.get("HORMUUD_CHANNEL_NAME") or "WEB"
    merchant_payment_method = app.config.get("HORMUUD_PAYMENT_METHOD") or "mwallet_account"

    if not merchant_url or not api_key or not merchant_uid or not api_user_id:
        log_info("PAYMENT_ERROR", json.dumps({
            "transaction_id": transaction_id,
            "phone": payment_phone,
            "amount": round(float(amount), 2),
            "error_reason": "Hormuud merchant configuration is missing.",
            "configured": {
                "merchant_url": bool(merchant_url),
                "api_key": bool(api_key),
                "merchant_uid": bool(merchant_uid),
                "api_user_id": bool(api_user_id),
            },
            "timestamp": utc_now_naive().isoformat(),
        }, default=str))
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
            "failure_reason": "Hormuud merchant configuration is missing.",
            "raw": {"error": "Hormuud merchant configuration is missing."},
        }

    reference_id = transaction_id
    invoice_id = f"INV-{int(utc_now_naive().timestamp())}-{random.randint(1000,9999)}"
    account_no = re.sub(r'\D', '', str(payment_phone or ''))
    payload = {
        "schemaVersion": "1.0",
        "requestId": transaction_id,
        "timestamp": utc_now_naive().isoformat(),
        "channelName": channel_name,
        "serviceName": service_name,
        "serviceParams": {
            "merchantUid": merchant_uid,
            "apiUserId": api_user_id,
            "apiKey": api_key,
            "paymentMethod": merchant_payment_method,
            "payerInfo": {
                "accountNo": account_no,
            },
            "transactionInfo": {
                "referenceId": reference_id,
                "invoiceId": invoice_id,
                "amount": round(float(amount), 2),
                "currency": currency,
                "description": description,
            },
        },
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    log_info("PAYMENT_REQUEST", json.dumps({
        "transaction_id": transaction_id,
        "phone": payment_phone,
        "amount": round(float(amount), 2),
        "currency": currency,
        "payment_method": payment_method,
        "merchant_payment_method": merchant_payment_method,
        "service_name": service_name,
        "channel_name": channel_name,
        "merchant_uid": f"{str(merchant_uid)[:3]}***{str(merchant_uid)[-2:]}" if merchant_uid else None,
        "api_user_id": f"{str(api_user_id)[:3]}***{str(api_user_id)[-2:]}" if api_user_id else None,
        "timestamp": utc_now_naive().isoformat(),
    }, default=str))

    try:
        response = requests.post(merchant_url, json=payload, headers=headers, timeout=30)
        response_data = response.json() if response.content else {}
        log_info("PAYMENT_RESPONSE", json.dumps({
            "transaction_id": transaction_id,
            "status_code": response.status_code,
            "merchant_response": response_data,
            "timestamp": utc_now_naive().isoformat(),
        }, default=str))
        if response.ok:
            status = normalize_hormuud_status(response_data)
            failure_reason = None if status == "Completed" else user_friendly_payment_error(extract_payment_failure_reason(response_data, "Payment is pending."))
            return {
                "status": status,
                "reference_id": extract_nested(response_data, "referenceId") or extract_nested(response_data, "reference_id") or reference_id,
                "invoice_id": extract_nested(response_data, "invoiceId") or extract_nested(response_data, "invoice_id") or invoice_id,
                "provider_transaction_id": extract_nested(response_data, "transactionId") or extract_nested(response_data, "providerTransactionId") or extract_nested(response_data, "provider_transaction_id"),
                "failure_reason": failure_reason,
                "raw": response_data,
            }

        failure_reason = user_friendly_payment_error(extract_payment_failure_reason(response_data, response.text or "Merchant rejected the payment."))
        log_info("PAYMENT_ERROR", json.dumps({
            "transaction_id": transaction_id,
            "phone": payment_phone,
            "amount": round(float(amount), 2),
            "error_reason": failure_reason,
            "timestamp": utc_now_naive().isoformat(),
        }, default=str))
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
            "failure_reason": failure_reason,
            "raw": response_data,
        }
    except Exception as e:
        failure_reason = user_friendly_payment_error(str(e))
        log_info("PAYMENT_ERROR", json.dumps({
            "transaction_id": transaction_id,
            "phone": payment_phone,
            "amount": round(float(amount), 2),
            "error_reason": failure_reason,
            "timestamp": utc_now_naive().isoformat(),
        }, default=str))
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
            "failure_reason": failure_reason,
            "raw": {"error": str(e)},
        }


def extract_nested(value, key):
    if isinstance(value, dict):
        if key in value:
            return value.get(key)
        for child in value.values():
            found = extract_nested(child, key)
            if found is not None:
                return found
    if isinstance(value, list):
        for child in value:
            found = extract_nested(child, key)
            if found is not None:
                return found
    return None


def normalize_hormuud_status(response_data):
    pending_codes = {"2001", "pending", "processing", "accepted", "inprogress", "in_progress"}
    success_codes = {"0", "00", "000", "200", "success", "successful", "completed", "paid", "approved"}
    failure_codes = {
        "failed", "failure", "cancelled", "canceled", "declined", "rejected", "error",
        "400", "401", "403", "404", "500", "5004", "5206", "5310",
        "bad request", "rcs_user_rejected",
    }
    status_values = [
        extract_nested(response_data, "status"),
        extract_nested(response_data, "paymentStatus"),
        extract_nested(response_data, "transactionStatus"),
        extract_nested(response_data, "state"),
        extract_nested(response_data, "paymentState"),
        extract_nested(response_data, "transactionState"),
    ]
    response_values = [
        extract_nested(response_data, "responseCode"),
        extract_nested(response_data, "errorCode"),
        extract_nested(response_data, "responseMsg"),
        extract_nested(response_data, "responseMessage"),
    ]
    values = status_values + response_values
    normalized_values = {str(value).strip().lower() for value in values if value is not None}
    normalized_status_values = {str(value).strip().lower() for value in status_values if value is not None}
    combined_text = " ".join(normalized_values)

    if normalized_status_values.intersection(failure_codes):
        return "Failed"
    if normalized_status_values.intersection(success_codes):
        return "Completed"
    if normalized_values.intersection(failure_codes):
        return "Failed"
    error_code = extract_nested(response_data, "errorCode")
    if error_code is not None and str(error_code).strip().lower() not in {"", "0", "00", "000", "none", "null"}:
        return "Failed"
    if any(term in combined_text for term in ["bad request", "failed", "rejected", "insufficient", "haraaga"]):
        return "Failed"
    if (
        "paid" in combined_text
        or "completed" in combined_text
        or "successful" in combined_text
        or "approved" in combined_text
    ):
        return "Completed"
    if normalized_values.intersection(pending_codes) or "accepted" in combined_text or "processing" in combined_text:
        return "Pending"
    if normalized_values.intersection(success_codes):
        return "Completed"
    return "Pending"


def extract_payment_failure_reason(response_data, fallback="Payment failed"):
    if isinstance(response_data, dict):
        for key in ["error", "message", "responseMsg", "responseMessage", "description", "reason", "statusDesc", "statusDescription"]:
            value = extract_nested(response_data, key)
            if value:
                return str(value)
    text = str(response_data or "").strip()
    return text if text and text != "{}" else fallback


def user_friendly_payment_error(reason):
    reason_text = str(reason or "").strip()
    lowered = reason_text.lower()
    if "phone" in lowered or "account" in lowered or "invalid number" in lowered:
        return "Invalid phone number."
    if "balance" in lowered or "insufficient" in lowered:
        return "Insufficient balance."
    if "timeout" in lowered or "timed out" in lowered:
        return "Merchant timeout."
    if "rcs_user_rejected" in lowered or "user_rejected" in lowered:
        return "Payment was rejected or cancelled in the merchant wallet."
    if "cancel" in lowered:
        return "Payment cancelled."
    if "network" in lowered or "connection" in lowered:
        return "Network connection problem."
    if "configuration" in lowered or "configured" in lowered:
        return "Payment provider is not configured."
    return reason_text or "Payment failed. Please try again."


def check_hormuud_payment_status(transaction_id, reference_id=None):
    status_url = app.config.get("HORMUUD_MERCHANT_STATUS_URL")
    api_key = app.config.get("HORMUUD_MERCHANT_API_KEY")
    merchant_uid = app.config.get("HORMUUD_MERCHANT_UID") or app.config.get("HORMUUD_MERCHANT_ID")
    api_user_id = app.config.get("HORMUUD_API_USER_ID")

    if not status_url or not api_key or not merchant_uid or not api_user_id:
        return None

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "schemaVersion": "1.0",
        "requestId": f"STATUS-{transaction_id}",
        "timestamp": utc_now_naive().isoformat(),
        "channelName": app.config.get("HORMUUD_CHANNEL_NAME") or "WEB",
        "serviceName": app.config.get("HORMUUD_STATUS_SERVICE_NAME") or "API_GET_TRANSACTION_INFO",
        "serviceParams": {
            "merchantUid": merchant_uid,
            "apiUserId": api_user_id,
            "apiKey": api_key,
            "transactionId": transaction_id,
            "referenceId": reference_id or transaction_id,
        },
    }

    try:
        response = requests.post(status_url, json=payload, headers=headers, timeout=20)
        response_data = response.json() if response.content else {}
        if not response.ok:
            log_info(f"Hormuud status check failed: {response.status_code} {response.text}")
            return None

        status = normalize_hormuud_status(response_data)
        return {
            "status": status,
            "reference_id": extract_nested(response_data, "referenceId") or extract_nested(response_data, "reference_id"),
            "invoice_id": extract_nested(response_data, "invoiceId") or extract_nested(response_data, "invoice_id"),
            "provider_transaction_id": extract_nested(response_data, "transactionId") or extract_nested(response_data, "providerTransactionId") or extract_nested(response_data, "provider_transaction_id"),
            "raw": response_data,
        }
    except Exception as e:
        log_info(f"Hormuud status check error: {e}")
        return None


def current_doctor_record(cur, user):
    cur.execute("SELECT id, availability_schedule FROM doctors WHERE user_id = %s", (user.get('user_id'),))
    row = cur.fetchone()
    if not row:
        return None, None
    return row[0], row[1]


def parse_availability_payload(data):
    start_date = parse_schedule_date(data.get('start_date'))
    start_time = parse_schedule_time(data.get('start_time'))
    end_time = parse_schedule_time(data.get('end_time'))
    recurrence_type = str(data.get('recurrence_type') or 'weekly').strip().lower()
    if recurrence_type in ['specific_date', 'once']:
        recurrence_type = 'one_time'
    recurrence_days = normalize_recurrence_days(data.get('recurrence_days'))
    appointment_duration = parse_slot_duration(data.get('appointment_duration_minutes') or data.get('duration_minutes') or data.get('appointment_duration'))
    if appointment_duration is None:
        return None, "Appointment duration must be 10, 15, 20, 30, 45, 60, 90, or 120 minutes."

    if recurrence_type == 'weekdays':
        recurrence_type = 'weekly'
        recurrence_days = WEEKDAY_NAMES[:5]
    elif recurrence_type == 'weekends':
        recurrence_type = 'weekly'
        recurrence_days = WEEKDAY_NAMES[5:]
    elif recurrence_type in ['daily', 'date_range']:
        recurrence_type = 'custom_days'
        recurrence_days = WEEKDAY_NAMES[:]
    elif recurrence_type == 'biweekly':
        recurrence_type = 'weekly'

    allowed_types = {'one_time', 'weekly', 'monthly', 'yearly', 'custom_days'}
    if recurrence_type not in allowed_types:
        return None, "Choose a valid recurrence: One Time, Weekly, Monthly, Yearly, or Custom Days."

    if not start_time or not end_time:
        return None, "Start time and end time are required."
    if end_time == start_time:
        return None, "End time must be greater than start time."
    if end_time < start_time:
        return None, "End time must be after start time."
    working_minutes = int((
        datetime.combine(datetime.today().date(), end_time)
        - datetime.combine(datetime.today().date(), start_time)
    ).total_seconds() / 60)
    if working_minutes < 10:
        return None, "Working hours must be at least 10 minutes."
    if working_minutes > 12 * 60:
        return None, "Working hours cannot exceed 12 hours per day."
    if working_minutes < appointment_duration:
        return None, "This duration exceeds working hours."

    today = datetime.today().date()
    metadata = parse_recurrence_metadata(data.get('recurrence_metadata'))
    end_date = parse_schedule_date(data.get('end_date'))

    if recurrence_type == 'one_time':
        if not start_date:
            return None, "Choose a date for a one-time schedule."
        if start_date < today:
            return None, "One-time schedules cannot be created in the past."
        end_date = start_date
        recurrence_days = []
        metadata = {}
    elif recurrence_type in ['weekly', 'custom_days']:
        if not recurrence_days:
            return None, "Select at least one weekday."
        start_date = start_date or today
        end_date = end_date or (start_date + timedelta(days=365))
        metadata = {}
    elif recurrence_type == 'monthly':
        try:
            day_of_month = int(data.get('day_of_month') or metadata.get('day_of_month') or (start_date.day if start_date else 0))
        except (TypeError, ValueError):
            return None, "Monthly day must be a number from 1 to 31."
        if day_of_month < 1 or day_of_month > 31:
            return None, "Monthly day must be valid from 1 to 31."
        start_date = start_date or today
        end_date = end_date or (start_date + timedelta(days=365))
        recurrence_days = []
        metadata = {'day_of_month': day_of_month}
    elif recurrence_type == 'yearly':
        try:
            yearly_month = int(data.get('yearly_month') or metadata.get('month') or (start_date.month if start_date else 0))
            yearly_day = int(data.get('yearly_day') or metadata.get('day') or (start_date.day if start_date else 0))
        except (TypeError, ValueError):
            return None, "Yearly month and day are required."
        if not is_valid_month_day(yearly_month, yearly_day):
            return None, "Yearly date must be valid. For example, February 30 is not allowed."
        start_date = start_date or today
        end_date = end_date or (start_date + timedelta(days=365))
        recurrence_days = []
        metadata = {'month': yearly_month, 'day': yearly_day}

    if not start_date or not end_date:
        return None, "Start date and end date are required."
    if start_date < today:
        return None, "This date is in the past."
    if end_date < start_date:
        return None, "End date must be after start date."
    if end_date > today + timedelta(days=365):
        return None, "Availability can only be created for the next 12 months."

    return {
        'day_of_week': recurrence_days[0] if recurrence_days else 'calendar',
        'start_date': start_date,
        'end_date': end_date,
        'start_time': start_time.strftime('%H:%M'),
        'end_time': end_time.strftime('%H:%M'),
        'recurrence_type': recurrence_type,
        'recurrence_days': ','.join(recurrence_days),
        'recurrence_metadata': json.dumps(metadata, sort_keys=True) if metadata else None,
        'timezone': str(data.get('timezone') or 'Africa/Mogadishu').strip()[:80],
        'appointment_duration_minutes': appointment_duration,
        'is_available': 1,
    }, None


def submit_doctor_review_for_current_user(appointment_id, rating, feedback):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patients can submit doctor reviews."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        rating_value = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "Rating must be a number from 1 to 5."}), 400
    if rating_value < 1 or rating_value > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400

    feedback_text = str(feedback or '').strip()
    if feedback_text and len(feedback_text) < 5:
        return jsonify({"error": "Feedback must be at least 5 characters when provided."}), 400
    if len(feedback_text) > 500:
        return jsonify({"error": "Feedback must be 500 characters or less."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_appointment_ratings_table(cur)
        ensure_doctor_reviews_table(cur)
        cur.execute(
            """
            SELECT a.id, a.user_id, a.doctor_id, a.status, d.user_id AS doctor_user_id,
                   COALESCE(d.name, a.doctor_name, 'Doctor') AS doctor_name,
                   COALESCE(u.fullname, u.username, 'Patient') AS patient_name
            FROM appointments a
            LEFT JOIN doctors d ON d.id = a.doctor_id
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = %s AND a.user_id = %s
            """,
            (appointment_id, user.get('user_id'))
        )
        appointment = cur.fetchone()
        if not appointment:
            cur.close()
            return jsonify({"error": "Appointment not found."}), 404

        _, patient_id, doctor_id, appointment_status, doctor_user_id, doctor_name, patient_name = appointment
        if str(appointment_status or '').lower() != 'completed':
            cur.close()
            return jsonify({"error": "You can review a doctor only after the appointment is completed."}), 400
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor is missing for this appointment."}), 400

        payment_ok, payment_error = payment_allows_review(cur, appointment_id)
        if not payment_ok:
            cur.close()
            return jsonify({"error": payment_error or "Payment must be completed before review."}), 400

        cur.execute("SELECT id FROM doctor_reviews WHERE appointment_id = %s", (appointment_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "This appointment has already been reviewed."}), 400

        cur.execute(
            """
            INSERT INTO doctor_reviews (appointment_id, doctor_id, patient_id, rating, feedback)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (appointment_id, doctor_id, patient_id, rating_value, feedback_text or None)
        )
        review_id = cur.lastrowid

        cur.execute(
            """
            INSERT IGNORE INTO appointment_ratings (appointment_id, user_id, doctor_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (appointment_id, patient_id, doctor_id, rating_value, feedback_text or None)
        )
        refresh_doctor_rating(cur, doctor_id)
        mysql.connection.commit()
        cur.close()

        if doctor_user_id:
            create_user_notification(
                doctor_user_id,
                f"New {rating_value}-star review received.",
                f"{patient_name} submitted feedback for your completed appointment.",
                "doctor_rating",
                reference_id=review_id,
                role_target="doctor",
            )
        create_role_notifications(
            "admin",
            f"Patient submitted feedback for Dr. {doctor_name}.",
            f"{patient_name} left a {rating_value}-star review.",
            "doctor_rating",
            reference_id=review_id,
            roles=["admin", "super_admin"],
        )

        return jsonify({
            "message": "Thank you for rating your doctor.",
            "review": {
                "id": review_id,
                "appointment_id": appointment_id,
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "rating": rating_value,
                "feedback": feedback_text,
            }
        }), 201
    except Exception as e:
        log_info(f"SUBMIT REVIEW ERROR: {e}")
        logger.exception("Unhandled backend error")
        return jsonify({"error": "Unable to submit review."}), 500


def _schema_managed_externally(*_args, **_kwargs):
    """Schema is managed in MySQL/phpMyAdmin, not by Flask request handlers."""
    return None


for _schema_helper_name in [
    "ensure_database_tables",
    "ensure_sms_tables",
    "ensure_yearly_schedule_tables",
    "ensure_reports_runtime_columns",
    "ensure_appointment_completion_columns",
    "ensure_payment_link_columns",
    "ensure_refund_requests_table",
    "ensure_appointment_ratings_table",
    "ensure_doctor_reviews_table",
]:
    if _schema_helper_name in globals():
        globals()[_schema_helper_name] = _schema_managed_externally


# =========================================================
# ERROR HANDLERS - Return proper JSON responses
# =========================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "status": 404}), 404

@app.errorhandler(500)
def internal_error(e):
    log_info(f"❌ Internal Server Error: {e}")
    return jsonify({"error": "Internal server error", "status": 500}), 500

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "Forbidden", "status": 403}), 403

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "Unauthorized", "status": 401}), 401


# Import feature repositories so their route handlers register on the internal route map.
from repositories import appointment_repository  # noqa: F401
from repositories import auth_repository  # noqa: F401
from repositories import dashboard_repository  # noqa: F401
from repositories import doctor_repository  # noqa: F401
from repositories import notification_repository  # noqa: F401
from repositories import password_repository  # noqa: F401
from repositories import patient_repository  # noqa: F401
from repositories import payment_repository  # noqa: F401
from repositories import prediction_repository  # noqa: F401
from repositories import refund_repository  # noqa: F401
from repositories import report_repository  # noqa: F401
from repositories import schedule_repository  # noqa: F401
from repositories import system_repository  # noqa: F401

ROUTE_SPECS = [
    {
        "rule": rule.rule,
        "endpoint": rule.endpoint,
        "methods": sorted(rule.methods - {"HEAD", "OPTIONS"}),
    }
    for rule in app.url_map.iter_rules()
    if rule.endpoint != "static"
]
VIEW_FUNCTIONS = dict(app.view_functions)
BEFORE_REQUEST_HANDLERS = [log_incoming_request]
AFTER_REQUEST_HANDLERS = [add_response_headers]


def _synchronize_repository_globals():
    """Keep star-imported repository globals bound to the initialized app state."""
    import sys

    shared_values = {
        "app": app,
        "mysql": mysql,
        "JWT_SECRET": app.config.get("JWT_SECRET"),
        "JWT_ALGORITHM": app.config.get("JWT_ALGORITHM"),
        "GEMINI_API_KEY": app.config.get("GEMINI_API_KEY"),
        "GEMINI_API_URL": app.config.get("GEMINI_API_URL"),
        "GEMINI_MODEL_NAME": app.config.get("GEMINI_MODEL_NAME"),
    }
    for module_name, module in list(sys.modules.items()):
        if not module_name.startswith("repositories."):
            continue
        for name, value in shared_values.items():
            if hasattr(module, name):
                setattr(module, name, value)


def init_repository(flask_app):
    """Bind repository-backed handlers to the real Flask app instance."""
    global app, mysql, JWT_SECRET, JWT_ALGORITHM, GEMINI_API_KEY, GEMINI_API_URL, GEMINI_MODEL_NAME
    app = flask_app
    JWT_SECRET = app.config.get("JWT_SECRET")
    JWT_ALGORITHM = app.config.get("JWT_ALGORITHM")
    GEMINI_API_KEY = app.config.get("GEMINI_API_KEY")
    GEMINI_API_URL = app.config.get("GEMINI_API_URL")
    GEMINI_MODEL_NAME = app.config.get("GEMINI_MODEL_NAME")
    if mysql is None:
        mysql = None
        app.logger.error("flask_mysqldb is not installed; database access is unavailable")
    else:
        mysql.init_app(app)
        app.logger.info("MySQL extension initialized")

    _synchronize_repository_globals()

    if SUPER_ADMIN_BP_AVAILABLE and mysql:
        try:
            super_admin.init_super_admin(mysql, app.config)
        except Exception as exc:
            app.logger.error("IT Management repository initialization failed: %s", exc)

    for handler in BEFORE_REQUEST_HANDLERS:
        app.before_request(handler)
    for handler in AFTER_REQUEST_HANDLERS:
        app.after_request(handler)


def get_route_specs(category=None):
    if category is None:
        return list(ROUTE_SPECS)
    return [spec for spec in ROUTE_SPECS if route_category(spec["rule"]) == category]


def route_category(rule):
    if rule.startswith(("/api/login", "/login", "/api/logout", "/logout", "/api/register", "/register", "/api/auth", "/api/forgot-password", "/api/reset-password", "/api/otp")):
        return "auth"
    if rule.startswith(("/api/doctors", "/api/doctor", "/uploads")):
        return "doctor"
    if rule.startswith(("/api/admin", "/api/super-admin", "/api/dashboard", "/api/users")):
        return "admin"
    if rule.startswith("/api/appointments"):
        return "appointment"
    if rule.startswith("/api/payments"):
        return "payment"
    if rule.startswith("/api/refunds"):
        return "refund"
    if rule.startswith(("/api/predict", "/api/history", "/api/recommendations")):
        return "prediction"
    if rule.startswith("/api/reports"):
        return "report"
    if rule.startswith("/api/notifications"):
        return "notification"
    if rule.startswith(("/api/profile", "/api/user", "/api/public")):
        return "patient"
    if rule in {"/", "/api/health"}:
        return "system"
    return "system"


def dispatch(endpoint, **kwargs):
    view = VIEW_FUNCTIONS.get(endpoint)
    if view is None:
        return jsonify({"error": "Endpoint not found"}), 404
    return view(**kwargs)


