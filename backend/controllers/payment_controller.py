"""Payment request handlers."""

from controllers.base_controller import make_service_handler
from services import payment_service


def make_handler(endpoint):
    return make_service_handler(payment_service, endpoint)
