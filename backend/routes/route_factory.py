"""Blueprint construction helpers."""

from flask import Blueprint

from repositories import application_repository


def build_blueprint(category, controller_module):
    blueprint = Blueprint(f"{category}_routes", __name__)
    handlers = {}
    for spec in application_repository.get_route_specs(category):
        endpoint = spec["endpoint"].replace(".", "_")
        handlers.setdefault(endpoint, controller_module.make_handler(spec["endpoint"]))
        blueprint.add_url_rule(
            spec["rule"],
            endpoint=endpoint,
            view_func=handlers[endpoint],
            methods=spec["methods"],
        )
    return blueprint
