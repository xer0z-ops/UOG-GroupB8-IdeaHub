import logging
from celery import Task
from typing import Any, Dict, Optional

from uog_api.celery import celery_app

logger = logging.getLogger("apps")


class BaseQueueTask(Task):
    """
    Abstract base class for all background tasks.
    """

    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "[Queue] Task '%s' (id=%s) FAILED permanently. Error: %s",
            self.name, task_id, exc,
            exc_info=True,
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(
            "[Queue] Task '%s' (id=%s) retrying — attempt %d/%d. Reason: %s",
            self.name, task_id,
            self.request.retries + 1, self.max_retries,
            exc,
        )
        super().on_retry(exc, task_id, args, kwargs, einfo)

    def on_success(self, retval, task_id, args, kwargs):
        logger.info(
            "[Queue] Task '%s' (id=%s) completed successfully.",
            self.name, task_id,
        )
        super().on_success(retval, task_id, args, kwargs)


class QueueManager:
    """
    Centralised dispatcher for all background tasks.
    """

    DEFAULT_QUEUE = "default"

    @staticmethod
    def dispatch(
        task_name: str,
        queue: str = DEFAULT_QUEUE,
        task_kwargs: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        """Dispatch a task for immediate execution."""
        payload = {**(task_kwargs or {}), **kwargs}
        logger.debug("[Queue] Dispatching '%s' → queue='%s' payload=%s", task_name, queue, payload)
        task = celery_app.send_task(task_name, kwargs=payload, queue=queue)
        logger.info("[Queue] Dispatched '%s' (id=%s) → queue='%s'", task_name, task.id, queue)
        return task

    @staticmethod
    def dispatch_in(
        seconds: int,
        task_name: str,
        queue: str = DEFAULT_QUEUE,
        task_kwargs: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        """Dispatch a task after a delay of `seconds`."""
        payload = {**(task_kwargs or {}), **kwargs}
        logger.debug(
            "[Queue] Scheduling '%s' in %ds → queue='%s' payload=%s",
            task_name, seconds, queue, payload,
        )
        task = celery_app.send_task(task_name, kwargs=payload, queue=queue, countdown=seconds)
        logger.info(
            "[Queue] Dispatched '%s' (id=%s) → queue='%s' countdown=%ds",
            task_name, task.id, queue, seconds,
        )
        return task

    @staticmethod
    def dispatch_at(
        eta,
        task_name: str,
        queue: str = DEFAULT_QUEUE,
        task_kwargs: Optional[Dict[str, Any]] = None,
        **kwargs,
    ):
        """
        Dispatch a task at a specific datetime.

        `eta` must be a timezone-aware datetime object.
        """
        payload = {**(task_kwargs or {}), **kwargs}
        logger.debug(
            "[Queue] Scheduling '%s' at %s → queue='%s' payload=%s",
            task_name, eta, queue, payload,
        )
        task = celery_app.send_task(task_name, kwargs=payload, queue=queue, eta=eta)
        logger.info(
            "[Queue] Dispatched '%s' (id=%s) → queue='%s' eta=%s",
            task_name, task.id, queue, eta,
        )
        return task

    @staticmethod
    def revoke(task_id: str, terminate: bool = False):
        """Cancel a queued (or running) task by its task id."""
        celery_app.control.revoke(task_id, terminate=terminate)
        logger.info("[Queue] Revoked task id=%s (terminate=%s)", task_id, terminate)
        