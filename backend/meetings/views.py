"""
Meeting and Attendance views.

GET  /api/meetings/               — list (role-filtered)
POST /api/meetings/               — create (Organizer / Admin)
GET  /api/meetings/<pk>/          — detail with attendances
PATCH /api/meetings/<pk>/         — update (owner / Admin)
POST /api/meetings/<pk>/attendance/       — record single attendance
POST /api/meetings/<pk>/attendance/bulk/  — bulk record for all members
PATCH /api/meetings/<pk>/attendance/<aid>/ — update one attendance record
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrOrganizer
from auditing.utils import write_audit_log
from notifications.utils import send_notification
from notifications.models import NotificationType
from memberships.models import Membership, MembershipStatus
from .models import Meeting, Attendance
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSerializer,
    BulkAttendanceSerializer,
    MeetingDetailSerializer,
    MeetingListSerializer,
    MeetingWriteSerializer,
)


def _can_write(user, meeting):
    if user.is_admin: return True
    if user.is_organizer and meeting.equb.organizer_id == user.pk: return True
    return False


class MeetingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Meeting.objects.select_related("equb", "created_by")
        if request.user.is_organizer:
            qs = qs.filter(equb__organizer=request.user)
        elif request.user.is_member:
            from memberships.models import MembershipStatus
            equb_ids = request.user.memberships.filter(
                status=MembershipStatus.APPROVED
            ).values_list("equb_id", flat=True)
            qs = qs.filter(equb_id__in=equb_ids)
        equb_id = request.query_params.get("equb")
        if equb_id:
            qs = qs.filter(equb_id=equb_id)
        return Response(MeetingListSerializer(qs, many=True).data)

    def post(self, request):
        if not (request.user.is_admin or request.user.is_organizer):
            return Response({"detail": "Only Organizers can create meetings."},
                            status=status.HTTP_403_FORBIDDEN)
        ser = MeetingWriteSerializer(data=request.data)
        if ser.is_valid():
            meeting = ser.save(created_by=request.user)
            # Notify all approved members of the equb
            members = Membership.objects.filter(
                equb=meeting.equb, status=MembershipStatus.APPROVED
            ).select_related("user")
            for m in members:
                send_notification(
                    recipient=m.user,
                    notification_type=NotificationType.MEETING_SCHEDULED,
                    title=f"Meeting Scheduled: {meeting.title}",
                    message=(
                        f"A meeting has been scheduled for {meeting.equb.name}.\n"
                        f"Date: {meeting.meeting_date:%Y-%m-%d %H:%M}\n"
                        f"Location: {meeting.location or 'TBD'}"
                    ),
                    related_object_type="Meeting",
                    related_object_id=meeting.pk,
                )
            write_audit_log(actor=request.user, action="meeting_created",
                            model_name="Meeting", object_id=str(meeting.pk),
                            detail={"title": meeting.title, "equb": meeting.equb.name})
            return Response(MeetingDetailSerializer(meeting).data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class MeetingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Meeting.objects.select_related("equb", "created_by").prefetch_related(
                "attendances__membership__user"
            ).get(pk=pk)
        except Meeting.DoesNotExist:
            return None

    def get(self, request, pk):
        meeting = self._get(pk)
        if not meeting:
            return Response({"detail": "Meeting not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MeetingDetailSerializer(meeting).data)

    def patch(self, request, pk):
        meeting = self._get(pk)
        if not meeting:
            return Response({"detail": "Meeting not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write(request.user, meeting):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        old_status = meeting.status
        ser = MeetingWriteSerializer(meeting, data=request.data, partial=True)
        if ser.is_valid():
            updated = ser.save()
            # Notify members if meeting was cancelled
            if old_status != "cancelled" and updated.status == "cancelled":
                members = Membership.objects.filter(
                    equb=updated.equb, status=MembershipStatus.APPROVED
                ).select_related("user")
                for m in members:
                    send_notification(
                        recipient=m.user,
                        notification_type=NotificationType.MEETING_CANCELLED,
                        title=f"Meeting Cancelled: {updated.title}",
                        message=f"The meeting '{updated.title}' for {updated.equb.name} has been cancelled.",
                        related_object_type="Meeting", related_object_id=updated.pk,
                    )
            return Response(MeetingDetailSerializer(updated).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class AttendanceCreateView(APIView):
    """POST — record attendance for a single member."""
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def post(self, request, pk):
        try:
            meeting = Meeting.objects.select_related("equb").get(pk=pk)
        except Meeting.DoesNotExist:
            return Response({"detail": "Meeting not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write(request.user, meeting):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        ser = AttendanceRecordSerializer(
            data=request.data, context={"meeting": meeting, "request": request}
        )
        if ser.is_valid():
            att = ser.save()
            return Response(AttendanceSerializer(att).data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class BulkAttendanceView(APIView):
    """POST — record attendance for multiple members at once."""
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def post(self, request, pk):
        try:
            meeting = Meeting.objects.select_related("equb").get(pk=pk)
        except Meeting.DoesNotExist:
            return Response({"detail": "Meeting not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write(request.user, meeting):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        ser = BulkAttendanceSerializer(data=request.data)
        if ser.is_valid():
            records = ser.save(meeting=meeting, recorder=request.user)
            return Response(AttendanceSerializer(records, many=True).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class AttendanceDetailView(APIView):
    """PATCH — update a single attendance record."""
    permission_classes = [IsAuthenticated, IsAdminOrOrganizer]

    def patch(self, request, pk, aid):
        try:
            att = Attendance.objects.select_related(
                "meeting__equb", "membership__user"
            ).get(pk=aid, meeting_id=pk)
        except Attendance.DoesNotExist:
            return Response({"detail": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _can_write(request.user, att.meeting):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        ser = AttendanceRecordSerializer(
            att, data=request.data, partial=True,
            context={"meeting": att.meeting, "request": request}
        )
        if ser.is_valid():
            return Response(AttendanceSerializer(ser.save()).data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
