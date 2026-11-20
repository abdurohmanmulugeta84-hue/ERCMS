"""
Serializers for the payouts app.

PayoutListSerializer    — compact list
PayoutDetailSerializer  — full detail
PayoutCreateSerializer  — Treasurer processes a payout for a RotationEntry
PayoutCancelSerializer  — cancel a scheduled payout
"""
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from rotations.models import RotationEntry, RotationEntryStatus
from .models import Payout, PayoutStatus


class PayoutListSerializer(serializers.ModelSerializer):
    recipient_name  = serializers.SerializerMethodField()
    equb_name       = serializers.SerializerMethodField()
    status_display  = serializers.SerializerMethodField()
    method_display  = serializers.SerializerMethodField()
    position        = serializers.SerializerMethodField()

    class Meta:
        model  = Payout
        fields = [
            "id", "payout_reference",
            "equb", "equb_name",
            "recipient", "recipient_name",
            "position", "amount",
            "status", "status_display",
            "method", "method_display",
            "processed_at", "created_at",
        ]
        read_only_fields = fields

    def get_recipient_name(self, obj):
        return obj.recipient.get_full_name() or obj.recipient.username

    def get_equb_name(self, obj):
        return obj.equb.name

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_method_display(self, obj):
        return dict(obj.METHOD_CHOICES).get(obj.method, obj.method)

    def get_position(self, obj):
        return obj.rotation_entry.position


class PayoutDetailSerializer(PayoutListSerializer):
    processed_by_name = serializers.SerializerMethodField()
    rotation_entry_id = serializers.IntegerField(source="rotation_entry.id", read_only=True)

    class Meta(PayoutListSerializer.Meta):
        fields = PayoutListSerializer.Meta.fields + [
            "rotation_entry_id", "gateway_reference",
            "processed_by", "processed_by_name",
            "notes", "updated_at",
        ]
        read_only_fields = fields

    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name() or obj.processed_by.username
        return None


class PayoutCreateSerializer(serializers.ModelSerializer):
    """
    Treasurer processes a payout for an eligible RotationEntry.

    Eligibility rules:
      1. The RotationEntry must not already have a completed Payout.
      2. The RotationEntry's schedule must be active.
      3. The RotationEntry status must not be skipped/completed.
      4. Amount must be > 0.
    """

    class Meta:
        model  = Payout
        fields = ["rotation_entry", "amount", "method", "gateway_reference", "notes"]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Payout amount must be greater than zero.")
        return value

    def validate_rotation_entry(self, entry):
        # Already has a completed payout?
        if hasattr(entry, "payout") and entry.payout.status == PayoutStatus.PROCESSED:
            raise serializers.ValidationError(
                "This rotation entry has already been paid out."
            )
        # Entry must not be skipped or already completed
        if entry.status in (RotationEntryStatus.SKIPPED, RotationEntryStatus.COMPLETED):
            raise serializers.ValidationError(
                f"Cannot process a payout for an entry with status '{entry.get_status_display()}'."
            )
        # Schedule must be active
        from rotations.models import RotationScheduleStatus
        if entry.schedule.status != RotationScheduleStatus.ACTIVE:
            raise serializers.ValidationError(
                "The rotation schedule must be active to process a payout."
            )
        return entry

    def create(self, validated_data):
        from django.db import transaction as db_tx
        entry = validated_data["rotation_entry"]

        with db_tx.atomic():
            payout = Payout.objects.create(
                equb=entry.schedule.equb,
                recipient=entry.membership.user,
                status=PayoutStatus.PROCESSED,
                processed_by=self.context["request"].user,
                processed_at=timezone.now(),
                **validated_data,
            )
            # Mark the rotation entry as completed
            entry.status = RotationEntryStatus.COMPLETED
            entry.save(update_fields=["status", "updated_at"])

        return payout


class PayoutCancelSerializer(serializers.Serializer):
    """Cancel a scheduled (not yet processed) payout."""
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        payout = self.context.get("payout")
        if payout and payout.status != PayoutStatus.SCHEDULED:
            raise serializers.ValidationError(
                f"Only scheduled payouts can be cancelled. "
                f"Current status: {payout.get_status_display()}."
            )
        return attrs

    def save(self, payout):
        payout.status = PayoutStatus.CANCELLED
        payout.notes  = self.validated_data.get("notes", payout.notes)
        payout.save(update_fields=["status", "notes", "updated_at"])
        return payout
