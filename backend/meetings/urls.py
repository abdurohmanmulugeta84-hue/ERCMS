from django.urls import path
from .views import (
    MeetingListCreateView, MeetingDetailView,
    AttendanceCreateView, BulkAttendanceView, AttendanceDetailView,
)

app_name = "meetings"

urlpatterns = [
    path("", MeetingListCreateView.as_view(), name="meeting-list-create"),
    path("<int:pk>/", MeetingDetailView.as_view(), name="meeting-detail"),
    path("<int:pk>/attendance/", AttendanceCreateView.as_view(), name="attendance-create"),
    path("<int:pk>/attendance/bulk/", BulkAttendanceView.as_view(), name="attendance-bulk"),
    path("<int:pk>/attendance/<int:aid>/", AttendanceDetailView.as_view(), name="attendance-detail"),
]
