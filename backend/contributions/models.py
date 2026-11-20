"""
Contribution and Payment models.

Contribution — one contribution record per member per contribution period.
Payment      — one or more payment transactions associated with a Contribution.

Design decisions:
  - A Contribution is what is owed / submitted.
  - A Payment is the actual transaction that settles a Contribution.
  - The combination of (membership, period_label) must be unique to prevent
    duplicate contributions for the same period.
  - The transaction_reference on Contribution is a unique human-readable ID
    generated at creation to support audit and de-duplication.
  - Financial operations use atomic DB transactions (enforced in views).
"""
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def _generate_ref():
    """Short unique reference: CONTRIB-<8 hex chars>."""
    return f"CONTRIB-{uuid.uuid4().hex[:8].upper()}"


def _generate_payment_ref():
    """Short unique payment reference: PAY-<8 hex chars>."""
    return f"PAY-{uuid.uuid4().hex[:8].upper()}"


class ContributionStatus(models.TextChoices):
    SUBMITTED = "submitted", _("Submitted")      # member recorded it, awaiting treasurer
    VERIFIED  = "verified",  _("Verified")       # treasurer confirmed payment received
    REJECTED  = "rejected",  _("Rejected")       # treasurer rejected the record
    OUTSTANDING = "outstanding", _("Outstanding") # period ended, not yet paid


class PaymentMethod(models.TextChoices):
    CASH        = "cash",        _("Cash")
    BANK_TRANSFER = "bank_transfer", _("Bank Transfer")
    MPESA       = "mpesa",       _("M-Pesa")
    CHAPA       = "chapa",       _("Chapa")
    OTHER       = "other",       _("Other")


class PaymentStatus(models.TextChoices):
    PENDING   = "pending",   _("Pending")
    COMPLETED = "completed", _("Completed")
    FAILED    = "failed",    _("Failed")
    REVERSED  = "reversed",  _("Reversed")


class Contribution(models.Model):
    """
    One contribution record — what a member submitted for a specific period.

    Fields:
      membership       — links to the approved Membership (gives us user + equb)
      equb             — denormalised for faster queries
      amount           — the amount submitted (must equal equb.contribution_amount
                         at time of submission; enforced in serializer)
      period_label     — human-readable period identifier, e.g. "2026-10" or
                         "Week 42 / 2026". Set by the member/treasurer.
      transaction_reference — unique system-generated ID for audit trail
      status           — submitted / verified / rejected / outstanding
      submitted_by     — the user who created this record (member or treasurer)
      verified_by      — the treasurer who verified/rejected it
      verified_at      — when verification happened
      notes            — free-text from the submitter
      verification_note — free-text from the treasurer
    """

    membership = models.ForeignKey(
        "memberships.Membership",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    # Denormalise equb for simpler queries — always consistent with membership.equb
    equb = models.ForeignKey(
        "equbs.Equb",
        on_delete=models.PROTECT,
        related_name="contributions",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Period this contribution covers, e.g. "2026-10" or "Week 42 / 2026"
    period_label = models.CharField(
        max_length=50,
        help_text=_("Human-readable period this contribution covers, e.g. '2026-10'."),
    )

    # Unique reference for audit and de-duplication
    transaction_reference = models.CharField(
        max_length=30,
        unique=True,
        default=_generate_ref,
        editable=False,
    )

    status = models.CharField(
        max_length=12,
        choices=ContributionStatus.choices,
        default=ContributionStatus.SUBMITTED,
        db_index=True,
    )

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="submitted_contributions",
    )
    notes = models.TextField(blank=True, default="")

    # Verification
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="verified_contributions",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_note = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("contribution")
        verbose_name_plural = _("contributions")
        ordering = ["-created_at"]
        # Prevent duplicate contributions for the same membership + period
        constraints = [
            models.UniqueConstraint(
                fields=["membership", "period_label"],
                name="unique_contribution_per_member_per_period",
            )
        ]
        indexes = [
            models.Index(fields=["equb", "status"]),
            models.Index(fields=["membership", "status"]),
        ]

    def __str__(self):
        return (
            f"{self.membership.user.get_full_name()} — "
            f"{self.equb.name} [{self.period_label}] ({self.get_status_display()})"
        )

    @property
    def is_verified(self):
        return self.status == ContributionStatus.VERIFIED


class Payment(models.Model):
    """
    A payment transaction that settles a Contribution.

    One Contribution normally has one Payment. In edge cases (partial reversal,
    re-payment after rejection) there may be more than one; only COMPLETED
    payments count toward the contribution balance.
    """

    contribution = models.ForeignKey(
        Contribution,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    method = models.CharField(
        max_length=16,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )

    status = models.CharField(
        max_length=12,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )

    # External reference from M-Pesa / Chapa / bank (nullable for cash)
    gateway_reference = models.CharField(max_length=100, blank=True, default="")

    # Unique system reference for this payment record
    payment_reference = models.CharField(
        max_length=30,
        unique=True,
        default=_generate_payment_ref,
        editable=False,
    )

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_payments",
    )
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payment")
        verbose_name_plural = _("payments")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["contribution", "status"]),
        ]

    def __str__(self):
        return (
            f"Payment {self.payment_reference} — "
            f"{self.contribution.transaction_reference} ({self.get_status_display()})"
        )
