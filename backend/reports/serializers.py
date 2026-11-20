"""Serializer for SiteSetting."""
from rest_framework import serializers
from .models import SiteSetting


class SiteSettingSerializer(serializers.ModelSerializer):
    logo_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        fields = [
            "site_name",
            "logo_image", "logo_image_url",
            "logo_emoji", "logo_icon",
            "hero_title", "hero_subtitle",
            "cta_primary_text", "cta_secondary_text",
            "watermark_1", "watermark_2", "watermark_3",
            "footer_text",
            "primary_color", "primary_dark_color", "accent_color",
            "svg_cycle_seconds",
            "updated_at",
        ]
        read_only_fields = ["logo_image", "logo_image_url", "updated_at"]
        extra_kwargs = {
            "logo_emoji": {"allow_blank": True, "required": False},
            "logo_icon":  {"allow_blank": True, "required": False},
        }

    def get_logo_image_url(self, obj):
        return obj.logo_image_url
