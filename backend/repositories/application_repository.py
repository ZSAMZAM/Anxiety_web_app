"""Repository facade for application route dispatch."""

from utils.runtime import dispatch, get_route_specs, init_repository

__all__ = ["dispatch", "get_route_specs", "init_repository"]
