from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone

from core.constants import StatusName
from core.models import Status
from organization.models import Department


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            raise ValueError('Password is required')

        user.save(using=self._db)
        return user

    def create_superuser(self, *args, **kwargs):
        raise RuntimeError('Superuser creation is disabled for this project')


class Role(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'roles'
        managed = False

    def __str__(self):
        return self.name


class User(AbstractBaseUser):
    id = models.AutoField(primary_key=True)

    full_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)

    password = models.CharField(
        max_length=255,
        db_column='password_hash'
    )
    is_default_password = models.BooleanField(
        default=True,
        db_column='is_default_password',
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.DO_NOTHING,
        db_column='department_id',
        related_name='users',
    )
    role = models.ForeignKey(
        'Role',
        on_delete=models.DO_NOTHING,
        db_column='role_id',
        related_name='users',
    )
    status = models.ForeignKey(
        Status,
        on_delete=models.DO_NOTHING,
        db_column='status_id',
        related_name='users',
        limit_choices_to={'entity_type': Status.ENTITY_USER},
    )

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.IntegerField(null=True, blank=True)

    updated_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = UserManager()
    last_login = None

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return self.email

    @property
    def department_name(self):
        if not self.department_id:
            return None
        try:
            return self.department.name
        except Department.DoesNotExist:
            return None

    @property
    def role_name(self):
        if not self.role_id:
            return None
        try:
            return self.role.name
        except Role.DoesNotExist:
            return None

    @property
    def status_name(self):
        if not self.status_id:
            return None
        try:
            return self.status.name
        except Status.DoesNotExist:
            return None

    @property
    def is_active(self):
        return (self.status_name or '').lower() == StatusName.ACTIVE
    
    @property
    def is_disabled(self):
        return (self.status_name or '').lower == StatusName.DISABLED
