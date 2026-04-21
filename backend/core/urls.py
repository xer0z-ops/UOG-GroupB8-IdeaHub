from django.urls import path

from core.views import StatusListAPIView, SendMailTestView, PingView

urlpatterns = [
    path('statuses', StatusListAPIView.as_view()),
    path('test/send-email', SendMailTestView.as_view()),
    path('test/ping', PingView.as_view()),
]