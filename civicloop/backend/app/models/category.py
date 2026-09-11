from datetime import datetime
from app.database import db

class Category(db.Model):
    __tablename__ = 'categories'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name          = db.Column(db.String(100), unique=True, nullable=False)
    slug          = db.Column(db.String(100), unique=True, nullable=False)
    description   = db.Column(db.Text, nullable=True)
    icon          = db.Column(db.String(100), nullable=True)
    color         = db.Column(db.String(20),  nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    department = db.relationship('Department', backref='categories')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'slug': self.slug,
            'description': self.description, 'icon': self.icon,
            'color': self.color, 'department_id': self.department_id,
            'is_active': self.is_active,
        }
