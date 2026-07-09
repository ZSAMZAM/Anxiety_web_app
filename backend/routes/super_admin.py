"""
IT Management routes for AnxietyCare.
Complete API endpoints for the IT Management Panel.
"""

from flask import Blueprint, request, jsonify, send_file
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
from datetime import datetime, timedelta, timezone
import os
import platform as platform_module
import shutil
import time
import traceback
from decimal import Decimal

# Create Blueprint
super_admin_bp = Blueprint('super_admin', __name__)

# These will be imported from app.py
mysql = None
app_config = None
JWT_SECRET = None
JWT_ALGORITHM = None
SUPER_ADMIN_MYSQL_DB = 'super_admins'
SUPER_ADMIN_TABLE = 'super_admins'
SERVER_STARTED_AT = time.time()


def init_super_admin(mysql_instance, config):
    """Initialize super admin routes with MySQL and config"""
    global mysql, app_config, JWT_SECRET, JWT_ALGORITHM, SUPER_ADMIN_MYSQL_DB, SUPER_ADMIN_TABLE
    mysql = mysql_instance
    app_config = config
    JWT_SECRET = config.get('JWT_SECRET', 'mindcare-secret-key')
    JWT_ALGORITHM = config.get('JWT_ALGORITHM', 'HS256')
    SUPER_ADMIN_MYSQL_DB = config.get('SUPER_ADMIN_MYSQL_DB', 'super_admins')
    SUPER_ADMIN_TABLE = config.get('SUPER_ADMIN_TABLE', 'super_admins')


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def quote_mysql_identifier(identifier):
    return f"`{str(identifier).replace('`', '``')}`"


def qualified_table(database, table):
    return f"{quote_mysql_identifier(database)}.{quote_mysql_identifier(table)}"


def super_admin_table_name():
    return qualified_table(SUPER_ADMIN_MYSQL_DB, SUPER_ADMIN_TABLE)


def main_database_name():
    return app_config.get('MYSQL_DB', 'Anxiety_predictions') if app_config else 'Anxiety_predictions'


def backup_directory():
    path = app_config.get('BACKUP_DIR') if app_config else None
    if not path:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backups')
    os.makedirs(path, exist_ok=True)
    return path


def ensure_backup_columns(cur):
    for column, definition in [
        ('backup_path', 'VARCHAR(500) DEFAULT NULL'),
        ('database_names', 'VARCHAR(255) DEFAULT NULL'),
    ]:
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'backups' AND COLUMN_NAME = %s",
            (main_database_name(), column),
        )
        if cur.fetchone()[0] == 0:
            cur.execute(f"ALTER TABLE backups ADD COLUMN {column} {definition}")
            mysql.connection.commit()


def sql_literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return '1' if value else '0'
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (datetime,)):
        value = value.strftime('%Y-%m-%d %H:%M:%S')
    text = str(value).replace('\\', '\\\\').replace("'", "''")
    return f"'{text}'"


def write_database_dump(file_path, databases):
    cur = mysql.connection.cursor()
    with open(file_path, 'w', encoding='utf-8') as backup_file:
        backup_file.write("-- AnxietyCare database backup\n")
        backup_file.write(f"-- Created at {utc_now_naive().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
        backup_file.write("SET FOREIGN_KEY_CHECKS=0;\n\n")

        for database in databases:
            backup_file.write(f"CREATE DATABASE IF NOT EXISTS {quote_mysql_identifier(database)};\n")
            backup_file.write(f"USE {quote_mysql_identifier(database)};\n\n")

            cur.execute(
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
                (database,),
            )
            tables = [row[0] for row in cur.fetchall()]

            for table in tables:
                qualified = qualified_table(database, table)
                backup_file.write(f"DROP TABLE IF EXISTS {quote_mysql_identifier(table)};\n")
                cur.execute(f"SHOW CREATE TABLE {qualified}")
                create_sql = cur.fetchone()[1]
                backup_file.write(f"{create_sql};\n\n")

                cur.execute(f"SELECT * FROM {qualified}")
                rows = cur.fetchall()
                if not rows:
                    continue
                columns = [quote_mysql_identifier(col[0]) for col in cur.description]
                column_sql = ', '.join(columns)
                for row in rows:
                    values = ', '.join(sql_literal(value) for value in row)
                    backup_file.write(f"INSERT INTO {quote_mysql_identifier(table)} ({column_sql}) VALUES ({values});\n")
                backup_file.write("\n")

        backup_file.write("SET FOREIGN_KEY_CHECKS=1;\n")
    cur.close()


def fetch_notification_recipients(cur, target, explicit_user_ids=None):
    target = str(target or 'all').strip().lower()
    explicit_user_ids = explicit_user_ids or []

    query = "SELECT DISTINCT id, COALESCE(email, phone, username, fullname, CONCAT('user-', id)) AS recipient, role FROM users"
    filters = []
    params = []

    if explicit_user_ids:
        placeholders = ','.join(['%s'] * len(explicit_user_ids))
        filters.append(f"id IN ({placeholders})")
        params.extend(explicit_user_ids)
    elif target in ['patients', 'patient', 'users', 'user']:
        filters.append("LOWER(role) IN ('user', 'patient')")
    elif target in ['doctors', 'doctor']:
        filters.append("LOWER(role) = 'doctor'")
    elif target in ['admins', 'admin']:
        filters.append("LOWER(role) = 'admin'")
    elif target in ['all', 'broadcast', 'custom']:
        filters.append("LOWER(role) IN ('user', 'patient', 'doctor', 'admin')")
    else:
        filters.append("LOWER(role) IN ('user', 'patient', 'doctor', 'admin')")

    if filters:
        query += " WHERE " + " AND ".join(filters)

    cur.execute(query, params)
    return cur.fetchall()


def verify_stored_password(stored_password, candidate_password):
    if not stored_password:
        return False
    try:
        if check_password_hash(stored_password, candidate_password):
            return True
    except Exception:
        pass
    return str(stored_password) == str(candidate_password)


def canonical_role(role):
    value = str(role or '').strip().lower()
    if value in ['super_admin', 'super-admin', 'super admin']:
        return 'super_admin'
    if value in ['it_admin', 'it-admin', 'it admin', 'it administrator', 'it_administrator']:
        return 'it_admin'
    if value == 'patient':
        return 'user'
    return value


def is_it_management_role(role):
    return canonical_role(role) in ['super_admin', 'it_admin']


def display_role(role):
    return 'IT_ADMIN' if canonical_role(role) == 'it_admin' else 'SUPER_ADMIN'


def get_auth_token():
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def decode_jwt_token(token):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_super_admin():
    """Get current IT administrator from JWT token."""
    token = get_auth_token()
    if not token:
        return None
    
    payload = decode_jwt_token(token)
    if not payload or not is_it_management_role(payload.get('role')):
        return None
    
    return payload


def super_admin_required(f):
    """Decorator to require an IT Management Panel role."""
    def decorated_function(*args, **kwargs):
        current_admin = get_current_super_admin()
        if not current_admin:
            return jsonify({'error': 'Forbidden. IT Management Panel access required.'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function


def create_audit_log(actor, role, action, description, ip_address=None):
    """Create an audit log entry"""
    if not mysql:
        return
    
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO audit_logs (actor, role, action, description, ip_address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (actor, role, action, description, ip_address or request.remote_addr, utc_now_naive()))
        mysql.connection.commit()
        cur.close()
    except Exception as e:
        print(f"Failed to create audit log: {e}")


def ensure_security_log_columns(cur):
    columns = {
        'username': 'VARCHAR(255) DEFAULT NULL',
        'role': 'VARCHAR(50) DEFAULT NULL',
        'browser': 'VARCHAR(255) DEFAULT NULL',
        'device': 'VARCHAR(255) DEFAULT NULL',
        'platform': 'VARCHAR(100) DEFAULT NULL',
        'status': 'VARCHAR(50) DEFAULT NULL',
    }
    for column, definition in columns.items():
        try:
            cur.execute(f"ALTER TABLE security_logs ADD COLUMN {column} {definition}")
            mysql.connection.commit()
        except Exception:
            mysql.connection.rollback()


def parse_user_agent():
    user_agent = request.headers.get('User-Agent', '')
    browser = 'Unknown'
    for name in ['Chrome', 'Firefox', 'Edg', 'Safari', 'Opera']:
        if name in user_agent:
            browser = 'Edge' if name == 'Edg' else name
            break
    device = 'Mobile' if any(token in user_agent.lower() for token in ['mobile', 'android', 'iphone']) else 'Desktop'
    return browser, device


def create_security_log(username, role, status, description, action='LOGIN_ATTEMPT', requested_platform=None):
    if not mysql:
        return

    try:
        cur = mysql.connection.cursor()
        ensure_security_log_columns(cur)
        browser, device = parse_user_agent()
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
        print(f"Failed to create security log: {e}")
        try:
            cur.close()
        except Exception:
            pass


# =========================================================
# AUTHENTICATION
# =========================================================

@super_admin_bp.route('/login', methods=['POST'])
def super_admin_login():
    """IT administrator login."""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400
    
    try:
        cur = mysql.connection.cursor()
        cur.execute(f"""
            SELECT id, username, password_hash, 'SUPER_ADMIN' AS role, status, created_at
            FROM {super_admin_table_name()}
            WHERE username = %s
        """, (username,))
        row = cur.fetchone()
        cur.close()
        
        if not row:
            create_security_log(username, 'UNKNOWN', 'FAILED', 'Invalid IT Management username', 'FAILED_LOGIN')
            return jsonify({'error': 'Invalid credentials.'}), 401
        
        admin_id, admin_username, hashed_password, role, status, created_at = row
        normalized_role = display_role(role)
        
        if not verify_stored_password(hashed_password, password):
            create_security_log(admin_username, normalized_role, 'FAILED', 'Invalid IT Management password', 'FAILED_LOGIN')
            return jsonify({'error': 'Invalid credentials.'}), 401
        
        if not is_it_management_role(role):
            create_security_log(admin_username, role, 'BLOCKED', 'Role attempted IT Management Panel access', 'BLOCKED_ACCESS')
            return jsonify({'error': 'Access denied. IT administrator role required.'}), 403
        
        if str(status).strip().lower() != 'active':
            create_security_log(admin_username, normalized_role, 'LOCKED', 'Inactive IT Management account', 'LOCKED_ACCOUNT')
            return jsonify({'error': 'Account is not active.'}), 403
        
        # Generate JWT token
        token = jwt.encode({
            'super_admin_id': admin_id,
            'username': admin_username,
            'role': normalized_role,
            'exp': utc_now_naive() + timedelta(hours=24)
        }, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        create_audit_log(admin_username, normalized_role, 'LOGIN', 'IT administrator logged in', request.remote_addr)
        create_security_log(admin_username, normalized_role, 'SUCCESS', 'IT Management Panel login successful', 'LOGIN')
        
        return jsonify({
            'token': token,
            'super_admin_id': admin_id,
            'username': admin_username,
            'role': normalized_role
        }), 200
        
    except Exception as e:
        print(f"IT Management Login Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Login failed.'}), 500


@super_admin_bp.route('/logout', methods=['POST'])
@super_admin_required
def super_admin_logout():
    """IT administrator logout."""
    current_admin = get_current_super_admin()
    create_audit_log(current_admin.get('username'), display_role(current_admin.get('role')), 'LOGOUT', 'IT administrator logged out', request.remote_addr)
    return jsonify({'message': 'Logged out successfully'}), 200


# =========================================================
# DASHBOARD
# =========================================================

@super_admin_bp.route('/dashboard', methods=['GET'])
@super_admin_required
def get_dashboard():
    """Get dashboard statistics"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Total Users
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'user'")
        total_users = cur.fetchone()[0]
        
        # Total Doctors
        cur.execute("SELECT COUNT(*) FROM doctors")
        total_doctors = cur.fetchone()[0]
        
        # Total Admins
        cur.execute("SELECT COUNT(*) FROM admins")
        total_admins = cur.fetchone()[0]
        
        # Total Appointments
        cur.execute("SELECT COUNT(*) FROM appointments")
        total_appointments = cur.fetchone()[0]
        
        # Total Predictions
        cur.execute("SELECT COUNT(*) FROM predictions")
        total_predictions = cur.fetchone()[0]
        
        # Total Revenue
        cur.execute("SELECT SUM(amount) FROM payments WHERE payment_status = 'Completed'")
        total_revenue = cur.fetchone()[0] or 0
        
        # Pending Payments
        cur.execute("SELECT COUNT(*) FROM payments WHERE payment_status = 'Pending'")
        pending_payments = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'FAILED'
              AND created_at >= CURDATE()
        """)
        failed_logins_today = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'BLOCKED' OR action = 'BLOCKED_ACCESS'
        """)
        blocked_access_attempts = cur.fetchone()[0]
        
        cur.close()
        
        return jsonify({
            'total_users': total_users,
            'total_doctors': total_doctors,
            'total_admins': total_admins,
            'total_appointments': total_appointments,
            'total_predictions': total_predictions,
            'total_revenue': float(total_revenue),
            'pending_payments': pending_payments,
            'failed_logins_today': failed_logins_today,
            'blocked_access_attempts': blocked_access_attempts,
            'system_health': 'healthy'
        }), 200
        
    except Exception as e:
        print(f"Dashboard Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load dashboard stats'}), 500


# =========================================================
# ADMIN MANAGEMENT
# =========================================================

@super_admin_bp.route('/admins', methods=['GET'])
@super_admin_required
def get_admins():
    """Get all administrators"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM admins")
        total = cur.fetchone()[0]
        
        # Get admins with user details
        cur.execute("""
            SELECT a.id, a.user_id, a.permissions, a.created_at,
                   u.id, u.username, u.fullname, u.phone, u.email, u.status
            FROM admins a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        admins = []
        for row in cur.fetchall():
            admin_id, user_id, permissions, created_at, u_id, username, fullname, phone, email, status = row
            admins.append({
                'id': admin_id,
                'user_id': user_id,
                'username': username,
                'fullname': fullname,
                'phone': phone,
                'email': email,
                'status': status,
                'permissions': permissions,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'admins': admins,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Admins Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load admins'}), 500


@super_admin_bp.route('/admins', methods=['POST'])
@super_admin_required
def create_admin():
    """Create a new administrator"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    fullname = data.get('fullname', '').strip()
    username = data.get('username', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not all([fullname, username, phone, email, password]):
        return jsonify({'error': 'All fields are required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        
        # Check if username exists
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            return jsonify({'error': 'Username already exists'}), 400
        
        # Check if email exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create user
        hashed_password = generate_password_hash(password)
        cur.execute("""
            INSERT INTO users (fullname, username, phone, email, password, role, status)
            VALUES (%s, %s, %s, %s, %s, 'admin', 'active')
        """, (fullname, username, phone, email, hashed_password))
        user_id = cur.lastrowid
        
        # Create admin record
        cur.execute("""
            INSERT INTO admins (user_id, permissions)
            VALUES (%s, 'all')
        """, (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'CREATE_ADMIN', f'Created admin: {username}', request.remote_addr)
        
        return jsonify({'message': 'Admin created successfully', 'user_id': user_id}), 201
        
    except Exception as e:
        print(f"Create Admin Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create admin'}), 500


@super_admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@super_admin_required
def update_admin(admin_id):
    """Update administrator"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    
    try:
        cur = mysql.connection.cursor()
        
        # Get admin user_id
        cur.execute("SELECT user_id FROM admins WHERE id = %s", (admin_id,))
        admin = cur.fetchone()
        if not admin:
            cur.close()
            return jsonify({'error': 'Admin not found'}), 404
        
        user_id = admin[0]
        
        # Update user
        update_fields = []
        update_values = []
        
        if 'fullname' in data:
            update_fields.append("fullname = %s")
            update_values.append(data['fullname'])
        if 'username' in data:
            update_fields.append("username = %s")
            update_values.append(data['username'])
        if 'phone' in data:
            update_fields.append("phone = %s")
            update_values.append(data['phone'])
        if 'email' in data:
            update_fields.append("email = %s")
            update_values.append(data['email'])
        if 'password' in data and data['password']:
            update_fields.append("password = %s")
            update_values.append(generate_password_hash(data['password']))
        
        if update_fields:
            update_values.append(user_id)
            cur.execute(f"""
                UPDATE users SET {', '.join(update_fields)}
                WHERE id = %s
            """, update_values)
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'UPDATE_ADMIN', f'Updated admin ID: {admin_id}', request.remote_addr)
        
        return jsonify({'message': 'Admin updated successfully'}), 200
        
    except Exception as e:
        print(f"Update Admin Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update admin'}), 500


@super_admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@super_admin_required
def delete_admin(admin_id):
    """Delete administrator"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get admin user_id
        cur.execute("SELECT user_id FROM admins WHERE id = %s", (admin_id,))
        admin = cur.fetchone()
        if not admin:
            cur.close()
            return jsonify({'error': 'Admin not found'}), 404
        
        user_id = admin[0]
        
        # Delete admin record
        cur.execute("DELETE FROM admins WHERE id = %s", (admin_id,))
        
        # Delete user
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'DELETE_ADMIN', f'Deleted admin ID: {admin_id}', request.remote_addr)
        
        return jsonify({'message': 'Admin deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete Admin Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete admin'}), 500


@super_admin_bp.route('/admins/<int:admin_id>/suspend', methods=['PUT'])
@super_admin_required
def suspend_admin(admin_id):
    """Suspend administrator"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get admin user_id
        cur.execute("SELECT user_id FROM admins WHERE id = %s", (admin_id,))
        admin = cur.fetchone()
        if not admin:
            cur.close()
            return jsonify({'error': 'Admin not found'}), 404
        
        user_id = admin[0]
        
        # Suspend user
        cur.execute("UPDATE users SET status = 'suspended' WHERE id = %s", (user_id,))
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'SUSPEND_ADMIN', f'Suspended admin ID: {admin_id}', request.remote_addr)
        
        return jsonify({'message': 'Admin suspended successfully'}), 200
        
    except Exception as e:
        print(f"Suspend Admin Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to suspend admin'}), 500


@super_admin_bp.route('/admins/<int:admin_id>/activate', methods=['PUT'])
@super_admin_required
def activate_admin(admin_id):
    """Activate administrator"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get admin user_id
        cur.execute("SELECT user_id FROM admins WHERE id = %s", (admin_id,))
        admin = cur.fetchone()
        if not admin:
            cur.close()
            return jsonify({'error': 'Admin not found'}), 404
        
        user_id = admin[0]
        
        # Activate user
        cur.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'ACTIVATE_ADMIN', f'Activated admin ID: {admin_id}', request.remote_addr)
        
        return jsonify({'message': 'Admin activated successfully'}), 200
        
    except Exception as e:
        print(f"Activate Admin Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to activate admin'}), 500


# =========================================================
# USER MANAGEMENT
# =========================================================

@super_admin_bp.route('/users', methods=['GET'])
@super_admin_required
def get_users():
    """Get all users"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'user'")
        total = cur.fetchone()[0]
        
        # Get users
        cur.execute("""
            SELECT id, username, fullname, email, phone, status, created_at
            FROM users
            WHERE role = 'user'
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        users = []
        for row in cur.fetchall():
            user_id, username, fullname, email, phone, status, created_at = row
            users.append({
                'id': user_id,
                'username': username,
                'fullname': fullname,
                'email': email,
                'phone': phone,
                'status': status,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'users': users,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Users Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load users'}), 500


@super_admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@super_admin_required
def delete_user(user_id):
    """Delete user"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s AND role = 'user'", (user_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Delete user
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'DELETE_USER', f'Deleted user ID: {user_id}', request.remote_addr)
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete User Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete user'}), 500


@super_admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@super_admin_required
def update_user_status(user_id):
    """Update user status"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    status = data.get('status', '').strip()
    
    if not status:
        return jsonify({'error': 'Status is required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s AND role = 'user'", (user_id,))
        if not cur.fetchone():
            cur.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Update user status
        cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'UPDATE_USER_STATUS', f'Updated user {user_id} status to {status}', request.remote_addr)
        
        return jsonify({'message': 'User status updated successfully'}), 200
        
    except Exception as e:
        print(f"Update User Status Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update user status'}), 500


# =========================================================
# DOCTOR MANAGEMENT
# =========================================================

@super_admin_bp.route('/doctors', methods=['GET'])
@super_admin_required
def get_doctors():
    """Get all doctors"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM doctors")
        total = cur.fetchone()[0]
        
        # Get doctors with user details
        cur.execute("""
            SELECT d.id, d.user_id, d.name, d.specialization, d.rating, d.status, d.created_at,
                   u.username, u.fullname, u.phone, u.email
            FROM doctors d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        doctors = []
        for row in cur.fetchall():
            doctor_id, user_id, name, specialization, rating, status, created_at, username, fullname, phone, email = row
            doctors.append({
                'id': doctor_id,
                'user_id': user_id,
                'name': name,
                'fullname': fullname or name,
                'username': username,
                'specialization': specialization,
                'rating': float(rating) if rating else 0.0,
                'status': status,
                'phone': phone,
                'email': email,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'doctors': doctors,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Doctors Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load doctors'}), 500


@super_admin_bp.route('/doctors/<int:doctor_id>', methods=['DELETE'])
@super_admin_required
def delete_doctor(doctor_id):
    """Delete doctor"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get doctor user_id
        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            cur.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        user_id = doctor[0]
        
        # Delete doctor record
        cur.execute("DELETE FROM doctors WHERE id = %s", (doctor_id,))
        
        # Delete user if exists
        if user_id:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'DELETE_DOCTOR', f'Deleted doctor ID: {doctor_id}', request.remote_addr)
        
        return jsonify({'message': 'Doctor deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete Doctor Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete doctor'}), 500


@super_admin_bp.route('/doctors/<int:doctor_id>/suspend', methods=['PUT'])
@super_admin_required
def suspend_doctor(doctor_id):
    """Suspend doctor"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get doctor user_id
        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            cur.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        user_id = doctor[0]
        
        # Update doctor status
        cur.execute("UPDATE doctors SET status = 'suspended' WHERE id = %s", (doctor_id,))
        
        # Suspend user if exists
        if user_id:
            cur.execute("UPDATE users SET status = 'suspended' WHERE id = %s", (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'SUSPEND_DOCTOR', f'Suspended doctor ID: {doctor_id}', request.remote_addr)
        
        return jsonify({'message': 'Doctor suspended successfully'}), 200
        
    except Exception as e:
        print(f"Suspend Doctor Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to suspend doctor'}), 500


@super_admin_bp.route('/doctors/<int:doctor_id>/activate', methods=['PUT'])
@super_admin_required
def activate_doctor(doctor_id):
    """Activate doctor"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get doctor user_id
        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            cur.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        user_id = doctor[0]
        
        # Update doctor status
        cur.execute("UPDATE doctors SET status = 'Active' WHERE id = %s", (doctor_id,))
        
        # Activate user if exists
        if user_id:
            cur.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'ACTIVATE_DOCTOR', f'Activated doctor ID: {doctor_id}', request.remote_addr)
        
        return jsonify({'message': 'Doctor activated successfully'}), 200
        
    except Exception as e:
        print(f"Activate Doctor Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to activate doctor'}), 500


@super_admin_bp.route('/doctors/<int:doctor_id>/approve', methods=['PUT'])
@super_admin_required
def approve_doctor(doctor_id):
    """Approve doctor"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get doctor user_id
        cur.execute("SELECT user_id FROM doctors WHERE id = %s", (doctor_id,))
        doctor = cur.fetchone()
        if not doctor:
            cur.close()
            return jsonify({'error': 'Doctor not found'}), 404
        
        user_id = doctor[0]
        
        # Update doctor status
        cur.execute("UPDATE doctors SET status = 'Active' WHERE id = %s", (doctor_id,))
        
        # Activate user if exists
        if user_id:
            cur.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'APPROVE_DOCTOR', f'Approved doctor ID: {doctor_id}', request.remote_addr)
        
        return jsonify({'message': 'Doctor approved successfully'}), 200
        
    except Exception as e:
        print(f"Approve Doctor Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to approve doctor'}), 500


# =========================================================
# PAYMENTS
# =========================================================

@super_admin_bp.route('/payments', methods=['GET'])
@super_admin_required
def get_payments():
    """Get all payments"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM payments")
        total = cur.fetchone()[0]
        
        # Get payments with user and doctor details
        cur.execute("""
            SELECT p.id, p.user_id, p.amount, p.payment_method, p.payment_status, 
                   p.transaction_id, p.created_at,
                   u.username, u.fullname,
                   d.name as doctor_name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN appointments a ON p.reference_id = a.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            ORDER BY p.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        payments = []
        for row in cur.fetchall():
            payment_id, user_id, amount, method, status, transaction_id, created_at, username, fullname, doctor_name = row
            payments.append({
                'id': payment_id,
                'user_id': user_id,
                'user_name': fullname or username,
                'doctor_name': doctor_name,
                'amount': float(amount) if amount else 0.0,
                'method': method,
                'status': status,
                'transaction_id': transaction_id,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'payments': payments,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Payments Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load payments'}), 500


@super_admin_bp.route('/payments/stats', methods=['GET'])
@super_admin_required
def get_payment_stats():
    """Get payment statistics"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Today's revenue
        cur.execute("""
            SELECT SUM(amount) FROM payments 
            WHERE payment_status = 'Completed' 
            AND DATE(created_at) = CURDATE()
        """)
        today_revenue = cur.fetchone()[0] or 0
        
        # Monthly revenue
        cur.execute("""
            SELECT SUM(amount) FROM payments 
            WHERE payment_status = 'Completed' 
            AND YEAR(created_at) = YEAR(CURDATE())
            AND MONTH(created_at) = MONTH(CURDATE())
        """)
        monthly_revenue = cur.fetchone()[0] or 0
        
        # Total revenue
        cur.execute("""
            SELECT SUM(amount) FROM payments 
            WHERE payment_status = 'Completed'
        """)
        total_revenue = cur.fetchone()[0] or 0
        
        # Failed transactions
        cur.execute("""
            SELECT COUNT(*) FROM payments 
            WHERE payment_status = 'Failed'
        """)
        failed_transactions = cur.fetchone()[0]
        
        cur.close()
        
        return jsonify({
            'todayRevenue': float(today_revenue),
            'monthlyRevenue': float(monthly_revenue),
            'totalRevenue': float(total_revenue),
            'failedTransactions': failed_transactions
        }), 200
        
    except Exception as e:
        print(f"Get Payment Stats Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load payment stats'}), 500


# =========================================================
# APPOINTMENTS
# =========================================================

@super_admin_bp.route('/appointments', methods=['GET'])
@super_admin_required
def get_appointments():
    """Get all appointments"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM appointments")
        total = cur.fetchone()[0]
        
        # Get appointments with user and doctor details
        cur.execute("""
            SELECT a.id, a.user_id, a.doctor_id, a.appointment_date, a.appointment_time, 
                   a.status, a.created_at,
                   u.username, u.fullname,
                   d.name as doctor_name
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            ORDER BY a.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        appointments = []
        for row in cur.fetchall():
            appointment_id, user_id, doctor_id, appointment_date, appointment_time, status, created_at, username, fullname, doctor_name = row
            appointments.append({
                'id': appointment_id,
                'user_id': user_id,
                'user_name': fullname or username,
                'doctor_name': doctor_name,
                'appointment_date': appointment_date.strftime('%Y-%m-%d') if appointment_date else None,
                'appointment_time': str(appointment_time) if appointment_time else None,
                'status': status,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'appointments': appointments,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Appointments Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load appointments'}), 500


# =========================================================
# PREDICTIONS
# =========================================================

@super_admin_bp.route('/predictions', methods=['GET'])
@super_admin_required
def get_predictions():
    """Get all predictions"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM predictions")
        total = cur.fetchone()[0]
        
        # Get predictions with user details
        cur.execute("""
            SELECT p.id, p.user_id, p.prediction_result, p.confidence_score, p.created_at,
                   u.username, u.fullname
            FROM predictions p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        predictions = []
        for row in cur.fetchall():
            prediction_id, user_id, result, confidence, created_at, username, fullname = row
            predictions.append({
                'id': prediction_id,
                'user_id': user_id,
                'user_name': fullname or username,
                'result': result,
                'confidence': float(confidence) * 100 if confidence else 0,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'predictions': predictions,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Predictions Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load predictions'}), 500


# =========================================================
# REPORTS
# =========================================================

@super_admin_bp.route('/reports', methods=['GET'])
@super_admin_required
def get_reports():
    """Get all reports"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM reports")
        total = cur.fetchone()[0]
        
        # Get reports
        cur.execute("""
            SELECT id, report_id, user_id, user_name, doctor_name, prediction_type, 
                   prediction_result, status, created_at
            FROM reports
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        reports = []
        for row in cur.fetchall():
            report_id, report_uuid, user_id, user_name, doctor_name, prediction_type, result, status, created_at = row
            reports.append({
                'id': report_id,
                'report_id': report_uuid,
                'user_id': user_id,
                'user_name': user_name,
                'doctor_name': doctor_name,
                'type': prediction_type,
                'result': result,
                'status': status,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'reports': reports,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Reports Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load reports'}), 500


@super_admin_bp.route('/reports', methods=['POST'])
@super_admin_required
def generate_report():
    """Generate a new report"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    title = data.get('title', '').strip()
    report_type = data.get('type', '').strip()
    start_date = data.get('start_date', '').strip()
    end_date = data.get('end_date', '').strip()
    
    if not all([title, report_type, start_date, end_date]):
        return jsonify({'error': 'All fields are required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        
        report_uuid = f"RPT-{utc_now_naive().strftime('%Y%m%d')}-{1000}"
        
        cur.execute("""
            INSERT INTO reports (report_id, title, prediction_type, status, created_at)
            VALUES (%s, %s, %s, 'Completed', %s)
        """, (report_uuid, title, report_type, utc_now_naive()))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'message': 'Report generated successfully', 'report_id': report_uuid}), 201
        
    except Exception as e:
        print(f"Generate Report Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate report'}), 500


# =========================================================
# AUDIT LOGS
# =========================================================

@super_admin_bp.route('/audit-logs', methods=['GET'])
@super_admin_required
def get_audit_logs():
    """Get all audit logs"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        cur = mysql.connection.cursor()
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM audit_logs")
        total = cur.fetchone()[0]
        
        # Get audit logs
        cur.execute("""
            SELECT id, actor, role, action, description, ip_address, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        logs = []
        for row in cur.fetchall():
            log_id, actor, role, action, description, ip_address, created_at = row
            logs.append({
                'id': log_id,
                'actor': actor,
                'role': role,
                'action': action,
                'description': description,
                'ip_address': ip_address,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'logs': logs,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        }), 200
        
    except Exception as e:
        print(f"Get Audit Logs Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load audit logs'}), 500


# =========================================================
# ROLE PERMISSIONS
# =========================================================

@super_admin_bp.route('/roles', methods=['GET'])
@super_admin_required
def get_roles():
    """Get all roles and permissions"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get roles from role_permissions table
        cur.execute("""
            SELECT id, role_name, permissions
            FROM role_permissions
            ORDER BY role_name
        """)
        
        roles = []
        for row in cur.fetchall():
            role_id, role_name, permissions_json = row
            permissions = {}
            if permissions_json:
                try:
                    import json
                    permissions = json.loads(permissions_json)
                except:
                    pass
            
            roles.append({
                'id': role_id,
                'name': role_name,
                'permissions': permissions
            })
        
        # If no roles in table, return default roles
        if not roles:
            roles = [
                {'id': 1, 'name': 'SUPER_ADMIN', 'permissions': {'all': True}},
                {'id': 2, 'name': 'ADMIN', 'permissions': {'view_users': True, 'manage_users': True}},
                {'id': 3, 'name': 'DOCTOR', 'permissions': {'view_appointments': True, 'manage_appointments': True}},
                {'id': 4, 'name': 'USER', 'permissions': {'view_predictions': True}}
            ]
        
        cur.close()
        
        return jsonify({'roles': roles}), 200
        
    except Exception as e:
        print(f"Get Roles Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load roles'}), 500


@super_admin_bp.route('/roles/<int:role_id>', methods=['PUT'])
@super_admin_required
def update_role_permissions(role_id):
    """Update role permissions"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    permissions = data.get('permissions', {})
    
    if not permissions:
        return jsonify({'error': 'Permissions are required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        
        import json
        permissions_json = json.dumps(permissions)
        
        # Update or insert role permissions
        cur.execute("""
            INSERT INTO role_permissions (role_name, permissions)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE permissions = %s
        """, (f'role_{role_id}', permissions_json, permissions_json))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'UPDATE_ROLE', f'Updated role {role_id} permissions', request.remote_addr)
        
        return jsonify({'message': 'Role permissions updated successfully'}), 200
        
    except Exception as e:
        print(f"Update Role Permissions Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update role permissions'}), 500


# =========================================================
# SYSTEM SETTINGS
# =========================================================

@super_admin_bp.route('/system-settings', methods=['GET'])
@super_admin_required
def get_system_settings():
    """Get system settings"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get settings from system_settings table
        cur.execute("""
            SELECT setting_key, setting_value
            FROM system_settings
        """)
        
        settings = {}
        for row in cur.fetchall():
            key, value = row
            settings[key] = value
        
        # If no settings, return defaults
        if not settings:
            settings = {
                'site_name': 'AnxietyCare',
                'site_description': 'Mental Health Platform',
                'contact_email': 'Group40fourty@gmail.com',
                'contact_phone': '+252614197803',
                'maintenance_mode': 'false',
                'max_users': '10000',
                'session_timeout': '60'
            }
        
        cur.close()
        
        return jsonify({'settings': settings}), 200
        
    except Exception as e:
        print(f"Get System Settings Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load system settings'}), 500


@super_admin_bp.route('/system-settings', methods=['PUT'])
@super_admin_required
def update_system_settings():
    """Update system settings"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    
    if not data:
        return jsonify({'error': 'Settings are required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        
        # Update each setting
        for key, value in data.items():
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_value = %s
            """, (key, str(value), str(value)))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'UPDATE_SETTINGS', 'Updated system settings', request.remote_addr)
        
        return jsonify({'message': 'System settings updated successfully'}), 200
        
    except Exception as e:
        print(f"Update System Settings Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update system settings'}), 500


# =========================================================
# DATABASE BACKUPS
# =========================================================

@super_admin_bp.route('/backups', methods=['GET'])
@super_admin_required
def get_backups():
    """Get all database backups"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        ensure_backup_columns(cur)
        
        # Get backups
        cur.execute("""
            SELECT id, backup_name, backup_size, created_at, backup_path, database_names
            FROM backups
            ORDER BY created_at DESC
        """)
        
        backups = []
        for row in cur.fetchall():
            backup_id, backup_name, backup_size, created_at, backup_path, database_names = row
            file_exists = bool(backup_path and os.path.exists(backup_path))
            backups.append({
                'id': backup_id,
                'name': backup_name,
                'size': backup_size,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None,
                'database_names': database_names,
                'file_exists': file_exists
            })
        
        cur.close()
        
        return jsonify({'backups': backups}), 200
        
    except Exception as e:
        print(f"Get Backups Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load backups'}), 500


@super_admin_bp.route('/backups', methods=['POST'])
@super_admin_required
def create_backup():
    """Create a database backup"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        backup_name = f"backup_{utc_now_naive().strftime('%Y%m%d_%H%M%S')}.sql"
        backup_path = os.path.join(backup_directory(), backup_name)
        databases = []
        for database in [main_database_name(), SUPER_ADMIN_MYSQL_DB]:
            if database and database not in databases:
                databases.append(database)

        write_database_dump(backup_path, databases)
        backup_size_bytes = os.path.getsize(backup_path)
        backup_size = f"{backup_size_bytes} bytes"
        
        cur = mysql.connection.cursor()
        ensure_backup_columns(cur)
        
        # Create backup record
        cur.execute("""
            INSERT INTO backups (backup_name, backup_size, backup_path, database_names, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (backup_name, backup_size, backup_path, ','.join(databases), utc_now_naive()))
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'CREATE_BACKUP', f'Created backup: {backup_name}', request.remote_addr)
        
        return jsonify({
            'message': 'Backup created successfully',
            'backup_name': backup_name,
            'backup_size': backup_size,
            'databases': databases,
        }), 201
        
    except Exception as e:
        print(f"Create Backup Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create backup'}), 500


@super_admin_bp.route('/backups/<int:backup_id>', methods=['DELETE'])
@super_admin_required
def delete_backup(backup_id):
    """Delete a database backup"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        ensure_backup_columns(cur)
        
        # Check if backup exists
        cur.execute("SELECT id, backup_name, backup_path FROM backups WHERE id = %s", (backup_id,))
        backup = cur.fetchone()
        if not backup:
            cur.close()
            return jsonify({'error': 'Backup not found'}), 404
        _, backup_name, backup_path = backup
        
        # Delete backup
        cur.execute("DELETE FROM backups WHERE id = %s", (backup_id,))
        mysql.connection.commit()
        cur.close()

        if backup_path and os.path.exists(backup_path):
            os.remove(backup_path)
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'DELETE_BACKUP', f'Deleted backup: {backup_name}', request.remote_addr)
        
        return jsonify({'message': 'Backup deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete Backup Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete backup'}), 500


@super_admin_bp.route('/backups/<int:backup_id>/download', methods=['GET'])
@super_admin_required
def download_backup(backup_id):
    """Download a real SQL database backup file."""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500

    try:
        cur = mysql.connection.cursor()
        ensure_backup_columns(cur)
        cur.execute("SELECT backup_name, backup_path FROM backups WHERE id = %s", (backup_id,))
        backup = cur.fetchone()
        cur.close()

        if not backup:
            return jsonify({'error': 'Backup not found'}), 404

        backup_name, backup_path = backup
        if not backup_path or not os.path.exists(backup_path):
            return jsonify({'error': 'Backup file is missing. Create a new backup.'}), 404

        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'DOWNLOAD_BACKUP', f'Downloaded backup: {backup_name}', request.remote_addr)

        return send_file(
            backup_path,
            as_attachment=True,
            download_name=backup_name,
            mimetype='application/sql',
        )
    except Exception as e:
        print(f"Download Backup Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to download backup'}), 500


# =========================================================
# SECURITY
# =========================================================

@super_admin_bp.route('/security', methods=['GET'])
@super_admin_required
def get_security_stats():
    """Get security statistics and login attempt history."""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        ensure_security_log_columns(cur)

        cur.execute("SELECT COUNT(*) FROM security_logs")
        total_login_attempts = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM security_logs WHERE status = 'SUCCESS' OR action = 'LOGIN'")
        successful_logins = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'FAILED' OR action = 'FAILED_LOGIN'
        """)
        failed_logins = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'FAILED'
              AND created_at >= CURDATE()
        """)
        failed_logins_today = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'BLOCKED' OR action = 'BLOCKED_ACCESS'
        """)
        blocked_access_attempts = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM security_logs
            WHERE status = 'LOCKED' OR action = 'LOCKED_ACCOUNT'
        """)
        locked_accounts = cur.fetchone()[0]
        
        # Blocked accounts
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE status = 'blocked' OR status = 'suspended'
        """)
        blocked_accounts = cur.fetchone()[0]

        active_sessions = 0
        try:
            cur.execute("""
                SELECT COUNT(DISTINCT username) FROM security_logs
                WHERE status = 'SUCCESS'
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            """)
            active_sessions = cur.fetchone()[0]
        except Exception:
            active_sessions = successful_logins
        
        # OTP attempts
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE otp_expires IS NOT NULL
            AND otp_expires >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        """)
        otp_attempts = cur.fetchone()[0]
        
        # Recent login attempts
        cur.execute("""
            SELECT username, role, ip_address, browser, device, platform, created_at, status, description
            FROM security_logs
            ORDER BY created_at DESC
            LIMIT 50
        """)
        login_attempts = []
        for row in cur.fetchall():
            username, role, ip_address, browser, device, platform, created_at, status, description = row
            login_attempts.append({
                'username': username,
                'role': role,
                'ip_address': ip_address,
                'browser': browser,
                'device': device,
                'platform': platform,
                'timestamp': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
                ,
                'status': status,
                'description': description
            })
        
        # Suspicious activity
        cur.execute("""
            SELECT action, description, created_at
            FROM audit_logs
            WHERE action IN ('FAILED_LOGIN', 'DELETE_USER', 'DELETE_ADMIN')
            ORDER BY created_at DESC
            LIMIT 10
        """)
        suspicious_activity = []
        for row in cur.fetchall():
            action, description, created_at = row
            suspicious_activity.append({
                'type': action,
                'description': description,
                'timestamp': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({
            'totalLoginAttempts': total_login_attempts,
            'successfulLogins': successful_logins,
            'failedLogins': failed_logins,
            'failedLoginsToday': failed_logins_today,
            'blockedAccessAttempts': blocked_access_attempts,
            'lockedAccounts': locked_accounts,
            'activeSessions': active_sessions,
            'blockedAccounts': blocked_accounts,
            'otpAttempts': otp_attempts,
            'recentLogins': login_attempts[:10],
            'loginAttempts': login_attempts,
            'suspiciousActivity': suspicious_activity
        }), 200
        
    except Exception as e:
        print(f"Get Security Stats Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load security stats'}), 500


@super_admin_bp.route('/system-monitoring', methods=['GET'])
@super_admin_required
def get_system_monitoring():
    """Get IT system monitoring metrics."""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500

    database_status = 'healthy'
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
    except Exception:
        database_status = 'down'

    cpu_usage = None
    memory_usage = None
    try:
        import psutil
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory_usage = psutil.virtual_memory().percent
    except Exception:
        cpu_usage = 0
        memory_usage = 0

    try:
        disk = shutil.disk_usage(os.getcwd())
        storage_usage = round((disk.used / disk.total) * 100, 2) if disk.total else 0
    except Exception:
        storage_usage = 0

    uptime_seconds = int(time.time() - SERVER_STARTED_AT)

    return jsonify({
        'apiStatus': 'online',
        'databaseStatus': database_status,
        'serverHealth': 'healthy' if database_status == 'healthy' else 'warning',
        'cpuUsage': cpu_usage,
        'memoryUsage': memory_usage,
        'storageUsage': storage_usage,
        'systemUptime': uptime_seconds,
        'hostname': platform_module.node(),
        'platform': platform_module.platform(),
        'checkedAt': utc_now_naive().strftime('%Y-%m-%d %H:%M:%S'),
    }), 200


@super_admin_bp.route('/service-verification', methods=['GET'])
@super_admin_required
def get_service_verification_monitoring():
    """Get paid appointment and service verification monitoring."""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT
                a.id,
                COALESCE(u.fullname, u.username) AS patient_name,
                COALESCE(d.name, a.doctor_name) AS doctor_name,
                a.appointment_date,
                a.appointment_time,
                a.status,
                p.amount,
                p.payment_status,
                p.transaction_id,
                p.created_at
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN doctors d ON d.id = a.doctor_id
            LEFT JOIN payments p ON p.user_id = a.user_id
            WHERE LOWER(COALESCE(p.payment_status, '')) IN ('successful', 'success', 'completed', 'paid')
               OR LOWER(COALESCE(a.status, '')) IN ('completed', 'verified')
            ORDER BY COALESCE(p.created_at, a.created_at) DESC
            LIMIT 100
        """)
        records = []
        for row in cur.fetchall():
            appointment_id, patient_name, doctor_name, appointment_date, appointment_time, status, amount, payment_status, transaction_id, created_at = row
            service_status = str(status or 'Pending')
            records.append({
                'appointment_id': appointment_id,
                'patient_name': patient_name,
                'doctor_name': doctor_name,
                'appointment_date': appointment_date.strftime('%Y-%m-%d') if appointment_date else None,
                'appointment_time': str(appointment_time) if appointment_time else None,
                'service_status': service_status,
                'verification_status': 'Verified' if service_status.lower() in ['completed', 'verified'] else 'Pending',
                'refund_decision': 'Review' if service_status.lower() in ['cancelled', 'failed'] else 'Not requested',
                'amount': float(amount or 0),
                'payment_status': payment_status,
                'transaction_id': transaction_id,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None,
            })

        cur.execute("""
            SELECT
              SUM(CASE WHEN LOWER(COALESCE(payment_status, '')) IN ('successful', 'success', 'completed', 'paid') THEN 1 ELSE 0 END),
              SUM(CASE WHEN LOWER(COALESCE(payment_status, '')) IN ('failed', 'cancelled') THEN 1 ELSE 0 END)
            FROM payments
        """)
        paid_count, failed_count = cur.fetchone()
        cur.close()

        return jsonify({
            'records': records,
            'summary': {
                'paidAppointments': int(paid_count or 0),
                'failedPayments': int(failed_count or 0),
                'verificationRequests': len([item for item in records if item['verification_status'] == 'Pending']),
                'refundDecisions': len([item for item in records if item['refund_decision'] == 'Review']),
            }
        }), 200
    except Exception as e:
        print(f"Service Verification Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load service verification monitoring'}), 500


# =========================================================
# NOTIFICATIONS
# =========================================================

@super_admin_bp.route('/notifications', methods=['GET'])
@super_admin_required
def get_notifications():
    """Get all notifications"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    try:
        cur = mysql.connection.cursor()
        
        # Get notifications
        cur.execute("""
            SELECT id, title, message, recipient, recipient_type, status, created_at
            FROM notifications
            ORDER BY created_at DESC
            LIMIT 50
        """)
        
        notifications = []
        for row in cur.fetchall():
            notif_id, title, message, recipient, recipient_type, status, created_at = row
            notifications.append({
                'id': notif_id,
                'title': title,
                'message': message,
                'recipient': recipient,
                'recipient_type': recipient_type,
                'status': status or 'Unread',
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
            })
        
        cur.close()
        
        return jsonify({'notifications': notifications}), 200
        
    except Exception as e:
        print(f"Get Notifications Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load notifications'}), 500


@super_admin_bp.route('/notifications', methods=['POST'])
@super_admin_required
def send_notification():
    """Send a notification"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    data = request.get_json(force=True) or {}
    target = str(data.get('target', data.get('recipientType', 'all')) or 'all').strip()
    title = data.get('title', '').strip()
    message = data.get('message', '').strip()
    notification_type = str(data.get('type', 'system') or 'system').strip()
    explicit_user_ids = data.get('user_ids') or data.get('userIds') or []
    
    if not all([title, message]):
        return jsonify({'error': 'Title and message are required'}), 400
    
    try:
        cur = mysql.connection.cursor()
        recipients = fetch_notification_recipients(cur, target, explicit_user_ids)

        if not recipients:
            cur.close()
            return jsonify({'error': 'No matching recipients found.'}), 404

        sent_count = 0
        recipient_type = target.lower()
        for user_id, recipient, role in recipients:
            cur.execute("""
                INSERT INTO notifications
                  (user_id, title, message, recipient, notification_type, recipient_type, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'Unread', %s)
            """, (user_id, title, message, recipient, notification_type, recipient_type, utc_now_naive()))
            sent_count += 1
        
        mysql.connection.commit()
        cur.close()
        
        # Create audit log
        current_admin = get_current_super_admin()
        create_audit_log(current_admin.get('username'), 'SUPER_ADMIN', 'SEND_NOTIFICATION', f'Sent notification to {sent_count} {target} recipient(s)', request.remote_addr)
        
        return jsonify({
            'message': 'Notification sent successfully',
            'sent_count': sent_count,
            'target': target,
        }), 201
        
    except Exception as e:
        print(f"Send Notification Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to send notification'}), 500


# =========================================================
# PROFILE
# =========================================================

@super_admin_bp.route('/profile', methods=['GET'])
@super_admin_required
def get_profile():
    """Get super admin profile"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    current_admin = get_current_super_admin()
    if not current_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        cur = mysql.connection.cursor()
        
        admin_id = current_admin.get('super_admin_id')
        
        cur.execute(f"""
            SELECT id, username, NULL AS email, phone, fullname, created_at
            FROM {super_admin_table_name()}
            WHERE id = %s
        """, (admin_id,))
        
        row = cur.fetchone()
        cur.close()
        
        if not row:
            return jsonify({'error': 'Profile not found'}), 404
        
        admin_id, username, email, phone, fullname, created_at = row
        
        return jsonify({
            'id': admin_id,
            'username': username,
            'email': email,
            'phone': phone,
            'fullname': fullname,
            'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S') if created_at else None
        }), 200
        
    except Exception as e:
        print(f"Get Profile Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to load profile'}), 500


@super_admin_bp.route('/profile', methods=['PUT'])
@super_admin_required
def update_profile():
    """Update super admin profile"""
    if not mysql:
        return jsonify({'error': 'Database unavailable'}), 500
    
    current_admin = get_current_super_admin()
    if not current_admin:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json(force=True) or {}
    
    try:
        cur = mysql.connection.cursor()
        
        admin_id = current_admin.get('super_admin_id')
        
        update_fields = []
        update_values = []
        
        if 'fullname' in data:
            update_fields.append("fullname = %s")
            update_values.append(data['fullname'])
        if 'phone' in data:
            update_fields.append("phone = %s")
            update_values.append(data['phone'])
        if 'current_password' in data and 'new_password' in data:
            # Verify current password
            cur.execute(f"SELECT password_hash FROM {super_admin_table_name()} WHERE id = %s", (admin_id,))
            row = cur.fetchone()
            if not row or not verify_stored_password(row[0], data['current_password']):
                cur.close()
                return jsonify({'error': 'Current password is incorrect'}), 400
            
            update_fields.append("password_hash = %s")
            update_values.append(generate_password_hash(data['new_password']))
        
        if update_fields:
            update_values.append(admin_id)
            cur.execute(f"""
                UPDATE {super_admin_table_name()} SET {', '.join(update_fields)}
                WHERE id = %s
            """, update_values)
            mysql.connection.commit()
        
        cur.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"Update Profile Error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update profile'}), 500
