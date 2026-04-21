import httpClient from './httpClient';


export const fetchDepartments = async ({ search, page = 1, pageSize = 10 } = {}) => {
  const params = {
    page,
    page_size: pageSize,
    ...(search ? { search } : {}),
  };
  const response = await httpClient.get('/org/departments', { params });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch departments');
  }

  const items = response.data.items || [];
  const pagination = response.data.pagination ?? {};

  return {
    items: items.map((dept) => ({
      id: dept.id,
      name: dept.name,
      staffCount: dept.staff_count ?? dept.staffCount ?? 0,
      ideaCount: dept.idea_count ?? dept.ideaCount ?? 0,
      qaCoordinator: dept.qa_coordinator
        ? {
            id: dept.qa_coordinator.id ?? null,
            fullName: dept.qa_coordinator.full_name ?? dept.qa_coordinator.fullName ?? null,
            email: dept.qa_coordinator.email ?? null,
          }
        : null,
    })),
    pagination: {
      page: pagination.page ?? page,
      pageSize: pagination.page_size ?? pageSize,
      totalItems: pagination.total_items ?? items.length,
      totalPages: pagination.total_pages ?? 1,
      hasNext: Boolean(
        pagination.has_next ?? (pagination.page ?? page) < (pagination.total_pages ?? 1),
      ),
      hasPrev: Boolean(
        pagination.has_prev ?? (pagination.page ?? page) > 1,
      ),
    },
  };
};

export const createDepartment = async ({ name }) => {
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    const error = new Error('Department name is required');
    error.fieldErrors = {
      departmentName: 'Department name is required',
      fullName: 'Department name is required',
    };
    throw error;
  }

  try {
    const response = await httpClient.post('/org/departments', { name: trimmedName });

    if (!response?.success || !response?.data?.department) {
      throw new Error(response?.message || 'Failed to create department');
    }

    const department = response.data.department;
    return {
      id: department.id,
      name: department.name,
      createdAt: department.created_at,
      updatedAt: department.updated_at,
    };
  } catch (error) {
    const nameErrors = error?.payload?.error?.name;
    if (Array.isArray(nameErrors) && nameErrors.length) {
      const message = nameErrors[0];
      const validationError = new Error(message);
      validationError.fieldErrors = {
        departmentName: message,
        fullName: message,
      };
      throw validationError;
    }

    throw error;
  }
};

export const deleteDepartment = async (departmentId) => {
  if (!departmentId) {
    throw new Error('Department id is required');
  }

  const response = await httpClient.delete(`/org/departments/${departmentId}`);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete department');
  }

  return response;
};

export const updateDepartment = async ({ departmentId, name }) => {
  const trimmedName = String(name || '').trim();

  if (!departmentId) {
    throw new Error('Department id is required');
  }

  if (!trimmedName) {
    const error = new Error('Department name is required');
    error.fieldErrors = {
      departmentName: 'Department name is required',
      fullName: 'Department name is required',
    };
    throw error;
  }

  try {
    const response = await httpClient.put(`/org/departments/${departmentId}`, { name: trimmedName });

    if (!response?.success || !response?.data?.department) {
      throw new Error(response?.message || 'Failed to update department');
    }

    const department = response.data.department;
    return {
      id: department.id,
      name: department.name,
      createdAt: department.created_at,
      updatedAt: department.updated_at,
    };
  } catch (error) {
    const nameErrors = error?.payload?.error?.name;
    if (Array.isArray(nameErrors) && nameErrors.length) {
      const message = nameErrors[0];
      const validationError = new Error(message);
      validationError.fieldErrors = {
        departmentName: message,
        fullName: message,
      };
      throw validationError;
    }

    throw error;
  }
};
