import jwt
from datetime import datetime, timedelta
from django.conf import settings

JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_MINUTES = 5 
REFRESH_TOKEN_DAYS = 1


def _base_payload(user):
    return {
        'sub': str(user.id),
        'email': user.email,
        'role': user.role.name,
        'department_id': user.department_id,
        'status': user.status.name,
        'iat': datetime.utcnow(),
    }


def generate_access_token(user):
    payload = _base_payload(user)
    payload.update({
        'type': 'access',
        'exp': datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    })

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def generate_refresh_token(user):
    payload = {
        'sub': str(user.id),
        'type': 'refresh',
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS),
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
