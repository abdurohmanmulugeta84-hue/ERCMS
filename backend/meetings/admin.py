from django.contrib import admin
from .models import Meeting, Attendance


class AttendanceInline(admin.TabularInline):
    model = Attendance
    extra = 0
    fields = ("membership", "status", "notes", "recorded_by")
    readonly_fields = ("recorded_by",)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display  = ("title", "equb", "meeting_date", "status", "created_by")
    list_filter   = ("status", "equb")
    search_fields = ("title", "equb__name")
    readonly_fields = ("created_by", "created_at", "updated_at")
    ordering = ("-meeting_date",)
    inlines = [AttendanceInline]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ("meeting", "membership", "status", "recorded_by", "created_at")
    list_filter   = ("status",)
    readonly_fields = ("recorded_by", "created_at", "updated_at")
