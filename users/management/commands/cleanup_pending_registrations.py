from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import PendingRegistration


class Command(BaseCommand):
    help = 'Remove pending registrations older than 24 hours'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=24)
        deleted_count, _ = PendingRegistration.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f'Deleted {deleted_count} stale pending registrations.')
