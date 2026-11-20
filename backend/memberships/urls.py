from django.urls import path
from .views import (
    MembershipListCreateView,
    MembershipDetailView,
    MembershipReviewView,
    MembershipStatusUpdateView,
    MyMembershipsView,
)

app_name = "memberships"

urlpatterns = [
    path("", MembershipListCreateView.as_view(), name="membership-list-create"),
    path("my/", MyMembershipsView.as_view(), name="my-memberships"),
    path("<int:pk>/", MembershipDetailView.as_view(), name="membership-detail"),
    path("<int:pk>/review/", MembershipReviewView.as_view(), name="membership-review"),
    path("<int:pk>/status/", MembershipStatusUpdateView.as_view(), name="membership-status"),
]
