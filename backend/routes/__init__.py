"""Route registration for the AnxietyCare backend."""

from routes.admin_routes import admin_bp
from routes.appointment_routes import appointment_bp
from routes.auth_routes import auth_bp
from routes.doctor_routes import doctor_bp
from routes.notification_routes import notification_bp
from routes.patient_routes import patient_bp
from routes.payment_routes import payment_bp
from routes.prediction_routes import prediction_bp
from routes.refund_routes import refund_bp
from routes.report_routes import report_bp
from routes.system_routes import system_bp
from routes.super_admin_routes import super_admin_bp


def register_blueprints(app):
    for blueprint in [
        system_bp,
        auth_bp,
        patient_bp,
        doctor_bp,
        admin_bp,
        appointment_bp,
        payment_bp,
        refund_bp,
        prediction_bp,
        report_bp,
        notification_bp,
    ]:
        app.register_blueprint(blueprint)
    app.register_blueprint(super_admin_bp, url_prefix="/api/super-admin")
