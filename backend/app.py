"""
Somali Mental Health Text Classification API
"""

import os
import random
import re
import json
import requests
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
try:
    from flask_mysqldb import MySQL
except Exception as e:
    MySQL = None
    print(f"⚠ Warning: flask_mysqldb import failed: {e}")
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
try:
    import joblib
except Exception as e:
    joblib = None
    print(f"⚠ Warning: joblib import failed: {e}")
import traceback

# Import IT Management Blueprint
try:
    from routes import super_admin
    SUPER_ADMIN_BP_AVAILABLE = True
except Exception as e:
    print(f"Warning: IT Management routes import failed: {e}")
    SUPER_ADMIN_BP_AVAILABLE = False

# FLASK APP

def load_local_env():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()

app = Flask(__name__)

# CORS CONFIGURATION - Allow frontend connections from Vite dev server
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type,Authorization'
app.config['CORS_SUPPORTS_CREDENTIALS'] = True

# Rate limiting for OTP requests (in-memory, simple implementation)
otp_rate_limit = {}  # {phone: [timestamp1, timestamp2, ...]}
OTP_RATE_LIMIT_WINDOW = 300  # 5 minutes
OTP_MAX_REQUESTS = 3  # Max 3 requests per 5 minutes

# Add request logging for debug and troubleshooting
@app.before_request
def log_incoming_request():
    auth_present = bool(request.headers.get('Authorization'))
    print(f"📥 Incoming request: {request.method} {request.path} from {request.remote_addr} | Authorization: {auth_present}")

# Add response headers for all routes
@app.after_request
def add_response_headers(response):
    origin = request.headers.get('Origin')
    if origin in ["http://127.0.0.1:5173", "http://localhost:5173"]:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Content-Type'] = 'application/json'
    return response

# MYSQL CONFIG

app.config["MYSQL_HOST"] = os.getenv("MYSQL_HOST", "localhost")
app.config["MYSQL_USER"] = os.getenv("MYSQL_USER", "root")
app.config["MYSQL_PASSWORD"] = os.getenv("MYSQL_PASSWORD", "")
app.config["MYSQL_DB"] = os.getenv("MYSQL_DB", "anxiety_prediction(web+app))")
app.config["MYSQL_PORT"] = int(os.getenv("MYSQL_PORT", 3306))
app.config["SUPER_ADMIN_MYSQL_DB"] = os.getenv("SUPER_ADMIN_MYSQL_DB", "super_admins")
app.config["SUPER_ADMIN_TABLE"] = os.getenv("SUPER_ADMIN_TABLE", "super_admins")
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "mindcare-secret-key")
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
app.config["OTP_DELIVERY_WEBHOOK_URL"] = os.getenv("OTP_DELIVERY_WEBHOOK_URL", "")
app.config["DEVELOPMENT_OTP_MODE"] = os.getenv("DEVELOPMENT_OTP_MODE", "false").strip().lower() == "true"

# MYSQL INIT

mysql = None

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


def ensure_database_tables():
    if not mysql:
        return
    try:
        with app.app_context():
            cur = mysql.connection.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    fullname VARCHAR(255) DEFAULT NULL,
                    email VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(20) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'user',
                    status VARCHAR(50) NOT NULL DEFAULT 'active',
                    avatar VARCHAR(500) DEFAULT NULL,
                    gender VARCHAR(50) DEFAULT NULL,
                    age INT DEFAULT NULL,
                    password_reset_token VARCHAR(255) DEFAULT NULL,
                    password_reset_expires DATETIME DEFAULT NULL,
                    phone_verified TINYINT(1) DEFAULT 0,
                    otp_code VARCHAR(10) DEFAULT NULL,
                    otp_expires DATETIME DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            # Ensure columns are present for older schema versions
            columns_to_add = [
                ("username", "VARCHAR(50) NOT NULL UNIQUE"),
                ("phone", "VARCHAR(20) NOT NULL"),
                ("avatar", "VARCHAR(500) DEFAULT NULL"),
                ("gender", "VARCHAR(50) DEFAULT NULL"),
                ("age", "INT DEFAULT NULL"),
                ("date_of_birth", "DATE DEFAULT NULL"),
                ("address", "TEXT DEFAULT NULL"),
                ("district", "VARCHAR(100) DEFAULT NULL"),
                ("city", "VARCHAR(100) DEFAULT NULL"),
                ("password_reset_token", "VARCHAR(255) DEFAULT NULL"),
                ("password_reset_expires", "DATETIME DEFAULT NULL"),
                ("phone_verified", "TINYINT(1) DEFAULT 0"),
                ("otp_code", "VARCHAR(10) DEFAULT NULL"),
                ("otp_expires", "DATETIME DEFAULT NULL"),
                ("verification_attempts", "INT DEFAULT 0"),
            ]

            # Add columns required by spec
            spec_columns_to_add = [
                ("fullname", "VARCHAR(255) DEFAULT NULL"),
            ]

            # Update phone column to VARCHAR(20) if it's smaller (for +252XXXXXXXXX format)
            cur.execute(
                "SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'",
                (app.config['MYSQL_DB'],)
            )
            phone_length = cur.fetchone()
            if phone_length and phone_length[0] < 20:
                cur.execute("ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL")
                mysql.connection.commit()
            
            for column, definition in columns_to_add:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users' AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], column)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {column} {definition}")
                    mysql.connection.commit()
            
            for column, definition in spec_columns_to_add:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users' AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], column)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {column} {definition}")
                    mysql.connection.commit()

            # Create or migrate doctors table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS doctors (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    name VARCHAR(255) NOT NULL,
                    specialization VARCHAR(255) DEFAULT NULL,
                    hospital_name VARCHAR(255) DEFAULT NULL,
                    experience VARCHAR(100) DEFAULT NULL,
                    phone VARCHAR(10) DEFAULT NULL,
                    email VARCHAR(255) DEFAULT NULL,
                    rating DECIMAL(3,1) DEFAULT 0.0,
                    status VARCHAR(50) NOT NULL DEFAULT 'Active',
                    photo VARCHAR(500) DEFAULT NULL,
                    consultation_fee DECIMAL(10,2) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            # Add missing columns to doctors table to match spec requirements
            doctors_columns_to_add = [
                ("fullname", "VARCHAR(255) DEFAULT NULL"),
                ("username", "VARCHAR(50) DEFAULT NULL"),
                ("phone", "VARCHAR(20) DEFAULT NULL"),
                ("specialization", "VARCHAR(255) DEFAULT NULL"),
                ("experience", "VARCHAR(100) DEFAULT NULL"),
                ("rating", "DECIMAL(3,1) DEFAULT 0.0"),
                ("availability_schedule", "TEXT DEFAULT NULL"),
                ("avatar", "VARCHAR(500) DEFAULT NULL"),
                ("address", "TEXT DEFAULT NULL"),
                ("district", "VARCHAR(100) DEFAULT NULL"),
                ("city", "VARCHAR(100) DEFAULT NULL"),
                ("specialty", "VARCHAR(255) DEFAULT NULL"),
                ("clinic_name", "VARCHAR(255) DEFAULT NULL"),
                ("clinic_address", "TEXT DEFAULT NULL"),
                ("experience_years", "INT DEFAULT NULL"),
                ("license_number", "VARCHAR(100) DEFAULT NULL"),
                ("bio", "TEXT DEFAULT NULL"),
            ]
            for column, definition in doctors_columns_to_add:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'doctors' AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], column)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE doctors ADD COLUMN {column} {definition}")
                    mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS doctor_availability (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    doctor_id INT NOT NULL,
                    day_of_week VARCHAR(20) NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    is_available TINYINT(1) DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    input_text TEXT,
                    cleaned_text TEXT,
                    prediction_result VARCHAR(50),
                    confidence_score FLOAT,
                    score FLOAT DEFAULT NULL,
                    anxiety_level VARCHAR(50) DEFAULT NULL,
                    recommendation TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            # Add missing columns to predictions table to match spec
            predictions_columns_to_add = [
                ("score", "FLOAT DEFAULT NULL"),
                ("anxiety_level", "VARCHAR(50) DEFAULT NULL"),
                ("recommendation", "TEXT DEFAULT NULL"),
            ]
            for column, definition in predictions_columns_to_add:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'predictions' AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], column)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE predictions ADD COLUMN {column} {definition}")
                    mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    doctor_id INT DEFAULT NULL,
                    doctor_name VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(50) DEFAULT NULL,
                    appointment_date DATE DEFAULT NULL,
                    appointment_time TIME DEFAULT NULL,
                    notes TEXT DEFAULT NULL,
                    status VARCHAR(50) DEFAULT 'Pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            # Ensure compatibility with older schemas
            table_column_checks = [
                ('appointments', 'doctor_id', 'INT DEFAULT NULL'),
                ('appointments', 'phone', 'VARCHAR(50) DEFAULT NULL'),
                ('doctors', 'consultation_fee', 'DECIMAL(10,2) DEFAULT NULL'),
                ('doctors', 'phone', 'VARCHAR(10) DEFAULT NULL'),
                ('doctors', 'user_id', 'INT DEFAULT NULL'),
                ('doctors', 'hospital_name', 'VARCHAR(255) DEFAULT NULL'),
                ('doctors', 'email', 'VARCHAR(255) DEFAULT NULL'),
            ]
            for table_name, column_name, definition in table_column_checks:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], table_name, column_name)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
                    mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    amount DECIMAL(10,2) DEFAULT NULL,
                    payment_method VARCHAR(50) DEFAULT NULL,
                    payment_status VARCHAR(50) DEFAULT 'Pending',
                    transaction_id VARCHAR(100) DEFAULT NULL,
                    reference_id VARCHAR(100) DEFAULT NULL,
                    invoice_id VARCHAR(100) DEFAULT NULL,
                    payment_phone VARCHAR(20) DEFAULT NULL,
                    currency VARCHAR(10) DEFAULT 'USD',
                    description VARCHAR(255) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS appointment_ratings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    appointment_id INT NOT NULL,
                    user_id INT NOT NULL,
                    doctor_id INT NOT NULL,
                    rating INT NOT NULL,
                    comment TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_appointment_rating (appointment_id),
                    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
                )
            """)
            mysql.connection.commit()

            # Add missing columns to payments table to match spec
            payments_columns_to_add = [
                ("reference_id", "VARCHAR(100) DEFAULT NULL"),
                ("invoice_id", "VARCHAR(100) DEFAULT NULL"),
                ("payment_phone", "VARCHAR(20) DEFAULT NULL"),
                ("currency", "VARCHAR(10) DEFAULT 'USD'"),
                ("booking_id", "INT DEFAULT NULL"),
                ("appointment_id", "INT DEFAULT NULL"),
                ("doctor_id", "INT DEFAULT NULL"),
                ("provider_name", "VARCHAR(100) DEFAULT 'WaafiPay'"),
                ("provider_transaction_id", "VARCHAR(150) DEFAULT NULL"),
                ("merchant_response", "LONGTEXT DEFAULT NULL"),
                ("paid_at", "DATETIME DEFAULT NULL"),
                ("service_status", "VARCHAR(50) DEFAULT 'Waiting'"),
                ("service_verified", "TINYINT(1) DEFAULT NULL"),
                ("service_verified_by", "INT DEFAULT NULL"),
                ("service_verified_at", "DATETIME DEFAULT NULL"),
                ("verification_notes", "TEXT DEFAULT NULL"),
                ("patient_response", "TEXT DEFAULT NULL"),
                ("refund_reason", "TEXT DEFAULT NULL"),
                ("refund_notes", "TEXT DEFAULT NULL"),
                ("refunded_by", "INT DEFAULT NULL"),
                ("refunded_at", "DATETIME DEFAULT NULL"),
            ]
            for column, definition in payments_columns_to_add:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'payments' AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], column)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE payments ADD COLUMN {column} {definition}")
                    mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS recommendations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    input_text TEXT,
                    prediction_result VARCHAR(50),
                    confidence_score FLOAT,
                    recommendation_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    title VARCHAR(255) DEFAULT NULL,
                    message TEXT DEFAULT NULL,
                    is_read TINYINT(1) DEFAULT 0,
                    notification_type VARCHAR(50) DEFAULT 'general',
                    recipient VARCHAR(255) DEFAULT NULL,
                    recipient_type VARCHAR(50) DEFAULT 'all',
                    status VARCHAR(50) DEFAULT 'Unread',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()
            # Ensure notifications table is compatible with older schemas
            notifications_columns = [
                ('notifications', 'title', 'VARCHAR(255) DEFAULT NULL'),
                ('notifications', 'is_read', 'TINYINT(1) DEFAULT 0'),
                ('notifications', 'recipient', 'VARCHAR(255) DEFAULT NULL'),
                ('notifications', 'notification_type', "VARCHAR(50) DEFAULT 'general'"),
                ('notifications', 'recipient_type', "VARCHAR(50) DEFAULT 'all'"),
            ]
            for table_name, column_name, definition in notifications_columns:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], table_name, column_name)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
                    mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    report_id VARCHAR(100) NOT NULL UNIQUE,
                    user_id INT DEFAULT NULL,
                    user_name VARCHAR(255) DEFAULT NULL,
                    doctor_id INT DEFAULT NULL,
                    doctor_name VARCHAR(255) DEFAULT NULL,
                    prediction_type VARCHAR(50) DEFAULT 'Neutral',
                    prediction_result VARCHAR(50) DEFAULT 'Neutral',
                    prediction_confidence INT DEFAULT 0,
                    confidence_score FLOAT DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'Draft',
                    report_status VARCHAR(50) DEFAULT 'Draft',
                    summary TEXT DEFAULT NULL,
                    admin_notes TEXT DEFAULT NULL,
                    report_data LONGTEXT DEFAULT NULL,
                    downloads INT DEFAULT 0,
                    exported_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
                )
            """)
            mysql.connection.commit()

            report_column_checks = [
                ('reports', 'prediction_result', "VARCHAR(50) DEFAULT 'Neutral'"),
                ('reports', 'confidence_score', 'FLOAT DEFAULT 0'),
                ('reports', 'report_status', "VARCHAR(50) DEFAULT 'Draft'"),
                ('reports', 'exported_count', 'INT DEFAULT 0'),
                ('reports', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            ]
            for table_name, column_name, definition in report_column_checks:
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (app.config['MYSQL_DB'], table_name, column_name)
                )
                if cur.fetchone()[0] == 0:
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
                    mysql.connection.commit()

            cur.execute("SELECT COUNT(*) FROM reports")
            report_count = int(cur.fetchone()[0] or 0)
            if report_count == 0:
                sample_users = []
                cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
                sample_users = cur.fetchall()
                if not sample_users:
                    sample_user_data = [
                        ('Amina Yusuf', 'amina.user@example.com'),
                        ('Mohamed Ali', 'mohamed.ali@example.com'),
                        ('Sara Abdullahi', 'sara.abdullahi@example.com'),
                        ('Hassan Omar', 'hassan.omar@example.com'),
                        ('Nadia Farah', 'nadia.farah@example.com')
                    ]
                    for fullname, email in sample_user_data:
                        cur.execute(
                            "INSERT IGNORE INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, 'user', 'Active')",
                            (fullname, email, generate_password_hash('Password@123'))
                        )
                    mysql.connection.commit()
                    cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
                    sample_users = cur.fetchall()

                prediction_options = ['Anxiety', 'Depression', 'Neutral', 'Wellness']
                status_options = ['Completed', 'Pending', 'Draft', 'Archived']
                doctor_names = ['Dr. Amina Noor', 'Dr. Yusuf Farah', 'Dr. Hana Ali', 'Dr. Abdullahi Omar']
                created_base = utc_now_naive() - timedelta(days=60)

                for idx, (user_id, user_name) in enumerate(sample_users):
                    report_id = f"RPT-{utc_now_naive().strftime('%Y%m%d')}-{1000 + idx}"
                    prediction_type = prediction_options[idx % len(prediction_options)]
                    status = status_options[idx % len(status_options)]
                    confidence = 65 + (idx * 7)
                    if confidence > 98:
                        confidence = 98
                    report_date = created_base + timedelta(days=idx * 7)
                    summary = f"This report contains a full analysis of {user_name}'s prediction data, generated to help guide follow-up care and clinical review."
                    admin_notes = f"Reviewed by admin team on {report_date.strftime('%Y-%m-%d')}. Recommended follow-up action and monitoring schedule." 
                    exported = idx * 2

                    cur.execute("""
                        INSERT INTO reports 
                        (report_id, user_id, user_name, doctor_name, prediction_type, prediction_result, prediction_confidence,
                         confidence_score, status, report_status, summary, admin_notes, report_data, downloads, exported_count, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        report_id,
                        user_id,
                        user_name,
                        doctor_names[idx % len(doctor_names)],
                        prediction_type,
                        prediction_type,
                        confidence,
                        float(confidence),
                        status,
                        status,
                        summary,
                        admin_notes,
                        json.dumps({
                            'riskLevel': prediction_type,
                            'confidence': confidence,
                            'recommendations': [
                                'Practice daily breathing exercises.',
                                'Schedule a follow-up consultation.',
                                'Track symptoms in a journal.'
                            ],
                        }),
                        exported,
                        exported,
                        report_date,
                        report_date,
                    ))
                mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    permissions VARCHAR(255) DEFAULT 'all',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            mysql.connection.commit()

            # Ensure there is exactly one admin user (Group40@gmail.com)
            admin_email = "Group40@gmail.com"
            cur.execute("SELECT id FROM users WHERE email = %s AND role = 'admin'", (admin_email,))
            admin_user = cur.fetchone()
            
            if not admin_user:
                # Check if Group40@gmail.com exists as non-admin and update it
                cur.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
                existing_user = cur.fetchone()
                
                if existing_user:
                    # Update existing user to be admin
                    user_id = existing_user[0]
                    cur.execute("UPDATE users SET role = 'admin' WHERE id = %s", (user_id,))
                else:
                    # Create new admin user
                    default_admin_password = generate_password_hash(os.getenv('DEFAULT_ADMIN_PASSWORD', 'Admin@123'))
                    cur.execute(
                        "INSERT IGNORE INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, 'admin', 'Active')",
                        ('Admin User', admin_email, default_admin_password)
                    )
                    user_id = cur.lastrowid
                
                mysql.connection.commit()
                
                # Ensure admin record exists
                cur.execute("SELECT id FROM admins WHERE user_id = %s", (user_id,))
                if not cur.fetchone():
                    cur.execute(
                        "INSERT IGNORE INTO admins (user_id, permissions) VALUES (%s, 'all')",
                        (user_id,)
                    )
                    mysql.connection.commit()

            # Create IT administrator tables
            cur.execute("""
                CREATE TABLE IF NOT EXISTS super_admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
                    status VARCHAR(50) NOT NULL DEFAULT 'active',
                    email VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(20) DEFAULT NULL,
                    fullname VARCHAR(255) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    actor VARCHAR(255) DEFAULT NULL,
                    role VARCHAR(50) DEFAULT NULL,
                    action VARCHAR(50) DEFAULT NULL,
                    description TEXT DEFAULT NULL,
                    ip_address VARCHAR(50) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(100) NOT NULL UNIQUE,
                    setting_value TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS backups (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    backup_name VARCHAR(255) NOT NULL,
                    backup_size VARCHAR(50) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS role_permissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    role_name VARCHAR(50) NOT NULL UNIQUE,
                    permissions TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS security_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action VARCHAR(50) DEFAULT NULL,
                    description TEXT DEFAULT NULL,
                    ip_address VARCHAR(50) DEFAULT NULL,
                    username VARCHAR(255) DEFAULT NULL,
                    role VARCHAR(50) DEFAULT NULL,
                    browser VARCHAR(255) DEFAULT NULL,
                    device VARCHAR(255) DEFAULT NULL,
                    platform VARCHAR(100) DEFAULT NULL,
                    status VARCHAR(50) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            mysql.connection.commit()
            for column, definition in [
                ("username", "VARCHAR(255) DEFAULT NULL"),
                ("role", "VARCHAR(50) DEFAULT NULL"),
                ("browser", "VARCHAR(255) DEFAULT NULL"),
                ("device", "VARCHAR(255) DEFAULT NULL"),
                ("platform", "VARCHAR(100) DEFAULT NULL"),
                ("status", "VARCHAR(50) DEFAULT NULL"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE security_logs ADD COLUMN {column} {definition}")
                    mysql.connection.commit()
                except Exception:
                    mysql.connection.rollback()

            # Create default IT administrator if not exists
            cur.execute("SELECT COUNT(*) FROM super_admins")
            if cur.fetchone()[0] == 0:
                default_password = generate_password_hash('SuperAdmin@123')
                cur.execute("""
                    INSERT INTO super_admins (username, password, role, status, email, fullname, phone)
                    VALUES (%s, %s, 'SUPER_ADMIN', 'active', 'Group40fourty@gmail.com', 'IT Administrator', '+252614197803')
                """, ('superadmin', default_password))
                mysql.connection.commit()
                print("Default IT administrator created: username='superadmin', password='SuperAdmin@123'")

            cur.close()
    except Exception as e:
        print(f" TABLE INIT ERROR: {e}")

try:
    mysql = MySQL(app)
    print(" MySQL connected")
    ensure_database_tables()
except Exception as e:
    print(f" MySQL failed: {e}")

# Initialize IT Management Blueprint
if SUPER_ADMIN_BP_AVAILABLE and mysql:
    try:
        super_admin.init_super_admin(mysql, app.config)
        app.register_blueprint(super_admin.super_admin_bp, url_prefix='/api/super-admin')
        print("IT Management Blueprint registered at /api/super-admin")
    except Exception as e:
        print(f"IT Management Blueprint registration failed: {e}")


# LOAD MODEL


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models"


def load_model():
    try:
        if joblib is None:
            print(" Models unavailable: joblib not installed")
            return None, None, None

        model = joblib.load(MODEL_PATH / "best_model.pkl")
        vectorizer = joblib.load(MODEL_PATH / "tfidf_vectorizer.pkl")
        label_encoder = None
        try:
            label_encoder = joblib.load(MODEL_PATH / "label_encoder.pkl")
        except Exception:
            pass

        print(" Models loaded")

        return model, vectorizer, label_encoder

    except Exception as e:
        print(f" Models failed: {e}")
        return None, None, None


model, vectorizer, label_encoder = load_model()

JWT_SECRET = app.config['JWT_SECRET']
JWT_ALGORITHM = app.config['JWT_ALGORITHM']
GEMINI_API_KEY = app.config['GEMINI_API_KEY']
GEMINI_API_URL = app.config['GEMINI_API_URL']
GEMINI_MODEL_NAME = app.config['GEMINI_MODEL_NAME']


def clean_text(text):
    text = re.sub(r"[^\w\s']", ' ', text or '')
    text = re.sub(r"\s+", ' ', text).strip().lower()
    return text


def generate_jwt(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': utc_now_naive() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid JWT token: {e}")
        return None


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
        print(f"CURRENT USER VALIDATION ERROR: {e}")
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
    return canonical_role(role) in ['admin', 'super_admin']


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
            return "Doctors are not authorized for admin portal."
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
        print(f"SECURITY LOG ERROR: {e}")
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


def create_user_notification(user_id, title, message, notification_type='general'):
    if not mysql or not user_id:
        return
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            INSERT INTO notifications
              (user_id, title, message, notification_type, recipient_type, status)
            VALUES (%s, %s, %s, %s, 'user', 'Unread')
            """,
            (user_id, title, message, notification_type)
        )
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        print(f"Notification create error: {e}")


def deliver_otp(phone, otp_code):
    webhook_url = app.config.get("OTP_DELIVERY_WEBHOOK_URL")
    if not webhook_url:
        if app.config.get("DEVELOPMENT_OTP_MODE") is True:
            return True, None, "development"
        return False, "OTP delivery service is not configured.", None
    try:
        response = requests.post(
            webhook_url,
            json={"phone": phone, "otp_code": otp_code},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=20,
        )
        if response.ok:
            return True, None, "webhook"
        return False, "OTP delivery service rejected the request.", None
    except Exception as e:
        print(f"OTP delivery error: {e}")
        return False, "Unable to deliver OTP.", None


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
            print(f"Doctor availability table error: {e}")

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
        print(f"❌ Gemini request failed: {e}")
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

# =========================================================
# ROUTES
# =========================================================

@app.route("/")
def home():
    return jsonify({
        "message": "Somali Mental Health API Running"
    })


@app.route("/api/health", methods=["GET"])
def health():

    db_ok = False

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
        "model": model is not None,
        "db": db_ok
    })


@app.route("/api/register", methods=["POST"])
@app.route("/register", methods=["POST"])
def register_user():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

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

    print("REGISTER REQUEST:", {"fullname": fullname, "username": username, "phone": phone, "gender": gender, "age": age, "date_of_birth": date_of_birth})
    print("REGISTER DATA RECEIVED:", data)

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
        
        # Check if username already exists
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Username is already taken."}), 400

        # Check if phone already exists
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "Phone number is already registered."}), 400

        if email:
            if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
                cur.close()
                return jsonify({"error": "Email address is invalid."}), 400
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                return jsonify({"error": "Email address is already registered."}), 400
        else:
            email = f"phone_{phone.replace('+', '')}@mobile.local"
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                return jsonify({"error": "Phone number is already registered."}), 400

        hashed_password = generate_password_hash(password)
        
        # Insert user with new fields - status is 'pending' until phone is verified
        cur.execute(
            """INSERT INTO users (username, fullname, phone, email, gender, age, date_of_birth, password, role, status, phone_verified) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'user', 'pending', 0)""",
            (username, fullname, phone, email, gender, age_int, dob, hashed_password)
        )
        mysql.connection.commit()
        user_id = cur.lastrowid
        cur.close()

        print("REGISTRATION SUCCESS:", {"user_id": user_id, "username": username, "phone": phone})

        return jsonify({
            "message": "Registration successful. Please verify your phone number to activate your account.",
            "user_id": user_id,
            "username": username,
            "phone": phone,
            "requires_verification": True
        }), 200
    except Exception as e:
        print(f"❌ REGISTER ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to create account."}), 500


@app.route("/api/login", methods=["POST"])
@app.route("/login", methods=["POST"])
def login_user():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    requested_platform = (
        data.get("platform")
        or data.get("requested_platform")
        or request.headers.get("X-Client-Platform")
        or ""
    )

    print("LOGIN REQUEST:", {"username": username})

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    try:
        cur = mysql.connection.cursor()
        # Select user columns and doctor specialty if available
        cur.execute("""
            SELECT u.id, u.username, u.fullname, u.phone, u.email, u.password, u.role, u.status, u.avatar, d.specialty
            FROM users u
            LEFT JOIN doctors d ON u.id = d.user_id
            WHERE u.username = %s
        """, (username,))
        row = cur.fetchone()
        cur.close()

        if not row:
            cur = mysql.connection.cursor()
            cur.execute(f"""
                SELECT id, username, password_hash, 'SUPER_ADMIN' AS role, status
                FROM {super_admin_table_name()}
                WHERE username = %s
            """, (username,))
            super_admin_row = cur.fetchone()
            cur.close()

            if not super_admin_row:
                print("USER NOT FOUND:", username)
                return jsonify({"error": "No account found for this username."}), 404

            admin_id, admin_username, admin_password, admin_role, admin_status = super_admin_row
            if not verify_stored_password(admin_password, password):
                return jsonify({"error": "Password is incorrect."}), 401
            if canonical_role(admin_role) not in ['super_admin', 'it_admin']:
                return jsonify({"error": "Access denied. IT administrator role required."}), 403
            if str(admin_status).strip().lower() != 'active':
                return jsonify({"error": "Account is not active."}), 403

            platform_denial = forbidden_for_platform('SUPER_ADMIN', requested_platform or 'web')
            if platform_denial:
                return jsonify({"error": platform_denial}), 403

            token = jwt.encode({
                'super_admin_id': admin_id,
                'user_id': admin_id,
                'username': admin_username,
                'role': 'SUPER_ADMIN',
                'exp': utc_now_naive() + timedelta(hours=24)
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)

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

        user_id, user_username, fullname, phone, email, hashed_password, user_role, status, avatar, specialty = row

        print("USER FOUND:", {"id": user_id, "username": user_username, "role": user_role, "status": status})

        password_valid = check_password_hash(hashed_password, password)
        print("PASSWORD VALID:", password_valid)

        if not password_valid:
            return jsonify({"error": "Password is incorrect."}), 401

        # Check account status (case-insensitive check)
        status_normalized = str(status).strip().lower()
        print("STATUS RAW:", status)
        print("STATUS NORMALIZED:", status_normalized)

        if status_normalized != 'active':
            if status_normalized == 'pending':
                return jsonify({"error": "Account is pending verification. Please verify your phone number to activate your account."}), 403
            print("ACCOUNT NOT ACTIVE:", status)
            return jsonify({"error": f"Account is {status}. Please contact support."}), 403

        platform_denial = forbidden_for_platform(user_role, requested_platform)
        if platform_denial:
            return jsonify({"error": platform_denial}), 403

        token = generate_jwt(user_id, user_role)

        print("LOGIN SUCCESS:", {"user_id": user_id, "role": user_role})

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
                "token": token,
            }
        }), 200
    except Exception as e:
        print(f"❌ LOGIN ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to authenticate."}), 500


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    username = data.get('username', '').strip()
    if not username:
        return jsonify({"error": "Username is required."}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, phone FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"error": "User not found."}), 404

        user_id, phone = row

        token = jwt.encode(
            {'user_id': user_id, 'exp': utc_now_naive() + timedelta(hours=1)},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE users SET password_reset_token = %s, password_reset_expires = %s WHERE id = %s",
            (token, utc_now_naive(), user_id)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Password reset token generated.", "reset_token": token})
    except Exception as e:
        print(f"❌ FORGOT PASSWORD ERROR: {e}")
        return jsonify({"error": "Unable to generate reset token."}), 500


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    token = data.get('token', '').strip()
    password = data.get('password', '').strip()

    if not token or not password:
        return jsonify({"error": "Reset token and new password are required."}), 400
    password_error = validate_password_strength(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    try:
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
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Password updated successfully."})
    except Exception as e:
        print(f"❌ RESET PASSWORD ERROR: {e}")
        return jsonify({"error": "Unable to reset password."}), 500


@app.route("/api/predict", methods=["POST"])
def predict():

    try:
        user, auth_error = require_current_user()
        if auth_error:
            return auth_error
        if canonical_role(user.get('role')) != 'user':
            return jsonify({"error": "Only patient accounts can submit anxiety assessments."}), 403

        data = request.get_json(force=True)
        text = data.get("text", "").strip()

        if not text:
            return jsonify({"error": "No text provided"}), 400

        cleaned = clean_text(text)
        prediction_label = "Unknown"
        confidence = 0.0
        class_index = None

        if model and vectorizer:
            vec = vectorizer.transform([cleaned])
            raw_pred = model.predict(vec)[0]
            try:
                proba = model.predict_proba(vec)[0]
                confidence = float(max(proba))
            except Exception:
                confidence = 0.0

            if isinstance(raw_pred, str):
                normalized = raw_pred.strip().lower()
                for idx, label in CLASS_LABELS.items():
                    if label["name"].lower() == normalized:
                        class_index = idx
                        prediction_label = label["name"]
                        break
                else:
                    prediction_label = raw_pred
            else:
                class_index = int(raw_pred)
                prediction_label = CLASS_LABELS.get(class_index, {}).get("name", str(raw_pred))

            if label_encoder is not None and class_index is None:
                try:
                    decoded = label_encoder.inverse_transform([raw_pred])[0]
                    prediction_label = decoded
                except Exception:
                    pass
        else:
            class_index = random.randint(0, 2)
            prediction_label = CLASS_LABELS[class_index]["name"]
            confidence = random.uniform(0.55, 0.95)

        if "anxiety" in prediction_label.lower():
            result_type = "anxiety"
        elif "depression" in prediction_label.lower():
            result_type = "depression"
        elif "neutral" in prediction_label.lower():
            result_type = "neutral"
        else:
            result_type = "neutral"

        if mysql:
            try:
                cur = mysql.connection.cursor()
                cur.execute(
                    "INSERT INTO predictions (user_id, input_text, cleaned_text, prediction_result, confidence_score) VALUES (%s, %s, %s, %s, %s)",
                    (
                        user.get('user_id'),
                        text,
                        cleaned,
                        prediction_label,
                        confidence,
                    )
                )
                mysql.connection.commit()
                cur.close()
            except Exception as e:
                print(f"❌ DB save error: {e}")

        return jsonify({
            "prediction": int(class_index) if class_index is not None else None,
            "class_name": prediction_label,
            "result": result_type,
            "confidence": confidence,
        })

    except Exception as e:
        print("❌ PREDICT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def history():
    if not mysql:
        return jsonify({"history": []})

    user = get_current_user()
    try:
        cur = mysql.connection.cursor()
        if user and is_admin_role(user.get('role')):
            cur.execute("""
                SELECT id, input_text, prediction_result, confidence_score, created_at
                FROM predictions
                ORDER BY created_at DESC
                LIMIT 50
            """)
        elif user and canonical_role(user.get('role')) == 'user':
            cur.execute("""
                SELECT id, input_text, prediction_result, confidence_score, created_at
                FROM predictions
                WHERE user_id = %s
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
                "result": normalized_result,
                "anxietyLevel": record.get("prediction_result"),
                "confidence": round(float(record.get("confidence_score", 0)) * 100),
                "summary": f"Detected {record.get('prediction_result')} with {round(float(record.get('confidence_score', 0)) * 100)}% confidence.",
            })

        return jsonify({"history": history})

    except Exception as e:
        print(f"❌ HISTORY ERROR: {e}")
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
        recommendations = [
            'Reach out to a trusted support system today.',
            'Book a professional appointment for detailed care.',
            'Use grounding techniques to manage acute stress.',
            'Avoid caffeine and sugar before bedtime.',
            'Keep regular sleep and hydration habits.'
        ]

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
            print(f"❌ RECOMMENDATIONS DB ERROR: {e}")

    return jsonify({
        "recommendations": recommendations,
        "source": GEMINI_API_KEY and is_low_anxiety(prediction, confidence) and gemini_output is not None and 'gemini' or 'fallback'
    })


@app.route("/api/doctors", methods=["GET"])
def get_doctors():
    if not mysql:
        return jsonify({"doctors": []})

    user = get_current_user()
    if user and canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Doctor search is available to patient accounts only."}), 403
    try:
        search = request.args.get('search', '').strip()
        status_param = request.args.get('status', '').strip().lower()

        # Build base query: select all doctor fields and include user email if available
        query = """
            SELECT d.*, u.email as email
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE 1=1
        """
        params = []

        # Status filtering: support 'active', 'inactive', 'all' (or empty)
        if status_param in ['active']:
            query += " AND UPPER(d.status) = 'ACTIVE'"
        elif status_param in ['inactive']:
            query += " AND (UPPER(d.status) = 'INACTIVE' OR UPPER(d.status) = 'DEACTIVE')"
        # else 'all' or empty -> no status filter (return all)

        # Search by name or specialization
        if search:
            query += " AND (d.name LIKE %s OR d.specialization LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])

        query += " ORDER BY d.created_at DESC"

        cur = mysql.connection.cursor()
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
                "rating": float(record.get("rating", 0)) if record.get("rating") is not None else 0,
                "status": (str(record.get("status") or '').upper()),
                "image": record.get("photo") or record.get("image"),
                "photo": record.get("photo") or record.get("image"),
                "bio": record.get("bio"),
                "availability_schedule": get_doctor_schedule(record.get("id"), record.get("availability_schedule")),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "fee": float(record.get("consultation_fee")) if record.get("consultation_fee") is not None else None,
            })

        return jsonify({"doctors": doctors})

    except Exception as e:
        print(f"❌ DOCTORS ERROR: {e}")
        return jsonify({"doctors": []}), 500


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

        # Build query with filters
        query = """
            SELECT id, fullname, email, role, status, avatar, gender, age, created_at,
                   (SELECT COUNT(*) FROM predictions WHERE user_id = users.id) as prediction_count,
                   (SELECT COUNT(*) FROM appointments WHERE user_id = users.id) as appointment_count
            FROM users
            WHERE 1=1
        """
        params = []

        if search:
            query += " AND (fullname LIKE %s OR email LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])

        if status_filter:
            query += " AND UPPER(status) = %s"
            params.append(status_filter)

        if role_filter:
            query += " AND role = %s"
            params.append(role_filter)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur = mysql.connection.cursor()
        cur.execute(query, params)
        users = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []

        # Get total count for pagination
        count_query = """
            SELECT COUNT(*) as total
            FROM users
            WHERE 1=1
        """
        count_params = []

        if search:
            count_query += " AND (fullname LIKE %s OR email LIKE %s)"
            count_params.extend([f'%{search}%', f'%{search}%'])

        if status_filter:
            count_query += " AND UPPER(status) = %s"
            count_params.append(status_filter)

        if role_filter:
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
                "name": record.get("fullname"),
                "email": record.get("email"),
                "role": record.get("role"),
                "status": record.get("status"),
                "avatar": record.get("avatar"),
                "gender": record.get("gender"),
                "age": record.get("age"),
                "createdAt": record.get("created_at").isoformat() if record.get("created_at") else None,
                "prediction_count": record.get("prediction_count", 0),
                "appointment_count": record.get("appointment_count", 0),
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
        print(f"❌ ADMIN USERS ERROR: {e}")
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
    raw_email = data.get('email')
    email = raw_email.strip().lower() if isinstance(raw_email, str) else None
    role = data.get('role', 'user').strip()
    status = data.get('status', 'Active').strip()
    password = data.get('password', '').strip() or os.getenv('DEFAULT_USER_PASSWORD', 'ChangeMe123')

    if not fullname or not email or not role:
        return jsonify({"error": "Name, email, and role are required."}), 400

    try:
        hashed_password = generate_password_hash(password)
        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, %s, %s)",
            (fullname, email, hashed_password, role, status)
        )
        mysql.connection.commit()
        user_id = cur.lastrowid
        cur.close()

        return jsonify({
            "user": {
                "id": user_id,
                "name": fullname,
                "email": email,
                "role": role,
                "status": status,
                "createdAt": utc_now_naive().isoformat(),
            }
        }), 201
    except Exception as e:
        print(f"❌ CREATE ADMIN USER ERROR: {e}")
        return jsonify({"error": "Unable to create user."}), 500


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
            SELECT id, user_id, name, specialization, experience, phone, rating, status, photo as image, created_at,
                   (SELECT COUNT(*) FROM appointments WHERE doctor_id = doctors.id) as appointment_count,
                   doctors.rating as avg_rating
            FROM doctors
            WHERE 1=1
        """
        params = []

        if search:
            query += " AND (name LIKE %s OR specialization LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])

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
                "name": record.get("name"),
                "specialization": record.get("specialization"),
                "experience": record.get("experience"),
                "phone": record.get("phone"),
                "rating": float(record.get("rating", 0)) if record.get("rating") is not None else 0,
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
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    specialization = data.get("specialization", "").strip()
    experience = data.get("experience", "").strip()
    phone = data.get("phone", "").strip()
    rating = data.get("rating", None)
    photo = data.get("photo", "").strip()

    if rating == "":
        rating = None

    if email and not password:
        return jsonify({"error": "Password is required when email is provided."}), 400

    if not name or not specialization:
        if data.get("status"):
            status = normalize_doctor_status_db(data.get("status")) or 'ACTIVE'
            try:
                cur = mysql.connection.cursor()
                cur.execute(
                    "UPDATE doctors SET status = %s WHERE id = %s",
                    (status, doctor_id)
                )
                mysql.connection.commit()
                rows_affected = cur.rowcount
                cur.close()

                if rows_affected == 0:
                    return jsonify({"error": "Doctor not found."}), 404

                return jsonify({
                    "message": "Doctor status updated successfully.",
                    "doctor": {
                        "id": doctor_id,
                        "status": status,
                    }
                })
            except Exception as e:
                print(f"❌ UPDATE DOCTOR STATUS ERROR: {e}")
                return jsonify({"error": "Unable to update doctor status."}), 500

        return jsonify({"error": "Name and specialization are required."}), 400

    try:
        cur = mysql.connection.cursor()

        user_id = None
        if email and password:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                return jsonify({"error": "Email is already registered."}), 400

            hashed_password = generate_password_hash(password)
            cur.execute(
                "INSERT INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, 'doctor', 'Active')",
                (name, email, hashed_password)
            )
            mysql.connection.commit()
            user_id = cur.lastrowid

        rating_value = float(rating) if rating is not None else 0.0
        cur.execute(
            "INSERT INTO doctors (user_id, name, specialization, experience, phone, rating, status, photo) VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE', %s)",
            (user_id, name, specialization, experience, phone, rating_value, photo)
        )
        mysql.connection.commit()
        doctor_id = cur.lastrowid
        cur.close()

        response = {
            "doctor": {
                "id": doctor_id,
                "user_id": user_id,
                "name": name,
                "specialization": specialization,
                "experience": experience,
                "phone": phone,
                "rating": float(rating) if rating is not None else 0.0,
                "status": "Active",
                "photo": photo,
            }
        }

        if user_id:
            response["user"] = {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "doctor",
                "status": "Active",
            }

        return jsonify(response), 201
    except Exception as e:
        print(f"❌ CREATE DOCTOR ERROR: {e}")
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
    specialization = data.get("specialization", "").strip()
    experience = data.get("experience", "").strip()
    rating = data.get("rating", None)
    status = normalize_doctor_status_db(data.get("status", "ACTIVE")) or 'ACTIVE'
    photo = data.get("photo", "").strip()

    if rating == "":
        rating = None

    if not name or not specialization:
        if data.get("status"):
            try:
                cur = mysql.connection.cursor()
                cur.execute(
                    "UPDATE doctors SET status = %s WHERE id = %s",
                    (status, doctor_id)
                )
                mysql.connection.commit()
                rows_affected = cur.rowcount
                cur.close()

                if rows_affected == 0:
                    return jsonify({"error": "Doctor not found."}), 404

                return jsonify({
                    "message": "Doctor status updated successfully.",
                    "doctor": {
                        "id": doctor_id,
                        "status": status,
                    }
                })
            except Exception as e:
                print(f"❌ UPDATE DOCTOR STATUS ERROR: {e}")
                return jsonify({"error": "Unable to update doctor status."}), 500

        return jsonify({"error": "Name and specialization are required."}), 400

    try:
        cur = mysql.connection.cursor()
        
        if rating is not None:
            cur.execute(
                "UPDATE doctors SET name = %s, specialization = %s, experience = %s, rating = %s, status = %s, photo = %s WHERE id = %s",
                (name, specialization, experience, float(rating), status, photo, doctor_id)
            )
        else:
            cur.execute(
                "UPDATE doctors SET name = %s, specialization = %s, experience = %s, status = %s, photo = %s WHERE id = %s",
                (name, specialization, experience, status, photo, doctor_id)
            )
        
        mysql.connection.commit()
        rows_affected = cur.rowcount
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Doctor not found."}), 404

        return jsonify({
            "message": "Doctor updated successfully.",
            "doctor": {
                "id": doctor_id,
                "name": name,
                "specialization": specialization,
                "experience": experience,
                "rating": float(rating) if rating is not None else 0.0,
                "status": status,
                "photo": photo,
            }
        })
    except Exception as e:
        print(f"❌ UPDATE DOCTOR ERROR: {e}")
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
        cur.execute("DELETE FROM doctors WHERE id = %s", (doctor_id,))
        mysql.connection.commit()
        rows_affected = cur.rowcount
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Doctor not found."}), 404

        return jsonify({"message": "Doctor deleted successfully."})
    except Exception as e:
        print(f"❌ DELETE DOCTOR ERROR: {e}")
        return jsonify({"error": "Unable to delete doctor."}), 500


# =========================================================
# ADMIN PREDICTIONS MONITORING
# =========================================================

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

        # Build query
        query = """
            SELECT p.id, p.user_id, p.input_text, p.prediction_result, p.confidence_score, p.created_at,
                   u.fullname, u.email
            FROM predictions p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        """
        params = []

        if result_filter != 'all':
            query += " AND p.prediction_result = %s"
            params.append(result_filter)

        if date_from:
            query += " AND p.created_at >= %s"
            params.append(date_from)

        if date_to:
            query += " AND p.created_at <= %s"
            params.append(date_to + ' 23:59:59')

        if confidence_min:
            query += " AND p.confidence_score >= %s"
            params.append(float(confidence_min))

        if confidence_max:
            query += " AND p.confidence_score <= %s"
            params.append(float(confidence_max))

        query += " ORDER BY p.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cur.execute(query, params)
        predictions = cur.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM predictions p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        """
        count_params = params[:-2]  # Remove limit and offset
        cur.execute(count_query, count_params)
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
                "user_email": p[7]
            } for p in predictions],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        print(f"❌ GET ADMIN PREDICTIONS ERROR: {e}")
        return jsonify({"error": "Unable to fetch predictions."}), 500


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
            GROUP BY confidence_range
        """)
        confidence_distribution = dict(cur.fetchall())

        # Get predictions by date (last 30 days)
        cur.execute("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        """)
        daily_predictions = [{"date": str(row[0]), "count": row[1]} for row in cur.fetchall()]

        # Get high-risk users (multiple high anxiety/depression predictions)
        cur.execute("""
            SELECT u.id, u.fullname, u.email, COUNT(*) as prediction_count
            FROM predictions p
            JOIN users u ON p.user_id = u.id
            WHERE p.prediction_result IN ('Anxiety', 'Depression') AND p.confidence_score > 0.7
            GROUP BY u.id, u.fullname, u.email
            HAVING prediction_count >= 3
            ORDER BY prediction_count DESC
            LIMIT 10
        """)
        high_risk_users = [{
            "id": row[0],
            "name": row[1],
            "email": row[2],
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
        print(f"❌ GET PREDICTION STATS ERROR: {e}")
        return jsonify({"error": "Unable to fetch prediction stats."}), 500


# =========================================================
# ADMIN APPOINTMENTS MANAGEMENT
# =========================================================

@app.route("/api/admin/appointments", methods=["GET"])
def get_admin_appointments():
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
        status_filter = request.args.get('status', 'all')

        # Build query
        query = """
            SELECT a.id, a.user_id, a.doctor_name, a.appointment_date, a.appointment_time, a.status, a.created_at,
                   u.fullname, u.email
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        """
        params = []

        if status_filter != 'all':
            query += " AND a.status = %s"
            params.append(status_filter)

        query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cur.execute(query, params)
        appointments = cur.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*) FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        """
        count_params = params[:-2]  # Remove limit and offset
        if status_filter != 'all':
            count_query += " AND a.status = %s"
            count_params = [status_filter]
        else:
            count_params = []

        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]

        cur.close()

        return jsonify({
            "appointments": [{
                "id": a[0],
                "user_id": a[1],
                "doctor_name": a[2],
                "appointment_date": str(a[3]) if a[3] else None,
                "appointment_time": str(a[4]) if a[4] else None,
                "status": a[5],
                "created_at": a[6].isoformat() if a[6] else None,
                "user_name": a[7],
                "user_email": a[8]
            } for a in appointments],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        print(f"❌ GET ADMIN APPOINTMENTS ERROR: {e}")
        return jsonify({"error": "Unable to fetch appointments."}), 500


@app.route("/api/admin/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment_status(appointment_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    status = data.get('status', '').strip()

    if not status:
        return jsonify({"error": "Status is required."}), 400

    valid_statuses = ['Pending', 'Approved', 'Completed', 'Cancelled']
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE appointments SET status = %s WHERE id = %s", (status, appointment_id))
        mysql.connection.commit()
        rows_affected = cur.rowcount
        cur.close()

        if rows_affected == 0:
            return jsonify({"error": "Appointment not found."}), 404

        return jsonify({"message": "Appointment status updated successfully."})
    except Exception as e:
        print(f"❌ UPDATE APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to update appointment."}), 500


@app.route("/api/doctor/appointments", methods=["GET"])
def get_doctor_appointments():
    user = get_current_user()
    if not user or user.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_user_id = user.get('user_id')
        doctor_id = user.get('doctor_id')
        cur = mysql.connection.cursor()

        if not doctor_id:
            cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (doctor_user_id,))
            doctor_row = cur.fetchone()
            if not doctor_row:
                cur.close()
                return jsonify({"error": "Active doctor profile not found."}), 403
            doctor_id = doctor_row[0]

        query = """
            SELECT a.id, a.user_id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.status, a.created_at,
                   u.fullname, u.email,
                   p.prediction_result, p.confidence_score,
                   pay.amount, pay.payment_status
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN (
                SELECT p1.user_id, p1.prediction_result, p1.confidence_score
                FROM predictions p1
                INNER JOIN (
                    SELECT user_id, MAX(created_at) AS max_created
                    FROM predictions
                    GROUP BY user_id
                ) p2 ON p1.user_id = p2.user_id AND p1.created_at = p2.max_created
            ) p ON p.user_id = a.user_id
            LEFT JOIN (
                SELECT appointment_id, MAX(amount) AS amount, MAX(payment_status) AS payment_status
                FROM payments
                GROUP BY appointment_id
            ) pay ON pay.appointment_id = a.id
            WHERE a.doctor_id = %s
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        """
        cur.execute(query, (doctor_id,))
        appointments = cur.fetchall()

        appointment_list = []
        patient_ids = set()
        upcoming_count = 0
        pending_count = 0

        for row in appointments:
            appointment = {
                "id": row[0],
                "user_id": row[1],
                "doctor_id": row[2],
                "doctor_name": row[3],
                "phone": row[4],
                "appointment_date": str(row[5]) if row[5] else None,
                "appointment_time": format_time(row[6])[:5] if row[6] else None,
                "status": row[7],
                "created_at": row[8].isoformat() if row[8] else None,
                "patient_name": row[9],
                "patient_email": row[10],
                "prediction_result": row[11],
                "prediction_confidence": float(row[12]) if row[12] is not None else None,
                "fee": float(row[13]) if row[13] is not None else 0,
                "payment_status": row[14],
            }
            appointment_list.append(appointment)
            if appointment["user_id"]:
                patient_ids.add(appointment["user_id"])

            if str(appointment["status"] or '').lower() in ['pending', 'pending payment', 'confirmed']:
                pending_count += 1
            if appointment["appointment_date"] and str(appointment["status"] or '').lower() not in ['completed', 'cancelled', 'rejected']:
                upcoming_count += 1

        summary = {
            "totalAppointments": len(appointment_list),
            "upcomingBookings": upcoming_count,
            "patientCount": len(patient_ids),
            "pendingRequests": pending_count,
        }

        cur.close()

        return jsonify({
            "summary": summary,
            "appointments": appointment_list,
        })
    except Exception as e:
        print(f"❌ GET DOCTOR APPOINTMENTS ERROR: {e}")
        return jsonify({"error": "Unable to fetch doctor appointments."}), 500


@app.route("/api/doctor/appointments/<int:appointment_id>", methods=["PUT"])
def update_doctor_appointment_status(appointment_id):
    user = get_current_user()
    if not user or user.get('role') != 'doctor':
        return jsonify({"error": "Doctor access required."}), 403

    data = request.get_json(force=True) or {}
    status = data.get('status', '').strip()

    if not status:
        return jsonify({"error": "Status is required."}), 400

    status_aliases = {
        'accept': 'Accepted',
        'accepted': 'Accepted',
        'complete': 'Completed',
        'completed': 'Completed',
        'cancel': 'Cancelled',
        'cancelled': 'Cancelled',
        'canceled': 'Cancelled',
        'reject': 'Rejected',
        'rejected': 'Rejected',
    }
    status = status_aliases.get(status.lower(), status)
    valid_statuses = ['Accepted', 'Rejected', 'Completed', 'Cancelled']
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        doctor_user_id = user.get('user_id')
        doctor_id = user.get('doctor_id')
        cur = mysql.connection.cursor()
        if not doctor_id:
            cur.execute("SELECT id FROM doctors WHERE user_id = %s AND UPPER(status) = 'ACTIVE'", (doctor_user_id,))
            row = cur.fetchone()
            if not row:
                cur.close()
                return jsonify({"error": "Active doctor profile not found."}), 403
            doctor_id = row[0]

        cur.execute(
            """
            SELECT id, doctor_id, appointment_date, appointment_time, status
            FROM appointments
            WHERE id = %s AND doctor_id = %s
            """,
            (appointment_id, doctor_id)
        )
        appointment_row = cur.fetchone()
        if not appointment_row:
            cur.close()
            return jsonify({"error": "Appointment not found or not assigned to this doctor."}), 404

        _, _, appointment_date, appointment_time, current_status = appointment_row
        current_status_normalized = str(current_status or '').strip().lower()
        if current_status_normalized == 'pending payment':
            cur.close()
            return jsonify({"error": "Appointment is pending payment and cannot be modified by doctor yet."}), 400

        appointment_date_str = str(appointment_date)
        appointment_time_str = format_time(appointment_time)[:5]
        appointment_dt = datetime.strptime(f"{appointment_date_str} {appointment_time_str}", "%Y-%m-%d %H:%M")
        if status == 'Completed' and appointment_dt > utc_now_naive():
            cur.close()
            return jsonify({"error": "Doctor cannot complete future appointments."}), 400

        cur.execute(
            "UPDATE appointments SET status = %s WHERE id = %s AND doctor_id = %s",
            (status, appointment_id, doctor_id)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Appointment status updated successfully."})
    except Exception as e:
        print(f"❌ UPDATE DOCTOR APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to update appointment."}), 500


# =========================================================
# ADMIN PAYMENTS MONITORING
# =========================================================

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
            WHERE 1=1
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
                    OR u.fullname LIKE %s OR u.phone LIKE %s OR u.email LIKE %s
                    OR d.name LIKE %s OR a.doctor_name LIKE %s
                )
            """
            params.extend([like, like, like, like, like, like, like, like])

        select_query = f"""
            SELECT p.id, p.user_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.created_at,
                   u.fullname, u.email, u.phone,
                   p.reference_id, p.invoice_id, p.provider_transaction_id, p.payment_phone, p.currency, p.description,
                   p.booking_id, p.appointment_id, p.doctor_id, COALESCE(p.provider_name, 'WaafiPay') AS provider_name,
                   p.merchant_response, p.paid_at, COALESCE(p.service_status, 'Waiting') AS service_status,
                   p.service_verified,
                   p.service_verified_by, p.service_verified_at, p.verification_notes, p.patient_response,
                   p.refund_reason, p.refund_notes, p.refunded_by, p.refunded_at,
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
            payment_rows.append({
                "id": record.get("id"),
                "payment_id": record.get("id"),
                "user_id": record.get("user_id"),
                "amount": float(record.get("amount")) if record.get("amount") is not None else 0,
                "payment_method": record.get("payment_method"),
                "payment_status": record.get("payment_status"),
                "transaction_id": record.get("transaction_id"),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None,
                "user_name": record.get("fullname"),
                "user_email": record.get("email"),
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
        print(f"❌ GET ADMIN PAYMENTS ERROR: {e}")
        return jsonify({"error": "Unable to fetch payments."}), 500


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
            GROUP BY payment_status
        """)
        status_counts = dict(cur.fetchall())

        cur.execute("""
            SELECT payment_method, COUNT(*) as count
            FROM payments
            GROUP BY payment_method
        """)
        method_counts = dict(cur.fetchall())

        cur.execute("""
            SELECT COALESCE(service_status, 'Waiting'), COUNT(*)
            FROM payments
            GROUP BY COALESCE(service_status, 'Waiting')
        """)
        service_status_counts = dict(cur.fetchall())

        cur.execute("""
            SELECT
              COALESCE(SUM(CASE WHEN payment_status = 'Completed' THEN amount ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN payment_status = 'Completed' AND DATE(COALESCE(paid_at, created_at)) = CURDATE() THEN amount ELSE 0 END), 0),
              COALESCE(SUM(CASE WHEN payment_status = 'Completed' AND YEAR(COALESCE(paid_at, created_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(paid_at, created_at)) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0),
              SUM(CASE WHEN payment_status = 'Completed' THEN 1 ELSE 0 END),
              SUM(CASE WHEN payment_status = 'Pending' THEN 1 ELSE 0 END),
              SUM(CASE WHEN payment_status = 'Failed' THEN 1 ELSE 0 END),
              SUM(CASE WHEN payment_status = 'Refunded' THEN 1 ELSE 0 END),
              COUNT(*)
            FROM payments
        """)
        summary_row = cur.fetchone()
        summary = {
            "totalRevenue": float(summary_row[0] or 0),
            "todayRevenue": float(summary_row[1] or 0),
            "monthRevenue": float(summary_row[2] or 0),
            "successfulPayments": int(summary_row[3] or 0),
            "pendingPayments": int(summary_row[4] or 0),
            "failedPayments": int(summary_row[5] or 0),
            "refundedPayments": int(summary_row[6] or 0),
            "totalTransactions": int(summary_row[7] or 0),
        }

        cur.execute("""
            SELECT DATE(COALESCE(paid_at, created_at)) as date, SUM(amount) as revenue
            FROM payments
            WHERE payment_status = 'Completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(COALESCE(paid_at, created_at))
            ORDER BY date
        """)
        daily_revenue = [{"date": str(row[0]), "revenue": float(row[1] or 0)} for row in cur.fetchall()]

        cur.execute("""
            SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m') as month, SUM(amount) as revenue
            FROM payments
            WHERE payment_status = 'Completed'
            GROUP BY DATE_FORMAT(COALESCE(paid_at, created_at), '%Y-%m')
            ORDER BY month
        """)
        monthly_revenue = [{"month": str(row[0]), "revenue": float(row[1] or 0)} for row in cur.fetchall()]

        cur.execute("""
            SELECT COALESCE(d.name, a.doctor_name, 'Unknown Doctor') as doctor_name,
                   COUNT(*) as total_consultations,
                   SUM(CASE WHEN p.payment_status = 'Completed' THEN 1 ELSE 0 END) as paid_consultations,
                   COALESCE(SUM(CASE WHEN p.payment_status = 'Completed' THEN p.amount ELSE 0 END), 0) as total_revenue
            FROM payments p
            LEFT JOIN appointments a ON a.id = COALESCE(p.appointment_id, p.booking_id)
            LEFT JOIN doctors d ON d.id = COALESCE(p.doctor_id, a.doctor_id)
            GROUP BY COALESCE(d.name, a.doctor_name, 'Unknown Doctor')
            ORDER BY total_revenue DESC
        """)
        doctor_revenue = [{
            "doctorName": row[0],
            "totalConsultations": int(row[1] or 0),
            "paidConsultations": int(row[2] or 0),
            "totalRevenue": float(row[3] or 0),
        } for row in cur.fetchall()]

        cur.execute("""
            SELECT COALESCE(payment_method, 'Unknown') as payment_method, SUM(amount) as revenue
            FROM payments
            WHERE payment_status = 'Completed'
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
        print(f"❌ GET PAYMENT STATS ERROR: {e}")
        return jsonify({"error": "Unable to fetch payment stats."}), 500


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
        print(f"UPDATE PAYMENT SERVICE STATUS ERROR: {e}")
        traceback.print_exc()
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
    if decision not in ['approve', 'reject']:
        return jsonify({"error": "Refund decision must be approve or reject."}), 400
    if not reason:
        return jsonify({"error": "Refund reason is required."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        cur.execute(
            """
            SELECT p.id, p.user_id, p.doctor_id, p.payment_status, COALESCE(p.service_status, 'Waiting')
            FROM payments p
            WHERE p.id = %s
            """,
            (payment_id,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Payment not found."}), 404
        _, patient_id, doctor_id, payment_status, old_service_status = row

        if payment_status != 'Completed':
            cur.close()
            return jsonify({"error": "Cannot refund unpaid transactions."}), 400
        if old_service_status == 'Refunded':
            cur.close()
            return jsonify({"error": "Payment has already been refunded."}), 400

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

        cur.execute(
            """
            UPDATE payments
            SET payment_status = 'Refunded',
                service_status = 'Refunded',
                refund_reason = %s,
                refund_notes = %s,
                refunded_by = %s,
                refunded_at = NOW()
            WHERE id = %s
            """,
            (reason, notes or None, admin_user.get('user_id'), payment_id)
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
                "action": "PAYMENT_REFUNDED",
                "old": payment_status,
                "new": "Refunded",
                "reason": reason,
                "notes": notes,
                "date": utc_now_naive().isoformat(),
            })
        )
        create_user_notification(patient_id, "Refund processed", "Your payment refund has been processed.", "refund_processed")
        if doctor_id:
            try:
                cur = mysql.connection.cursor()
                cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                doctor_user_row = cur.fetchone()
                cur.close()
                if doctor_user_row:
                    create_user_notification(doctor_user_row[0], "Payment refunded", "A consultation payment was refunded by admin.", "payment_refunded")
            except Exception:
                pass

        return jsonify({"message": "Refund processed successfully."})
    except Exception as e:
        print(f"REFUND PAYMENT ERROR: {e}")
        traceback.print_exc()
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
        print(f"GET PAYMENT AUDIT HISTORY ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch payment audit history."}), 500


# =========================================================
# ADMIN NOTIFICATIONS MANAGEMENT
# =========================================================

@app.route("/api/admin/notifications", methods=["GET"])
def get_admin_notifications():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        print('DEBUG: GET /api/admin/notifications args:', request.args.to_dict())
        cur = mysql.connection.cursor()

        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        type_filter = request.args.get('type', 'all')
        read_filter = request.args.get('read', 'all')

        # Build query
        query = """
            SELECT n.id, n.user_id, n.recipient, n.message, n.notification_type, n.recipient_type, n.status, n.created_at,
                   u.fullname, u.email
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE 1=1
        """
        params = []

        if type_filter != 'all':
            query += " AND n.notification_type = %s"
            params.append(type_filter)

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
            WHERE 1=1
        """
        count_params = []
        if type_filter != 'all':
            count_query += " AND n.notification_type = %s"
            count_params.append(type_filter)
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
                "recipient": n[2] or n[8] or n[9] or 'All Users',
                "message": n[3],
                "type": n[4] or 'general',
                "recipient_type": n[5] or 'all',
                "status": n[6],
                "created_at": n[7].isoformat() if n[7] else None,
                "user_name": n[8],
                "user_email": n[9]
            } for n in notifications],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        print(f"❌ GET ADMIN NOTIFICATIONS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch notifications."}), 500


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
        print(f"❌ CREATE NOTIFICATION JSON ERROR: {parse_error}")
        return jsonify({"error": "Invalid JSON payload."}), 400
    data = data or {}
    print('DEBUG: POST /api/admin/notifications body:', data)
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
        for user_row in user_rows:
            recipient = user_row[1] or 'All Users'
            cur.execute(
                "INSERT INTO notifications (user_id, recipient, message, notification_type, recipient_type) VALUES (%s, %s, %s, %s, %s)",
                (user_row[0], recipient, message, notification_type, recipient_type)
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
        print(f"❌ CREATE NOTIFICATION ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to send notification."}), 500


# =========================================================
# USER NOTIFICATIONS
# =========================================================

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
        cur.execute("SELECT id, user_id, title, recipient, message, notification_type, status, created_at FROM notifications WHERE user_id = %s ORDER BY created_at DESC", (user.get('user_id'),))
        rows = cur.fetchall()
        columns = [c[0] for c in cur.description] if cur.description else []
        cur.close()

        notifications = []
        for row in rows or []:
            record = dict(zip(columns, row))
            notifications.append({
                "id": record.get('id'),
                "user_id": record.get('user_id'),
                "title": record.get('title') or record.get('notification_type') or 'Notification',
                "recipient": record.get('recipient'),
                "message": record.get('message'),
                "type": record.get('notification_type') or 'general',
                "status": record.get('status') or 'Unread',
                "is_read": str(record.get('status') or 'Unread').lower() == 'read',
                "created_at": record.get('created_at').isoformat() if record.get('created_at') else None,
            })

        return jsonify({"notifications": notifications})
    except Exception as e:
        print(f"❌ GET USER NOTIFICATIONS ERROR: {e}")
        traceback.print_exc()
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
        cur.execute("UPDATE notifications SET status = 'Read' WHERE id = %s AND user_id = %s", (notification_id, user.get('user_id')))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        if rows == 0:
            return jsonify({"error": "Notification not found or access denied."}), 404
        return jsonify({"message": "Notification marked as read."})
    except Exception as e:
        print(f"❌ MARK NOTIFICATION READ ERROR: {e}")
        traceback.print_exc()
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
        cur.execute("UPDATE notifications SET status = 'Unread' WHERE id = %s AND user_id = %s", (notification_id, user.get('user_id')))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        if rows == 0:
            return jsonify({"error": "Notification not found or access denied."}), 404
        return jsonify({"message": "Notification marked as unread."})
    except Exception as e:
        print(f"❌ MARK NOTIFICATION UNREAD ERROR: {e}")
        traceback.print_exc()
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
        cur.execute("UPDATE notifications SET status = 'Read' WHERE user_id = %s AND status != 'Read'", (user.get('user_id'),))
        mysql.connection.commit()
        rows = cur.rowcount
        cur.close()
        return jsonify({"message": f"{rows} notifications marked as read."})
    except Exception as e:
        print(f"❌ MARK ALL READ ERROR: {e}")
        traceback.print_exc()
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
        print(f"❌ DELETE NOTIFICATION ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to delete notification."}), 500


# =========================================================
# ADMIN ANALYTICS & REPORTS
# =========================================================

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
            GROUP BY month
            ORDER BY month
        """)
        user_growth = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Prediction trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        prediction_trends = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Appointment trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM appointments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        appointment_trends = [{"month": row[0], "count": row[1]} for row in cur.fetchall()]

        # Revenue trends (last 12 months)
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as revenue
            FROM payments
            WHERE payment_status = 'Completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        revenue_trends = [{"month": row[0], "revenue": float(row[1]) if row[1] else 0} for row in cur.fetchall()]

        # Anxiety trends over time
        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM predictions
            WHERE prediction_result = 'Anxiety' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
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
        print(f"❌ GET ADMIN ANALYTICS ERROR: {e}")
        return jsonify({"error": "Unable to fetch analytics."}), 500


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
        cur.execute("SELECT COUNT(*) FROM predictions")
        total_predictions = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM users")
        total_users = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM doctors")
        total_doctors = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM appointments")
        total_appointments = int(cur.fetchone()[0] or 0)

        # Prediction result counts
        cur.execute("SELECT prediction_result, COUNT(*) as count FROM predictions GROUP BY prediction_result")
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
        print(f"❌ DASHBOARD STATS ERROR: {e}")
        return jsonify({"error": "Unable to fetch dashboard stats."}), 500


@app.route("/api/prediction-distribution", methods=["GET"])
def prediction_distribution():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT prediction_result, COUNT(*) FROM predictions GROUP BY prediction_result")
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
        print(f"❌ PREDICTION DISTRIBUTION ERROR: {e}")
        return jsonify({"anxiety": 0, "depression": 0, "neutral": 0}), 500


# =========================================================
# ADMIN REPORTS API
# =========================================================

@app.route("/api/reports", methods=["GET"])
@app.route("/api/admin/reports", methods=["GET"])
def get_admin_reports():
    """Get list of reports with filtering, searching, and pagination"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '').strip()
        prediction_type = request.args.get('type', '').strip()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))
        offset = (page - 1) * limit

        cur = mysql.connection.cursor()

        # Build WHERE clause
        where_clauses = []
        params = []

        if search:
            where_clauses.append("(report_id LIKE %s OR user_name LIKE %s OR doctor_name LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if prediction_type:
            where_clauses.append("prediction_type = %s")
            params.append(prediction_type)

        if start_date:
            where_clauses.append("DATE(created_at) >= %s")
            params.append(start_date)

        if end_date:
            where_clauses.append("DATE(created_at) <= %s")
            params.append(end_date)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Get total count
        count_sql = f"SELECT COUNT(*) FROM reports WHERE {where_sql}"
        cur.execute(count_sql, params)
        total = int(cur.fetchone()[0])

        # Get reports
        reports_sql = f"""
            SELECT id, report_id, user_id, user_name, doctor_id, doctor_name,
                   prediction_type, prediction_result, prediction_confidence, confidence_score,
                   status, report_status, summary, admin_notes, downloads, exported_count,
                   created_at, updated_at
            FROM reports
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        cur.execute(reports_sql, params)

        reports = []
        for row in cur.fetchall():
            reports.append({
                "id": row[0],
                "report_id": row[1],
                "user_id": row[2],
                "user_name": row[3],
                "doctor_id": row[4],
                "doctor_name": row[5],
                "prediction_type": row[6],
                "prediction_result": row[7],
                "prediction_confidence": row[8],
                "confidence_score": row[9],
                "status": row[10],
                "report_status": row[11],
                "summary": row[12],
                "admin_notes": row[13],
                "downloads": row[14],
                "exported_count": row[15],
                "created_at": str(row[16]) if row[16] else None,
                "updated_at": str(row[17]) if row[17] else None,
            })

        cur.close()

        return jsonify({
            "reports": reports,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })

    except Exception as e:
        print(f"❌ GET ADMIN REPORTS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch reports."}), 500


@app.route("/api/reports/<int:report_id>", methods=["GET"])
@app.route("/api/admin/reports/<int:report_id>", methods=["GET"])
def get_admin_report_details(report_id):
    """Get detailed information for a specific report"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, report_id, user_id, user_name, doctor_id, doctor_name,
                   prediction_type, prediction_result, prediction_confidence, confidence_score,
                   status, report_status, summary, admin_notes, report_data, downloads, exported_count,
                   created_at, updated_at
            FROM reports
            WHERE id = %s
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        report = {
            "id": row[0],
            "report_id": row[1],
            "user_id": row[2],
            "user_name": row[3],
            "doctor_id": row[4],
            "doctor_name": row[5],
            "prediction_type": row[6],
            "prediction_result": row[7],
            "prediction_confidence": row[8],
            "confidence_score": row[9],
            "status": row[10],
            "report_status": row[11],
            "summary": row[12],
            "admin_notes": row[13],
            "report_data": json.loads(row[14]) if row[14] else None,
            "downloads": row[15],
            "exported_count": row[16],
            "created_at": str(row[17]) if row[17] else None,
            "updated_at": str(row[18]) if row[18] else None,
        }

        cur.close()
        return jsonify({"report": report})

    except Exception as e:
        print(f"❌ GET REPORT DETAILS ERROR: {e}")
        return jsonify({"error": "Unable to fetch report details."}), 500


@app.route("/api/admin/reports/<int:report_id>/export/pdf", methods=["GET"])
def export_report_pdf(report_id):
    """Export a report as PDF"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT report_id, user_name, prediction_type, prediction_confidence,
                   status, summary, admin_notes, doctor_name, created_at
            FROM reports
            WHERE id = %s
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        # Update download and exported count
        cur.execute("UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s", (report_id,))
        mysql.connection.commit()
        cur.close()

        # Generate PDF content as formatted text
        pdf_content = f"""
ANXIETY PREDICTION SYSTEM - REPORT
===================================
Report ID: {row[0]}
Generated Date: {row[8]}

USER INFORMATION
----------------
Name: {row[1]}
Status: {row[4]}

PREDICTION DETAILS
------------------
Prediction Type: {row[2]}
Confidence Score: {row[3]}%
Doctor: {row[7] or 'Not Assigned'}

REPORT SUMMARY
--------------
{row[5] or 'No summary available'}

ADMIN NOTES
-----------
{row[6] or 'No notes available'}

===================================
End of Report
"""
        
        # For now, return as text/plain that can be saved as PDF
        # In production, you'd use a library like reportlab or wkhtmltopdf
        response = app.make_response(pdf_content)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.pdf'
        return response

    except Exception as e:
        print(f"❌ EXPORT REPORT PDF ERROR: {e}")
        return jsonify({"error": "Unable to export report as PDF."}), 500


@app.route("/api/admin/reports/<int:report_id>/export/csv", methods=["GET"])
def export_report_csv(report_id):
    """Export a report as CSV"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT report_id, user_name, prediction_type, prediction_confidence,
                   status, summary, admin_notes, doctor_name, created_at
            FROM reports
            WHERE id = %s
        """, (report_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Report not found."}), 404

        # Update download and exported count
        cur.execute("UPDATE reports SET downloads = downloads + 1, exported_count = exported_count + 1 WHERE id = %s", (report_id,))
        mysql.connection.commit()
        cur.close()

        # Generate CSV content
        csv_content = "Field,Value\n"
        csv_content += f"Report ID,{row[0]}\n"
        csv_content += f"User Name,{row[1]}\n"
        csv_content += f"Prediction Type,{row[2]}\n"
        csv_content += f"Confidence Score,{row[3]}%\n"
        csv_content += f"Status,{row[4]}\n"
        csv_content += f"Doctor,{row[7] or 'Not Assigned'}\n"
        csv_content += f"Created Date,{row[8]}\n"
        csv_content += f"Summary,\"{row[5] or 'No summary available'}\"\n"
        csv_content += f"Admin Notes,\"{row[6] or 'No notes available'}\"\n"

        response = app.make_response(csv_content)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=report-{report_id}.csv'
        return response

    except Exception as e:
        print(f"❌ EXPORT REPORT CSV ERROR: {e}")
        return jsonify({"error": "Unable to export report as CSV."}), 500


@app.route("/api/admin/reports", methods=["POST"])
@app.route("/api/reports", methods=["POST"])
def create_sample_reports():
    """Create sample reports for testing (admin only)"""
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
        users = cur.fetchall()

        if not users:
            sample_user_data = [
                ('Amina Yusuf', 'amina.user@example.com'),
                ('Mohamed Ali', 'mohamed.ali@example.com'),
                ('Sara Abdullahi', 'sara.abdullahi@example.com'),
                ('Hassan Omar', 'hassan.omar@example.com'),
                ('Nadia Farah', 'nadia.farah@example.com')
            ]
            for fullname, email in sample_user_data:
                cur.execute(
                    "INSERT IGNORE INTO users (fullname, email, password, role, status) VALUES (%s, %s, %s, 'user', 'Active')",
                    (fullname, email, generate_password_hash('Password@123'))
                )
            mysql.connection.commit()
            cur.execute("SELECT id, fullname FROM users WHERE role = 'user' LIMIT 8")
            users = cur.fetchall()

        prediction_types = ['Anxiety', 'Depression', 'Neutral', 'Wellness']
        statuses = ['Completed', 'Draft', 'Pending', 'Archived']
        doctor_names = ['Dr. Amina Noor', 'Dr. Yusuf Farah', 'Dr. Hana Ali', 'Dr. Abdullahi Omar']

        created_reports = []

        for idx, (user_id, user_name) in enumerate(users):
            report_id = f"RPT-{datetime.now().strftime('%Y%m%d')}-{1000 + idx}"
            prediction_type = prediction_types[idx % len(prediction_types)]
            status = statuses[idx % len(statuses)]
            confidence = min(98, 60 + idx * 8)
            report_date = utc_now_naive() - timedelta(days=idx * 4)

            summary = f"Prediction analysis for {user_name}. This report contains detailed insights into the detected {prediction_type.lower()} patterns based on the assessment results."
            admin_notes = f"Reviewed on {report_date.strftime('%Y-%m-%d')}. Recommendation: Monitor closely."
            report_data = json.dumps({
                'riskLevel': prediction_type,
                'confidence': confidence,
                'recommendations': [
                    'Practice daily breathing exercises.',
                    'Schedule a follow-up consultation.',
                    'Track symptoms in a wellness journal.'
                ]
            })
            exported = idx * 3

            cur.execute("""
                INSERT INTO reports 
                (report_id, user_id, user_name, doctor_name, prediction_type, prediction_result,
                 prediction_confidence, confidence_score, status, report_status, summary,
                 admin_notes, report_data, downloads, exported_count, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                report_id,
                user_id,
                user_name,
                doctor_names[idx % len(doctor_names)],
                prediction_type,
                prediction_type,
                confidence,
                float(confidence),
                status,
                status,
                summary,
                admin_notes,
                report_data,
                exported,
                exported,
                report_date,
                report_date,
            ))

            created_reports.append({
                "id": cur.lastrowid,
                "report_id": report_id,
                "user_name": user_name,
                "prediction_type": prediction_type,
                "status": status
            })

        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": f"Created {len(created_reports)} sample reports",
            "reports": created_reports
        })

    except Exception as e:
        print(f"❌ CREATE SAMPLE REPORTS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to create sample reports."}), 500


@app.route("/api/reports/stats", methods=["GET"])
@app.route("/api/admin/reports/stats", methods=["GET"])
def get_report_stats():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT COUNT(*) FROM reports")
        total = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'Completed'")
        completed = int(cur.fetchone()[0] or 0)

        cur.execute("SELECT AVG(confidence_score) FROM reports")
        avg_confidence = float(cur.fetchone()[0] or 0)

        cur.execute("SELECT SUM(exported_count) FROM reports")
        export_count = int(cur.fetchone()[0] or 0)

        cur.close()

        return jsonify({
            "totalReports": total,
            "generatedReports": completed,
            "predictionAccuracy": round(avg_confidence),
            "exportDownloads": export_count,
        })
    except Exception as e:
        print(f"❌ GET REPORT STATS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch report stats."}), 500


@app.route("/api/reports/charts", methods=["GET"])
@app.route("/api/admin/reports/charts", methods=["GET"])
def get_report_charts():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()

        cur.execute("""
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
            FROM reports
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY month
            ORDER BY month
        """)
        monthly_activity = [{"month": row[0], "count": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT prediction_result, COUNT(*) AS count
            FROM reports
            GROUP BY prediction_result
        """)
        prediction_trends = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT user_name, COUNT(*) AS count
            FROM reports
            GROUP BY user_name
            ORDER BY count DESC
            LIMIT 6
        """)
        user_analytics = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.execute("""
            SELECT prediction_type, COUNT(*) AS count
            FROM reports
            GROUP BY prediction_type
        """)
        mental_health_stats = [{"name": row[0] or 'Unknown', "value": int(row[1])} for row in cur.fetchall()]

        cur.close()

        return jsonify({
            "monthlyActivity": monthly_activity,
            "predictionTrends": prediction_trends,
            "userAnalytics": user_analytics,
            "mentalHealthStats": mental_health_stats,
        })
    except Exception as e:
        print(f"❌ GET REPORT CHARTS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch report charts."}), 500


@app.route("/api/reports/export/pdf", methods=["POST"])
@app.route("/api/admin/reports/export/pdf", methods=["POST"])
def export_report_pdf_post():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    report_id = data.get('report_id')
    if not report_id:
        return jsonify({"error": "report_id is required."}), 400

    try:
        return export_report_pdf(int(report_id))
    except Exception as e:
        print(f"❌ EXPORT REPORT PDF POST ERROR: {e}")
        return jsonify({"error": "Unable to export report as PDF."}), 500


@app.route("/api/reports/export/csv", methods=["POST"])
@app.route("/api/admin/reports/export/csv", methods=["POST"])
def export_report_csv_post():
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    report_id = data.get('report_id')
    if not report_id:
        return jsonify({"error": "report_id is required."}), 400

    try:
        return export_report_csv(int(report_id))
    except Exception as e:
        print(f"❌ EXPORT REPORT CSV POST ERROR: {e}")
        return jsonify({"error": "Unable to export report as CSV."}), 500


@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
def update_user_status(user_id):
    user = get_current_user()
    if not user or not is_admin_role(user.get('role')):
        return jsonify({"error": "Admin access required."}), 403

    data = request.get_json(force=True) or {}
    
    # Check if this is a full user update or just status update
    if 'name' in data or 'email' in data or 'role' in data:
        # Full user update
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
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
            if email:
                update_fields.append("email = %s")
                update_values.append(email)
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
            print(f"❌ UPDATE USER ERROR: {e}")
            traceback.print_exc()
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
            print(f"❌ UPDATE USER STATUS ERROR: {e}")
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
        print(f"❌ DELETE USER ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to delete user."}), 500


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patient accounts can book appointments."}), 403

    data = request.get_json(force=True) or {}
    doctor_id = data.get('doctor_id')
    doctor_name = data.get('doctor_name', '').strip()
    phone = data.get('phone', '').strip()
    appointment_date = data.get('appointment_date', '').strip()
    appointment_time = data.get('appointment_time', '').strip()
    notes = data.get('notes', '').strip()

    if doctor_id and not doctor_name:
        try:
            lookup_cur = mysql.connection.cursor()
            lookup_cur.execute("SELECT name FROM doctors WHERE id = %s", (doctor_id,))
            row = lookup_cur.fetchone()
            lookup_cur.close()
            if row:
                doctor_name = row[0]
        except Exception:
            doctor_name = doctor_name

    if not doctor_id and not doctor_name:
        return jsonify({"error": "Doctor selection is required."}), 400

    if not phone:
        return jsonify({"error": "Phone number is required."}), 400

    if not appointment_date or not appointment_time:
        return jsonify({"error": "Date and time are required."}), 400

    try:
        appointment_date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid appointment date format."}), 400

    if appointment_date_obj < datetime.today().date():
        return jsonify({"error": "You cannot select a past date. Please choose today or a future date."}), 400

    try:
        appointment_time_obj = datetime.strptime(appointment_time, '%H:%M').time()
    except ValueError:
        return jsonify({"error": "Invalid appointment time format. Use HH:MM."}), 400

    if appointment_date_obj == datetime.today().date() and appointment_time_obj <= datetime.now().time():
        return jsonify({"error": "You cannot select a past time. Please choose a future time slot."}), 400

    try:
        cur = mysql.connection.cursor()

        # Check if doctor exists and get their availability schedule
        if doctor_id:
            cur.execute("SELECT id, name, specialty, rating, availability_schedule, consultation_fee, status FROM doctors WHERE id = %s", (doctor_id,))
        else:
            cur.execute("SELECT d.id, d.name, d.specialty, d.rating, d.availability_schedule, d.consultation_fee, d.status FROM doctors d WHERE d.name = %s", (doctor_name,))
        
        doctor_info = cur.fetchone()
        if not doctor_info:
            cur.close()
            return jsonify({"error": "Doctor not found."}), 404

        doctor_id, db_doctor_name, specialty, rating, availability_schedule, consultation_fee, doctor_status = doctor_info
        doctor_name = db_doctor_name or doctor_name
        if str(doctor_status or '').strip().upper() != 'ACTIVE':
            cur.close()
            return jsonify({"error": "Doctor is inactive and cannot be booked."}), 400

        schedule = get_doctor_schedule(doctor_id, availability_schedule)
        day_of_week = appointment_date_obj.strftime('%A').lower()
        if not schedule or day_of_week not in schedule:
            cur.close()
            return jsonify({"error": f"Doctor is not available on {day_of_week}. Please check their schedule."}), 400

        day_schedule = schedule[day_of_week]
        if not day_schedule.get('available', False):
            cur.close()
            return jsonify({"error": f"Doctor is not available on {day_of_week}."}), 400

        available_slots = day_schedule.get('slots', [])
        slot_available = False
        for slot in available_slots:
            try:
                slot_start = datetime.strptime(slot['start'], '%H:%M').time()
                slot_end = datetime.strptime(slot['end'], '%H:%M').time()
            except Exception:
                continue
            if slot_start <= appointment_time_obj < slot_end:
                slot_available = True
                break

        if not slot_available:
            cur.close()
            return jsonify({"error": "Selected time slot is not available. Please check the doctor's schedule."}), 400

        # Check for double booking - prevent booking the same doctor at the same date and time
        cur.execute(
            "SELECT id FROM appointments WHERE doctor_id = %s AND appointment_date = %s AND appointment_time = %s AND status != 'Cancelled' AND status != 'Rejected'",
            (doctor_id, appointment_date, appointment_time)
        )
        existing_appointment = cur.fetchone()
        if existing_appointment:
            cur.close()
            return jsonify({"error": "This time slot is already booked. Please choose a different time."}), 400

        # Create the appointment
        cur.execute(
            "INSERT INTO appointments (user_id, doctor_id, doctor_name, phone, appointment_date, appointment_time, notes, status) VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending Payment')",
            (user.get('user_id'), doctor_id, doctor_name, phone, appointment_date, appointment_time, notes)
        )
        mysql.connection.commit()
        appointment_id = cur.lastrowid
        cur.close()

        create_user_notification(
            user.get('user_id'),
            "Appointment created",
            "Your appointment is pending payment.",
            "appointment_created",
        )

        return jsonify({
            "appointment": {
                "id": appointment_id,
                "doctorId": doctor_id,
                "doctor_id": doctor_id,
                "doctorName": doctor_name,
                "doctor_name": doctor_name,
                "phone": phone,
                "date": appointment_date,
                "appointment_date": appointment_date,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "notes": notes,
                "status": "Pending Payment",
                "fee": float(consultation_fee) if consultation_fee is not None else 5.0,
            }
        })
    except Exception as e:
        print(f"❌ CREATE APPOINTMENT ERROR: {e}")
        return jsonify({"error": "Unable to book appointment."}), 500


@app.route("/api/doctors/<int:doctor_id>/availability", methods=["GET"])
def get_doctor_availability(doctor_id):
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            SELECT d.id, d.name, d.specialization, d.specialty, d.hospital_name,
                   d.clinic_name, d.clinic_address, d.address, d.district, d.city,
                   d.experience, d.experience_years, d.consultation_fee, d.rating,
                   d.photo, d.avatar, d.bio, d.availability_schedule,
                   u.fullname, u.avatar
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = %s
            """,
            (doctor_id,)
        )
        doctor_info = cur.fetchone()
        cur.close()

        if not doctor_info:
            return jsonify({"error": "Doctor not found."}), 404

        (
            doctor_id,
            doctor_name,
            specialization,
            specialty,
            hospital_name,
            clinic_name,
            clinic_address,
            address,
            district,
            city,
            experience,
            experience_years,
            consultation_fee,
            rating,
            photo,
            doctor_avatar,
            bio,
            availability_schedule,
            user_fullname,
            user_avatar,
        ) = doctor_info
        schedule = get_doctor_schedule(doctor_id, availability_schedule)

        # Get existing appointments to show booked slots
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT appointment_date, appointment_time FROM appointments WHERE doctor_id = %s AND appointment_date >= CURDATE() AND status NOT IN ('Cancelled', 'Rejected')",
            (doctor_id,)
        )
        booked_slots = cur.fetchall()
        cur.close()

        booked_slots_list = [
            {
                "date": str(slot[0]),
                "appointment_date": str(slot[0]),
                "time": format_time(slot[1])[:5] if slot[1] else None,
                "appointment_time": format_time(slot[1])[:5] if slot[1] else None,
            }
            for slot in booked_slots
        ]
        doctor_fee = float(consultation_fee) if consultation_fee is not None else None
        doctor_rating = float(rating) if rating is not None else 0.0
        doctor_experience = experience_years if experience_years is not None else experience

        return jsonify({
            "doctor": {
                "id": doctor_id,
                "name": doctor_name or user_fullname,
                "specialty": specialty or specialization,
                "specialization": specialization or specialty,
                "hospital": hospital_name or clinic_name,
                "hospital_name": hospital_name,
                "clinic_name": clinic_name,
                "location": clinic_address or address,
                "clinic_address": clinic_address,
                "address": address,
                "district": district,
                "city": city,
                "experience": doctor_experience,
                "experience_years": experience_years,
                "consultation_fee": doctor_fee,
                "fee": doctor_fee,
                "rating": doctor_rating,
                "photo": photo or doctor_avatar or user_avatar,
                "avatar": doctor_avatar or user_avatar,
                "bio": bio,
                "availability_schedule": schedule,
                "availabilitySchedule": schedule,
                "schedule": schedule,
            },
            "booked_slots": booked_slots_list
        })
    except Exception as e:
        print(f"❌ GET DOCTOR AVAILABILITY ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch doctor availability."}), 500


@app.route("/api/payments", methods=["POST"])
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
    currency = str(data.get('currency') or 'USD')

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

    try:
        booking_row = None
        doctor_id = None
        doctor_user_id = None
        cur = mysql.connection.cursor()
        ensure_payment_link_columns(cur)
        if booking_id:
            cur.execute(
                """
                SELECT a.id, a.user_id, a.doctor_id, a.status, d.consultation_fee, d.user_id
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

            appointment_id, _, doctor_id, appointment_status, consultation_fee, doctor_user_id = booking_row
            if str(appointment_status).lower() in ["confirmed", "completed"]:
                cur.close()
                return jsonify({"error": "This appointment has already been paid or completed."}), 400
            if consultation_fee is not None:
                amount_value = float(consultation_fee)
            booking_id = appointment_id

        transaction_id = data.get('transaction_id') or f"TXN-{int(utc_now_naive().timestamp())}-{random.randint(1000,9999)}"
        merchant_result = process_hormuud_payment(
            amount=amount_value,
            payment_phone=payment_phone,
            payment_method=payment_method,
            transaction_id=transaction_id,
            description=description,
            currency=currency,
        )
        payment_status = merchant_result.get('status', 'Pending')
        reference_id = merchant_result.get('reference_id')
        invoice_id = merchant_result.get('invoice_id')
        provider_transaction_id = merchant_result.get('provider_transaction_id')

        cur.execute(
            """
            INSERT INTO payments
              (user_id, amount, payment_method, payment_status, transaction_id, reference_id, invoice_id, payment_phone, currency, description, booking_id, appointment_id, doctor_id, provider_name, provider_transaction_id, merchant_response, paid_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                utc_now_naive() if payment_status == 'Completed' else None,
            )
        )
        mysql.connection.commit()
        payment_id = cur.lastrowid

        # Update appointment status to Confirmed if booking_id is provided
        if booking_id and payment_status == 'Completed':
            cur.execute(
                "UPDATE appointments SET status = 'Confirmed' WHERE id = %s AND user_id = %s",
                (booking_id, user.get('user_id'))
            )
            mysql.connection.commit()
            if doctor_user_id:
                create_user_notification(
                    doctor_user_id,
                    "Appointment confirmed",
                    "A patient payment was completed and the appointment is confirmed.",
                    "appointment_confirmed",
                )

        cur.close()

        if payment_status == 'Completed':
            create_user_notification(
                user.get('user_id'),
                "Payment successful",
                "Your payment was successful and your appointment is confirmed.",
                "payment_confirmation",
            )
        elif payment_status == 'Failed':
            create_user_notification(
                user.get('user_id'),
                "Payment failed",
                "Your payment could not be completed. Please try again.",
                "payment_failed",
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
            }
        }
        if payment_status == 'Failed':
            response_body["error"] = "Payment failed."
            return jsonify(response_body), 402
        if payment_status == 'Pending':
            return jsonify(response_body), 202
        return jsonify(response_body)
    except Exception as e:
        print(f"❌ CREATE PAYMENT ERROR: {e}")
        return jsonify({"error": "Unable to process payment."}), 500


def ensure_payment_link_columns(cur):
    columns = [
        ("booking_id", "INT DEFAULT NULL"),
        ("appointment_id", "INT DEFAULT NULL"),
        ("doctor_id", "INT DEFAULT NULL"),
        ("provider_name", "VARCHAR(100) DEFAULT 'WaafiPay'"),
        ("provider_transaction_id", "VARCHAR(150) DEFAULT NULL"),
        ("merchant_response", "LONGTEXT DEFAULT NULL"),
        ("paid_at", "DATETIME DEFAULT NULL"),
        ("service_status", "VARCHAR(50) DEFAULT 'Waiting'"),
        ("service_verified", "TINYINT(1) DEFAULT NULL"),
        ("service_verified_by", "INT DEFAULT NULL"),
        ("service_verified_at", "DATETIME DEFAULT NULL"),
        ("verification_notes", "TEXT DEFAULT NULL"),
        ("patient_response", "TEXT DEFAULT NULL"),
        ("refund_reason", "TEXT DEFAULT NULL"),
        ("refund_notes", "TEXT DEFAULT NULL"),
        ("refunded_by", "INT DEFAULT NULL"),
        ("refunded_at", "DATETIME DEFAULT NULL"),
    ]
    for column, definition in columns:
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'payments' AND COLUMN_NAME = %s",
            (app.config['MYSQL_DB'], column)
        )
        if cur.fetchone()[0] == 0:
            cur.execute(f"ALTER TABLE payments ADD COLUMN {column} {definition}")
            mysql.connection.commit()


def require_admin_or_super_admin():
    user = get_current_user()
    if not user:
        return None, (jsonify({"error": "Authentication required."}), 401)
    if user.get('role') not in ['admin', 'super_admin', 'SUPER_ADMIN']:
        return None, (jsonify({"error": "Admin access required."}), 403)
    return user, None


def write_audit_log(actor_user, action, description):
    if not mysql or not actor_user:
        return
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            INSERT INTO audit_logs (actor, role, action, description, ip_address)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                actor_user.get('username') or actor_user.get('user_id'),
                actor_user.get('role'),
                action,
                description,
                request.remote_addr,
            )
        )
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        print(f"AUDIT LOG ERROR: {e}")


def ensure_appointment_ratings_table(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS appointment_ratings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            appointment_id INT NOT NULL,
            user_id INT NOT NULL,
            doctor_id INT NOT NULL,
            rating INT NOT NULL,
            comment TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_appointment_rating (appointment_id),
            FOREIGN KEY (appointment_id) REFERENCES appointments(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        )
    """)
    mysql.connection.commit()


def process_hormuud_payment(amount, payment_phone, payment_method, transaction_id, description, currency):
    merchant_url = app.config.get("HORMUUD_MERCHANT_API_URL")
    api_key = app.config.get("HORMUUD_MERCHANT_API_KEY")
    merchant_uid = app.config.get("HORMUUD_MERCHANT_UID") or app.config.get("HORMUUD_MERCHANT_ID")
    api_user_id = app.config.get("HORMUUD_API_USER_ID")
    service_name = app.config.get("HORMUUD_SERVICE_NAME") or "API_PURCHASE"
    channel_name = app.config.get("HORMUUD_CHANNEL_NAME") or "WEB"
    merchant_payment_method = app.config.get("HORMUUD_PAYMENT_METHOD") or "mwallet_account"

    if not merchant_url or not api_key or not merchant_uid or not api_user_id:
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
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

    try:
        response = requests.post(merchant_url, json=payload, headers=headers, timeout=30)
        response_data = response.json() if response.content else {}
        if response.ok:
            status = normalize_hormuud_status(response_data)
            return {
                "status": status,
                "reference_id": extract_nested(response_data, "referenceId") or extract_nested(response_data, "reference_id") or reference_id,
                "invoice_id": extract_nested(response_data, "invoiceId") or extract_nested(response_data, "invoice_id") or invoice_id,
                "provider_transaction_id": extract_nested(response_data, "transactionId") or extract_nested(response_data, "providerTransactionId") or extract_nested(response_data, "provider_transaction_id"),
                "raw": response_data,
            }

        print(f"Hormuud payment failed: {response.status_code} {response.text}")
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
            "raw": response_data,
        }
    except Exception as e:
        print(f"Hormuud payment error: {e}")
        return {
            "status": "Failed",
            "reference_id": transaction_id,
            "invoice_id": None,
            "provider_transaction_id": None,
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
    success_codes = {"0", "00", "000", "200", "2001", "success", "successful", "completed", "paid", "approved"}
    failure_codes = {"failed", "failure", "cancelled", "canceled", "declined", "rejected", "error", "400", "401", "403", "404", "500"}
    values = [
        extract_nested(response_data, "status"),
        extract_nested(response_data, "paymentStatus"),
        extract_nested(response_data, "transactionStatus"),
        extract_nested(response_data, "responseCode"),
        extract_nested(response_data, "responseMsg"),
        extract_nested(response_data, "responseMessage"),
        extract_nested(response_data, "state"),
    ]
    normalized_values = {str(value).strip().lower() for value in values if value is not None}
    if normalized_values.intersection(success_codes):
        return "Completed"
    if normalized_values.intersection(failure_codes):
        return "Failed"
    return "Pending"


def check_hormuud_payment_status(transaction_id):
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
            "referenceId": transaction_id,
        },
    }

    try:
        response = requests.post(status_url, json=payload, headers=headers, timeout=20)
        response_data = response.json() if response.content else {}
        if not response.ok:
            print(f"Hormuud status check failed: {response.status_code} {response.text}")
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
        print(f"Hormuud status check error: {e}")
        return None


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
                   booking_id, appointment_id, doctor_id, provider_transaction_id
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
            booking_id, appointment_id, doctor_id, provider_transaction_id
        ) = row

        if user.get('role') not in ['admin', 'SUPER_ADMIN'] and user.get('user_id') != owner_id:
            cur.close()
            return jsonify({"error": "Permission denied."}), 403

        if payment_status == 'Pending':
            status_result = check_hormuud_payment_status(transaction_id)
            if status_result:
                payment_status = status_result.get("status", payment_status)
                reference_id = status_result.get("reference_id") or reference_id
                invoice_id = status_result.get("invoice_id") or invoice_id
                provider_transaction_id = status_result.get("provider_transaction_id") or provider_transaction_id
                cur.execute(
                    """
                    UPDATE payments
                    SET payment_status = %s, reference_id = %s, invoice_id = %s, provider_transaction_id = %s, merchant_response = %s, paid_at = CASE WHEN %s = 'Completed' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
                    WHERE id = %s
                    """,
                    (payment_status, reference_id, invoice_id, provider_transaction_id, json.dumps(status_result.get('raw') or {}), payment_status, payment_id)
                )
                mysql.connection.commit()
                if payment_status == 'Completed' and appointment_id:
                    cur.execute(
                        "UPDATE appointments SET status = 'Confirmed' WHERE id = %s AND user_id = %s",
                        (appointment_id, owner_id)
                    )
                    mysql.connection.commit()
                    create_user_notification(
                        owner_id,
                        "Payment successful",
                        "Your payment was successful and your appointment is confirmed.",
                        "payment_confirmation",
                    )
                    if doctor_id:
                        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
                        doctor_user_row = cur.fetchone()
                        doctor_user_id = doctor_user_row[0] if doctor_user_row else None
                        create_user_notification(
                            doctor_user_id,
                            "Appointment confirmed",
                            "A patient payment was completed and the appointment is confirmed.",
                            "appointment_confirmed",
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
            }
        })
    except Exception as e:
        print(f"PAYMENT STATUS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to fetch payment status."}), 500


@app.route("/api/profile", methods=["GET", "PUT"])
def profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if request.method == 'GET':
        try:
            cur = mysql.connection.cursor()
            cur.execute("""
                SELECT u.id, u.username, u.fullname, u.email, u.phone, u.avatar, u.gender, u.age, u.date_of_birth, u.address, u.district, u.city, u.role, u.status, u.created_at,
                       d.specialty, d.clinic_name, d.clinic_address, d.district as doctor_district, d.city as doctor_city, d.experience_years, d.license_number, d.bio, d.rating, d.availability_schedule
                FROM users u
                LEFT JOIN doctors d ON u.id = d.user_id
                WHERE u.id = %s
            """, (user.get('user_id'),))
            row = cur.fetchone()
            cur.close()

            if not row:
                return jsonify({"error": "User not found."}), 404

            columns = ['id', 'username', 'fullname', 'email', 'phone', 'avatar', 'gender', 'age', 'date_of_birth', 'address', 'district', 'city', 'role', 'status', 'created_at', 'specialty', 'clinic_name', 'clinic_address', 'doctor_district', 'doctor_city', 'experience_years', 'license_number', 'bio', 'rating', 'availability_schedule']
            user_data = dict(zip(columns, row))

            return jsonify({
                "user": {
                    "id": user_data.get('id'),
                    "username": user_data.get('username'),
                    "fullname": user_data.get('fullname'),
                    "email": user_data.get('email'),
                    "phone": user_data.get('phone'),
                    "avatar": user_data.get('avatar'),
                    "gender": user_data.get('gender'),
                    "age": user_data.get('age'),
                    "date_of_birth": str(user_data.get('date_of_birth')) if user_data.get('date_of_birth') else None,
                    "address": user_data.get('address'),
                    "district": user_data.get('district'),
                    "city": user_data.get('city'),
                    "role": user_data.get('role'),
                    "status": user_data.get('status'),
                    "created_at": str(user_data.get('created_at')) if user_data.get('created_at') else None,
                    "specialty": user_data.get('specialty'),
                    "clinic_name": user_data.get('clinic_name'),
                    "clinic_address": user_data.get('clinic_address'),
                    "district": user_data.get('district') or user_data.get('doctor_district'),
                    "city": user_data.get('city') or user_data.get('doctor_city'),
                    "experience_years": user_data.get('experience_years'),
                    "license_number": user_data.get('license_number'),
                    "bio": user_data.get('bio'),
                    "rating": user_data.get('rating'),
                    "availability_schedule": user_data.get('availability_schedule'),
                }
            })
        except Exception as e:
            print(f"❌ PROFILE GET ERROR: {e}")
            traceback.print_exc()
            return jsonify({"error": "Unable to fetch profile."}), 500

    data = request.get_json(force=True) or {}
    fullname = data.get('fullname', '').strip()
    raw_email = data.get('email')
    email = raw_email.strip().lower() if isinstance(raw_email, str) else None
    phone = data.get('phone', '').strip()
    gender = data.get('gender', '').strip()
    age = data.get('age')
    date_of_birth = data.get('date_of_birth')
    address = data.get('address', '').strip()
    district = data.get('district', '').strip()
    city = data.get('city', '').strip()
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

    # Doctor-specific fields
    specialty = data.get('specialty', '').strip()
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
    if clinic_name:
        clinic_name = re.sub(r'[<>"\']', '', clinic_name)
    if clinic_address:
        clinic_address = re.sub(r'[<>"\']', '', clinic_address)
    if bio:
        bio = re.sub(r'[<>"\']', '', bio)

    if not fullname:
        return jsonify({"error": "Name is required."}), 400

    try:
        cur = mysql.connection.cursor()

        # Update users table
        update_users_query = "UPDATE users SET fullname = %s"
        update_users_params = [fullname]

        if email:
            update_users_query += ", email = %s"
            update_users_params.append(email)

        if phone:
            update_users_query += ", phone = %s"
            update_users_params.append(phone)
        if gender:
            update_users_query += ", gender = %s"
            update_users_params.append(gender)
        if age is not None:
            update_users_query += ", age = %s"
            update_users_params.append(age)
        if date_of_birth:
            update_users_query += ", date_of_birth = %s"
            update_users_params.append(date_of_birth)
        if address:
            update_users_query += ", address = %s"
            update_users_params.append(address)
        if district:
            update_users_query += ", district = %s"
            update_users_params.append(district)
        if city:
            update_users_query += ", city = %s"
            update_users_params.append(city)
        if password:
            password_error = validate_password_strength(password)
            if password_error:
                cur.close()
                return jsonify({"error": password_error}), 400
            if not current_password:
                cur.close()
                return jsonify({"error": "Current password is required to change password."}), 400
            cur.execute("SELECT password FROM users WHERE id = %s", (user.get('user_id'),))
            password_row = cur.fetchone()
            if not password_row or not check_password_hash(password_row[0], current_password):
                cur.close()
                return jsonify({"error": "Current password is incorrect."}), 400
            hashed_password = generate_password_hash(password)
            update_users_query += ", password = %s"
            update_users_params.append(hashed_password)

        update_users_query += " WHERE id = %s"
        update_users_params.append(user.get('user_id'))

        cur.execute(update_users_query, tuple(update_users_params))
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

                if specialty:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " specialty = %s"
                    update_doctors_params.append(specialty)
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
                if experience_years is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " experience_years = %s"
                    update_doctors_params.append(experience_years)
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
                if rating is not None:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " rating = %s"
                    update_doctors_params.append(rating)
                    first_field = False
                if availability_schedule:
                    if not first_field:
                        update_doctors_query += ","
                    update_doctors_query += " availability_schedule = %s"
                    update_doctors_params.append(availability_schedule)
                    first_field = False

                if update_doctors_params:
                    update_doctors_query += " WHERE user_id = %s"
                    update_doctors_params.append(user.get('user_id'))
                    cur.execute(update_doctors_query, tuple(update_doctors_params))
                    mysql.connection.commit()
            else:
                # Create new doctor record
                cur.execute("""
                    INSERT INTO doctors (user_id, name, specialty, clinic_name, clinic_address, district, city, experience_years, license_number, bio, rating, availability_schedule)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user.get('user_id'),
                    fullname,
                    specialty if specialty else None,
                    clinic_name if clinic_name else None,
                    clinic_address if clinic_address else None,
                    district if district else None,
                    city if city else None,
                    experience_years if experience_years is not None else None,
                    license_number if license_number else None,
                    bio if bio else None,
                    rating if rating is not None else 0.0,
                    availability_schedule if availability_schedule else None
                ))
                mysql.connection.commit()

        cur.close()

        return jsonify({"message": "Profile updated successfully."})
    except Exception as e:
        print(f"❌ PROFILE UPDATE ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to update profile."}), 500


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

    # Backend validation
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    max_size = 5 * 1024 * 1024  # 5MB

    if file.content_type not in allowed_types:
        return jsonify({"error": "Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed."}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > max_size:
        return jsonify({"error": "File size exceeds 5MB limit."}), 400

    # Magic number validation to verify actual file type
    file.seek(0)
    file_header = file.read(12)
    file.seek(0)

    # JPEG magic numbers: FF D8 FF
    if file.content_type in ['image/jpeg', 'image/jpg']:
        if not file_header.startswith(b'\xFF\xD8\xFF'):
            return jsonify({"error": "Invalid file content. File is not a valid JPEG image."}), 400
    # PNG magic number: 89 50 4E 47 0D 0A 1A 0A
    elif file.content_type == 'image/png':
        if not file_header.startswith(b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A'):
            return jsonify({"error": "Invalid file content. File is not a valid PNG image."}), 400
    # WEBP magic number: 52 49 46 46 ... 57 45 42 50
    elif file.content_type == 'image/webp':
        if not (file_header.startswith(b'RIFF') and file_header[8:12] == b'WEBP'):
            return jsonify({"error": "Invalid file content. File is not a valid WEBP image."}), 400

    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
    filename = f"avatar_{user.get('user_id')}_{int(utc_now_naive().timestamp())}.{file_extension}"
    filepath = os.path.join(upload_dir, filename)

    # Save file
    file.save(filepath)

    # Update database with avatar path
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE users SET avatar = %s WHERE id = %s",
            (f"/uploads/{filename}", user.get('user_id'))
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Avatar uploaded successfully.",
            "avatar": f"/uploads/{filename}"
        })
    except Exception as e:
        print(f"❌ AVATAR UPLOAD ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to save avatar."}), 500


@app.route("/api/otp/send", methods=["POST"])
def send_otp():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

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

    # Rate limiting check
    current_time = utc_now_naive().timestamp()
    if phone in otp_rate_limit:
        # Remove requests older than the window
        otp_rate_limit[phone] = [ts for ts in otp_rate_limit[phone] if current_time - ts < OTP_RATE_LIMIT_WINDOW]
        
        # Check if exceeded max requests
        if len(otp_rate_limit[phone]) >= OTP_MAX_REQUESTS:
            return jsonify({"error": "Too many OTP requests. Please try again later."}), 429
        
        otp_rate_limit[phone].append(current_time)
    else:
        otp_rate_limit[phone] = [current_time]

    try:
        cur = mysql.connection.cursor()
        
        # Check if phone already exists and is verified
        cur.execute("SELECT id, phone_verified, verification_attempts FROM users WHERE phone = %s", (phone,))
        user_data = cur.fetchone()
        
        if user_data:
            user_id, phone_verified, verification_attempts = user_data
            if phone_verified:
                cur.close()
                return jsonify({"error": "Phone number is already verified."}), 400
            
            # Check if max attempts reached
            if verification_attempts and verification_attempts >= 5:
                cur.close()
                return jsonify({"error": "Maximum verification attempts reached. Please contact support."}), 400
            
            # Check if can resend (60 seconds cooldown)
            cur.execute("SELECT otp_expires FROM users WHERE id = %s", (user_id,))
            otp_data = cur.fetchone()
            if otp_data and otp_data[0]:
                otp_expires = otp_data[0]
                if otp_expires and utc_now_naive() >= otp_expires.replace(tzinfo=None):
                    # Allow resend after the previous OTP has expired.
                    pass
                else:
                    cur.close()
                    return jsonify({"error": "Please wait before requesting another OTP."}), 400
        else:
            # New user, create temporary record
            placeholder_email = f"phone_{phone.replace('+', '')}@mobile.local"
            cur.execute(
                "INSERT INTO users (phone, email, phone_verified, verification_attempts, role, status) VALUES (%s, %s, 0, 0, 'user', 'pending')",
                (phone, placeholder_email)
            )
            mysql.connection.commit()
            user_id = cur.lastrowid

        # Generate 6-digit OTP
        otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        otp_expires = utc_now_naive() + timedelta(minutes=5)

        delivered, delivery_error, delivery_mode = deliver_otp(phone, otp_code)
        if not delivered:
            cur.close()
            return jsonify({"error": delivery_error or "Unable to send OTP."}), 503

        # Update user with OTP
        cur.execute(
            "UPDATE users SET otp_code = %s, otp_expires = %s, verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE id = %s",
            (otp_code, otp_expires, user_id)
        )
        mysql.connection.commit()
        cur.close()

        if delivery_mode == "development":
            print(f"DEV OTP for {phone}: {otp_code}")
            return jsonify({
                "message": "OTP generated for development"
            }), 200

        return jsonify({
            "message": "OTP sent successfully.",
            "user_id": user_id
        }), 200
    except Exception as e:
        print(f"❌ SEND OTP ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to send OTP."}), 500


@app.route("/api/otp/verify", methods=["POST"])
def verify_otp():
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    phone = data.get("phone", "").strip()
    otp_code = data.get("otp_code", "").strip()

    if not phone or not otp_code:
        return jsonify({"error": "Phone number and OTP are required."}), 400

    # Sanitize phone number - remove any non-digit characters except +
    phone = re.sub(r'[^\d+]', '', phone)

    # Sanitize OTP code - only digits allowed
    otp_code = re.sub(r'[^\d]', '', otp_code)

    try:
        cur = mysql.connection.cursor()
        
        cur.execute(
            "SELECT id, otp_code, otp_expires, phone_verified, verification_attempts FROM users WHERE phone = %s",
            (phone,)
        )
        user_data = cur.fetchone()
        
        if not user_data:
            cur.close()
            return jsonify({"error": "Phone number not found."}), 404

        user_id, stored_otp, otp_expires, phone_verified, verification_attempts = user_data

        if phone_verified:
            cur.close()
            return jsonify({"error": "Phone number is already verified."}), 400

        if not stored_otp:
            cur.close()
            return jsonify({"error": "No OTP sent to this phone number."}), 400

        # Check if OTP expired
        if otp_expires and utc_now_naive() > otp_expires:
            cur.close()
            return jsonify({"error": "OTP has expired. Please request a new one."}), 400

        # Check if max attempts reached
        if verification_attempts and verification_attempts >= 5:
            cur.close()
            return jsonify({"error": "Maximum verification attempts reached. Please contact support."}), 400

        # Verify OTP
        if otp_code != stored_otp:
            cur.execute(
                "UPDATE users SET verification_attempts = COALESCE(verification_attempts, 0) + 1 WHERE id = %s",
                (user_id,)
            )
            mysql.connection.commit()
            cur.close()
            return jsonify({"error": "Invalid OTP code."}), 400

        # OTP verified successfully
        cur.execute(
            "UPDATE users SET phone_verified = 1, otp_code = NULL, otp_expires = NULL, verification_attempts = 0, status = 'Active' WHERE id = %s",
            (user_id,)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({
            "message": "Phone verified successfully.",
            "user_id": user_id
        }), 200
    except Exception as e:
        print(f"❌ VERIFY OTP ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to verify OTP."}), 500


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
        print(f"❌ USERS ERROR: {e}")
        return jsonify({"users": []}), 500


@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    if not mysql:
        return jsonify({"appointments": []})

    user = get_current_user()
    query_user_id = request.args.get("user_id")

    try:
        cur = mysql.connection.cursor()
        ensure_appointment_ratings_table(cur)
        role = canonical_role(user.get('role')) if user else None
        if user and is_admin_role(user.get('role')) and query_user_id:
            cur.execute("""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       ar.rating, ar.comment
                FROM appointments a
                LEFT JOIN appointment_ratings ar ON ar.appointment_id = a.id
                WHERE a.user_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """, (query_user_id,))
        elif user and is_admin_role(user.get('role')):
            cur.execute("""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       ar.rating, ar.comment
                FROM appointments a
                LEFT JOIN appointment_ratings ar ON ar.appointment_id = a.id
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """)
        elif user and role == 'user':
            cur.execute("""
                SELECT a.id, a.doctor_id, a.doctor_name, a.phone, a.appointment_date, a.appointment_time, a.notes, a.status, a.created_at,
                       ar.rating, ar.comment
                FROM appointments a
                LEFT JOIN appointment_ratings ar ON ar.appointment_id = a.id
                WHERE a.user_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """, (user.get('user_id'),))
        elif user:
            return jsonify({"error": "Permission denied."}), 403
        else:
            return jsonify({"error": "Authentication required."}), 401

        rows = cur.fetchall()
        columns = [column[0] for column in cur.description] if cur.description else []
        cur.close()

        appointments = []
        for row in rows or []:
            record = dict(zip(columns, row))
            appointment_date = record.get("appointment_date")
            appointment_time = format_time(record.get("appointment_time"))[:5] if record.get("appointment_time") else None
            doctor_name = record.get("doctor_name")
            appointments.append({
                "id": record.get("id"),
                "doctorId": record.get("doctor_id"),
                "doctor_id": record.get("doctor_id"),
                "doctorName": doctor_name,
                "doctor_name": doctor_name,
                "phone": record.get("phone"),
                "date": appointment_date.strftime("%Y-%m-%d") if appointment_date else None,
                "appointment_date": appointment_date.strftime("%Y-%m-%d") if appointment_date else None,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "notes": record.get("notes"),
                "status": record.get("status"),
                "createdAt": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
                "created_at": record.get("created_at").strftime("%Y-%m-%d") if record.get("created_at") else None,
                "rating": record.get("rating"),
                "ratingComment": record.get("comment"),
                "rating_comment": record.get("comment"),
                "canRate": str(record.get("status") or "").lower() == "completed" and record.get("rating") is None,
                "can_rate": str(record.get("status") or "").lower() == "completed" and record.get("rating") is None,
                "hasRating": record.get("rating") is not None,
                "has_rating": record.get("rating") is not None,
            })

        return jsonify({"appointments": appointments})

    except Exception as e:
        print(f"❌ APPOINTMENTS ERROR: {e}")
        return jsonify({"appointments": []}), 500


@app.route("/api/appointments/<int:appointment_id>/rating", methods=["POST"])
def rate_completed_appointment(appointment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if canonical_role(user.get('role')) != 'user':
        return jsonify({"error": "Only patients can rate completed appointments."}), 403
    if not mysql:
        return jsonify({"error": "Database unavailable"}), 500

    data = request.get_json(force=True) or {}
    rating = data.get('rating')
    comment = str(data.get('comment') or '').strip()

    try:
        rating_value = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "Rating must be a number from 1 to 5."}), 400
    if rating_value < 1 or rating_value > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400
    if len(comment) > 1000:
        return jsonify({"error": "Comment must be 1000 characters or less."}), 400

    try:
        cur = mysql.connection.cursor()
        ensure_appointment_ratings_table(cur)
        cur.execute(
            """
            SELECT a.id, a.user_id, a.doctor_id, a.status, d.user_id
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = %s AND a.user_id = %s
            """,
            (appointment_id, user.get('user_id'))
        )
        appointment = cur.fetchone()
        if not appointment:
            cur.close()
            return jsonify({"error": "Appointment not found."}), 404

        _, owner_id, doctor_id, status, doctor_user_id = appointment
        if str(status or '').lower() != 'completed':
            cur.close()
            return jsonify({"error": "You can rate only after the appointment is completed."}), 400
        if not doctor_id:
            cur.close()
            return jsonify({"error": "Doctor is missing for this appointment."}), 400

        cur.execute("SELECT id FROM appointment_ratings WHERE appointment_id = %s", (appointment_id,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "This appointment has already been rated."}), 400

        cur.execute(
            """
            INSERT INTO appointment_ratings (appointment_id, user_id, doctor_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (appointment_id, owner_id, doctor_id, rating_value, comment or None)
        )
        cur.execute(
            """
            UPDATE doctors d
            SET rating = (
                SELECT ROUND(AVG(ar.rating), 1)
                FROM appointment_ratings ar
                WHERE ar.doctor_id = d.id
            )
            WHERE d.id = %s
            """,
            (doctor_id,)
        )
        mysql.connection.commit()
        cur.close()

        create_user_notification(
            doctor_user_id,
            "New patient rating",
            f"A completed appointment received a {rating_value}-star rating.",
            "doctor_rating",
        )

        return jsonify({
            "message": "Thank you for rating your session.",
            "rating": {
                "appointmentId": appointment_id,
                "doctorId": doctor_id,
                "rating": rating_value,
                "comment": comment,
            }
        })
    except Exception as e:
        print(f"RATE APPOINTMENT ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to submit rating."}), 500


@app.route("/api/appointments/user/<int:user_id>", methods=["GET"])
def get_user_appointments(user_id):
    if not mysql:
        return jsonify({"appointments": []})

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if not is_admin_role(user.get('role')) and user.get('user_id') != user_id:
        return jsonify({"error": "Permission denied."}), 403

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, doctor_id, doctor_name, phone, appointment_date, appointment_time, notes, status, created_at
            FROM appointments
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        rows = cur.fetchall()
        cur.close()

        appointments = []
        for row in rows or []:
            if not row:
                continue
            appointment_date = format_date(row[4])
            appointment_time = format_time(row[5])[:5] if row[5] else None
            appointments.append({
                "id": row[0],
                "doctorId": row[1],
                "doctor_id": row[1],
                "doctorName": row[2],
                "doctor_name": row[2],
                "phone": row[3],
                "date": appointment_date,
                "appointment_date": appointment_date,
                "time": appointment_time,
                "appointment_time": appointment_time,
                "notes": row[6],
                "status": row[7],
                "createdAt": format_date(row[8]),
                "created_at": format_date(row[8]),
            })

        return jsonify({"appointments": appointments})
    except Exception as e:
        print(f"❌ USER APPOINTMENTS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to load appointments."}), 500


@app.route("/api/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    if not mysql:
        return jsonify({"error": "Database connection not available."}), 500

    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    try:
        data = request.get_json(force=True) or {}
        new_status = data.get('status', '').strip()

        # Validate status
        valid_statuses = ['Pending', 'Pending Payment', 'Confirmed', 'Completed', 'Cancelled', 'Rejected']
        if new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        # Get the appointment
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, user_id, doctor_id, status FROM appointments WHERE id = %s", (appointment_id,))
        row = cur.fetchone()
        cur.close()

        if not row:
            return jsonify({"error": "Appointment not found."}), 404

        appointment_user_id = row[1]
        appointment_doctor_id = row[2]
        current_status = row[3]

        # Permission check
        # Users can only cancel their own appointments
        # Doctors can update appointments assigned to them
        # Admins can update any appointment
        role = canonical_role(user.get('role'))
        if role == 'user':
            if user.get('user_id') != appointment_user_id:
                return jsonify({"error": "Permission denied. You can only cancel your own appointments."}), 403
            # Users can only cancel pending or confirmed appointments
            if new_status not in ['Cancelled']:
                return jsonify({"error": "Users can only cancel appointments."}), 403
            if current_status not in ['Pending', 'Pending Payment', 'Confirmed']:
                return jsonify({"error": "Cannot cancel an appointment that is already completed or cancelled."}), 400
        elif role == 'doctor':
            if user.get('user_id') != appointment_doctor_id:
                return jsonify({"error": "Permission denied. You can only update your assigned appointments."}), 403
        elif not is_admin_role(user.get('role')):
            return jsonify({"error": "Permission denied."}), 403

        # Update the appointment
        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE appointments SET status = %s WHERE id = %s",
            (new_status, appointment_id)
        )
        mysql.connection.commit()
        cur.close()

        return jsonify({"message": "Appointment updated successfully", "status": new_status})
    except Exception as e:
        print(f"❌ UPDATE APPOINTMENT ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unable to update appointment."}), 500


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
        print(f"❌ PAYMENTS ERROR: {e}")
        return jsonify({"payments": []}), 500


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
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]

        # Get active users
        cur.execute("SELECT COUNT(*) FROM users WHERE status = 'Active'")
        active_users = cur.fetchone()[0]

        # Get total predictions
        cur.execute("SELECT COUNT(*) FROM predictions")
        total_predictions = cur.fetchone()[0]

        # Get anxiety cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Anxiety'")
        anxiety_cases = cur.fetchone()[0]

        # Get depression cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Depression'")
        depression_cases = cur.fetchone()[0]

        # Get neutral cases
        cur.execute("SELECT COUNT(*) FROM predictions WHERE prediction_result = 'Neutral'")
        neutral_cases = cur.fetchone()[0]

        # Get total appointments
        cur.execute("SELECT COUNT(*) FROM appointments")
        total_appointments = cur.fetchone()[0]

        # Get pending appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")
        pending_appointments = cur.fetchone()[0]

        # Get completed appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Completed'")
        completed_appointments = cur.fetchone()[0]

        # Get cancelled appointments
        cur.execute("SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled'")
        cancelled_appointments = cur.fetchone()[0]

        # Get total payments
        cur.execute("SELECT COUNT(*) FROM payments")
        total_payments = cur.fetchone()[0]

        # Get total payment amount
        cur.execute("SELECT SUM(amount) FROM payments WHERE payment_status = 'Completed'")
        total_payment_amount = cur.fetchone()[0] or 0

        # Get active doctors
        cur.execute("SELECT COUNT(*) FROM doctors WHERE status = 'Active'")
        active_doctors = cur.fetchone()[0]

        # Get recent predictions (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM predictions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        recent_predictions = cur.fetchone()[0]

        # Get recent users (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        recent_users = cur.fetchone()[0]

        # Get failed payments
        cur.execute("SELECT COUNT(*) FROM payments WHERE payment_status = 'Failed'")
        failed_payments = cur.fetchone()[0]

        # Get unread notifications
        cur.execute("SELECT COUNT(*) FROM notifications WHERE status = 'Unread'")
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
                "recentPredictions": recent_predictions,
                "recentUsers": recent_users,
                "failedPayments": failed_payments,
                "unreadNotifications": unread_notifications,
            }
        })

    except Exception as e:
        print(f"❌ DASHBOARD STATS ERROR: {e}")
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
            print(f"❌ QUERY totalPredictions ERROR: {q1e}")
            totalPredictions = 0

        # doctorsAvailable (global)
        try:
            cur.execute("SELECT COUNT(*) FROM doctors")
            doctorsAvailable = cur.fetchone()[0] or 0
        except Exception as q2e:
            print(f"❌ QUERY doctorsAvailable ERROR: {q2e}")
            doctorsAvailable = 0

        # myAppointments
        try:
            cur.execute("SELECT COUNT(*) FROM appointments WHERE user_id = %s", (user_id,))
            myAppointments = cur.fetchone()[0] or 0
        except Exception as q3e:
            print(f"❌ QUERY myAppointments ERROR: {q3e}")
            myAppointments = 0

        # paymentsMade
        try:
            cur.execute("SELECT COUNT(*) FROM payments WHERE user_id = %s", (user_id,))
            paymentsMade = cur.fetchone()[0] or 0
        except Exception as q4e:
            print(f"❌ QUERY paymentsMade ERROR: {q4e}")
            paymentsMade = 0

        cur.close()

        return jsonify({
            "totalPredictions": int(totalPredictions),
            "doctorsAvailable": int(doctorsAvailable),
            "myAppointments": int(myAppointments),
            "paymentsMade": int(paymentsMade),
        })

    except Exception as e:
        print(f"❌ DASHBOARD/STATS ERROR: {e}")
        return jsonify({"error": "Unable to fetch dashboard statistics"}), 500


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
            print(f"DEBUG: JWT payload: {user}")
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
            "SELECT SUM(amount) FROM payments WHERE user_id = %s AND payment_status = 'Completed'",
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
        print(f"❌ USER STATS ERROR: {e}")
        return jsonify({"error": str(e)}), 500


# =========================================================
# ERROR HANDLERS - Return proper JSON responses
# =========================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "status": 404}), 404

@app.errorhandler(500)
def internal_error(e):
    print(f"❌ Internal Server Error: {e}")
    return jsonify({"error": "Internal server error", "status": 500}), 500

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "Forbidden", "status": 403}), 403

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "Unauthorized", "status": 401}), 401


# =========================================================
# LANDING PAGE PUBLIC API ENDPOINTS
# =========================================================

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
        print(f"❌ PUBLIC STATS ERROR: {e}")
        traceback.print_exc()
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
        print(f"❌ FEATURED DOCTORS ERROR: {e}")
        traceback.print_exc()
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
        print(f"❌ TESTIMONIALS ERROR: {e}")
        traceback.print_exc()
        return jsonify({"testimonials": []}), 500


@app.route("/api/public/contact", methods=["POST"])
def submit_contact_form():
    """Handle contact form submission (no authentication required)"""
    data = request.get_json(force=True) or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not name or not email or not message:
        return jsonify({"error": "Name, email, and message are required."}), 400

    try:
        # In production, you'd save this to a contacts table or send email
        # For now, we'll just return success
        return jsonify({
            "message": "Thank you for contacting us. We'll get back to you soon.",
            "contact": {
                "name": name,
                "email": email,
                "subject": subject,
                "message": message
            }
        })
    except Exception as e:
        print(f"❌ CONTACT FORM ERROR: {e}")
        return jsonify({"error": "Unable to submit contact form."}), 500


# =========================================================
# RUN APP
# =========================================================

if __name__ == "__main__":

    print("\n" + "="*70)
    print("🚀 Somali Mental Health API - Backend")
    print("="*70)
    print("✅ Server running on:")
    print("   http://127.0.0.1:5000")
    print("   http://localhost:5000")
    print("\n📱 Frontend connection:")
    print("   API base URL: http://127.0.0.1:5000/api")
    print("   Set in frontend/.env: VITE_API_BASE_URL=/api")
    print("\n🧪 Test endpoints:")
    print("   Health check: http://127.0.0.1:5000/api/health")
    print("   (Should return {\"status\": \"ok\", ...})")
    print("\n🔧 Configuration:")
    print("   CORS enabled for all origins via Flask-CORS")
    print("   Debug mode: ON")
    print("   Threaded mode: ON (handles concurrent requests)")
    print("="*70 + "\n")

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000,
        threaded=True,
        use_reloader=True
    )

