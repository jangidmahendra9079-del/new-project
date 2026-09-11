import uuid
from datetime import datetime
from app.database import db


class Report(db.Model):
    """
    Citizen ka raw submitted report.
    Ek Report process hokar Issue ban sakti hai (merged ya new_issue).
    """
    __tablename__ = 'reports'

    id               = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id      = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    issue_id         = db.Column(db.String(36), db.ForeignKey('issues.id'), nullable=True, index=True)
    # issue_id set hoti hai jab report process ho jaati hai

    latitude         = db.Column(db.Float, nullable=True)
    longitude        = db.Column(db.Float, nullable=True)
    description      = db.Column(db.Text, nullable=True)

    image_url        = db.Column(db.String(500), nullable=True)
    image_hash       = db.Column(db.String(100), nullable=True)  # perceptual hash for dedup

    # Citizen ka manual override (optional)
    human_category   = db.Column(db.String(100), nullable=True)
    human_severity   = db.Column(db.String(50),  nullable=True)

    # AI analysis results
    ai_category      = db.Column(db.String(100), nullable=True)
    ai_severity      = db.Column(db.String(50),  nullable=True)
    ai_confidence    = db.Column(db.Float, nullable=True)
    ai_reason        = db.Column(db.Text, nullable=True)

    # Status: pending / ai_processed / merged / new_issue / rejected
    status           = db.Column(db.String(30), default='pending', index=True)

    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    reporter = db.relationship('User', backref='reports', foreign_keys=[reporter_id])

    def to_dict(self):
        return {
            'id': self.id,
            'reporter_id': self.reporter_id,
            'issue_id': self.issue_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'description': self.description,
            'image_url': self.image_url,
            'human_category': self.human_category,
            'human_severity': self.human_severity,
            'ai_category': self.ai_category,
            'ai_severity': self.ai_severity,
            'ai_confidence': self.ai_confidence,
            'ai_reason': self.ai_reason,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
