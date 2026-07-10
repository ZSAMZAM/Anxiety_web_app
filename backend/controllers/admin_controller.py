"""Admin request handlers."""

from controllers.base_controller import make_service_handler
from services import admin_service


def make_handler(endpoint):
    return make_service_handler(admin_service, endpoint)
