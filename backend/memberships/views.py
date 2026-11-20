"""
Membership views.

Endpoints:
  GET  /api/memberships/              — list memberships (Organizer/Admin: all; Member: own)
  POST /api/memberships/              — request to join an Equb (any authenticated user)
  GET  /api/memberships/my/           — list own memberships (any authenticated user)
  GET  /api/memberships/<pk>/         — retrieve a membership
  POST /api/memberships/<pk>/review/  — approve or reject (Organizer / Admin)
  PATCH /api/memberships/<pk>/status/ — suspend / exit (Organizer / Admin)
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrOrganizer
from auditing.utils import write_audit_log
from .models import Membership, MembershipStatus
from .serializers import (
    MembershipDetailSerializer,
    MembershipListSerializer,
    MembershipRequestSerializer,
    MembershipReviewSerializer,
    MembershipStatusUpdateSerializer,
)


class MembershipListCreateView(APIView):
    """
    GET  — Organizer/Admin: all memberships (optionally filtered by equb).
             Members: redirect to /my/ (returns own memberships).
    POST — Any authenticated user: request membership in an Equb.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_admin or user.is_organizer:
            queryset = Membership.objects.select_related("user", "equb", "reviewed_by").all()
            # Optional filter: ?equb=<id>
            equb_id = request.query_params.get("equb")
            if equb_id:
                queryset = queryset.filter(equb_id=equb_id)
            # Organizers only see memberships for Equbs they own
            if user.is_organizer:
                queryset = queryset.filter(equb__organizer=user)
        else:
            # Members see only their own
            queryset = Membership.objects.filter(user=user).select_related("user", "equb")

        serializer = MembershipListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = MembershipRequestSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            membership = serializer.save()
            write_audit_log(
                actor=request.user,
                action="membership_requested",
                model_name="Membership",
                object_id=str(membership.pk),
                detail={"equb_id": membership.equb_id, "equb_name": membership.equb.name},
            )
            return Response(
                MembershipDetailSerializer(membership).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyMembershipsView(APIView):
    """GET — return the authenticated user's own memberships."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Membership.objects.filter(user=request.user).select_related(
            "user", "equb", "reviewed_by"
        )
        serializer = MembershipDetailSerializer(queryset, many=True)
        return Response(serializer.data)


class MembershipDetailView(APIView):
    """
    GET — retrieve a single membership.
    Accessible to: the member themselves, any Organizer of that Equb, Admin.
    """

    permission_classes = [IsAuthenticated]

    def _get_membership(self, pk):
        try:
            return Membership.objects.select_related(
                "user", "equb", "equb__organizer", "reviewed_by"
            ).get(pk=pk)
        except Membership.DoesNotExist:
            return None

    def _can_view(self, request, membership):
        u = request.user
        if u.is_admin:
            return True
        if u.is_organizer and membership.equb.organizer_id == u.pk:
            return True
        if membership.user_id == u.pk:
            return True
        return False

    def get(self, request, pk):
        membership = self._get_membership(pk)
        if membership is None:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)
        if not self._can_view(request, membership):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        return Response(MembershipDetailSerializer(membership).data)


class MembershipReviewView(APIView):
    """
    POST /api/memberships/<pk>/review/
    Approve or reject a pending membership request.
    Only the owning Organizer or an Administrator.
    """

    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def post(self, request, pk):
        try:
            membership = Membership.objects.select_related("equb").get(pk=pk)
        except Membership.DoesNotExist:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

        # Organizers can only review memberships in their own Equbs
        if request.user.is_organizer and membership.equb.organizer_id != request.user.pk:
            return Response(
                {"detail": "You can only review memberships in your own Equb groups."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MembershipReviewSerializer(
            data=request.data,
            context={"membership": membership},
        )
        if serializer.is_valid():
            updated = serializer.save(membership=membership, reviewer=request.user)
            write_audit_log(
                actor=request.user,
                action="membership_reviewed",
                model_name="Membership",
                object_id=str(membership.pk),
                detail={
                    "action": serializer.validated_data["action"],
                    "equb_id": membership.equb_id,
                    "user_id": membership.user_id,
                },
            )
            return Response(MembershipDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MembershipStatusUpdateView(APIView):
    """
    PATCH /api/memberships/<pk>/status/
    Suspend, exit, or re-approve a membership (owning Organizer / Admin).
    """

    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def patch(self, request, pk):
        try:
            membership = Membership.objects.select_related("equb").get(pk=pk)
        except Membership.DoesNotExist:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_organizer and membership.equb.organizer_id != request.user.pk:
            return Response(
                {"detail": "You can only manage memberships in your own Equb groups."},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_status = membership.status
        serializer = MembershipStatusUpdateSerializer(membership, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            write_audit_log(
                actor=request.user,
                action="membership_status_changed",
                model_name="Membership",
                object_id=str(membership.pk),
                detail={"from": old_status, "to": updated.status},
            )
            return Response(MembershipDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
