"""
Custom DRF permission classes for role-based access control.

Usage in a view:
    permission_classes = [IsAuthenticated, IsAdministrator]

These classes check the authenticated user's role field. They are the
server-side gate — frontend route guards are for UX only.
"""
from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    """Allow access only to users with the 'admin' role."""

    message = "Access restricted to System Administrators."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsOrganizer(BasePermission):
    """Allow access only to users with the 'organizer' role."""

    message = "Access restricted to Equb Organizers."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_organizer)


class IsTreasurer(BasePermission):
    """Allow access only to users with the 'treasurer' role."""

    message = "Access restricted to Treasurers."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_treasurer)


class IsMember(BasePermission):
    """Allow access only to users with the 'member' role."""

    message = "Access restricted to Equb Members."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_member)


class IsAuditor(BasePermission):
    """Allow access only to users with the 'auditor' role."""

    message = "Access restricted to Auditors."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_auditor)


class IsAdminOrOrganizer(BasePermission):
    """Allow access to Administrators and Organizers."""

    message = "Access restricted to Administrators and Organizers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin or request.user.is_organizer)
        )


class IsAdminOrTreasurer(BasePermission):
    """Allow access to Administrators and Treasurers."""

    message = "Access restricted to Administrators and Treasurers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin or request.user.is_treasurer)
        )


class IsStaffRole(BasePermission):
    """Allow access to any non-member role (admin, organizer, treasurer, auditor)."""

    message = "Access restricted to staff roles."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and not request.user.is_member
        )
