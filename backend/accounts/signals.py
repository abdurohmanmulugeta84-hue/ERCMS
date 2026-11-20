"""
Signals for the accounts app.
Writes an AuditLog entry whenever a user account is created or updated.
"""
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


@receiver(post_save, sender=User)
def log_user_save(sender, instance, created, **kwargs):
    """Write an audit log entry when a user is created or modified."""
    # Import here to avoid circular imports at module load time
    from auditing.utils import write_audit_log

    action = "user_created" if created else "user_updated"
    detail = {
        "username": instance.username,
        "email": instance.email,
        "role": instance.role,
        "is_active": instance.is_active,
    }
    # System-level change (no actor available from signal context)
    write_audit_log(actor=None, action=action, model_name="CustomUser",
                    object_id=str(instance.pk), detail=detail)
