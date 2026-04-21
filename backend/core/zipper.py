import csv
import logging
import os
import zipfile

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Count, Q

logger = logging.getLogger("apps")

EXPORTS_DIR = os.path.join(settings.MEDIA_ROOT, "exports")


def _get_year_dir(academic_year_name):
    return os.path.join(EXPORTS_DIR, academic_year_name)


def get_year_zip_path(academic_year_name):
    return os.path.join(_get_year_dir(academic_year_name), f"{academic_year_name}_attachments.zip")


def get_year_csv_path(academic_year_name):
    return os.path.join(_get_year_dir(academic_year_name), f"{academic_year_name}_ideas.csv")


def build_year_zip(academic_year_name):
    """
    Builds a zip of all idea documents for the given academic year.
    Structure inside zip: {academic_year_name}/{idea_id}/{file_name}
    Stored at: media/exports/{academic_year_name}/{academic_year_name}_attachments.zip
    """
    from ideas.models import Document
    from organization.models import AcademicYear

    try:
        academic_year = AcademicYear.objects.get(name__iexact=academic_year_name)
    except AcademicYear.DoesNotExist:
        raise ValueError(f"Academic year '{academic_year_name}' not found.")

    documents = (
        Document.objects.select_related("idea")
        .filter(idea__academic_year=academic_year)
        .order_by("idea_id")
    )

    os.makedirs(_get_year_dir(academic_year_name), exist_ok=True)
    zip_path = get_year_zip_path(academic_year_name)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in documents:
            if not default_storage.exists(doc.storage_path):
                logger.warning(
                    "Document file missing in storage: %s (document_id=%s, idea_id=%s)",
                    doc.storage_path, doc.id, doc.idea_id,
                )
                continue

            with default_storage.open(doc.storage_path, "rb") as f:
                arcname = f"{academic_year_name}/{doc.idea_id}/{doc.file_name}"
                zf.writestr(arcname, f.read())

    logger.info("Built attachments zip for '%s' at: %s", academic_year_name, zip_path)
    return zip_path


def build_year_csv(academic_year_name):
    """
    Builds a CSV of all ideas for the given academic year.
    Stored at: media/exports/{academic_year_name}/{academic_year_name}_ideas.csv
    """
    from ideas.models import Idea, Vote
    from organization.models import AcademicYear

    try:
        academic_year = AcademicYear.objects.get(name__iexact=academic_year_name)
    except AcademicYear.DoesNotExist:
        raise ValueError(f"Academic year '{academic_year_name}' not found.")

    qs = (
        Idea.objects.select_related("user", "status")
        .prefetch_related("categories")
        .filter(academic_year=academic_year)
        .annotate(
            thumb_up_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_UP), distinct=True),
            thumb_down_count=Count("votes", filter=Q(votes__vote_type=Vote.VOTE_THUMB_DOWN), distinct=True),
            comment_count=Count("comments", distinct=True),
            report_count=Count("reports", distinct=True),
        )
        .filter(deleted_at__isnull=True)
        .order_by("-created_at")
    )

    os.makedirs(_get_year_dir(academic_year_name), exist_ok=True)
    csv_path = get_year_csv_path(academic_year_name)

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Idea ID",
            "Idea Title",
            "Idea Detail",
            "Thumb Up Count",
            "Thumb Down Count",
            "Comment Count",
            "Report Count",
            "Status",
            "Created At",
            "Updated At",
            "Category",
            "Submitted By",
        ])
        for idea in qs:
            categories = ", ".join(c.name for c in idea.categories.all())
            submitted_by = "Anonymous" if idea.is_anonymous else idea.user.full_name
            writer.writerow([
                idea.id,
                idea.title,
                idea.description,
                idea.thumb_up_count,
                idea.thumb_down_count,
                idea.comment_count,
                idea.report_count,
                idea.status.description,
                idea.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                idea.updated_at.strftime("%Y-%m-%d %H:%M:%S") if idea.updated_at else "",
                categories,
                submitted_by,
            ])

    logger.info("Built ideas CSV for '%s' at: %s", academic_year_name, csv_path)
    return csv_path
