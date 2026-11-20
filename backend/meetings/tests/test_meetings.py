"""Tests for Meeting and Attendance endpoints."""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from meetings.models import Meeting, MeetingStatus

User = get_user_model()
MEET_URL = "/api/meetings/"


def mu(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="P123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)

def make_equb(org):
    return Equb.objects.create(name="Eq", organizer=org,
        contribution_amount="500", frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE, max_members=0)

def make_membership(user, equb):
    return Membership.objects.create(user=user, equb=equb, status=MembershipStatus.APPROVED)

def make_meeting(equb, creator):
    return Meeting.objects.create(equb=equb, title="Test Meeting",
        meeting_date=timezone.now(), created_by=creator)


class MeetingCRUDTests(APITestCase):
    def setUp(self):
        self.org    = mu("org_mt", Role.ORGANIZER)
        self.org2   = mu("org_mt2", Role.ORGANIZER)
        self.member = mu("mem_mt", Role.MEMBER)
        self.equb   = make_equb(self.org)
        self.m      = make_membership(self.member, self.equb)

    def test_organizer_can_create_meeting(self):
        self.client.force_login(self.org)
        r = self.client.post(MEET_URL, {
            "equb": self.equb.pk, "title": "Q4 Meeting",
            "meeting_date": "2026-12-01T10:00:00",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["status"], "upcoming")

    def test_member_cannot_create_meeting(self):
        self.client.force_login(self.member)
        r = self.client.post(MEET_URL, {"equb": self.equb.pk, "title": "X",
            "meeting_date": "2026-12-01T10:00:00"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_list_meetings_for_their_equb(self):
        make_meeting(self.equb, self.org)
        self.client.force_login(self.member)
        r = self.client.get(MEET_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)

    def test_other_organizer_cannot_update_meeting(self):
        meet = make_meeting(self.equb, self.org)
        self.client.force_login(self.org2)
        r = self.client.patch(f"{MEET_URL}{meet.pk}/", {"title": "Hacked"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class AttendanceTests(APITestCase):
    def setUp(self):
        self.org    = mu("org_at", Role.ORGANIZER)
        self.member = mu("mem_at", Role.MEMBER)
        self.equb   = make_equb(self.org)
        self.ms     = make_membership(self.member, self.equb)
        self.meet   = make_meeting(self.equb, self.org)
        self.att_url = f"{MEET_URL}{self.meet.pk}/attendance/"

    def test_organizer_can_record_attendance(self):
        self.client.force_login(self.org)
        r = self.client.post(self.att_url,
            {"membership": self.ms.pk, "status": "present"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.json()["status"], "present")

    def test_duplicate_attendance_rejected(self):
        self.client.force_login(self.org)
        self.client.post(self.att_url, {"membership": self.ms.pk, "status": "present"}, format="json")
        r = self.client.post(self.att_url, {"membership": self.ms.pk, "status": "absent"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_record_attendance(self):
        self.client.force_login(self.member)
        r = self.client.post(self.att_url, {"membership": self.ms.pk, "status": "present"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
