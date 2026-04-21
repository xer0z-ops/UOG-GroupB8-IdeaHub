from django.conf import settings
from django.db import models

from core.models import Status
from organization.models import AcademicYear, Department


class Category(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="created_by",
        related_name="categories_created",
        null=True,
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="updated_by",
        related_name="categories_updated",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "categories"
        managed = False

    def __str__(self) -> str:
        return self.name


class Idea(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    view_count = models.IntegerField(default=0)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="ideas",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.DO_NOTHING,
        db_column="department_id",
        related_name="ideas",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.DO_NOTHING,
        db_column="academic_year_id",
        related_name="ideas",
    )
    status = models.ForeignKey(
        Status,
        on_delete=models.DO_NOTHING,
        db_column="status_id",
        related_name="ideas",
        limit_choices_to={"entity_type": Status.ENTITY_IDEA},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="updated_by",
        related_name="ideas_updated",
        null=True,
        blank=True,
    )

    categories = models.ManyToManyField(
        Category,
        through="IdeaCategory",
        related_name="ideas",
    )

    class Meta:
        db_table = "ideas"
        managed = False

    def __str__(self) -> str:
        return self.title


class IdeaCategory(models.Model):
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        db_column="idea_id",
        related_name="idea_categories",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        db_column="category_id",
        related_name="idea_categories",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "idea_categories"
        managed = False
        unique_together = (("idea", "category"),)

    def __str__(self) -> str:
        return f"{self.idea_id}-{self.category_id}"


class Vote(models.Model):
    VOTE_THUMB_UP = "thumb_up"
    VOTE_THUMB_DOWN = "thumb_down"
    VOTE_CHOICES = (
        (VOTE_THUMB_UP, "thumb_up"),
        (VOTE_THUMB_DOWN, "thumb_down"),
    )

    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        db_column="idea_id",
        related_name="votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="votes",
    )
    vote_type = models.CharField(max_length=16, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "votes"
        managed = False
        unique_together = (("idea", "user"),)

    def __str__(self) -> str:
        return f"{self.idea_id}-{self.user_id}-{self.vote_type}"


class Document(models.Model):
    id = models.AutoField(primary_key=True)
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        db_column="idea_id",
        related_name="documents",
    )
    mime_type = models.CharField(max_length=50)
    file_name = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="created_by",
        related_name="documents_created",
    )
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="updated_by",
        related_name="documents_updated",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "documents"
        managed = False

    def __str__(self) -> str:
        return self.file_name


class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        db_column="idea_id",
        related_name="comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="idea_comments",
    )
    comment_text = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    status = models.ForeignKey(
        Status,
        on_delete=models.DO_NOTHING,
        db_column="status_id",
        related_name="comments",
        limit_choices_to={"entity_type": Status.ENTITY_COMMENT},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="updated_by",
        related_name="comments_updated",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "comments"
        managed = False

    def __str__(self) -> str:
        return f"Comment {self.id} on idea {self.idea_id}"


class IdeaReport(models.Model):
    id = models.AutoField(primary_key=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        db_column="reporter_id",
        related_name="idea_reports",
    )
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        db_column="idea_id",
        related_name="reports",
        null=True,
        blank=True,
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        db_column="comment_id",
        related_name="reports",
        null=True,
        blank=True,
    )

    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "idea_reports"
        managed = False

    def __str__(self) -> str:
        if self.idea_id:
            target = f"idea {self.idea_id}"
        elif self.comment_id:
            target = f"comment {self.comment_id}"
        else:
            target = "unknown target"
        return f"Report {self.id} on {target}"
        