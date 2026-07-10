"""Doctor routes."""

from controllers import doctor_controller
from routes.route_factory import build_blueprint

doctor_bp = build_blueprint("doctor", doctor_controller)
