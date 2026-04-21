import logging

from core.queue import QueueManager, Task


def dispatch_send_mail(**data):
    """
    Dispatch an email sending task.

    Args:
        **data:
            to (str): Recipient email address.
            subject (str): Email subject.
            mail_body (dict):
                template_name (str): Template file name.
                context (dict): Template variables.

    Returns:
        Any: Task object returned by QueueManager.dispatch.
    """ 
    task = QueueManager.dispatch(
        "tasks.send_email",
        queue="mail",
        **data
    )
    return task