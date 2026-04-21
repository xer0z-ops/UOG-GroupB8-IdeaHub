import logging

from django.db import IntegrityError
from django.db.models import Count, Prefetch, Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from authentication.permissions import IsAdmin, IsAuthenticatedUser
from core.pagination import DefaultPageNumberPagination
from core.responses import _get_message, error_response, success_response
from core.constants import ErrorCode, RoleName

from users.models import User
from .models import AcademicYear, Department
from .serializers import DepartmentSerializer, DepartmentWriteSerializer, AcademicYearSerializer, AcademicYearWriteSerializer

logger = logging.getLogger('apps')


class DepartmentListCreateAPIView(APIView):
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
        qa_coordinator_qs = User.objects.filter(
            role__name=RoleName.QA_COORDINATOR,
            deleted_at__isnull=True,
        ).select_related('role')

        queryset = Department.objects.annotate(
            staff_count=Count('users', distinct=True),
            idea_count=Count('ideas', distinct=True),
        ).prefetch_related(
            Prefetch('users', queryset=qa_coordinator_qs, to_attr='qa_coordinators')
        ).order_by('-created_at')

        if getattr(request.user, 'role_name', None) != RoleName.ADMIN:
            queryset = queryset.filter(is_system_defined=False)

        search = request.query_params.get('search', '').strip()
        if search:
            search_fields = ['name']
            search_query = Q()
            for field in search_fields:
                search_query |= Q(**{f'{field}__icontains': search})
            queryset = queryset.filter(search_query)

        paginate_flag = request.query_params.get('paginate', 'true').lower()
        paginate = paginate_flag not in ('false', '0', 'no')
        if not paginate:
            serializer = DepartmentSerializer(queryset, many=True)
            return success_response(
                data={'departments': serializer.data},
                message='Departments fetched successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.DEPARTMENT_FETCHED_LIST,
            )

        paginator = DefaultPageNumberPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = DepartmentSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data['message'] = _get_message(ErrorCode.DEPARTMENT_FETCHED_LIST, fallback='Departments fetched successfully')
        return response

    def post(self, request):
        try:
            serializer = DepartmentWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user_id = getattr(request.user, 'id', None)
            department = serializer.save(
                created_by=user_id,
                updated_by=user_id,
            )
            department_data = DepartmentSerializer(department).data

            return success_response(
                data={'department': department_data},
                message='Department created successfully',
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.DEPARTMENT_CREATED,
            )
        except ValidationError as exc:
            logger.warning('Department creation validation error: %s', exc.detail)
            return error_response(
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.DEPARTMENT_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception('Unexpected error during department creation: %s', exc)
            return error_response(
                message='Unable to create department',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DEPARTMENT_INTERNAL_ERROR,
            )


class DepartmentDetailsView(APIView):
    permission_classes = []

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [IsAuthenticatedUser]
        elif self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticatedUser]
        return [permission() for permission in permission_classes]

    def _get_department(self, department_id):
        try:
            return Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return None

    def get(self, request, department_id):
        department = self._get_department(department_id)
        if not department:
            return error_response(
                message='Department not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.DEPARTMENT_NOT_FOUND,
            )

        serializer = DepartmentSerializer(department)
        return success_response(
            data={'department': serializer.data},
            message='Department fetched successfully',
            status_code=status.HTTP_200_OK,
            code=ErrorCode.DEPARTMENT_FETCHED,
        )

    def _update_department(self, request, department_id, partial=False):
        department = self._get_department(department_id)
        if not department:
            return error_response(
                message='Department not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.DEPARTMENT_NOT_FOUND,
            )

        try:
            user_id = getattr(request.user, 'id', None)
            serializer = DepartmentWriteSerializer(
                department,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(updated_by=user_id)

            return success_response(
                data={'department': DepartmentSerializer(department).data},
                message='Department updated successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.DEPARTMENT_UPDATED,
            )
        except ValidationError as exc:
            logger.warning('Department update validation error: %s', exc.detail)
            return error_response(
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.DEPARTMENT_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception('Unexpected error during department update: %s', exc)
            return error_response(
                message='Unable to update department',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DEPARTMENT_INTERNAL_ERROR,
            )

    def put(self, request, department_id):
        return self._update_department(request, department_id, partial=False)

    def patch(self, request, department_id):
        return self._update_department(request, department_id, partial=True)

    def delete(self, request, department_id):
        department = self._get_department(department_id)
        if not department:
            return error_response(
                message='Department not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.DEPARTMENT_NOT_FOUND,
            )

        try:
            if User.objects.filter(department_id=department.id).exists():
                return error_response(
                    message='Department cannot be deleted because it is assigned to one or more users',
                    error='Department in use',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code=ErrorCode.DEPARTMENT_DELETE_IN_USE,
                )
            department.delete()
            return success_response(
                data=None,
                message='Department deleted successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.DEPARTMENT_DELETED,
            )
        except IntegrityError as exc:
            logger.warning('Department deletion blocked due to related users: %s', exc)
            return error_response(
                message='Department cannot be deleted because it is assigned to one or more users',
                error=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.DEPARTMENT_DELETE_IN_USE,
            )
        except Exception as exc:
            logger.exception('Unexpected error during department deletion: %s', exc)
            return error_response(
                message='Unable to delete department',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.DEPARTMENT_INTERNAL_ERROR,
            )


class AcademicYearListCreateAPIView(APIView):
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
        paginator = DefaultPageNumberPagination()
        queryset = AcademicYear.objects.all().order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            search_fields = ['name']
            search_query = Q()
            for field in search_fields:
                search_query |= Q(**{f'{field}__icontains': search})
            queryset = queryset.filter(search_query)

        page = paginator.paginate_queryset(queryset, request)
        serializer = AcademicYearSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data['message'] = _get_message(ErrorCode.ACADEMIC_YEAR_FETCHED_LIST, fallback='Academic years fetched successfully')
        return response

    def post(self, request):
        try:
            serializer = AcademicYearWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = getattr(request, 'user', None)
            academic_year = serializer.save(
                created_by=user,
                updated_by=user,
            )
            data = AcademicYearSerializer(academic_year).data
            return success_response(
                data={'academic_year': data},
                message='Academic year created successfully',
                status_code=status.HTTP_201_CREATED,
                code=ErrorCode.ACADEMIC_YEAR_CREATED,
            )
        except ValidationError as exc:
            logger.warning('Academic year creation validation error: %s', exc.detail)
            return error_response(
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.ACADEMIC_YEAR_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception('Unexpected error during academic year creation: %s', exc)
            return error_response(
                message='Unable to create academic year',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.ACADEMIC_YEAR_INTERNAL_ERROR,
            )


class AcademicYearDetailsView(APIView):
    permission_classes = []

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [IsAuthenticatedUser]
        elif self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticatedUser]
        return [permission() for permission in permission_classes]

    def _get_academic_year(self, pk):
        try:
            return AcademicYear.objects.get(id=pk)
        except AcademicYear.DoesNotExist:
            return None

    def get(self, request, pk):
        academic_year = self._get_academic_year(pk)
        if not academic_year:
            return error_response(
                message='Academic year not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.ACADEMIC_YEAR_NOT_FOUND,
            )
    
        try:
            serializer = AcademicYearSerializer(academic_year)
            return success_response(
                data={'academic_year': serializer.data},
                message='Academic year fetched successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.ACADEMIC_YEAR_FETCHED,
            )
        except Exception as exc:
            logger.exception('Unexpected error during academic year retrieval: %s', exc)
            return error_response(
                message='Unable to fetch academic year',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.ACADEMIC_YEAR_INTERNAL_ERROR,
            )

    def put(self, request, pk):
        return self._update_academic_year(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update_academic_year(request, pk, partial=True)

    def delete(self, request, pk):
        academic_year = self._get_academic_year(pk)
        if not academic_year:
            return error_response(
                message='Academic year not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.ACADEMIC_YEAR_NOT_FOUND,
            )

        try:
            academic_year.delete()
            return success_response(
                data=None,
                message='Academic year deleted successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.ACADEMIC_YEAR_DELETED,
            )
        except Exception as exc:
            logger.exception('Unexpected error during academic year deletion: %s', exc)
            return error_response(
                message='Unable to delete academic year',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.ACADEMIC_YEAR_INTERNAL_ERROR,
            )

    def _update_academic_year(self, request, pk, partial):
        academic_year = self._get_academic_year(pk)
        if not academic_year:
            return error_response(
                message='Academic year not found',
                status_code=status.HTTP_404_NOT_FOUND,
                code=ErrorCode.ACADEMIC_YEAR_NOT_FOUND,
            )

        try:
            serializer = AcademicYearWriteSerializer(
                academic_year,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(updated_by=getattr(request, 'user', None))
            data = AcademicYearSerializer(academic_year).data
            return success_response(
                data={'academic_year': data},
                message='Academic year updated successfully',
                status_code=status.HTTP_200_OK,
                code=ErrorCode.ACADEMIC_YEAR_UPDATED,
            )
        except ValidationError as exc:
            logger.warning('Academic year update validation error: %s', exc.detail)
            return error_response(
                message='Invalid data',
                error=exc.detail,
                status_code=status.HTTP_400_BAD_REQUEST,
                code=ErrorCode.ACADEMIC_YEAR_INVALID_DATA,
            )
        except Exception as exc:
            logger.exception('Unexpected error during academic year update: %s', exc)
            return error_response(
                message='Unable to update academic year',
                error=str(exc),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code=ErrorCode.ACADEMIC_YEAR_INTERNAL_ERROR,
            )
            