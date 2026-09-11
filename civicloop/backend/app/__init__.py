"""
Flask app factory — sabko yahan initialize karo.
"""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS

from app.config import Config
from app.database import db, migrate


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    # CORS — frontend ko allow karo
    CORS(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}},
         supports_credentials=True)

    # DB init
    db.init_app(app)
    migrate.init_app(app, db)

    # Import all models so SQLAlchemy knows about them
    with app.app_context():
        from app.models import (
            User, Department, Ward, Category,
            Issue, IssueStatusHistory, IssueConfirmation,
            Report, Assignment, ResolutionProof,
            Notification, CivicScore, SLARule,
            RecurrenceAlert, AuditLog,
        )
        db.create_all()

    # Register blueprints
    from app.auth.routes import auth_bp
    from app.routes.reports import reports_bp
    from app.routes.issues import issues_bp
    from app.routes.officer import officer_bp
    from app.routes.admin import admin_bp
    from app.routes.civic import civic_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(issues_bp)
    app.register_blueprint(officer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(civic_bp)

    # Serve uploaded images
    upload_dir = app.config['UPLOAD_DIR']
    os.makedirs(upload_dir, exist_ok=True)

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(upload_dir, filename)

    # Health check
    @app.route('/api/v1/health')
    def health():
        return {'status': 'ok', 'app': 'CivicLoop'}, 200

    return app
