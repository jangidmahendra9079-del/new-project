"""
Officer routes — assignments dekhna, accept/start/resolve karna.
Blueprint prefix: /api/v1
"""
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename

from app.database import db
from app.auth.middleware import require_roles
from app.models.assignment import Assignment
from app.models.issue import Issue, IssueStatusHistory
from app.models.resolution import ResolutionProof

officer_bp = Blueprint('officer', __name__, url_prefix='/api/v1/officer')

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


def _save_image(file) -> str | None:
    if not file:
        return None
    ext = (file.filename or '').rsplit('.', 1)
    if len(ext) < 2 or ext[1].lower() not in ALLOWED_EXTENSIONS:
        return None
    upload_dir = current_app.config['UPLOAD_DIR']
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext[1].lower()}"
    file.save(os.path.join(upload_dir, filename))
    return filename


# ─── GET /api/v1/officer/assignments ─────────────────────────────────────────

@officer_bp.route('/assignments', methods=['GET'])
@require_roles('field_officer', 'department_officer', 'super_admin')
def get_assignments():
    """Officer ke active assignments + issue detail."""
    user = g.current_user

    assignments = Assignment.query.filter(
        Assignment.officer_id == user.id,
        Assignment.status.notin_(['completed', 'cancelled'])
    ).order_by(Assignment.created_at.desc()).all()

    result = []
    for a in assignments:
        d = a.to_dict()
        if a.issue:
            d['issue'] = a.issue.to_dict()
        result.append(d)

    return jsonify(result)


# ─── POST /api/v1/officer/assignments/<id>/accept ────────────────────────────

@officer_bp.route('/assignments/<int:assignment_id>/accept', methods=['POST'])
@require_roles('field_officer', 'department_officer', 'super_admin')
def accept_assignment(assignment_id):
    user = g.current_user
    a = Assignment.query.get(assignment_id)

    if not a or a.officer_id != user.id:
        return jsonify({'detail': 'Assignment not found'}), 404
    if a.status != 'pending':
        return jsonify({'detail': 'Assignment already accepted'}), 400

    a.status = 'accepted'
    a.accepted_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Assignment accepted', 'status': a.status})


# ─── POST /api/v1/officer/assignments/<id>/start ─────────────────────────────

@officer_bp.route('/assignments/<int:assignment_id>/start', methods=['POST'])
@require_roles('field_officer', 'department_officer', 'super_admin')
def start_assignment(assignment_id):
    user = g.current_user
    a = Assignment.query.get(assignment_id)

    if not a or a.officer_id != user.id:
        return jsonify({'detail': 'Assignment not found'}), 404
    if a.status not in ('pending', 'accepted'):
        return jsonify({'detail': 'Cannot start this assignment'}), 400

    a.status = 'in_progress'
    a.started_at = datetime.utcnow()

    # Issue status bhi update karo
    issue = Issue.query.get(a.issue_id)
    if issue and issue.status != 'in_progress':
        old_status = issue.status
        issue.status = 'in_progress'
        db.session.add(IssueStatusHistory(
            issue_id=issue.id,
            old_status=old_status,
            new_status='in_progress',
            changed_by_id=user.id,
            note='Field officer started work',
        ))

    db.session.commit()
    return jsonify({'message': 'Work started', 'status': a.status})


# ─── POST /api/v1/officer/assignments/<id>/resolve ───────────────────────────

@officer_bp.route('/assignments/<int:assignment_id>/resolve', methods=['POST'])
@require_roles('field_officer', 'department_officer', 'super_admin')
def resolve_assignment(assignment_id):
    """
    Multipart/form-data:
    - after_photo (required)
    - before_photo (optional)
    - notes (optional)
    - latitude, longitude (optional GPS)
    """
    user = g.current_user
    a = Assignment.query.get(assignment_id)

    if not a or a.officer_id != user.id:
        return jsonify({'detail': 'Assignment not found'}), 404
    if a.status not in ('pending', 'accepted', 'in_progress'):
        return jsonify({'detail': 'Assignment already resolved'}), 400

    after_file  = request.files.get('after_photo')
    before_file = request.files.get('before_photo')
    notes       = request.form.get('notes', '').strip() or None

    try:
        res_lat = float(request.form.get('latitude', '')) if request.form.get('latitude') else None
        res_lng = float(request.form.get('longitude', '')) if request.form.get('longitude') else None
    except ValueError:
        res_lat = res_lng = None

    after_url = _save_image(after_file)
    if not after_url:
        return jsonify({'detail': 'After photo is required'}), 400

    before_url = _save_image(before_file)

    # Save resolution proof
    proof = ResolutionProof(
        assignment_id=a.id,
        issue_id=a.issue_id,
        submitted_by_id=user.id,
        before_photo_url=before_url,
        after_photo_url=after_url,
        notes=notes,
        resolution_lat=res_lat,
        resolution_lng=res_lng,
    )
    db.session.add(proof)

    # Update assignment
    a.status = 'completed'
    a.completed_at = datetime.utcnow()

    # Issue → citizen_verification
    issue = Issue.query.get(a.issue_id)
    if issue:
        old_status = issue.status
        issue.status = 'citizen_verification'
        issue.resolved_at = datetime.utcnow()
        db.session.add(IssueStatusHistory(
            issue_id=issue.id,
            old_status=old_status,
            new_status='citizen_verification',
            changed_by_id=user.id,
            note=f'Resolution submitted by officer. Notes: {notes or "N/A"}',
        ))

    db.session.commit()
    return jsonify({'message': 'Resolution submitted. Awaiting citizen verification.'})
