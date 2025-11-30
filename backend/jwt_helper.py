import os
from datetime import datetime, timedelta, timezone
from functools import wraps
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple

import jwt
from flask import abort, current_app, g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request


def _get_secret() -> str:
    secret = current_app.config.get("JWT_SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
    if not secret:
        abort(500, description="JWT secret key is not configured")
    return secret


def create_jwt(subject: str, role: str = "guest", expires_in_minutes: int = 30) -> Tuple[str, datetime]:
    expiration = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    payload = {"role": role, "sub": subject, "exp": expiration}
    token = jwt.encode(payload, _get_secret(), algorithm="HS256")
    return token, expiration


def decode_jwt(token: str) -> Dict[str, Any]:
    return jwt.decode(token, _get_secret(), algorithms=["HS256"])


def guest_or_user_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            abort(401, description="Authorization header missing or invalid")

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_jwt(token)
            role = payload.get("role")
            if role in ("guest", "user"):
                g.current_role = role
                g.current_identity = payload.get("sub")
                return fn(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            abort(401, description="Token has expired")
        except jwt.InvalidTokenError:
            payload = None

        try:
            verify_jwt_in_request()
            g.current_role = "user"
            g.current_identity = get_jwt_identity()
            return fn(*args, **kwargs)
        except Exception:
            abort(401, description="Unauthorized")

    return wrapper
