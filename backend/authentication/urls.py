from django.urls import path
from .views import LoginApi, RefreshTokenApi, ProfileAPIView, ChangePasswordAPIView, ResetPasswordAPIView, AdminForgotPasswordAPIView

urlpatterns = [
    path('login', LoginApi.as_view()),
    path('refresh-token', RefreshTokenApi.as_view()),
    path('profile', ProfileAPIView.as_view()),
    path('change-password', ChangePasswordAPIView.as_view()),
    path('reset-password', ResetPasswordAPIView.as_view()),
    path('forgot-password', AdminForgotPasswordAPIView.as_view()),
]
