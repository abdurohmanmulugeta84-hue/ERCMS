"""
Equb model — represents a single Equb savings group.

Each Equb is created and managed by an Organizer. It holds the group's
configuration (contribution amount, frequency, max members, etc.) and
tracks its lifecycle status.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class EqubFrequency(models.TextChoices):
    WEEKLY = "weekly", _("Weekly")
    BIWEEKLY = "biweekly", _("Bi-Weekly")
    MONTHLY = "monthly", _("Monthly")


class EqubStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")           # created, not yet open for members
    ACTIVE = "active", _("Active")         # accepting contributions / running
    COMPLETED = "completed", _("Completed")  # all rotations done
    SUSPENDED = "suspended", _("Suspended")  # temporarily halted by organizer
    CANCELLED = "cancelled", _("Cancelled")  # permanently stopped


class Equb(models.Model):
    """
    An Equb savings group.

    The organizer decides:
      - contribution_amount (can be changed, history tracked via AuditLog)
      - frequency (weekly / biweekly / monthly)
      - max_members (0 = unlimited)
      - allow_multiple_memberships (can a user join more than once?)
      - rotation_order_type (manual assignment — organizer sets positions)
      - start_date / expected_end_date
    """

    # Identity
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")

    # Ownership
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="organized_equbs",
        limit_choices_to={"role__in": ["organizer", "admin"]},
    )

    # Configuration
    contribution_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Contribution amount per cycle in ETB."),
    )
    frequency = models.CharField(
        max_length=10,
        choices=EqubFrequency.choices,
        default=EqubFrequency.MONTHLY,
    )
    max_members = models.PositiveIntegerField(
        default=0,
        help_text=_("Maximum number of members. 0 means no limit."),
    )
    allow_multiple_memberships = models.BooleanField(
        default=False,
        help_text=_("Allow a single user to hold more than one membership in this Equb."),
    )

    # Lifecycle
    status = models.CharField(
        max_length=12,
        choices=EqubStatus.choices,
        default=EqubStatus.DRAFT,
        db_index=True,
    )
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("equb")
        verbose_name_plural = _("equbs")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    # ------------------------------------------------------------------
    # Convenience properties
    # ------------------------------------------------------------------

    @property
    def is_active(self):
        return self.status == EqubStatus.ACTIVE

    @property
    def member_count(self):
        """Number of approved members."""
        return self.memberships.filter(status="approved").count()

    @property
    def is_full(self):
        """True when max_members > 0 and the limit has been reached."""
        if self.max_members == 0:
            return False
        return self.member_count >= self.max_members
