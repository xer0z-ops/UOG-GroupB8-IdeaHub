from django.urls import path

from reports.views import CommentReportListAPIView, IdeaFileExportAPIView, IdeaReportListAPIView, IdeaStatisticsAPIView

app_name = "reports"

urlpatterns = [
    path("statistics", IdeaStatisticsAPIView.as_view(), name="idea-statistics"),
    path("ideas", IdeaReportListAPIView.as_view(), name="idea-report-list"),
    path("comments", CommentReportListAPIView.as_view(), name="comment-report-list"),
    path("ideas-file-export", IdeaFileExportAPIView.as_view(), name="idea-file-export"),
]
