from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from .serializers import CustomUserSerializer, ContainerSerializer, LocationSerializer
from containers.models import Container, Location, ContainerPhoto
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import qrcode
from io import BytesIO
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny
from .permissions import HasActiveSubscription


@method_decorator(csrf_exempt, name='dispatch')
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = CustomUserSerializer
    permission_classes = [AllowAny]

class UserLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username,
            'subscription_status': user.subscription_status,
            'has_active_subscription': user.has_active_subscription,
        })


class UserLogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

from rest_framework.parsers import MultiPartParser, FormParser

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
            import json
            items = json.loads(items_data)
            serializer.save(user=self.request.user, readable_id=readable_id, content_items=items)
        else:
            serializer.save(user=self.request.user, readable_id=readable_id)

class ContainerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContainerSerializer
    queryset = Container.objects.all()
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [HasActiveSubscription]

class ContainerByUUIDView(generics.RetrieveAPIView):
    """Public container view - checks password protection.

    If container is password protected, only the owner can view it.
    """
    serializer_class = ContainerSerializer
    queryset = Container.objects.all()
    lookup_field = 'uuid'
    authentication_classes = []
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        from rest_framework.authentication import TokenAuthentication

        container = self.get_object()

        # If password protected, check if user is authenticated owner
        if container.is_password_protected:
            auth = TokenAuthentication()
            try:
                auth_result = auth.authenticate(request)
                if auth_result:
                    user, token = auth_result
                    if container.user == user:
                        serializer = self.get_serializer(container)
                        return Response(serializer.data)
            except Exception:
                pass

            # Not authorized - return 401 with message
            return Response(
                {'detail': 'This container is password protected. Please log in as the owner to view.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Not password protected - allow public access
        serializer = self.get_serializer(container)
        return Response(serializer.data)

class LocationListView(generics.ListAPIView):
    serializer_class = LocationSerializer
    queryset = Location.objects.all()
    permission_classes = [HasActiveSubscription]

class QRCodeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, uuid):
        container = get_object_or_404(Container, uuid=uuid)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        # The URL should point to the frontend, not the backend
        qr.add_data(f"http://localhost:8080/{container.user.username}/{container.uuid}/")
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, "PNG")
        
        return HttpResponse(buffer.getvalue(), content_type="image/png")


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
        from rest_framework.authentication import TokenAuthentication

        photo = get_object_or_404(ContainerPhoto, uuid=photo_uuid)
        container = photo.container

        # Check if user is authenticated and owns the container
        auth = TokenAuthentication()
        try:
            auth_result = auth.authenticate(request)
            if auth_result:
                user, token = auth_result
                if container.user == user:
                    return self._serve_file(photo)
        except Exception:
            pass

        # Check if container UUID is provided (public access via QR code)
        # Only allow if container is NOT password protected
        container_uuid = request.query_params.get('container')
        if container_uuid and str(container.uuid) == container_uuid:
            if not container.is_password_protected:
                return self._serve_file(photo)
            else:
                return Response(
                    {'detail': 'This container is password protected.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Unauthorized
        return Response({'detail': 'Not authorized to view this image.'}, status=status.HTTP_403_FORBIDDEN)

    def _serve_file(self, photo):
        from django.http import FileResponse
        import mimetypes

        file_path = photo.image.path
        content_type, _ = mimetypes.guess_type(file_path)
        return FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')