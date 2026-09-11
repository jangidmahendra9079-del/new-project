"""
Civic Score service — citizen ko points add karna.
"""
from app.database import db
from app.models.civic_score import CivicScore


def _get_or_create_score(user_id: str) -> CivicScore:
    score = CivicScore.query.filter_by(user_id=user_id).first()
    if not score:
        score = CivicScore(user_id=user_id, total_score=0)
        db.session.add(score)
        db.session.flush()
    return score


def add_verified_report_score(user_id: str, points: int = 10):
    """AI ne report verify kiya → +points"""
    score = _get_or_create_score(user_id)
    score.total_score += points
    score.verified_reports += 1


def add_confirmation_score(user_id: str, points: int = 5):
    """Citizen ne kisi aur ki issue confirm ki → +points"""
    score = _get_or_create_score(user_id)
    score.total_score += points
    score.confirmations_made += 1


def add_resolution_verify_score(user_id: str, points: int = 10):
    """Citizen ne resolution verify kiya → +points"""
    score = _get_or_create_score(user_id)
    score.total_score += points
    score.resolutions_verified += 1
