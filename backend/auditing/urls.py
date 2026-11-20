from django.urls import path
from .views import AuditLogListView

app_name = "auditing"

urlpatterns = [
    path("", AuditLogListView.as_view(), name="audit-log-list"),
]
