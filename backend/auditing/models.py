"""
AuditLog model — records every significant action in the system.

Entries are written via auditing.utils.write_audit_log(), which is called
from Django signals and directly from views for financial operations.
"""
import json
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """
    Immutable record of a system action.

    Fields:
      actor       — the user who performed the action (NULL for system events)
      action      — short snake_case identifier, e.g. "contribution_verified"
      model_name  — the name of the affected Django model
      object_id   — the primary key of the affected object (as a string)
      timestamp   — when the action occurred (set automatically)
      detail      — arbitrary JSON payload for additional context
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
        help_text=_("The user who performed this action. NULL for system events."),
    )
    action = models.CharField(max_length=100, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=50, blank=True, default="")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    detail = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("audit log entry")
        verbose_name_plural = _("audit log entries")
        ordering = ["-timestamp"]
        # AuditLog entries should never be modified after creation
        default_permissions = ("view",)

    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else "System"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor_name} — {self.action} on {self.model_name}#{self.object_id}"
