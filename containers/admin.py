from django.contrib import admin
from .models import Location, Container, ContentItem, ContainerPhoto, ContainerText

admin.site.register(Location)
admin.site.register(Container)
admin.site.register(ContentItem)
admin.site.register(ContainerPhoto)
admin.site.register(ContainerText)
