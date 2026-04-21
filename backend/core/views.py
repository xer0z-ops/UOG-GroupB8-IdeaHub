import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from authentication.permissions import IsAuthenticatedUser
from core.models import Status
from core.responses import error_response, success_response
from core.serializers import StatusSerializer
from core.queue import QueueManager
from core.tasks import send_email, ping  # ensures tasks are registered with celery_app

logger = logging.getLogger("apps")


class StatusListAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        entity_type = request.query_params.get("entity_type")

        valid_entity_types = {choice[0] for choice in Status.ENTITY_CHOICES}

        if not entity_type:
            return error_response(
                message="Invalid request",
                error={"entity_type": "Provide `entity_type` or `enum_type` query parameter."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if entity_type not in valid_entity_types:
            valid_values = ", ".join(sorted(valid_entity_types))
            return error_response(
                message="Invalid request",
                error={
                    'entity_type': (
                        f"Unsupported value '{entity_type}'. Valid options: {valid_values}."
                    )
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        statuses_qs = Status.objects.filter(entity_type=entity_type).order_by("name")
        serializer = StatusSerializer(statuses_qs, many=True)

        return success_response(
            data={"statuses": serializer.data},
            message="Statuses fetched successfully",
            status_code=status.HTTP_200_OK,
        )


class PingView(APIView):
    """
    POST /api/core/test/ping
    Dispatches a ping task to verify the Celery worker and broker are reachable end-to-end.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get("message", "pong")

        task = QueueManager.dispatch(
            "tasks.ping",
            queue="default",
            message=message,
        )

        logger.info("[PingView] Dispatched ping task id=%s message='%s'", task.id, message)

        return success_response(
            data={"task_id": task.id, "message": message},
            message="Ping dispatched — check your worker logs.",
            status_code=status.HTTP_202_ACCEPTED,
        )


class SendMailTestView(APIView):
    """
    POST /api/core/test/send-email
    Test endpoint for the background mail queue.
    """
    permission_classes = [AllowAny] 

    def get(self, request):
        to = 'waithawoocw@gmail.com'
        subject = 'Hello Testing from UOG QA GroupB8'
        mail_body = {
            "template_name": "welcome_email.html",
            "context": { "name": "Wai" }
        }
        content_type = 'html'
        attachments = None
        mailer_config = {'backend': 'hello'}
        
        task = QueueManager.dispatch(
            "tasks.send_email",
            queue="mail",
            to=to,
            subject=subject,
            mail_body=mail_body,
            attachments=attachments,
            content_type=content_type,
            mailer_config=mailer_config,
        )

        logger.info("[SendMailTestView] Queued send_email task id=%s to='%s'", task.id, to)

        return success_response(
            data={"task_id": task.id},
            message="Email queued successfully",
            status_code=status.HTTP_202_ACCEPTED,
        )
        