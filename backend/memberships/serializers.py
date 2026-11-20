"""
Serializers for the memberships app.

MembershipListSerializer   — compact list view
MembershipDetailSerializer — full detail
MembershipRequestSerializer — member submitting a join request
MembershipReviewSerializer  — organizer approving / rejecting
"""
from django.utils import timezone
from rest_framework import serializers

from equbs.models import EqubStatus
from .models import Membership, MembershipStatus


class MembershipListSerializer(serializers.ModelSerializer):
    """Compact view used in Equb member lists."""

    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    equb_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = [
            "id", "user", "user_full_name", "user_email",
            "equb", "equb_name",
            "status", "status_display",
            "rotation_position", "created_at",
        ]
        read_only_fields = fields

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email

    def get_equb_name(self, obj):
        return obj.equb.name

    def get_status_display(self, obj):
        return obj.get_status_display()


class MembershipDetailSerializer(serializers.ModelSerializer):
    """Full detail — used in the membership detail endpoint."""

    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    equb_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = [
            "id",
            "user", "user_full_name", "user_email",
            "equb", "equb_name",
            "status", "status_display",
            "request_note", "review_note",
            "reviewed_by", "reviewed_by_name", "reviewed_at",
            "rotation_position",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email

    def get_equb_name(self, obj):
        return obj.equb.name

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class MembershipRequestSerializer(serializers.ModelSerializer):
    """
    Used when a user requests to join an Equb.
    The user is injected from request.user in the view.
    """

    class Meta:
        model = Membership
        fields = ["equb", "request_note"]

    def validate(self, attrs):
        equb = attrs["equb"]
        request = self.context["request"]
        user = request.user

        # Equb must be accepting members
        if equb.status not in (EqubStatus.DRAFT, EqubStatus.ACTIVE):
            raise serializers.ValidationError(
                {"equb": "This Equb is not currently accepting membership requests."}
            )

        # Check capacity
        if equb.is_full:
            raise serializers.ValidationError(
                {"equb": "This Equb has reached its maximum member limit."}
            )

        # Check for duplicate membership
        existing_qs = Membership.objects.filter(
            user=user, equb=equb
        ).exclude(status=MembershipStatus.REJECTED)

        if existing_qs.exists():
            if not equb.allow_multiple_memberships:
                raise serializers.ValidationError(
                    {"equb": "You already have an active or pending membership in this Equb."}
                )

        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        return Membership.objects.create(
            user=user,
            status=MembershipStatus.PENDING,
            **validated_data,
        )


class MembershipReviewSerializer(serializers.Serializer):
    """
    Used by Organizers to approve or reject a membership request.
    Accepts: action ('approve' | 'reject'), review_note (optional).
    """

    ACTION_APPROVE = "approve"
    ACTION_REJECT = "reject"

    action = serializers.ChoiceField(choices=["approve", "reject"])
    review_note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        instance = self.context.get("membership")
        if instance and instance.status not in (
            MembershipStatus.PENDING, MembershipStatus.REJECTED
        ):
            raise serializers.ValidationError(
                f"Cannot review a membership with status '{instance.get_status_display()}'."
            )
        return attrs

    def save(self, membership, reviewer):
        action = self.validated_data["action"]
        note = self.validated_data.get("review_note", "")

        membership.status = (
            MembershipStatus.APPROVED
            if action == self.ACTION_APPROVE
            else MembershipStatus.REJECTED
        )
        membership.review_note = note
        membership.reviewed_by = reviewer
        membership.reviewed_at = timezone.now()
        membership.save()
        return membership


class MembershipStatusUpdateSerializer(serializers.ModelSerializer):
    """
    For organizers to suspend or re-activate (set back to approved) a membership.
    """

    class Meta:
        model = Membership
        fields = ["status", "review_note"]

    def validate_status(self, value):
        allowed = {
            MembershipStatus.APPROVED,
            MembershipStatus.SUSPENDED,
            MembershipStatus.EXITED,
        }
        if value not in allowed:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(allowed)}."
            )
        return value
