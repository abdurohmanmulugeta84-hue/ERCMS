"""
Meeting and Attendance models.

Meeting    — a scheduled Equb meeting created by the Organizer.
Attendance — one record per member per meeting (unique constraint).
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class MeetingStatus(models.TextChoices):
    UPCOMING   = "upcoming",   _("Upcoming")
    COMPLETED  = "completed",  _("Completed")
    CANCELLED  = "cancelled",  _("Cancelled")


class AttendanceStatus(models.TextChoices):
    PRESENT  = "present",  _("Present")
    ABSENT   = "absent",   _("Absent")
    EXCUSED  = "excused",  _("Excused")


class Meeting(models.Model):
    equb = models.ForeignKey(
        "equbs.Equb",
        on_delete=models.PROTECT,
        related_name="meetings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    meeting_date = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(
        max_length=12,
        choices=MeetingStatus.choices,
        default=MeetingStatus.UPCOMING,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_meetings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("meeting")
        verbose_name_plural = _("meetings")
        ordering = ["-meeting_date"]

    def __str__(self):
        return f"{self.title} — {self.equb.name} ({self.meeting_date:%Y-%m-%d})"


class Attendance(models.Model):
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    membership = models.ForeignKey(
        "memberships.Membership",
        on_delete=models.PROTECT,
        related_name="attendances",
    )
    status = models.CharField(
        max_length=10,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.ABSENT,
    )
    notes = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_attendances",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("attendance")
        verbose_name_plural = _("attendances")
        ordering = ["meeting", "membership"]
        constraints = [
            models.UniqueConstraint(
                fields=["meeting", "membership"],
                name="unique_attendance_per_member_per_meeting",
            )
        ]

    def __str__(self):
        return (
            f"{self.membership.user.get_full_name()} — "
            f"{self.meeting.title} ({self.get_status_display()})"
        )
