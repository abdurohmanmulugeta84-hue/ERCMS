"""
Audit log views — read-only, accessible to Administrators and Auditors.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrator, IsAuditor
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(APIView):
    """List audit log entries. Accessible to Administrators and Auditors."""

    permission_classes = [IsAuthenticated, IsAdministrator | IsAuditor]

    def get(self, request):
        # Optional filters: action, model_name, actor_id
        queryset = AuditLog.objects.select_related("actor").all()

        action = request.query_params.get("action")
        model_name = request.query_params.get("model_name")
        actor_id = request.query_params.get("actor_id")

        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        # Limit to 200 most recent entries by default
        queryset = queryset[:200]
        serializer = AuditLogSerializer(queryset, many=True)
        return Response(serializer.data)
