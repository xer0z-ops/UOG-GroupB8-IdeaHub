from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from core.models import Status
from ideas.models import Category, Idea, IdeaCategory, Vote
from organization.models import AcademicYear, Department

from core.constants import RoleName, StatusName


def _sync_idea_categories(idea, categories):
    IdeaCategory.objects.filter(idea=idea).delete()
    if not categories:
        return
    unique_ids = []
    seen_ids = set()
    for value in categories:
        category_id = getattr(value, "pk", value)
        if category_id in seen_ids:
            continue
        seen_ids.add(category_id)
        unique_ids.append(category_id)
    IdeaCategory.objects.bulk_create(
        [IdeaCategory(idea=idea, category_id=category_id) for category_id in unique_ids]
    )


def idea_thumb_summary(idea, user=None, force_reload=False):
    prefetched = getattr(idea, "_prefetched_objects_cache", {})
    vote_records = None if force_reload else prefetched.get("votes")
    if vote_records is None:
        vote_records = list(idea.votes.all())
    up_count = sum(1 for vote in vote_records if vote.vote_type == Vote.VOTE_THUMB_UP)
    down_count = sum(1 for vote in vote_records if vote.vote_type == Vote.VOTE_THUMB_DOWN)
    current_user_thumb = None
    if user and getattr(user, "is_authenticated", False):
        for vote in vote_records:
            if vote.user_id == user.id:
                current_user_thumb = "up" if vote.vote_type == Vote.VOTE_THUMB_UP else "down"
                break
    return {
        "up": up_count,
        "down": down_count,
        "current_user": current_user_thumb,
    }


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        )
        read_only_fields = fields


class CategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name",)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False) or user.role_name not in {
            RoleName.ADMIN,
            RoleName.QA_MANAGER,
        }:
            raise serializers.ValidationError(
                "Only QA Managers can manage categories."
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        validated_data["updated_by"] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)


class IdeaSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    academic_year = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    categories = CategorySerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()
    thumb_summary = serializers.SerializerMethodField()
    current_user_thumb = serializers.SerializerMethodField()
    thumb_up_count = serializers.SerializerMethodField()
    thumb_down_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Idea
        fields = (
            "id",
            "title",
            "description",
            "is_anonymous",
            "view_count",
            "user",
            "user_id",
            "department",
            "academic_year",
            "status",
            "categories",
            "documents",
            "thumb_summary",
            "current_user_thumb",
            "thumb_up_count",
            "thumb_down_count",
            "comment_count",
            "created_at",
            "updated_at",
            "updated_by",
        )
        read_only_fields = fields

    def get_academic_year(self, obj):
        if not obj.academic_year_id:
            return None
        ay = obj.academic_year
        return {
            "id": ay.id,
            "name": ay.name,
            "start_date": ay.start_date,
            "end_date": ay.end_date,
            "idea_closure_date": ay.idea_closure_date,
            "final_closure_date": ay.final_closure_date,
        }

    def get_department(self, obj):
        if not obj.department_id:
            return None
        return {"id": obj.department_id, "name": obj.department.name}

    def get_user(self, obj):
        if obj.is_anonymous or not obj.user_id:
            return None
        return {
            "id": obj.user_id,
            "full_name": getattr(obj.user, "full_name", None),
            "email": getattr(obj.user, "email", None),
        }

    def get_status(self, obj):
        if not obj.status_id:
            return None
        return {"id": obj.status_id, "name": obj.status.name, "description": obj.status.description}

    def get_documents(self, obj):
        request = self.context.get("request")
        documents = []
        for document in obj.documents.all():
            inline_path = reverse("ideas:document-file", args=[document.id])
            inline_url = (
                request.build_absolute_uri(inline_path)
                if request
                else inline_path
            )
            download_path = f"{inline_path}?download=1"
            download_url = (
                request.build_absolute_uri(download_path)
                if request
                else download_path
            )
            documents.append(
                {
                    "id": document.id,
                    "file_name": document.file_name,
                    "mime_type": document.mime_type,
                    "inline_url": inline_url,
                    "download_url": download_url,
                    "created_at": document.created_at,
                    "created_by": document.created_by_id,
                    "updated_at": document.updated_at,
                    "updated_by": document.updated_by_id,
                }
            )
        return documents

    def _get_thumb_summary(self, obj, force=False):
        cache = self.context.setdefault("_thumb_summary_cache", {})
        cache_key = obj.id or id(obj)
        if force or cache_key not in cache:
            request = self.context.get("request")
            user = getattr(request, "user", None) if request else None
            cache[cache_key] = idea_thumb_summary(
                obj,
                user,
                force_reload=force,
            )
        return cache[cache_key]

    def get_thumb_summary(self, obj):
        force_refresh = bool(self.context.get("force_refresh_thumb"))
        return self._get_thumb_summary(obj, force=force_refresh)

    def get_current_user_thumb(self, obj):
        summary = self._get_thumb_summary(obj)
        return summary.get("current_user")

    def _resolve_thumb_counts(self, obj):
        up = getattr(obj, "thumb_up_count", None)
        down = getattr(obj, "thumb_down_count", None)
        if up is None or down is None:
            summary = self._get_thumb_summary(obj)
            return summary["up"], summary["down"]
        return up, down

    def get_thumb_up_count(self, obj):
        up, _ = self._resolve_thumb_counts(obj)
        return up

    def get_thumb_down_count(self, obj):
        _, down = self._resolve_thumb_counts(obj)
        return down

    def get_comment_count(self, obj):
        comment_count = getattr(obj, "comment_count", None)
        if comment_count is None:
            return obj.comments.count()
        return comment_count


class IdeaCreateSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        required=False,
        allow_null=True,
    )
    academic_year_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(),
        source="academic_year",
    )
    status = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Status.objects.filter(entity_type=Status.ENTITY_IDEA),
        required=False,
        allow_null=True,
    )
    status_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        write_only=True,
    )

    class Meta:
        model = Idea
        fields = (
            "title",
            "description",
            "is_anonymous",
            "department_id",
            "academic_year_id",
            "status",
            "status_id",
            "category_ids",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False) or user.role_name not in {
            RoleName.STAFF,
            RoleName.ADMIN,
        }:
            raise serializers.ValidationError(
                "Only staff members can submit ideas."
            )

        academic_year = attrs["academic_year"]

        today = timezone.now().date()
        current_year = AcademicYear.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        ).first()
        if not current_year or current_year.id != academic_year.id:
            raise serializers.ValidationError(
                {
                    "academic_year_id": "The provided academic year does not match the current active academic year."
                }
            )

        if academic_year.idea_closure_date < timezone.now():
            raise serializers.ValidationError(
                {
                    "academic_year_id": "Idea submissions are closed for this academic year."
                }
            )

        status = attrs.pop("status", None)
        status_id = attrs.pop("status_id", None)

        if status is not None and status_id is not None:
            raise serializers.ValidationError({
                "status": "Provide either status or status_id, not both.",
                "status_id": "Provide either status or status_id, not both.",
            })

        if status is not None:
            attrs["status"] = status
        elif status_id is not None:
            status_obj = Status.objects.filter(
                id=status_id,
                entity_type=Status.ENTITY_IDEA,
            ).first()
            if not status_obj:
                raise serializers.ValidationError({
                    "status_id": "Invalid status_id for idea.",
                })
            attrs["status"] = status_obj

        attrs["_request_user"] = user
        return attrs

    def _apply_defaults(self, validated_data):
        if not validated_data.get("status"):
            validated_data["status"] = Status.objects.filter(
                entity_type=Status.ENTITY_IDEA, name__iexact=StatusName.ACTIVE
            ).first()
            if not validated_data["status"]:
                raise serializers.ValidationError(
                    {"status_id": "Active status for ideas is not configured."}
                )
        if not validated_data.get("department"):
            user = validated_data["_request_user"]
            validated_data["department"] = user.department

    def create(self, validated_data):
        category_ids = validated_data.pop("category_ids", [])
        request_user = validated_data.pop("_request_user")
        self._apply_defaults(validated_data)
        validated_data["user"] = request_user
        validated_data["updated_by"] = request_user

        idea = Idea.objects.create(**validated_data)
        _sync_idea_categories(idea, category_ids)
        return idea


class IdeaUpdateSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    status = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Status.objects.filter(entity_type=Status.ENTITY_IDEA),
        required=False,
        allow_null=True,
    )
    status_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Idea
        fields = (
            "title",
            "description",
            "is_anonymous",
            "status",
            "status_id",
            "category_ids",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        idea = self.instance
        allowed_roles = {
            RoleName.ADMIN,
            RoleName.QA_MANAGER,
            RoleName.QA_COORDINATOR,
        }
        if not getattr(user, "is_authenticated", False) or (
            user.role_name not in allowed_roles and user.id != idea.user_id
        ):
            raise serializers.ValidationError(
                "You are not allowed to update this idea."
            )

        status = attrs.pop("status", None)
        status_id = attrs.pop("status_id", None)

        if status is not None and status_id is not None:
            raise serializers.ValidationError({
                "status": "Provide either status or status_id, not both.",
                "status_id": "Provide either status or status_id, not both.",
            })

        if status is not None:
            attrs["status"] = status
        elif status_id is not None:
            status_obj = Status.objects.filter(
                id=status_id,
                entity_type=Status.ENTITY_IDEA,
            ).first()
            if not status_obj:
                raise serializers.ValidationError({
                    "status_id": "Invalid status_id for idea.",
                })
            attrs["status"] = status_obj

        attrs["_request_user"] = user
        return attrs

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        request_user = validated_data.pop("_request_user")
        validated_data["updated_by"] = request_user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if category_ids is not None:
            _sync_idea_categories(instance, category_ids)
        return instance
        