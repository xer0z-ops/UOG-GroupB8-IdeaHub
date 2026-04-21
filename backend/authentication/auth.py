import jwt
import logging
from django.contrib.auth.backends import BaseBackend
from django.utils.translation import gettext_lazy as _
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from users.models import User
from core.jwt import decode_token

logger = logging.getLogger('apps')


class EmailAuthBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        try:
            user = User.objects.get(email=username, deleted_at__isnull=True)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and user.is_active:
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id, deleted_at__isnull=True)
        except User.DoesNotExist:
            return None
            
            
class JWTAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()
        #logger.debug('Authorization header raw bytes: %s', auth_header)

        if not auth_header:
            logger.debug('No Authorization header provided.')
            return None

        if auth_header[0].lower() != self.keyword.lower().encode():
            return None

        if len(auth_header) == 1:
            logger.debug('Authorization header missing credentials.')
            raise AuthenticationFailed(_('Invalid Authorization header. No credentials provided.'))
        if len(auth_header) > 2:
            #logger.debug('Authorization header has unexpected segments: %s', auth_header)
            raise AuthenticationFailed(_('Invalid Authorization header. Token string should not contain spaces.'))

        token = auth_header[1].decode()
        logger.debug('Decoded token prefix: %s...', token[:10])

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError as jwtEx:
            logger.info('jwtEx %s', jwtEx)
            raise AuthenticationFailed(_('Token expired'))
        except jwt.InvalidTokenError as jwtEx:
            logger.info('jwtEx %s', jwtEx)
            raise AuthenticationFailed(_('Invalid token'))

        if payload.get('type') != 'access':
            raise AuthenticationFailed(_('Invalid token type'))

        try:
            user = User.objects.select_related('role', 'department', 'status').get(id=payload['sub'], deleted_at__isnull=True)
        except User.DoesNotExist:
            raise AuthenticationFailed(_('User not found'))

        if not user.is_active:
            raise AuthenticationFailed(_('User is inactive'))

        logger.debug('JWT authentication succeeded for user_id=%s', user.id)
        return (user, None)
        