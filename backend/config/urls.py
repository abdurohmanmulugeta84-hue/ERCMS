"""
Root URL configuration for the Equb Rotation & Contribution Management System.

All application endpoints are prefixed with /api/.
The Django admin interface is available at /admin/ (development only).
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings
from django.conf.urls.static import static


@ensure_csrf_cookie
def health_check(request):
    """
    GET /api/health/
    Returns a 200 response with basic system status.
    Also ensures the CSRF cookie is set on the client.
    """
    return JsonResponse({"status": "ok", "version": "1.0"})


def root_info(request):
    """
    GET /
    Friendly reminder that the UI is served by the React dev server.
    Shown only in development; in production the frontend is served separately.
    """
    return HttpResponse(
        "<h2>ERCMS Django API</h2>"
        "<p>This is the backend API server. It only handles <code>/api/*</code> requests.</p>"
        "<p>Open the React frontend at "
        "<a href='http://localhost:5173'>http://localhost:5173</a> to use the application.</p>"
        "<p>Django admin: <a href='/admin/'>/admin/</a></p>"
        "<p>API health: <a href='/api/health/'>/api/health/</a></p>",
        content_type="text/html",
    )


urlpatterns = [
    # Root info page (development convenience only)
    path("", root_info, name="root"),

    # Django admin
    path("admin/", admin.site.urls),

    # API endpoints
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("accounts.urls", namespace="accounts")),
    path("api/equbs/", include("equbs.urls", namespace="equbs")),
    path("api/memberships/", include("memberships.urls", namespace="memberships")),
    path("api/contributions/", include("contributions.urls", namespace="contributions")),
    path("api/rotations/", include("rotations.urls", namespace="rotations")),
    path("api/payouts/", include("payouts.urls", namespace="payouts")),
    path("api/meetings/", include("meetings.urls", namespace="meetings")),
    path("api/withdrawals/", include("withdrawals.urls", namespace="withdrawals")),
    path("api/notifications/", include("notifications.urls", namespace="notifications")),
    path("api/reports/", include("reports.urls", namespace="reports")),
    path("api/audit-log/", include("auditing.urls", namespace="auditing")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
