"""Authentication routes."""

from controllers import auth_controller
from routes.route_factory import build_blueprint

auth_bp = build_blueprint("auth", auth_controller)
