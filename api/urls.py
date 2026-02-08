from django.urls import path
from . import views
from .stripe_views import (
    CreateCheckoutSessionView,
    StripeWebhookView,
    SubscriptionStatusView,
    VerifyCheckoutSessionView,
)

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    path('containers/', views.ContainerListView.as_view(), name='container-list'),
    path('containers/<int:pk>/', views.ContainerDetailView.as_view(), name='container-detail'),
    path('containers/uuid/<uuid:uuid>/', views.ContainerByUUIDView.as_view(), name='container-by-uuid'),
    path('locations/', views.LocationListView.as_view(), name='location-list'),
    path('qr-code/<uuid:uuid>/', views.QRCodeView.as_view(), name='qr-code'),
    path('media/<uuid:photo_uuid>/', views.ProtectedMediaView.as_view(), name='protected-media'),

    # Stripe
    path('stripe/create-checkout-session/', CreateCheckoutSessionView.as_view(), name='stripe-create-checkout'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('stripe/subscription-status/', SubscriptionStatusView.as_view(), name='stripe-subscription-status'),
    path('stripe/verify-session/', VerifyCheckoutSessionView.as_view(), name='stripe-verify-session'),
]
