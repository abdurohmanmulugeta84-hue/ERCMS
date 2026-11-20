from django.urls import path
from .views import (
    ContributionListCreateView,
    ContributionDetailView,
    ContributionVerifyView,
    OutstandingContributionsView,
    PaymentListCreateView,
    PaymentDetailView,
)

app_name = "contributions"

urlpatterns = [
    # Contributions
    path("", ContributionListCreateView.as_view(), name="contribution-list-create"),
    path("outstanding/", OutstandingContributionsView.as_view(), name="outstanding"),
    path("<int:pk>/", ContributionDetailView.as_view(), name="contribution-detail"),
    path("<int:pk>/verify/", ContributionVerifyView.as_view(), name="contribution-verify"),

    # Payments
    path("payments/", PaymentListCreateView.as_view(), name="payment-list-create"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),
]
