import httpClient from './httpClient';

const normalizeComment = (comment) => ({
  id: comment.id,
  content: comment.comment_text ?? comment.content ?? '',
  isAnonymous: Boolean(comment.is_anonymous ?? comment.isAnonymous),
  idea: comment.idea ?? comment.idea_detail ?? null,
  ideaId: comment.idea_id ?? comment.idea?.id ?? null,
  ideaTitle: comment.idea?.title ?? comment.idea_title ?? comment.ideaTitle ?? '',
  department: comment.department ?? comment.department_name ?? null,
  category: comment.category ?? comment.category_name ?? null,
  thumbUpCount: comment.thumb_up_count ?? 0,
  thumbDownCount: comment.thumb_down_count ?? 0,
  reportCount: comment.report_count ?? 0,
});

export const fetchComments = async ({ academicYear } = {}) => {
  const params = academicYear ? { academic_year: academicYear } : undefined;
  const response = await httpClient.get('/ideas/comments', { params });

  const rawItems =
    response?.data?.comments ??
    response?.data?.items ??
    response?.data ??
    [];

  if (!response?.success || !Array.isArray(rawItems)) {
    throw new Error(response?.message || 'Failed to fetch comments');
  }

  return rawItems.map(normalizeComment);
};
