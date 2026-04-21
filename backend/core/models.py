from django.db import models


class Status(models.Model):
    ENTITY_USER = 'user'
    ENTITY_IDEA = 'idea'
    ENTITY_COMMENT = 'comment'

    ENTITY_CHOICES = (
        (ENTITY_USER, 'User'),
        (ENTITY_IDEA, 'Idea'),
        (ENTITY_COMMENT, 'Comment'),
    )

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=20, choices=ENTITY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'statuses'
        managed = False
        unique_together = (('name', 'entity_type'),)

    def __str__(self):
        return f'{self.name} ({self.entity_type})'


class ErrorCode(models.Model):
    code = models.CharField(max_length=32, unique=True)
    message = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'error_codes'
        managed = False

    def __str__(self):
        return f'{self.code}: {self.message}'


class UserLogins(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="logins",
    )
    login_time = models.DateTimeField(auto_now_add=True)
    browser = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'user_logins'
        managed = False

    def __str__(self):
        return f'User {self.user_id} logged in at {self.login_time}'