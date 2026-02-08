from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'is_staff', 'subscription_status', 'subscription_current_period_end']
    fieldsets = UserAdmin.fieldsets + (
        ('Subscription', {
            'fields': ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_current_period_end'),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)
