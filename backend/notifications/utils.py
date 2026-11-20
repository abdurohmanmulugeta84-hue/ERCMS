"""
Notification utility.

Call send_notification() from any view or signal to create an in-app
Notification record and optionally dispatch an email to the recipient.

Email sending never raises — a failure is logged but does not abort
the calling operation.
"""
import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_notification(
    recipient,
    notification_type: str,
    title: str,
    message: str,
    related_object_type: str = "",
    related_object_id: str = "",
    send_email: bool = True,
):
    """
    Create an in-app Notification and optionally send an email.

    Args:
        recipient            — CustomUser instance
        notification_type    — NotificationType choice value
        title                — Short notification title
        message              — Full notification body
        related_object_type  — Optional model name for deep-link (e.g. "Payout")
        related_object_id    — Optional PK string
        send_email           — Whether to send an email (default True)

    Returns:
        Notification instance
    """
    from notifications.models import Notification

    email_sent = False
    if send_email and recipient.email:
        try:
            send_mail(
                subject=f"[ERCMS] {title}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=False,
            )
            email_sent = True
        except Exception as exc:
            logger.error(
                "Failed to send notification email to %s: %s",
                recipient.email, exc,
            )

    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_type=related_object_type,
        related_object_id=str(related_object_id),
        email_sent=email_sent,
    )
    return notification
