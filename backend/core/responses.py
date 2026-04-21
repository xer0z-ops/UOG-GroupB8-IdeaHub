from rest_framework.response import Response
from rest_framework import status


def _get_message(code, fallback):
    from core.models import ErrorCode
    try:
        return ErrorCode.objects.get(code=code).message
    except ErrorCode.DoesNotExist:
        return fallback


def success_response(data=None, message='Success', code=None, status_code=status.HTTP_200_OK):
    if code:
        message = _get_message(code, fallback=message)
    return Response({
        'success': True,
        'message': message,
        'data': data,
        'error': None
    }, status=status_code)


def error_response(message='Failed', error=None, code=None, status_code=status.HTTP_400_BAD_REQUEST):
    if code:
        message = _get_message(code, fallback=message)
    return Response(
        {
            "success": False,
            "message": message,
            "data": None,
            # Error and message will be different for 400 Serialization errors. For other cases, it will be the same.
            "error": error if error else message,
        },
        status=status_code,
    )
    