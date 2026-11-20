"""
Rotation views.

Endpoints:
  GET  /api/rotations/                    — list schedules (filtered by equb)
  POST /api/rotations/                    — create schedule (Organizer / Admin)
  GET  /api/rotations/<pk>/               — schedule detail with entries
  PATCH /api/rotations/<pk>/              — update schedule (owner / Admin)
  POST /api/rotations/<pk>/entries/       — add an entry (Organizer / Admin)
  PATCH /api/rotations/<pk>/entries/<eid>/ — update entry (Organizer / Admin)
  DELETE /api/rotations/<pk>/entries/<eid>/ — remove entry (Organizer / Admin)
  GET  /api/rotations/my/                 — entries for the authenticated member
"""
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrOrganizer
from auditing.utils import write_audit_log
from .models import RotationSchedule, RotationEntry, RotationScheduleStatus
from .serializers import (
    RotationScheduleDetailSerializer,
    RotationScheduleListSerializer,
    RotationScheduleWriteSerializer,
    RotationEntrySerializer,
    RotationEntryAssignSerializer,
    RotationEntryStatusUpdateSerializer,
)


def _schedule_qs():
    return RotationSchedule.objects.select_related(
        "equb", "created_by"
    ).prefetch_related(
        "entries__membership__user",
        "entries__payout",
    ).annotate(
        total_entries_count=Count("entries"),
        completed_entries_count=Count(
            "entries", filter=Q(entries__status="completed")
        ),
    )


def _can_write_schedule(user, schedule):
    if user.is_admin:
        return True
    if user.is_organizer and schedule.equb.organizer_id == user.pk:
        return True
    return False


class RotationScheduleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _schedule_qs()

        equb_id = request.query_params.get("equb")
        if equb_id:
            qs = qs.filter(equb_id=equb_id)

        # Members see only schedules for their Equbs
        if request.user.is_member:
            from memberships.models import MembershipStatus
            member_equb_ids = request.user.memberships.filter(
                status=MembershipStatus.APPROVED
            ).values_list("equb_id", flat=True)
            qs = qs.filter(equb_id__in=member_equb_ids)
        elif request.user.is_organizer:
            qs = qs.filter(equb__organizer=request.user)

        serializer = RotationScheduleListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not (request.user.is_admin or request.user.is_organizer):
            return Response(
                {"detail": "Only Organizers and Administrators can create rotation schedules."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RotationScheduleWriteSerializer(data=request.data)
        if serializer.is_valid():
            schedule = serializer.save(created_by=request.user)
            write_audit_log(
                actor=request.user, action="rotation_schedule_created",
                model_name="RotationSchedule", object_id=str(schedule.pk),
                detail={"title": schedule.title, "equb": schedule.equb.name},
            )
            return Response(
                RotationScheduleDetailSerializer(schedule).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RotationScheduleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return _schedule_qs().get(pk=pk)
        except RotationSchedule.DoesNotExist:
            return None

    def get(self, request, pk):
        schedule = self._get(pk)
        if not schedule:
            return Response({"detail": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RotationScheduleDetailSerializer(schedule).data)

    def patch(self, request, pk):
        schedule = self._get(pk)
        if not schedule:
            return Response({"detail": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write_schedule(request.user, schedule):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = RotationScheduleWriteSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            write_audit_log(
                actor=request.user, action="rotation_schedule_updated",
                model_name="RotationSchedule", object_id=str(schedule.pk),
                detail={"updated_fields": list(request.data.keys())},
            )
            return Response(RotationScheduleDetailSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RotationEntryListCreateView(APIView):
    """POST — add an entry to a schedule."""
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def _get_schedule(self, pk):
        try:
            return RotationSchedule.objects.select_related("equb").get(pk=pk)
        except RotationSchedule.DoesNotExist:
            return None

    def post(self, request, pk):
        schedule = self._get_schedule(pk)
        if not schedule:
            return Response({"detail": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write_schedule(request.user, schedule):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = RotationEntryAssignSerializer(
            data=request.data, context={"schedule": schedule}
        )
        if serializer.is_valid():
            entry = serializer.save()
            write_audit_log(
                actor=request.user, action="rotation_entry_assigned",
                model_name="RotationEntry", object_id=str(entry.pk),
                detail={"position": entry.position, "schedule_id": schedule.pk},
            )
            return Response(RotationEntrySerializer(entry).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RotationEntryDetailView(APIView):
    """PATCH / DELETE — update or remove an entry."""
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def _get(self, schedule_pk, entry_pk):
        try:
            return RotationEntry.objects.select_related(
                "schedule__equb", "membership__user"
            ).get(pk=entry_pk, schedule_id=schedule_pk)
        except RotationEntry.DoesNotExist:
            return None

    def patch(self, request, pk, eid):
        entry = self._get(pk, eid)
        if not entry:
            return Response({"detail": "Entry not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write_schedule(request.user, entry.schedule):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # Use status updater if only status/notes provided, else full assign
        if set(request.data.keys()) <= {"status", "notes"}:
            serializer = RotationEntryStatusUpdateSerializer(entry, data=request.data, partial=True)
        else:
            serializer = RotationEntryAssignSerializer(
                entry, data=request.data, partial=True,
                context={"schedule": entry.schedule}
            )
        if serializer.is_valid():
            updated = serializer.save()
            return Response(RotationEntrySerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, eid):
        entry = self._get(pk, eid)
        if not entry:
            return Response({"detail": "Entry not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write_schedule(request.user, entry.schedule):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        if hasattr(entry, "payout"):
            return Response(
                {"detail": "Cannot remove an entry that has a payout record."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyRotationEntriesView(APIView):
    """GET — entries for the authenticated user across all their Equbs."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from memberships.models import MembershipStatus
        entries = RotationEntry.objects.filter(
            membership__user=request.user,
            membership__status=MembershipStatus.APPROVED,
        ).select_related(
            "schedule__equb", "membership__user", "payout"
        ).order_by("schedule__equb__name", "position")
        serializer = RotationEntrySerializer(entries, many=True)
        return Response(serializer.data)
