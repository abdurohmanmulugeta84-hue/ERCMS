"""Tests for Notification endpoints."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role
from notifications.models import Notification, NotificationType

User = get_user_model()
NOTIF_URL = "/api/notifications/"


def mu(un, role):
    return User.objects.create_user(username=un, email=f"{un}@t.com",
        password="P123!", first_name=un.capitalize(), last_name="U",
        role=role, is_active=True)


class NotificationTests(APITestCase):
    def setUp(self):
        self.user1 = mu("n_user1", Role.MEMBER)
        self.user2 = mu("n_user2", Role.MEMBER)
        Notification.objects.create(recipient=self.user1, title="Hello",
            message="Msg 1", notification_type=NotificationType.GENERAL)
        Notification.objects.create(recipient=self.user1, title="Hello 2",
            message="Msg 2", notification_type=NotificationType.PAYOUT_PROCESSED)
        Notification.objects.create(recipient=self.user2, title="Other",
            message="Other", notification_type=NotificationType.GENERAL)

    def test_user_sees_only_own_notifications(self):
        self.client.force_login(self.user1)
        r = self.client.get(NOTIF_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 2)

    def test_unread_filter(self):
        self.client.force_login(self.user1)
        r = self.client.get(f"{NOTIF_URL}?unread=true")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 2)

    def test_mark_single_read(self):
        notif = Notification.objects.filter(recipient=self.user1).first()
        self.client.force_login(self.user1)
        r = self.client.post(f"{NOTIF_URL}{notif.pk}/read/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.json()["is_read"])

    def test_mark_all_read(self):
        self.client.force_login(self.user1)
        r = self.client.post(f"{NOTIF_URL}read-all/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["marked_read"], 2)
        r2 = self.client.get(f"{NOTIF_URL}?unread=true")
        self.assertEqual(len(r2.json()), 0)

    def test_unread_count(self):
        self.client.force_login(self.user1)
        r = self.client.get(f"{NOTIF_URL}unread-count/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["unread_count"], 2)

    def test_cannot_mark_other_users_notification(self):
        notif = Notification.objects.filter(recipient=self.user2).first()
        self.client.force_login(self.user1)
        r = self.client.post(f"{NOTIF_URL}{notif.pk}/read/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_list(self):
        r = self.client.get(NOTIF_URL)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
