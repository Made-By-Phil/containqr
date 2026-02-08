import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from users.models import CustomUser, PendingRegistration
from containers.models import Container, Location


class HasActiveSubscriptionPermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active_user = CustomUser.objects.create_user(
            username='active', email='active@test.com', password='testpass123',
            subscription_status='active',
        )
        self.canceled_user = CustomUser.objects.create_user(
            username='canceled', email='canceled@test.com', password='testpass123',
            subscription_status='canceled',
        )
        self.incomplete_user = CustomUser.objects.create_user(
            username='incomplete', email='incomplete@test.com', password='testpass123',
            subscription_status='incomplete',
        )
        self.past_due_user = CustomUser.objects.create_user(
            username='pastdue', email='pastdue@test.com', password='testpass123',
            subscription_status='past_due',
        )
        self.active_token = Token.objects.create(user=self.active_user)
        self.canceled_token = Token.objects.create(user=self.canceled_user)
        self.incomplete_token = Token.objects.create(user=self.incomplete_user)
        self.past_due_token = Token.objects.create(user=self.past_due_user)

    def test_unauthenticated_user_denied(self):
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 401)

    def test_active_subscription_allowed(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.active_token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 200)

    def test_past_due_subscription_allowed(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.past_due_token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 200)

    def test_canceled_subscription_denied(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.canceled_token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 403)

    def test_incomplete_subscription_denied(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.incomplete_token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 403)


class UserLoginViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='loginuser', email='login@test.com', password='testpass123',
            subscription_status='active',
        )

    def test_successful_login_returns_subscription_fields(self):
        response = self.client.post('/api/login/', {
            'username': 'loginuser', 'password': 'testpass123',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('subscription_status', data)
        self.assertIn('has_active_subscription', data)
        self.assertEqual(data['subscription_status'], 'active')
        self.assertTrue(data['has_active_subscription'])
        self.assertEqual(data['username'], 'loginuser')

    def test_invalid_credentials_returns_400(self):
        response = self.client.post('/api/login/', {
            'username': 'loginuser', 'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, 400)


class ContainerListViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='containeruser', email='cu@test.com', password='testpass123',
            subscription_status='active',
        )
        self.token = Token.objects.create(user=self.user)
        self.location = Location.objects.create(name='Garage')
        Container.objects.create(
            user=self.user, name='Box 1', readable_id='GAR01',
            color='red', location=self.location,
        )

    def test_active_user_can_list(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_canceled_user_gets_403(self):
        self.user.subscription_status = 'canceled'
        self.user.save()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_gets_401(self):
        response = self.client.get('/api/containers/')
        self.assertEqual(response.status_code, 401)


class CreateCheckoutSessionViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/stripe/create-checkout-session/'

    @patch('api.stripe_views.stripe.checkout.Session.create')
    def test_valid_data_returns_checkout_url(self, mock_create):
        mock_session = MagicMock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_session.id = 'cs_test_123'
        mock_create.return_value = mock_session

        response = self.client.post(self.url, {
            'username': 'newuser', 'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['checkout_url'], 'https://checkout.stripe.com/test')
        self.assertEqual(data['session_id'], 'cs_test_123')

    @patch('api.stripe_views.stripe.checkout.Session.create')
    def test_creates_pending_registration(self, mock_create):
        mock_session = MagicMock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_session.id = 'cs_test_456'
        mock_create.return_value = mock_session

        self.client.post(self.url, {
            'username': 'newuser', 'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertTrue(PendingRegistration.objects.filter(username='newuser').exists())

    def test_missing_username_returns_400(self):
        response = self.client.post(self.url, {
            'username': '', 'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.json())

    def test_duplicate_username_returns_400(self):
        CustomUser.objects.create_user(username='taken', email='t@test.com', password='pass1234')
        response = self.client.post(self.url, {
            'username': 'taken', 'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.json())

    def test_duplicate_email_returns_400(self):
        CustomUser.objects.create_user(username='other', email='taken@test.com', password='pass1234')
        response = self.client.post(self.url, {
            'username': 'newuser', 'email': 'taken@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json())

    def test_short_password_returns_400(self):
        response = self.client.post(self.url, {
            'username': 'newuser', 'email': 'new@test.com', 'password': 'short',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json())

    @patch('api.stripe_views.stripe.checkout.Session.create')
    def test_cleans_up_existing_pending_for_same_username(self, mock_create):
        mock_session = MagicMock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_session.id = 'cs_test_789'
        mock_create.return_value = mock_session

        PendingRegistration.objects.create(
            username='newuser', email='old@test.com', password_hash='oldhash',
        )
        self.client.post(self.url, {
            'username': 'newuser', 'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        # Old one deleted, new one created
        self.assertEqual(PendingRegistration.objects.filter(username='newuser').count(), 1)


class StripeWebhookViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/stripe/webhook/'
        self.pending = PendingRegistration.objects.create(
            username='webhookuser',
            email='webhook@test.com',
            password_hash=make_password('testpass123'),
        )

    def _post_webhook(self, event_type, data_object):
        event = {'type': event_type, 'data': {'object': data_object}}
        with patch('api.stripe_views.stripe.Webhook.construct_event', return_value=event):
            return self.client.post(
                self.url,
                json.dumps(event),
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_sig',
            )

    def test_invalid_signature_returns_400(self):
        with patch('api.stripe_views.stripe.Webhook.construct_event',
                   side_effect=Exception('Invalid signature')):
            # Use the actual stripe error type
            import stripe
            with patch('api.stripe_views.stripe.Webhook.construct_event',
                       side_effect=stripe.error.SignatureVerificationError('bad', 'sig')):
                response = self.client.post(
                    self.url, '{}',
                    content_type='application/json',
                    HTTP_STRIPE_SIGNATURE='bad_sig',
                )
                self.assertEqual(response.status_code, 400)

    @patch('api.stripe_views.stripe.Subscription.retrieve')
    def test_checkout_completed_creates_user(self, mock_sub_retrieve):
        mock_sub = MagicMock()
        mock_sub.current_period_end = 1735689600  # 2025-01-01
        mock_sub_retrieve.return_value = mock_sub

        response = self._post_webhook('checkout.session.completed', {
            'client_reference_id': str(self.pending.id),
            'customer': 'cus_test123',
            'subscription': 'sub_test456',
        })
        self.assertEqual(response.status_code, 200)
        user = CustomUser.objects.get(username='webhookuser')
        self.assertEqual(user.stripe_customer_id, 'cus_test123')
        self.assertEqual(user.stripe_subscription_id, 'sub_test456')
        self.assertEqual(user.subscription_status, 'active')

    @patch('api.stripe_views.stripe.Subscription.retrieve')
    def test_checkout_completed_deletes_pending(self, mock_sub_retrieve):
        mock_sub = MagicMock()
        mock_sub.current_period_end = 1735689600
        mock_sub_retrieve.return_value = mock_sub

        self._post_webhook('checkout.session.completed', {
            'client_reference_id': str(self.pending.id),
            'customer': 'cus_test123',
            'subscription': 'sub_test456',
        })
        self.assertFalse(PendingRegistration.objects.filter(id=self.pending.id).exists())

    @patch('api.stripe_views.stripe.Subscription.retrieve')
    def test_checkout_completed_idempotent(self, mock_sub_retrieve):
        mock_sub = MagicMock()
        mock_sub.current_period_end = 1735689600
        mock_sub_retrieve.return_value = mock_sub

        # Create user first
        CustomUser.objects.create_user(
            username='webhookuser', email='webhook@test.com', password='testpass123'
        )
        response = self._post_webhook('checkout.session.completed', {
            'client_reference_id': str(self.pending.id),
            'customer': 'cus_test123',
            'subscription': 'sub_test456',
        })
        self.assertEqual(response.status_code, 200)
        # Only one user exists
        self.assertEqual(CustomUser.objects.filter(username='webhookuser').count(), 1)

    def test_invoice_paid_updates_status(self):
        user = CustomUser.objects.create_user(
            username='paiduser', email='paid@test.com', password='testpass123',
            stripe_customer_id='cus_paid', subscription_status='past_due',
        )
        with patch('api.stripe_views.stripe.Subscription.retrieve') as mock_retrieve:
            mock_sub = MagicMock()
            mock_sub.current_period_end = 1735689600
            mock_retrieve.return_value = mock_sub
            self._post_webhook('invoice.paid', {
                'customer': 'cus_paid',
                'subscription': 'sub_paid',
            })
        user.refresh_from_db()
        self.assertEqual(user.subscription_status, 'active')

    def test_invoice_payment_failed_sets_past_due(self):
        user = CustomUser.objects.create_user(
            username='failuser', email='fail@test.com', password='testpass123',
            stripe_customer_id='cus_fail', subscription_status='active',
        )
        self._post_webhook('invoice.payment_failed', {
            'customer': 'cus_fail',
        })
        user.refresh_from_db()
        self.assertEqual(user.subscription_status, 'past_due')

    def test_subscription_deleted_sets_canceled(self):
        user = CustomUser.objects.create_user(
            username='deluser', email='del@test.com', password='testpass123',
            stripe_customer_id='cus_del', stripe_subscription_id='sub_del',
            subscription_status='active',
        )
        self._post_webhook('customer.subscription.deleted', {
            'customer': 'cus_del',
        })
        user.refresh_from_db()
        self.assertEqual(user.subscription_status, 'canceled')
        self.assertIsNone(user.stripe_subscription_id)


class VerifyCheckoutSessionViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/stripe/verify-session/'

    def test_missing_session_id_returns_400(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)

    @patch('api.stripe_views.stripe.checkout.Session.retrieve')
    def test_unpaid_session_returns_pending(self, mock_retrieve):
        mock_session = MagicMock()
        mock_session.payment_status = 'unpaid'
        mock_retrieve.return_value = mock_session

        response = self.client.get(self.url, {'session_id': 'cs_test'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'pending')

    @patch('api.stripe_views.stripe.checkout.Session.retrieve')
    def test_paid_session_with_user_returns_success(self, mock_retrieve):
        user = CustomUser.objects.create_user(
            username='verified', email='v@test.com', password='testpass123',
            stripe_customer_id='cus_verified', subscription_status='active',
        )
        mock_session = MagicMock()
        mock_session.payment_status = 'paid'
        mock_session.customer = 'cus_verified'
        mock_session.client_reference_id = 'some-uuid'
        mock_retrieve.return_value = mock_session

        response = self.client.get(self.url, {'session_id': 'cs_test'})
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('token', data)
        self.assertEqual(data['username'], 'verified')

    @patch('api.stripe_views.stripe.checkout.Session.retrieve')
    def test_paid_session_without_user_returns_processing(self, mock_retrieve):
        mock_session = MagicMock()
        mock_session.payment_status = 'paid'
        mock_session.customer = 'cus_nonexistent'
        mock_session.client_reference_id = 'some-uuid'
        mock_retrieve.return_value = mock_session

        response = self.client.get(self.url, {'session_id': 'cs_test'})
        self.assertEqual(response.json()['status'], 'processing')


class SubscriptionStatusViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='statususer', email='status@test.com', password='testpass123',
            subscription_status='active',
        )
        self.token = Token.objects.create(user=self.user)

    def test_authenticated_returns_status(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.get('/api/stripe/subscription-status/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['subscription_status'], 'active')
        self.assertTrue(data['has_active_subscription'])

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/stripe/subscription-status/')
        self.assertEqual(response.status_code, 401)
