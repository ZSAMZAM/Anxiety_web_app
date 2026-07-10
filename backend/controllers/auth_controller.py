"""Auth request handlers."""

from controllers.base_controller import make_service_handler
from services import auth_service


def make_handler(endpoint):
    return make_service_handler(auth_service, endpoint)
