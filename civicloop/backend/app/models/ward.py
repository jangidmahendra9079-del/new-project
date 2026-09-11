from datetime import datetime
from app.database import db

class Ward(db.Model):
    __tablename__ = 'wards'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(200), nullable=False)
    ward_number = db.Column(db.Integer, unique=True, nullable=False)
    city        = db.Column(db.String(200), nullable=False, default='CivicCity')
    district    = db.Column(db.String(200), nullable=True)
    state       = db.Column(db.String(200), nullable=True)
    center_lat  = db.Column(db.Float, nullable=True)
    center_lng  = db.Column(db.Float, nullable=True)
    population  = db.Column(db.Integer, nullable=True)
    area_sq_km  = db.Column(db.Float, nullable=True)
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'ward_number': self.ward_number,
            'city': self.city, 'district': self.district, 'state': self.state,
            'center_lat': self.center_lat, 'center_lng': self.center_lng,
            'population': self.population, 'is_active': self.is_active,
        }
