import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import UserList from '../../components/users/UserListTable.jsx';
import UserDialog from '../../components/users/UserDialog.jsx';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../services/userService';
import { fetchStatuses } from '../../services/statusService';
import { resetPassword } from '../../services/authService';
import useAuth from '../../hooks/useAuth';
import { fetchDepartments } from '../../services/departmentService';
import { ROLE_OPTIONS } from '../../constants/roles';

const DEFAULT_ROLE = ROLE_OPTIONS[0]?.value ?? '';
const formatStatusLabel = (value) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};
function UserManagementPage({ roleValue }) {
  const { accessToken } = useAuth();
  const [rawUsers, setRawUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [departments, setDepartments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    role: '',
  });
  const [formValues, setFormValues] = useState({
    fullName: '',
    email: '',
    departmentId: '',
    role: DEFAULT_ROLE,
    status: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const rowsPerPage = useMemo(() => {
    if (isXl) return 10;
    if (isXs) return 3;
    if (isSm) return 4;
    return 7;
  }, [isXl, isXs, isSm]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: rowsPerPage,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const hasFetchedRef = useRef(false);
  const lastTokenRef = useRef(null);
  const departmentLookup = useMemo(
    () =>
      departments.reduce((acc, dept) => {
        acc[dept.id] = dept.name;
        return acc;
      }, {}),
    [departments],
  );

  const statusLookup = useMemo(
    () =>
      statuses.reduce((acc, status) => {
        acc[status.id] = status.name;
        return acc;
      }, {}),
    [statuses],
  );

  const statusOptions = useMemo(() => {
    const allowed = statuses.filter((status) => status.id === 1 || status.id === 2);
    if (!allowed.length) return [];
    return allowed.map((status) => ({
      id: status.id,
      name: status.id === 1 ? 'Active' : 'Disabled',
    }));
  }, [statuses]);

  const defaultStatusId = statusOptions[0]?.id ?? '';

  const mapUserToRow = useCallback(
    (user) => {
      const rawRoleValue = user.roleValue ?? user.role?.name ?? user.role;
      const normalizedRoleValue =
        typeof rawRoleValue === 'string' ? rawRoleValue : rawRoleValue?.name ?? '';
      const rawDepartment =
        user.department ?? departmentLookup[user.departmentId || user.department_id];
      const departmentName =
        typeof rawDepartment === 'string' ? rawDepartment : rawDepartment?.name ?? 'N/A';
      const statusId = user.statusId ?? user.status_id ?? user.status?.id;
      const statusName = statusLookup[statusId] || user.statusName || user.status?.name || user.status;
      const statusLabel = user.statusLabel || formatStatusLabel(statusName) || 'Active';

      return {
        id: user.id,
        name: user.fullName || user.full_name || 'Unnamed User',
        email: user.email,
        departmentId: user.departmentId,
        department: departmentName,
        role: user.role || normalizedRoleValue,
        roleValue: normalizedRoleValue,
        statusId,
        status: statusLabel,
        avatar: './src/assets/profile.png',
      };
    },
    [departmentLookup, statusLookup],
  );

  const users = useMemo(
    () => rawUsers.map((user) => mapUserToRow(user)),
    [rawUsers, mapUserToRow],
  );

  const applyUsersResult = (result) => {
    setRawUsers(result.items || []);
    setPagination({
      page: result.pagination.page,
      pageSize: result.pagination.pageSize,
      totalItems: result.pagination.totalItems,
      totalPages: result.pagination.totalPages,
      hasNext: result.pagination.hasNext,
      hasPrev: result.pagination.hasPrev,
    });
    setErrorMessage('');
  };

  const loadUsers = useCallback(async ({
    page = 1,
    pageSize = pagination.pageSize,
    search = appliedFilters.search,
    role = appliedFilters.role,
  } = {}) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchUsers({
        page,
        pageSize,
        search: search || undefined,
        role: role || undefined,
      });
      applyUsersResult(result);
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [accessToken, appliedFilters.role, appliedFilters.search, pagination.pageSize]);

  useEffect(() => {
    if (!accessToken) {
      hasFetchedRef.current = false;
      lastTokenRef.current = null;
      setLoading(false);
      return;
    }

    if (hasFetchedRef.current && lastTokenRef.current === accessToken) {
      return;
    }

    let isMounted = true;

    loadUsers()
      .then(() => {
        if (!isMounted) return;
        hasFetchedRef.current = true;
        lastTokenRef.current = accessToken;
      })
      .catch(() => {
        if (!isMounted) return;
        hasFetchedRef.current = false;
        lastTokenRef.current = null;
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, loadUsers]);

  useEffect(() => {
    if (!accessToken) {
      setDepartments([]);
      return;
    }

    let isMounted = true;

    const loadDepartments = async () => {
      try {
        const result = await fetchDepartments();
        if (!isMounted) return;
        setDepartments(result.items || []);
      } catch (error) {
        if (isMounted) {
          setToast({
            open: true,
            message: error?.message || 'Failed to load departments',
            severity: 'error',
          });
        }
      }
    };

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setStatuses([]);
      return;
    }

    let isMounted = true;

    const loadStatuses = async () => {
      try {
        const items = await fetchStatuses({ entityType: 'user' });
        if (!isMounted) return;
        setStatuses(items);
      } catch (error) {
        if (isMounted) {
          setToast({
            open: true,
            message: error?.message || 'Failed to load statuses',
            severity: 'error',
          });
        }
      }
    };

    loadStatuses();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!formValues.status && defaultStatusId) {
      setFormValues((prev) => ({ ...prev, status: defaultStatusId }));
    }
  }, [defaultStatusId, formValues.status]);

  useEffect(() => {
    if (!formValues.departmentId && departments.length) {
      setFormValues((prev) => ({ ...prev, departmentId: departments[0].id }));
    }
  }, [departments, formValues.departmentId]);

  const handleSearch = async (search, role) => {
    const nextFilters = {
      search: search ?? searchValue,
      role: role ?? filterRole,
    };
    setAppliedFilters(nextFilters);
    await loadUsers({
      page: 1,
      search: nextFilters.search,
      role: nextFilters.role,
    });
  };

  const resetForm = () => {
    setFormValues({
      fullName: '',
      email: '',
      departmentId: '',
      role: DEFAULT_ROLE,
      status: defaultStatusId,
    });
    setFormErrors({});
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
    setIsEditMode(false);
  };

  const handleDialogChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleOpenDialogForEdit = (user) => {
    resetForm();
    setFormValues({
      fullName: user.name,
      email: user.email,
      departmentId: user.departmentId,
      role: user.roleValue ?? user.role,
      status: user.statusId ?? user.status,
    });

    setIsEditMode(true);
    setEditingUserId(user.id);
    setDialogOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formValues.fullName.trim()) {
      nextErrors.fullName = 'Full name is required';
    }

    if (!formValues.email.trim()) {
      nextErrors.email = 'Email is required';
    }

    if (!formValues.departmentId) {
      nextErrors.departmentId = 'Department is required';
    }

    if (!formValues.role) {
      nextErrors.role = 'Role is required';
    }

    if (formValues.status === '' || formValues.status === undefined || formValues.status === null) {
      nextErrors.status = 'Status is required';
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const newUser = await createUser({
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        departmentId: Number(formValues.departmentId),
        role: formValues.role,
        statusId: Number(formValues.status),
      });
      setRawUsers((prev) => [newUser, ...prev]);
      setToast({ open: true, message: 'User created successfully', severity: 'success' });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to create user', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await updateUser(editingUserId, {
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        departmentId: Number(formValues.departmentId),
        role: formValues.role,
        statusId: Number(formValues.status),
      });

      setRawUsers((prev) =>
        prev.map((u) => (u.id === editingUserId ? updatedUser : u))
      );

      setToast({ open: true, message: 'User updated successfully', severity: 'success' });

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || 'Failed to update user',
        severity: 'error',
      });
    } finally {
      setSaving(false);
      setIsEditMode(false);
      setEditingUserId(null);
    }
  };


  const handleDeactivate = (user) => {
    setUserToReset(user);
    setConfirmResetOpen(true);
  };

  const handleCloseResetDialog = () => {
    setConfirmResetOpen(false);
    setUserToReset(null);
  };

  const handleConfirmReset = async () => {
    if (!userToReset?.id) {
      handleCloseResetDialog();
      return;
    }

    setResetting(true);
    try {
      await resetPassword({ userId: userToReset.id });
      setToast({ open: true, message: 'Password reset triggered', severity: 'success' });
      handleCloseResetDialog();
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || 'Failed to reset password',
        severity: 'error',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete?.id) {
      handleCloseDeleteDialog();
      return;
    }

    setDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setRawUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setToast({ open: true, message: 'User deleted successfully', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || 'Failed to delete user',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  const handlePageChange = (nextPage) => {
    loadUsers({
      page: nextPage,
      search: appliedFilters.search,
      role: appliedFilters.role,
    });
  };

  const isFiltersActive =
    appliedFilters.search.trim() !== '' || String(appliedFilters.role || '') !== '';

  return (
    <MainLayout>
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
          justifyContent="flex-end"
          sx={{ mb: 2.5, rowGap: 2 }}
        >
          <TextField
            placeholder="Search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ color: '#97a3ba' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 280, md: 320 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
          />

          <Select
            displayEmpty
            value={filterRole}
            onChange={(event) => setFilterRole(event.target.value)}
            sx={{
              bgcolor: '#ffffff',
              '& .MuiSelect-select': {
                py: 1,
                pl: 2.5,
                pr: 5,
              },
              minWidth: 150,
              width: { xs: '100%', sm: 'auto' },
            }}
            renderValue={(value) => {
              if (!value) return 'All Roles';
              const matched = ROLE_OPTIONS.find((option) => option.value === value);
              return matched?.label || value;
            }}
          >
            <MenuItem value="">All Roles</MenuItem>
            {ROLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

          <Button
            type="button"
            variant="contained"
            onClick={() => {
              handleSearch(searchValue, filterRole);
            }}
            sx={{
              bgcolor: '#1d5feb',
              borderRadius: 0.7,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' },
              alignSelf: 'center',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Search
          </Button>

          {isFiltersActive ? <Button
            type="button"
            variant="outlined"
            onClick={() => {
              setSearchValue('');
              setFilterRole('');
              setAppliedFilters({ search: '', role: '' });
              loadUsers({ page: 1, search: '', role: '' });
            }}
            sx={{
              borderRadius: 0.7,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' },
              alignSelf: 'center',
              whiteSpace: 'nowrap',
              borderColor: '#1d5feb',
              color: '#1d5feb',
              '&:hover': { borderColor: '#174dcc', bgcolor: '#eef3ff' },
            }}
          >
            Clear
          </Button>
            : null}


          <Box sx={{ flexGrow: 1 }} />

          {roleValue === 'admin' && (
            <Button
              variant="contained"
              onClick={handleOpenDialog}
              sx={{
                bgcolor: '#1d5feb',
                borderRadius: 0.7,
                px: 3.5,
                fontWeight: 600,
                textTransform: 'none',
                width: { xs: '100%', sm: 'auto' },
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#174dcc' },
              }}
            >
              + Add User
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Loading users...
            </Typography>
          </Box>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <UserList
              users={users}
              onEdit={handleOpenDialogForEdit}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
              roleValue={roleValue}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Box>

      <UserDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={isEditMode ? handleEditUser : handleCreateUser}
        values={formValues}
        errors={formErrors}
        onChange={handleDialogChange}
        submitting={saving}
        departmentOptions={departments}
        roleOptions={ROLE_OPTIONS}
        statusOptions={statusOptions}
        isEditMode={isEditMode}
      />

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete
            {' '}
            <strong>{userToDelete?.name || userToDelete?.email || 'this user'}</strong>
            ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting} variant="outlined" sx={{ borderRadius: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} disabled={deleting} color="error" variant="contained" sx={{ borderRadius: 0.7 }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmResetOpen} onClose={handleCloseResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to reset the password for
            {' '}
            <strong>{userToReset?.name || userToReset?.email || 'this user'}</strong>
            ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseResetDialog} disabled={resetting} variant="outlined" sx={{ borderRadius: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmReset} disabled={resetting} color="warning" variant="contained" sx={{ borderRadius: 0.7 }}>
            {resetting ? 'Resetting...' : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

export default UserManagementPage;
