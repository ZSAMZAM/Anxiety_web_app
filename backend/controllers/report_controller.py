"""Report request handlers."""

from controllers.base_controller import make_service_handler
from services import report_service


def make_handler(endpoint):
    return make_service_handler(report_service, endpoint)
