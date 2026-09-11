from datetime import datetime
from app.database import db


class SLARule(db.Model):
    """
    Per-severity SLA configuration (hours mein).
    Config se seed kiya jaata hai, admin update kar sakta hai.
    """
    __tablename__ = 'sla_rules'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    severity   = db.Column(db.String(20), unique=True, nullable=False)
    # critical / high / medium / low
    hours      = db.Column(db.Integer, nullable=False)
    is_active  = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'severity': self.severity,
            'hours': self.hours,
            'is_active': self.is_active,
        }
