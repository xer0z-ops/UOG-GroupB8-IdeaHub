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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import UserStatusDialog from '../../components/users/UserStatusDialog.jsx';
import { fetchUsers, updateUserStatus } from '../../services/userService.js';
import { fetchIdeas } from '../../services/ideaService.js';
import { fetchStatuses } from '../../services/statusService.js';
import { fetchDepartments } from '../../services/departmentService.js';
import UserModerationListTable from '../../components/users/UserModerationListTable.jsx';
import UserList from '../../components/users/UserListTable.jsx';
import useAuth from '../../hooks/useAuth.js';

const mapUserToRow = (user, counts, departmentName = '') => ({
  id: user.id,
  name: user.fullName || user.name || 'Unnamed User',
  fullName: user.fullName || user.name || '',
  email: user.email || '',
  departmentId: user.departmentId ?? null,
  departmentName: departmentName || user.department?.name || user.department || '',
  roleValue: user.roleValue || user.role || '',
  roleLabel: user.role || '',
  statusId: user.statusId ?? user.status_id ?? null,
  status: user.statusLabel || user.statusName || 'Active',
  avatar: './src/assets/profile.png',
  ideaCount: counts.ideaCount || 0,
  commentCount: counts.commentCount || 0,
  reportCount: counts.reportCount || 0,
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

function UserModerationPage() {
  const [users, setUsers] = useState([]);
  const [ideas, setIdeas] = useState([]);
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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [statusError, setStatusError] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [departments, setDepartments] = useState([]);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const { currentUser } = useAuth();

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

  const loadData = useCallback(async ({
    page = 1,
    pageSize = pagination.pageSize,
    search = appliedSearchValue,
    role = appliedRoleValue,
    status = appliedStatusValue,
  } = {}) => {
    setLoading(true);
    try {
      const [userResult, ideaItems, statusItems, departmentResult] = await Promise.all([
        fetchUsers({
          page,
          pageSize,
          search: search || undefined,
          role: normalizeRoleValue(role) || undefined,
          status: status || undefined,
        }),
        fetchIdeas().catch(() => []),
        fetchStatuses({ entityType: 'user' }).catch(() => []),
        fetchDepartments().catch(() => ({ items: [] })),
      ]);
      
      const staffUsers = userResult.items || []
      setUsers(staffUsers);
      setIdeas(ideaItems || []);
      setDepartments(departmentResult.items || []);
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
      const roleLabels = (staffUsers || [])
        .map((user) => user.role || user.roleValue || user.roleLabel)
        .filter(Boolean);
      const uniqueRoles = ['Staff', 'QA Coordinator']
      setRoleOptions(uniqueRoles.map((role) => ({ id: role, name: role })));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [appliedRoleValue, appliedSearchValue, appliedStatusValue, pagination.pageSize]);

  useEffect(() => {
    loadData({ page: 1, pageSize: pagination.pageSize, search: '', role: '', status: '' }).catch(() => {});
  }, [pagination.pageSize]);

  const userCounts = useMemo(() => {
    const counts = {};
    for (const idea of ideas) {
      const authorId = idea.authorId;
      if (!authorId) continue;
      if (!counts[authorId]) {
        counts[authorId] = { ideaCount: 0, commentCount: 0, reportCount: 0 };
      }
      counts[authorId].ideaCount += 1;
      counts[authorId].commentCount += Number(idea.commentCount || 0);
      counts[authorId].reportCount += Number(idea.reportCount || 0);
    }
    return counts;
  }, [ideas]);

  const rows = useMemo(
    () => {
      const departmentLookup = departments.reduce((acc, dept) => {
        acc[String(dept.id)] = dept.name;
        return acc;
      }, {});
      return users.map((user) =>
        mapUserToRow(
          user,
          userCounts[user.id] || {},
          departmentLookup[String(user.departmentId ?? '')] || '',
        ),
      );
    },
    [users, userCounts, departments],
  );

  const filteredRows = rows;


  const handleSearch = (query, statusId, roleValueParam) => {
    const nextSearch = query ?? draftSearchValue;
    const nextStatus = statusId ?? draftStatusValue;
    const nextRole = roleValueParam ?? draftRoleValue;

    setAppliedSearchValue(nextSearch);
    setAppliedStatusValue(normalizeStatusValue(nextStatus));
    setAppliedRoleValue(nextRole);
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
  };

  const handlePageChange = (nextPage) => {
    loadData({ page: nextPage, search: appliedSearchValue, role: appliedRoleValue, status: appliedStatusValue });
  };

  useEffect(() => {
    loadData({
      page: 1,
      search: appliedSearchValue,
      role: appliedRoleValue,
      status: appliedStatusValue,
    }).catch(() => {});
  }, [appliedSearchValue, appliedRoleValue, appliedStatusValue, loadData]);

  const handleOpenStatusDialog = (userRow) => {
    const currentUser = users.find((item) => item.id === userRow.id);
    setSelectedUser(userRow);
    setSelectedUserData(currentUser ? { ...userRow, ...currentUser } : userRow);
    setStatusValue(
      currentUser?.statusId ?? currentUser?.status_id ?? currentUser?.status?.id ?? userRow.statusId ?? ''
    );
    setStatusError('');
    setStatusDialogOpen(true);
  };

  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedUser(null);
    setSelectedUserData(null);
    setStatusValue('');
    setStatusError('');
  };

  const handleSubmitStatus = async () => {
    if (!selectedUser?.id) return;
    if (!statusValue) {
      setStatusError('Status is required');
      return;
    }

    const normalizedStatusId = (() => {
      const raw = String(statusValue).trim().toLowerCase();
      if (raw === 'active') return 1;
      if (raw === 'disabled' || raw === 'disable') return 2;
      const parsed = Number(statusValue);
      return Number.isNaN(parsed) ? null : parsed;
    })();

    if (!normalizedStatusId) {
      setStatusError('Status is required');
      return;
    }

    setSavingStatus(true);
    try {
      const updatedUser = await updateUserStatus(selectedUser.id, normalizedStatusId);

      setUsers((prev) =>
        prev.map((item) => (item.id === selectedUser.id ? { ...item, ...updatedUser } : item))
      );
      setToast({ open: true, message: 'Status updated successfully', severity: 'success' });
      handleCloseStatusDialog();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to update status', severity: 'error' });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
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
              roleValue="qa_manager"
              onEdit={handleOpenStatusDialog}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Box>

      <UserStatusDialog
        open={statusDialogOpen}
        onClose={handleCloseStatusDialog}
        onSubmit={handleSubmitStatus}
        user={selectedUser}
        statusOptions={statusOptions}
        value={statusValue}
        onChange={setStatusValue}
        submitting={savingStatus}
        error={statusError}
      />

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

export default UserModerationPage;
