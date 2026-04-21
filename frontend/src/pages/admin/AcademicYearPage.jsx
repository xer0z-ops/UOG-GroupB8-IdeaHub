import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Typography } from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import AcademicYearListTable from '../../components/academic_year/AcademicYearListTable.jsx';
import AcademicYearDialog from '../../components/academic_year/AcademicYearDialog.jsx';
import useAuth from '../../hooks/useAuth.js';
import { createAcademicYear, deleteAcademicYear, fetchAcademicYears, updateAcademicYear } from '../../services/academicYearService.js';

function AcademicYearPage() {
  const { accessToken } = useAuth();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAcademicYearId, setEditingAcademicYearId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [academicYearToDelete, setAcademicYearToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [formValues, setFormValues] = useState({
    academicYear: '',
    academicStartDate: '',
    academicEndDate: '',
    ideaClosureDate: '',
    finalClosureDate: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!accessToken) {
      setYears([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadAcademicYears = async ({
      page = pagination.page,
      pageSize = pagination.pageSize,
    } = {}) => {
      setLoading(true);
      try {
        const result = await fetchAcademicYears({ page, pageSize });
        if (!isMounted) return;
        setYears(result.items);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems -1,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev,
        });
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load academic years');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAcademicYears();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const handleUpdateCurrent = async (year) => {
    if (!year?.id) return;

    try {
      const updated = await updateAcademicYear({
        academicYearId: year.id,
        name: year.academicYear?.replace('/', '-'),
        ideaClosureDate: year.ideaClosureDate,
        finalClosureDate: year.finalClosureDate,
      });

      setYears((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated, isCurrent: true } : { ...item, isCurrent: false })),
      );
      setToast({ open: true, message: 'Academic year updated successfully', severity: 'success' });
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to update academic year', severity: 'error' });
    }
  };

  const resetForm = () => {
    setFormValues({
      academicYear: '',
      academicStartDate: '',
      academicEndDate: '',
      ideaClosureDate: '',
      finalClosureDate: '',
    });
    setFormErrors({});
    setEditingAcademicYearId(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleDialogChange = (field, value) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value };
      const hasStart = Boolean(next.academicStartDate);
      const hasEnd = Boolean(next.academicEndDate);

      if (hasStart && hasEnd) {
        const endDate = new Date(next.academicEndDate);
        if (!Number.isNaN(endDate.getTime())) {
          const endYear = endDate.getFullYear();
          const startYear = endYear - 1;
          next.academicYear = `${startYear}/${endYear}`;
        }
      }

      return next;
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleEditAcademicYear = (year) => {
    if (!year?.id) return;
    setFormValues({
      academicYear: year.label || year.academicYear || '',
      academicStartDate: (year.academicStartDate || '').slice(0, 10),
      academicEndDate: (year.academicEndDate || '').slice(0, 10),
      ideaClosureDate: (year.ideaClosureDate || '').slice(0, 10),
      finalClosureDate: (year.finalClosureDate || '').slice(0, 10),
    });
    setFormErrors({});
    setEditingAcademicYearId(year.id);
    setDialogOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};
    const academicYear = String(formValues.academicYear || '').trim();
    const academicStartDate = formValues.academicStartDate;
    const academicEndDate = formValues.academicEndDate;
    const ideaClosureDate = formValues.ideaClosureDate;
    const finalClosureDate = formValues.finalClosureDate;

    if (!academicYear) nextErrors.academicYear = 'Academic year is required';
    if (!academicStartDate) nextErrors.academicStartDate = 'Academic start date is required';
    if (!academicEndDate) nextErrors.academicEndDate = 'Academic end date is required';
    if (academicStartDate && academicEndDate && academicEndDate < academicStartDate) {
      nextErrors.academicEndDate = 'Academic end date must be after academic start date';
    }
    if (!ideaClosureDate) nextErrors.ideaClosureDate = 'Idea closure date is required';
    if (!finalClosureDate) nextErrors.finalClosureDate = 'Final closure date is required';
    if (ideaClosureDate && finalClosureDate && finalClosureDate < ideaClosureDate) {
      nextErrors.finalClosureDate = 'Final closure date must be after idea closure date';
    }
    if (academicStartDate && ideaClosureDate && ideaClosureDate < academicStartDate) {
      nextErrors.ideaClosureDate = 'Idea closure date must be on/after academic start date';
    }
    if (academicEndDate && ideaClosureDate && ideaClosureDate > academicEndDate) {
      nextErrors.ideaClosureDate = 'Idea closure date must be on/before academic end date';
    }
    if (academicStartDate && finalClosureDate && finalClosureDate < academicStartDate) {
      nextErrors.finalClosureDate = 'Final closure date must be on/after academic start date';
    }
    if (academicEndDate && finalClosureDate && finalClosureDate > academicEndDate) {
      nextErrors.finalClosureDate = 'Final closure date must be on/before academic end date';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitAcademicYear = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingAcademicYearId) {
        const updated = await updateAcademicYear({
          academicYearId: editingAcademicYearId,
          name: formValues.academicYear,
          academicStartDate: formValues.academicStartDate,
          academicEndDate: formValues.academicEndDate,
          ideaClosureDate: formValues.ideaClosureDate,
          finalClosureDate: formValues.finalClosureDate,
        });

        setYears((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        );
        setToast({ open: true, message: 'Academic year updated successfully', severity: 'success' });
      } else {
        await createAcademicYear({
          name: formValues.academicYear,
          academicStartDate: formValues.academicStartDate,
          academicEndDate: formValues.academicEndDate,
          ideaClosureDate: formValues.ideaClosureDate,
          finalClosureDate: formValues.finalClosureDate,
        });

        const result = await fetchAcademicYears({ page: pagination.page, pageSize: pagination.pageSize });
        setYears(result.items);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev,
        });
        setToast({ open: true, message: 'Academic year created successfully', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || (editingAcademicYearId ? 'Failed to update academic year' : 'Failed to create academic year'),
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (year) => {
    setAcademicYearToDelete(year);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setAcademicYearToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!academicYearToDelete?.id) {
      handleCloseDeleteDialog();
      return;
    }

    setDeleting(true);
    try {
      await deleteAcademicYear(academicYearToDelete.id);
      const result = await fetchAcademicYears({ page: pagination.page, pageSize: pagination.pageSize });
      setYears(result.items);
      setPagination({
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNext: result.pagination.hasNext,
        hasPrev: result.pagination.hasPrev,
      });
      setToast({ open: true, message: 'Academic year deleted successfully', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to delete academic year', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  const handlePageChange = async (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setLoading(true);
    try {
      const result = await fetchAcademicYears({ page: nextPage, pageSize: pagination.pageSize });
      setYears(result.items);
      setPagination({
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNext: result.pagination.hasNext,
        hasPrev: result.pagination.hasPrev,
      });
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ height: '100%', overflowY: { xs: 'auto', md: 'hidden' } }}>
        <Box
          sx={{
            px: { xs: 2.5, md: 3.5 },
            py: { xs: 1.5, md: 2},
          }}
        >
          {loading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Loading academic years...
              </Typography>
            </Box>
          ) : (
            <>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <AcademicYearListTable
                years={years}
                onUpdateCurrent={handleUpdateCurrent}
                onAddAcademicYear={handleOpenDialog}
                onDelete={handleDelete}
                onEdit={handleEditAcademicYear}
                onEditCurrent={handleEditAcademicYear}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </Box>
      </Box>

      <AcademicYearDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitAcademicYear}
        values={formValues}
        errors={formErrors}
        onChange={handleDialogChange}
        submitting={saving}
        title={editingAcademicYearId ? 'Update Academic Year' : 'Add Academic Year'}
        submitLabel={editingAcademicYearId ? 'Update' : 'Save'}
      />

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Academic Year</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete
            {' '}
            <strong>{academicYearToDelete?.label || academicYearToDelete?.academicYear || 'this academic year'}</strong>
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

export default AcademicYearPage;
