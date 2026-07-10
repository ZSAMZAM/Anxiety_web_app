"""Prediction request handlers."""

from controllers.base_controller import make_service_handler
from services import prediction_service


def make_handler(endpoint):
    return make_service_handler(prediction_service, endpoint)
