"""
Admin routes — dashboard, issues, users, departments, audit logs.
Blueprint prefix: /api/v1/admin
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app

from app.database import db
from app.auth.middleware import require_roles
from app.models.issue import Issue, IssueStatusHistory
from app.models.user import User
from app.models.department import Department
from app.models.assignment import Assignment
from app.models.audit import AuditLog
from app.models.recurrence import RecurrenceAlert
from app.services.audit_service import log_action
from app.services.sla_service import compute_sla_deadline

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

ADMIN_ROLES = ('department_officer', 'super_admin')


# ─── GET /api/v1/admin/dashboard ─────────────────────────────────────────────

@admin_bp.route('/dashboard', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def dashboard():
    total_issues   = Issue.query.count()
    pending        = Issue.query.filter(Issue.status.in_(['reported', 'ai_verified'])).count()
    in_progress    = Issue.query.filter(Issue.status == 'in_progress').count()
    closed         = Issue.query.filter(Issue.status.in_(['closed'])).count()
    resolved       = Issue.query.filter(Issue.status.in_(['closed', 'citizen_verification'])).count()
    overdue        = Issue.query.filter(
        Issue.sla_deadline < datetime.utcnow(),
        Issue.status.notin_(['closed', 'rejected'])
    ).count()
    total_citizens = User.query.filter_by(role='citizen').count()

    resolution_rate = round((closed / total_issues * 100), 1) if total_issues else 0

    # Avg resolution hours
    avg_hours = None
    closed_issues = Issue.query.filter(
        Issue.status == 'closed',
        Issue.assigned_at.isnot(None),
        Issue.closed_at.isnot(None)
    ).all()
    if closed_issues:
        total_h = sum(
            (i.closed_at - i.assigned_at).total_seconds() / 3600
            for i in closed_issues
        )
        avg_hours = round(total_h / len(closed_issues), 1)

    return jsonify({
        'total_issues': total_issues,
        'pending': pending,
        'in_progress': in_progress,
        'closed': closed,
        'resolved': resolved,
        'overdue': overdue,
        'total_citizens': total_citizens,
        'resolution_rate': resolution_rate,
        'avg_resolution_hours': avg_hours,
    })


# ─── GET /api/v1/admin/recurrence-alerts ─────────────────────────────────────

@admin_bp.route('/recurrence-alerts', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def recurrence_alerts():
    alerts = RecurrenceAlert.query.filter_by(is_resolved=False)\
                                  .order_by(RecurrenceAlert.occurrence_count.desc()).all()
    return jsonify([a.to_dict() for a in alerts])


# ─── GET /api/v1/admin/issues ─────────────────────────────────────────────────

@admin_bp.route('/issues', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def list_issues():
    status_filter = request.args.get('issue_status', '').strip()
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))

    q = Issue.query
    if status_filter:
        q = q.filter(Issue.status == status_filter)
    q = q.order_by(Issue.priority_score.desc(), Issue.created_at.desc())

    total  = q.count()
    issues = q.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'total': total,
        'page': page,
        'issues': [i.to_dict() for i in issues],
    })


# ─── POST /api/v1/admin/issues/<id>/assign ────────────────────────────────────

@admin_bp.route('/issues/<string:issue_id>/assign', methods=['POST'])
@require_roles(*ADMIN_ROLES)
def assign_issue(issue_id):
    """Body: { officer_id: str }"""
    user  = g.current_user
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'detail': 'Issue not found'}), 404

    data       = request.get_json(force=True) or {}
    officer_id = data.get('officer_id', '').strip()
    if not officer_id:
        return jsonify({'detail': 'officer_id is required'}), 400

    officer = User.query.get(officer_id)
    if not officer or officer.role not in ('field_officer', 'department_officer', 'super_admin'):
        return jsonify({'detail': 'Officer not found or invalid role'}), 404

    # Create assignment
    assignment = Assignment(
        issue_id=issue.id,
        officer_id=officer_id,
        assigned_by_id=user.id,
        status='pending',
    )
    db.session.add(assignment)

    # Update issue
    old_status    = issue.status
    issue.status  = 'assigned'
    issue.assigned_at = datetime.utcnow()
    if not issue.sla_deadline:
        issue.sla_deadline = compute_sla_deadline(issue.severity or 'medium')

    db.session.add(IssueStatusHistory(
        issue_id=issue.id,
        old_status=old_status,
        new_status='assigned',
        changed_by_id=user.id,
        note=f'Assigned to officer {officer.name}',
    ))

    log_action(
        action='ASSIGN_OFFICER',
        entity_type='Issue',
        entity_id=issue.id,
        description=f'Issue {issue.civic_id} assigned to {officer.name}',
        new_value={'officer_id': officer_id, 'officer_name': officer.name},
        user_id=user.id,
        ip_address=request.remote_addr,
    )

    db.session.commit()
    return jsonify({'message': f'Issue assigned to {officer.name}', 'assignment_id': assignment.id})


# ─── POST /api/v1/admin/issues/<id>/escalate ──────────────────────────────────

@admin_bp.route('/issues/<string:issue_id>/escalate', methods=['POST'])
@require_roles(*ADMIN_ROLES)
def escalate_issue(issue_id):
    user  = g.current_user
    issue = Issue.query.get(issue_id)
    if not issue:
        return jsonify({'detail': 'Issue not found'}), 404

    # Priority bump: low→medium→high→critical
    bump = {'low': 'medium', 'medium': 'high', 'high': 'critical', 'critical': 'critical'}
    old_priority  = issue.priority or 'medium'
    issue.priority = bump.get(old_priority, 'high')
    issue.priority_score = (issue.priority_score or 0) + 10

    log_action(
        action='ESCALATE',
        entity_type='Issue',
        entity_id=issue.id,
        description=f'Issue {issue.civic_id} escalated',
        old_value={'priority': old_priority},
        new_value={'priority': issue.priority},
        user_id=user.id,
        ip_address=request.remote_addr,
    )

    db.session.commit()
    return jsonify({'message': 'Issue escalated', 'new_priority': issue.priority})


# ─── GET /api/v1/admin/users ──────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def list_users():
    role_filter = request.args.get('role', '').strip()
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 100))

    q = User.query
    if role_filter:
        q = q.filter(User.role == role_filter)
    q = q.order_by(User.created_at.desc())

    total = q.count()
    users = q.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'total': total,
        'users': [u.to_dict() for u in users],
    })


# ─── PATCH /api/v1/admin/users/<id> ───────────────────────────────────────────

@admin_bp.route('/users/<string:user_id>', methods=['PATCH'])
@require_roles(*ADMIN_ROLES)
def update_user(user_id):
    """Body: { is_active?: bool, role?: str }"""
    admin = g.current_user
    user  = User.query.get(user_id)
    if not user:
        return jsonify({'detail': 'User not found'}), 404

    data    = request.get_json(force=True) or {}
    old_val = {}
    new_val = {}

    if 'is_active' in data:
        old_val['is_active'] = user.is_active
        user.is_active = bool(data['is_active'])
        new_val['is_active'] = user.is_active

    if 'role' in data:
        allowed = {'citizen', 'field_officer', 'department_officer', 'super_admin'}
        if data['role'] not in allowed:
            return jsonify({'detail': f'Invalid role. Allowed: {allowed}'}), 400
        old_val['role'] = user.role
        user.role = data['role']
        new_val['role'] = user.role

    log_action(
        action='UPDATE_USER',
        entity_type='User',
        entity_id=user.id,
        description=f'User {user.name} updated',
        old_value=old_val,
        new_value=new_val,
        user_id=admin.id,
        ip_address=request.remote_addr,
    )

    db.session.commit()
    return jsonify(user.to_dict())


# ─── GET /api/v1/admin/departments ────────────────────────────────────────────

@admin_bp.route('/departments', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def list_departments():
    depts = Department.query.order_by(Department.name).all()
    return jsonify([d.to_dict() for d in depts])


# ─── POST /api/v1/admin/departments ───────────────────────────────────────────

@admin_bp.route('/departments', methods=['POST'])
@require_roles(*ADMIN_ROLES)
def create_department():
    """Body: { name, code, description?, contact_email? }"""
    admin = g.current_user
    data  = request.get_json(force=True) or {}

    name = (data.get('name') or '').strip()
    code = (data.get('code') or '').strip().upper()
    if not name or not code:
        return jsonify({'detail': 'name and code are required'}), 400

    if Department.query.filter_by(code=code).first():
        return jsonify({'detail': 'Department code already exists'}), 409
    if Department.query.filter_by(name=name).first():
        return jsonify({'detail': 'Department name already exists'}), 409

    dept = Department(
        name=name,
        code=code,
        description=data.get('description', '').strip() or None,
        contact_email=data.get('contact_email', '').strip() or None,
    )
    db.session.add(dept)

    log_action(
        action='CREATE_DEPT',
        entity_type='Department',
        description=f'Department {name} ({code}) created',
        new_value={'name': name, 'code': code},
        user_id=admin.id,
        ip_address=request.remote_addr,
    )

    db.session.commit()
    return jsonify(dept.to_dict()), 201


# ─── GET /api/v1/admin/audit-logs ─────────────────────────────────────────────

@admin_bp.route('/audit-logs', methods=['GET'])
@require_roles(*ADMIN_ROLES)
def audit_logs():
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 100))

    logs = AuditLog.query.order_by(AuditLog.created_at.desc())\
                         .offset((page - 1) * limit).limit(limit).all()
    return jsonify([l.to_dict() for l in logs])
