"""
Tests for Contribution and Payment endpoints.

Covers:
  - Member submitting a contribution
  - Duplicate period prevention
  - Wrong amount rejection
  - Non-member / inactive member rejection
  - Treasurer verifying and rejecting contributions
  - Permission enforcement on verify
  - Payment recording (Treasurer only)
  - Member can view own contributions/payments
  - Outstanding contributions view
"""
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from equbs.models import Equb, EqubFrequency, EqubStatus
from memberships.models import Membership, MembershipStatus
from contributions.models import Contribution, ContributionStatus, Payment, PaymentMethod

User = get_user_model()

CONTRIB_URL   = "/api/contributions/"
PAYMENTS_URL  = "/api/contributions/payments/"
OUTSTANDING_URL = "/api/contributions/outstanding/"


def make_user(username, role, active=True):
    return User.objects.create_user(
        username=username, email=f"{username}@test.com",
        password="Pass123!", first_name=username.capitalize(),
        last_name="User", role=role, is_active=active,
    )


def make_equb(organizer, amount="1000.00"):
    return Equb.objects.create(
        name="Test Equb", organizer=organizer,
        contribution_amount=Decimal(amount),
        frequency=EqubFrequency.MONTHLY,
        status=EqubStatus.ACTIVE,
        max_members=0,
    )


def make_membership(user, equb, approved=True):
    ms = MembershipStatus.APPROVED if approved else MembershipStatus.PENDING
    return Membership.objects.create(user=user, equb=equb, status=ms)


class ContributionSubmitTests(APITestCase):
    def setUp(self):
        self.organizer  = make_user("org_c", Role.ORGANIZER)
        self.treasurer  = make_user("tre_c", Role.TREASURER)
        self.member     = make_user("mem_c", Role.MEMBER)
        self.member2    = make_user("mem_c2", Role.MEMBER)
        self.equb       = make_equb(self.organizer)
        self.membership = make_membership(self.member, self.equb)

    def _submit(self, user, data):
        self.client.force_login(user)
        return self.client.post(CONTRIB_URL, data, format="json")

    def test_member_can_submit_contribution(self):
        r = self._submit(self.member, {
            "membership": self.membership.pk,
            "amount": "1000.00",
            "period_label": "2026-10",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        data = r.json()
        self.assertEqual(data["status"], "submitted")
        self.assertIn("transaction_reference", data)
        self.assertTrue(data["transaction_reference"].startswith("CONTRIB-"))

    def test_duplicate_period_rejected(self):
        self._submit(self.member, {"membership": self.membership.pk, "amount": "1000.00", "period_label": "2026-10"})
        r = self._submit(self.member, {"membership": self.membership.pk, "amount": "1000.00", "period_label": "2026-10"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        # Error may come from serializer validate() as 'period_label' or from
        # DB unique constraint as 'non_field_errors' — both are acceptable rejections
        err = r.json()
        self.assertTrue(
            "period_label" in err or "non_field_errors" in err,
            f"Expected a duplicate-period error, got: {err}"
        )

    def test_wrong_amount_rejected(self):
        r = self._submit(self.member, {
            "membership": self.membership.pk,
            "amount": "500.00",   # equb requires 1000
            "period_label": "2026-10",
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", r.json())

    def test_pending_membership_rejected(self):
        pending_membership = make_membership(self.member2, self.equb, approved=False)
        r = self._submit(self.member2, {
            "membership": pending_membership.pk,
            "amount": "1000.00",
            "period_label": "2026-11",
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_submit_for_another_member(self):
        r = self._submit(self.member, {
            "membership": make_membership(self.member2, self.equb).pk,
            "amount": "1000.00",
            "period_label": "2026-10",
        })
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_treasurer_can_submit_on_behalf(self):
        """Treasurer can submit a contribution for any member."""
        r = self._submit(self.treasurer, {
            "membership": self.membership.pk,
            "amount": "1000.00",
            "period_label": "2026-12",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_rejected(self):
        r = self.client.post(CONTRIB_URL, {
            "membership": self.membership.pk,
            "amount": "1000.00",
            "period_label": "2026-10",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class ContributionVerifyTests(APITestCase):
    def setUp(self):
        self.organizer  = make_user("org_v", Role.ORGANIZER)
        self.treasurer  = make_user("tre_v", Role.TREASURER)
        self.member     = make_user("mem_v", Role.MEMBER)
        self.equb       = make_equb(self.organizer)
        self.membership = make_membership(self.member, self.equb)
        self.contribution = Contribution.objects.create(
            membership=self.membership,
            equb=self.equb,
            amount=Decimal("1000.00"),
            period_label="2026-10",
            submitted_by=self.member,
            status=ContributionStatus.SUBMITTED,
        )
        self.verify_url = f"{CONTRIB_URL}{self.contribution.pk}/verify/"

    def test_treasurer_can_verify(self):
        self.client.force_login(self.treasurer)
        r = self.client.post(self.verify_url, {"action": "verify"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "verified")
        self.contribution.refresh_from_db()
        self.assertIsNotNone(self.contribution.verified_at)
        self.assertEqual(self.contribution.verified_by_id, self.treasurer.pk)

    def test_treasurer_can_reject(self):
        self.client.force_login(self.treasurer)
        r = self.client.post(
            self.verify_url,
            {"action": "reject", "verification_note": "No receipt provided."},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.json()["status"], "rejected")

    def test_member_cannot_verify(self):
        self.client.force_login(self.member)
        r = self.client.post(self.verify_url, {"action": "verify"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizer_cannot_verify(self):
        self.client.force_login(self.organizer)
        r = self.client.post(self.verify_url, {"action": "verify"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_already_verified_cannot_be_reverified(self):
        self.contribution.status = ContributionStatus.VERIFIED
        self.contribution.save()
        self.client.force_login(self.treasurer)
        r = self.client.post(self.verify_url, {"action": "verify"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_action_rejected(self):
        self.client.force_login(self.treasurer)
        r = self.client.post(self.verify_url, {"action": "delete"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class ContributionListTests(APITestCase):
    def setUp(self):
        self.organizer  = make_user("org_l", Role.ORGANIZER)
        self.treasurer  = make_user("tre_l", Role.TREASURER)
        self.member1    = make_user("mem_l1", Role.MEMBER)
        self.member2    = make_user("mem_l2", Role.MEMBER)
        self.equb       = make_equb(self.organizer)
        m1 = make_membership(self.member1, self.equb)
        m2 = make_membership(self.member2, self.equb)
        Contribution.objects.create(membership=m1, equb=self.equb, amount=Decimal("1000"),
            period_label="2026-10", submitted_by=self.member1)
        Contribution.objects.create(membership=m2, equb=self.equb, amount=Decimal("1000"),
            period_label="2026-10", submitted_by=self.member2)

    def test_treasurer_sees_all_contributions(self):
        self.client.force_login(self.treasurer)
        r = self.client.get(CONTRIB_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 2)

    def test_member_sees_only_own_contributions(self):
        self.client.force_login(self.member1)
        r = self.client.get(CONTRIB_URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 1)
        self.assertEqual(r.json()[0]["member_email"], self.member1.email)

    def test_filter_by_equb(self):
        self.client.force_login(self.treasurer)
        r = self.client.get(f"{CONTRIB_URL}?equb={self.equb.pk}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.json()), 2)


class PaymentTests(APITestCase):
    def setUp(self):
        self.organizer  = make_user("org_p", Role.ORGANIZER)
        self.treasurer  = make_user("tre_p", Role.TREASURER)
        self.member     = make_user("mem_p", Role.MEMBER)
        self.equb       = make_equb(self.organizer)
        self.membership = make_membership(self.member, self.equb)
        self.contribution = Contribution.objects.create(
            membership=self.membership, equb=self.equb,
            amount=Decimal("1000.00"), period_label="2026-10",
            submitted_by=self.member,
        )

    def test_treasurer_can_record_payment(self):
        self.client.force_login(self.treasurer)
        r = self.client.post(PAYMENTS_URL, {
            "contribution": self.contribution.pk,
            "amount": "1000.00",
            "method": "cash",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        data = r.json()
        self.assertEqual(data["status"], "completed")
        self.assertTrue(data["payment_reference"].startswith("PAY-"))

    def test_member_cannot_record_payment(self):
        self.client.force_login(self.member)
        r = self.client.post(PAYMENTS_URL, {
            "contribution": self.contribution.pk,
            "amount": "1000.00",
            "method": "cash",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_payment_on_verified_contribution_rejected(self):
        self.contribution.status = ContributionStatus.VERIFIED
        self.contribution.save()
        self.client.force_login(self.treasurer)
        r = self.client.post(PAYMENTS_URL, {
            "contribution": self.contribution.pk,
            "amount": "1000.00",
            "method": "cash",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_view_own_payment(self):
        payment = Payment.objects.create(
            contribution=self.contribution, amount=Decimal("1000"),
            method=PaymentMethod.CASH, recorded_by=self.treasurer,
        )
        self.client.force_login(self.member)
        r = self.client.get(f"{PAYMENTS_URL}{payment.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_member_cannot_view_another_members_payment(self):
        other_member = make_user("other_pay", Role.MEMBER)
        other_m = make_membership(other_member, self.equb)
        other_c = Contribution.objects.create(
            membership=other_m, equb=self.equb,
            amount=Decimal("1000"), period_label="2026-11",
            submitted_by=other_member,
        )
        payment = Payment.objects.create(
            contribution=other_c, amount=Decimal("1000"),
            method=PaymentMethod.CASH, recorded_by=self.treasurer,
        )
        self.client.force_login(self.member)
        r = self.client.get(f"{PAYMENTS_URL}{payment.pk}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class OutstandingContributionsTests(APITestCase):
    def setUp(self):
        self.organizer  = make_user("org_out", Role.ORGANIZER)
        self.treasurer  = make_user("tre_out", Role.TREASURER)
        self.member1    = make_user("mem_out1", Role.MEMBER)
        self.member2    = make_user("mem_out2", Role.MEMBER)
        self.equb       = make_equb(self.organizer)
        self.m1 = make_membership(self.member1, self.equb)
        self.m2 = make_membership(self.member2, self.equb)
        # member1 has a verified contribution for 2026-10
        c = Contribution.objects.create(
            membership=self.m1, equb=self.equb,
            amount=Decimal("1000"), period_label="2026-10",
            submitted_by=self.member1, status=ContributionStatus.VERIFIED,
        )

    def test_outstanding_shows_unpaid_members(self):
        self.client.force_login(self.treasurer)
        r = self.client.get(
            f"{OUTSTANDING_URL}?equb={self.equb.pk}&period=2026-10"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ids = [item["user_id"] for item in r.json()]
        # member1 paid, member2 didn't
        self.assertNotIn(self.member1.pk, ids)
        self.assertIn(self.member2.pk, ids)

    def test_member_cannot_access_outstanding(self):
        self.client.force_login(self.member1)
        r = self.client.get(f"{OUTSTANDING_URL}?equb={self.equb.pk}")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_equb_param_returns_400(self):
        self.client.force_login(self.treasurer)
        r = self.client.get(OUTSTANDING_URL)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
