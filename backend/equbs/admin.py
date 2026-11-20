from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Equb


@admin.register(Equb)
class EqubAdmin(admin.ModelAdmin):
    list_display = (
        "name", "organizer", "status", "frequency",
        "contribution_amount", "member_count", "created_at",
    )
    list_filter = ("status", "frequency")
    search_fields = ("name", "organizer__username", "organizer__first_name", "organizer__last_name")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("name", "description", "organizer")}),
        (_("Configuration"), {
            "fields": (
                "contribution_amount", "frequency",
                "max_members", "allow_multiple_memberships",
            )
        }),
        (_("Lifecycle"), {"fields": ("status", "start_date", "expected_end_date")}),
        (_("Timestamps"), {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def member_count(self, obj):
        return obj.memberships.filter(status="approved").count()
    member_count.short_description = "Members"
