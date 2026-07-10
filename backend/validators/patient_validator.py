"""Patient request validation."""


def require_fields(data, fields):
    missing = [field for field in fields if not data.get(field)]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    return None
