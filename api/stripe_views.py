import stripe
from datetime import datetime
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import CustomUser, PendingRegistration

stripe.api_key = settings.STRIPE_SECRET_KEY


class CreateCheckoutSessionView(APIView):
    """Create a Stripe Checkout Session for yearly subscription during registration."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        # Validate registration data before creating checkout session
        errors = {}
        if not username:
            errors['username'] = ['Username is required.']
        elif CustomUser.objects.filter(username=username).exists():
            errors['username'] = ['A user with that username already exists.']

        if not email:
            errors['email'] = ['Email is required.']
        elif CustomUser.objects.filter(email=email).exists():
            errors['email'] = ['A user with that email already exists.']

        if not password or len(password) < 8:
            errors['password'] = ['Password must be at least 8 characters.']

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Clean up any existing pending registration for this username/email
        PendingRegistration.objects.filter(username=username).delete()
        PendingRegistration.objects.filter(email=email).delete()

        # Create PendingRegistration with hashed password
        pending = PendingRegistration.objects.create(
            username=username,
            email=email,
            password_hash=make_password(password),
        )

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': settings.STRIPE_YEARLY_PRICE_ID,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=settings.FRONTEND_URL + '/register/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.FRONTEND_URL + '/register/cancel',
                client_reference_id=str(pending.id),
                customer_email=email,
                metadata={
                    'pending_registration_id': str(pending.id),
                    'username': username,
                },
            )

            pending.stripe_checkout_session_id = checkout_session.id
            pending.save()

            return Response({
                'checkout_url': checkout_session.url,
                'session_id': checkout_session.id,
            })

        except stripe.error.StripeError as e:
            pending.delete()
            return Response(
                {'detail': str(e.user_message if hasattr(e, 'user_message') else e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhook events."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({'detail': 'Invalid payload'}, status=400)
        except stripe.error.SignatureVerificationError:
            return Response({'detail': 'Invalid signature'}, status=400)

        event_type = event['type']
        data_object = event['data']['object']

        if event_type == 'checkout.session.completed':
            self._handle_checkout_completed(data_object)
        elif event_type == 'invoice.paid':
            self._handle_invoice_paid(data_object)
        elif event_type == 'invoice.payment_failed':
            self._handle_invoice_payment_failed(data_object)
        elif event_type == 'customer.subscription.updated':
            self._handle_subscription_updated(data_object)
        elif event_type == 'customer.subscription.deleted':
            self._handle_subscription_deleted(data_object)

        return Response({'status': 'success'})

    def _handle_checkout_completed(self, session):
        """Create user account after successful payment."""
        pending_id = session.get('client_reference_id')
        if not pending_id:
            return

        try:
            pending = PendingRegistration.objects.get(id=pending_id)
        except PendingRegistration.DoesNotExist:
            return

        # Idempotency: check if user already exists
        if CustomUser.objects.filter(username=pending.username).exists():
            pending.delete()
            return

        # Create the real user account
        user = CustomUser(
            username=pending.username,
            email=pending.email,
        )
        user.password = pending.password_hash  # Already hashed
        user.stripe_customer_id = session.get('customer')
        user.stripe_subscription_id = session.get('subscription')
        user.subscription_status = 'active'
        user.save()

        pending.delete()

        # Retrieve subscription to get period end
        if user.stripe_subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
                user.subscription_current_period_end = timezone.make_aware(
                    datetime.fromtimestamp(subscription.current_period_end)
                )
                user.save()
            except stripe.error.StripeError:
                pass  # Non-critical, will be updated on next invoice.paid

    def _handle_invoice_paid(self, invoice):
        """Update subscription status on successful renewal payment."""
        customer_id = invoice.get('customer')
        try:
            user = CustomUser.objects.get(stripe_customer_id=customer_id)
            user.subscription_status = 'active'
            subscription_id = invoice.get('subscription')
            if subscription_id:
                try:
                    subscription = stripe.Subscription.retrieve(subscription_id)
                    user.subscription_current_period_end = timezone.make_aware(
                        datetime.fromtimestamp(subscription.current_period_end)
                    )
                except stripe.error.StripeError:
                    pass
            user.save()
        except CustomUser.DoesNotExist:
            pass

    def _handle_invoice_payment_failed(self, invoice):
        """Mark subscription as past_due when payment fails."""
        customer_id = invoice.get('customer')
        try:
            user = CustomUser.objects.get(stripe_customer_id=customer_id)
            user.subscription_status = 'past_due'
            user.save()
        except CustomUser.DoesNotExist:
            pass

    def _handle_subscription_updated(self, subscription):
        """Sync subscription status changes."""
        customer_id = subscription.get('customer')
        try:
            user = CustomUser.objects.get(stripe_customer_id=customer_id)
            user.subscription_status = subscription.get('status', 'active')
            user.subscription_current_period_end = timezone.make_aware(
                datetime.fromtimestamp(subscription['current_period_end'])
            )
            user.save()
        except CustomUser.DoesNotExist:
            pass

    def _handle_subscription_deleted(self, subscription):
        """Handle subscription cancellation."""
        customer_id = subscription.get('customer')
        try:
            user = CustomUser.objects.get(stripe_customer_id=customer_id)
            user.subscription_status = 'canceled'
            user.stripe_subscription_id = None
            user.save()
        except CustomUser.DoesNotExist:
            pass


class VerifyCheckoutSessionView(APIView):
    """Verify a checkout session and return login credentials if user was created."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'detail': 'session_id required'}, status=400)

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError:
            return Response({'detail': 'Invalid session'}, status=400)

        if session.payment_status != 'paid':
            return Response({
                'status': 'pending',
                'detail': 'Payment not yet confirmed. Please wait a moment.',
            })

        # Find the user by stripe_customer_id
        customer_id = session.customer
        try:
            user = CustomUser.objects.get(stripe_customer_id=customer_id)
        except CustomUser.DoesNotExist:
            return Response({
                'status': 'processing',
                'detail': 'Account is being created. Please wait a moment and try again.',
            })

        # Auto-login: create token and return
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'status': 'success',
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username,
            'subscription_status': user.subscription_status,
            'has_active_subscription': user.has_active_subscription,
        })


class SubscriptionStatusView(APIView):
    """Return current user's subscription status."""

    def get(self, request):
        user = request.user
        return Response({
            'subscription_status': user.subscription_status,
            'subscription_current_period_end': user.subscription_current_period_end,
            'has_active_subscription': user.has_active_subscription,
        })
