"""Patient routes."""

from controllers import patient_controller
from routes.route_factory import build_blueprint

patient_bp = build_blueprint("patient", patient_controller)
