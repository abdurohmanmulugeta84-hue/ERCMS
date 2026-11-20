"""
Serializers for the equbs app.

EqubListSerializer   — compact, used in list views
EqubDetailSerializer — full detail including member count
EqubWriteSerializer  — create / update with validation
"""
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from accounts.serializers import UserProfileSerializer
from .models import Equb, EqubStatus, EqubFrequency


class EqubListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views."""

    organizer_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    frequency_display = serializers.SerializerMethodField()
    # Reads from the 'approved_member_count' annotation added by _equb_queryset()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Equb
        fields = [
            "id", "name", "status", "status_display",
            "frequency", "frequency_display",
            "contribution_amount", "max_members", "member_count",
            "organizer", "organizer_name",
            "start_date", "expected_end_date",
            "created_at",
        ]
        read_only_fields = fields

    def get_organizer_name(self, obj):
        return obj.organizer.get_full_name() or obj.organizer.username

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_frequency_display(self, obj):
        return obj.get_frequency_display()

    def get_member_count(self, obj):
        # Use annotation when available (list views), fall back to property
        if hasattr(obj, "approved_member_count"):
            return obj.approved_member_count
        return obj.member_count


class EqubDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer — includes organizer profile and member count."""

    organizer_detail = UserProfileSerializer(source="organizer", read_only=True)
    status_display = serializers.SerializerMethodField()
    frequency_display = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()

    class Meta:
        model = Equb
        fields = [
            "id", "name", "description",
            "status", "status_display",
            "frequency", "frequency_display",
            "contribution_amount",
            "max_members", "member_count", "is_full",
            "allow_multiple_memberships",
            "organizer", "organizer_detail",
            "start_date", "expected_end_date",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_frequency_display(self, obj):
        return obj.get_frequency_display()

    def get_member_count(self, obj):
        if hasattr(obj, "approved_member_count"):
            return obj.approved_member_count
        return obj.member_count

    def get_is_full(self, obj):
        return obj.is_full


class EqubWriteSerializer(serializers.ModelSerializer):
    """
    Used for creating and updating Equb groups.
    Organizers and Admins only — enforced in the view.
    """

    class Meta:
        model = Equb
        fields = [
            "name", "description",
            "contribution_amount", "frequency",
            "max_members", "allow_multiple_memberships",
            "status", "start_date", "expected_end_date",
        ]

    def validate_contribution_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Contribution amount must be greater than zero.")
        return value

    def validate_max_members(self, value):
        if value < 0:
            raise serializers.ValidationError("Max members cannot be negative.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_date") or (self.instance.start_date if self.instance else None)
        end = attrs.get("expected_end_date") or (self.instance.expected_end_date if self.instance else None)
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"expected_end_date": "Expected end date must be after the start date."}
            )

        # Prevent reverting a completed/cancelled Equb to active/draft
        if self.instance:
            current_status = self.instance.status
            new_status = attrs.get("status", current_status)
            locked_statuses = {EqubStatus.COMPLETED, EqubStatus.CANCELLED}
            if current_status in locked_statuses and new_status not in locked_statuses:
                raise serializers.ValidationError(
                    {"status": f"Cannot change status of a {current_status} Equb."}
                )

        return attrs

    def create(self, validated_data):
        # organizer is injected by the view from request.user
        return Equb.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class EqubStatusUpdateSerializer(serializers.ModelSerializer):
    """Lightweight serializer for status-only updates (activate, suspend, etc.)."""

    class Meta:
        model = Equb
        fields = ["status"]

    def validate_status(self, value):
        instance = self.instance
        if instance is None:
            return value

        current = instance.status
        locked = {EqubStatus.COMPLETED, EqubStatus.CANCELLED}
        if current in locked:
            raise serializers.ValidationError(
                f"Cannot change status of a {instance.get_status_display()} Equb."
            )
        return value
