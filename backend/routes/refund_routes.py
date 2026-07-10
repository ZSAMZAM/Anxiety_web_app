"""Refund routes."""

from controllers import refund_controller
from routes.route_factory import build_blueprint

refund_bp = build_blueprint("refund", refund_controller)
