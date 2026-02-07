from rest_framework import serializers
from users.models import CustomUser
from containers.models import Location, Container, ContentItem, ContainerPhoto, ContainerText

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class ContentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentItem
        fields = ['id', 'name', 'quantity']
        extra_kwargs = {'id': {'read_only': True}}

class ContainerPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ContainerPhoto
        fields = ['id', 'uuid', 'image']

    def get_image(self, obj):
        # Return protected URL with container UUID for public access
        return f'/api/media/{obj.uuid}/?container={obj.container.uuid}'

class ContainerTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContainerText
        fields = ['id', 'text']

class ContainerSerializer(serializers.ModelSerializer):
    items = ContentItemSerializer(many=True, required=False, source='content_items')
    photos = ContainerPhotoSerializer(many=True, read_only=True)
    texts = ContainerTextSerializer(many=True, read_only=True)
    text = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo = serializers.ImageField(write_only=True, required=False)
    location = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Container
        fields = ['id', 'name', 'location', 'other_location', 'readable_id', 'uuid', 'color', 'is_password_protected', 'created_at', 'updated_at', 'last_accessed', 'items', 'photos', 'texts', 'text', 'photo']
        read_only_fields = ['readable_id', 'uuid', 'created_at', 'updated_at', 'last_accessed']

    def create(self, validated_data):
        items_data = validated_data.pop('content_items', [])
        text_data = validated_data.pop('text', None)
        photo_data = validated_data.pop('photo', None)
        location_name = validated_data.pop('location', None)
        location = None
        if location_name and location_name.strip():
            location, created = Location.objects.get_or_create(name=location_name)
        container = Container.objects.create(location=location, **validated_data)
        for item_data in items_data:
            ContentItem.objects.create(container=container, **item_data)
        if photo_data:
            ContainerPhoto.objects.create(container=container, image=photo_data)
        if text_data and text_data.strip():
            ContainerText.objects.create(container=container, text=text_data)
        return container

    def update(self, instance, validated_data):
        items_data = validated_data.pop('content_items', None)
        text_data = validated_data.pop('text', None)
        photo_data = validated_data.pop('photo', None)
        location_name = validated_data.pop('location', None)

        # Update location if provided (empty string clears location)
        if location_name is not None:
            if location_name and location_name.strip():
                location, created = Location.objects.get_or_create(name=location_name)
                instance.location = location
            else:
                instance.location = None

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace items if provided
        if items_data is not None:
            instance.content_items.all().delete()
            for item_data in items_data:
                ContentItem.objects.create(container=instance, **item_data)

        # Replace text if provided
        if text_data is not None:
            instance.texts.all().delete()
            if text_data.strip():
                ContainerText.objects.create(container=instance, text=text_data)

        # Replace photo if provided
        if photo_data is not None:
            instance.photos.all().delete()
            ContainerPhoto.objects.create(container=instance, image=photo_data)

        return instance
