"""
Equb views.

Endpoints:
  GET    /api/equbs/               — list all Equbs (all authenticated users)
  POST   /api/equbs/               — create an Equb (Organizer / Admin)
  GET    /api/equbs/my/            — list Equbs created by the logged-in organizer
  GET    /api/equbs/<pk>/          — retrieve Equb detail (all authenticated users)
  PATCH  /api/equbs/<pk>/          — update Equb info (Organizer who owns it / Admin)
  PATCH  /api/equbs/<pk>/status/   — change status only (Organizer who owns it / Admin)
"""
from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrator, IsOrganizer, IsAdminOrOrganizer
from auditing.utils import write_audit_log
from .models import Equb
from .serializers import (
    EqubDetailSerializer,
    EqubListSerializer,
    EqubStatusUpdateSerializer,
    EqubWriteSerializer,
)


def _equb_queryset():
    """Annotate queryset with approved member count for list/detail views."""
    from django.db.models import Q
    return Equb.objects.annotate(
        approved_member_count=Count(
            "memberships",
            filter=Q(memberships__status="approved"),
        )
    ).select_related("organizer")


class EqubListCreateView(APIView):
    """
    GET  — list all Equbs (any authenticated user)
    POST — create a new Equb (Organizer / Admin only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = _equb_queryset().order_by("-created_at")
        serializer = EqubListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Only organizers and admins can create Equbs
        if not (request.user.is_organizer or request.user.is_admin):
            return Response(
                {"detail": "Only Organizers and Administrators can create Equb groups."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EqubWriteSerializer(data=request.data)
        if serializer.is_valid():
            equb = serializer.save(organizer=request.user)
            write_audit_log(
                actor=request.user,
                action="equb_created",
                model_name="Equb",
                object_id=str(equb.pk),
                detail={"name": equb.name, "frequency": equb.frequency},
            )
            return Response(EqubDetailSerializer(equb).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyEqubsView(APIView):
    """
    GET — list Equbs organised by the current user (Organizer / Admin).
    """

    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def get(self, request):
        queryset = _equb_queryset().filter(organizer=request.user).order_by("-created_at")
        serializer = EqubListSerializer(queryset, many=True)
        return Response(serializer.data)


class EqubDetailUpdateView(APIView):
    """
    GET   — retrieve Equb detail (any authenticated user)
    PATCH — update Equb info (owning Organizer / Admin only)
    """

    permission_classes = [IsAuthenticated]

    def _get_equb(self, pk):
        try:
            return _equb_queryset().get(pk=pk)
        except Equb.DoesNotExist:
            return None

    def _check_write_permission(self, request, equb):
        """Return True if the user may write to this Equb."""
        if request.user.is_admin:
            return True
        if request.user.is_organizer and equb.organizer_id == request.user.pk:
            return True
        return False

    def get(self, request, pk):
        equb = self._get_equb(pk)
        if equb is None:
            return Response({"detail": "Equb not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EqubDetailSerializer(equb)
        return Response(serializer.data)

    def patch(self, request, pk):
        equb = self._get_equb(pk)
        if equb is None:
            return Response({"detail": "Equb not found."}, status=status.HTTP_404_NOT_FOUND)
        if not self._check_write_permission(request, equb):
            return Response(
                {"detail": "You do not have permission to edit this Equb."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EqubWriteSerializer(equb, data=request.data, partial=True)
        if serializer.is_valid():
            equb = serializer.save()
            write_audit_log(
                actor=request.user,
                action="equb_updated",
                model_name="Equb",
                object_id=str(equb.pk),
                detail={"updated_fields": list(request.data.keys())},
            )
            return Response(EqubDetailSerializer(equb).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EqubStatusUpdateView(APIView):
    """
    PATCH /api/equbs/<pk>/status/
    Change the status of an Equb (owning Organizer / Admin only).
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            equb = Equb.objects.get(pk=pk)
        except Equb.DoesNotExist:
            return Response({"detail": "Equb not found."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_admin or
                (request.user.is_organizer and equb.organizer_id == request.user.pk)):
            return Response(
                {"detail": "You do not have permission to change this Equb's status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_status = equb.status
        serializer = EqubStatusUpdateSerializer(equb, data=request.data, partial=True)
        if serializer.is_valid():
            equb = serializer.save()
            write_audit_log(
                actor=request.user,
                action="equb_status_changed",
                model_name="Equb",
                object_id=str(equb.pk),
                detail={"from": old_status, "to": equb.status},
            )
            return Response(EqubListSerializer(equb).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
