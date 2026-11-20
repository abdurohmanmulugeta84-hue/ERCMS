"""
Contribution and Payment views.

Contribution endpoints:
  GET  /api/contributions/              — list (Treasurer/Admin: by equb; Member: own)
  POST /api/contributions/              — submit a contribution (Member / Treasurer)
  GET  /api/contributions/outstanding/  — list outstanding contributions for an equb
  GET  /api/contributions/<pk>/         — retrieve detail
  POST /api/contributions/<pk>/verify/  — verify or reject (Treasurer / Admin)

Payment endpoints:
  GET  /api/payments/                   — list payments (Treasurer/Admin: by equb)
  POST /api/payments/                   — record a payment (Treasurer / Admin)
  GET  /api/payments/<pk>/              — retrieve payment detail
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrTreasurer, IsAdministrator
from auditing.utils import write_audit_log
from memberships.models import MembershipStatus
from .models import Contribution, ContributionStatus, Payment
from .serializers import (
    ContributionDetailSerializer,
    ContributionListSerializer,
    ContributionSubmitSerializer,
    ContributionVerifySerializer,
    PaymentCreateSerializer,
    PaymentDetailSerializer,
    PaymentListSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _contribution_queryset():
    return Contribution.objects.select_related(
        "membership__user", "equb", "submitted_by",
        "verified_by",
    ).prefetch_related("payments")


def _can_view_contribution(user, contribution):
    """Any authenticated user with a valid role can view a contribution."""
    if user.is_admin or user.is_treasurer or user.is_auditor:
        return True
    if user.is_organizer and contribution.equb.organizer_id == user.pk:
        return True
    if user.is_member and contribution.membership.user_id == user.pk:
        return True
    return False


def _can_verify(user, contribution):
    return user.is_admin or user.is_treasurer


# ── Contribution views ─────────────────────────────────────────────────────────

class ContributionListCreateView(APIView):
    """
    GET  — filtered list of contributions.
           Treasurer/Admin/Auditor: all (optional ?equb=<id>)
           Organizer: contributions in their Equbs (optional ?equb=<id>)
           Member: own contributions only
    POST — submit a new contribution (Member or Treasurer/Admin on behalf).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = _contribution_queryset()

        if user.is_member:
            qs = qs.filter(membership__user=user)
        elif user.is_organizer:
            qs = qs.filter(equb__organizer=user)
        # Admin / Treasurer / Auditor see all

        equb_id = request.query_params.get("equb")
        if equb_id:
            qs = qs.filter(equb_id=equb_id)

        member_id = request.query_params.get("member")
        if member_id:
            qs = qs.filter(membership__user_id=member_id)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = ContributionListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ContributionSubmitSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            contribution = serializer.save()
            write_audit_log(
                actor=request.user,
                action="contribution_submitted",
                model_name="Contribution",
                object_id=str(contribution.pk),
                detail={
                    "reference": contribution.transaction_reference,
                    "equb": contribution.equb.name,
                    "period": contribution.period_label,
                    "amount": str(contribution.amount),
                },
            )
            return Response(
                ContributionDetailSerializer(contribution).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OutstandingContributionsView(APIView):
    """
    GET /api/contributions/outstanding/
    Returns members with no verified contribution for the given period.
    Requires ?equb=<id>&period=<label>
    Accessible to Treasurer, Organizer, and Admin.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_member:
            return Response(
                {"detail": "Members cannot view outstanding contribution reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equb_id = request.query_params.get("equb")
        period = request.query_params.get("period")

        if not equb_id:
            return Response(
                {"detail": "Query parameter 'equb' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # All approved members of this Equb
        from memberships.models import Membership
        approved_members = Membership.objects.filter(
            equb_id=equb_id,
            status=MembershipStatus.APPROVED,
        ).select_related("user")

        if period:
            # Members who have NOT submitted a verified contribution for this period
            paid_member_ids = set(
                Contribution.objects.filter(
                    equb_id=equb_id,
                    period_label=period,
                    status=ContributionStatus.VERIFIED,
                ).values_list("membership__user_id", flat=True)
            )
            outstanding = [m for m in approved_members if m.user_id not in paid_member_ids]
        else:
            outstanding = list(approved_members)

        result = [
            {
                "membership_id": m.pk,
                "user_id": m.user_id,
                "member_name": m.user.get_full_name() or m.user.username,
                "member_email": m.user.email,
            }
            for m in outstanding
        ]
        return Response(result)


class ContributionDetailView(APIView):
    """GET — retrieve a single contribution."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return _contribution_queryset().get(pk=pk)
        except Contribution.DoesNotExist:
            return None

    def get(self, request, pk):
        contribution = self._get(pk)
        if not contribution:
            return Response({"detail": "Contribution not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_view_contribution(request.user, contribution):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        return Response(ContributionDetailSerializer(contribution).data)


class ContributionVerifyView(APIView):
    """
    POST /api/contributions/<pk>/verify/
    Treasurer or Admin verifies or rejects a submitted contribution.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.is_treasurer or request.user.is_admin):
            return Response(
                {"detail": "Only Treasurers and Administrators can verify contributions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            contribution = _contribution_queryset().get(pk=pk)
        except Contribution.DoesNotExist:
            return Response({"detail": "Contribution not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ContributionVerifySerializer(
            data=request.data,
            context={"contribution": contribution},
        )
        if serializer.is_valid():
            updated = serializer.save(
                contribution=contribution, verifier=request.user
            )
            write_audit_log(
                actor=request.user,
                action="contribution_verified",
                model_name="Contribution",
                object_id=str(contribution.pk),
                detail={
                    "action": serializer.validated_data["action"],
                    "reference": contribution.transaction_reference,
                },
            )
            return Response(ContributionDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Payment views ──────────────────────────────────────────────────────────────

class PaymentListCreateView(APIView):
    """
    GET  — list payments. Treasurer/Admin: all (optional ?equb=<id>).
    POST — record a payment (Treasurer / Admin only).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_member:
            # Members see payments on their own contributions
            qs = Payment.objects.filter(
                contribution__membership__user=user
            ).select_related("contribution", "recorded_by")
        else:
            qs = Payment.objects.select_related(
                "contribution", "contribution__membership__user",
                "contribution__equb", "recorded_by",
            )
            equb_id = request.query_params.get("equb")
            if equb_id:
                qs = qs.filter(contribution__equb_id=equb_id)

        serializer = PaymentListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not (request.user.is_treasurer or request.user.is_admin):
            return Response(
                {"detail": "Only Treasurers and Administrators can record payments."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PaymentCreateSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save(recorded_by=request.user)
            write_audit_log(
                actor=request.user,
                action="payment_recorded",
                model_name="Payment",
                object_id=str(payment.pk),
                detail={
                    "payment_reference": payment.payment_reference,
                    "contribution_reference": payment.contribution.transaction_reference,
                    "amount": str(payment.amount),
                    "method": payment.method,
                },
            )
            return Response(
                PaymentDetailSerializer(payment).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PaymentDetailView(APIView):
    """GET — retrieve a single payment record."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            payment = Payment.objects.select_related(
                "contribution__membership__user",
                "contribution__equb",
                "recorded_by",
            ).get(pk=pk)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        # Members can only see their own payments
        if request.user.is_member:
            if payment.contribution.membership.user_id != request.user.pk:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        return Response(PaymentDetailSerializer(payment).data)
