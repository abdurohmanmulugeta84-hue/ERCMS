"""Tests for Payout endpoints."""
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from rotations.models import RotationSchedule, RotationScheduleStatus, RotationEntry, RotationEntryStatus
from payouts.models import Payout, PayoutStatus

User = get_user_model()
PAYOUT_URL = "/api/payouts/"
MY_URL     = "/api/payouts/my/"


def make_user(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="Pass123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)


def make_equb(org):
    return Equb.objects.create(name="Equb P", organizer=org,
        contribution_amount="1000", frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE, max_members=0)


def make_setup():
    org     = make_user("org_pay", Role.ORGANIZER)
    tre     = make_user("tre_pay", Role.TREASURER)
    member  = make_user("mem_pay", Role.MEMBER)
    equb    = make_equb(org)
    memship = Membership.objects.create(user=member, equb=equb, status=MembershipStatus.APPROVED)
    sched   = RotationSchedule.objects.create(
        equb=equb, title="Pay Sched", status=RotationScheduleStatus.ACTIVE, created_by=org)
    entry   = RotationEntry.objects.create(schedule=sched, membership=memship, position=1)
    return org, tre, member, equb, memship, sched, entry


class PayoutProcessTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.member, self.equb, self.memship, self.sched, self.entry = make_setup()

    def test_treasurer_can_process_payout(self):
        self.client.force_login(self.tre)
        r = self.client.post(PAYOUT_URL, {
            "rotation_entry": self.entry.pk,
            "amount": "5000.00",
            "method": "cash",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        data = r.json()
        self.assertEqual(data["status"], "processed")
        self.assertTrue(data["payout_reference"].startswith("PAYOUT-"))
        # Entry should be marked completed
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.status, RotationEntryStatus.COMPLETED)

    def test_member_cannot_process_payout(self):
        self.client.force_login(self.member)
        r = self.client.post(PAYOUT_URL, {
            "rotation_entry": self.entry.pk,
            "amount": "5000.00",
            "method": "cash",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_double_payout_rejected(self):
        """Processing the same entry twice must be rejected."""
        self.client.force_login(self.tre)
        self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "5000", "method": "cash"},
            format="json")
        r = self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "5000", "method": "cash"},
            format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_skipped_entry_payout_rejected(self):
        self.entry.status = RotationEntryStatus.SKIPPED
        self.entry.save()
        self.client.force_login(self.tre)
        r = self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "5000", "method": "cash"},
            format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_schedule_payout_rejected(self):
        self.sched.status = RotationScheduleStatus.DRAFT
        self.sched.save()
        self.client.force_login(self.tre)
        r = self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "5000", "method": "cash"},
            format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zero_amount_rejected(self):
        self.client.force_login(self.tre)
        r = self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "0", "method": "cash"},
            format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class PayoutViewPermissionTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.member, self.equb, self.memship, self.sched, self.entry = make_setup()
        # Create a processed payout
        self.client.force_login(self.tre)
        r = self.client.post(PAYOUT_URL,
            {"rotation_entry": self.entry.pk, "amount": "5000", "method": "cash"},
            format="json")
        self.payout_id = r.json()["id"]
        self.client.logout()

    def test_member_can_see_own_payout(self):
        self.client.force_login(self.member)
        r = self.client.get(f"{PAYOUT_URL}{self.payout_id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_member_can_see_my_payouts(self):
        self.client.force_login(self.member)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)

    def test_treasurer_can_list_all_payouts(self):
        self.client.force_login(self.tre)
        r = self.client.get(PAYOUT_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(r.json()), 1)


class PayoutCancelTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.member, self.equb, self.memship, self.sched, self.entry = make_setup()
        self.payout = Payout.objects.create(
            rotation_entry=self.entry,
            equb=self.equb,
            recipient=self.member,
            amount=Decimal("5000"),
            status=PayoutStatus.SCHEDULED,
            processed_by=self.tre,
        )

    def test_treasurer_can_cancel_scheduled_payout(self):
        self.client.force_login(self.tre)
        r = self.client.post(f"{PAYOUT_URL}{self.payout.pk}/cancel/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "cancelled")

    def test_cannot_cancel_processed_payout(self):
        self.payout.status = PayoutStatus.PROCESSED
        self.payout.save()
        self.client.force_login(self.tre)
        r = self.client.post(f"{PAYOUT_URL}{self.payout.pk}/cancel/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_cancel_payout(self):
        self.client.force_login(self.member)
        r = self.client.post(f"{PAYOUT_URL}{self.payout.pk}/cancel/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
