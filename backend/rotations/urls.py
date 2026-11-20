from django.urls import path
from .views import (
    RotationScheduleListCreateView,
    RotationScheduleDetailView,
    RotationEntryListCreateView,
    RotationEntryDetailView,
    MyRotationEntriesView,
)

app_name = "rotations"

urlpatterns = [
    path("", RotationScheduleListCreateView.as_view(), name="schedule-list-create"),
    path("my/", MyRotationEntriesView.as_view(), name="my-entries"),
    path("<int:pk>/", RotationScheduleDetailView.as_view(), name="schedule-detail"),
    path("<int:pk>/entries/", RotationEntryListCreateView.as_view(), name="entry-create"),
    path("<int:pk>/entries/<int:eid>/", RotationEntryDetailView.as_view(), name="entry-detail"),
]
