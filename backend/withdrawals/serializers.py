"""Serializers for the withdrawals app."""
from django.utils import timezone
from rest_framework import serializers
from memberships.models import MembershipStatus
from .models import WithdrawalRequest, WithdrawalStatus


class WithdrawalListSerializer(serializers.ModelSerializer):
    member_name  = serializers.SerializerMethodField()
    equb_name    = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model  = WithdrawalRequest
        fields = [
            "id", "membership", "member_name", "equb_name",
            "reason", "status", "status_display", "created_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj):
        return obj.membership.user.get_full_name() or obj.membership.user.username
    def get_equb_name(self, obj):      return obj.membership.equb.name
    def get_status_display(self, obj): return obj.get_status_display()


class WithdrawalDetailSerializer(WithdrawalListSerializer):
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta(WithdrawalListSerializer.Meta):
        fields = WithdrawalListSerializer.Meta.fields + [
            "review_note", "reviewed_by", "reviewed_by_name", "reviewed_at", "updated_at",
        ]
        read_only_fields = fields

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class WithdrawalRequestSubmitSerializer(serializers.ModelSerializer):
    """Member submits a withdrawal request for one of their memberships."""

    class Meta:
        model  = WithdrawalRequest
        fields = ["membership", "reason"]

    def validate_membership(self, membership):
        user = self.context["request"].user
        if membership.user_id != user.pk:
            raise serializers.ValidationError("You can only request withdrawal for your own membership.")
        if membership.status != MembershipStatus.APPROVED:
            raise serializers.ValidationError("Only approved memberships can have a withdrawal request.")
        return membership

    def validate(self, attrs):
        membership = attrs["membership"]
        if WithdrawalRequest.objects.filter(
            membership=membership, status=WithdrawalStatus.PENDING
        ).exists():
            raise serializers.ValidationError(
                {"membership": "You already have a pending withdrawal request for this membership."}
            )
        return attrs

    def create(self, validated_data):
        return WithdrawalRequest.objects.create(
            status=WithdrawalStatus.PENDING, **validated_data
        )


class WithdrawalReviewSerializer(serializers.Serializer):
    action      = serializers.ChoiceField(choices=["approve", "reject"])
    review_note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        req = self.context.get("withdrawal_request")
        if req and req.status != WithdrawalStatus.PENDING:
            raise serializers.ValidationError(
                f"Cannot review a request with status '{req.get_status_display()}'."
            )
        return attrs

    def save(self, withdrawal_request, reviewer):
        action = self.validated_data["action"]
        withdrawal_request.status      = WithdrawalStatus.APPROVED if action == "approve" else WithdrawalStatus.REJECTED
        withdrawal_request.review_note = self.validated_data.get("review_note", "")
        withdrawal_request.reviewed_by = reviewer
        withdrawal_request.reviewed_at = timezone.now()
        withdrawal_request.save()
        return withdrawal_request
