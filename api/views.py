from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from .serializers import CustomUserSerializer, ContainerSerializer, LocationSerializer
from containers.models import Container, Location
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import qrcode
from io import BytesIO
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.views import ObtainAuthToken


@method_decorator(csrf_exempt, name='dispatch')
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = CustomUserSerializer

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
            'username': user.username
        })


class UserLogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

from rest_framework.parsers import MultiPartParser, FormParser

class ContainerListView(generics.ListCreateAPIView):
    serializer_class = ContainerSerializer
    parser_classes = (MultiPartParser, FormParser)

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
        location_name = self.request.data.get('location')
        color = self.request.data.get('color')
        location_abbr = location_name[:2].upper()
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

class ContainerByUUIDView(generics.RetrieveAPIView):
    serializer_class = ContainerSerializer
    queryset = Container.objects.all()
    lookup_field = 'uuid'
    authentication_classes = []  # Public access
    permission_classes = []

class LocationListView(generics.ListAPIView):
    serializer_class = LocationSerializer
    queryset = Location.objects.all()

class QRCodeView(APIView):
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