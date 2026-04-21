import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import { fetchUsers } from '../../services/userService.js';
import { fetchStatuses } from '../../services/statusService.js';
import useAuth from '../../hooks/useAuth.js';
import UserModerationListTable from '../../components/users/UserModerationListTable.jsx';
import UserList from '../../components/users/UserListTable.jsx';

const mapUserToRow = (user) => ({
  id: user.id,
  name: user.fullName || user.name || 'Unnamed User',
  fullName: user.fullName || user.name || '',
  email: user.email || '',
  departmentId: user.departmentId ?? user.department?.id ?? null,
  departmentName: user.department?.name || '',
  roleValue: user.roleValue || user.role || '',
  roleLabel: user.role || '',
  statusId: user.statusId ?? user.status_id ?? user.status?.id ?? null,
  status: user.statusLabel || user.statusName || 'Active',
  avatar: './src/assets/profile.png',
  ideaCount: user.postCount ?? 0,
  commentCount: user.commentCount ?? 0,
  reportCount: 0,
});

const normalizeRoleValue = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'qa coordinator') return 'qa_coordinator';
  return normalized;
};

const normalizeStatusValue = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === '1' || normalized === 'active') return 'active';
  if (normalized === '2' || normalized === 'disabled' || normalized === 'disable') return 'disabled';
  return value;
};

function DepartmentUserPage() {
  const { currentUser } = useAuth();
  const departmentId = currentUser?.departmentId ?? null;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftSearchValue, setDraftSearchValue] = useState('');
  const [draftStatusValue, setDraftStatusValue] = useState('');
  const [draftRoleValue, setDraftRoleValue] = useState('');
  const [appliedSearchValue, setAppliedSearchValue] = useState('');
  const [appliedStatusValue, setAppliedStatusValue] = useState('');
  const [appliedRoleValue, setAppliedRoleValue] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const loadData = useCallback(async ({
    page = 1,
    pageSize = 10,
    search = appliedSearchValue,
    role = appliedRoleValue,
    status = appliedStatusValue,
  } = {}) => {
    setLoading(true);
    try {
      const [userResult, statusItems] = await Promise.all([
        fetchUsers({
          page,
          pageSize,
          search: search || undefined,
          role: normalizeRoleValue(role) || undefined,
          departmentId: departmentId || undefined,
          status: normalizeStatusValue(status) || undefined,
        }),
        fetchStatuses({ entityType: 'user' }).catch(() => []),
      ]);
      const fetchedUsers = userResult.items || [];
      setUsers(fetchedUsers);
      setPagination({
        page: userResult.pagination.page,
        pageSize: userResult.pagination.pageSize,
        totalItems: userResult.pagination.totalItems,
        totalPages: userResult.pagination.totalPages,
        hasNext: userResult.pagination.hasNext,
        hasPrev: userResult.pagination.hasPrev,
      });
      const filteredStatuses = (statusItems || [])
        .filter((status) => status.id === 1 || status.id === 2)
        .map((status) => ({
          id: status.id,
          name: status.id === 1 ? 'Active' : 'Disabled',
        }));
      setStatusOptions(filteredStatuses);
      const roleLabels = fetchedUsers
        .map((user) => user.role || user.roleValue || user.roleLabel)
        .filter(Boolean);
      // const uniqueRoles = Array.from(new Set(roleLabels));
      const uniqueRoles = ['Staff', 'QA Coordinator']
      setRoleOptions(uniqueRoles.map((role) => ({ id: role, name: role })));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [departmentId, appliedSearchValue, appliedRoleValue, appliedStatusValue]);

  useEffect(() => {
    loadData({ page: 1, pageSize: pagination.pageSize, search: '', role: '', status: '' }).catch(() => {});
  }, [departmentId, pagination.pageSize]);

  const rows = useMemo(() => users.map(mapUserToRow), [users]);

  const filteredRows = rows;

  const handleSearch = (query, statusId, roleValueParam) => {
    const nextSearch = query ?? draftSearchValue;
    const nextStatus = statusId ?? draftStatusValue;
    const nextRole = roleValueParam ?? draftRoleValue;

    setAppliedSearchValue(nextSearch);
    setAppliedStatusValue(nextStatus);
    setAppliedRoleValue(nextRole);

    loadData({
      page: 1,
      search: nextSearch,
      role: nextRole,
      status: nextStatus,
    });
  };

  const handleApplyFilters = () => {
    handleSearch(draftSearchValue, draftStatusValue, draftRoleValue);
  };

  const handleClearFilters = () => {
    setDraftSearchValue('');
    setDraftStatusValue('');
    setDraftRoleValue('');
    setAppliedSearchValue('');
    setAppliedStatusValue('');
    setAppliedRoleValue('');
    loadData({ page: 1, search: '', role: '', status: '' });
  };

  const handlePageChange = (nextPage) => {
    loadData({ page: nextPage, search: appliedSearchValue, role: appliedRoleValue, status: appliedStatusValue });
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {/* Search Area Start */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ pt: 1, pb: 2.5 }}
        >
          <TextField
            placeholder="Search by name"
            value={draftSearchValue}
            onChange={(event) => setDraftSearchValue(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ color: '#97a3ba' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: { md: 360 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
            fullWidth
          />
          <TextField
            select
            value={draftRoleValue}
            onChange={(event) => setDraftRoleValue(event.target.value)}
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return 'All Roles';
                const matched = roleOptions.find((role) => String(role.id) === String(value));
                return matched?.name || 'Role';
              },
            }}
          >
            <MenuItem value="">All Role</MenuItem>
            {roleOptions.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            value={draftStatusValue}
            onChange={(event) => setDraftStatusValue(event.target.value)}
            sx={{
              minWidth: 140,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return 'All Status';
                const matched = statusOptions.find((status) => String(status.id) === String(value));
                return matched?.name || 'Status';
              },
            }}
          >
            <MenuItem value="">All Status</MenuItem>
            {statusOptions.map((status) => (
              <MenuItem key={status.id} value={status.id}>
                {status.name}
              </MenuItem>
            ))}
          </TextField>

          <Button
            type="button"
            variant="contained"
            onClick={handleApplyFilters}
            sx={{
              bgcolor: '#1d5feb',
              borderRadius: 0.7,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Search
          </Button>

          {(appliedSearchValue || appliedRoleValue || appliedStatusValue) && (
            <Button
              type="button"
              variant="outlined"
              onClick={handleClearFilters}
              sx={{
                borderRadius: 0.7,
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                borderColor: '#174dcc',
                color: '#1d5feb',
                '&:hover': { borderColor: '#174dcc', bgcolor: '#eef3ff' },
              }}
            >
              Clear
            </Button>
          )}
        </Stack>
        {/* Search Area End */}

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
            <Alert severity="info" sx={{ mb: 2 }}>
              The idea and comments count showing are only for current academic year{' '}
              <strong>{currentUser?.currentAcademicYear?.name ?? '—'}</strong>
            </Alert>
            <UserList
              users={filteredRows}
              roleValue="qa_coordinator"
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

export default DepartmentUserPage;
