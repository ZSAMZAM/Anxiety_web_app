"""System request handlers."""

from controllers.base_controller import make_service_handler
from services import system_service


def make_handler(endpoint):
    return make_service_handler(system_service, endpoint)
