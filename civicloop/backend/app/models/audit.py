from datetime import datetime
from app.database import db


class AuditLog(db.Model):
    """
    Har sensitive admin/system action ka immutable log.
    AdminAuditLogs page pe dikhta hai.
    """
    __tablename__ = 'audit_logs'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    action       = db.Column(db.String(100), nullable=False, index=True)
    # e.g. ASSIGN_OFFICER, CHANGE_ROLE, ESCALATE, UPDATE_STATUS, CREATE_DEPT
    entity_type  = db.Column(db.String(100), nullable=True)
    entity_id    = db.Column(db.String(36),  nullable=True)
    description  = db.Column(db.Text, nullable=True)
    old_value    = db.Column(db.JSON, nullable=True)
    new_value    = db.Column(db.JSON, nullable=True)
    ip_address   = db.Column(db.String(50), nullable=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='audit_logs', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'description': self.description,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
