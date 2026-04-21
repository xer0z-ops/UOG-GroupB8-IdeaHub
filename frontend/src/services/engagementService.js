import httpClient from './httpClient';

export const notifyDepartment = async (ideaId, { subject, description }) => {
  if (!ideaId) {
    throw new Error('Idea id is required');
  }
  if (!subject?.trim() || !description?.trim()) {
    throw new Error('Subject and description are required');
  }

  const payload = {
    subject: subject.trim(),
    description: description.trim(),
  };

  const response = await httpClient.post(`/ideas/ideas/${ideaId}/notify-department`, payload);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to send notification');
  }

  return response;
};
