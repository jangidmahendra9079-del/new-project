"""
Reports routes — citizen report submit karna aur apne reports dekhna.
Blueprint prefix: /api/v1
"""
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename

from app.database import db
from app.auth.middleware import require_auth
from app.models.report import Report
from app.models.issue import Issue, IssueStatusHistory
from app.models.category import Category
from app.models.ward import Ward
from app.services.sla_service import compute_sla_deadline
from app.services.audit_service import log_action

reports_bp = Blueprint('reports', __name__, url_prefix='/api/v1')

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _save_image(file) -> str | None:
    """Image file save karo, unique filename return karo."""
    if not file or not _allowed_file(file.filename):
        return None
    upload_dir = current_app.config['UPLOAD_DIR']
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, filename))
    return filename


def _generate_civic_id() -> str:
    """CIV-YYYYMM-XXXXXX format."""
    now = datetime.utcnow()
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CIV-{now.year}{now.month:02d}-{suffix}"


def _detect_duplicate(lat: float, lng: float, radius_m: float = 50.0) -> Issue | None:
    """
    Approximate duplicate detection using degree-based bounding box.
    50m ≈ 0.00045° latitude, longitude varies by lat.
    """
    delta_lat = radius_m / 111320.0
    delta_lng = radius_m / (111320.0 * 0.85)

    return Issue.query.filter(
        Issue.latitude.between(lat - delta_lat, lat + delta_lat),
        Issue.longitude.between(lng - delta_lng, lng + delta_lng),
        Issue.status.notin_(['closed', 'rejected'])
    ).first()


def _simple_ai_analyze(human_category: str, human_severity: str, description: str):
    """
    Gemini nahi ho toh basic rule-based AI fallback.
    Returns (category, severity, confidence, reason)
    """
    category = human_category or 'other'
    severity = human_severity or 'medium'

    # Simple keyword detection agar description hai
    if description and not human_category:
        desc_lower = description.lower()
        keyword_map = {
            'pothole': ['pothole', 'road', 'hole', 'crater'],
            'garbage': ['garbage', 'trash', 'waste', 'litter', 'dump'],
            'streetlight': ['light', 'lamp', 'dark', 'street light'],
            'water_leak': ['water', 'leak', 'pipe', 'flood'],
            'drainage': ['drain', 'sewage', 'overflow'],
            'road_damage': ['crack', 'broken road', 'damaged'],
            'encroachment': ['encroach', 'illegal', 'blocked'],
        }
        for cat, keywords in keyword_map.items():
            if any(kw in desc_lower for kw in keywords):
                category = cat
                break

    confidence = 0.70
    reason = f"Auto-classified as '{category}' with severity '{severity}'."

    return category, severity, confidence, reason


# ─── POST /api/v1/reports ─────────────────────────────────────────────────────

@reports_bp.route('/reports', methods=['POST'])
@require_auth
def submit_report():
    """
    Multipart/form-data:
    - image (file, required)
    - latitude, longitude (float strings, required)
    - description (optional)
    - human_category (optional)
    - human_severity (optional)
    """
    user = g.current_user

    # Parse form data
    try:
        latitude  = float(request.form.get('latitude', ''))
        longitude = float(request.form.get('longitude', ''))
    except (TypeError, ValueError):
        return jsonify({'detail': 'Valid latitude and longitude required'}), 400

    description    = request.form.get('description', '').strip() or None
    human_category = request.form.get('human_category', '').strip() or None
    human_severity = request.form.get('human_severity', '').strip() or None

    # Save image
    image_file = request.files.get('image')
    image_url = _save_image(image_file)
    if not image_url:
        return jsonify({'detail': 'Valid image file required (jpg, png, webp)'}), 400

    # AI analysis (simple fallback)
    ai_cat, ai_sev, ai_conf, ai_reason = _simple_ai_analyze(
        human_category or '', human_severity or '', description or ''
    )

    # Check for nearby duplicate
    existing_issue = _detect_duplicate(latitude, longitude)

    # Create Report record
    report = Report(
        reporter_id=user.id,
        latitude=latitude,
        longitude=longitude,
        description=description,
        image_url=image_url,
        human_category=human_category,
        human_severity=human_severity,
        ai_category=ai_cat,
        ai_severity=ai_sev,
        ai_confidence=ai_conf,
        ai_reason=ai_reason,
    )

    if existing_issue:
        # Merge: existing issue ki confirmation count badhao
        report.issue_id = existing_issue.id
        report.status = 'merged'
        existing_issue.confirmation_count = (existing_issue.confirmation_count or 0) + 1
        existing_issue.report_count = (existing_issue.report_count or 1) + 1
    else:
        # New Issue create karo
        final_severity = human_severity or ai_sev or 'medium'
        final_category = human_category or ai_cat or 'other'

        issue = Issue(
            civic_id=_generate_civic_id(),
            title=f"{final_category.replace('_', ' ').title()} issue reported",
            description=description,
            latitude=latitude,
            longitude=longitude,
            ai_category=ai_cat,
            ai_severity=ai_sev,
            ai_confidence=ai_conf,
            ai_reason=ai_reason,
            severity=final_severity,
            priority=final_severity,
            status='ai_verified',
            image_url=image_url,
            created_by_id=user.id,
            sla_deadline=compute_sla_deadline(final_severity),
        )
        db.session.add(issue)
        db.session.flush()

        # Status history
        db.session.add(IssueStatusHistory(
            issue_id=issue.id,
            old_status=None,
            new_status='ai_verified',
            note='Report submitted and AI processed',
        ))

        report.issue_id = issue.id
        report.status = 'new_issue'

    db.session.add(report)
    db.session.commit()

    return jsonify({
        'message': 'Report submitted successfully',
        'report_id': report.id,
        'issue_id': report.issue_id,
        'status': report.status,
        'ai_category': ai_cat,
        'ai_severity': ai_sev,
    }), 201


# ─── GET /api/v1/reports ──────────────────────────────────────────────────────

@reports_bp.route('/reports', methods=['GET'])
@require_auth
def get_my_reports():
    """
    Current user ke saare reports return karo.
    Issue detail bhi include karo (frontend wahi dikhata hai).
    """
    user = g.current_user

    reports = Report.query.filter_by(reporter_id=user.id)\
                          .order_by(Report.created_at.desc()).all()

    result = []
    for r in reports:
        d = r.to_dict()
        # Frontend Issue fields expect karta hai directly
        if r.issue_id:
            issue = Issue.query.get(r.issue_id)
            if issue:
                d.update({
                    'status': issue.status,
                    'civic_id': issue.civic_id,
                    'severity': issue.severity,
                    'confirmation_count': issue.confirmation_count,
                    'sla_deadline': issue.sla_deadline.isoformat() if issue.sla_deadline else None,
                })
        result.append(d)

    return jsonify(result)
