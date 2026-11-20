"""
Report views — read-only aggregated data from all apps.

Endpoints:
  GET /api/reports/financial-summary/?equb=<id>   — totals for one Equb
  GET /api/reports/contributions/?equb=<id>      — contribution breakdown
  GET /api/reports/payouts/?equb=<id>            — payout breakdown
  GET /api/reports/memberships/?equb=<id>        — membership stats
  GET /api/reports/system-overview/               — system-wide counts (Admin)
"""
from decimal import Decimal
from django.db.models import Sum, Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser, Role
from accounts.permissions import IsAdministrator
from equbs.models import Equb, EqubStatus
from memberships.models import Membership, MembershipStatus
from contributions.models import Contribution, ContributionStatus
from payouts.models import Payout, PayoutStatus
from rotations.models import RotationSchedule, RotationEntryStatus
from meetings.models import Meeting, MeetingStatus
from withdrawals.models import WithdrawalRequest, WithdrawalStatus
from .models import SiteSetting
from .serializers import SiteSettingSerializer


def _get_equb_or_404(equb_id):
    try:
        return Equb.objects.get(pk=equb_id)
    except Equb.DoesNotExist:
        return None


class FinancialSummaryView(APIView):
    """GET /api/reports/financial-summary/?equb=<id>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        equb_id = request.query_params.get("equb")
        if not equb_id:
            return Response({"detail": "Query parameter 'equb' is required."}, status=400)
        equb = _get_equb_or_404(equb_id)
        if not equb:
            return Response({"detail": "Equb not found."}, status=404)

        approved_members = Membership.objects.filter(equb=equb, status=MembershipStatus.APPROVED)
        member_count = approved_members.count()

        contributions = Contribution.objects.filter(equb=equb)
        total_contributed = contributions.filter(status=ContributionStatus.VERIFIED).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        pending_contributions = contributions.filter(status=ContributionStatus.SUBMITTED).count()
        verified_count = contributions.filter(status=ContributionStatus.VERIFIED).count()
        outstanding_count = contributions.filter(status=ContributionStatus.OUTSTANDING).count()

        payouts = Payout.objects.filter(equb=equb)
        total_paid_out = payouts.filter(status=PayoutStatus.PROCESSED).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        processed_payouts = payouts.filter(status=PayoutStatus.PROCESSED).count()
        scheduled_payouts = payouts.filter(status=PayoutStatus.SCHEDULED).count()

        expected_total = equb.contribution_amount * member_count if member_count else Decimal("0")

        return Response({
            "equb": {"id": equb.pk, "name": equb.name, "status": equb.status,
                     "frequency": equb.frequency, "contribution_amount": str(equb.contribution_amount)},
            "members": {"approved": member_count, "max": equb.max_members or None},
            "contributions": {
                "total_verified_amount": str(total_contributed),
                "verified_count": verified_count,
                "pending_count": pending_contributions,
                "outstanding_count": outstanding_count,
            },
            "payouts": {
                "total_paid_amount": str(total_paid_out),
                "processed_count": processed_payouts,
                "scheduled_count": scheduled_payouts,
            },
            "balance": str(total_contributed - total_paid_out),
        })


class ContributionReportView(APIView):
    """GET /api/reports/contributions/?equb=<id> — per-member breakdown"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        equb_id = request.query_params.get("equb")
        if not equb_id:
            return Response({"detail": "Query parameter 'equb' is required."}, status=400)
        equb = _get_equb_or_404(equb_id)
        if not equb:
            return Response({"detail": "Equb not found."}, status=404)

        members = Membership.objects.filter(equb=equb, status=MembershipStatus.APPROVED).select_related("user")
        result = []
        for m in members:
            contribs = Contribution.objects.filter(membership=m)
            verified = contribs.filter(status=ContributionStatus.VERIFIED)
            pending = contribs.filter(status=ContributionStatus.SUBMITTED)
            result.append({
                "member_id": m.user_id,
                "member_name": m.user.get_full_name() or m.user.username,
                "total_verified": str(verified.aggregate(s=Sum("amount"))["s"] or Decimal("0")),
                "verified_count": verified.count(),
                "pending_count": pending.count(),
                "outstanding_count": contribs.filter(status=ContributionStatus.OUTSTANDING).count(),
            })
        return Response(result)


class PayoutReportView(APIView):
    """GET /api/reports/payouts/?equb=<id> — per-member payout breakdown"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        equb_id = request.query_params.get("equb")
        if not equb_id:
            return Response({"detail": "Query parameter 'equb' is required."}, status=400)
        equb = _get_equb_or_404(equb_id)
        if not equb:
            return Response({"detail": "Equb not found."}, status=404)

        payouts = Payout.objects.filter(equb=equb).select_related("recipient", "rotation_entry")
        result = []
        for p in payouts:
            result.append({
                "payout_reference": p.payout_reference,
                "recipient": p.recipient.get_full_name() or p.recipient.username,
                "position": p.rotation_entry.position if p.rotation_entry else None,
                "amount": str(p.amount),
                "method": p.method,
                "status": p.status,
                "processed_at": p.processed_at.isoformat() if p.processed_at else None,
            })
        return Response(result)


class MembershipReportView(APIView):
    """GET /api/reports/memberships/?equb=<id> — membership breakdown"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        equb_id = request.query_params.get("equb")
        if not equb_id:
            return Response({"detail": "Query parameter 'equb' is required."}, status=400)
        equb = _get_equb_or_404(equb_id)
        if not equb:
            return Response({"detail": "Equb not found."}, status=404)

        memberships = Membership.objects.filter(equb=equb).select_related("user")
        status_counts = memberships.values("status").annotate(count=Count("id"))
        result = {
            "total": memberships.count(),
            "by_status": {item["status"]: item["count"] for item in status_counts},
            "members": [
                {
                    "member_name": m.user.get_full_name() or m.user.username,
                    "status": m.status,
                    "rotation_position": m.rotation_position,
                    "joined": m.created_at.isoformat(),
                }
                for m in memberships
            ],
        }
        return Response(result)


class SystemOverviewView(APIView):
    """GET /api/reports/system-overview/ — Admin-only system-wide stats."""
    permission_classes = [IsAuthenticated, IsAdministrator]

    def get(self, request):
        return Response({
            "users": {
                "total": CustomUser.objects.count(),
                "by_role": {
                    r: CustomUser.objects.filter(role=r).count()
                    for r in ["admin", "organizer", "treasurer", "member", "auditor"]
                },
                "active": CustomUser.objects.filter(is_active=True).count(),
                "inactive": CustomUser.objects.filter(is_active=False).count(),
            },
            "equbs": {
                "total": Equb.objects.count(),
                "active": Equb.objects.filter(status=EqubStatus.ACTIVE).count(),
                "completed": Equb.objects.filter(status=EqubStatus.COMPLETED).count(),
            },
            "contributions": {
                "total": Contribution.objects.count(),
                "verified": Contribution.objects.filter(status=ContributionStatus.VERIFIED).count(),
                "pending": Contribution.objects.filter(status=ContributionStatus.SUBMITTED).count(),
            },
            "payouts": {
                "total": Payout.objects.count(),
                "processed": Payout.objects.filter(status=PayoutStatus.PROCESSED).count(),
                "scheduled": Payout.objects.filter(status=PayoutStatus.SCHEDULED).count(),
            },
            "meetings": {
                "total": Meeting.objects.count(),
                "upcoming": Meeting.objects.filter(status=MeetingStatus.UPCOMING).count(),
            },
            "withdrawals": {
                "total": WithdrawalRequest.objects.count(),
                "pending": WithdrawalRequest.objects.filter(status=WithdrawalStatus.PENDING).count(),
            },
        })


class SiteSettingView(APIView):
    """
    GET  /api/reports/site-settings/  — public, anyone can read
    PATCH /api/reports/site-settings/  — admin only

    Returns or updates the singleton SiteSetting row.
    """

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), IsAdministrator()]
        return []  # GET is public

    def get(self, request):
        setting = SiteSetting.get_solo()
        return Response(SiteSettingSerializer(setting).data)

    def patch(self, request):
        setting = SiteSetting.get_solo()
        serializer = SiteSettingSerializer(setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            from auditing.utils import write_audit_log
            write_audit_log(
                actor=request.user,
                action="site_settings_updated",
                model_name="SiteSetting",
                object_id="1",
                detail={"updated_fields": list(request.data.keys())},
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class SiteLogoUploadView(APIView):
    """
    POST /api/reports/site-settings/logo/
    Admin uploads a logo image file (PNG, JPG, SVG, WebP).
    Accepts multipart/form-data with key 'logo'.
    DELETE /api/reports/site-settings/logo/
    Admin removes the uploaded logo (falls back to emoji/icon).
    """
    permission_classes = [IsAuthenticated, IsAdministrator]

    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "svg", "webp", "gif"}
    MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

    def post(self, request):
        logo_file = request.FILES.get("logo")
        if not logo_file:
            return Response({"detail": "No file uploaded. Use form-data key 'logo'."}, status=400)

        # Validate extension
        ext = logo_file.name.rsplit(".", 1)[-1].lower() if "." in logo_file.name else ""
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {"detail": f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"},
                status=400,
            )

        # Validate size
        if logo_file.size > self.MAX_SIZE_BYTES:
            return Response({"detail": "File too large. Maximum size is 2 MB."}, status=400)

        setting = SiteSetting.get_solo()

        # Delete old file if it exists
        if setting.logo_image:
            try:
                setting.logo_image.delete(save=False)
            except Exception:
                pass  # Don't block upload if old file can't be deleted

        setting.logo_image = logo_file
        setting.save(update_fields=["logo_image", "updated_at"])

        from auditing.utils import write_audit_log
        write_audit_log(
            actor=request.user,
            action="site_logo_uploaded",
            model_name="SiteSetting",
            object_id="1",
            detail={"filename": logo_file.name, "size": logo_file.size},
        )

        return Response({
            "detail": "Logo uploaded successfully.",
            "logo_image_url": setting.logo_image_url,
        })

    def delete(self, request):
        setting = SiteSetting.get_solo()
        if setting.logo_image:
            setting.logo_image.delete(save=False)
            setting.logo_image = None
            setting.save(update_fields=["logo_image", "updated_at"])
            from auditing.utils import write_audit_log
            write_audit_log(
                actor=request.user,
                action="site_logo_removed",
                model_name="SiteSetting",
                object_id="1",
                detail={},
            )
        return Response({"detail": "Logo removed. Falling back to emoji/icon."})
