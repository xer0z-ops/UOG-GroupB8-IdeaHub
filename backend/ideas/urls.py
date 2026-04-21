from django.urls import path

from ideas.views import (
    CategoryDetailsAPIView,
    CategoryListCreateAPIView,
    CommentDetailAPIView,
    CommentStatusUpdateAPIView,
    IdeaCommentAPIView,
    IdeaCreateAPIView,
    IdeaDetailsAPIView,
    IdeaDocumentDeleteAPIView,
    IdeaDocumentFileAPIView,
    IdeaDocumentUploadAPIView,
    IdeaListAPIView,
    IdeaMyListAPIView,
    IdeaDepartmentNotifyAPIView,
    IdeaReportAPIView,
    IdeaStatusUpdateAPIView,
    IdeaThumbAPIView,
)

app_name = "ideas"

urlpatterns = [
    path("categories", CategoryListCreateAPIView.as_view(), name="category-list"),
    path(
        "categories/<int:category_id>",
        CategoryDetailsAPIView.as_view(),
        name="category-detail",
    ),
    path("ideas", IdeaListAPIView.as_view(), name="idea-list"),
    path("ideas/mine", IdeaMyListAPIView.as_view(), name="idea-my-list"),
    path("ideas/create", IdeaCreateAPIView.as_view(), name="idea-create"),
    path("ideas/<int:idea_id>", IdeaDetailsAPIView.as_view(), name="idea-detail"),
    path("ideas/<int:idea_id>/thumbs", IdeaThumbAPIView.as_view(), name="idea-thumb"),
    path(
        "ideas/<int:idea_id>/status",
        IdeaStatusUpdateAPIView.as_view(),
        name="idea-status-update",
    ),
    path(
        "ideas/<int:idea_id>/comments",
        IdeaCommentAPIView.as_view(),
        name="idea-comments",
    ),
    path(
        "ideas/<int:idea_id>/comments/<int:comment_id>",
        CommentDetailAPIView.as_view(),
        name="comment-detail",
    ),
    path(
        "ideas/<int:idea_id>/comments/<int:comment_id>/status",
        CommentStatusUpdateAPIView.as_view(),
        name="comment-status-update",
    ),
    path(
        "ideas/<int:idea_id>/documents",
        IdeaDocumentUploadAPIView.as_view(),
        name="idea-document-upload",
    ),
    path(
        "ideas/<int:idea_id>/report",
        IdeaReportAPIView.as_view(),
        name="idea-report",
    ),
    path(
        "ideas/<int:idea_id>/notify-department",
        IdeaDepartmentNotifyAPIView.as_view(),
        name="idea-notify-department",
    ),
    path(
        "documents/<int:document_id>",
        IdeaDocumentDeleteAPIView.as_view(),
        name="document-detail",
    ),
    path(
        "documents/<int:document_id>/file",
        IdeaDocumentFileAPIView.as_view(),
        name="document-file",
    ),
]