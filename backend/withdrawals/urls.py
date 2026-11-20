from django.urls import path
from .views import WithdrawalListCreateView, WithdrawalDetailView, WithdrawalReviewView

app_name = "withdrawals"

urlpatterns = [
    path("", WithdrawalListCreateView.as_view(), name="withdrawal-list-create"),
    path("<int:pk>/", WithdrawalDetailView.as_view(), name="withdrawal-detail"),
    path("<int:pk>/review/", WithdrawalReviewView.as_view(), name="withdrawal-review"),
]
