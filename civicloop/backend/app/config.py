import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

class Config:
    # Flask
    SECRET_KEY = os.getenv('JWT_SECRET', 'civicloop-secret-change-me')
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'

    # SQLite — no server needed
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'civicloop.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"connect_args": {"check_same_thread": False}}

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', 'civicloop-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 60))
    JWT_REFRESH_TOKEN_EXPIRES_DAYS   = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 7))

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')

    # Uploads
    UPLOAD_DIR       = os.path.join(BASE_DIR, 'uploads')
    MAX_FILE_SIZE_MB = int(os.getenv('MAX_FILE_SIZE_MB', 10))

    # Gemini AI
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL   = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

    # Duplicate detection
    DUPLICATE_RADIUS_METERS        = int(os.getenv('DUPLICATE_RADIUS_METERS', 50))
    DUPLICATE_AUTO_MERGE_THRESHOLD = float(os.getenv('DUPLICATE_AUTO_MERGE_THRESHOLD', 0.85))
    DUPLICATE_ASK_THRESHOLD        = float(os.getenv('DUPLICATE_ASK_THRESHOLD', 0.60))

    # SLA (hours)
    SLA_CRITICAL_HOURS = int(os.getenv('SLA_CRITICAL_HOURS', 24))
    SLA_HIGH_HOURS     = int(os.getenv('SLA_HIGH_HOURS', 48))
    SLA_MEDIUM_HOURS   = int(os.getenv('SLA_MEDIUM_HOURS', 72))
    SLA_LOW_HOURS      = int(os.getenv('SLA_LOW_HOURS', 168))

    # Civic score points
    CIVIC_SCORE_VERIFIED_REPORT  = int(os.getenv('CIVIC_SCORE_VERIFIED_REPORT', 10))
    CIVIC_SCORE_CONFIRMATION     = int(os.getenv('CIVIC_SCORE_CONFIRMATION', 5))
    CIVIC_SCORE_RESOLUTION_VERIFY= int(os.getenv('CIVIC_SCORE_RESOLUTION_VERIFY', 10))
