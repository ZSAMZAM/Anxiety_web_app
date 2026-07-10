"""Appointment routes."""

from controllers import appointment_controller
from routes.route_factory import build_blueprint

appointment_bp = build_blueprint("appointment", appointment_controller)
