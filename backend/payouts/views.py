"""
Payout views.

Endpoints:
  GET  /api/payouts/            — list payouts (role-filtered)
  POST /api/payouts/            — process a payout (Treasurer / Admin)
  GET  /api/payouts/my/         — payouts received by the authenticated user
  GET  /api/payouts/<pk>/       — retrieve payout detail
  POST /api/payouts/<pk>/cancel/ — cancel a scheduled payout (Treasurer / Admin)
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auditing.utils import write_audit_log
from .models import Payout
from .serializers import (
    PayoutCancelSerializer,
    PayoutCreateSerializer,
    PayoutDetailSerializer,
    PayoutListSerializer,
)


def _payout_qs():
    return Payout.objects.select_related(
        "rotation_entry__schedule",
        "equb", "recipient",
        "processed_by",
    )


class PayoutListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _payout_qs()

        if request.user.is_member:
            qs = qs.filter(recipient=request.user)
        elif request.user.is_organizer:
            qs = qs.filter(equb__organizer=request.user)
        elif request.user.is_auditor:
            pass  # auditors see all

        equb_id = request.query_params.get("equb")
        if equb_id:
            qs = qs.filter(equb_id=equb_id)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = PayoutListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not (request.user.is_treasurer or request.user.is_admin):
            return Response(
                {"detail": "Only Treasurers and Administrators can process payouts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PayoutCreateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            payout = serializer.save()
            write_audit_log(
                actor=request.user, action="payout_processed",
                model_name="Payout", object_id=str(payout.pk),
                detail={
                    "reference": payout.payout_reference,
                    "recipient": payout.recipient.get_full_name(),
                    "amount": str(payout.amount),
                    "equb": payout.equb.name,
                },
            )
            return Response(
                PayoutDetailSerializer(payout).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyPayoutsView(APIView):
    """GET — payouts received by the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _payout_qs().filter(recipient=request.user)
        serializer = PayoutListSerializer(qs, many=True)
        return Response(serializer.data)


class PayoutDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return _payout_qs().get(pk=pk)
        except Payout.DoesNotExist:
            return None

    def get(self, request, pk):
        payout = self._get(pk)
        if not payout:
            return Response({"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)

        # Members can only see their own payouts
        if request.user.is_member and payout.recipient_id != request.user.pk:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        return Response(PayoutDetailSerializer(payout).data)


class PayoutCancelView(APIView):
    """POST — cancel a scheduled (not yet processed) payout."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.is_treasurer or request.user.is_admin):
            return Response(
                {"detail": "Only Treasurers and Administrators can cancel payouts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        payout = Payout.objects.filter(pk=pk).select_related("equb").first()
        if not payout:
            return Response({"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PayoutCancelSerializer(data=request.data, context={"payout": payout})
        if serializer.is_valid():
            updated = serializer.save(payout=payout)
            write_audit_log(
                actor=request.user, action="payout_cancelled",
                model_name="Payout", object_id=str(payout.pk),
                detail={"reference": payout.payout_reference},
            )
            return Response(PayoutDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
