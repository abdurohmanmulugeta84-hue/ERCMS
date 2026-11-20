from django.urls import path
from .views import (
    PayoutListCreateView,
    PayoutDetailView,
    PayoutCancelView,
    MyPayoutsView,
)

app_name = "payouts"

urlpatterns = [
    path("", PayoutListCreateView.as_view(), name="payout-list-create"),
    path("my/", MyPayoutsView.as_view(), name="my-payouts"),
    path("<int:pk>/", PayoutDetailView.as_view(), name="payout-detail"),
    path("<int:pk>/cancel/", PayoutCancelView.as_view(), name="payout-cancel"),
]
