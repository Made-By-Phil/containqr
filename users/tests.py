from django.test import TestCase
from django.contrib.auth.hashers import make_password
from users.models import CustomUser, PendingRegistration


class CustomUserSubscriptionTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )

    def test_active_subscription_returns_true(self):
        self.user.subscription_status = 'active'
        self.assertTrue(self.user.has_active_subscription)

    def test_past_due_subscription_returns_true(self):
        self.user.subscription_status = 'past_due'
        self.assertTrue(self.user.has_active_subscription)

    def test_canceled_subscription_returns_false(self):
        self.user.subscription_status = 'canceled'
        self.assertFalse(self.user.has_active_subscription)

    def test_unpaid_subscription_returns_false(self):
        self.user.subscription_status = 'unpaid'
        self.assertFalse(self.user.has_active_subscription)

    def test_incomplete_subscription_returns_false(self):
        self.user.subscription_status = 'incomplete'
        self.assertFalse(self.user.has_active_subscription)

    def test_default_subscription_status_is_incomplete(self):
        self.assertEqual(self.user.subscription_status, 'incomplete')
        self.assertFalse(self.user.has_active_subscription)

    def test_stripe_fields_can_be_set(self):
        self.user.stripe_customer_id = 'cus_test123'
        self.user.stripe_subscription_id = 'sub_test456'
        self.user.subscription_status = 'active'
        self.user.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, 'cus_test123')
        self.assertEqual(self.user.stripe_subscription_id, 'sub_test456')
        self.assertEqual(self.user.subscription_status, 'active')


class PendingRegistrationTest(TestCase):
    def test_create_pending_registration(self):
        pending = PendingRegistration.objects.create(
            username='newuser',
            email='new@example.com',
            password_hash=make_password('testpass123'),
        )
        self.assertIsNotNone(pending.id)
        self.assertIsNotNone(pending.created_at)
        self.assertEqual(pending.username, 'newuser')
        self.assertEqual(pending.email, 'new@example.com')

    def test_uuid_primary_key_auto_generated(self):
        pending = PendingRegistration.objects.create(
            username='user1', email='u1@example.com', password_hash='hash1'
        )
        pending2 = PendingRegistration.objects.create(
            username='user2', email='u2@example.com', password_hash='hash2'
        )
        self.assertNotEqual(pending.id, pending2.id)

    def test_checkout_session_id_unique(self):
        PendingRegistration.objects.create(
            username='user1', email='u1@example.com',
            password_hash='hash1', stripe_checkout_session_id='cs_123'
        )
        with self.assertRaises(Exception):
            PendingRegistration.objects.create(
                username='user2', email='u2@example.com',
                password_hash='hash2', stripe_checkout_session_id='cs_123'
            )
