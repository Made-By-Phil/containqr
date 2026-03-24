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

    # Household sharing
    # household_passcode: 4-digit numeric string, hashed via make_password/check_password
    household_passcode = models.CharField(max_length=255, blank=True, null=True)
    # household_share_token: UUID for the shareable /view/<token>/ link; null = disabled
    household_share_token = models.UUIDField(default=None, null=True, blank=True, unique=True)

    # Onboarding tracking
    qr_first_viewed_at = models.DateTimeField(null=True, blank=True)
    household_search_used_at = models.DateTimeField(null=True, blank=True)
    onboarding_dismissed = models.BooleanField(default=False)

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
    email = models.EmailField()
    password_hash = models.CharField(max_length=255)
    stripe_checkout_session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
