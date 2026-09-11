"""
Auth routes — register, login, refresh.
Blueprint prefix: /api/v1/auth
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, g
import jwt

from app.database import db
from app.models.user import User
from app.models.civic_score import CivicScore
from app.auth.security import hash_password, verify_password
from app.auth.helpers import generate_access_token, generate_refresh_token, decode_token
from app.auth.middleware import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')


# ─── Register ────────────────────────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Body: { name, email OR mobile, password, role? }
    Default role: 'citizen'
    """
    data = request.get_json(force=True) or {}

    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower() or None
    mobile   = (data.get('mobile') or '').strip() or None
    password = data.get('password', '')
    role     = data.get('role', 'citizen')

    # Basic validation
    if not name:
        return jsonify({'detail': 'Name is required'}), 400
    if not email and not mobile:
        return jsonify({'detail': 'Email or mobile is required'}), 400
    if len(password) < 6:
        return jsonify({'detail': 'Password must be at least 6 characters'}), 400

    # Only allowed roles via public registration
    allowed_roles = {'citizen', 'field_officer'}
    if role not in allowed_roles:
        role = 'citizen'

    # Duplicate check
    if email and User.query.filter_by(email=email).first():
        return jsonify({'detail': 'Email already registered'}), 409
    if mobile and User.query.filter_by(mobile=mobile).first():
        return jsonify({'detail': 'Mobile already registered'}), 409

    hashed = hash_password(password)
    user = User(name=name, email=email, mobile=mobile,
                hashed_password=hashed, role=role)
    db.session.add(user)
    db.session.flush()

    # Initialize civic score for citizen
    if role == 'citizen':
        db.session.add(CivicScore(user_id=user.id))

    db.session.commit()

    access_token  = generate_access_token(user.id, user.role, user.name)
    refresh_token = generate_refresh_token(user.id)
    user_dict     = user.to_dict()

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_dict,
        'role': user.role,
        'user_id': user.id,
        'name': user.name,
    }), 201


# ─── Login ────────────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Body: { identifier OR email OR mobile, password }
    """
    data = request.get_json(force=True) or {}

    identifier = (data.get('identifier') or '').strip()
    email      = (data.get('email') or '').strip().lower() or None
    mobile     = (data.get('mobile') or '').strip() or None
    password   = data.get('password', '')

    if not password:
        return jsonify({'detail': 'Password is required'}), 400

    # Search user by identifier (which can be email or mobile)
    user = None
    if identifier:
        id_lower = identifier.lower()
        user = User.query.filter(
            (User.email == id_lower) | (User.mobile == identifier)
        ).first()

    if not user and email:
        user = User.query.filter_by(email=email).first()

    if not user and mobile:
        user = User.query.filter_by(mobile=mobile).first()

    if not user:
        return jsonify({'detail': 'Invalid email/mobile or password'}), 401

    if not user.is_active:
        return jsonify({'detail': 'Account is disabled'}), 403

    if not verify_password(password, user.hashed_password):
        return jsonify({'detail': 'Invalid email/mobile or password'}), 401

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token  = generate_access_token(user.id, user.role, user.name)
    refresh_token = generate_refresh_token(user.id)
    user_dict     = user.to_dict()

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_dict,
        'role': user.role,
        'user_id': user.id,
        'name': user.name,
    })


# ─── Refresh ──────────────────────────────────────────────────────────────────

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Body: { refresh_token }
    Returns new access_token.
    """
    data = request.get_json(force=True) or {}
    token = data.get('refresh_token', '')

    if not token:
        return jsonify({'detail': 'refresh_token is required'}), 400

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        return jsonify({'detail': 'Refresh token expired, please login again'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'detail': 'Invalid refresh token'}), 401

    if payload.get('type') != 'refresh':
        return jsonify({'detail': 'Invalid token type'}), 401

    user = User.query.get(payload['sub'])
    if not user or not user.is_active:
        return jsonify({'detail': 'User not found or inactive'}), 401

    access_token = generate_access_token(user.id, user.role, user.name)
    return jsonify({'access_token': access_token})


# ─── Me (current user info) ───────────────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    return jsonify(g.current_user.to_dict())
