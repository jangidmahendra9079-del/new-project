import uuid
from datetime import datetime
from app.database import db

class Issue(db.Model):
    __tablename__ = 'issues'

    id                 = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    civic_id           = db.Column(db.String(30), unique=True, nullable=False, index=True)
    title              = db.Column(db.String(500), nullable=False)
    description        = db.Column(db.Text, nullable=True)

    latitude           = db.Column(db.Float, nullable=True)
    longitude          = db.Column(db.Float, nullable=True)
    address            = db.Column(db.Text, nullable=True)

    category_id        = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    severity           = db.Column(db.String(20), default='medium')   # low/medium/high/critical
    priority           = db.Column(db.String(20), default='medium')
    priority_score     = db.Column(db.Float, default=0.0)
    status             = db.Column(db.String(30), default='reported')
    # reported/ai_verified/assigned/in_progress/resolution_pending/
    # citizen_verification/closed/reopened/overdue/rejected

    ward_id            = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=True)
    department_id      = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)

    report_count       = db.Column(db.Integer, default=1)
    confirmation_count = db.Column(db.Integer, default=0)

    ai_category        = db.Column(db.String(100), nullable=True)
    ai_severity        = db.Column(db.String(50),  nullable=True)
    ai_confidence      = db.Column(db.Float, nullable=True)
    ai_reason          = db.Column(db.Text, nullable=True)

    image_url          = db.Column(db.String(500), nullable=True)
    image_hash         = db.Column(db.String(100), nullable=True)

    sla_deadline       = db.Column(db.DateTime, nullable=True)
    assigned_at        = db.Column(db.DateTime, nullable=True)
    resolved_at        = db.Column(db.DateTime, nullable=True)
    closed_at          = db.Column(db.DateTime, nullable=True)

    recurrence_count   = db.Column(db.Integer, default=0)
    is_recurring       = db.Column(db.Boolean, default=False)
    is_near_school     = db.Column(db.Boolean, default=False)
    is_near_hospital   = db.Column(db.Boolean, default=False)

    created_by_id      = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at         = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at         = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    category         = db.relationship('Category', backref='issues')
    ward             = db.relationship('Ward', backref='issues')
    department       = db.relationship('Department', backref='issues')
    status_history   = db.relationship('IssueStatusHistory', backref='issue',
                                       order_by='IssueStatusHistory.created_at')
    confirmations    = db.relationship('IssueConfirmation', backref='issue')
    reports          = db.relationship('Report', backref='issue',
                                       foreign_keys='Report.issue_id')
    assignments      = db.relationship('Assignment', backref='issue')
    resolution_proofs= db.relationship('ResolutionProof', backref='issue')

    def to_dict(self):
        return {
            'id': self.id, 'civic_id': self.civic_id, 'title': self.title,
            'description': self.description, 'latitude': self.latitude,
            'longitude': self.longitude, 'address': self.address,
            'category_id': self.category_id, 'severity': self.severity,
            'priority': self.priority, 'priority_score': self.priority_score,
            'status': self.status, 'ward_id': self.ward_id,
            'department_id': self.department_id,
            'report_count': self.report_count,
            'confirmation_count': self.confirmation_count,
            'ai_category': self.ai_category, 'ai_severity': self.ai_severity,
            'ai_confidence': self.ai_confidence, 'ai_reason': self.ai_reason,
            'image_url': self.image_url,
            'sla_deadline': self.sla_deadline.isoformat() if self.sla_deadline else None,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'is_recurring': self.is_recurring,
            'created_by_id': self.created_by_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IssueStatusHistory(db.Model):
    __tablename__ = 'status_history'

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id       = db.Column(db.String(36), db.ForeignKey('issues.id'), nullable=False, index=True)
    old_status     = db.Column(db.String(50), nullable=True)
    new_status     = db.Column(db.String(50), nullable=False)
    changed_by_id  = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    note           = db.Column(db.Text, nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'issue_id': self.issue_id,
            'old_status': self.old_status, 'new_status': self.new_status,
            'changed_by_id': self.changed_by_id, 'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class IssueConfirmation(db.Model):
    __tablename__ = 'issue_confirmations'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_id   = db.Column(db.String(36), db.ForeignKey('issues.id'), nullable=False, index=True)
    user_id    = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    note       = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
