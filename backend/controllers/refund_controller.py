"""Refund request handlers."""

from controllers.base_controller import make_service_handler
from services import refund_service


def make_handler(endpoint):
    return make_service_handler(refund_service, endpoint)
