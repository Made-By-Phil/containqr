from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    path('containers/', views.ContainerListView.as_view(), name='container-list'),
    path('containers/<int:pk>/', views.ContainerDetailView.as_view(), name='container-detail'),
    path('containers/uuid/<uuid:uuid>/', views.ContainerByUUIDView.as_view(), name='container-by-uuid'),
    path('locations/', views.LocationListView.as_view(), name='location-list'),
    path('qr-code/<uuid:uuid>/', views.QRCodeView.as_view(), name='qr-code'),
]
