import logging
import re
import jwt
import secrets
import string
import user_agents
from rest_framework.views import APIView
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.utils.crypto import get_random_string
from django.utils import timezone

from core.jwt import generate_access_token, generate_refresh_token, decode_token
from core.models import UserLogins
from core.responses import success_response, error_response
from core.utils import dispatch_send_mail
from users.models import User
from authentication.permissions import IsAdmin, IsAuthenticatedUser
from core.constants import RoleName, ErrorCode
from organization.models import AcademicYear

logger = logging.getLogger('apps')


def _current_academic_year():
    """Return the AcademicYear whose date range covers today as a dict, or None."""
    today = timezone.now().date()
    year = AcademicYear.objects.filter(start_date__lte=today, end_date__gte=today).first()
    if not year:
        return None
    return {
        'id': year.id,
        'name': year.name,
        'start_date': year.start_date.isoformat(),
        'end_date': year.end_date.isoformat(),
        'idea_closure_date': year.idea_closure_date.isoformat(),
        'final_closure_date': year.final_closure_date.isoformat(),
    }


def _parse_browser(request) -> str:
    """Return a concise browser/OS label parsed from the User-Agent header."""
    ua_string = request.META.get('HTTP_USER_AGENT', '')
    if not ua_string:
        return 'Unknown'
    ua = user_agents.parse(ua_string)
    browser = ua.browser.family
    browser_version = ua.browser.version_string.split('.')[0]  # major version only
    os_family = ua.os.family
    parts = []
    if browser and browser != 'Other':
        parts.append(f"{browser} {browser_version}".strip())
    if os_family and os_family != 'Other':
        parts.append(os_family)
    return ' / '.join(parts) if parts else (ua_string[:100] or 'Unknown')


class LoginApi(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            email = request.data.get('email')
            password = request.data.get('password')

            try:
                user_obj = User.objects.get(email=email, deleted_at__isnull=True)
            except User.DoesNotExist:
                return error_response(
                    message='No account found with that email address.',
                    status_code=401,
                    code=ErrorCode.AUTH_EMAIL_NOT_FOUND,
                )

            if user_obj.is_disabled:
                return error_response(
                    message='Your account is disabled. Please contact your administrator.',
                    status_code=401,
                    code=ErrorCode.AUTH_ACCOUNT_DISABLED,
                )
            is_default_password = user_obj.is_default_password

            user = authenticate(
                request,
                username=email,
                password=password
            )

            if not user:
                return error_response(
                    message='Incorrect password. Please try again.',
                    status_code=401,
                    code=ErrorCode.AUTH_WRONG_PASSWORD,
                )

            previous_login = (
                UserLogins.objects
                .filter(user=user)
                .order_by('-login_time')
                .first()
            )
            last_login = previous_login.login_time.isoformat() if previous_login else None
            last_logged_in_device = previous_login.browser if previous_login else None

            try:
                UserLogins.objects.create(
                    user=user,
                    browser=_parse_browser(request),
                )
            except Exception as log_exc:
                logger.warning('Failed to record user login for user_id=%s: %s', user.id, log_exc)

            return success_response(
                message='Login successful',
                data={
                    'access_token': generate_access_token(user),
                    'refresh_token': generate_refresh_token(user),
                    'token_type': 'Bearer',
                    'expires_in': 300,
                    'last_login': last_login,
                    'last_logged_in_device': last_logged_in_device,
                    'current_academic_year': _current_academic_year(),
                    'is_default_password': is_default_password,
                },
                code=ErrorCode.AUTH_LOGIN_SUCCESS,
            )
        except Exception as ex:
            logger.info('Error in login %s', ex)
            return error_response(
                message='Internal Server Error',
                status_code=500,
                code=ErrorCode.AUTH_INTERNAL_ERROR,
            )


class RefreshTokenApi(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = request.data.get('refresh_token')

        logger.info('token %s', token)
        if not token:
            return error_response(
                message='Refresh token required',
                status_code=400,
                code=ErrorCode.AUTH_REFRESH_TOKEN_REQUIRED,
            )

        try:
            payload = decode_token(token)
            logger.debug('payload %s', payload)
        except jwt.ExpiredSignatureError:
            return error_response(
                message='Refresh token expired',
                status_code=401,
                code=ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED,
            )
        except jwt.InvalidTokenError:
            return error_response(
                message='Invalid refresh token',
                status_code=401,
                code=ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            )

        if payload.get('type') != 'refresh':
            return error_response(
                message='Invalid token type',
                status_code=401,
                code=ErrorCode.AUTH_TOKEN_TYPE_INVALID,
            )

        try:
            user = User.objects.get(id=payload['sub'], deleted_at__isnull=True)
        except User.DoesNotExist:
            return error_response(
                message='User not found',
                status_code=401,
                code=ErrorCode.AUTH_USER_NOT_FOUND,
            )

        return success_response(
            data={
                'access_token': generate_access_token(user),
                'token_type': 'Bearer',
                'expires_in': 300,
            },
            message='Token refreshed',
            code=ErrorCode.AUTH_TOKEN_REFRESHED,
        )


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        user = request.user

        latest_login = (
            UserLogins.objects
            .filter(user=user)
            .order_by('-login_time')
            .first()
        )

        user_data = {
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'role': {
                'id': user.role_id,
                'name': user.role_name,
                'description': user.role.description,
            },
            'department': {
                'id': user.department_id,
                'name': user.department_name,
            },
            'status': {
                'id': user.status_id,
                'name': user.status_name,
                'description': user.status.description,
            },
            'last_login': latest_login.login_time.isoformat() if latest_login else None,
            'last_logged_in_device': latest_login.browser if latest_login else None,
            'current_academic_year': _current_academic_year(),
        }

        return success_response(
            data={'user': user_data},
            message='Profile fetched successfully',
            status_code=status.HTTP_200_OK,
            code=ErrorCode.AUTH_PROFILE_FETCHED,
        )


def _validate_new_password(password):
    """Enforce password complexity rules. Returns an error message string, or None if valid."""
    if len(password) < 8:
        return 'Password must be at least 8 characters long.'
    if not re.search(r'[A-Z]', password):
        return 'Password must contain at least one uppercase letter.'
    if not re.search(r'[a-z]', password):
        return 'Password must contain at least one lowercase letter.'
    if not re.search(r'\d', password):
        return 'Password must contain at least one digit.'
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'\",.<>?/\\|`~]', password):
        return 'Password must contain at least one special character.'
    return None


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        try:
            user = request.user
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            confirmed_password = request.data.get('confirmed_password')

            if not current_password or not new_password or not confirmed_password:
                return error_response(
                    message='current_password, new_password, and confirmed_password are required',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_PASSWORD_FIELDS_REQUIRED,
                )

            if new_password != confirmed_password:
                return error_response(
                    message='new_password and confirmed_password do not match',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_PASSWORDS_DO_NOT_MATCH,
                )

            password_error = _validate_new_password(new_password)
            if password_error:
                return error_response(
                    message=password_error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_PASSWORD_TOO_WEAK,
                )

            if check_password(new_password, user.password):
                return error_response(
                    message='New password must be different from the current password.',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_NEW_PASSWORD_SAME_AS_CURRENT,
                )

            if not check_password(current_password, user.password):
                return error_response(
                    message='Current password is incorrect',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_CURRENT_PASSWORD_INCORRECT,
                )

            user.set_password(new_password)
            user.is_default_password = False
            user.save(update_fields=['password', 'is_default_password'])

            return success_response(
                message='Password changed successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.AUTH_PASSWORD_CHANGED,
            )
        except Exception as ex:
            logger.info('Error in change password %s', ex)
            return error_response(
                message='Internal Server Error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.AUTH_INTERNAL_ERROR,
            )


class AdminForgotPasswordAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            email = (request.data.get('email') or '').strip()
            if not email:
                return error_response(
                    message='email is required',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_EMAIL_REQUIRED,
                )

            try:
                user = User.objects.select_related('role').get(email=email)
            except User.DoesNotExist:
                return error_response(
                    message='No account found with that email address.',
                    status_code=status.HTTP_404_NOT_FOUND,
                    code=ErrorCode.AUTH_EMAIL_NOT_FOUND,
                )

            if user.role_name != RoleName.ADMIN:
                return error_response(
                    message='Self-service password reset is only available for administrators. Please contact your administrator or the IT department to reset your password.',
                    status_code=status.HTTP_403_FORBIDDEN,
                    code=ErrorCode.AUTH_FORGOT_PASSWORD_NON_ADMIN,
                )

            temporary_password = get_random_string(12)
            user.set_password(temporary_password)
            user.save(update_fields=['password'])

            dispatch_send_mail(
                to=user.email,
                subject='Forgot Password - One Time Password',
                mail_body={
                    'template_name': 'forgot_password.html',
                    'context': {
                        'name': user.full_name,
                        'password': temporary_password,
                    },
                }
            )

            return success_response(
                message='A one-time password has been sent to your email.',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.AUTH_FORGOT_PASSWORD_SENT,
            )
        except Exception as ex:
            logger.exception('Error in admin forgot password %s', ex)
            return error_response(
                message='Internal Server Error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.AUTH_INTERNAL_ERROR,
            )


class ResetPasswordAPIView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        try:
            user_id = request.data.get('user_id')
            if not user_id:
                return error_response(
                    message='user_id is required',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.AUTH_RESET_USER_ID_REQUIRED,
                )

            try:
                target_user = User.objects.get(id=user_id, deleted_at__isnull=True)
            except User.DoesNotExist:
                return error_response(
                    message='User not found',
                    status_code=status.HTTP_404_NOT_FOUND,
                    code=ErrorCode.AUTH_RESET_USER_NOT_FOUND,
                )

            temporary_password = get_random_string(12)
            target_user.set_password(temporary_password)
            target_user.is_default_password = True
            target_user.save(update_fields=['password', 'is_default_password'])

            email_template_context = {
                'name': target_user.full_name,
                'password': temporary_password,
            }
            dispatch_send_mail(
                to=target_user.email,
                subject='Reset password',
                mail_body={
                    'template_name': 'reset_password.html',
                    'context': email_template_context,
                }
            )
            return success_response(
                message='Password reset successfully',
                data={
                    'user_id': target_user.id,
                },
                status_code=status.HTTP_200_OK,
                code=ErrorCode.AUTH_PASSWORD_RESET,
            )
        except Exception as ex:
            logger.info('Error in reset password %s', ex)
            return error_response(
                message='Internal Server Error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.AUTH_INTERNAL_ERROR,
            )
            