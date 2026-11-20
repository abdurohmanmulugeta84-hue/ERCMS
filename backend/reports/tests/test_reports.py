"""Tests for Report endpoints."""
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from contributions.models import Contribution, ContributionStatus
from payouts.models import Payout, PayoutStatus
from rotations.models import RotationSchedule, RotationScheduleStatus, RotationEntry

User = get_user_model()


def mu(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="P123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)


def setup_equb_with_data():
    org    = mu("org_rep", Role.ORGANIZER)
    tre    = mu("tre_rep", Role.TREASURER)
    admin  = mu("adm_rep", Role.ADMIN)
    auditor= mu("aud_rep", Role.AUDITOR)
    member = mu("mem_rep", Role.MEMBER)
    equb   = Equb.objects.create(name="Report Equb", organizer=org,
        contribution_amount=Decimal("1000"), frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE, max_members=0)
    ms = Membership.objects.create(user=member, equb=equb, status=MembershipStatus.APPROVED)
    sched = RotationSchedule.objects.create(equb=equb, title="S1",
        status=RotationScheduleStatus.ACTIVE, created_by=org)
    entry = RotationEntry.objects.create(schedule=sched, membership=ms, position=1)
    c = Contribution.objects.create(membership=ms, equb=equb,
        amount=Decimal("1000"), period_label="2026-10",
        submitted_by=member, status=ContributionStatus.VERIFIED,
        verified_by=tre)
    p = Payout.objects.create(rotation_entry=entry, equb=equb,
        recipient=member, amount=Decimal("10000"),
        status=PayoutStatus.PROCESSED, processed_by=tre)
    return org, tre, admin, auditor, member, equb, ms


class FinancialSummaryTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.admin, self.auditor, self.member, self.equb, self.ms = setup_equb_with_data()
        self.url = f"/api/reports/financial-summary/?equb={self.equb.pk}"

    def test_treasurer_can_access(self):
        self.client.force_login(self.tre)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertEqual(data["equb"]["name"], "Report Equb")
        self.assertEqual(data["members"]["approved"], 1)
        self.assertEqual(data["contributions"]["verified_count"], 1)
        self.assertEqual(data["payouts"]["processed_count"], 1)

    def test_auditor_can_access(self):
        self.client.force_login(self.auditor)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_missing_equb_param(self):
        self.client.force_login(self.tre)
        r = self.client.get("/api/reports/financial-summary/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class ContributionReportTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.admin, self.auditor, self.member, self.equb, self.ms = setup_equb_with_data()
        self.url = f"/api/reports/contributions/?equb={self.equb.pk}"

    def test_returns_per_member_breakdown(self):
        self.client.force_login(self.tre)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)
        self.assertEqual(r.json()[0]["member_name"], "Mem_rep U")
        self.assertEqual(r.json()[0]["verified_count"], 1)


class SystemOverviewTests(APITestCase):
    def setUp(self):
        self.org, self.tre, self.admin, self.auditor, self.member, self.equb, self.ms = setup_equb_with_data()

    def test_admin_can_access(self):
        self.client.force_login(self.admin)
        r = self.client.get("/api/reports/system-overview/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = r.json()
        self.assertIn("users", data)
        self.assertIn("equbs", data)
        self.assertIn("contributions", data)

    def test_member_cannot_access(self):
        self.client.force_login(self.member)
        r = self.client.get("/api/reports/system-overview/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_auditor_cannot_access(self):
        self.client.force_login(self.auditor)
        r = self.client.get("/api/reports/system-overview/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
