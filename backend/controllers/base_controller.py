"""Controller helpers shared by feature controllers."""


def make_service_handler(service_module, endpoint):
    def handler(**kwargs):
        return service_module.dispatch(endpoint, **kwargs)

    handler.__name__ = f"handle_{endpoint.replace('.', '_')}"
    return handler
