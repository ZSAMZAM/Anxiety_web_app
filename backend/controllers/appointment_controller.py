"""Appointment request handlers."""

from controllers.base_controller import make_service_handler
from services import appointment_service


def make_handler(endpoint):
    return make_service_handler(appointment_service, endpoint)
