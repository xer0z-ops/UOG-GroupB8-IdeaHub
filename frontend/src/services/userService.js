import httpClient from './httpClient';
import { getRoleLabel } from '../constants/roles';


const normalizeRoleValue = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  return role?.name ?? '';
};

const resolveRoleValue = (user = {}) =>
  normalizeRoleValue(user.role ?? user.role_name ?? user.roleValue ?? user.role_value);

const resolveStatusId = (user = {}) =>
  user.status_id ?? user.status?.id ?? user.statusId ?? null;

const resolveStatusName = (user = {}) =>
  user.status?.name ?? user.status_name ?? user.statusName ?? user.status ?? '';

const toTitleCase = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const resolveStatusLabel = (user = {}) => toTitleCase(resolveStatusName(user));

const resolveRoleLabel = (user = {}) => {
  const roleValue = resolveRoleValue(user);
  return getRoleLabel(roleValue) || roleValue || '';
};

export const fetchUsers = async ({
  page = 1,
  pageSize = 10,
  search,
  role,
  departmentId,
  status,
} = {}) => {
  const params = {
    page,
    page_size: pageSize,
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(departmentId ? { department_id: departmentId } : {}),
    ...(status ? { status } : {}),
  };

  const response = await httpClient.get('/users', {
    params,
  });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch users');
  }

  const items = response.data.items.map((user) => ({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      departmentId: user.department_id,
      department: user.department,
      role: resolveRoleLabel(user),
      roleValue: resolveRoleValue(user),
      statusId: resolveStatusId(user),
      statusName: resolveStatusName(user),
      statusLabel: resolveStatusLabel(user),
      postCount: user.post_count ?? user.postCount ?? 0,
      commentCount: user.comment_count ?? user.commentCount ?? 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    const pagination = response.data.pagination ?? {};

  return {
    items,
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

export const createUser = async ({ fullName, email, departmentId, role, statusId }) => {
  if (!fullName || !email || !departmentId || !role) {
    throw new Error('Full name, email, department, and role are required');
  }

  const payload = {
    full_name: fullName,
    email,
    department_id: departmentId,
    role,
    ...(statusId !== undefined ? { status_id: statusId } : {}),
  };

  const response = await httpClient.post('/users', payload);

  if (!response?.success || !response?.data?.user) {
    throw new Error(response?.message || 'Failed to create user');
  }

  const user = response.data.user;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    departmentId: user.department_id,
    department: user.department,
    role: resolveRoleLabel(user),
    roleValue: resolveRoleValue(user),
    statusId: resolveStatusId(user),
    statusName: resolveStatusName(user),
    statusLabel: resolveStatusLabel(user),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

export const updateUser = async (userId, { fullName, email, departmentId, role, statusId }) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!fullName || !email || !departmentId || !role) {
    throw new Error('Full name, email, department, and role are required');
  }

  const payload = {
    full_name: fullName,
    email,
    department_id: departmentId,
    role,
    ...(statusId !== undefined ? { status_id: statusId } : {}),
  };

  const response = await httpClient.put(`/users/${userId}`, payload);

  if (!response?.success || !response?.data?.user) {
    throw new Error(response?.message || 'Failed to update user');
  }

  const user = response.data.user;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    departmentId: user.department_id,
    department: user.department,
    role: resolveRoleLabel(user),
    roleValue: resolveRoleValue(user),
    statusId: resolveStatusId(user),
    statusName: resolveStatusName(user),
    statusLabel: resolveStatusLabel(user),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

export const updateUserStatus = async (userId, statusId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (statusId === undefined || statusId === null || statusId === '') {
    throw new Error('Status is required');
  }

  const payload = {
    status_id: statusId,
  };

  const response = await httpClient.patch(`/users/${userId}`, payload);

  if (!response?.success || !response?.data?.user) {
    throw new Error(response?.message || 'Failed to update user status');
  }

  const user = response.data.user;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    departmentId: user.department_id,
    department: user.department,
    role: resolveRoleLabel(user),
    roleValue: resolveRoleValue(user),
    statusId: resolveStatusId(user),
    statusName: resolveStatusName(user),
    statusLabel: resolveStatusLabel(user),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

export const deleteUser = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const response = await httpClient.delete(`/users/${userId}`);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete user');
  }

  return true;
};
