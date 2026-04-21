from django.urls import path

from .views import (
    DepartmentListCreateAPIView, DepartmentDetailsView, 
    AcademicYearListCreateAPIView, AcademicYearDetailsView
)

urlpatterns = [
    path('departments', DepartmentListCreateAPIView.as_view()),
    path('departments/<int:department_id>', DepartmentDetailsView.as_view()),
    path('academic_years/<int:pk>', AcademicYearDetailsView.as_view()),
    path('academic_years', AcademicYearListCreateAPIView.as_view()),
]
