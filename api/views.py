import json
import uuid as uuid_lib
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password, check_password
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from io import BytesIO

import qrcode
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import HasActiveSubscription
from .serializers import CustomUserSerializer, ContainerSerializer, LocationSerializer
from containers.models import Container, Location, ContainerPhoto
from users.models import CustomUser


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@method_decorator(csrf_exempt, name='dispatch')
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]


class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_400_BAD_REQUEST)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'subscription_status': user.subscription_status,
            'has_active_subscription': user.has_active_subscription,
        })


class UserLogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Containers (authenticated owner)
# ---------------------------------------------------------------------------

class ContainerListView(generics.ListCreateAPIView):
    serializer_class = ContainerSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [HasActiveSubscription]

    def get_queryset(self):
        queryset = Container.objects.filter(user=self.request.user)
        search_query = self.request.query_params.get('search', None)
        if search_query is not None:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(location__name__icontains=search_query) |
                Q(content_items__name__icontains=search_query) |
                Q(texts__text__icontains=search_query)
            ).distinct()
        return queryset

    def perform_create(self, serializer):
        location_name = self.request.data.get('location', '')
        color = self.request.data.get('color', '')
        location_abbr = location_name[:2].upper() if location_name else 'XX'
        color_abbr = color[:1].upper() if color else ''

        last_container = Container.objects.filter(readable_id__startswith=f'{location_abbr}{color_abbr}').order_by('readable_id').last()
        if last_container:
            last_number = int(last_container.readable_id[3:])
            new_number = last_number + 1
        else:
            new_number = 1

        readable_id = f'{location_abbr}{color_abbr}{new_number:02d}'

        items_data = self.request.data.get('items')
        if items_data:
            items = json.loads(items_data)
            serializer.save(user=self.request.user, readable_id=readable_id, content_items=items)
        else:
            serializer.save(user=self.request.user, readable_id=readable_id)


class ContainerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContainerSerializer
    queryset = Container.objects.all()
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [HasActiveSubscription]


# ---------------------------------------------------------------------------
# Public container view (UUID-based, no auth required)
# ---------------------------------------------------------------------------

def _get_authenticated_owner(request, container):
    """Return the user if the request is authenticated as the container's owner."""
    auth = TokenAuthentication()
    try:
        auth_result = auth.authenticate(request)
        if auth_result:
            user, _ = auth_result
            if container.user == user:
                return user
    except Exception:
        pass
    return None


class ContainerByUUIDView(generics.RetrieveAPIView):
    """Public container view.

    Access rules:
    - Authenticated owner: always allowed, no passcode needed.
    - is_password_protected=False: allowed for everyone.
    - is_password_protected=True: requires ?passcode=<4-digit> matching the
      owner's household_passcode. Returns 401 if missing/wrong.

    Side effects:
    - Sets container.last_accessed for non-owner access.
    - Sets container.owner_scanned_at (first time only) for owner access
      (used for onboarding step 4 tracking).
    """
    serializer_class = ContainerSerializer
    queryset = Container.objects.all()
    lookup_field = 'uuid'
    authentication_classes = []
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        container = self.get_object()
        owner = _get_authenticated_owner(request, container)

        # Authenticated owner: always allowed
        if owner:
            if not container.owner_scanned_at:
                container.owner_scanned_at = timezone.now()
                container.save(update_fields=['owner_scanned_at'])
            serializer = self.get_serializer(container)
            return Response(serializer.data)

        # Non-owner: check passcode gate if protected
        owner_user = container.user
        if container.is_password_protected:
            passcode = request.query_params.get('passcode', '')
            if not owner_user.household_passcode or not check_password(passcode, owner_user.household_passcode):
                return Response(
                    {'detail': 'This container requires a passcode.', 'requires_passcode': True},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Public access — update last_accessed
        container.last_accessed = timezone.now()
        container.save(update_fields=['last_accessed'])
        serializer = self.get_serializer(container)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Household search (public, UUID or share-token gated)
# ---------------------------------------------------------------------------

def _container_search_queryset(owner, query):
    """Return all containers for owner matching query, ordered by name."""
    qs = Container.objects.filter(user=owner)
    if query:
        qs = qs.filter(
            Q(name__icontains=query) |
            Q(location__name__icontains=query) |
            Q(content_items__name__icontains=query) |
            Q(texts__text__icontains=query)
        ).distinct()
    return qs.select_related('location').prefetch_related('content_items')


class HouseholdSearchView(APIView):
    """Search all containers for a household owner.

    Access proof: a valid container UUID belonging to that owner.
    If the entry container is password-protected, the caller must supply
    ?passcode=<4-digit> matching the owner's household_passcode.
    Authenticated owner always bypasses the passcode check.

    GET /api/household-search/?container=<uuid>&q=<query>

    Side effect: sets owner.household_search_used_at on first use.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        container_uuid = request.query_params.get('container', '')
        query = request.query_params.get('q', '')

        if not container_uuid:
            return Response(
                {'detail': 'container query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        container = get_object_or_404(Container, uuid=container_uuid)
        owner = container.user

        # Authenticated owner bypasses passcode check
        authenticated_owner = _get_authenticated_owner(request, container)

        if not authenticated_owner and container.is_password_protected:
            passcode = request.query_params.get('passcode', '')
            if not owner.household_passcode or not check_password(passcode, owner.household_passcode):
                return Response(
                    {'detail': 'This container requires a passcode.', 'requires_passcode': True},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Track first household search use
        if not owner.household_search_used_at:
            owner.household_search_used_at = timezone.now()
            owner.save(update_fields=['household_search_used_at'])

        containers = _container_search_queryset(owner, query)
        serializer = ContainerSerializer(containers, many=True)
        return Response({'results': serializer.data})


class ViewerDashboardSearchView(APIView):
    """Search via shareable link token.

    GET /api/view/<share_token>/containers/?q=<query>

    If the owner has a household_passcode set, the viewer must supply
    ?passcode=<4-digit> (validated once per session client-side via
    sessionStorage; backend validates on each request).
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, share_token):
        owner = get_object_or_404(CustomUser, household_share_token=share_token)
        query = request.query_params.get('q', '')

        # Validate passcode if owner has one set
        if owner.household_passcode:
            passcode = request.query_params.get('passcode', '')
            if not check_password(passcode, owner.household_passcode):
                return Response(
                    {'detail': 'Passcode required.', 'requires_passcode': True},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Track first household search use
        if not owner.household_search_used_at:
            owner.household_search_used_at = timezone.now()
            owner.save(update_fields=['household_search_used_at'])

        containers = _container_search_queryset(owner, query)
        serializer = ContainerSerializer(containers, many=True)
        return Response({'containers': serializer.data})


class ViewerDashboardMetaView(APIView):
    """Return owner name and whether a passcode is required for a share token.

    GET /api/view/<share_token>/meta/
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, share_token):
        owner = get_object_or_404(CustomUser, household_share_token=share_token)
        return Response({'requires_passcode': bool(owner.household_passcode)})


# ---------------------------------------------------------------------------
# Onboarding status
# ---------------------------------------------------------------------------

class OnboardingStatusView(APIView):
    """Return completion status for the 5-step onboarding checklist.

    GET /api/onboarding-status/

    Steps:
      1. add_container   — user has at least one container
      2. add_items       — at least one container has content items
      3. view_qr         — user.qr_first_viewed_at is set
      4. scan_qr         — any container.owner_scanned_at is set
      5. share_household — user.household_search_used_at is set
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        containers = Container.objects.filter(user=user)

        step1 = containers.exists()
        step2 = containers.filter(content_items__isnull=False).exists() if step1 else False
        step3 = user.qr_first_viewed_at is not None
        step4 = containers.filter(owner_scanned_at__isnull=False).exists() if step1 else False
        step5 = user.household_search_used_at is not None

        return Response({
            'add_container': step1,
            'add_items': step2,
            'view_qr': step3,
            'scan_qr': step4,
            'share_household': step5,
            'all_complete': all([step1, step2, step3, step4, step5]),
            'dismissed': user.onboarding_dismissed,
        })


class OnboardingDismissView(APIView):
    """Mark the onboarding checklist as dismissed for the authenticated user.

    POST /api/onboarding-dismiss/

    Idempotent — safe to call multiple times. Returns 204 No Content.
    """
    permission_classes = [HasActiveSubscription]

    def post(self, request):
        user = request.user
        if not user.onboarding_dismissed:
            user.onboarding_dismissed = True
            user.save(update_fields=['onboarding_dismissed'])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Passcode validation (rate-limited by Django cache)
# ---------------------------------------------------------------------------

_PASSCODE_RATE_LIMIT = 10
_PASSCODE_WINDOW_SECONDS = 600


def _check_passcode_rate_limit(ip, cache_key):
    """Return True if the caller is over the attempt limit."""
    from django.core.cache import cache
    return cache.get(cache_key, 0) >= _PASSCODE_RATE_LIMIT


def _increment_passcode_attempt(ip, cache_key):
    from django.core.cache import cache
    cache.set(cache_key, cache.get(cache_key, 0) + 1, _PASSCODE_WINDOW_SECONDS)


def _reset_passcode_attempts(cache_key):
    from django.core.cache import cache
    cache.delete(cache_key)


class ValidatePasscodeView(APIView):
    """Validate a 4-digit household passcode for a given container UUID.

    POST /api/validate-passcode/
    Body: { "container": "<uuid>", "passcode": "1234" }

    Rate-limited: 10 attempts per IP per 10 minutes.
    Returns 200 on success, 401 on failure, 429 on rate limit.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        container_uuid = request.data.get('container', '')
        passcode = request.data.get('passcode', '')
        ip = request.META.get('REMOTE_ADDR', 'unknown')

        if not container_uuid:
            return Response(
                {'detail': 'container field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        container = get_object_or_404(Container, uuid=container_uuid)
        owner = container.user
        cache_key = f'passcode_attempt:{ip}:{container_uuid}'

        if _check_passcode_rate_limit(ip, cache_key):
            return Response(
                {'detail': 'Too many attempts. Please wait before trying again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not owner.household_passcode or not check_password(passcode, owner.household_passcode):
            _increment_passcode_attempt(ip, cache_key)
            return Response({'valid': False, 'detail': 'Incorrect passcode.'}, status=status.HTTP_401_UNAUTHORIZED)

        _reset_passcode_attempts(cache_key)
        return Response({'valid': True})


class ValidateSharePasscodeView(APIView):
    """Validate a passcode for a share token (used on /view/<token>/ page).

    POST /api/view/<share_token>/validate-passcode/
    Body: { "passcode": "1234" }
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, share_token):
        owner = get_object_or_404(CustomUser, household_share_token=share_token)
        passcode = request.data.get('passcode', '')
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        cache_key = f'passcode_attempt:share:{ip}:{share_token}'

        if _check_passcode_rate_limit(ip, cache_key):
            return Response(
                {'detail': 'Too many attempts. Please wait before trying again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not owner.household_passcode or not check_password(passcode, owner.household_passcode):
            _increment_passcode_attempt(ip, cache_key)
            return Response({'valid': False, 'detail': 'Incorrect passcode.'}, status=status.HTTP_401_UNAUTHORIZED)

        _reset_passcode_attempts(cache_key)
        return Response({'valid': True})


# ---------------------------------------------------------------------------
# Account: share link + passcode management
# ---------------------------------------------------------------------------

class ShareLinkView(APIView):
    """Manage the household shareable link.

    POST   /api/account/share-link/          — generate/rotate link
    DELETE /api/account/share-link/          — disable link (set to null)
    GET    /api/account/share-link/          — get current link status
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        user = request.user
        return Response({
            'share_token': str(user.household_share_token) if user.household_share_token else None,
            'enabled': user.household_share_token is not None,
        })

    def post(self, request):
        user = request.user
        user.household_share_token = uuid_lib.uuid4()
        user.save(update_fields=['household_share_token'])
        return Response({
            'share_token': str(user.household_share_token),
            'enabled': True,
        })

    def delete(self, request):
        user = request.user
        user.household_share_token = None
        user.save(update_fields=['household_share_token'])
        return Response({'share_token': None, 'enabled': False})


class PasscodeView(APIView):
    """Manage the household 4-digit passcode.

    POST   /api/account/passcode/   — set or update passcode
    DELETE /api/account/passcode/   — remove passcode
    GET    /api/account/passcode/   — check if passcode is set
    """
    permission_classes = [HasActiveSubscription]

    def get(self, request):
        return Response({'has_passcode': bool(request.user.household_passcode)})

    def post(self, request):
        passcode = request.data.get('passcode', '')
        if not passcode.isdigit() or len(passcode) != 4:
            return Response(
                {'detail': 'Passcode must be exactly 4 digits.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        request.user.household_passcode = make_password(passcode)
        request.user.save(update_fields=['household_passcode'])
        return Response({'has_passcode': True})

    def delete(self, request):
        request.user.household_passcode = None
        request.user.save(update_fields=['household_passcode'])
        return Response({'has_passcode': False})


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

class LocationListView(generics.ListAPIView):
    serializer_class = LocationSerializer
    queryset = Location.objects.all()
    permission_classes = [HasActiveSubscription]


# ---------------------------------------------------------------------------
# QR code generation
# ---------------------------------------------------------------------------

class QRCodeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, uuid):
        container = get_object_or_404(Container, uuid=uuid)

        # Track first QR view for authenticated owner (onboarding step 3)
        auth = TokenAuthentication()
        try:
            auth_result = auth.authenticate(request)
            if auth_result:
                user, _ = auth_result
                if container.user == user and not user.qr_first_viewed_at:
                    user.qr_first_viewed_at = timezone.now()
                    user.save(update_fields=['qr_first_viewed_at'])
        except Exception:
            pass

        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080')

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(f"{frontend_url}/c/{container.uuid}/")
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, "PNG")
        return HttpResponse(buffer.getvalue(), content_type="image/png")


# ---------------------------------------------------------------------------
# Protected media
# ---------------------------------------------------------------------------

class ProtectedMediaView(APIView):
    """Serve container photos with authorization check.

    Access is allowed if:
    - User is authenticated and owns the container, OR
    - Container is NOT password protected AND request includes the container UUID
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, photo_uuid):
        from django.http import FileResponse, Http404

        photo = get_object_or_404(ContainerPhoto, uuid=photo_uuid)
        container = photo.container

        # Authenticated owner: always allowed
        auth = TokenAuthentication()
        try:
            auth_result = auth.authenticate(request)
            if auth_result:
                user, _ = auth_result
                if container.user == user:
                    return self._serve_file(photo)
        except Exception:
            pass

        # Public access via container UUID param
        container_uuid = request.query_params.get('container')
        if container_uuid and str(container.uuid) == container_uuid:
            if not container.is_password_protected:
                return self._serve_file(photo)
            # For password-protected containers, check passcode
            passcode = request.query_params.get('passcode', '')
            if container.user.household_passcode and check_password(passcode, container.user.household_passcode):
                return self._serve_file(photo)
            return Response(
                {'detail': 'This container requires a passcode.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({'detail': 'Not authorized to view this image.'}, status=status.HTTP_403_FORBIDDEN)

    def _serve_file(self, photo):
        from django.http import FileResponse
        import mimetypes

        file_path = photo.image.path
        content_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')
