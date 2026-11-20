"""Tests for WithdrawalRequest endpoints."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from withdrawals.models import WithdrawalRequest, WithdrawalStatus

User = get_user_model()
WD_URL = "/api/withdrawals/"


def mu(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="P123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)

def setup():
    org    = mu("org_wd", Role.ORGANIZER)
    member = mu("mem_wd", Role.MEMBER)
    equb   = Equb.objects.create(name="Eq", organizer=org,
        contribution_amount="500", frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE, max_members=0)
    ms = Membership.objects.create(user=member, equb=equb, status=MembershipStatus.APPROVED)
    return org, member, equb, ms


class WithdrawalSubmitTests(APITestCase):
    def setUp(self):
        self.org, self.member, self.equb, self.ms = setup()

    def test_member_can_submit_request(self):
        self.client.force_login(self.member)
        r = self.client.post(WD_URL, {"membership": self.ms.pk, "reason": "Moving abroad."}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["status"], "pending")

    def test_duplicate_pending_rejected(self):
        self.client.force_login(self.member)
        self.client.post(WD_URL, {"membership": self.ms.pk, "reason": "First"}, format="json")
        r = self.client.post(WD_URL, {"membership": self.ms.pk, "reason": "Second"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_submit_for_another_member(self):
        other_member = mu("other_wd", Role.MEMBER)
        other_ms = Membership.objects.create(user=other_member, equb=self.equb,
            status=MembershipStatus.APPROVED)
        self.client.force_login(self.member)
        r = self.client.post(WD_URL, {"membership": other_ms.pk, "reason": "X"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class WithdrawalReviewTests(APITestCase):
    def setUp(self):
        self.org, self.member, self.equb, self.ms = setup()
        self.client.force_login(self.member)
        r = self.client.post(WD_URL, {"membership": self.ms.pk, "reason": "Leaving"}, format="json")
        self.wd_id = r.json()["id"]
        self.client.logout()

    def test_organizer_can_approve(self):
        self.client.force_login(self.org)
        r = self.client.post(f"{WD_URL}{self.wd_id}/review/", {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "approved")

    def test_organizer_can_reject(self):
        self.client.force_login(self.org)
        r = self.client.post(f"{WD_URL}{self.wd_id}/review/",
            {"action": "reject", "review_note": "Policy violation."}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "rejected")

    def test_member_cannot_review(self):
        self.client.force_login(self.member)
        r = self.client.post(f"{WD_URL}{self.wd_id}/review/", {"action": "approve"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_already_reviewed_cannot_be_reviewed_again(self):
        wr = WithdrawalRequest.objects.get(pk=self.wd_id)
        wr.status = WithdrawalStatus.APPROVED
        wr.save()
        self.client.force_login(self.org)
        r = self.client.post(f"{WD_URL}{self.wd_id}/review/", {"action": "reject"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
