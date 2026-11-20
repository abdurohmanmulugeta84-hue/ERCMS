from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Payout


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display  = (
        "payout_reference", "equb", "recipient",
        "amount", "status", "method", "processed_by", "processed_at",
    )
    list_filter   = ("status", "method", "equb")
    search_fields = (
        "payout_reference", "gateway_reference",
        "recipient__username", "recipient__first_name",
    )
    readonly_fields = (
        "payout_reference", "rotation_entry",
        "equb", "recipient", "processed_by", "processed_at",
        "created_at", "updated_at",
    )
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("payout_reference", "rotation_entry", "equb", "recipient")}),
        (_("Payment details"), {"fields": ("amount", "method", "gateway_reference")}),
        (_("Status"), {"fields": ("status",)}),
        (_("Processed by"), {"fields": ("processed_by", "processed_at")}),
        (_("Notes"), {"fields": ("notes",)}),
        (_("Timestamps"), {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return False
