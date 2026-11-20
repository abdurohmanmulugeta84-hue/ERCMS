"""
Payout model.

A Payout records the actual distribution of collected funds to a member
according to their RotationEntry. Each RotationEntry can have at most ONE
completed Payout — enforced via the unique constraint on rotation_entry.

Design decisions:
  - amount is calculated from the Equb's contribution_amount × number of
    approved members at payout time (stored on the record for audit integrity).
  - The Treasurer records the payout; it creates an AuditLog entry.
  - A payout_reference is auto-generated for the audit trail.
  - Atomic DB transaction is used when processing a payout.
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def _generate_payout_ref():
    return f"PAYOUT-{uuid.uuid4().hex[:8].upper()}"


class PayoutStatus(models.TextChoices):
    SCHEDULED  = "scheduled",  _("Scheduled")
    PROCESSED  = "processed",  _("Processed")
    CANCELLED  = "cancelled",  _("Cancelled")


class Payout(models.Model):
    """
    Records the actual payout to a member for their rotation slot.

    Fields:
      rotation_entry   — the RotationEntry being paid (unique = one payout per slot)
      equb             — denormalised for fast queries
      recipient        — the member who receives the payout (denorm from entry.membership.user)
      amount           — total payout amount in ETB
      payout_reference — unique auto-generated audit reference
      status           — scheduled / processed / cancelled
      method           — how the money was transferred
      gateway_reference — external transaction ID (M-Pesa, Chapa, bank)
      processed_by     — the Treasurer who recorded the payout
      processed_at     — when processing was confirmed
      notes            — free-text
    """

    rotation_entry = models.OneToOneField(
        "rotations.RotationEntry",
        on_delete=models.PROTECT,
        related_name="payout",
        help_text=_("Each rotation slot can be paid out exactly once."),
    )
    equb = models.ForeignKey(
        "equbs.Equb",
        on_delete=models.PROTECT,
        related_name="payouts",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_payouts",
    )
    amount = models.DecimalField(
        max_digits=14, decimal_places=2,
        help_text=_("Total payout amount in ETB."),
    )
    payout_reference = models.CharField(
        max_length=30, unique=True,
        default=_generate_payout_ref, editable=False,
    )
    status = models.CharField(
        max_length=12,
        choices=PayoutStatus.choices,
        default=PayoutStatus.SCHEDULED,
        db_index=True,
    )

    METHOD_CHOICES = [
        ("cash",          "Cash"),
        ("bank_transfer", "Bank Transfer"),
        ("mpesa",         "M-Pesa"),
        ("chapa",         "Chapa"),
        ("other",         "Other"),
    ]
    method = models.CharField(
        max_length=16, choices=METHOD_CHOICES, default="cash",
    )
    gateway_reference = models.CharField(max_length=100, blank=True, default="")

    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="processed_payouts",
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payout")
        verbose_name_plural = _("payouts")
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.payout_reference} — "
            f"{self.recipient.get_full_name()} — "
            f"ETB {self.amount} ({self.get_status_display()})"
        )

    @property
    def is_processed(self):
        return self.status == PayoutStatus.PROCESSED
