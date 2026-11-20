"""
Rotation models.

RotationSchedule — one schedule per Equb, created by the Organizer.
RotationEntry    — one entry per approved member, holds the position and
                   expected payout date. The Organizer assigns positions
                   manually (per the documented design decision).

Design decisions:
  - An Equb has at most ONE active RotationSchedule at a time.
  - Position 1 means the member receives the payout first.
  - expected_payout_date is informational; the Treasurer controls the
    actual payout via the Payout model.
  - entry status: pending → scheduled → completed / skipped
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class RotationScheduleStatus(models.TextChoices):
    DRAFT     = "draft",     _("Draft")
    ACTIVE    = "active",    _("Active")
    COMPLETED = "completed", _("Completed")
    CANCELLED = "cancelled", _("Cancelled")


class RotationEntryStatus(models.TextChoices):
    PENDING   = "pending",   _("Pending")      # not yet due
    SCHEDULED = "scheduled", _("Scheduled")    # upcoming, payout date approaching
    COMPLETED = "completed", _("Completed")    # payout processed
    SKIPPED   = "skipped",   _("Skipped")      # member skipped this round


class RotationSchedule(models.Model):
    """
    The overall rotation plan for an Equb.
    One Equb has at most one active schedule.
    """

    equb = models.ForeignKey(
        "equbs.Equb",
        on_delete=models.PROTECT,
        related_name="rotation_schedules",
    )
    title = models.CharField(
        max_length=200,
        help_text=_("A descriptive name, e.g. 'Office Equb 2026 Rotation'."),
    )
    status = models.CharField(
        max_length=12,
        choices=RotationScheduleStatus.choices,
        default=RotationScheduleStatus.DRAFT,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_rotations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("rotation schedule")
        verbose_name_plural = _("rotation schedules")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.equb.name}) — {self.get_status_display()}"

    @property
    def total_entries(self):
        return self.entries.count()

    @property
    def completed_entries(self):
        return self.entries.filter(status=RotationEntryStatus.COMPLETED).count()


class RotationEntry(models.Model):
    """
    One entry in a RotationSchedule — assigns a position to a member.

    The position field determines the payout order (position=1 gets paid first).
    Positions must be unique within a schedule.
    """

    schedule = models.ForeignKey(
        RotationSchedule,
        on_delete=models.PROTECT,
        related_name="entries",
    )
    membership = models.ForeignKey(
        "memberships.Membership",
        on_delete=models.PROTECT,
        related_name="rotation_entries",
    )
    position = models.PositiveIntegerField(
        help_text=_("Payout order position. Position 1 receives the payout first."),
    )
    expected_payout_date = models.DateField(
        null=True, blank=True,
        help_text=_("Expected date the payout for this position will be processed."),
    )
    status = models.CharField(
        max_length=12,
        choices=RotationEntryStatus.choices,
        default=RotationEntryStatus.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("rotation entry")
        verbose_name_plural = _("rotation entries")
        ordering = ["schedule", "position"]
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "position"],
                name="unique_position_per_schedule",
            ),
            models.UniqueConstraint(
                fields=["schedule", "membership"],
                name="unique_membership_per_schedule",
            ),
        ]

    def __str__(self):
        return (
            f"Position {self.position}: "
            f"{self.membership.user.get_full_name()} — "
            f"{self.schedule.equb.name}"
        )
