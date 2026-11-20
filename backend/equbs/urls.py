from django.urls import path
from .views import (
    EqubListCreateView,
    EqubDetailUpdateView,
    EqubStatusUpdateView,
    MyEqubsView,
)

app_name = "equbs"

urlpatterns = [
    path("", EqubListCreateView.as_view(), name="equb-list-create"),
    path("my/", MyEqubsView.as_view(), name="my-equbs"),
    path("<int:pk>/", EqubDetailUpdateView.as_view(), name="equb-detail-update"),
    path("<int:pk>/status/", EqubStatusUpdateView.as_view(), name="equb-status-update"),
]
