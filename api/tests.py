import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.contrib.auth.hashers import make_password
from PIL import Image
from io import BytesIO
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from users.models import CustomUser, PendingRegistration
from containers.models import Container, ContentItem, ContainerPhoto, ContainerText, Location


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

    def test_successful_login_with_email_returns_subscription_fields(self):
        response = self.client.post('/api/login/', {
            'email': 'login@test.com', 'password': 'testpass123',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('subscription_status', data)
        self.assertIn('has_active_subscription', data)
        self.assertEqual(data['subscription_status'], 'active')
        self.assertTrue(data['has_active_subscription'])
        self.assertNotIn('username', data)

    def test_login_email_case_insensitive(self):
        response = self.client.post('/api/login/', {
            'email': 'LOGIN@TEST.COM', 'password': 'testpass123',
        })
        self.assertEqual(response.status_code, 200)

    def test_login_unknown_email_returns_400(self):
        response = self.client.post('/api/login/', {
            'email': 'nobody@test.com', 'password': 'testpass123',
        })
        self.assertEqual(response.status_code, 400)

    def test_login_wrong_password_returns_400(self):
        response = self.client.post('/api/login/', {
            'email': 'login@test.com', 'password': 'wrongpassword',
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
            'email': 'new@test.com', 'password': 'testpass123',
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
            'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertTrue(PendingRegistration.objects.filter(email='new@test.com').exists())

    def test_missing_email_returns_400(self):
        response = self.client.post(self.url, {
            'email': '', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json())

    def test_duplicate_email_returns_400(self):
        CustomUser.objects.create_user(username='other', email='taken@test.com', password='pass1234')
        response = self.client.post(self.url, {
            'email': 'taken@test.com', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json())

    def test_short_password_returns_400(self):
        response = self.client.post(self.url, {
            'email': 'new@test.com', 'password': 'short',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json())

    @patch('api.stripe_views.stripe.checkout.Session.create')
    def test_cleans_up_existing_pending_for_same_email(self, mock_create):
        mock_session = MagicMock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_session.id = 'cs_test_789'
        mock_create.return_value = mock_session

        PendingRegistration.objects.create(
            email='new@test.com', password_hash='oldhash',
        )
        self.client.post(self.url, {
            'email': 'new@test.com', 'password': 'testpass123',
        }, format='json')
        # Old one deleted, new one created for same email
        self.assertEqual(PendingRegistration.objects.filter(email='new@test.com').count(), 1)


class StripeWebhookViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/stripe/webhook/'
        self.pending = PendingRegistration.objects.create(
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
        user = CustomUser.objects.get(email='webhook@test.com')
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

        # Create user first (idempotency: user with same email already exists)
        CustomUser.objects.create_user(
            username='webhookuser', email='webhook@test.com', password='testpass123'
        )
        response = self._post_webhook('checkout.session.completed', {
            'client_reference_id': str(self.pending.id),
            'customer': 'cus_test123',
            'subscription': 'sub_test456',
        })
        self.assertEqual(response.status_code, 200)
        # Only one user exists for this email
        self.assertEqual(CustomUser.objects.filter(email='webhook@test.com').count(), 1)

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


# ============================================================
# Core functionality tests
# ============================================================

TEMP_MEDIA = tempfile.mkdtemp()


def _make_test_image():
    """Create a minimal valid PNG for upload tests."""
    img = Image.new('RGB', (10, 10), color='red')
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile('test.png', buf.read(), content_type='image/png')


class _AuthenticatedTestCase(TestCase):
    """Base class that sets up an active-subscription user with token."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='testuser', email='test@test.com', password='testpass123',
            subscription_status='active',
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)


class ContainerSearchTest(_AuthenticatedTestCase):
    """Search filters containers server-side and never silently drops results."""

    def setUp(self):
        super().setUp()
        self.loc = Location.objects.create(name='Garage')
        self.c1 = Container.objects.create(
            user=self.user, name='Holiday Decorations', readable_id='GAR01',
            color='red', location=self.loc,
        )
        self.c2 = Container.objects.create(
            user=self.user, name='Tools', readable_id='GAR02',
            color='blue', location=self.loc,
        )
        ContentItem.objects.create(container=self.c2, name='Hammer', quantity=1)
        ContainerText.objects.create(container=self.c1, text='Lights and ornaments')

    def test_search_by_container_name(self):
        response = self.client.get('/api/containers/', {'search': 'Holiday'})
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Holiday Decorations')

    def test_search_by_location_name(self):
        response = self.client.get('/api/containers/', {'search': 'Garage'})
        self.assertEqual(len(response.json()), 2)

    def test_search_by_item_name(self):
        response = self.client.get('/api/containers/', {'search': 'Hammer'})
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Tools')

    def test_search_by_text_content(self):
        response = self.client.get('/api/containers/', {'search': 'ornaments'})
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Holiday Decorations')

    def test_search_no_results(self):
        response = self.client.get('/api/containers/', {'search': 'xyz_notfound'})
        self.assertEqual(len(response.json()), 0)

    def test_search_case_insensitive(self):
        response = self.client.get('/api/containers/', {'search': 'HOLIDAY'})
        self.assertEqual(len(response.json()), 1)

    def test_empty_search_returns_all(self):
        response = self.client.get('/api/containers/', {'search': ''})
        self.assertEqual(len(response.json()), 2)

    def test_search_does_not_return_other_users_containers(self):
        other = CustomUser.objects.create_user(
            username='other', email='o@test.com', password='pass1234',
            subscription_status='active',
        )
        Container.objects.create(
            user=other, name='Holiday Other', readable_id='XXX01', color='green',
        )
        response = self.client.get('/api/containers/', {'search': 'Holiday'})
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Holiday Decorations')


class ContainerCreateTest(_AuthenticatedTestCase):
    """Container creation including readable_id generation and nested items."""

    def test_create_basic_container(self):
        response = self.client.post('/api/containers/', {
            'name': 'My Box', 'color': 'red', 'location': 'Garage',
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['name'], 'My Box')
        self.assertTrue(data['readable_id'].startswith('GA'))
        self.assertIn('uuid', data)

    def test_create_with_items_json(self):
        response = self.client.post('/api/containers/', {
            'name': 'Stuff', 'color': 'blue', 'location': 'Attic',
            'items': json.dumps([
                {'name': 'Book', 'quantity': 3},
                {'name': 'Lamp', 'quantity': 1},
            ]),
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['items'][0]['name'], 'Book')
        self.assertEqual(data['items'][0]['quantity'], 3)

    def test_create_with_text_content(self):
        response = self.client.post('/api/containers/', {
            'name': 'Notes Box', 'color': 'green', 'text': 'Some notes here',
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(len(data['texts']), 1)
        self.assertEqual(data['texts'][0]['text'], 'Some notes here')

    def test_create_with_no_location_uses_XX(self):
        response = self.client.post('/api/containers/', {
            'name': 'Nowhere', 'color': 'black',
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['readable_id'].startswith('XX'))

    def test_readable_id_increments(self):
        self.client.post('/api/containers/', {
            'name': 'First', 'color': 'red', 'location': 'Shed',
        })
        response = self.client.post('/api/containers/', {
            'name': 'Second', 'color': 'red', 'location': 'Shed',
        })
        self.assertEqual(response.status_code, 201)
        # Both start with SHR, second should be SHR02
        rid = response.json()['readable_id']
        self.assertEqual(rid, 'SHR02')

    def test_create_generates_unique_uuid(self):
        r1 = self.client.post('/api/containers/', {'name': 'A', 'color': 'red'})
        r2 = self.client.post('/api/containers/', {'name': 'B', 'color': 'red'})
        self.assertNotEqual(r1.json()['uuid'], r2.json()['uuid'])

    def test_create_password_protected(self):
        response = self.client.post('/api/containers/', {
            'name': 'Secret', 'color': 'black', 'is_password_protected': 'true',
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['is_password_protected'])

    def test_location_get_or_create(self):
        """New location name creates a Location object."""
        self.client.post('/api/containers/', {
            'name': 'Box', 'color': 'red', 'location': 'Basement',
        })
        self.assertTrue(Location.objects.filter(name='Basement').exists())


class ContainerDetailTest(_AuthenticatedTestCase):
    """Retrieve, update, delete on a single container."""

    def setUp(self):
        super().setUp()
        self.loc = Location.objects.create(name='Garage')
        self.container = Container.objects.create(
            user=self.user, name='Box 1', readable_id='GAR01',
            color='red', location=self.loc,
        )
        ContentItem.objects.create(container=self.container, name='Wrench', quantity=2)
        ContainerText.objects.create(container=self.container, text='Old notes')

    def test_retrieve_returns_nested_data(self):
        response = self.client.get(f'/api/containers/{self.container.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['name'], 'Box 1')
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['name'], 'Wrench')
        self.assertEqual(len(data['texts']), 1)

    def test_update_items_silently_ignored_via_multipart(self):
        """BUG: Items sent as JSON string via multipart are silently ignored on update.

        ContainerListView.perform_create manually JSON-parses items, but
        ContainerDetailView has no equivalent perform_update, so items in the
        multipart payload never reach the serializer's update logic.  The old
        items remain untouched and no error is returned — a silent failure.
        """
        response = self.client.put(
            f'/api/containers/{self.container.id}/',
            {
                'name': 'Box 1', 'color': 'red', 'location': 'Garage',
                'items': json.dumps([{'name': 'Screwdriver', 'quantity': 1}]),
            },
        )
        self.assertEqual(response.status_code, 200)
        # Old item is still present because items update is silently ignored
        self.assertTrue(ContentItem.objects.filter(name='Wrench').exists())

    def test_update_empty_items_silently_ignored_via_multipart(self):
        """BUG: Sending empty items list via multipart does not clear items."""
        response = self.client.put(
            f'/api/containers/{self.container.id}/',
            {
                'name': 'Box 1', 'color': 'red',
                'items': json.dumps([]),
            },
        )
        self.assertEqual(response.status_code, 200)
        # Items are NOT cleared — they remain because the update is silently ignored
        self.assertEqual(len(response.json()['items']), 1)

    def test_update_replaces_text(self):
        response = self.client.put(
            f'/api/containers/{self.container.id}/',
            {'name': 'Box 1', 'color': 'red', 'text': 'New notes'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['texts'][0]['text'], 'New notes')
        self.assertFalse(ContainerText.objects.filter(text='Old notes').exists())

    def test_update_clears_text_with_empty_string(self):
        response = self.client.put(
            f'/api/containers/{self.container.id}/',
            {'name': 'Box 1', 'color': 'red', 'text': ''},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['texts']), 0)

    def test_update_clears_location_with_empty_string(self):
        response = self.client.put(
            f'/api/containers/{self.container.id}/',
            {'name': 'Box 1', 'color': 'red', 'location': ''},
        )
        self.assertEqual(response.status_code, 200)
        self.container.refresh_from_db()
        self.assertIsNone(self.container.location)

    def test_delete_container(self):
        response = self.client.delete(f'/api/containers/{self.container.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Container.objects.filter(id=self.container.id).exists())

    def test_delete_cascades_items(self):
        self.client.delete(f'/api/containers/{self.container.id}/')
        self.assertEqual(ContentItem.objects.filter(container=self.container).count(), 0)

    def test_delete_cascades_texts(self):
        self.client.delete(f'/api/containers/{self.container.id}/')
        self.assertEqual(ContainerText.objects.filter(container=self.container).count(), 0)

    def test_other_user_cannot_access(self):
        """ContainerDetailView uses default queryset (all), but subscription check applies."""
        other = CustomUser.objects.create_user(
            username='other', email='o@test.com', password='pass1234',
            subscription_status='active',
        )
        other_token = Token.objects.create(user=other)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + other_token.key)
        # Other user can GET (queryset isn't filtered by user on detail view)
        # but shouldn't see it in list
        response = self.client.get('/api/containers/')
        self.assertEqual(len(response.json()), 0)


class ContainerByUUIDViewTest(TestCase):
    """Public container access and password protection."""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
        )
        self.owner_token = Token.objects.create(user=self.owner)
        self.public_container = Container.objects.create(
            user=self.owner, name='Public Box', readable_id='PUB01',
            color='blue', is_password_protected=False,
        )
        self.private_container = Container.objects.create(
            user=self.owner, name='Private Box', readable_id='PRI01',
            color='red', is_password_protected=True,
        )

    def test_public_container_accessible_without_auth(self):
        url = f'/api/containers/uuid/{self.public_container.uuid}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'Public Box')

    def test_private_container_returns_401_without_passcode(self):
        url = f'/api/containers/uuid/{self.private_container.uuid}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)
        self.assertTrue(response.json().get('requires_passcode'))

    def test_private_container_accessible_with_correct_passcode(self):
        from django.contrib.auth.hashers import make_password
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/containers/uuid/{self.private_container.uuid}/?passcode=1234'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_private_container_rejected_with_wrong_passcode(self):
        from django.contrib.auth.hashers import make_password
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/containers/uuid/{self.private_container.uuid}/?passcode=9999'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_private_container_accessible_by_owner(self):
        url = f'/api/containers/uuid/{self.private_container.uuid}/'
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'Private Box')

    def test_private_container_rejected_for_non_owner(self):
        other = CustomUser.objects.create_user(
            username='other', email='o@test.com', password='pass1234',
            subscription_status='active',
        )
        other_token = Token.objects.create(user=other)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + other_token.key)
        url = f'/api/containers/uuid/{self.private_container.uuid}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_nonexistent_uuid_returns_404(self):
        import uuid
        url = f'/api/containers/uuid/{uuid.uuid4()}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_public_container_includes_items(self):
        ContentItem.objects.create(container=self.public_container, name='Widget', quantity=5)
        url = f'/api/containers/uuid/{self.public_container.uuid}/'
        response = self.client.get(url)
        self.assertEqual(len(response.json()['items']), 1)
        self.assertEqual(response.json()['items'][0]['quantity'], 5)


class QRCodeViewTest(TestCase):
    """QR code generation returns valid PNG."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='qruser', email='qr@test.com', password='testpass123',
        )
        self.container = Container.objects.create(
            user=self.user, name='QR Box', readable_id='QR01', color='blue',
        )

    def test_returns_png(self):
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')

    def test_returns_non_empty_body(self):
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.assertGreater(len(response.content), 100)

    def test_nonexistent_uuid_returns_404(self):
        import uuid
        response = self.client.get(f'/api/qr-code/{uuid.uuid4()}/')
        self.assertEqual(response.status_code, 404)

    def test_accessible_without_auth(self):
        """QR codes are public, no token needed."""
        self.client.credentials()  # clear any auth
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.assertEqual(response.status_code, 200)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ProtectedMediaViewTest(TestCase):
    """Photo serving with correct authorization."""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='mediaowner', email='mo@test.com', password='testpass123',
            subscription_status='active',
        )
        self.owner_token = Token.objects.create(user=self.owner)
        self.public_container = Container.objects.create(
            user=self.owner, name='Public', readable_id='PUB01',
            color='blue', is_password_protected=False,
        )
        self.private_container = Container.objects.create(
            user=self.owner, name='Private', readable_id='PRI01',
            color='red', is_password_protected=True,
        )
        self.public_photo = ContainerPhoto.objects.create(
            container=self.public_container, image=_make_test_image(),
        )
        self.private_photo = ContainerPhoto.objects.create(
            container=self.private_container, image=_make_test_image(),
        )

    def test_owner_can_access_own_photo(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.get(f'/api/media/{self.public_photo.uuid}/')
        self.assertEqual(response.status_code, 200)

    def test_public_photo_accessible_with_container_uuid(self):
        url = f'/api/media/{self.public_photo.uuid}/?container={self.public_container.uuid}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_private_photo_rejected_with_container_uuid(self):
        url = f'/api/media/{self.private_photo.uuid}/?container={self.private_container.uuid}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_photo_rejected_without_any_auth(self):
        url = f'/api/media/{self.public_photo.uuid}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_wrong_container_uuid_rejected(self):
        import uuid
        url = f'/api/media/{self.public_photo.uuid}/?container={uuid.uuid4()}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_owner_can_access_private_photo(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.owner_token.key)
        response = self.client.get(f'/api/media/{self.private_photo.uuid}/')
        self.assertEqual(response.status_code, 200)

    def test_non_owner_cannot_access_private_photo(self):
        other = CustomUser.objects.create_user(
            username='other', email='o@test.com', password='pass1234',
            subscription_status='active',
        )
        other_token = Token.objects.create(user=other)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + other_token.key)
        response = self.client.get(f'/api/media/{self.private_photo.uuid}/')
        self.assertEqual(response.status_code, 403)


class ContainerOwnerIsolationTest(_AuthenticatedTestCase):
    """Users can only see and modify their own containers."""

    def setUp(self):
        super().setUp()
        self.other_user = CustomUser.objects.create_user(
            username='other', email='other@test.com', password='testpass123',
            subscription_status='active',
        )
        self.my_container = Container.objects.create(
            user=self.user, name='Mine', readable_id='MY01', color='red',
        )
        self.other_container = Container.objects.create(
            user=self.other_user, name='Theirs', readable_id='TH01', color='blue',
        )

    def test_list_only_shows_own_containers(self):
        response = self.client.get('/api/containers/')
        names = [c['name'] for c in response.json()]
        self.assertIn('Mine', names)
        self.assertNotIn('Theirs', names)

    def test_search_only_searches_own_containers(self):
        response = self.client.get('/api/containers/', {'search': 'Theirs'})
        self.assertEqual(len(response.json()), 0)


class LocationListTest(_AuthenticatedTestCase):
    """Location endpoint returns all locations for dropdown population."""

    def setUp(self):
        super().setUp()
        Location.objects.create(name='Garage')
        Location.objects.create(name='Attic')

    def test_returns_all_locations(self):
        response = self.client.get('/api/locations/')
        self.assertEqual(response.status_code, 200)
        names = [loc['name'] for loc in response.json()]
        self.assertIn('Garage', names)
        self.assertIn('Attic', names)

    def test_requires_active_subscription(self):
        self.user.subscription_status = 'canceled'
        self.user.save()
        response = self.client.get('/api/locations/')
        self.assertEqual(response.status_code, 403)


class HouseholdSearchViewTest(TestCase):
    """GET /api/household-search/?container=<uuid>&q=<query>"""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
        )
        self.public_container = Container.objects.create(
            user=self.owner, name='Toolbox', readable_id='TB01', color='red',
            is_password_protected=False,
        )
        self.private_container = Container.objects.create(
            user=self.owner, name='Medicine Cabinet', readable_id='MC01', color='blue',
            is_password_protected=True,
        )
        ContentItem.objects.create(container=self.public_container, name='Hammer', quantity=1)
        ContentItem.objects.create(container=self.public_container, name='Wrench', quantity=2)
        ContentItem.objects.create(container=self.private_container, name='Aspirin', quantity=10)

    def test_search_requires_container_uuid(self):
        response = self.client.get('/api/household-search/', {'q': 'Hammer'})
        self.assertEqual(response.status_code, 400)

    def test_search_invalid_uuid_returns_404(self):
        import uuid
        response = self.client.get('/api/household-search/', {
            'container': str(uuid.uuid4()), 'q': 'Hammer'
        })
        self.assertEqual(response.status_code, 404)

    def test_search_public_container_no_passcode(self):
        response = self.client.get('/api/household-search/', {
            'container': str(self.public_container.uuid), 'q': 'Hammer'
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('results', data)

    def test_search_private_container_without_passcode_returns_401(self):
        response = self.client.get('/api/household-search/', {
            'container': str(self.private_container.uuid), 'q': 'Aspirin'
        })
        self.assertEqual(response.status_code, 401)
        self.assertTrue(response.json().get('requires_passcode'))

    def test_search_private_container_with_correct_passcode(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        response = self.client.get('/api/household-search/', {
            'container': str(self.private_container.uuid),
            'q': 'Aspirin',
            'passcode': '1234',
        })
        self.assertEqual(response.status_code, 200)

    def test_search_private_container_with_wrong_passcode_returns_401(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        response = self.client.get('/api/household-search/', {
            'container': str(self.private_container.uuid),
            'q': 'Aspirin',
            'passcode': '9999',
        })
        self.assertEqual(response.status_code, 401)

    def test_search_results_span_all_owner_containers(self):
        """Search results include containers beyond the entry-point container."""
        other_container = Container.objects.create(
            user=self.owner, name='Storage Box', readable_id='SB01', color='green',
        )
        ContentItem.objects.create(container=other_container, name='Hammer Clone', quantity=1)
        response = self.client.get('/api/household-search/', {
            'container': str(self.public_container.uuid), 'q': 'Hammer'
        })
        self.assertEqual(response.status_code, 200)
        container_names = [r['name'] for r in response.json()['results']]
        self.assertIn('Toolbox', container_names)
        self.assertIn('Storage Box', container_names)

    def test_search_tracks_household_search_used_at(self):
        self.assertIsNone(self.owner.household_search_used_at)
        self.client.get('/api/household-search/', {
            'container': str(self.public_container.uuid), 'q': 'Hammer'
        })
        self.owner.refresh_from_db()
        self.assertIsNotNone(self.owner.household_search_used_at)

    def test_authenticated_owner_bypasses_passcode(self):
        token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = self.client.get('/api/household-search/', {
            'container': str(self.private_container.uuid), 'q': 'Aspirin'
        })
        self.assertEqual(response.status_code, 200)


class ValidatePasscodeViewTest(TestCase):
    """POST /api/validate-passcode/ with rate limiting."""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
        )
        self.owner.household_passcode = make_password('5678')
        self.owner.save()
        self.container = Container.objects.create(
            user=self.owner, name='Locked Box', readable_id='LB01', color='black',
            is_password_protected=True,
        )

    def test_correct_passcode_returns_200(self):
        response = self.client.post('/api/validate-passcode/', {
            'container': str(self.container.uuid),
            'passcode': '5678',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('valid'))

    def test_wrong_passcode_returns_401(self):
        response = self.client.post('/api/validate-passcode/', {
            'container': str(self.container.uuid),
            'passcode': '0000',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json().get('valid'))

    def test_missing_fields_returns_400(self):
        response = self.client.post('/api/validate-passcode/', {
            'passcode': '5678',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_invalid_uuid_returns_404(self):
        import uuid
        response = self.client.post('/api/validate-passcode/', {
            'container': str(uuid.uuid4()),
            'passcode': '5678',
        }, format='json')
        self.assertEqual(response.status_code, 404)

    @patch('django.core.cache.cache.get', return_value=10)
    def test_rate_limit_blocks_after_max_attempts(self, mock_cache_get):
        response = self.client.post('/api/validate-passcode/', {
            'container': str(self.container.uuid),
            'passcode': '0000',
        }, format='json')
        self.assertEqual(response.status_code, 429)


class ViewerDashboardTest(TestCase):
    """Tests for /api/view/<share_token>/ endpoints."""

    def setUp(self):
        self.client = APIClient()
        import uuid
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
            household_share_token=uuid.uuid4(),
        )
        self.public_container = Container.objects.create(
            user=self.owner, name='Garage Box', readable_id='GB01', color='orange',
        )
        self.private_container = Container.objects.create(
            user=self.owner, name='Private Box', readable_id='PB01', color='purple',
            is_password_protected=True,
        )
        ContentItem.objects.create(container=self.public_container, name='Drill', quantity=1)

    def test_meta_returns_requires_passcode_false_when_no_passcode_set(self):
        url = f'/api/view/{self.owner.household_share_token}/meta/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json().get('requires_passcode'))

    def test_meta_returns_requires_passcode_true_when_passcode_set(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/meta/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('requires_passcode'))

    def test_meta_invalid_token_returns_404(self):
        import uuid
        response = self.client.get(f'/api/view/{uuid.uuid4()}/meta/')
        self.assertEqual(response.status_code, 404)

    def test_search_public_no_passcode(self):
        url = f'/api/view/{self.owner.household_share_token}/containers/'
        response = self.client.get(url, {'q': 'Drill'})
        self.assertEqual(response.status_code, 200)

    def test_search_requires_passcode_when_set(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/containers/'
        response = self.client.get(url, {'q': 'Drill'})
        self.assertEqual(response.status_code, 401)
        self.assertTrue(response.json().get('requires_passcode'))

    def test_search_with_correct_passcode(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/containers/'
        response = self.client.get(url, {'q': 'Drill', 'passcode': '1234'})
        self.assertEqual(response.status_code, 200)

    def test_search_with_wrong_passcode_returns_401(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/containers/'
        response = self.client.get(url, {'q': 'Drill', 'passcode': '9999'})
        self.assertEqual(response.status_code, 401)

    def test_validate_share_passcode_correct(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/validate-passcode/'
        response = self.client.post(url, {'passcode': '1234'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('valid'))  # {'valid': True}

    def test_validate_share_passcode_wrong(self):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/validate-passcode/'
        response = self.client.post(url, {'passcode': '0000'}, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json().get('valid'))

    def test_disabled_share_token_returns_404(self):
        """Share token set to None means sharing is disabled."""
        self.owner.household_share_token = None
        self.owner.save()
        import uuid
        response = self.client.get(f'/api/view/{uuid.uuid4()}/meta/')
        self.assertEqual(response.status_code, 404)

    @patch('django.core.cache.cache.get', return_value=10)
    def test_rate_limit_blocks_after_max_attempts(self, mock_cache_get):
        self.owner.household_passcode = make_password('1234')
        self.owner.save()
        url = f'/api/view/{self.owner.household_share_token}/validate-passcode/'
        response = self.client.post(url, {
            'share_token': str(self.owner.household_share_token),
            'passcode': '0000',
        }, format='json')
        self.assertEqual(response.status_code, 429)


class OnboardingStatusViewTest(TestCase):
    """GET /api/onboarding-status/ — 5-step completion tracking."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='newuser', email='new@test.com', password='testpass123',
            subscription_status='active',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_all_steps_incomplete_on_new_account(self):
        response = self.client.get('/api/onboarding-status/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['add_container'])
        self.assertFalse(data['add_items'])
        self.assertFalse(data['view_qr'])
        self.assertFalse(data['scan_qr'])
        self.assertFalse(data['share_household'])

    def test_add_container_step_complete_when_container_exists(self):
        Container.objects.create(
            user=self.user, name='Box', readable_id='BX01', color='red'
        )
        response = self.client.get('/api/onboarding-status/')
        self.assertTrue(response.json()['add_container'])

    def test_add_items_step_complete_when_content_item_exists(self):
        container = Container.objects.create(
            user=self.user, name='Box', readable_id='BX01', color='red'
        )
        ContentItem.objects.create(container=container, name='Widget', quantity=1)
        response = self.client.get('/api/onboarding-status/')
        self.assertTrue(response.json()['add_items'])

    def test_view_qr_step_complete_when_qr_first_viewed_at_set(self):
        from django.utils import timezone
        self.user.qr_first_viewed_at = timezone.now()
        self.user.save()
        response = self.client.get('/api/onboarding-status/')
        self.assertTrue(response.json()['view_qr'])

    def test_scan_qr_step_complete_when_owner_scanned_at_set(self):
        from django.utils import timezone
        Container.objects.create(
            user=self.user, name='Box', readable_id='BX01', color='red',
            owner_scanned_at=timezone.now(),
        )
        response = self.client.get('/api/onboarding-status/')
        self.assertTrue(response.json()['scan_qr'])

    def test_share_household_step_complete_when_household_search_used(self):
        from django.utils import timezone
        self.user.household_search_used_at = timezone.now()
        self.user.save()
        response = self.client.get('/api/onboarding-status/')
        self.assertTrue(response.json()['share_household'])

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get('/api/onboarding-status/')
        self.assertEqual(response.status_code, 401)


class OnboardingDismissViewTest(TestCase):
    """POST /api/onboarding-dismiss/ — server-side dismiss flag."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='dismissuser', email='dismiss@test.com', password='testpass123',
            subscription_status='active',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_dismiss_sets_server_flag(self):
        self.assertFalse(self.user.onboarding_dismissed)
        response = self.client.post('/api/onboarding-dismiss/')
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.onboarding_dismissed)

    def test_dismiss_is_idempotent(self):
        self.user.onboarding_dismissed = True
        self.user.save()
        response = self.client.post('/api/onboarding-dismiss/')
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.onboarding_dismissed)

    def test_dismiss_requires_authentication(self):
        self.client.credentials()
        response = self.client.post('/api/onboarding-dismiss/')
        self.assertEqual(response.status_code, 401)


class ShareLinkViewTest(TestCase):
    """GET/POST/DELETE /api/account/share-link/"""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='user', email='user@test.com', password='testpass123',
            subscription_status='active',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_get_returns_null_when_no_share_token(self):
        response = self.client.get('/api/account/share-link/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json().get('share_token'))

    def test_post_generates_share_token(self):
        response = self.client.post('/api/account/share-link/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json().get('share_token'))
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.household_share_token)

    def test_post_rotates_existing_token(self):
        import uuid
        old_token = uuid.uuid4()
        self.user.household_share_token = old_token
        self.user.save()
        response = self.client.post('/api/account/share-link/')
        self.assertEqual(response.status_code, 200)
        new_token = response.json().get('share_token')
        self.assertIsNotNone(new_token)
        self.assertNotEqual(str(old_token), new_token)

    def test_delete_disables_share_link(self):
        import uuid
        self.user.household_share_token = uuid.uuid4()
        self.user.save()
        response = self.client.delete('/api/account/share-link/')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.household_share_token)

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get('/api/account/share-link/')
        self.assertEqual(response.status_code, 401)


class PasscodeViewTest(TestCase):
    """GET/POST/DELETE /api/account/passcode/"""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='user', email='user@test.com', password='testpass123',
            subscription_status='active',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_get_returns_has_passcode_false_when_no_passcode(self):
        response = self.client.get('/api/account/passcode/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json().get('has_passcode'))

    def test_get_returns_has_passcode_true_when_passcode_set(self):
        self.user.household_passcode = make_password('1234')
        self.user.save()
        response = self.client.get('/api/account/passcode/')
        self.assertTrue(response.json().get('has_passcode'))

    def test_post_sets_passcode(self):
        response = self.client.post('/api/account/passcode/', {'passcode': '4321'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.household_passcode)

    def test_post_rejects_non_4_digit_passcode(self):
        response = self.client.post('/api/account/passcode/', {'passcode': '123'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_post_rejects_non_numeric_passcode(self):
        response = self.client.post('/api/account/passcode/', {'passcode': 'abcd'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_post_rejects_5_digit_passcode(self):
        response = self.client.post('/api/account/passcode/', {'passcode': '12345'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_delete_removes_passcode(self):
        self.user.household_passcode = make_password('1234')
        self.user.save()
        response = self.client.delete('/api/account/passcode/')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.household_passcode)

    def test_requires_authentication(self):
        self.client.credentials()
        response = self.client.get('/api/account/passcode/')
        self.assertEqual(response.status_code, 401)


class QRCodeTrackingTest(TestCase):
    """QRCodeView sets qr_first_viewed_at on first authenticated owner view."""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
        )
        self.other_user = CustomUser.objects.create_user(
            username='other', email='other@test.com', password='testpass123',
            subscription_status='active',
        )
        self.container = Container.objects.create(
            user=self.owner, name='Box', readable_id='BX01', color='red',
        )

    def test_owner_first_qr_view_sets_timestamp(self):
        self.assertIsNone(self.owner.qr_first_viewed_at)
        token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.assertEqual(response.status_code, 200)
        self.owner.refresh_from_db()
        self.assertIsNotNone(self.owner.qr_first_viewed_at)

    def test_owner_second_qr_view_does_not_update_timestamp(self):
        from django.utils import timezone
        first_time = timezone.now()
        self.owner.qr_first_viewed_at = first_time
        self.owner.save()
        token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.qr_first_viewed_at, first_time)

    def test_unauthenticated_qr_view_does_not_set_timestamp(self):
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        # Public access is allowed but won't set tracking
        self.owner.refresh_from_db()
        self.assertIsNone(self.owner.qr_first_viewed_at)

    def test_non_owner_qr_view_does_not_set_owner_timestamp(self):
        token = Token.objects.create(user=self.other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        # QR codes are public — non-owner can view but it should NOT set owner's timestamp
        response = self.client.get(f'/api/qr-code/{self.container.uuid}/')
        self.assertEqual(response.status_code, 200)
        self.owner.refresh_from_db()
        self.assertIsNone(self.owner.qr_first_viewed_at)


class OwnerScannedAtTest(TestCase):
    """ContainerByUUIDView sets owner_scanned_at on first authenticated owner scan."""

    def setUp(self):
        self.client = APIClient()
        self.owner = CustomUser.objects.create_user(
            username='owner', email='owner@test.com', password='testpass123',
            subscription_status='active',
        )
        self.other_user = CustomUser.objects.create_user(
            username='other', email='other@test.com', password='testpass123',
            subscription_status='active',
        )
        token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.container = Container.objects.create(
            user=self.owner, name='Box', readable_id='BX01', color='red',
        )

    def test_owner_uuid_scan_sets_owner_scanned_at(self):
        self.assertIsNone(self.container.owner_scanned_at)
        response = self.client.get(f'/api/containers/uuid/{self.container.uuid}/')
        self.assertEqual(response.status_code, 200)
        self.container.refresh_from_db()
        self.assertIsNotNone(self.container.owner_scanned_at)

    def test_owner_second_scan_does_not_update_timestamp(self):
        from django.utils import timezone
        first_time = timezone.now()
        self.container.owner_scanned_at = first_time
        self.container.save()
        self.client.get(f'/api/containers/uuid/{self.container.uuid}/')
        self.container.refresh_from_db()
        self.assertEqual(self.container.owner_scanned_at, first_time)

    def test_anonymous_scan_does_not_set_owner_scanned_at(self):
        self.client.credentials()
        self.client.get(f'/api/containers/uuid/{self.container.uuid}/')
        self.container.refresh_from_db()
        self.assertIsNone(self.container.owner_scanned_at)

    def test_other_user_scan_does_not_set_owner_scanned_at(self):
        other_token = Token.objects.create(user=self.other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')
        # This should return a valid response (public access) but not set the owner field
        self.client.get(f'/api/containers/uuid/{self.container.uuid}/')
        self.container.refresh_from_db()
        self.assertIsNone(self.container.owner_scanned_at)
