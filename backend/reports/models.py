"""
SiteSetting — singleton model for admin-editable homepage content.

Only one row ever exists. Accessed via SiteSetting.get_solo().
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class SiteSetting(models.Model):
    """
    Singleton: the admin edits this to customize the public landing page,
    logo, colors, hero text, watermarks, and footer.

    Use SiteSetting.get_solo() to always get the single instance.
    """

    # ── Logo / Branding ──
    site_name = models.CharField(
        max_length=100, default="ERCMS",
        help_text=_("The site name shown in the navbar and footer."),
    )
    logo_image = models.FileField(
        upload_to="logos/",
        null=True, blank=True,
        help_text=_("Upload an image file (PNG/SVG/JPG/WebP) to use as the logo. "
                    "Overrides logo_emoji and logo_icon when set."),
    )
    logo_emoji = models.CharField(
        max_length=10, default="🪙", blank=True,
        help_text=_("Emoji shown in the logo circle. Used only when no logo image is uploaded."),
    )
    logo_icon = models.CharField(
        max_length=50, default="bi-coin", blank=True,
        help_text=_("Bootstrap Icons class. Used only when no logo image or emoji is set."),
    )

    # ── Hero section ──
    hero_title = models.CharField(
        max_length=200, default="Equb Management,<br />Modernized.",
        help_text=_("Main heading on the landing page. HTML <br/> tags allowed."),
    )
    hero_subtitle = models.TextField(
        default="A centralized platform for managing traditional Ethiopian Equb "
                "savings groups — track contributions, automate rotations, process "
                "payouts, and maintain complete financial transparency.",
        help_text=_("Paragraph below the hero title."),
    )
    cta_primary_text = models.CharField(
        max_length=50, default="Get Started",
        help_text=_("Primary call-to-action button text."),
    )
    cta_secondary_text = models.CharField(
        max_length=50, default="Login",
        help_text=_("Secondary call-to-action button text."),
    )

    # ── SVG Watermarks ──
    watermark_1 = models.CharField(
        max_length=100, default="Equb Rotation",
        help_text=_("Watermark text behind the first cycling SVG."),
    )
    watermark_2 = models.CharField(
        max_length=100, default="From Paper to Digital",
        help_text=_("Watermark text behind the second cycling SVG."),
    )
    watermark_3 = models.CharField(
        max_length=100, default="The Rotation Cycle",
        help_text=_("Watermark text behind the third cycling SVG."),
    )

    # ── Footer ──
    footer_text = models.CharField(
        max_length=200,
        default="Kombolcha Institute of Technology · Department of Software Engineering · 2026",
        help_text=_("Footer line below the site name."),
    )

    # ── Color theme (CSS custom properties) ──
    primary_color = models.CharField(
        max_length=20, default="#1a6b3a",
        help_text=_("Primary brand color (hex). Used for sidebar, buttons, accents."),
    )
    primary_dark_color = models.CharField(
        max_length=20, default="#134d2b",
        help_text=_("Darker shade of the primary color (hex)."),
    )
    accent_color = models.CharField(
        max_length=20, default="#f4a81d",
        help_text=_("Gold accent color (hex). Used for highlights, watermarks."),
    )

    # ── SVG cycle interval ──
    svg_cycle_seconds = models.PositiveIntegerField(
        default=5,
        help_text=_("Seconds between SVG rotations on the homepage."),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Site Setting")
        verbose_name_plural = _("Site Settings")

    def __str__(self):
        return f"Site Settings — {self.site_name}"

    @property
    def logo_image_url(self):
        """Returns the full media URL for the logo image, or None."""
        if self.logo_image:
            return self.logo_image.url
        return None

    @classmethod
    def get_solo(cls):
        """Return the single SiteSetting row, creating it if needed."""
        obj, _ = cls.objects.get_or_create(pk=1, defaults={})
        return obj
