"""
Membership model — represents a user's participation in an Equb group.

A Membership is created when a user requests to join an Equb. The Organizer
approves or rejects it. Once approved, the member can submit contributions
and be assigned a rotation position.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class MembershipStatus(models.TextChoices):
    PENDING = "pending", _("Pending Approval")
    APPROVED = "approved", _("Approved")
    REJECTED = "rejected", _("Rejected")
    SUSPENDED = "suspended", _("Suspended")
    EXITED = "exited", _("Exited")


class Membership(models.Model):
    """
    The association between a CustomUser and an Equb.

    Unique constraint: a user can have at most one membership per Equb
    UNLESS the Equb has allow_multiple_memberships = True.
    That rule is enforced in the serializer's validate() method because
    the database-level unique_together cannot be conditionally disabled.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    equb = models.ForeignKey(
        "equbs.Equb",
        on_delete=models.PROTECT,
        related_name="memberships",
    )

    status = models.CharField(
        max_length=12,
        choices=MembershipStatus.choices,
        default=MembershipStatus.PENDING,
        db_index=True,
    )

    # Optional note from the applicant when requesting membership
    request_note = models.TextField(blank=True, default="")

    # Note added by the Organizer when approving or rejecting
    review_note = models.TextField(blank=True, default="")

    # Who processed the approval/rejection
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_memberships",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Rotation position (assigned manually by Organizer in Phase 4)
    rotation_position = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text=_("Position in the rotation order. Assigned by the Organizer."),
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("membership")
        verbose_name_plural = _("memberships")
        ordering = ["equb", "created_at"]
        # Prevent the same user from having two memberships in the same Equb
        # when the Equb does not allow multiples (enforced in serializer too).
        indexes = [
            models.Index(fields=["equb", "user", "status"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} in {self.equb.name} ({self.get_status_display()})"

    @property
    def is_approved(self):
        return self.status == MembershipStatus.APPROVED
