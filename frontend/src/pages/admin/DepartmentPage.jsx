import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import useAuth from '../../hooks/useAuth.js';
import DepartmentListTable from '../../components/departments/DepartmentListTable.jsx';
import DepartmentDialog from '../../components/departments/DepartmentDialog.jsx';
import { createDepartment, deleteDepartment, fetchDepartments, updateDepartment } from '../../services/departmentService.js';

const mapDepartmentToRow = (department) => ({
  id: department.id,
  name: department.name || 'Unnamed Department',
  qaCoordinator: department.qaCoordinator?.fullName || '-',
  staffCount: department.staffCount ?? 0,
  ideaCount: department.ideaCount ?? 0,
  email: '-',
  department: '-',
  role: '-',
  status: 'Active',
  avatar: './src/assets/profile.png',
});

function DepartmentPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [formValues, setFormValues] = useState({ departmentName: '', fullName: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

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

  const rows = useMemo(
    () => departments.map((department) => mapDepartmentToRow(department)),
    [departments],
  );

  const applyDepartmentResult = (result) => {
    setDepartments(result.items);
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

  useEffect(() => {
    if (!accessToken) {
      setDepartments([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadDepartments = async ({
      page = pagination.page,
      pageSize = pagination.pageSize,
      search = appliedSearch,
    } = {}) => {
      setLoading(true);
      try {
        const result = await fetchDepartments({ page, pageSize, search });
        if (!isMounted) return;



        applyDepartmentResult(result);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load departments');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const handleSearch = async (query) => {
    if (!accessToken) return;
    const nextSearch = query ?? searchValue;
    setAppliedSearch(nextSearch);
    setLoading(true);
    try {
      const result = await fetchDepartments({
        search: nextSearch,
        page: 1,
        pageSize: pagination.pageSize,
      });
      applyDepartmentResult(result);
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormValues({ departmentName: '', fullName: '' });
    setFormErrors({});
    setEditingDepartmentId(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (departmentRow) => {
    const departmentName = departmentRow?.name || '';
    setFormValues({ departmentName, fullName: departmentName });
    setFormErrors({});
    setEditingDepartmentId(departmentRow?.id ?? null);
    setDialogOpen(true);
  };

  const handleDialogChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const name = (formValues.departmentName || formValues.fullName || '').trim();
    const nextErrors = {};

    if (!name) {
      nextErrors.departmentName = 'Department name is required';
      nextErrors.fullName = 'Department name is required';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitDepartment = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingDepartmentId) {
        const updatedDepartment = await updateDepartment({
          departmentId: editingDepartmentId,
          name: formValues.departmentName || formValues.fullName,
        });

        setDepartments((prev) =>
          prev.map((department) =>
            department.id === editingDepartmentId
              ? { ...department, ...updatedDepartment }
              : department,
          ),
        );
        setToast({ open: true, message: 'Department updated successfully', severity: 'success' });
      } else {
        const createdDepartment = await createDepartment({
          name: formValues.departmentName || formValues.fullName,
        });
        setDepartments((prev) => [createdDepartment, ...prev]);
        setToast({ open: true, message: 'Department created successfully', severity: 'success' });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      if (error?.fieldErrors) {
        setFormErrors((prev) => ({ ...prev, ...error.fieldErrors }));
      }
      setToast({
        open: true,
        message: error?.message || (editingDepartmentId ? 'Failed to update department' : 'Failed to create department'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (departmentRow) => {
    setDepartmentToDelete(departmentRow);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setDepartmentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!departmentToDelete?.id) {
      handleCloseDeleteDialog();
      return;
    }

    setDeleting(true);
    try {
      await deleteDepartment(departmentToDelete.id);
      setDepartments((prev) => prev.filter((department) => department.id !== departmentToDelete.id));
      setToast({ open: true, message: 'Department deleted successfully', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to delete department', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };


  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  const handlePageChange = async (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setLoading(true);
    try {
      const result = await fetchDepartments({
        search: appliedSearch,
        page: nextPage,
        pageSize: pagination.pageSize,
      });
      applyDepartmentResult(result);
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const isFiltersActive = appliedSearch.trim() !== '';

  return (
    <MainLayout>
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="flex-end"
          sx={{ mb: 2.5 }}
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
            fullWidth
            sx={{
              maxWidth: { md: 360 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
          />

          <Button
            type="button"
            variant="contained"
            onClick={() => handleSearch(searchValue)}
            sx={{
              bgcolor: '#1d5feb',
              borderRadius: 0.7,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              width: { xs: '100%', md: 'auto' },
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Search
          </Button>
          {
            isFiltersActive ?
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setSearchValue('');
                  setAppliedSearch('');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  handleSearch('');
                }}
                sx={{
                  borderRadius: 0.7,
                  px: 3,
                  fontWeight: 600,
                  textTransform: 'none',
                  width: { xs: '100%', md: 'auto' },
                  whiteSpace: 'nowrap',
                  borderColor: '#1d5feb',
                  color: '#1d5feb',
                  '&:hover': { borderColor: '#174dcc', bgcolor: '#eef3ff' },
                }}
              >
                Clear
              </Button> : ''
          }


          <Box sx={{ flexGrow: 1 }} />

          <Button
            type="button"
            variant="contained"
            onClick={handleOpenDialog}
            sx={{
              bgcolor: '#1d5feb',
              borderRadius: 0.7,
              px: 3.5,
              fontWeight: 600,
              textTransform: 'none',
              width: { xs: '100%', md: 'auto' },
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            + Add Department
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Loading departments...
            </Typography>
          </Box>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <DepartmentListTable
              users={rows}
              onEdit={handleEdit}
              onDelete={handleDelete}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Box>

      <DepartmentDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDepartment}
        values={formValues}
        errors={formErrors}
        onChange={handleDialogChange}
        submitting={saving}
        isEditMode={Boolean(editingDepartmentId)}
      />

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Department</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete
            {' '}
            <strong>{departmentToDelete?.name || 'this department'}</strong>
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

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

export default DepartmentPage;
