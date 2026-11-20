"""
Tests for the Membership endpoints.

Covers:
  - Request membership (member / organizer)
  - Duplicate membership prevention
  - Full Equb membership rejection
  - Organizer approval / rejection
  - Permission enforcement
  - My memberships view
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus

User = get_user_model()

LIST_URL = "/api/memberships/"
MY_URL = "/api/memberships/my/"


def make_user(username, role, active=True):
    return User.objects.create_user(
        username=username, email=f"{username}@test.com",
        password="TestPass123!", first_name=username.capitalize(),
        last_name="User", role=role, is_active=active,
    )


def make_equb(organizer, **kwargs):
    defaults = {
        "name": "Test Equb",
        "contribution_amount": "500.00",
        "frequency": EqubFrequency.MONTHLY,
        "status": EqubStatus.ACTIVE,
        "max_members": 0,
        "allow_multiple_memberships": False,
    }
    defaults.update(kwargs)
    return Equb.objects.create(organizer=organizer, **defaults)


class MembershipRequestTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org_m1", Role.ORGANIZER)
        self.member = make_user("mem_m1", Role.MEMBER)
        self.equb = make_equb(self.organizer)

    def test_member_can_request_membership(self):
        self.client.force_login(self.member)
        r = self.client.post(LIST_URL, {"equb": self.equb.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["status"], "pending")

    def test_duplicate_membership_rejected(self):
        self.client.force_login(self.member)
        self.client.post(LIST_URL, {"equb": self.equb.pk}, format="json")
        r = self.client.post(LIST_URL, {"equb": self.equb.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_full_equb_rejects_membership(self):
        equb = make_equb(self.organizer, max_members=1, name="Small Equb")
        # Fill the equb
        other = make_user("other_m", Role.MEMBER)
        Membership.objects.create(
            user=other, equb=equb, status=MembershipStatus.APPROVED
        )
        self.client.force_login(self.member)
        r = self.client.post(LIST_URL, {"equb": equb.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum", r.json().get("equb", [""])[0].lower())

    def test_cancelled_equb_rejects_membership(self):
        equb = make_equb(self.organizer, name="Dead Equb", status=EqubStatus.CANCELLED)
        self.client.force_login(self.member)
        r = self.client.post(LIST_URL, {"equb": equb.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_request(self):
        r = self.client.post(LIST_URL, {"equb": self.equb.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class MembershipReviewTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org_r1", Role.ORGANIZER)
        self.other_org = make_user("org_r2", Role.ORGANIZER)
        self.member = make_user("mem_r1", Role.MEMBER)
        self.admin = make_user("adm_r1", Role.ADMIN)
        self.equb = make_equb(self.organizer)
        self.membership = Membership.objects.create(
            user=self.member,
            equb=self.equb,
            status=MembershipStatus.PENDING,
        )
        self.review_url = f"/api/memberships/{self.membership.pk}/review/"

    def test_organizer_can_approve(self):
        self.client.force_login(self.organizer)
        r = self.client.post(self.review_url, {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "approved")
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.status, MembershipStatus.APPROVED)
        self.assertIsNotNone(self.membership.reviewed_at)

    def test_organizer_can_reject(self):
        self.client.force_login(self.organizer)
        r = self.client.post(
            self.review_url,
            {"action": "reject", "review_note": "Not eligible."},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "rejected")

    def test_admin_can_approve(self):
        self.client.force_login(self.admin)
        r = self.client.post(self.review_url, {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_other_organizer_cannot_review(self):
        self.client.force_login(self.other_org)
        r = self.client.post(self.review_url, {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_review(self):
        self.client.force_login(self.member)
        r = self.client.post(self.review_url, {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action_rejected(self):
        self.client.force_login(self.organizer)
        r = self.client.post(self.review_url, {"action": "delete"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class MembershipListPermissionTests(APITestCase):
    def setUp(self):
        self.organizer = make_user("org_l1", Role.ORGANIZER)
        self.member1 = make_user("mem_l1", Role.MEMBER)
        self.member2 = make_user("mem_l2", Role.MEMBER)
        self.equb = make_equb(self.organizer)
        Membership.objects.create(user=self.member1, equb=self.equb, status=MembershipStatus.APPROVED)
        Membership.objects.create(user=self.member2, equb=self.equb, status=MembershipStatus.PENDING)

    def test_organizer_sees_all_memberships_for_their_equb(self):
        self.client.force_login(self.organizer)
        r = self.client.get(f"{LIST_URL}?equb={self.equb.pk}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 2)

    def test_member_sees_only_own_memberships(self):
        self.client.force_login(self.member1)
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = [m["user"] for m in r.json()]
        self.assertTrue(all(i == self.member1.pk for i in ids))

    def test_my_memberships_returns_own_records(self):
        self.client.force_login(self.member1)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)
