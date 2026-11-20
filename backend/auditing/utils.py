"""
Utility function for writing audit log entries.

Import and call this from signals and views. It is intentionally simple
and does not raise exceptions — a failed audit log entry should never
block a user-facing operation.
"""
import logging

logger = logging.getLogger(__name__)


def write_audit_log(actor, action: str, model_name: str, object_id: str = "", detail: dict = None):
    """
    Write an AuditLog entry.

    Args:
        actor:      The CustomUser instance performing the action, or None for system events.
        action:     A short snake_case string identifying the action.
        model_name: The name of the affected model.
        object_id:  The PK of the affected object as a string.
        detail:     Optional dict with additional context.
    """
    # Import here to avoid circular imports at module load time
    from auditing.models import AuditLog

    try:
        AuditLog.objects.create(
            actor=actor,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            detail=detail or {},
        )
    except Exception as exc:
        # Log the failure but do not raise — audit logging must never break normal operations
        logger.error("Failed to write audit log entry: %s | action=%s | model=%s | id=%s",
                     exc, action, model_name, object_id)
