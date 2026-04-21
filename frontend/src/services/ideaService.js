import httpClient from './httpClient';


export const fetchIdeas = async (params = undefined) => {
  const response = await httpClient.get('/ideas/ideas', params ? { params } : undefined);
  const items = response?.data?.items ?? response?.data?.ideas ?? response?.data ?? [];
  if (!response?.success || !Array.isArray(items)) {
    throw new Error(response?.message || 'Failed to fetch ideas');
  }

  return items.map((idea) => ({
    id: idea.id,
    title: idea.title ?? idea.name ?? '',
    name: idea.name || idea.title || '',
    departmentId:
      idea.department_id ||
      idea.departmentId ||
      idea.department?.id ||
      idea.created_by_department_id ||
      null,
    department: idea.department ?? null,
    departmentName: idea.department?.name ?? idea.department_name ?? idea.departmentName ?? '',
    author: idea.user ?? idea.author ?? null,
    authorName: idea.user?.full_name ?? idea.user?.name ?? idea.author?.name ?? '',
    authorId: idea.user_id,
    categories: Array.isArray(idea.categories) ? idea.categories : [],
    categoryName: Array.isArray(idea.categories) && idea.categories.length
      ? idea.categories[0]?.name ?? ''
      : idea.category?.name ?? idea.category_name ?? '',
    thumbUpCount: idea.thumb_up_count ?? idea.thumbUpCount ?? 0,
    thumbDownCount: idea.thumb_down_count ?? idea.thumbDownCount ?? 0,
    reportCount: idea.report_count ?? idea.reportCount ?? idea.reports_count ?? 0,
    commentCount: idea.comment_count ?? idea.commentCount ?? 0,
    viewCount: idea.view_count ?? idea.viewCount ?? 0,
    createdAt: idea.created_at ?? idea.createdAt ?? null,
    statusId: idea.status_id ?? idea.status?.id ?? null,
    statusName: idea.status?.name ?? idea.status_name ?? '',
  }));
};

export const fetchManagerIdeas = async () => fetchIdeas();

export const fetchReportedIdeas = async () =>
  fetchIdeas({ sort_by: 'reported' });

export const hideIdea = async (ideaId, statusId = 7) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }

  const response = await httpClient.post(`/ideas/ideas/${ideaId}/status`, { status_id: statusId });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to hide idea');
  }

  return response?.data ?? response;
};

export const updateCommentStatus = async (ideaId, commentId, statusId) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }
  if (!commentId) {
    throw new Error('Comment id is required');
  }
  if (!statusId) {
    throw new Error('Status id is required');
  }

  const response = await httpClient.post(
    `/ideas/ideas/${ideaId}/comments/${commentId}/status`,
    { status_id: statusId }
  );

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to update comment status');
  }

  return response?.data ?? response;
};

export const fetchIdeaReports = async (ideaId) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }

  const response = await httpClient.get(`/ideas/ideas/${ideaId}/report`);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to fetch reports');
  }

  const data = response?.data ?? {};
  const idea = data?.idea ?? null;
  const reports = Array.isArray(data?.reports) ? data.reports : [];

  return {
    idea,
    reports: reports.map((report) => ({
      id: report.id,
      reason: report.reason ?? report.content ?? '',
      reportedBy: report.reported_by ?? report.reportedBy ?? null,
      createdAt: report.created_at ?? report.createdAt ?? null,
    })),
  };
};

export const deleteComment = async (ideaId, commentId) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }
  if (!commentId) {
    throw new Error('Comment id is required');
  }

  const response = await httpClient.delete(`/ideas/ideas/${ideaId}/comments/${commentId}`);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete comment');
  }

  return response?.data ?? response;
};

export const editComment = async (ideaId, commentId, commentText) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }
  if (!commentId) {
    throw new Error('Comment id is required');
  }
  if (!commentText?.trim()) {
    throw new Error('Comment text is required');
  }

  const response = await httpClient.put(
    `/ideas/ideas/${ideaId}/comments/${commentId}`,
    { comment_text: commentText.trim() }
  );

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to edit comment');
  }

  return response?.data ?? response;
};