import httpClient from './httpClient';

export const fetchStatuses = async ({ entityType } = {}) => {
  const params = entityType ? { entity_type: entityType } : undefined;
  const response = await httpClient.get('/core/statuses', { params });

  const statuses = response?.data?.statuses ?? response?.data?.items;
  if (!response?.success || !Array.isArray(statuses)) {
    throw new Error(response?.message || 'Failed to fetch statuses');
  }

  return statuses.map((status) => ({
    id: status.id,
    name: status.name,
    entityType: status.entity_type,
    entityTypeDisplay: status.entity_type_display,
    createdAt: status.created_at,
    updatedAt: status.updated_at,
  }));
};
