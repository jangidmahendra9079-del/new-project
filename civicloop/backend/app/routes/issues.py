"""
Issues routes — detail, history, nearby, confirm, verify-resolution.
Blueprint prefix: /api/v1
"""
import math
from datetime import datetime
from flask import Blueprint, request, jsonify, g

from app.database import db
from app.auth.middleware import require_auth
from app.models.issue import Issue, IssueStatusHistory, IssueConfirmation
from app.models.user import User
from app.services.civic_score_service import add_confirmation_score, add_resolution_verify_score
from app.services.audit_service import log_action

issues_bp = Blueprint('issues', __name__, url_prefix='/api/v1')


# ─── GET /api/v1/issues/<id> ──────────────────────────────────────────────────

@issues_bp.route('/issues/<string:issue_id>', methods=['GET'])
@require_auth
def get_issue(issue_id):
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'detail': 'Issue not found'}), 404
    return jsonify(issue.to_dict())


# ─── GET /api/v1/issues/<id>/history ─────────────────────────────────────────

@issues_bp.route('/issues/<string:issue_id>/history', methods=['GET'])
@require_auth
def get_issue_history(issue_id):
    history = IssueStatusHistory.query.filter_by(issue_id=issue_id)\
                                      .order_by(IssueStatusHistory.created_at.desc()).all()
    return jsonify([h.to_dict() for h in history])


# ─── POST /api/v1/issues/<id>/confirm ────────────────────────────────────────

@issues_bp.route('/issues/<string:issue_id>/confirm', methods=['POST'])
@require_auth
def confirm_issue(issue_id):
    """
    Nearby citizen issue ki reality confirm karta hai.
    Ek citizen ek issue ko sirf ek baar confirm kar sakta hai.
    +5 civic score milta hai.
    """
    user = g.current_user
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'detail': 'Issue not found'}), 404

    if issue.status in ('closed', 'rejected'):
        return jsonify({'detail': 'Cannot confirm a closed/rejected issue'}), 400

    # Duplicate confirmation check
    existing = IssueConfirmation.query.filter_by(
        issue_id=issue_id, user_id=user.id
    ).first()
    if existing:
        return jsonify({'detail': 'You have already confirmed this issue'}), 409

    # Save confirmation
    conf = IssueConfirmation(issue_id=issue_id, user_id=user.id)
    issue.confirmation_count = (issue.confirmation_count or 0) + 1
    db.session.add(conf)

    # Civic score
    add_confirmation_score(user.id)

    db.session.commit()
    return jsonify({'message': 'Issue confirmed', 'confirmation_count': issue.confirmation_count})


# ─── POST /api/v1/issues/<id>/verify-resolution ──────────────────────────────

@issues_bp.route('/issues/<string:issue_id>/verify-resolution', methods=['POST'])
@require_auth
def verify_resolution(issue_id):
    """
    Citizen verify karta hai ki issue fix hua ya nahi.
    Body: { is_fixed: bool }
    """
    user = g.current_user
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'detail': 'Issue not found'}), 404

    if issue.status != 'citizen_verification':
        return jsonify({'detail': 'Issue is not awaiting citizen verification'}), 400

    data = request.get_json(force=True) or {}
    is_fixed = bool(data.get('is_fixed', True))

    if is_fixed:
        issue.status = 'closed'
        issue.closed_at = datetime.utcnow()
        note = 'Citizen confirmed resolution — issue closed'
        add_resolution_verify_score(user.id)
    else:
        issue.status = 'reopened'
        note = 'Citizen rejected resolution — issue reopened'

    db.session.add(IssueStatusHistory(
        issue_id=issue.id,
        old_status='citizen_verification',
        new_status=issue.status,
        changed_by_id=user.id,
        note=note,
    ))
    db.session.commit()

    return jsonify({'message': note, 'status': issue.status})


# ─── GET /api/v1/issues/nearby/me ────────────────────────────────────────────

@issues_bp.route('/issues/nearby/me', methods=['GET'])
@require_auth
def nearby_issues():
    """
    Query params: latitude, longitude, radius_meters (default 1000)
    Haversine distance calculate karke filter karo.
    """
    try:
        lat = float(request.args.get('latitude', ''))
        lng = float(request.args.get('longitude', ''))
        radius_m = float(request.args.get('radius_meters', 1000))
    except (TypeError, ValueError):
        return jsonify({'detail': 'Valid latitude, longitude required'}), 400

    # Bounding box filter pehle (fast), phir exact haversine
    delta_lat = radius_m / 111320.0
    delta_lng = radius_m / (111320.0 * abs(math.cos(math.radians(lat))) or 0.85)

    candidates = Issue.query.filter(
        Issue.latitude.isnot(None),
        Issue.longitude.isnot(None),
        Issue.status.notin_(['closed', 'rejected']),
        Issue.latitude.between(lat - delta_lat, lat + delta_lat),
        Issue.longitude.between(lng - delta_lng, lng + delta_lng),
    ).limit(50).all()

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    result = []
    for issue in candidates:
        dist = haversine(lat, lng, issue.latitude, issue.longitude)
        if dist <= radius_m:
            d = issue.to_dict()
            d['distance_meters'] = round(dist)
            result.append(d)

    result.sort(key=lambda x: x['distance_meters'])
    return jsonify(result)
