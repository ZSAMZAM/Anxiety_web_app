"""Doctor request handlers."""

from controllers.base_controller import make_service_handler
from services import doctor_service


def make_handler(endpoint):
    return make_service_handler(doctor_service, endpoint)
