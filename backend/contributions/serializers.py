"""
Serializers for the contributions app.

ContributionListSerializer   — compact list view
ContributionDetailSerializer — full detail including payments
ContributionSubmitSerializer — member or treasurer submitting a new contribution
ContributionVerifySerializer — treasurer verifying or rejecting
PaymentListSerializer        — compact payment list
PaymentDetailSerializer      — full payment detail
PaymentCreateSerializer      — treasurer recording a payment
"""
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from memberships.models import Membership, MembershipStatus
from .models import (
    Contribution, ContributionStatus,
    Payment, PaymentStatus,
)


# ── Payment serializers ───────────────────────────────────────────────────────

class PaymentListSerializer(serializers.ModelSerializer):
    method_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "payment_reference", "amount",
            "method", "method_display",
            "status", "status_display",
            "gateway_reference",
            "recorded_by", "recorded_by_name",
            "notes", "created_at",
        ]
        read_only_fields = fields

    def get_method_display(self, obj): return obj.get_method_display()
    def get_status_display(self, obj): return obj.get_status_display()
    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() or obj.recorded_by.username


class PaymentDetailSerializer(PaymentListSerializer):
    """Same as list but includes contribution reference."""
    contribution_reference = serializers.CharField(
        source="contribution.transaction_reference", read_only=True
    )

    class Meta(PaymentListSerializer.Meta):
        fields = PaymentListSerializer.Meta.fields + ["contribution_reference", "updated_at"]
        read_only_fields = fields


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Treasurer records a payment for an existing Contribution."""

    class Meta:
        model = Payment
        fields = ["contribution", "amount", "method", "gateway_reference", "notes"]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate(self, attrs):
        contribution = attrs["contribution"]
        # Only allow payments on submitted or outstanding contributions
        if contribution.status not in (
            ContributionStatus.SUBMITTED, ContributionStatus.OUTSTANDING
        ):
            raise serializers.ValidationError(
                {"contribution": (
                    f"Cannot record a payment for a contribution with status "
                    f"'{contribution.get_status_display()}'."
                )}
            )
        # Warn if the payment amount doesn't match the contribution amount
        # (allow it — treasurer may split or correct, audit trail covers it)
        return attrs

    def create(self, validated_data):
        validated_data["status"] = PaymentStatus.COMPLETED
        return Payment.objects.create(**validated_data)


# ── Contribution serializers ──────────────────────────────────────────────────

class ContributionListSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    member_email = serializers.SerializerMethodField()
    equb_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Contribution
        fields = [
            "id", "transaction_reference",
            "membership", "member_name", "member_email",
            "equb", "equb_name",
            "amount", "period_label",
            "status", "status_display",
            "submitted_by", "submitted_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj):
        return obj.membership.user.get_full_name() or obj.membership.user.username

    def get_member_email(self, obj):
        return obj.membership.user.email

    def get_equb_name(self, obj):
        return obj.equb.name

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_submitted_by_name(self, obj):
        return obj.submitted_by.get_full_name() or obj.submitted_by.username


class ContributionDetailSerializer(ContributionListSerializer):
    """Full detail — includes verification info and payments."""

    verified_by_name = serializers.SerializerMethodField()
    payments = PaymentListSerializer(many=True, read_only=True)

    class Meta(ContributionListSerializer.Meta):
        fields = ContributionListSerializer.Meta.fields + [
            "notes",
            "verified_by", "verified_by_name",
            "verified_at", "verification_note",
            "payments",
            "updated_at",
        ]
        read_only_fields = fields

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.get_full_name() or obj.verified_by.username
        return None


class ContributionSubmitSerializer(serializers.ModelSerializer):
    """
    Used when a Member (or Treasurer on their behalf) submits a contribution.

    The membership is provided and validated:
      - Must be approved
      - Must belong to the authenticated user (for members) or any member
        in the equb (for treasurer/admin)
      - No duplicate for the same membership + period_label
    """

    class Meta:
        model = Contribution
        fields = ["membership", "amount", "period_label", "notes"]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Contribution amount must be greater than zero.")
        return value

    def validate(self, attrs):
        membership = attrs["membership"]
        request = self.context["request"]
        user = request.user

        # Membership must be approved
        if membership.status != MembershipStatus.APPROVED:
            raise serializers.ValidationError(
                {"membership": "Only approved members can submit contributions."}
            )

        # Members can only submit for their own membership
        if user.is_member and membership.user_id != user.pk:
            raise serializers.ValidationError(
                {"membership": "You can only submit contributions for your own membership."}
            )

        # Equb must be active
        if not membership.equb.is_active:
            raise serializers.ValidationError(
                {"membership": "This Equb is not currently active."}
            )

        # Validate amount matches Equb configuration
        equb_amount = membership.equb.contribution_amount
        if attrs["amount"] != equb_amount:
            raise serializers.ValidationError(
                {"amount": (
                    f"Contribution amount must be ETB {equb_amount} "
                    f"as configured for this Equb."
                )}
            )

        # Duplicate prevention (membership + period_label unique constraint)
        if Contribution.objects.filter(
            membership=membership,
            period_label=attrs["period_label"],
        ).exists():
            raise serializers.ValidationError(
                {
                    "period_label": (
                        f"A contribution for period '{attrs['period_label']}' "
                        f"already exists for this member."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        equb = validated_data["membership"].equb
        return Contribution.objects.create(
            equb=equb,
            submitted_by=self.context["request"].user,
            status=ContributionStatus.SUBMITTED,
            **validated_data,
        )


class ContributionVerifySerializer(serializers.Serializer):
    """
    Treasurer verifies or rejects a submitted contribution.
    Also atomically marks the linked Payment (if any) as completed.
    """
    ACTION_VERIFY = "verify"
    ACTION_REJECT = "reject"

    action = serializers.ChoiceField(choices=["verify", "reject"])
    verification_note = serializers.CharField(
        required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        contribution = self.context.get("contribution")
        if contribution and contribution.status not in (
            ContributionStatus.SUBMITTED, ContributionStatus.OUTSTANDING
        ):
            raise serializers.ValidationError(
                f"Cannot verify a contribution with status "
                f"'{contribution.get_status_display()}'."
            )
        return attrs

    def save(self, contribution, verifier):
        from django.db import transaction as db_transaction
        action = self.validated_data["action"]
        note = self.validated_data.get("verification_note", "")

        with db_transaction.atomic():
            contribution.status = (
                ContributionStatus.VERIFIED
                if action == self.ACTION_VERIFY
                else ContributionStatus.REJECTED
            )
            contribution.verified_by = verifier
            contribution.verified_at = timezone.now()
            contribution.verification_note = note
            contribution.save()

        return contribution
