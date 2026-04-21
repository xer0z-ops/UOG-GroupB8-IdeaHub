# This ensures the Celery app is always imported when Django starts
# so that shared_task decorators use the correct app instance.
from uog_api.celery import celery_app as celery_app  # noqa: F401