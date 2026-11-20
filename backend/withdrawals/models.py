"""
WithdrawalRequest model.

A member requests to withdraw from an Equb. The Organizer approves or rejects.
Only one PENDING request per membership at a time is allowed.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class WithdrawalStatus(models.TextChoices):
    PENDING  = "pending",  _("Pending Review")
    APPROVED = "approved", _("Approved")
    REJECTED = "rejected", _("Rejected")


class WithdrawalRequest(models.Model):
    membership = models.ForeignKey(
        "memberships.Membership",
        on_delete=models.PROTECT,
        related_name="withdrawal_requests",
    )
    reason = models.TextField(
        help_text=_("Member's reason for requesting withdrawal."),
    )
    status = models.CharField(
        max_length=10,
        choices=WithdrawalStatus.choices,
        default=WithdrawalStatus.PENDING,
        db_index=True,
    )
    review_note = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_withdrawals",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("withdrawal request")
        verbose_name_plural = _("withdrawal requests")
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.membership.user.get_full_name()} — "
            f"{self.membership.equb.name} ({self.get_status_display()})"
        )
