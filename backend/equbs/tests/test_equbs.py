"""
Tests for the Equb endpoints.

Covers:
  - List Equbs (any authenticated user)
  - Create Equb (Organizer / Admin only)
  - Retrieve Equb detail
  - Update Equb (owner only)
  - Change status
  - My Equbs view
  - Permission enforcement
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from equbs.models import Equb, EqubStatus, EqubFrequency

User = get_user_model()

LIST_URL = "/api/equbs/"
MY_URL = "/api/equbs/my/"

VALID_EQUB = {
    "name": "Test Equb",
    "description": "A test savings group",
    "contribution_amount": "500.00",
    "frequency": EqubFrequency.MONTHLY,
    "max_members": 10,
    "allow_multiple_memberships": False,
}


def make_user(username, role, active=True):
    return User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
        first_name=username.capitalize(),
        last_name="User",
        role=role,
        is_active=active,
    )


class EqubListCreateTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org1", Role.ORGANIZER)
        self.member = make_user("mem1", Role.MEMBER)
        self.admin = make_user("adm1", Role.ADMIN)

    def test_unauthenticated_cannot_list(self):
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_list_equbs(self):
        Equb.objects.create(organizer=self.organizer, **VALID_EQUB)
        self.client.force_login(self.member)
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)

    def test_organizer_can_create_equb(self):
        self.client.force_login(self.organizer)
        r = self.client.post(LIST_URL, VALID_EQUB, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["name"], "Test Equb")
        self.assertEqual(r.json()["organizer"], self.organizer.pk)

    def test_admin_can_create_equb(self):
        self.client.force_login(self.admin)
        r = self.client.post(LIST_URL, VALID_EQUB, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_create_equb(self):
        self.client.force_login(self.member)
        r = self.client.post(LIST_URL, VALID_EQUB, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_equb_negative_amount_rejected(self):
        self.client.force_login(self.organizer)
        data = {**VALID_EQUB, "contribution_amount": "-100.00"}
        r = self.client.post(LIST_URL, data, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contribution_amount", r.json())

    def test_create_equb_invalid_date_range_rejected(self):
        self.client.force_login(self.organizer)
        data = {**VALID_EQUB, "start_date": "2026-12-01", "expected_end_date": "2026-01-01"}
        r = self.client.post(LIST_URL, data, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class EqubDetailUpdateTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org2", Role.ORGANIZER)
        self.other_organizer = make_user("org3", Role.ORGANIZER)
        self.member = make_user("mem2", Role.MEMBER)
        self.admin = make_user("adm2", Role.ADMIN)
        self.equb = Equb.objects.create(organizer=self.organizer, **VALID_EQUB)
        self.detail_url = f"/api/equbs/{self.equb.pk}/"
        self.status_url = f"/api/equbs/{self.equb.pk}/status/"

    def test_any_authenticated_user_can_retrieve(self):
        self.client.force_login(self.member)
        r = self.client.get(self.detail_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["id"], self.equb.pk)

    def test_owner_organizer_can_update(self):
        self.client.force_login(self.organizer)
        r = self.client.patch(self.detail_url, {"name": "Updated Name"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["name"], "Updated Name")

    def test_other_organizer_cannot_update(self):
        self.client.force_login(self.other_organizer)
        r = self.client.patch(self.detail_url, {"name": "Hacked"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_update(self):
        self.client.force_login(self.member)
        r = self.client.patch(self.detail_url, {"name": "Hacked"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_any_equb(self):
        self.client.force_login(self.admin)
        r = self.client.patch(self.detail_url, {"description": "Admin update"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_change_status_to_active(self):
        self.client.force_login(self.organizer)
        r = self.client.patch(self.status_url, {"status": "active"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "active")

    def test_cannot_change_status_of_completed_equb(self):
        self.equb.status = EqubStatus.COMPLETED
        self.equb.save()
        self.client.force_login(self.organizer)
        r = self.client.patch(self.status_url, {"status": "active"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_nonexistent_equb_returns_404(self):
        self.client.force_login(self.member)
        r = self.client.get("/api/equbs/99999/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


class MyEqubsViewTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org4", Role.ORGANIZER)
        self.other_organizer = make_user("org5", Role.ORGANIZER)
        self.equb = Equb.objects.create(organizer=self.organizer, **VALID_EQUB)

    def test_organizer_sees_only_own_equbs(self):
        self.client.force_login(self.organizer)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)

    def test_other_organizer_sees_empty_list(self):
        self.client.force_login(self.other_organizer)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 0)

    def test_member_cannot_access_my_equbs_view(self):
        member = make_user("mem_my", Role.MEMBER)
        self.client.force_login(member)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
