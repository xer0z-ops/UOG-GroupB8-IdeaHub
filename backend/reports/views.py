import io
import logging
import os
import uuid

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
from rest_framework import status
from rest_framework.views import APIView

from authentication.permissions import IsAuthenticatedUser
from core.pagination import DefaultPageNumberPagination
from core.responses import _get_message, error_response, success_response
from ideas.models import Comment, Idea, Vote
from reports.models import ContributorActivityPerDepartmentView, ContributorsPerDepartmentView, IdeasPerCategoryView, IdeasPerDepartmentView

from core.constants import ErrorCode, RoleName
from core.models import UserLogins
from core.zipper import get_year_csv_path, get_year_zip_path
from organization.models import AcademicYear

IDEA_REPORT_TYPES = ["without_comments", "anonymous"]
COMMENT_REPORT_TYPES = ["anonymous"]

logger = logging.getLogger("apps")


def _user_in_roles(user, roles):
    return getattr(user, "is_authenticated", False) and getattr(user, "role_name", None) in roles


def _get_academic_year_obj(academic_year_name):
    try:
        return AcademicYear.objects.get(name__iexact=academic_year_name)
    except AcademicYear.DoesNotExist:
        return None


def _get_browser_usage(academic_year=None):
    qs = UserLogins.objects.exclude(browser__isnull=True).exclude(browser="")

    if academic_year:
        ay = _get_academic_year_obj(academic_year)
        if not ay:
            return {}
        qs = qs.filter(login_time__date__gte=ay.start_date, login_time__date__lte=ay.end_date)

    total = qs.count()
    if total == 0:
        return {}

    browser_counts = qs.values("browser").annotate(count=Count("id")).order_by("-count")
    return {
        item["browser"]: round(item["count"] / total * 100, 1)
        for item in browser_counts
    }


def _get_login_activity():
    today = timezone.now().date()
    since = today - timedelta(days=6)

    counts = (
        UserLogins.objects.filter(login_time__date__gte=since)
        .annotate(date=TruncDate("login_time"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    counts_by_date = {item["date"]: item["count"] for item in counts}
    return [
        {"date": str(since + timedelta(days=i)), "count": counts_by_date.get(since + timedelta(days=i), 0)}
        for i in range(7)
    ]


def _get_most_active_users(academic_year=None):
    qs = UserLogins.objects.select_related("user")

    if academic_year:
        ay = _get_academic_year_obj(academic_year)
        if not ay:
            return []
        qs = qs.filter(login_time__date__gte=ay.start_date, login_time__date__lte=ay.end_date)

    top = (
        qs.values("user__id", "user__full_name", "user__email")
        .annotate(login_count=Count("id"))
        .order_by("-login_count")[:5]
    )

    return [
        {
            "id": item["user__id"],
            "full_name": item["user__full_name"],
            "email": item["user__email"],
            "login_count": item["login_count"],
        }
        for item in top
    ]


class IdeaStatisticsAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
            return error_response(
                code=ErrorCode.REPORTS_FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )

        academic_year = request.query_params.get("academic_year")
        is_qa_coordinator = request.user.role_name == RoleName.QA_COORDINATOR

        try:
            if is_qa_coordinator:
                dept_id = request.user.department_id

                ideas_per_category_qs = IdeasPerCategoryView.objects.filter(department_id=dept_id)
                contributor_activity_qs = ContributorActivityPerDepartmentView.objects.filter(department_id=dept_id)

                if academic_year:
                    ideas_per_category_qs = ideas_per_category_qs.filter(academic_year__iexact=academic_year)
                    contributor_activity_qs = contributor_activity_qs.filter(academic_year__iexact=academic_year)

                response_data = {
                    "ideas_per_category": list(
                        ideas_per_category_qs.order_by("academic_year", "-idea_count").values(
                            "category", "academic_year", "idea_count", "percentage"
                        )
                    ),
                    "contributions": list(
                        contributor_activity_qs.order_by("academic_year").values(
                            "academic_year", "contributed_count", "not_contributed_count",
                            "total_user_count", "contributed_percentage", "not_contributed_percentage"
                        )
                    ),
                }
            elif request.user.role_name == RoleName.ADMIN:
                response_data = {
                    "browser_usage_percentage": _get_browser_usage(academic_year),
                    "most_active_users": _get_most_active_users(academic_year),
                    "login_activity": _get_login_activity(),
                }
            else:
                ideas_qs = IdeasPerDepartmentView.objects.all()
                contributors_qs = ContributorsPerDepartmentView.objects.all()

                if academic_year:
                    ideas_qs = ideas_qs.filter(academic_year__iexact=academic_year)
                    contributors_qs = contributors_qs.filter(academic_year__iexact=academic_year)

                response_data = {
                    "ideas_per_department": list(
                        ideas_qs.order_by("academic_year", "-idea_count").values(
                            "department", "academic_year", "idea_count", "percentage"
                        )
                    ),
                    "contributors_per_department": list(
                        contributors_qs.order_by("academic_year", "-contributor_count").values(
                            "department", "academic_year", "contributor_count", "percentage"
                        )
                    ),
                }

            return success_response(
                data=response_data,
                code=ErrorCode.REPORTS_SUCCESS,
                status_code=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("Unexpected error fetching statistics: %s", exc)
            return error_response(
                code=ErrorCode.GENERIC_INTERNAL_SERVER_ERROR,
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IdeaReportListAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
            return error_response(
                code=ErrorCode.REPORTS_FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )

        report_type = request.query_params.get("type")
        if report_type not in IDEA_REPORT_TYPES:
            return error_response(
                code=ErrorCode.REPORTS_INVALID_TYPE,
                error=f"Invalid report type. Valid options are: {', '.join(IDEA_REPORT_TYPES)}",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        academic_year = request.query_params.get("academic_year")

        try:
            qs = (
                Idea.objects.select_related("user", "department", "status")
                .annotate(
                    comment_count=Count("comments", distinct=True),
                    thumb_up=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_UP), distinct=True),
                    thumb_down=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_DOWN), distinct=True),
                    report_count=Count("reports", distinct=True),
                )
                .filter(deleted_at__isnull=True)
                .order_by("-created_at")
            )

            if report_type == "without_comments":
                qs = qs.filter(comment_count=0)
            elif report_type == "anonymous":
                qs = qs.filter(is_anonymous=True)

            if academic_year:
                qs = qs.filter(academic_year__name__iexact=academic_year)

            if request.user.role_name == RoleName.QA_COORDINATOR:
                qs = qs.filter(department_id=request.user.department_id)

            paginator = DefaultPageNumberPagination()
            page = paginator.paginate_queryset(qs, request)

            payload = [
                {
                    "id": idea.id,
                    "title": idea.title,
                    "status": {
                        "id": idea.status.id,
                        "name": idea.status.name,
                        "description": idea.status.description,
                    },
                    "user": None if idea.is_anonymous else {
                        "id": idea.user.id,
                        "full_name": idea.user.full_name,
                        "email": idea.user.email,
                    },
                    "department": {
                        "id": idea.department.id,
                        "name": idea.department.name,
                    },
                    "thumb_up": idea.thumb_up,
                    "thumb_down": idea.thumb_down,
                    "report_count": idea.report_count,
                }
                for idea in page
            ]

            response = paginator.get_paginated_response(payload)
            response.data["message"] = _get_message(ErrorCode.REPORTS_SUCCESS, fallback="Success")
            return response
        except Exception as exc:
            logger.exception("Unexpected error fetching idea report list: %s", exc)
            return error_response(
                code=ErrorCode.GENERIC_INTERNAL_SERVER_ERROR,
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CommentReportListAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not _user_in_roles(request.user, {RoleName.ADMIN, RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}):
            return error_response(
                code=ErrorCode.REPORTS_FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )

        report_type = request.query_params.get("type")
        if report_type not in COMMENT_REPORT_TYPES:
            return error_response(
                code=ErrorCode.REPORTS_INVALID_TYPE,
                error=f"Invalid report type. Valid options are: {', '.join(COMMENT_REPORT_TYPES)}",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        academic_year = request.query_params.get("academic_year")

        try:
            qs = (
                Comment.objects.select_related("status", "idea", "idea__user", "idea__department", "idea__status")
                .annotate(
                    idea_thumb_up=Count("idea__votes", filter=Q(idea__votes__vote_type=Vote.VOTE_THUMB_UP), distinct=True),
                    idea_thumb_down=Count("idea__votes", filter=Q(idea__votes__vote_type=Vote.VOTE_THUMB_DOWN), distinct=True),
                    idea_report_count=Count("idea__reports", distinct=True),
                )
                .filter(is_anonymous=True)
                .order_by("-created_at")
            )

            if academic_year:
                qs = qs.filter(idea__academic_year__name__iexact=academic_year)

            if request.user.role_name == RoleName.QA_COORDINATOR:
                qs = qs.filter(idea__department_id=request.user.department_id)

            paginator = DefaultPageNumberPagination()
            page = paginator.paginate_queryset(qs, request)

            payload = [
                {
                    "id": comment.id,
                    "status": {
                        "id": comment.status.id,
                        "name": comment.status.name,
                        "description": comment.status.description,
                    },
                    "text": comment.comment_text,
                    "idea": {
                        "id": comment.idea.id,
                        "title": comment.idea.title,
                        "status": {
                            "id": comment.idea.status.id,
                            "name": comment.idea.status.name,
                            "description": comment.idea.status.description,
                        },
                        "user": None if comment.idea.is_anonymous else {
                            "id": comment.idea.user.id,
                            "full_name": comment.idea.user.full_name,
                            "email": comment.idea.user.email,
                        },
                        "department": {
                            "id": comment.idea.department.id,
                            "name": comment.idea.department.name,
                        },
                        "thumb_up": comment.idea_thumb_up,
                        "thumb_down": comment.idea_thumb_down,
                        "report_count": comment.idea_report_count,
                    },
                }
                for comment in page
            ]

            response = paginator.get_paginated_response(payload)
            response.data["message"] = _get_message(ErrorCode.REPORTS_SUCCESS, fallback="Success")
            return response
        except Exception as exc:
            logger.exception("Unexpected error fetching comment report list: %s", exc)
            return error_response(
                code=ErrorCode.GENERIC_INTERNAL_SERVER_ERROR,
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IdeaFileExportAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        if not _user_in_roles(request.user, {RoleName.QA_MANAGER}):
            return error_response(
                code=ErrorCode.REPORTS_FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )

        academic_year = request.query_params.get("academic_year")
        if not academic_year:
            return error_response(
                code=ErrorCode.REPORTS_MISSING_ACADEMIC_YEAR,
                error="academic_year query parameter is required.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        csv_path = get_year_csv_path(academic_year)
        zip_path = get_year_zip_path(academic_year)

        if not os.path.exists(csv_path) or not os.path.exists(zip_path):
            return error_response(
                code=ErrorCode.REPORTS_ZIP_NOT_READY,
                error=f"Export files for academic year '{academic_year}' are not ready yet.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:
            with open(csv_path, "rb") as f:
                csv_bytes = f.read()

            with open(zip_path, "rb") as f:
                zip_bytes = f.read()

            boundary = uuid.uuid4().hex
            body = io.BytesIO()

            # Part 1: CSV
            body.write(f"--{boundary}\r\n".encode())
            body.write(b"Content-Type: text/csv; charset=utf-8\r\n")
            body.write(f'Content-Disposition: attachment; filename="{academic_year}_ideas.csv"\r\n'.encode())
            body.write(b"\r\n")
            body.write(csv_bytes)
            body.write(b"\r\n")

            # Part 2: ZIP
            body.write(f"--{boundary}\r\n".encode())
            body.write(b"Content-Type: application/zip\r\n")
            body.write(f'Content-Disposition: attachment; filename="{academic_year}_attachments.zip"\r\n'.encode())
            body.write(b"\r\n")
            body.write(zip_bytes)
            body.write(b"\r\n")

            body.write(f"--{boundary}--\r\n".encode())

            body.seek(0)
            return HttpResponse(body.read(), content_type=f"multipart/mixed; boundary={boundary}")

        except Exception as exc:
            logger.exception("Unexpected error returning export files: %s", exc)
            return error_response(
                code=ErrorCode.GENERIC_INTERNAL_SERVER_ERROR,
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
