"""Report routes."""

from controllers import report_controller
from routes.route_factory import build_blueprint

report_bp = build_blueprint("report", report_controller)
