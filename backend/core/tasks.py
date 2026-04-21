from __future__ import annotations

import logging
import os
import shutil
import tempfile
from typing import Dict, List, Literal, Optional, Union

import requests as http

from core.queue import BaseQueueTask, celery_app

logger = logging.getLogger("apps")


# Health check/ping task to verify the worker is alive
@celery_app.task(
    bind=True,
    base=BaseQueueTask,
    name="tasks.ping",
    max_retries=0,
)
def ping(self, message: str = "pong"):
    """
    Dispatch from the test API:
        POST /api/test/ping   { "message": "hello" }
    """
    logger.info("[Task:ping] received — message='%s' task_id='%s'", message, self.request.id)
    print(f"[Task:ping] message='{message}' task_id='{self.request.id}'")
    return message


# Mail task
@celery_app.task(
    bind=True,
    base=BaseQueueTask,
    name="tasks.send_email",
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=5,
    retry_backoff_max=60,
    retry_jitter=True,
)
def send_email(
    self,
    to: str,
    subject: str,
    mail_body: Union[dict, str],
    attachments: Optional[List[str]] = None,
    content_type: Literal["html", "text"] = "html",
    mailer_config: Optional[Dict] = None,
):
    """
    Send an email in the background
    """
    from django.conf import settings
    from mailer.core import get_mailer
    
    mailer = get_mailer(mailer_config)
    mailer.send_email_sync(
        to=to,
        subject=subject,
        mail_body=mail_body,
        attachments=attachments,
        content_type=content_type,
    )
    logger.info("[Task:send_email] Email sent to '%s'.", to)
