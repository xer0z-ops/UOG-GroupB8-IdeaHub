from cmath import log
import logging
import mimetypes
import os
from uuid import uuid4

from django.core.files.storage import default_storage
from django.http import FileResponse, Http404
from django.utils import timezone
from django.utils.text import slugify
from django.db.models import Count, F, Max, Q


from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from authentication.permissions import (
    IsAuthenticatedUser, IsAdmin,
    IsQA_Manager, IsQA_COORDINATOR, IsStaff
)
from core.pagination import DefaultPageNumberPagination
from core.responses import _get_message, error_response, success_response
from core.models import Status
from core.queue import QueueManager
from core.utils import dispatch_send_mail
from ideas.models import AcademicYear, Category, Comment, Document, Idea, IdeaCategory, IdeaReport, Vote
from users.models import User
from ideas.serializers import (
    CategorySerializer,
    CategoryWriteSerializer,
    IdeaCreateSerializer,
    IdeaSerializer,
    IdeaUpdateSerializer,
    idea_thumb_summary,
)

from core.constants import RoleName, StatusName, ErrorCode

logger = logging.getLogger("apps")

_REACTION_ROLES = {
    RoleName.STAFF,
}


def _user_in_roles(user, roles):
    return getattr(user, "is_authenticated", False) and getattr(user, "role_name", None) in roles


def _user_can_react(user):
    return _user_in_roles(user, _REACTION_ROLES)


def _truthy(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _current_academic_year():
    """Return the AcademicYear whose date range covers today, or None."""
    today = timezone.now().date()
    return (
        AcademicYear.objects
        .filter(start_date__lte=today, end_date__gte=today)
        .first()
    )


def _idea_queryset(include_hidden=False):
    comment_count_filter = (
        Q(comments__deleted_at__isnull=True)
        if include_hidden
        else Q(comments__deleted_at__isnull=True) & ~Q(comments__status__name__iexact=StatusName.HIDDEN)
    )
    qs = (
        Idea.objects.select_related("user", "department", "academic_year", "status")
        .prefetch_related("categories", "documents", "votes")
        .annotate(
            thumb_up_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_UP), distinct=True),
            thumb_down_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_DOWN), distinct=True),
            comment_count=Count("comments", filter=comment_count_filter, distinct=True),
            report_count=Count("reports", distinct=True),
        )
        .filter(deleted_at__isnull=True)
        .order_by("-created_at")
    )
    if not include_hidden:
        qs = qs.exclude(status__name__iexact=StatusName.HIDDEN)
    return qs


def _get_idea(idea_id):
    try:
        return _idea_queryset().get(id=idea_id)
    except Idea.DoesNotExist:
        return None


def _get_idea_unfiltered(idea_id):
    """Fetch an idea by ID regardless of its status — used for admin/management operations."""
    try:
        return (
            Idea.objects.select_related("user", "department", "academic_year", "status")
            .prefetch_related("categories", "documents", "votes")
            .annotate(
                thumb_up_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_UP), distinct=True),
                thumb_down_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_DOWN), distinct=True),
                comment_count=Count("comments", filter=Q(comments__deleted_at__isnull=True), distinct=True),
                report_count=Count("reports", distinct=True),
            )
            .filter(deleted_at__isnull=True)
            .get(id=idea_id)
        )
    except Idea.DoesNotExist:
        return None


def _get_document(document_id):
    return (
        Document.objects.select_related(
            "idea",
            "idea__user",
            "idea__department",
            "idea__academic_year",
            "idea__status",
        )
        .filter(id=document_id)
        .first()
    )


def _can_view_idea(user, idea):
    if _user_in_roles(user, {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
        return True
    if idea.user_id == getattr(user, "id", None):
        return True
    return _user_in_roles(user, {RoleName.STAFF}) and getattr(user, "department_id", None) == idea.department_id


def _can_manage_idea(user, idea):
    if _user_in_roles(user, {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
        return True
    return idea.user_id == getattr(user, "id", None)


def _default_comment_status():
    return Status.objects.filter(entity_type=Status.ENTITY_COMMENT, name=StatusName.ACTIVE).order_by("id").first()


def _resolve_comment_status(status_id):
    if status_id:
        return Status.objects.filter(
            id=status_id,
            entity_type=Status.ENTITY_COMMENT,
        ).first()
    return _default_comment_status()





def _serialize_report(report):
    target = None
    if report.idea_id:
        target = {"type": "idea", "id": report.idea_id}
    elif report.comment_id:
        target = {"type": "comment", "id": report.comment_id}
    return {
        "id": report.id,
        "reason": report.reason,
        "target": target,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


def _serialize_comment(comment):
    user_payload = None
    if not comment.is_anonymous and comment.user_id:
        user_payload = {
            "id": comment.user_id,
            "full_name": getattr(comment.user, "full_name", None),
            "email": getattr(comment.user, "email", None),
        }
    return {
        "id": comment.id,
        "comment_text": comment.comment_text,
        "is_anonymous": comment.is_anonymous,
        "user": user_payload,
        "status": {
            "id": comment.status_id,
            "name": comment.status.name,
            "description": comment.status.description
        },
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "updated_by": comment.updated_by_id,
    }


def _safe_document_name(original_name):
    original_name = original_name or "document"
    base, ext = os.path.splitext(original_name)
    base = slugify(base) or "document"
    ext = ext.lower()
    return f"{base}-{uuid4().hex}{ext}"


def _document_mime_type(uploaded_file):
    return (
        getattr(uploaded_file, "content_type", None)
        or mimetypes.guess_type(getattr(uploaded_file, "name", "") or "")[0]
        or "application/octet-stream"
    )


def _save_idea_documents(idea, files, user):
    saved = []
    if not files:
        return saved
    for uploaded in files:
        safe_name = _safe_document_name(getattr(uploaded, "name", None))
        storage_path = f"ideas/{idea.id}/{safe_name}"
        saved_path = default_storage.save(storage_path, uploaded)
        document = Document.objects.create(
            idea=idea,
            mime_type=_document_mime_type(uploaded),
            file_name=getattr(uploaded, "name", None) or safe_name,
            storage_path=saved_path,
            created_by=user,
            updated_by=user,
        )
        saved.append(document)
    return saved


def _delete_document_file(document):
    if document.storage_path and default_storage.exists(document.storage_path):
        default_storage.delete(document.storage_path)


def _open_document_file(document):
    if not document.storage_path or not default_storage.exists(document.storage_path):
        raise Http404("Document file not found.")
    file_handle = default_storage.open(document.storage_path, "rb")
    content_type = (
        document.mime_type
        or mimetypes.guess_type(document.file_name or "")[0]
        or "application/octet-stream"
    )
    return file_handle, content_type


def _build_document_response(document, download=False):
    file_handle, content_type = _open_document_file(document)
    response = FileResponse(file_handle, content_type=content_type)
    disposition = "attachment" if _truthy(download) else "inline"
    response["Content-Disposition"] = f'{disposition}; filename="{document.file_name}"'
    return response


def _get_request_files(request, key="documents"):
    if not hasattr(request, "FILES"):
        return []
    return request.FILES.getlist(key)


def _idea_comments_queryset(idea, include_hidden=False):
    qs = idea.comments.select_related("user", "status").filter(deleted_at__isnull=True).order_by("created_at")
    if not include_hidden:
        qs = qs.exclude(status__name__iexact=StatusName.HIDDEN)
    return qs

def _apply_counts_to_payload(idea, payload, user=None):
    up_count = getattr(idea, "thumb_up_count", None)
    down_count = getattr(idea, "thumb_down_count", None)
    if up_count is None or down_count is None:
        summary = idea_thumb_summary(idea, user=user)
        up_count = summary["up"]
        down_count = summary["down"]
    payload["thumb_up_count"] = up_count
    payload["thumb_down_count"] = down_count

    comment_count = getattr(idea, "comment_count", None)
    if comment_count is None:
        comment_count = idea.comments.count()
    payload["comment_count"] = comment_count

    if user is not None and _user_in_roles(user, {RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
        report_count = getattr(idea, "report_count", None)
        if report_count is None:
            report_count = idea.reports.count()
        payload["report_count"] = report_count


def _augment_idea_payloads(ideas, payloads, user=None):
    for idea, payload in zip(ideas, payloads):
        _apply_counts_to_payload(idea, payload, user=user)
    return payloads


class CategoryListCreateAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not _user_in_roles(
            request.user,
            {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR, RoleName.STAFF},
        ):
            return error_response(
                message="Forbidden",
                error="You are not allowed to view categories.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.CATEGORY_FORBIDDEN_VIEW,
            )

        queryset = Category.objects.all().order_by("name")
        search = request.query_params.get("search")
        if search:
            search_fields = ["name"]
            query = Q()
            for field in search_fields:
                query |= Q(**{f"{field}__icontains": search})
            queryset = queryset.filter(query)

        serializer = CategorySerializer(queryset, many=True)
        return success_response(
            data={"categories": serializer.data},
            message="Categories fetched successfully",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.CATEGORY_FETCHED_LIST,
        )

    def post(self, request):
        try:
            serializer = CategoryWriteSerializer(
                data=request.data,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            category = serializer.save()
            data = CategorySerializer(category).data
            return success_response(
                data={"category": data},
                message="Category created successfully",
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.CATEGORY_CREATED,
            )
        except ValidationError as exc:
            logger.warning("Category creation validation error: %s", exc.detail)
            return error_response(
                message="Invalid data",
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.CATEGORY_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception("Unexpected error during category creation: %s", exc)
            return error_response(
                message="Unable to create category",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.CATEGORY_INTERNAL_ERROR,
            )


class CategoryDetailsAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def _get_category(self, category_id):
        try:
            return Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return None

    def get(self, request, category_id):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER}):
            return error_response(
                message="Forbidden",
                error="You are not allowed to view categories.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.CATEGORY_FORBIDDEN_VIEW,
            )

        category = self._get_category(category_id)
        if not category:
            return error_response(
                message="Category not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.CATEGORY_NOT_FOUND,
            )

        serializer = CategorySerializer(category)
        return success_response(
            data={"category": serializer.data},
            message="Category fetched successfully",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.CATEGORY_FETCHED,
        )

    def put(self, request, category_id):
        return self._update(request, category_id, partial=False)

    def patch(self, request, category_id):
        return self._update(request, category_id, partial=True)

    def delete(self, request, category_id):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER}):
            return error_response(
                message="Forbidden",
                error="You are not allowed to delete categories.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.CATEGORY_FORBIDDEN_DELETE,
            )

        category = self._get_category(category_id)
        if not category:
            return error_response(
                message="Category not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.CATEGORY_NOT_FOUND,
            )

        if IdeaCategory.objects.filter(category_id=category.id).exists():
            return error_response(
                message="Unable to delete category",
                error="Category is assigned to one or more ideas.",
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.CATEGORY_DELETE_ASSIGNED,
            )

        try:
            category.delete()
            return success_response(
                data=None,
                message="Category deleted successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.CATEGORY_DELETED,
            )
        except Exception as exc:
            logger.exception("Unexpected error during category deletion: %s", exc)
            return error_response(
                message="Unable to delete category",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.CATEGORY_INTERNAL_ERROR,
            )

    def _update(self, request, category_id, partial):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER}):
            return error_response(
                message="Forbidden",
                error="You are not allowed to update categories.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.CATEGORY_FORBIDDEN_UPDATE,
            )

        category = self._get_category(category_id)
        if not category:
            return error_response(
                message="Category not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.CATEGORY_NOT_FOUND,
            )

        try:
            serializer = CategoryWriteSerializer(
                category,
                data=request.data,
                partial=partial,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            data = CategorySerializer(category).data
            return success_response(
                data={"category": data},
                message="Category updated successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.CATEGORY_UPDATED,
            )
        except ValidationError as exc:
            logger.warning("Category update validation error: %s", exc.detail)
            return error_response(
                message="Invalid data",
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.CATEGORY_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception("Unexpected error during category update: %s", exc)
            return error_response(
                message="Unable to update category",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.CATEGORY_INTERNAL_ERROR,
            )


class IdeaListAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        try:
            allowed_roles = {
                RoleName.ADMIN,
                RoleName.QA_MANAGER,
                RoleName.QA_COORDINATOR,
                RoleName.STAFF,
            }
            user = request.user
            if not _user_in_roles(user, allowed_roles):
                return error_response(
                    message="Forbidden",
                    error="You are not allowed to view ideas.",
                    status_code=status.HTTP_403_FORBIDDEN,
                    code=ErrorCode.IDEA_FORBIDDEN_VIEW,
                )
    
            paginator = DefaultPageNumberPagination()
            include_hidden = _user_in_roles(user, {RoleName.QA_MANAGER})
            queryset = _idea_queryset(include_hidden=include_hidden)
    
            search = request.query_params.get("search")
            if search:
                # MySQL FULLTEXT ignores words shorter than innodb_ft_min_token_size (default 3)
                # and does not do substring matching without a wildcard.
                # For short terms, fall back to LIKE; for longer terms use FULLTEXT with prefix wildcard.
                if len(search) < 3:
                    logger.info('Using normal like search')
                    queryset = queryset.filter(
                        Q(title__icontains=search) | Q(description__icontains=search)
                    )
                else:
                    logger.info('Using fulltext search')
                    # Append '*' for prefix matching in boolean mode (e.g. "idea*" matches "ideas")
                    search_term = search + "*"
                    queryset = queryset.extra(
                        where=["MATCH(ideas.title, ideas.description) AGAINST (%s IN BOOLEAN MODE)"],
                        params=[search_term],
                    )
    
            category_id = request.query_params.get("category_id")
            if category_id:
                queryset = queryset.filter(categories__id=category_id).distinct()
    
            if user.role_name == RoleName.QA_COORDINATOR:
                logger.info('user role name is coordinator %s', user.role_name)
                queryset = queryset.filter(department_id=getattr(user, "department_id", None))
                academic_year_id = request.query_params.get("academic_year_id")
                if academic_year_id:
                    queryset = queryset.filter(academic_year_id=academic_year_id)

            if user.role_name == RoleName.QA_MANAGER:
                academic_year_id = request.query_params.get("academic_year_id")
                if academic_year_id:
                    queryset = queryset.filter(academic_year_id=academic_year_id)
                department_id = request.query_params.get("department_id")
                if department_id:
                    queryset = queryset.filter(department_id=department_id)
    
            if user.role_name == RoleName.STAFF:
                current_year = _current_academic_year()
                if current_year:
                    queryset = queryset.filter(academic_year_id=current_year.id)
                else:
                    logger.warning("No current academic year found; staff idea list will be empty.")
                    queryset = queryset.none()
    
            sort_by = request.query_params.get("sort_by")
            if sort_by == "latest_comment":
                queryset = queryset.annotate(latest_comment_at=Max("comments__created_at")).order_by("-latest_comment_at", "-created_at")
            elif sort_by == "latest_idea":
                queryset = queryset.order_by("-created_at")
            elif sort_by == "most_popular":
                queryset = queryset.order_by("-thumb_up_count", "-comment_count", "-created_at")
            elif sort_by == "reported":
                queryset = (
                    queryset.filter(reports__isnull=False)
                    .annotate(latest_report_at=Max("reports__created_at"))
                    .order_by("-latest_report_at", "-created_at")
                    .distinct()
                )
            elif sort_by == "most_viewed":
                queryset = queryset.order_by("-view_count", "-created_at")
            else:
                queryset = queryset.order_by("-created_at")
    
            page = paginator.paginate_queryset(queryset, request)
            serializer = IdeaSerializer(page, many=True, context={"request": request})
            payload = serializer.data
            _augment_idea_payloads(page, payload, user=request.user)
            response = paginator.get_paginated_response(payload)
            response.data["message"] = _get_message(ErrorCode.IDEA_FETCHED_LIST, fallback="Ideas fetched successfully")
            return response
        except Exception as ex:
            logger.exception('Error at idea get view %s', ex)
            
            return error_response(
                message="Internal server error",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class IdeaMyListAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not getattr(request.user, "is_authenticated", False):
            return error_response(
                message="Forbidden",
                error="Authentication required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        paginator = DefaultPageNumberPagination()
        queryset = _idea_queryset().filter(user_id=request.user.id)

        if request.user.role_name == RoleName.STAFF:
            current_year = _current_academic_year()
            if current_year:
                queryset = queryset.filter(academic_year_id=current_year.id)
            else:
                logger.warning("No current academic year found; staff my-idea list will be empty.")
                queryset = queryset.none()

        search = request.query_params.get("search")
        if search:
            if len(search) < 3:
                queryset = queryset.filter(
                    Q(title__icontains=search) | Q(description__icontains=search)
                )
            else:
                search_term = search + "*"
                queryset = queryset.extra(
                    where=["MATCH(ideas.title, ideas.description) AGAINST (%s IN BOOLEAN MODE)"],
                    params=[search_term],
                )

        category_id = request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(categories__id=category_id).distinct()

        sort_by = request.query_params.get("sort_by")
        if sort_by == "latest_comment":
            queryset = queryset.annotate(latest_comment_at=Max("comments__created_at")).order_by("-latest_comment_at", "-created_at")
        elif sort_by == "latest_idea":
            queryset = queryset.order_by("-created_at")
        elif sort_by == "most_popular":
            queryset = queryset.order_by("-thumb_up_count", "-comment_count", "-created_at")
        elif sort_by == "most_viewed":
            queryset = queryset.order_by("-view_count", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        page = paginator.paginate_queryset(queryset, request)
        serializer = IdeaSerializer(page, many=True, context={"request": request})
        payload = serializer.data
        _augment_idea_payloads(page, payload, user=request.user)
        response = paginator.get_paginated_response(payload)
        response.data["message"] = _get_message(ErrorCode.IDEA_FETCHED_MY_LIST, fallback="Your ideas fetched successfully")
        return response


def _notify_qa_coordinator(idea):
    """Send an email notification to the QA coordinator of the idea author's department."""
    try:
        department_id = getattr(idea, "department_id", None)
        if not department_id:
            return

        coordinator = (
            User.objects
            .select_related("role")
            .filter(role__name=RoleName.QA_COORDINATOR, department_id=department_id)
            .first()
        )
        if not coordinator:
            logger.info(
                "No QA coordinator found for department_id=%s — skipping notification.",
                department_id,
            )
            return

        author_name = idea.user.full_name if idea.user_id and idea.user else "Anonymous"
        department_name = idea.department.name if idea.department_id and idea.department else str(department_id)
        submitted_at = idea.created_at.strftime("%Y-%m-%d %H:%M:%S") if idea.created_at else "N/A"

        dispatch_send_mail(
            to=coordinator.email,
            subject="New Idea Submitted in Your Department",
            mail_body={
                "template_name": "new_idea_notification.html",
                "context": {
                    "coordinator_name": coordinator.full_name,
                    "department_name": department_name,
                    "idea_title": idea.title,
                    "author_name": author_name,
                    "submitted_at": submitted_at,
                },
            },
        )
        logger.info(
            "New-idea notification dispatched to QA coordinator %s for idea_id=%s.",
            coordinator.email,
            idea.id,
        )
    except Exception as exc:
        logger.exception("Failed to send new-idea notification for idea_id=%s: %s", getattr(idea, "id", None), exc)


class IdeaCreateAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        try:
            serializer = IdeaCreateSerializer(
                data=request.data,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            idea = serializer.save()
            files = _get_request_files(request, "documents")
            if files:
                _save_idea_documents(idea, files, request.user)
            idea = _get_idea(idea.id) or idea
            _notify_qa_coordinator(idea)
            data = IdeaSerializer(idea, context={"request": request}).data
            _apply_counts_to_payload(idea, data, user=request.user)
            return success_response(
                data={"idea": data},
                message="Idea created successfully",
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.IDEA_CREATED,
            )
        except ValidationError as exc:
            logger.warning("Idea creation validation error: %s", exc.detail)
            return error_response(
                message="Invalid data",
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception("Unexpected error during idea creation: %s", exc)
            return error_response(
                message="Unable to create idea",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class IdeaDetailsAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def _get_idea(self, idea_id):
        return _get_idea(idea_id)

    def _get_idea_unfiltered(self, idea_id):
        return _get_idea_unfiltered(idea_id)

    def get(self, request, idea_id):
        idea = self._get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        #if not _can_view_idea(request.user, idea):
        #    return error_response(
        #        message="Forbidden",
        #        error="You are not allowed to view this idea.",
        #        status_code=status.HTTP_403_FORBIDDEN,
        #    )

        if idea.user_id != getattr(request.user, "id", None):
            Idea.objects.filter(pk=idea.pk).update(view_count=F("view_count") + 1)
            idea = self._get_idea(idea_id)

        serializer = IdeaSerializer(idea, context={"request": request})
        return success_response(
            data={"idea": serializer.data},
            message="Idea fetched successfully",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.IDEA_FETCHED,
        )

    def put(self, request, idea_id):
        return self._update(request, idea_id, partial=False)

    def patch(self, request, idea_id):
        return self._update(request, idea_id, partial=True)

    def delete(self, request, idea_id):
        idea = self._get_idea_unfiltered(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        is_owner = idea.user_id == getattr(request.user, "id", None)
        if not (is_owner or _user_in_roles(request.user, {RoleName.STAFF})):
            return error_response(
                message="Forbidden",
                error="You are not allowed to delete this idea.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_DELETE,
            )
        try:
            idea.deleted_at = timezone.now()
            idea.save(update_fields=["deleted_at"])
            return success_response(
                data=None,
                message="Idea deleted successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.IDEA_DELETED,
            )
        except Exception as exc:
            logger.exception("Unexpected error during idea deletion: %s", exc)
            return error_response(
                message="Unable to delete idea",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )

    def _update(self, request, idea_id, partial):
        idea = self._get_idea_unfiltered(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        allowed_roles = {RoleName.STAFF}
        logger.debug('idea.user_id %s, request.user %s', idea.user_id, getattr(request.user, "id", None))
        is_owner = idea.user_id == getattr(request.user, "id", None)
        logger.debug('is_owner %s', is_owner)
        if not (is_owner or _user_in_roles(request.user, allowed_roles)):
            return error_response(
                message="Forbidden",
                error="You are not allowed to update this idea.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_UPDATE,
            )

        try:
            serializer = IdeaUpdateSerializer(
                idea,
                data=request.data,
                partial=partial,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            idea = _get_idea(idea.id) or idea
            data = IdeaSerializer(idea, context={"request": request}).data
            _apply_counts_to_payload(idea, data, user=request.user)
            return success_response(
                data={"idea": data},
                message="Idea updated successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.IDEA_UPDATED,
            )
        except ValidationError as exc:
            logger.warning("Idea update validation error: %s", exc.detail)
            return error_response(
                message="Invalid data",
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception("Unexpected error during idea update: %s", exc)
            return error_response(
                message="Unable to update idea",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class IdeaThumbAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def _normalize_vote_value(self, value):
        if value is None:
            return None
        if isinstance(value, bool):
            return Vote.VOTE_THUMB_UP if value else Vote.VOTE_THUMB_DOWN
        if isinstance(value, (int, float)):
            if value > 0:
                return Vote.VOTE_THUMB_UP
            if value < 0:
                return Vote.VOTE_THUMB_DOWN
            return None
        text = str(value).strip().lower()
        if not text:
            return None
        normalized = text.replace("-", "_").replace(" ", "_")
        up_aliases = {
            Vote.VOTE_THUMB_UP,
            "thumb_up",
            "thumbs_up",
            "up",
            "upvote",
            "like",
            "liked",
            "+",
            "+1",
            "1",
            "true",
            "yes",
            "y",
        }
        down_aliases = {
            Vote.VOTE_THUMB_DOWN,
            "thumb_down",
            "thumbs_down",
            "down",
            "downvote",
            "dislike",
            "disliked",
            "-",
            "-1",
            "false",
            "no",
            "n",
        }
        if normalized in up_aliases or text in up_aliases:
            return Vote.VOTE_THUMB_UP
        if normalized in down_aliases or text in down_aliases:
            return Vote.VOTE_THUMB_DOWN
        return None

    def _extract_vote_type(self, request):
        candidates = []
        if hasattr(request, "data"):
            for key in ("vote_type", "vote", "thumb", "reaction"):
                candidates.append(request.data.get(key))
        if hasattr(request, "query_params"):
            for key in ("vote_type", "vote", "thumb", "reaction"):
                candidates.append(request.query_params.get(key))
        for raw_value in candidates:
            normalized = self._normalize_vote_value(raw_value)
            if normalized:
                return normalized
        return None

    def _reaction_payload(self, request, idea, force_reload=False):
        idea = _get_idea(idea.id) or idea
        summary = idea_thumb_summary(
            idea,
            user=request.user,
            force_reload=force_reload,
        )
        return {
            "idea_id": idea.id,
            "thumb_up_count": summary["up"],
            "thumb_down_count": summary["down"],
            "current_user_thumb": summary["current_user"],
        }

    def post(self, request, idea_id):
        if not _user_can_react(request.user):
            return error_response(
                message="Forbidden",
                error="You are not allowed to react to ideas.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_REACT,
            )

        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        #if not _can_view_idea(request.user, idea):
        #    return error_response(
        #        message="Forbidden",
        #        error="You are not allowed to react to this idea.",
        #        status_code=status.HTTP_403_FORBIDDEN,
        #    )

        if idea.academic_year_id and timezone.now() > idea.academic_year.final_closure_date:
            return error_response(
                message="Reactions are no longer accepted. The final closure date for this idea's academic year has passed.",
                error="Reactions are no longer accepted. The final closure date for this idea's academic year has passed.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FINAL_CLOSURE_PASSED,
            )

        vote_type = self._extract_vote_type(request)
        if vote_type not in {Vote.VOTE_THUMB_UP, Vote.VOTE_THUMB_DOWN}:
            return error_response(
                message="Invalid data",
                error={"vote_type": 'Must be either "thumb_up" or "thumb_down".'},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_INVALID_VOTE_TYPE,
            )

        try:
            vote, created = Vote.objects.get_or_create(
                idea=idea,
                user=request.user,
                defaults={"vote_type": vote_type},
            )
            if not created and vote.vote_type != vote_type:
                vote.vote_type = vote_type
                vote.save(update_fields=["vote_type", "updated_at"])
            payload = self._reaction_payload(request, idea, force_reload=True)
            return success_response(
                data={"thumb_summary": payload},
                message="Reaction saved successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.IDEA_REACTED,
            )
        except Exception as exc:
            logger.exception("Error saving vote for idea %s: %s", idea_id, exc)
            return error_response(
                message="Unable to save reaction",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )

    def delete(self, request, idea_id):
        if not _user_can_react(request.user):
            return error_response(
                message="Forbidden",
                error="You are not allowed to react to ideas.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_REACT,
            )

        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        if not _can_view_idea(request.user, idea):
            return error_response(
                message="Forbidden",
                error="You are not allowed to react to this idea.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_REACT,
            )

        try:
            vote = Vote.objects.filter(idea=idea, user=request.user).first()
            if vote:
                vote.delete()
            payload = self._reaction_payload(request, idea, force_reload=True)
            return success_response(
                data={"thumb_summary": payload},
                message="Reaction removed successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.IDEA_REACTION_REMOVED,
            )
        except Exception as exc:
            logger.exception("Error removing vote for idea %s: %s", idea_id, exc)
            return error_response(
                message="Unable to remove reaction",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class IdeaStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, idea_id):
        if not _user_in_roles(
            request.user,
            {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR},
        ):
            return error_response(
                message="Forbidden",
                error="You are not allowed to update idea statuses.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FORBIDDEN_STATUS,
            )

        idea = _get_idea_unfiltered(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        try:
            serializer = IdeaUpdateSerializer(
                idea,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            idea = _get_idea_unfiltered(idea.id) or idea
            data = IdeaSerializer(idea, context={"request": request}).data
            _apply_counts_to_payload(idea, data, user=request.user)
            return success_response(
                data={"idea": data},
                message="Idea status updated successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.IDEA_STATUS_UPDATED,
            )
        except ValidationError as exc:
            logger.warning("Idea status update validation error: %s", exc.detail)
            return error_response(
                message="Invalid data",
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception("Unexpected error during idea status update: %s", exc)
            return error_response(
                message="Unable to update idea status",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class CommentStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, idea_id, comment_id):
        if not _user_in_roles(
            request.user,
            {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR},
        ):
            return error_response(
                message="Forbidden",
                error="You are not allowed to update comment statuses.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.COMMENT_FORBIDDEN_STATUS,
            )

        comment = (
            Comment.objects.select_related("idea", "status")
            .filter(id=comment_id, idea_id=idea_id)
            .first()
        )
        if not comment:
            return error_response(
                message="Comment not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.COMMENT_NOT_FOUND,
            )

        status_name = request.data.get("status")
        status_id = request.data.get("status_id")

        if status_name is not None and status_id is not None:
            return error_response(
                message="Invalid data",
                error={
                    "status": "Provide either status or status_id, not both.",
                    "status_id": "Provide either status or status_id, not both.",
                },
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        if status_name is None and status_id is None:
            return error_response(
                message="Invalid data",
                error={"status": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        if status_name is not None:
            status_obj = Status.objects.filter(
                entity_type=Status.ENTITY_COMMENT,
                name__iexact=str(status_name).strip(),
            ).first()
            error_field = "status"
        else:
            status_obj = Status.objects.filter(
                id=status_id,
                entity_type=Status.ENTITY_COMMENT,
            ).first()
            error_field = "status_id"

        if not status_obj:
            return error_response(
                message="Invalid data",
                error={error_field: "Invalid status for comment."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        try:
            comment.status = status_obj
            comment.updated_by = request.user
            comment.save()
            serialized = _serialize_comment(comment)
            return success_response(
                data={"comment": serialized},
                message="Comment status updated successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.COMMENT_STATUS_UPDATED,
            )
        except Exception as exc:
            logger.exception("Unexpected error during comment status update: %s", exc)
            return error_response(
                message="Unable to update comment status",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.COMMENT_INTERNAL_ERROR,
            )


class CommentDetailAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def _get_comment(self, idea_id, comment_id):
        return (
            Comment.objects.select_related("idea", "status")
            .filter(id=comment_id, idea_id=idea_id, deleted_at__isnull=True)
            .first()
        )

    def put(self, request, idea_id, comment_id):
        return self._update(request, idea_id, comment_id, partial=False)

    def patch(self, request, idea_id, comment_id):
        return self._update(request, idea_id, comment_id, partial=True)

    def _update(self, request, idea_id, comment_id, partial=False):
        comment = self._get_comment(idea_id, comment_id)
        if not comment:
            return error_response(
                message="Comment not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.COMMENT_NOT_FOUND,
            )

        if comment.user_id != getattr(request.user, "id", None):
            return error_response(
                message="Forbidden",
                error="You are not allowed to edit this comment.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.COMMENT_FORBIDDEN_UPDATE,
            )

        comment_text = (request.data.get("comment_text") or "").strip()
        if not partial and not comment_text:
            return error_response(
                message="Invalid data",
                error={"comment_text": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        try:
            if comment_text:
                comment.comment_text = comment_text
            if "is_anonymous" in request.data:
                comment.is_anonymous = _truthy(request.data.get("is_anonymous"))
            comment.updated_by = request.user
            comment.save(update_fields=["comment_text", "is_anonymous", "updated_by_id"])
            return success_response(
                data={"comment": _serialize_comment(comment)},
                message="Comment updated successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.COMMENT_UPDATED,
            )
        except Exception as exc:
            logger.exception("Unexpected error during comment update: %s", exc)
            return error_response(
                message="Unable to update comment",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.COMMENT_INTERNAL_ERROR,
            )

    def delete(self, request, idea_id, comment_id):
        comment = self._get_comment(idea_id, comment_id)
        if not comment:
            return error_response(
                message="Comment not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.COMMENT_NOT_FOUND,
            )

        is_owner = comment.user_id == getattr(request.user, "id", None)
        is_manager = _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER})
        if not (is_owner or is_manager):
            return error_response(
                message="Forbidden",
                error="You are not allowed to delete this comment.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.COMMENT_FORBIDDEN_DELETE,
            )

        try:
            comment.deleted_at = timezone.now()
            comment.save(update_fields=["deleted_at"])
            return success_response(
                data=None,
                message="Comment deleted successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.COMMENT_DELETED,
            )
        except Exception as exc:
            logger.exception("Unexpected error during comment deletion: %s", exc)
            return error_response(
                message="Unable to delete comment",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.COMMENT_INTERNAL_ERROR,
            )


class IdeaDocumentFileAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, document_id):
        document = _get_document(document_id)
        if not document:
            return error_response(
                message="Document not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.DOCUMENT_NOT_FOUND,
            )
        
        # no need to validate
        #if not _can_view_idea(request.user, document.idea):
        #    return error_response(
        #        message="Forbidden",
        #        error="You are not allowed to view this document.",
        #        status_code=status.HTTP_403_FORBIDDEN,
        #        code=ErrorCode.DOCUMENT_FORBIDDEN_VIEW,
        #    )

        download = request.query_params.get("download")
        try:
            return _build_document_response(document, download=download)
        except Http404 as exc:
            return error_response(
                message=str(exc),
                status_code=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            logger.exception("Error streaming document %s: %s", document_id, exc)
            return error_response(
                message="Unable to stream document",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DOCUMENT_INTERNAL_ERROR,
            )


class IdeaDocumentDeleteAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def delete(self, request, document_id):
        document = _get_document(document_id)
        if not document:
            return error_response(
                message="Document not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.DOCUMENT_NOT_FOUND,
            )

        if not _can_manage_idea(request.user, document.idea):
            return error_response(
                message="Forbidden",
                error="You are not allowed to delete this document.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.DOCUMENT_FORBIDDEN_MANAGE,
            )

        try:
            _delete_document_file(document)
            document.delete()
            return success_response(
                data=None,
                message="Document deleted successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.DOCUMENT_DELETED,
            )
        except Exception as exc:
            logger.exception("Error deleting document %s: %s", document_id, exc)
            return error_response(
                message="Unable to delete document",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DOCUMENT_INTERNAL_ERROR,
            )


class IdeaDocumentUploadAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, idea_id):
        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        if not _can_manage_idea(request.user, idea):
            return error_response(
                message="Forbidden",
                error="You are not allowed to manage documents for this idea.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.DOCUMENT_FORBIDDEN_MANAGE,
            )

        files = _get_request_files(request, "documents")
        if not files:
            return error_response(
                message="Invalid data",
                error={"documents": "At least one document is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.DOCUMENT_INVALID_DATA,
            )

        try:
            _save_idea_documents(idea, files, request.user)
            idea = _get_idea(idea.id) or idea
            serializer = IdeaSerializer(idea, context={"request": request})
            return success_response(
                data={"idea": serializer.data},
                message="Documents uploaded successfully",
                status_code=status.HTTP_200_OK,
                code=ErrorCode.DOCUMENT_UPLOADED,
            )
        except Exception as exc:
            logger.exception("Error uploading documents for idea %s: %s", idea_id, exc)
            return error_response(
                message="Unable to upload documents",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DOCUMENT_INTERNAL_ERROR,
            )


def _notify_idea_author_on_comment(idea, comment, commenter):
    """Send an email notification to the idea author when a new comment is posted."""
    try:
        # Don't notify if the commenter is the idea author themselves
        if idea.user_id == commenter.id:
            return

        ## Don't notify if the idea was posted anonymously — the author's identity is hidden
        #if idea.is_anonymous:
        #    return

        author = idea.user
        if not author or not getattr(author, "email", None):
            logger.info(
                "Idea author has no email for idea_id=%s — skipping comment notification.",
                idea.id,
            )
            return

        commenter_name = "Anonymous" if comment.is_anonymous else commenter.full_name
        commented_at = comment.created_at.strftime("%Y-%m-%d %H:%M:%S") if comment.created_at else "N/A"

        dispatch_send_mail(
            to=author.email,
            subject="New Comment on Your Idea",
            mail_body={
                "template_name": "new_comment_notification.html",
                "context": {
                    "author_name": author.full_name,
                    "idea_title": idea.title,
                    "commenter_name": commenter_name,
                    "comment_text": comment.comment_text,
                    "commented_at": commented_at,
                },
            },
        )
        logger.info(
            "New-comment notification dispatched to idea author %s for idea_id=%s.",
            author.email,
            idea.id,
        )
    except Exception as exc:
        logger.exception(
            "Failed to send comment notification for idea_id=%s: %s",
            getattr(idea, "id", None),
            exc,
        )


class IdeaCommentAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, idea_id):
        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        include_hidden = _user_in_roles(request.user, {RoleName.QA_MANAGER})
        comments = _idea_comments_queryset(idea, include_hidden=include_hidden)
        data = [_serialize_comment(comment) for comment in comments]
        return success_response(
            data={"comments": data},
            message="Comments fetched successfully",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.COMMENT_FETCHED_LIST,
        )

    def post(self, request, idea_id):
        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        #if not _can_view_idea(request.user, idea):
        #    return error_response(
        #        message="Forbidden",
        #        error="You cannot comment on this idea.",
        #        status_code=status.HTTP_403_FORBIDDEN,
        #    )

        if idea.academic_year_id and timezone.now() > idea.academic_year.final_closure_date:
            return error_response(
                message="Forbidden",
                error="Comments are no longer accepted. The final closure date for this idea's academic year has passed.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.IDEA_FINAL_CLOSURE_PASSED,
            )

        if not _user_in_roles(
            request.user,
            {RoleName.STAFF},
        ):
            return error_response(
                message="Forbidden",
                error="Only staff users can comment on ideas.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.COMMENT_FORBIDDEN_CREATE,
            )

        comment_text = (request.data.get("comment_text") or "").strip()
        if not comment_text:
            return error_response(
                message="Invalid data",
                error={"comment_text": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        is_anonymous = _truthy(request.data.get("is_anonymous"))
        status_id = request.data.get("status_id")
        status_obj = _resolve_comment_status(status_id)
        if not status_obj:
            error_message = (
                "Invalid status for comment."
                if status_id
                else "Default comment status is not configured."
            )
            return error_response(
                message="Invalid data",
                error={"status_id": error_message},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.COMMENT_INVALID_DATA,
            )

        try:
            comment = Comment.objects.create(
                idea=idea,
                user=request.user,
                comment_text=comment_text,
                is_anonymous=is_anonymous,
                status=status_obj,
                updated_by=request.user,
            )
            serialized = _serialize_comment(comment)
            _notify_idea_author_on_comment(idea, comment, request.user)
            return success_response(
                data={"comment": serialized},
                message="Comment posted successfully",
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.COMMENT_CREATED,
            )
        except Exception as exc:
            logger.exception("Error creating comment on idea %s: %s", idea_id, exc)
            return error_response(
                message="Unable to create comment",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.COMMENT_INTERNAL_ERROR,
            )


class IdeaReportAPIView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsQA_Manager()]
        return [IsStaff()]

    def get(self, request, idea_id):
        idea = _get_idea_unfiltered(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        reports = (
            IdeaReport.objects
            .select_related("reporter")
            .filter(idea_id=idea_id, comment__isnull=True)
            .order_by("-created_at")
        )

        reports_data = []
        for report in reports:
            reports_data.append({
                "id": report.id,
                "reason": report.reason,
                "reported_by": {
                    "id": report.reporter_id,
                    "full_name": report.reporter.full_name,
                },
                "created_at": report.created_at,
            })

        return success_response(
            data={
                "idea": {
                    "id": idea.id,
                    "title": idea.title,
                },
                "reports": reports_data,
            },
            message="Reports fetched successfully",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.IDEA_REPORTS_FETCHED,
        )

    def post(self, request, idea_id):
        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        if request.user.id == idea.user.id:
            return error_response(
                message="You cannot report your own idea.",
                error="You cannot report your own idea.",
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_CANNOT_REPORT_OWN,
            )

        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return error_response(
                message="Invalid data",
                error={"reason": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.IDEA_REPORT_REASON_REQUIRED,
            )



        comment_id = request.data.get("comment_id")
        comment = None
        if comment_id is not None:
            comment = (
                Comment.objects.select_related("idea")
                .filter(id=comment_id, idea_id=idea.id)
                .first()
            )
            if not comment:
                return error_response(
                    message="Invalid data",
                    error={"comment_id": "Comment not found for this idea."},
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.IDEA_INVALID_DATA,
                )

        try:
            report = IdeaReport.objects.create(
                reporter=request.user,
                idea=comment.idea if comment else idea,
                comment=comment,
                reason=reason,
            )
            serialized = _serialize_report(report)
            return success_response(
                data={"report": serialized},
                message="Report submitted successfully",
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.IDEA_REPORTED,
            )
        except Exception as exc:
            logger.exception("Error reporting idea %s: %s", idea_id, exc)
            return error_response(
                message="Unable to submit report",
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.IDEA_INTERNAL_ERROR,
            )


class IdeaDepartmentNotifyAPIView(APIView):
    permission_classes = [IsQA_COORDINATOR]

    def post(self, request, idea_id):
        idea = _get_idea(idea_id)
        if not idea:
            return error_response(
                message="Idea not found",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.IDEA_NOT_FOUND,
            )

        coordinator = request.user
        department_id = getattr(coordinator, "department_id", None)
        if not department_id:
            return error_response(
                message="Forbidden",
                error="Your account is not assigned to a department.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.NOTIFY_FORBIDDEN_DEPARTMENT,
            )

        logger.info('coordinator department id %s and idea deaprtment id %s ', department_id, idea.department_id)
        if idea.department_id != department_id:
            return error_response(
                message="Forbidden",
                error="This idea does not belong to your department.",
                status_code=status.HTTP_403_FORBIDDEN,
                code=ErrorCode.NOTIFY_FORBIDDEN_IDEA_DEPARTMENT,
            )

        subject = (request.data.get("subject") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not subject:
            return error_response(
                message="Invalid data",
                error={"subject": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.NOTIFY_INVALID_DATA,
            )
        if not description:
            return error_response(
                message="Invalid data",
                error={"description": "This field is required."},
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.NOTIFY_INVALID_DATA,
            )

        recipients = (
            User.objects
            .filter(department_id=department_id)
            .exclude(id=coordinator.id)
        )
        logger.debug('recipients %s', recipients)
        if not recipients.exists():
            return error_response(
                message="No users found in your department.",
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.NOTIFY_NO_RECIPIENTS,
            )

        department_name = coordinator.department_name or str(department_id)
        idea_title = idea.title
        coordinator_name = coordinator.full_name

        dispatched = 0
        # Stagger sends by 2 seconds each to stay within Mailtrap free tier rate limit
        SEND_INTERVAL_SECONDS = 2

        for index, recipient in enumerate(recipients):
            try:
                QueueManager.dispatch_in(
                    seconds=index * SEND_INTERVAL_SECONDS,
                    task_name="tasks.send_email",
                    queue="mail",
                    to=recipient.email,
                    subject=subject,
                    mail_body={
                        "template_name": "department_idea_notification.html",
                        "context": {
                            "subject": subject,
                            "recipient_name": recipient.full_name,
                            "description": description,
                            "idea_title": idea_title,
                            "department_name": department_name,
                            "coordinator_name": coordinator_name,
                        },
                    },
                )
                dispatched += 1
            except Exception as exc:
                logger.exception(
                    "Failed to dispatch notification to %s for idea_id=%s: %s",
                    recipient.email,
                    idea_id,
                    exc,
                )

        logger.info(
            "Department idea notification dispatched to %d/%d users in department_id=%s for idea_id=%s.",
            dispatched,
            recipients.count(),
            department_id,
            idea_id,
        )

        return success_response(
            data={"notified_count": dispatched},
            message=f"Notification sent to {dispatched} user(s) in your department.",
            status_code=status.HTTP_200_OK,
            code=ErrorCode.NOTIFY_SENT,
        )