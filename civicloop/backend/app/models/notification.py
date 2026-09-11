from datetime import datetime
from app.database import db


class Notification(db.Model):
    """
    User ko real-time notifications (WebSocket ke alawa DB mein bhi store).
    """
    __tablename__ = 'notifications'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    type        = db.Column(db.String(50), nullable=False)
    # ISSUE_STATUS_CHANGED / ISSUE_ASSIGNED / ISSUE_OVERDUE / etc.
    title       = db.Column(db.String(300), nullable=True)
    message     = db.Column(db.Text, nullable=True)
    entity_id   = db.Column(db.String(36), nullable=True)   # issue_id / assignment_id
    is_read     = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='notifications', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'entity_id': self.entity_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
