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
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import CategoryListTable from '../../components/categories/CategoryListTable.jsx';
import CategoryDialog from '../../components/categories/CategoryDialog.jsx';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../../services/categoryService.js';
import { fetchIdeas } from '../../services/ideaService.js';

const mapCategoryToRow = (category, ideaCountLookup) => ({
  id: category.id,
  name: category.name || 'Unnamed Category',
  ideaCount: ideaCountLookup[category.id] || 0,
});

function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [ideaCountLookup, setIdeaCountLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [formValues, setFormValues] = useState({ categoryName: '', name: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [draftSearchValue, setDraftSearchValue] = useState('');

  const rows = useMemo(
    () => categories.map((category) => mapCategoryToRow(category, ideaCountLookup)),
    [categories, ideaCountLookup],
  );

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setLoading(true);
      try {
        const [categoryItems, ideas] = await Promise.all([
          fetchCategories(),
          fetchIdeas().catch(() => []),
        ]);

        if (!isMounted) return;

        const ideaLookup = {};
        for (const idea of ideas || []) {
          const categoryIds = Array.isArray(idea.categories) && idea.categories.length
            ? idea.categories.map((category) => category?.id).filter(Boolean)
            : [];
          for (const categoryId of categoryIds) {
            ideaLookup[categoryId] = (ideaLookup[categoryId] || 0) + 1;
          }
        }

        setIdeaCountLookup(ideaLookup);
        setCategories(categoryItems || []);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load categories');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const categoryItems = await fetchCategories({ search: query ?? searchValue });
      setCategories(categoryItems);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySearch = () => {
    handleSearch(draftSearchValue);
    setSearchValue(draftSearchValue);
  };

  const handleClearSearch = () => {
    setDraftSearchValue('');
    setSearchValue('');
    handleSearch('');
  };

  const resetForm = () => {
    setFormValues({ categoryName: '', name: '' });
    setFormErrors({});
    setEditingCategoryId(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (categoryRow) => {
    const categoryName = categoryRow?.name || '';
    setFormValues({ categoryName, name: categoryName });
    setFormErrors({});
    setEditingCategoryId(categoryRow?.id ?? null);
    setDialogOpen(true);
  };

  const handleDialogChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const name = (formValues.categoryName || formValues.name || '').trim();
    const nextErrors = {};

    if (!name) {
      nextErrors.categoryName = 'Category name is required';
      nextErrors.name = 'Category name is required';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitCategory = async () => {
    if (!validateForm()) return;

    const name = (formValues.categoryName || formValues.name || '').trim();

    setSaving(true);
    try {
      if (editingCategoryId) {
        const updatedCategory = await updateCategory({ categoryId: editingCategoryId, name });
        setCategories((prev) =>
          prev.map((item) => (item.id === editingCategoryId ? updatedCategory : item))
        );
        setToast({ open: true, message: 'Category updated successfully', severity: 'success' });
      } else {
        const createdCategory = await createCategory({ name });
        setCategories((prev) => [createdCategory, ...prev]);
        setToast({ open: true, message: 'Category created successfully', severity: 'success' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to save category', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (categoryRow) => {
    setCategoryToDelete(categoryRow);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setCategoryToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete?.id) {
      handleCloseDeleteDialog();
      return;
    }

    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((item) => item.id !== categoryToDelete.id));
      setToast({ open: true, message: 'Category deleted successfully', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to delete category', severity: 'error' });
    } finally {
      setDeleting(false);
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
            placeholder="Search"
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

          <Button
            type="button"
            variant="contained"
            onClick={handleApplySearch}
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

          {searchValue && (
            <Button
              type="button"
              variant="outlined"
              onClick={handleClearSearch}
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
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            + Add Category
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Loading categories...
            </Typography>
          </Box>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <CategoryListTable
              categories={rows}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}
      </Box>

      <CategoryDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitCategory}
        values={formValues}
        errors={formErrors}
        onChange={handleDialogChange}
        submitting={saving}
        isEditMode={Boolean(editingCategoryId)}
      />

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Category</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete{' '}
            <strong>{categoryToDelete?.name || 'this category'}</strong>?
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

export default CategoryManagementPage;
