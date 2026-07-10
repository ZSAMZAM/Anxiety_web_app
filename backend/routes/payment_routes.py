"""Payment routes."""

from controllers import payment_controller
from routes.route_factory import build_blueprint

payment_bp = build_blueprint("payment", payment_controller)
