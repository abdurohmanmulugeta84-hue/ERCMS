from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "full_name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "phone")
    ordering = ("last_name", "first_name")

    fieldsets = UserAdmin.fieldsets + (
        (_("Equb System Fields"), {"fields": ("role", "phone")}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (_("Equb System Fields"), {"fields": ("email", "first_name", "last_name", "role", "phone")}),
    )
