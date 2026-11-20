from django.contrib import admin
from .models import WithdrawalRequest


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display  = ("membership", "status", "reviewed_by", "reviewed_at", "created_at")
    list_filter   = ("status",)
    search_fields = ("membership__user__username", "membership__equb__name")
    readonly_fields = ("reviewed_by", "reviewed_at", "created_at", "updated_at")
    ordering = ("-created_at",)
