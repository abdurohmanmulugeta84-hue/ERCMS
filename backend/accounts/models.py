"""
Custom user model for the Equb Rotation & Contribution Management System.

Extends Django's AbstractUser to add a role field and contact information.
All authentication is delegated to Django's built-in facilities.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    ADMIN = "admin", _("System Administrator")
    ORGANIZER = "organizer", _("Equb Organizer")
    TREASURER = "treasurer", _("Treasurer")
    MEMBER = "member", _("Equb Member")
    AUDITOR = "auditor", _("Auditor")


class CustomUser(AbstractUser):
    """
    Primary user model.

    Registration rules (enforced in the serializer/view):
      - Members may self-register; their account is active immediately.
      - Organizer, Treasurer, and Auditor accounts require Administrator
        approval before is_active is set to True.
      - Administrator accounts are created only by a superuser or another
        Administrator via the admin interface or the dedicated endpoint.
    """

    # Override email to make it required and unique
    email = models.EmailField(_("email address"), unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
        db_index=True,
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text=_("Optional contact phone number."),
    )

    # Staff roles start inactive until an Administrator approves them.
    # Members start active.
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_(
            "Designates whether this user should be treated as active. "
            "Unselect this instead of deleting accounts."
        ),
    )

    # Require email for login in addition to username
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email}) — {self.get_role_display()}"

    @property
    def full_name(self):
        return self.get_full_name()

    # ------------------------------------------------------------------
    # Role helper properties — use these in permission checks so that
    # the string literals "admin", "organizer" etc. are not scattered
    # throughout the codebase.
    # ------------------------------------------------------------------

    @property
    def is_admin(self):
        return self.role == Role.ADMIN

    @property
    def is_organizer(self):
        return self.role == Role.ORGANIZER

    @property
    def is_treasurer(self):
        return self.role == Role.TREASURER

    @property
    def is_member(self):
        return self.role == Role.MEMBER

    @property
    def is_auditor(self):
        return self.role == Role.AUDITOR

    # Staff roles that require Administrator approval before activation
    ROLES_REQUIRING_APPROVAL = {Role.ORGANIZER, Role.TREASURER, Role.AUDITOR}
