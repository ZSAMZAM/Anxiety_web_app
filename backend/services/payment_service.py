"""Payment service layer."""

from repositories import application_repository


def dispatch(endpoint, **kwargs):
    return application_repository.dispatch(endpoint, **kwargs)
