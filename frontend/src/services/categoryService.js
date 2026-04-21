import httpClient from './httpClient';

const mapCategory = (category) => ({
  id: category?.id ?? null,
  name: category?.name ?? category?.title ?? 'Unnamed Category',
  createdAt: category?.created_at ?? category?.createdAt ?? null,
  updatedAt: category?.updated_at ?? category?.updatedAt ?? null,
});

export const fetchCategories = async ({ search } = {}) => {
  const params = search ? { search } : undefined;
  const response = await httpClient.get('/ideas/categories', { params });

  const rawItems =
    response?.data?.categories ??
    response?.data?.items ??
    response?.data ??
    [];

  if (!response?.success || !Array.isArray(rawItems)) {
    throw new Error(response?.message || 'Failed to fetch categories');
  }

  return rawItems.map(mapCategory);
};

export const createCategory = async ({ name }) => {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    throw new Error('Category name is required');
  }

  const response = await httpClient.post('/ideas/categories', { name: trimmedName });
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to create category');
  }

  const category = response?.data?.category ?? response?.data ?? response;
  return mapCategory(category);
};

export const updateCategory = async ({ categoryId, name }) => {
  const trimmedName = String(name ?? '').trim();
  if (!categoryId) {
    throw new Error('Category id is required');
  }
  if (!trimmedName) {
    throw new Error('Category name is required');
  }

  const response = await httpClient.put(`/ideas/categories/${categoryId}`, { name: trimmedName });
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to update category');
  }

  const category = response?.data?.category ?? response?.data ?? response;
  return mapCategory(category);
};

export const deleteCategory = async (categoryId) => {
  if (!categoryId) {
    throw new Error('Category id is required');
  }

  const response = await httpClient.delete(`/ideas/categories/${categoryId}`);
  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete category');
  }

  return response?.data ?? response;
};
