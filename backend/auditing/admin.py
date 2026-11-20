from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "actor", "action", "model_name", "object_id")
    list_filter = ("action", "model_name")
    search_fields = ("actor__username", "action", "model_name", "object_id")
    readonly_fields = ("actor", "action", "model_name", "object_id", "timestamp", "detail")
    ordering = ("-timestamp",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
