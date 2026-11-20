"""Serializers for the notifications app."""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = [
            "id", "notification_type", "type_display",
            "title", "message",
            "related_object_type", "related_object_id",
            "is_read", "email_sent", "created_at",
        ]
        read_only_fields = fields

    def get_type_display(self, obj):
        return obj.get_notification_type_display()
