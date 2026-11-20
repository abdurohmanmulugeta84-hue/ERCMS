"""
Serializers for the rotations app.

RotationScheduleListSerializer  — compact schedule list
RotationScheduleDetailSerializer — full schedule with entries
RotationScheduleWriteSerializer  — create / update schedule
RotationEntrySerializer          — entry read view
RotationEntryAssignSerializer    — create or update an entry (organizer)
"""
from rest_framework import serializers
from memberships.models import Membership, MembershipStatus
from .models import (
    RotationSchedule, RotationScheduleStatus,
    RotationEntry, RotationEntryStatus,
)


class RotationEntrySerializer(serializers.ModelSerializer):
    member_name  = serializers.SerializerMethodField()
    member_email = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    has_payout   = serializers.SerializerMethodField()

    class Meta:
        model  = RotationEntry
        fields = [
            "id", "position",
            "membership", "member_name", "member_email",
            "expected_payout_date", "status", "status_display",
            "has_payout", "notes", "created_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj):
        return obj.membership.user.get_full_name() or obj.membership.user.username

    def get_member_email(self, obj):
        return obj.membership.user.email

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_has_payout(self, obj):
        return hasattr(obj, "payout")


class RotationScheduleListSerializer(serializers.ModelSerializer):
    equb_name      = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    total_entries  = serializers.IntegerField(read_only=True)
    completed_entries = serializers.IntegerField(read_only=True)

    class Meta:
        model  = RotationSchedule
        fields = [
            "id", "title", "equb", "equb_name",
            "status", "status_display",
            "total_entries", "completed_entries",
            "created_by", "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_equb_name(self, obj):
        return obj.equb.name

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_total_entries(self, obj):
        if hasattr(obj, "total_entries_count"):
            return obj.total_entries_count
        return obj.total_entries

    def get_completed_entries(self, obj):
        if hasattr(obj, "completed_entries_count"):
            return obj.completed_entries_count
        return obj.completed_entries


class RotationScheduleDetailSerializer(RotationScheduleListSerializer):
    entries = RotationEntrySerializer(many=True, read_only=True)

    class Meta(RotationScheduleListSerializer.Meta):
        fields = RotationScheduleListSerializer.Meta.fields + [
            "notes", "entries", "updated_at",
        ]
        read_only_fields = fields


class RotationScheduleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RotationSchedule
        fields = ["equb", "title", "status", "notes"]

    def validate(self, attrs):
        equb   = attrs.get("equb") or (self.instance.equb if self.instance else None)
        status = attrs.get("status", getattr(self.instance, "status", None))

        # Only one ACTIVE schedule per equb
        if status == RotationScheduleStatus.ACTIVE:
            qs = RotationSchedule.objects.filter(
                equb=equb, status=RotationScheduleStatus.ACTIVE
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"status": "This Equb already has an active rotation schedule."}
                )

        # Cannot revert a completed / cancelled schedule
        if self.instance:
            locked = {RotationScheduleStatus.COMPLETED, RotationScheduleStatus.CANCELLED}
            if self.instance.status in locked and status not in locked:
                raise serializers.ValidationError(
                    {"status": f"Cannot change status of a {self.instance.get_status_display()} schedule."}
                )
        return attrs

    def create(self, validated_data):
        return RotationSchedule.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class RotationEntryAssignSerializer(serializers.ModelSerializer):
    """Organizer assigns or updates a member's position in a schedule."""

    class Meta:
        model  = RotationEntry
        fields = ["membership", "position", "expected_payout_date", "notes"]

    def validate(self, attrs):
        schedule   = self.context["schedule"]
        membership = attrs.get("membership") or (self.instance.membership if self.instance else None)
        position   = attrs.get("position")

        # Membership must belong to the same equb as the schedule
        if membership.equb_id != schedule.equb_id:
            raise serializers.ValidationError(
                {"membership": "This member does not belong to the Equb for this schedule."}
            )

        # Membership must be approved
        if membership.status != MembershipStatus.APPROVED:
            raise serializers.ValidationError(
                {"membership": "Only approved members can be assigned a rotation position."}
            )

        # Position must be unique in this schedule
        if position is not None:
            qs = RotationEntry.objects.filter(schedule=schedule, position=position)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"position": f"Position {position} is already assigned in this schedule."}
                )

        # Membership can only appear once per schedule
        qs_mem = RotationEntry.objects.filter(schedule=schedule, membership=membership)
        if self.instance:
            qs_mem = qs_mem.exclude(pk=self.instance.pk)
        if qs_mem.exists():
            raise serializers.ValidationError(
                {"membership": "This member already has an entry in this schedule."}
            )

        return attrs

    def create(self, validated_data):
        schedule = self.context["schedule"]
        return RotationEntry.objects.create(schedule=schedule, **validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class RotationEntryStatusUpdateSerializer(serializers.ModelSerializer):
    """Organizer marks an entry as scheduled / skipped."""

    class Meta:
        model  = RotationEntry
        fields = ["status", "notes"]

    def validate_status(self, value):
        # Cannot mark completed — that is done automatically when a Payout is processed
        if value == RotationEntryStatus.COMPLETED:
            raise serializers.ValidationError(
                "Entries are marked as completed automatically when a payout is processed."
            )
        return value
