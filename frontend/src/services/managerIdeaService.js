import { fetchStaffIdeas } from './staffIdeaService.js';

const normalizeAcademicYear = (value) => {
  if (!value) return null;
  return {
    id: value.id ?? null,
    name: value.name ?? value.academicYear ?? null,
    startDate: value.start_date ?? value.startDate ?? null,
    endDate: value.end_date ?? value.endDate ?? null,
    ideaClosureDate: value.idea_closure_date ?? value.ideaClosureDate ?? null,
    finalClosureDate: value.final_closure_date ?? value.finalClosureDate ?? null,
  };
};

const normalizeManagerIdea = (idea) => ({
  id: idea.id,
  title: idea.title ?? idea.name ?? '',
  name: idea.name ?? idea.title ?? '',
  department: idea.department ?? null,
  departmentName: idea.department?.name ?? idea.departmentName ?? '',
  author: idea.author ?? null,
  authorName: idea.author?.name ?? idea.authorName ?? '',
  categories: Array.isArray(idea.categories) ? idea.categories : [],
  categoryName: Array.isArray(idea.categories) && idea.categories.length
    ? idea.categories[0]?.name ?? ''
    : idea.categoryName ?? '',
  academicYear: normalizeAcademicYear(idea.academicYear ?? idea.academic_year ?? null),
  thumbUpCount: idea.thumbUpCount ?? idea.thumbSummary?.up ?? 0,
  thumbDownCount: idea.thumbDownCount ?? idea.thumbSummary?.down ?? 0,
  reportCount: idea.reportCount ?? idea.reports_count ?? 0,
  commentCount: idea.commentCount ?? 0,
  viewCount: idea.viewCount ?? 0,
  createdAt: idea.createdAt ?? null,
  statusId: idea.status?.id ?? idea.statusId ?? null,
  statusName: idea.status?.name ?? idea.statusName ?? '',
});

export const fetchManagerIdeas = async (params = {}) => {
  const response = await fetchStaffIdeas(params);
  return {
    items: (response?.items || []).map(normalizeManagerIdea),
    pagination: response?.pagination ?? null,
  };
};

export const fetchReportedIdeas = async (params = {}) => {
  const response = await fetchStaffIdeas({ ...params, sortBy: 'reported' });
  return {
    items: (response?.items || []).map(normalizeManagerIdea),
    pagination: response?.pagination ?? null,
  };
};
