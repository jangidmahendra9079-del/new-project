"""
SLA service — issue create hone par deadline set karna.
"""
from datetime import datetime, timedelta
from flask import current_app
from app.models.sla import SLARule


# Fallback hours agar DB mein rule nahi mila
_FALLBACK_HOURS = {
    'critical': 24,
    'high': 48,
    'medium': 72,
    'low': 168,
}


def get_sla_hours(severity: str) -> int:
    """SLARule table ya config se hours lo."""
    try:
        rule = SLARule.query.filter_by(severity=severity, is_active=True).first()
        if rule:
            return rule.hours
    except Exception:
        pass

    # Config se fallback
    cfg = current_app.config
    mapping = {
        'critical': cfg.get('SLA_CRITICAL_HOURS', 24),
        'high':     cfg.get('SLA_HIGH_HOURS',     48),
        'medium':   cfg.get('SLA_MEDIUM_HOURS',   72),
        'low':      cfg.get('SLA_LOW_HOURS',      168),
    }
    return mapping.get(severity, 72)


def compute_sla_deadline(severity: str) -> datetime:
    """Issue create hone par utcnow + SLA hours."""
    hours = get_sla_hours(severity)
    return datetime.utcnow() + timedelta(hours=hours)
