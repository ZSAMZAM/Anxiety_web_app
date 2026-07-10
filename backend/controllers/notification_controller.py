"""Notification request handlers."""

from controllers.base_controller import make_service_handler
from services import notification_service


def make_handler(endpoint):
    return make_service_handler(notification_service, endpoint)
