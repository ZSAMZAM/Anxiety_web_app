"""Admin and IT-management routes."""

from controllers import admin_controller
from routes.route_factory import build_blueprint

admin_bp = build_blueprint("admin", admin_controller)
