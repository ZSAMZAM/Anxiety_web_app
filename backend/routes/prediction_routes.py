"""Prediction and assessment routes."""

from controllers import prediction_controller
from routes.route_factory import build_blueprint

prediction_bp = build_blueprint("prediction", prediction_controller)
