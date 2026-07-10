"""Patient request handlers."""

from controllers.base_controller import make_service_handler
from services import patient_service


def make_handler(endpoint):
    return make_service_handler(patient_service, endpoint)
