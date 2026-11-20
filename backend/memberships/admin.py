from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Membership


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = (
        "user", "equb", "status", "rotation_position",
        "reviewed_by", "reviewed_at", "created_at",
    )
    list_filter = ("status", "equb")
    search_fields = (
        "user__username", "user__first_name", "user__last_name",
        "equb__name",
    )
    readonly_fields = ("created_at", "updated_at", "reviewed_at")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("user", "equb", "status")}),
        (_("Notes"), {"fields": ("request_note", "review_note")}),
        (_("Review"), {"fields": ("reviewed_by", "reviewed_at"), "classes": ("collapse",)}),
        (_("Rotation"), {"fields": ("rotation_position",)}),
        (_("Timestamps"), {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
