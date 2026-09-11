"""
Authentication security utilities — password hashing and verification.
Uses Werkzeug security (scrypt/pbkdf2) for high reliability across Python versions.
"""
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password: str) -> str:
    """Hash password using Werkzeug."""
    return generate_password_hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hashed password.
    Supports Werkzeug hashes (scrypt, pbkdf2) and legacy bcrypt hashes.
    """
    if not plain_password or not hashed_password:
        return False

    # Standard Werkzeug hash check
    if hashed_password.startswith(('scrypt:', 'pbkdf2:')):
        return check_password_hash(hashed_password, plain_password)

    # Legacy passlib / raw bcrypt hash check
    try:
        from passlib.hash import bcrypt
        return bcrypt.verify(plain_password, hashed_password)
    except Exception:
        pass

    try:
        import bcrypt
        hashed_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        plain_bytes = plain_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        pass

    return False
