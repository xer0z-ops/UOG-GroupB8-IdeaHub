import os
import asyncio
import smtplib
import base64
import logging
from typing import Literal, Union, List, Optional

from string import Template
from email.message import EmailMessage

import mailtrap as mt
from django.conf import settings

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class AsyncMailer:
    def __init__(self, smtp_host, smtp_port, username, password, use_tls=True, use_auth=True, template_dir="templates"):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.use_auth = use_auth
        self.template_dir = template_dir

    async def send_email(self, to, subject, mail_body: Union[dict, str], attachments: List[str] = None, content_type: Literal["html", "text"] = "html"):
        await asyncio.to_thread(self.send_email_sync, to, subject, mail_body, attachments, content_type)

    def send_email_sync(self, to, subject, mail_body: Union[dict, str], attachments: List[str] = None, content_type: Literal["html", "text"] = "html"):
        msg = EmailMessage()
        msg['From'] = self.username
        msg['To'] = to
        msg['Subject'] = subject

        if isinstance(mail_body, dict):
            template_name = mail_body.get('template_name', '')
            context = mail_body.get('context', {})
            body = self._render_template(template_name, context)
        elif isinstance(mail_body, str):
            body = mail_body

        if content_type == "html":
            msg.add_alternative(body, subtype='html')
        else:
            msg.set_content(body)

        if attachments:
            for file_path in attachments:
                self._attach_file(msg, file_path)

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            if self.use_tls:
                server.starttls()
            
            print("MAIL_USE_AUTH raw:", os.getenv("MAIL_USE_AUTH"))

            print("self.use_auth parsed:", self.use_auth)           
            if self.use_auth:
                server.login(self.username, self.password)
            server.send_message(msg)

    def _attach_file(self, msg, file_path: str):
        try:
            with open(file_path, "rb") as file:
                file_data = file.read()
                file_name = os.path.basename(file_path)
                msg.add_attachment(file_data, maintype="application", subtype="octet-stream", filename=file_name)
        except Exception as e:
            print(f"Error attaching file {file_path}: {e}")

    def _render_template(self, template_name, context):
        template_path = os.path.join(BASE_DIR, self.template_dir, template_name)
        with open(template_path, "r", encoding="utf-8") as file:
            template = Template(file.read())
        return template.safe_substitute(context)
        

class MailtrapSender:
    """
    Sends emails via the Mailtrap HTTP API
    """
    def __init__(
        self,
        api_token: str,
        sender_email: str,
        sender_name: str = "UOG Group B8",
        template_dir: str = "templates",
        cc_email: Optional[str] = None,
    ):
        self.sender_email = sender_email
        self.sender_name = sender_name
        self.template_dir = template_dir
        self.cc_email = cc_email
        # need to refactor
        #self._client = mt.MailtrapClient(token=api_token, sandbox=True, inbox_id='2105647')
        self._client = mt.MailtrapClient(token=api_token, sandbox=True, inbox_id='4489028')

    async def send_email(
        self,
        to: str,
        subject: str,
        mail_body: Union[dict, str],
        attachments: Optional[List[str]] = None,
        content_type: str = "html",
    ) -> None:
        await asyncio.to_thread(
            self.send_email_sync, to, subject, mail_body, attachments, content_type
        )

    def send_email_sync(
        self,
        to: str,
        subject: str,
        mail_body: Union[dict, str],
        attachments: Optional[List[str]],
        content_type: str,
    ) -> None:
        body = self._resolve_body(mail_body)
        built_attachments = self._build_attachments(attachments or [])

        mail = mt.Mail(
            sender=mt.Address(email=self.sender_email, name=self.sender_name),
            to=[mt.Address(email=to)],
            subject=subject,
            html=body if content_type == "html" else None,
            text=body if content_type != "html" else None,
            cc=[mt.Address(email=self.cc_email)] if self.cc_email else None,
            attachments=built_attachments if built_attachments else None,
        )
        self._client.send(mail)
        logger.info("Mailtrap: email sent to %s — subject: %s", to, subject)

    def _resolve_body(self, mail_body: Union[dict, str]) -> str:
        if isinstance(mail_body, dict):
            template_name = mail_body.get("template_name", "")
            context = mail_body.get("context", {})
            return self._render_template(template_name, context)
        return mail_body

    def _render_template(self, template_name: str, context: dict) -> str:
        template_path = os.path.join(BASE_DIR, self.template_dir, template_name)
        with open(template_path, "r", encoding="utf-8") as f:
            template = Template(f.read())
        return template.safe_substitute(context)

    def _build_attachments(self, file_paths: List[str]) -> List[mt.Attachment]:
        result = []
        for path in file_paths:
            attachment = self._read_attachment(path)
            if attachment:
                result.append(attachment)
        return result

    def _read_attachment(self, file_path: str) -> Optional[mt.Attachment]:
        try:
            with open(file_path, "rb") as f:
                content = base64.b64encode(f.read())
            filename = os.path.basename(file_path)
            return mt.Attachment(
                content=content,
                filename=filename,
                disposition=mt.Disposition.ATTACHMENT,
            )
        except Exception as exc:
            logger.error("Failed to attach file %s: %s", file_path, exc)
            return None


def get_mailer(config: Optional[dict]) -> Union[AsyncMailer, MailtrapSender]:
    mail_backend = settings.MAIL_BACKEND
    logger.info('mail_backend %s', mail_backend)
    
    if mail_backend == 'mailtrap':
        return MailtrapSender(
            api_token=settings.MAILTRAP_API_TOKEN,
            sender_email=settings.MAILTRAP_SENDER_EMAIL,
            sender_name=settings.MAILTRAP_SENDER_NAME,
            cc_email=settings.MAILTRAP_CC_EMAIL,
        )
    elif mail_backend == 'smtp':
        use_tls = getattr(settings, "MAIL_SSL_TLS", "tls") == "tls"
        use_auth = getattr(settings, "MAIL_USE_AUTH", "false") == 'true'
        return AsyncMailer(
            smtp_host=settings.MAIL_HOST,
            smtp_port=settings.MAIL_PORT,
            username=settings.MAIL_USERNAME,
            password=settings.MAIL_PASSWORD,
            use_tls=use_tls,
            use_auth=use_auth,
        )
    