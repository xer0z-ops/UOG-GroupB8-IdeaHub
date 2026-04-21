import logging

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.exceptions import ValidationError

from core.pagination import DefaultPageNumberPagination
from core.responses import _get_message, success_response, error_response
from core.utils import dispatch_send_mail
from authentication.permissions import IsAuthenticatedUser, IsAdmin, IsAdminOrQAManager
from core.constants import RoleName, ErrorCode

from .models import User
from organization.models import AcademicYear
from .serializers import (
    UserRegisterSerializer,
    UserSerializer,
    AdminUserUpdateSerializer,
)

logger = logging.getLogger('apps')


class UserListCreateAPIView(APIView):
    permission_classes = []

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [IsAuthenticatedUser]
        elif self.request.method == 'POST':
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticatedUser]
        return [permission() for permission in permission_classes]

    def get(self, request):
        try:
            paginator = DefaultPageNumberPagination()
            today = timezone.now().date()
            current_year = AcademicYear.objects.filter(
                start_date__lte=today, end_date__gte=today
            ).first()
            current_year_id = current_year.id if current_year else None

            queryset = (
                User.objects.select_related('department', 'role', 'status')
                .annotate(
                    post_count=Count('ideas', filter=Q(ideas__academic_year_id=current_year_id), distinct=True),
                    comment_count=Count('idea_comments', filter=Q(idea_comments__idea__academic_year_id=current_year_id), distinct=True),
                )
                .filter(deleted_at__isnull=True)
                .exclude(id=request.user.id)
                .order_by('-created_at')
            )

            search = request.query_params.get('search')
            role_name = request.query_params.get('role')
            status_name = request.query_params.get('status')

            if request.user.role_name == RoleName.QA_COORDINATOR:
                queryset = queryset.filter(department_id=getattr(request.user, 'department_id', None))

            if search:
                search_fields = ['full_name', 'email']
                search_query = Q()
                for field in search_fields:
                    search_query |= Q(**{f'{field}__icontains': search})
                queryset = queryset.filter(search_query)

            if role_name:
                queryset = queryset.filter(role__name__iexact=role_name)

            if status_name:
                queryset = queryset.filter(status__name__iexact=status_name)

            page = paginator.paginate_queryset(queryset, request)
            serializer = UserSerializer(page, many=True)
            payload = serializer.data

            if request.user.role_name in {RoleName.QA_MANAGER, RoleName.QA_COORDINATOR}:
                for user_obj, user_data in zip(page, payload):
                    user_data['post_count'] = getattr(user_obj, 'post_count', 0)
                    user_data['comment_count'] = getattr(user_obj, 'comment_count', 0)

            response = paginator.get_paginated_response(payload)
            response.data['message'] = _get_message(ErrorCode.USER_FETCHED_LIST, fallback='Users fetched successfully')
            return response
        except Exception as ex:
            logger.info('Error while users get %s', ex)
            return error_response(
                code=ErrorCode.USER_INTERNAL_ERROR,
                message='Unable to fetch users',
                error=str(ex),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        try:
            generated_password = get_random_string(12)
            serializer = UserRegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save(password=generated_password)
            
            email_template_context = {
                'name': user.full_name,
                'password': generated_password
            }
            dispatch_send_mail(
                to=user.email,
                subject='Sending one time password to login',
                mail_body={
                    'template_name': 'send_initial_password.html',
                    'context': email_template_context
                }
            )
            #self._mock_send_initial_password_email(user, generated_password)
            user_data = UserSerializer(user).data

            return success_response(
                code=ErrorCode.USER_CREATED,
                data={'user': user_data},
                message='User created successfully and email sent for login credentials',
                status_code=status.HTTP_201_CREATED,
            )
        except ValidationError as exc:
            logger.warning('Admin user creation validation error: %s', exc.detail)
            return error_response(
                code=ErrorCode.USER_INVALID_DATA,
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception('Unexpected error during admin user creation: %s', e)
            return error_response(
                code=ErrorCode.USER_INTERNAL_ERROR,
                message='Unable to create user',
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @staticmethod
    def _mock_send_initial_password_email(user, password):
        logger.info(
            'Mock email: sending initial password to %s (password=%s)',
            user.email,
            password,
        )


class UserDetailsView(APIView):
    permission_classes = []

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [IsAuthenticatedUser]
        elif self.request.method in ('PUT', 'PATCH'):
            permission_classes = [IsAdminOrQAManager]
        elif self.request.method == 'DELETE':
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticatedUser]
        return [permission() for permission in permission_classes]

    def _get_user(self, user_id):
        try:
            return User.objects.select_related('department', 'role', 'status').get(id=user_id, deleted_at__isnull=True)
        except User.DoesNotExist:
            return None

    def get(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return error_response(
                code=ErrorCode.USER_NOT_FOUND,
                message='User not found',
                status_code=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserSerializer(user)

        return success_response(
            code=ErrorCode.USER_FETCHED,
            data={'user': serializer.data},
            message='User fetched successfully',
            status_code=status.HTTP_200_OK,
        )

    def _update_user(self, request, user_id, partial=False):
        user = self._get_user(user_id)
        if not user:
            return error_response(
                code=ErrorCode.USER_NOT_FOUND,
                message='User not found',
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:
            serializer = AdminUserUpdateSerializer(
                user,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return success_response(
                code=ErrorCode.USER_UPDATED,
                data={'user': UserSerializer(user).data},
                message='User updated successfully',
                status_code=status.HTTP_200_OK,
            )
        except ValidationError as exc:
            logger.warning('Admin user update validation error: %s', exc.detail)
            return error_response(
                code=ErrorCode.USER_INVALID_DATA,
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception('Unexpected error during admin user update: %s', e)
            return error_response(
                code=ErrorCode.USER_INTERNAL_ERROR,
                message='Unable to update user',
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, user_id):
        return self._update_user(request, user_id, partial=False)

    def patch(self, request, user_id):
        return self._update_user(request, user_id, partial=True)

    def delete(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return error_response(
                code=ErrorCode.USER_NOT_FOUND,
                message='User not found',
                status_code=status.HTTP_404_NOT_FOUND,
            )

        try:
            user.deleted_at = timezone.now()
            user.save(update_fields=["deleted_at"])
            return success_response(
                code=ErrorCode.USER_DELETED,
                data=None,
                message='User deleted successfully',
                status_code=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception('Unexpected error during admin user deletion: %s', e)
            return error_response(
                code=ErrorCode.USER_INTERNAL_ERROR,
                message='Unable to delete user',
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        