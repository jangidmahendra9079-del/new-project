from datetime import datetime
from app.database import db


class RecurrenceAlert(db.Model):
    """
    Jab kisi ward mein same category ka issue baar baar aata hai
    toh system ek RecurrenceAlert generate karta hai.
    Admin dashboard mein dikhta hai.
    """
    __tablename__ = 'recurrence_alerts'

    id               = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category         = db.Column(db.String(100), nullable=False, index=True)
    ward_id          = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=True)
    occurrence_count = db.Column(db.Integer, nullable=False, default=2)
    period_months    = db.Column(db.Integer, nullable=False, default=3)
    description      = db.Column(db.Text, nullable=True)
    is_resolved      = db.Column(db.Boolean, default=False)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ward = db.relationship('Ward', backref='recurrence_alerts', foreign_keys=[ward_id])

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'ward_id': self.ward_id,
            'occurrence_count': self.occurrence_count,
            'period_months': self.period_months,
            'description': self.description,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
