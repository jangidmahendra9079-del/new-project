from datetime import datetime
from app.database import db


class Assignment(db.Model):
    """
    Admin kisi officer ko koi issue assign karta hai.
    Status flow: pending → accepted → in_progress → completed
    """
    __tablename__ = 'assignments'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id        = db.Column(db.String(36), db.ForeignKey('issues.id'), nullable=False, index=True)
    officer_id      = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    assigned_by_id  = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    # pending / accepted / in_progress / completed / cancelled
    status          = db.Column(db.String(30), default='pending', index=True)

    notes           = db.Column(db.Text, nullable=True)
    accepted_at     = db.Column(db.DateTime, nullable=True)
    started_at      = db.Column(db.DateTime, nullable=True)
    completed_at    = db.Column(db.DateTime, nullable=True)

    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    officer     = db.relationship('User', backref='assignments', foreign_keys=[officer_id])
    assigned_by = db.relationship('User', foreign_keys=[assigned_by_id])

    def to_dict(self):
        return {
            'assignment_id': self.id,
            'issue_id': self.issue_id,
            'officer_id': self.officer_id,
            'assigned_by_id': self.assigned_by_id,
            'assignment_status': self.status,
            'notes': self.notes,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
