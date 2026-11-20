"""
Withdrawal views.

GET  /api/withdrawals/          — list (Organizer/Admin: all; Member: own)
POST /api/withdrawals/          — submit request (Member)
GET  /api/withdrawals/<pk>/     — detail
POST /api/withdrawals/<pk>/review/ — approve/reject (Organizer / Admin)
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrOrganizer
from auditing.utils import write_audit_log
from notifications.utils import send_notification
from notifications.models import NotificationType
from .models import WithdrawalRequest
from .serializers import (
    WithdrawalDetailSerializer,
    WithdrawalListSerializer,
    WithdrawalRequestSubmitSerializer,
    WithdrawalReviewSerializer,
)


class WithdrawalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_member:
            qs = WithdrawalRequest.objects.filter(
                membership__user=request.user
            ).select_related("membership__user", "membership__equb")
        else:
            qs = WithdrawalRequest.objects.select_related(
                "membership__user", "membership__equb", "reviewed_by"
            )
            if request.user.is_organizer:
                qs = qs.filter(membership__equb__organizer=request.user)
        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)
        return Response(WithdrawalListSerializer(qs, many=True).data)

    def post(self, request):
        ser = WithdrawalRequestSubmitSerializer(
            data=request.data, context={"request": request}
        )
        if ser.is_valid():
            req = ser.save()
            write_audit_log(actor=request.user, action="withdrawal_requested",
                            model_name="WithdrawalRequest", object_id=str(req.pk),
                            detail={"equb": req.membership.equb.name})
            return Response(WithdrawalDetailSerializer(req).data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class WithdrawalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return WithdrawalRequest.objects.select_related(
                "membership__user", "membership__equb", "reviewed_by"
            ).get(pk=pk)
        except WithdrawalRequest.DoesNotExist:
            return None

    def _can_view(self, user, req):
        if user.is_admin or user.is_auditor: return True
        if user.is_organizer and req.membership.equb.organizer_id == user.pk: return True
        if req.membership.user_id == user.pk: return True
        return False

    def get(self, request, pk):
        req = self._get(pk)
        if not req:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_view(request.user, req):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        return Response(WithdrawalDetailSerializer(req).data)


class WithdrawalReviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def post(self, request, pk):
        try:
            req = WithdrawalRequest.objects.select_related(
                "membership__user", "membership__equb"
            ).get(pk=pk)
        except WithdrawalRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_organizer and req.membership.equb.organizer_id != request.user.pk:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        ser = WithdrawalReviewSerializer(
            data=request.data, context={"withdrawal_request": req}
        )
        if ser.is_valid():
            updated = ser.save(withdrawal_request=req, reviewer=request.user)
            # Notify the member
            ntype = (NotificationType.WITHDRAWAL_APPROVED
                     if updated.status == "approved" else NotificationType.WITHDRAWAL_REJECTED)
            send_notification(
                recipient=req.membership.user,
                notification_type=ntype,
                title=f"Withdrawal Request {updated.get_status_display()}",
                message=(
                    f"Your withdrawal request from {req.membership.equb.name} "
                    f"has been {updated.status}.\n"
                    f"{('Note: ' + updated.review_note) if updated.review_note else ''}"
                ),
                related_object_type="WithdrawalRequest", related_object_id=updated.pk,
            )
            write_audit_log(actor=request.user, action="withdrawal_reviewed",
                            model_name="WithdrawalRequest", object_id=str(req.pk),
                            detail={"action": ser.validated_data["action"]})
            return Response(WithdrawalDetailSerializer(updated).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
