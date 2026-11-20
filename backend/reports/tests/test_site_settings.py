"""Tests for SiteSetting endpoints."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from reports.models import SiteSetting

User = get_user_model()
SETTINGS_URL = "/api/reports/site-settings/"


def mu(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="P123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)


class SiteSettingReadTests(APITestCase):
    def test_public_can_read_settings(self):
        r = self.client.get(SETTINGS_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["site_name"], "ERCMS")
        self.assertIn("hero_title", r.json())
        self.assertIn("primary_color", r.json())

    def test_unauthenticated_can_read(self):
        r = self.client.get(SETTINGS_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class SiteSettingUpdateTests(APITestCase):
    def setUp(self):
        self.admin  = mu("adm_ss", Role.ADMIN)
        self.member = mu("mem_ss", Role.MEMBER)

    def test_admin_can_update_settings(self):
        self.client.force_login(self.admin)
        r = self.client.patch(SETTINGS_URL, {
            "site_name": "My Equb System",
            "logo_emoji": "🏦",
            "primary_color": "#ff0000",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["site_name"], "My Equb System")
        self.assertEqual(r.json()["logo_emoji"], "🏦")
        self.assertEqual(r.json()["primary_color"], "#ff0000")

    def test_member_cannot_update(self):
        self.client.force_login(self.member)
        r = self.client.patch(SETTINGS_URL, {"site_name": "Hacked"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_update(self):
        r = self.client.patch(SETTINGS_URL, {"site_name": "Hacked"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_singleton_pattern(self):
        """Editing should update the same row, not create a new one."""
        self.client.force_login(self.admin)
        self.client.patch(SETTINGS_URL, {"site_name": "First"}, format="json")
        self.client.patch(SETTINGS_URL, {"site_name": "Second"}, format="json")
        self.assertEqual(SiteSetting.objects.count(), 1)
        self.assertEqual(SiteSetting.get_solo().site_name, "Second")
