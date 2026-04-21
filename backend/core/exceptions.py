from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return Response({
            'success': False,
            'message': 'Internal server error',
            'data': None,
            'error': {
                'type': 'server_error',
                'details': 'Unexpected error occurred'
            }
        }, status=500)

    # Handle serializer validation errors
    if isinstance(exc, ValidationError):
        return Response({
            'success': False,
            'message': 'Validation error',
            'data': None,
            'error': {
                'type': 'validation_error',
                'fields': response.data
            }
        }, status=response.status_code)

    # Default DRF errors like auth, permission)
    return Response({
        'success': False,
        'message': response.data.get('detail', 'Error'),
        'data': None,
        'error': {
            'type': 'api_error',
            'details': response.data
        }
    }, status=response.status_code)
    