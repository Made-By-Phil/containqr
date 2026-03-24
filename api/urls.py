from django.urls import path
from . import views
from .stripe_views import (
    CreateCheckoutSessionView,
    StripeWebhookView,
    SubscriptionStatusView,
    VerifyCheckoutSessionView,
)

urlpatterns = [
    # Auth
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),

    # Containers (authenticated owner)
    path('containers/', views.ContainerListView.as_view(), name='container-list'),
    path('containers/<int:pk>/', views.ContainerDetailView.as_view(), name='container-detail'),
    path('containers/uuid/<uuid:uuid>/', views.ContainerByUUIDView.as_view(), name='container-by-uuid'),

    # Locations
    path('locations/', views.LocationListView.as_view(), name='location-list'),

    # QR code + media
    path('qr-code/<uuid:uuid>/', views.QRCodeView.as_view(), name='qr-code'),
    path('media/<uuid:photo_uuid>/', views.ProtectedMediaView.as_view(), name='protected-media'),

    # Household sharing (public, no auth)
    path('household-search/', views.HouseholdSearchView.as_view(), name='household-search'),
    path('validate-passcode/', views.ValidatePasscodeView.as_view(), name='validate-passcode'),
    path('view/<uuid:share_token>/containers/', views.ViewerDashboardSearchView.as_view(), name='viewer-search'),
    path('view/<uuid:share_token>/meta/', views.ViewerDashboardMetaView.as_view(), name='viewer-meta'),
    path('view/<uuid:share_token>/validate-passcode/', views.ValidateSharePasscodeView.as_view(), name='viewer-validate-passcode'),

    # Account management (authenticated)
    path('onboarding-status/', views.OnboardingStatusView.as_view(), name='onboarding-status'),
    path('onboarding-dismiss/', views.OnboardingDismissView.as_view(), name='onboarding-dismiss'),
    path('account/share-link/', views.ShareLinkView.as_view(), name='share-link'),
    path('account/passcode/', views.PasscodeView.as_view(), name='passcode'),

    # Stripe
    path('stripe/create-checkout-session/', CreateCheckoutSessionView.as_view(), name='stripe-create-checkout'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('stripe/subscription-status/', SubscriptionStatusView.as_view(), name='stripe-subscription-status'),
    path('stripe/verify-session/', VerifyCheckoutSessionView.as_view(), name='stripe-verify-session'),
]
