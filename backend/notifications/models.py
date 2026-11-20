"""
Notification model — in-app notifications with optional email delivery.

Notifications are created by system signals and views when key events occur
(contribution verified, payout processed, membership approved, meeting scheduled, etc.).
Email is sent via Django's email backend; in development this prints to the console.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    MEMBERSHIP_APPROVED   = "membership_approved",   _("Membership Approved")
    MEMBERSHIP_REJECTED   = "membership_rejected",   _("Membership Rejected")
    CONTRIBUTION_VERIFIED = "contribution_verified", _("Contribution Verified")
    CONTRIBUTION_REJECTED = "contribution_rejected", _("Contribution Rejected")
    PAYOUT_PROCESSED      = "payout_processed",      _("Payout Processed")
    WITHDRAWAL_APPROVED   = "withdrawal_approved",   _("Withdrawal Approved")
    WITHDRAWAL_REJECTED   = "withdrawal_rejected",   _("Withdrawal Rejected")
    MEETING_SCHEDULED     = "meeting_scheduled",     _("Meeting Scheduled")
    MEETING_CANCELLED     = "meeting_cancelled",     _("Meeting Cancelled")
    GENERAL               = "general",               _("General")


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        db_index=True,
    )
    title   = models.CharField(max_length=200)
    message = models.TextField()

    # Optional link to the object that triggered the notification
    related_object_type = models.CharField(max_length=50, blank=True, default="")
    related_object_id   = models.CharField(max_length=20, blank=True, default="")

    is_read = models.BooleanField(default=False, db_index=True)
    # Track whether an email was sent
    email_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("notification")
        verbose_name_plural = _("notifications")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.username} — {self.title} ({'read' if self.is_read else 'unread'})"
