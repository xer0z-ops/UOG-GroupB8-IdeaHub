import httpClient from './httpClient';

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const response = await httpClient.post('/auth/login', { email, password }, { useAuth: false });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Login failed');
  }

  const {
    access_token,
    refresh_token,
    token_type,
    expires_in,
    last_login,
    last_logged_in_device,
    is_default_password,
  } = response.data;

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenType: token_type,
    expiresIn: expires_in,
    lastLogin: last_login,
    lastLoginDevice: last_logged_in_device,
    isDefaultPassword: Boolean(is_default_password),
  };
};

export const fetchProfile = async (accessToken = null) => {
  const response = await httpClient.get('/auth/profile', accessToken
    ? { useAuth: false, token: accessToken }
    : { useAuth: true }
  );

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch profile');
  }

  const user = response.data?.user ?? response.data;

  const academicYear = user?.current_academic_year ?? null;

  return {
    id: user?.id ?? null,
    fullName: user?.full_name ?? user?.name ?? null,
    email: user?.email ?? null,
    departmentId: user?.department_id ?? user?.department?.id ?? null,
    departmentName: user?.department?.name ?? null,
    role: user?.role?.name ?? user?.role ?? null,
    roleDescription: user?.role?.description ?? null,
    // roleId: user?.role_id ?? user?.role?.id ?? null,
    status: user?.status?.name ?? user?.status ?? null,
    currentAcademicYear: academicYear
      ? {
          id: academicYear.id ?? null,
          name: academicYear.name ?? null,
          startDate: academicYear.start_date ?? null,
          endDate: academicYear.end_date ?? null,
          ideaClosureDate: academicYear.idea_closure_date ?? null,
          finalClosureDate: academicYear.final_closure_date ?? null,
        }
      : null,
  };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  const response = await httpClient.post('/auth/refresh-token', { refresh_token: refreshToken }, { useAuth: false });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Unable to refresh token');
  }

  const { access_token } = response.data;

  return {
    accessToken: access_token,
  };
};

export const changePassword = async ({ currentPassword, newPassword, confirmedPassword }) => {
  if (!currentPassword || !newPassword || !confirmedPassword) {
    throw new Error('Current password, new password, and confirm password are required');
  }

  const payload = {
    current_password: currentPassword,
    new_password: newPassword,
    confirmed_password: confirmedPassword,
  };

  const response = await httpClient.post('/auth/change-password', payload, { useAuth: true });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to change password');
  }

  return response.data;
};

export const resetPassword = async ({ userId }) => {
  if (!userId) {
    throw new Error('User id is required');
  }

  const payload = { user_id: userId };
  const response = await httpClient.post('/auth/reset-password', payload, { useAuth: true });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to reset password');
  }

  return response.data;
};

export const forgotPassword = async ({ email }) => {
  if (!email) {
    throw new Error('Email is required');
  }

  const response = await httpClient.post('/auth/forgot-password', { email }, { useAuth: false });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to reset password');
  }

  return response?.data ?? response;
};
