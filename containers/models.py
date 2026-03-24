import os
from django.db import models
from django.conf import settings
import uuid as uuid_lib


def container_photo_path(instance, filename):
    """Generate upload path: user_{id}/{container_uuid}/{photo_uuid}.{ext}"""
    ext = os.path.splitext(filename)[1].lower()
    photo_uuid = instance.uuid or uuid_lib.uuid4()
    return f'user_{instance.container.user_id}/{instance.container.uuid}/{photo_uuid}{ext}'


class Location(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Container(models.Model):
    class Color(models.TextChoices):
        RED = 'red', 'Red'
        ORANGE = 'orange', 'Orange'
        YELLOW = 'yellow', 'Yellow'
        GREEN = 'green', 'Green'
        BLUE = 'blue', 'Blue'
        PURPLE = 'purple', 'Purple'
        BROWN = 'brown', 'Brown'
        BLACK = 'black', 'Black'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='containers')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    other_location = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=255)
    readable_id = models.CharField(max_length=10, unique=True)
    uuid = models.UUIDField(default=uuid_lib.uuid4, editable=False, unique=True)
    color = models.CharField(max_length=10, choices=Color.choices)
    # is_password_protected: if True, viewing this container via its public UUID
    # requires the owner's 4-digit household_passcode. Authenticated owner bypasses.
    is_password_protected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    # owner_scanned_at: set when the authenticated owner accesses this container
    # via its public UUID (used for onboarding step 4 tracking)
    owner_scanned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        permissions = [
            ("can_view_container", "Can view container"),
        ]

    def __str__(self):
        return self.name

class ContentItem(models.Model):
    container = models.ForeignKey(Container, on_delete=models.CASCADE, related_name='content_items')
    name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.name

class ContainerPhoto(models.Model):
    container = models.ForeignKey(Container, on_delete=models.CASCADE, related_name='photos')
    uuid = models.UUIDField(default=uuid_lib.uuid4, editable=False, unique=True)
    image = models.ImageField(upload_to=container_photo_path)

class ContainerText(models.Model):
    container = models.ForeignKey(Container, on_delete=models.CASCADE, related_name='texts')
    text = models.TextField()