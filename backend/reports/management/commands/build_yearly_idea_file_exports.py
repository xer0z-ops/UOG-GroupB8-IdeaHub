import os

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.zipper import build_year_csv, build_year_zip, get_year_csv_path, get_year_zip_path
from organization.models import AcademicYear


class Command(BaseCommand):
    help = (
        "Builds CSV and attachments zip for academic years whose final_closure_date has passed. "
        "Skips files that already exist. Run daily via system cron."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--year",
            type=str,
            help="Force build for a specific academic year name, ignoring date check and existing files.",
        )

    def handle(self, *args, **options):
        year_name = options.get("year")

        if year_name:
            self._build(year_name, force=True)
            return

        now = timezone.now()
        due_years = AcademicYear.objects.filter(final_closure_date__lte=now)

        if not due_years.exists():
            self.stdout.write("No academic years past final closure date.")
            return

        for academic_year in due_years:
            self._build(academic_year.name, force=False)

    def _build(self, year_name, force):
        self._build_csv(year_name, force)
        self._build_zip(year_name, force)

    def _build_csv(self, year_name, force):
        csv_path = get_year_csv_path(year_name)
        if not force and os.path.exists(csv_path):
            self.stdout.write(f"Skipping CSV for '{year_name}': already exists.")
            return
        try:
            path = build_year_csv(year_name)
            self.stdout.write(self.style.SUCCESS(f"Built CSV for '{year_name}': {path}"))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Failed CSV for '{year_name}': {exc}"))

    def _build_zip(self, year_name, force):
        zip_path = get_year_zip_path(year_name)
        if not force and os.path.exists(zip_path):
            self.stdout.write(f"Skipping zip for '{year_name}': already exists.")
            return
        try:
            path = build_year_zip(year_name)
            self.stdout.write(self.style.SUCCESS(f"Built zip for '{year_name}': {path}"))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Failed zip for '{year_name}': {exc}"))
