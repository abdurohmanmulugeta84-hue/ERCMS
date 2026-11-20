"""Tests for Rotation Schedule and Entry endpoints."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from rotations.models import RotationSchedule, RotationScheduleStatus, RotationEntry

User = get_user_model()
SCHED_URL = "/api/rotations/"
MY_URL    = "/api/rotations/my/"


def make_user(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="Pass123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)


def make_equb(org):
    return Equb.objects.create(name="Equb A", organizer=org,
        contribution_amount="500", frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE, max_members=0)


def make_membership(user, equb):
    return Membership.objects.create(user=user, equb=equb, status=MembershipStatus.APPROVED)


def make_schedule(equb, creator, st=RotationScheduleStatus.DRAFT):
    return RotationSchedule.objects.create(
        equb=equb, title="Schedule 1", status=st, created_by=creator)


class ScheduleCreateTests(APITestCase):
    def setUp(self):
        self.org     = make_user("org_rs", Role.ORGANIZER)
        self.other   = make_user("org_rs2", Role.ORGANIZER)
        self.member  = make_user("mem_rs", Role.MEMBER)
        self.equb    = make_equb(self.org)

    def test_organizer_can_create_schedule(self):
        self.client.force_login(self.org)
        r = self.client.post(SCHED_URL, {"equb": self.equb.pk, "title": "2026 Schedule"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["status"], "draft")

    def test_member_cannot_create_schedule(self):
        self.client.force_login(self.member)
        r = self.client.post(SCHED_URL, {"equb": self.equb.pk, "title": "Attempt"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_two_active_schedules_rejected(self):
        make_schedule(self.equb, self.org, RotationScheduleStatus.ACTIVE)
        self.client.force_login(self.org)
        r = self.client.post(SCHED_URL,
            {"equb": self.equb.pk, "title": "Duplicate Active", "status": "active"},
            format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", r.json())


class EntryAssignTests(APITestCase):
    def setUp(self):
        self.org     = make_user("org_re", Role.ORGANIZER)
        self.other   = make_user("org_re2", Role.ORGANIZER)
        self.member1 = make_user("mem_re1", Role.MEMBER)
        self.member2 = make_user("mem_re2", Role.MEMBER)
        self.equb    = make_equb(self.org)
        self.m1      = make_membership(self.member1, self.equb)
        self.m2      = make_membership(self.member2, self.equb)
        self.sched   = make_schedule(self.equb, self.org, RotationScheduleStatus.ACTIVE)
        self.entries_url = f"/api/rotations/{self.sched.pk}/entries/"

    def test_organizer_can_assign_entry(self):
        self.client.force_login(self.org)
        r = self.client.post(self.entries_url,
            {"membership": self.m1.pk, "position": 1}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["position"], 1)

    def test_duplicate_position_rejected(self):
        RotationEntry.objects.create(schedule=self.sched, membership=self.m1, position=1)
        self.client.force_login(self.org)
        r = self.client.post(self.entries_url,
            {"membership": self.m2.pk, "position": 1}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_membership_rejected(self):
        RotationEntry.objects.create(schedule=self.sched, membership=self.m1, position=1)
        self.client.force_login(self.org)
        r = self.client.post(self.entries_url,
            {"membership": self.m1.pk, "position": 2}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_organizer_cannot_assign(self):
        self.client.force_login(self.other)
        r = self.client.post(self.entries_url,
            {"membership": self.m1.pk, "position": 1}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_entry(self):
        entry = RotationEntry.objects.create(schedule=self.sched, membership=self.m1, position=1)
        self.client.force_login(self.org)
        r = self.client.delete(f"/api/rotations/{self.sched.pk}/entries/{entry.pk}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_member_can_see_my_entries(self):
        RotationEntry.objects.create(schedule=self.sched, membership=self.m1, position=1)
        self.client.force_login(self.member1)
        r = self.client.get(MY_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)
