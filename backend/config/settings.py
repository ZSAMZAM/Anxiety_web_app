"""Centralized configuration loading for the Flask backend."""

import os
from pathlib import Path


def env_value(*names, default=None):
    for name in names:
        value = os.getenv(name)
        if value is not None and value != "":
            return value
    return default


def env_int(*names, default):
    value = env_value(*names, default=str(default))
    return int(value)


def load_local_env(base_dir):
    base_path = Path(base_dir)
    env_path = base_path / ".env" if base_path.is_dir() else base_path.with_name(".env")
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


class Config:
    MYSQL_HOST = env_value("DB_HOST", "MYSQL_HOST", default="localhost")
    MYSQL_USER = env_value("DB_USER", "MYSQL_USER", default="root")
    MYSQL_PASSWORD = env_value("DB_PASSWORD", "MYSQL_PASSWORD", default="")
    MYSQL_DB = env_value("DB_NAME", "MYSQL_DB", default="anxiety_prediction(web+app))")
    MYSQL_PORT = env_int("DB_PORT", "MYSQL_PORT", default=3306)
    SUPER_ADMIN_MYSQL_DB = env_value("SUPER_ADMIN_DB_NAME", "SUPER_ADMIN_MYSQL_DB", default="super_admins")
    SUPER_ADMIN_TABLE = os.getenv("SUPER_ADMIN_TABLE", "super_admins")
    JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def apply_config(app):
    app.config.from_object(Config)
    app.config["MYSQL_HOST"] = env_value("DB_HOST", "MYSQL_HOST", default="localhost")
    app.config["MYSQL_USER"] = env_value("DB_USER", "MYSQL_USER", default="root")
    app.config["MYSQL_PASSWORD"] = env_value("DB_PASSWORD", "MYSQL_PASSWORD", default="")
    app.config["MYSQL_DB"] = env_value("DB_NAME", "MYSQL_DB", default="anxiety_prediction(web+app))")
    app.config["MYSQL_PORT"] = env_int("DB_PORT", "MYSQL_PORT", default=3306)
    app.config["SUPER_ADMIN_MYSQL_DB"] = env_value("SUPER_ADMIN_DB_NAME", "SUPER_ADMIN_MYSQL_DB", default="super_admins")
    app.config["SUPER_ADMIN_TABLE"] = os.getenv("SUPER_ADMIN_TABLE", "super_admins")
    app.config["JWT_SECRET"] = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    app.config["JWT_ALGORITHM"] = os.getenv("JWT_ALGORITHM", "HS256")
    if not app.config.get("JWT_SECRET"):
        raise RuntimeError("JWT_SECRET must be configured for production startup.")
    app.config["ENVIRONMENT"] = os.getenv("FLASK_ENV", os.getenv("ENVIRONMENT", "production"))
    app.config["PREFERRED_URL_SCHEME"] = "https"
    app.config["SESSION_COOKIE_SECURE"] = True
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    app.config["UPLOAD_DIR"] = os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parent.parent / "uploads"))
    app.config["ALLOWED_ORIGINS"] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]
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
