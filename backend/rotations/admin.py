from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import RotationSchedule, RotationEntry


class RotationEntryInline(admin.TabularInline):
    model = RotationEntry
    extra = 0
    fields = ("position", "membership", "status", "expected_payout_date", "notes")
    ordering = ("position",)


@admin.register(RotationSchedule)
class RotationScheduleAdmin(admin.ModelAdmin):
    list_display  = ("title", "equb", "status", "created_by", "created_at")
    list_filter   = ("status", "equb")
    search_fields = ("title", "equb__name", "created_by__username")
    readonly_fields = ("created_by", "created_at", "updated_at")
    ordering      = ("-created_at",)
    inlines       = [RotationEntryInline]

    fieldsets = (
        (None,                {"fields": ("equb", "title", "status")}),
        (_("Notes"),          {"fields": ("notes",)}),
        (_("Created by"),     {"fields": ("created_by",)}),
        (_("Timestamps"),     {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(RotationEntry)
class RotationEntryAdmin(admin.ModelAdmin):
    list_display  = ("schedule", "position", "membership", "status", "expected_payout_date")
    list_filter   = ("status", "schedule__equb")
    search_fields = ("membership__user__username", "schedule__title")
    readonly_fields = ("created_at", "updated_at")
    ordering      = ("schedule", "position")
