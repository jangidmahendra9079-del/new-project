from datetime import datetime
from app.database import db


class ResolutionProof(db.Model):
    """
    Field officer issue resolve karne ke baad before/after photos submit karta hai.
    Phir citizen verify karta hai ki fix hua ya nahi.
    """
    __tablename__ = 'resolution_proofs'

    id                = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assignment_id     = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False, index=True)
    issue_id          = db.Column(db.String(36), db.ForeignKey('issues.id'), nullable=False, index=True)
    submitted_by_id   = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    before_photo_url  = db.Column(db.String(500), nullable=True)
    after_photo_url   = db.Column(db.String(500), nullable=True)
    notes             = db.Column(db.Text, nullable=True)

    # GPS at time of resolution (verify karne ke liye)
    resolution_lat    = db.Column(db.Float, nullable=True)
    resolution_lng    = db.Column(db.Float, nullable=True)

    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    submitted_by = db.relationship('User', foreign_keys=[submitted_by_id])

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'issue_id': self.issue_id,
            'submitted_by_id': self.submitted_by_id,
            'before_photo_url': self.before_photo_url,
            'after_photo_url': self.after_photo_url,
            'notes': self.notes,
            'resolution_lat': self.resolution_lat,
            'resolution_lng': self.resolution_lng,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
