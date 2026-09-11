from datetime import datetime
from app.database import db

class Department(db.Model):
    __tablename__ = 'departments'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name          = db.Column(db.String(200), unique=True, nullable=False)
    code          = db.Column(db.String(50),  unique=True, nullable=False)
    description   = db.Column(db.Text, nullable=True)
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(20),  nullable=True)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'code': self.code,
            'description': self.description, 'contact_email': self.contact_email,
            'contact_phone': self.contact_phone, 'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
