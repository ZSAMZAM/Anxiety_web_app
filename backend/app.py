"""Flask application startup for the AnxietyCare backend."""

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from config.settings import apply_config, load_local_env
from repositories import application_repository
from routes import register_blueprints


def configure_logging(flask_app):
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    flask_app.logger.setLevel(getattr(logging, level, logging.INFO))


def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if os.getenv("ENABLE_HSTS", "1").strip().lower() in {"1", "true", "yes"}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


def create_app():
    load_local_env(os.path.dirname(__file__))

    flask_app = Flask(__name__)
    flask_app.wsgi_app = ProxyFix(flask_app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
    apply_config(flask_app)
    configure_logging(flask_app)
    CORS(
        flask_app,
        origins=flask_app.config["ALLOWED_ORIGINS"],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    flask_app.config["CORS_HEADERS"] = "Content-Type,Authorization"
    flask_app.config["CORS_SUPPORTS_CREDENTIALS"] = True
    flask_app.after_request(add_security_headers)

    application_repository.init_repository(flask_app)
    register_blueprints(flask_app)

    @flask_app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Endpoint not found", "status": 404}), 404

    @flask_app.errorhandler(500)
    def internal_error(error):
        flask_app.logger.exception("Internal server error: %s", error)
        return jsonify({"error": "Internal server error", "status": 500}), 500

    @flask_app.errorhandler(403)
    def forbidden(_error):
        return jsonify({"error": "Forbidden", "status": 403}), 403

    @flask_app.errorhandler(401)
    def unauthorized(_error):
        return jsonify({"error": "Unauthorized", "status": 401}), 401

    return flask_app


app = create_app()


if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0").strip().lower() in {"1", "true", "yes"},
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        threaded=True,
        use_reloader=False,
    )
