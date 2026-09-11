"""
Audit service — har sensitive action ka log likhna.
"""
from app.database import db
from app.models.audit import AuditLog


def log_action(
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    description: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    user_id: str | None = None,
    ip_address: str | None = None,
):
    """
    AuditLog entry create karo.

    Usage:
        from app.services.audit_service import log_action
        log_action('ASSIGN_OFFICER', 'Issue', issue.id,
                   description='Officer assigned', new_value={'officer_id': oid},
                   user_id=current_user_id)
    """
    try:
        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            description=description,
            old_value=old_value,
            new_value=new_value,
            user_id=user_id,
            ip_address=ip_address,
        )
        db.session.add(log)
        db.session.flush()   # auto-committed with caller's transaction
    except Exception:
        pass  # audit failure should never break main flow
