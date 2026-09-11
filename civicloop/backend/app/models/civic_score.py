from datetime import datetime
from app.database import db


class CivicScore(db.Model):
    """
    Citizen ka cumulative civic score.
    Har user ka ek unique CivicScore record hota hai.
    """
    __tablename__ = 'civic_scores'

    id                    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id               = db.Column(db.String(36), db.ForeignKey('users.id'),
                                      nullable=False, unique=True, index=True)

    total_score           = db.Column(db.Integer, default=0)
    verified_reports      = db.Column(db.Integer, default=0)   # AI verified report submit kiya
    confirmations_made    = db.Column(db.Integer, default=0)   # Kisi aur ki issue confirm ki
    resolutions_verified  = db.Column(db.Integer, default=0)   # Resolution verify kiya

    updated_at            = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'total_score': self.total_score,
            'verified_reports': self.verified_reports,
            'confirmations_made': self.confirmations_made,
            'resolutions_verified': self.resolutions_verified,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
