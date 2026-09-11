import uuid
from datetime import datetime
from app.database import db

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = db.Column(db.String(200), nullable=False)
    email         = db.Column(db.String(255), unique=True, nullable=True, index=True)
    mobile        = db.Column(db.String(20),  unique=True, nullable=True, index=True)
    hashed_password = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.String(50), nullable=False, default='citizen')
    # citizen | field_officer | department_officer | super_admin

    ward_id       = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    is_active     = db.Column(db.Boolean, default=True)
    is_verified   = db.Column(db.Boolean, default=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login    = db.Column(db.DateTime, nullable=True)

    # relationships
    ward         = db.relationship('Ward', backref='residents', foreign_keys=[ward_id])
    department   = db.relationship('Department', backref='officers', foreign_keys=[department_id])
    civic_score  = db.relationship('CivicScore', backref='user', uselist=False)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'email': self.email,
            'mobile': self.mobile, 'role': self.role,
            'ward_id': self.ward_id, 'department_id': self.department_id,
            'is_active': self.is_active, 'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }
