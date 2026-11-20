from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="mark-all-read"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="unread-count"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="mark-read"),
]
