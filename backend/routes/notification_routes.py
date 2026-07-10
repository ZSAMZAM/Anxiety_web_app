"""Notification routes."""

from controllers import notification_controller
from routes.route_factory import build_blueprint

notification_bp = build_blueprint("notification", notification_controller)
