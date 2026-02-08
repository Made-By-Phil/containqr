from rest_framework.permissions import BasePermission


class HasActiveSubscription(BasePermission):
    """Only allow access to users with an active subscription."""
    message = 'Your subscription is not active. Please renew to continue using ContainQR.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_active_subscription
