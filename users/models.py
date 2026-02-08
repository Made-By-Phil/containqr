import uuid as uuid_lib
from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('incomplete', 'Incomplete'),
            ('active', 'Active'),
            ('past_due', 'Past Due'),
            ('canceled', 'Canceled'),
            ('unpaid', 'Unpaid'),
        ],
        default='incomplete',
        blank=True,
    )
    subscription_current_period_end = models.DateTimeField(null=True, blank=True)

    @property
    def has_active_subscription(self):
        """Check if user has an active or past_due (grace period) subscription."""
        return self.subscription_status in ('active', 'past_due')


class PendingRegistration(models.Model):
    """Temporary store for registration data while Stripe Checkout is in progress.

    Created when user submits registration form.
    Consumed when checkout.session.completed webhook fires.
    Cleaned up periodically for abandoned registrations.
    """
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    username = models.CharField(max_length=150)
    email = models.EmailField()
    password_hash = models.CharField(max_length=255)
    stripe_checkout_session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
