"""
JWT helpers — token generate aur verify karna.
"""
import jwt
from datetime import datetime, timedelta
from flask import current_app


def generate_access_token(user_id: str, role: str, name: str) -> str:
    """Short-lived access token (default 60 min)."""
    cfg = current_app.config
    payload = {
        'sub': user_id,
        'role': role,
        'name': name,
        'type': 'access',
        'exp': datetime.utcnow() + timedelta(minutes=cfg['JWT_ACCESS_TOKEN_EXPIRES_MINUTES']),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, cfg['JWT_SECRET_KEY'], algorithm='HS256')


def generate_refresh_token(user_id: str) -> str:
    """Long-lived refresh token (default 7 days)."""
    cfg = current_app.config
    payload = {
        'sub': user_id,
        'type': 'refresh',
        'exp': datetime.utcnow() + timedelta(days=cfg['JWT_REFRESH_TOKEN_EXPIRES_DAYS']),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, cfg['JWT_SECRET_KEY'], algorithm='HS256')


def decode_token(token: str) -> dict:
    """
    Token decode karo.
    Raises jwt.ExpiredSignatureError, jwt.InvalidTokenError on failure.
    """
    cfg = current_app.config
    return jwt.decode(token, cfg['JWT_SECRET_KEY'], algorithms=['HS256'])
