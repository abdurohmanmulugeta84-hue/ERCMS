from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Contribution, Payment


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ("payment_reference", "amount", "method", "status",
                       "gateway_reference", "recorded_by", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_reference", "membership", "equb",
        "period_label", "amount", "status", "submitted_by", "created_at",
    )
    list_filter = ("status", "equb", "equb__frequency")
    search_fields = (
        "transaction_reference", "period_label",
        "membership__user__username", "membership__user__first_name",
        "equb__name",
    )
    readonly_fields = (
        "transaction_reference", "equb", "submitted_by",
        "verified_by", "verified_at", "created_at", "updated_at",
    )
    ordering = ("-created_at",)
    inlines = [PaymentInline]

    fieldsets = (
        (None, {"fields": ("membership", "equb", "transaction_reference")}),
        (_("Contribution details"), {"fields": ("amount", "period_label", "notes")}),
        (_("Status"), {"fields": ("status",)}),
        (_("Submitted by"), {"fields": ("submitted_by",)}),
        (_("Verification"), {
            "fields": ("verified_by", "verified_at", "verification_note"),
            "classes": ("collapse",),
        }),
        (_("Timestamps"), {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "payment_reference", "contribution", "amount",
        "method", "status", "recorded_by", "created_at",
    )
    list_filter = ("status", "method")
    search_fields = (
        "payment_reference", "gateway_reference",
        "contribution__transaction_reference",
    )
    readonly_fields = ("payment_reference", "recorded_by", "created_at", "updated_at")
    ordering = ("-created_at",)

    def has_delete_permission(self, request, obj=None):
        # Payments should not be deleted — they are permanent audit records
        return False
