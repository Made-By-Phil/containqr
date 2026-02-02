from django.db import models
from django.conf import settings
import uuid

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
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    color = models.CharField(max_length=10, choices=Color.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)

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
    image = models.ImageField(upload_to='container_photos/')

class ContainerText(models.Model):
    container = models.ForeignKey(Container, on_delete=models.CASCADE, related_name='texts')
    text = models.TextField()