from django.core.management.base import BaseCommand
from django.db import transaction

from core.constants import RoleName, StatusName
from core.models import Status
from users.models import Role, User

DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PASSWORD = "AdminPass!123"
DEFAULT_ADMIN_FULL_NAME = "System Administrator"
DEFAULT_ADMIN_DEPARTMENT_ID = 1


class Command(BaseCommand):
    help = "Seeds the default admin account with hardcoded credentials."

    def handle(self, *args, **options):
        try:
            admin_role = Role.objects.get(name=RoleName.ADMIN)
        except Role.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"Role '{RoleName.ADMIN}' not found in database."))
            return

        active_status = Status.objects.filter(
            entity_type=Status.ENTITY_USER,
            name__iexact=StatusName.ACTIVE,
        ).first()
        if not active_status:
            self.stderr.write(self.style.ERROR(f"Status '{StatusName.ACTIVE}' for users not found in database."))
            return

        with transaction.atomic():
            user = User.objects.filter(email=DEFAULT_ADMIN_EMAIL).first()

            if user:
                user.full_name = DEFAULT_ADMIN_FULL_NAME
                user.department_id = DEFAULT_ADMIN_DEPARTMENT_ID
                user.role = admin_role
                user.status = active_status
                user.set_password(DEFAULT_ADMIN_PASSWORD)
                user.save(
                    update_fields=[
                        "full_name",
                        "department_id",
                        "role_id",
                        "status_id",
                        "password",
                    ]
                )
                action = "updated"
            else:
                user = User.objects.create_user(
                    email=DEFAULT_ADMIN_EMAIL,
                    password=DEFAULT_ADMIN_PASSWORD,
                    full_name=DEFAULT_ADMIN_FULL_NAME,
                    department_id=DEFAULT_ADMIN_DEPARTMENT_ID,
                    role=admin_role,
                    status=active_status,
                )
                action = "created"

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully {action} admin user (id={user.id}, email={user.email})."
            )
        )
        