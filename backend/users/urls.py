from django.urls import path
from .views import (
    UserListCreateAPIView,
    UserDetailsView,
)

urlpatterns = [
    path('', UserListCreateAPIView.as_view()),
    path('/<int:user_id>', UserDetailsView.as_view()),
]
