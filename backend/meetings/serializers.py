"""
Serializers for the meetings app.
"""
from rest_framework import serializers
from memberships.models import Membership, MembershipStatus
from .models import Meeting, MeetingStatus, Attendance, AttendanceStatus


class AttendanceSerializer(serializers.ModelSerializer):
    member_name  = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model  = Attendance
        fields = [
            "id", "membership", "member_name",
            "status", "status_display", "notes", "created_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj):
        return obj.membership.user.get_full_name() or obj.membership.user.username

    def get_status_display(self, obj):
        return obj.get_status_display()


class MeetingListSerializer(serializers.ModelSerializer):
    equb_name      = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    attendance_count = serializers.SerializerMethodField()

    class Meta:
        model  = Meeting
        fields = [
            "id", "title", "equb", "equb_name",
            "meeting_date", "location",
            "status", "status_display",
            "created_by", "created_by_name",
            "attendance_count", "created_at",
        ]
        read_only_fields = fields

    def get_equb_name(self, obj):    return obj.equb.name
    def get_status_display(self, obj): return obj.get_status_display()
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username
    def get_attendance_count(self, obj): return obj.attendances.count()


class MeetingDetailSerializer(MeetingListSerializer):
    attendances = AttendanceSerializer(many=True, read_only=True)

    class Meta(MeetingListSerializer.Meta):
        fields = MeetingListSerializer.Meta.fields + [
            "description", "attendances", "updated_at",
        ]
        read_only_fields = fields


class MeetingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Meeting
        fields = ["equb", "title", "description", "meeting_date", "location", "status"]

    def validate(self, attrs):
        if self.instance:
            locked = {MeetingStatus.COMPLETED, MeetingStatus.CANCELLED}
            cur    = self.instance.status
            new    = attrs.get("status", cur)
            if cur in locked and new not in locked:
                raise serializers.ValidationError(
                    {"status": f"Cannot change status of a {self.instance.get_status_display()} meeting."}
                )
        return attrs


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Used when recording / updating individual attendance."""

    class Meta:
        model  = Attendance
        fields = ["membership", "status", "notes"]

    def validate_membership(self, membership):
        meeting = self.context.get("meeting")
        if meeting and membership.equb_id != meeting.equb_id:
            raise serializers.ValidationError(
                "This member does not belong to the Equb for this meeting."
            )
        if membership.status != MembershipStatus.APPROVED:
            raise serializers.ValidationError(
                "Only approved members can have attendance recorded."
            )
        return membership

    def validate(self, attrs):
        meeting    = self.context.get("meeting")
        membership = attrs.get("membership") or (self.instance.membership if self.instance else None)
        if meeting and membership:
            qs = Attendance.objects.filter(meeting=meeting, membership=membership)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"membership": "Attendance for this member has already been recorded."}
                )
        return attrs

    def create(self, validated_data):
        meeting = self.context["meeting"]
        recorder = self.context["request"].user
        return Attendance.objects.create(
            meeting=meeting, recorded_by=recorder, **validated_data
        )

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Record attendance for all approved members of a meeting's Equb at once.
    Accepts a list of {membership, status, notes} objects.
    Existing records are updated; new ones are created.
    """
    records = AttendanceRecordSerializer(many=True)

    def save(self, meeting, recorder):
        results = []
        for item in self.validated_data["records"]:
            obj, _ = Attendance.objects.update_or_create(
                meeting=meeting,
                membership=item["membership"],
                defaults={
                    "status": item.get("status", AttendanceStatus.ABSENT),
                    "notes": item.get("notes", ""),
                    "recorded_by": recorder,
                },
            )
            results.append(obj)
        return results
