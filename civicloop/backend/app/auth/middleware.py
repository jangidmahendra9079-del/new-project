"""
Auth middleware — JWT verify + role-based access decorators.
"""
from functools import wraps
from flask import request, jsonify, g
import jwt

from app.auth.helpers import decode_token
from app.models.user import User


def _get_token_from_header() -> str | None:
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return None


def require_auth(f):
    """
    JWT verify karo, user ko g.current_user mein daalo.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_token_from_header()
        if not token:
            return jsonify({'detail': 'Authorization token missing'}), 401

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({'detail': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'detail': 'Invalid token'}), 401

        if payload.get('type') != 'access':
            return jsonify({'detail': 'Invalid token type'}), 401

        user = User.query.get(payload['sub'])
        if not user or not user.is_active:
            return jsonify({'detail': 'User not found or inactive'}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated


def require_roles(*roles):
    """
    Role-based access control.
    Usage: @require_roles('super_admin', 'department_officer')
    """
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.current_user.role not in roles:
                return jsonify({'detail': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
