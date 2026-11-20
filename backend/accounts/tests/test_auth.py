"""
Tests for authentication endpoints.

Covers:
  - Member self-registration (success and validation)
  - Non-member registration creates inactive account
  - Admin registration blocked on public endpoint
  - Login (success, wrong password, inactive account)
  - Logout
  - /me endpoint (authenticated and unauthenticated)
  - Role-based permission enforcement
"""
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Role

User = get_user_model()

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
USERS_URL = "/api/auth/users/"
HEALTH_URL = "/api/health/"


class HealthCheckTests(TestCase):
    """Verify the health-check endpoint is reachable without authentication."""

    def setUp(self):
        self.client = APIClient()

    def test_health_check_returns_ok(self):
        response = self.client.get(HEALTH_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "ok")


class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register(self, data):
        return self.client.post(REGISTER_URL, data, format="json")

    def test_member_registration_creates_active_account(self):
        response = self._register({
            "username": "testmember",
            "email": "member@test.com",
            "first_name": "Test",
            "last_name": "Member",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "role": "member",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="testmember")
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, Role.MEMBER)

    def test_organizer_registration_creates_inactive_account(self):
        """Organizer accounts start inactive and await Admin approval."""
        response = self._register({
            "username": "testorganizer",
            "email": "organizer@test.com",
            "first_name": "Test",
            "last_name": "Organizer",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "role": "organizer",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="testorganizer")
        self.assertFalse(user.is_active)

    def test_treasurer_registration_creates_inactive_account(self):
        response = self._register({
            "username": "testtreasurer",
            "email": "treasurer@test.com",
            "first_name": "Test",
            "last_name": "Treasurer",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "role": "treasurer",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="testtreasurer")
        self.assertFalse(user.is_active)

    def test_admin_registration_blocked_on_public_endpoint(self):
        """Admin accounts must not be creatable via public registration."""
        response = self._register({
            "username": "badactor",
            "email": "bad@test.com",
            "first_name": "Bad",
            "last_name": "Actor",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "role": "admin",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="badactor").exists())

    def test_mismatched_passwords_rejected(self):
        response = self._register({
            "username": "user1",
            "email": "user1@test.com",
            "first_name": "User",
            "last_name": "One",
            "password": "SecurePass123!",
            "password_confirm": "DifferentPass!",
            "role": "member",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            username="existing", email="taken@test.com",
            password="pass", first_name="A", last_name="B"
        )
        response = self._register({
            "username": "newuser",
            "email": "taken@test.com",
            "first_name": "New",
            "last_name": "User",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "role": "member",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="loginuser",
            email="login@test.com",
            password="TestPass123!",
            first_name="Login",
            last_name="User",
            role=Role.MEMBER,
            is_active=True,
        )

    def test_login_with_valid_credentials(self):
        response = self.client.post(LOGIN_URL, {
            "username": "loginuser",
            "password": "TestPass123!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["username"], "loginuser")
        self.assertEqual(response.json()["role"], "member")

    def test_login_with_wrong_password(self):
        response = self.client.post(LOGIN_URL, {
            "username": "loginuser",
            "password": "WrongPassword!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_nonexistent_user(self):
        response = self.client.post(LOGIN_URL, {
            "username": "nobody",
            "password": "TestPass123!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(LOGIN_URL, {
            "username": "loginuser",
            "password": "TestPass123!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_without_credentials(self):
        response = self.client.post(LOGIN_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="logoutuser",
            email="logout@test.com",
            password="TestPass123!",
            first_name="Logout",
            last_name="User",
            is_active=True,
        )

    def test_logout_authenticated_user(self):
        self.client.force_login(self.user)
        response = self.client.post(LOGOUT_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_unauthenticated_returns_401(self):
        response = self.client.post(LOGOUT_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="meuser",
            email="me@test.com",
            password="TestPass123!",
            first_name="Me",
            last_name="User",
            role=Role.MEMBER,
            is_active=True,
        )

    def test_me_returns_profile_when_authenticated(self):
        self.client.force_login(self.user)
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["username"], "meuser")
        self.assertEqual(data["role"], "member")
        self.assertIn("role_display", data)
        self.assertNotIn("password", data)

    def test_me_returns_403_when_unauthenticated(self):
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_patch_updates_allowed_fields(self):
        self.client.force_login(self.user)
        response = self.client.patch(ME_URL, {"first_name": "Updated", "phone": "0912345678"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")
        self.assertEqual(self.user.phone, "0912345678")

    def test_me_patch_cannot_change_role(self):
        """Role must not be modifiable via the profile endpoint."""
        self.client.force_login(self.user)
        self.client.patch(ME_URL, {"role": "admin"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, Role.MEMBER)


class RolePermissionTests(TestCase):
    """Verify that the user list endpoint is restricted to Administrators."""

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="adminuser",
            email="admin@test.com",
            password="AdminPass123!",
            first_name="Admin",
            last_name="User",
            role=Role.ADMIN,
            is_active=True,
        )
        self.member_user = User.objects.create_user(
            username="memberuser2",
            email="member2@test.com",
            password="MemberPass123!",
            first_name="Member",
            last_name="User",
            role=Role.MEMBER,
            is_active=True,
        )

    def test_admin_can_access_user_list(self):
        self.client.force_login(self.admin_user)
        response = self.client.get(USERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_cannot_access_user_list(self):
        self.client.force_login(self.member_user)
        response = self.client.get(USERS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_user_list(self):
        response = self.client.get(USERS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_activate_inactive_user(self):
        self.member_user.is_active = False
        self.member_user.save()
        self.client.force_login(self.admin_user)
        response = self.client.patch(
            f"{USERS_URL}{self.member_user.pk}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member_user.refresh_from_db()
        self.assertTrue(self.member_user.is_active)
