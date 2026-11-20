from django.urls import path
from .views import (
    FinancialSummaryView,
    ContributionReportView,
    PayoutReportView,
    MembershipReportView,
    SystemOverviewView,
    SiteSettingView,
    SiteLogoUploadView,
)

app_name = "reports"

urlpatterns = [
    path("financial-summary/", FinancialSummaryView.as_view(), name="financial-summary"),
    path("contributions/", ContributionReportView.as_view(), name="contributions"),
    path("payouts/", PayoutReportView.as_view(), name="payouts"),
    path("memberships/", MembershipReportView.as_view(), name="memberships"),
    path("system-overview/", SystemOverviewView.as_view(), name="system-overview"),
    path("site-settings/", SiteSettingView.as_view(), name="site-settings"),
    path("site-settings/logo/", SiteLogoUploadView.as_view(), name="site-logo-upload"),
]
