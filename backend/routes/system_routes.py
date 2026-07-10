"""System routes."""

from controllers import system_controller
from routes.route_factory import build_blueprint

system_bp = build_blueprint("system", system_controller)
