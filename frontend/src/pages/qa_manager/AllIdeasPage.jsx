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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';
import MainLayout from '../../layouts/MainLayout.jsx';
import AllIdeasListTable from '../../components/ideas/AllIdeasListTable.jsx';
import AllIdeaDetailsDialog from '../../components/ideas/AllIdeaDetailsDialog.jsx';
import ReportDetailsDialog from '../../components/ideas/ReportDetailsDialog.jsx';
import { fetchManagerIdeas, fetchReportedIdeas } from '../../services/managerIdeaService.js';
import { hideIdea } from '../../services/ideaService.js';
import { fetchIdeaCategories, fetchStaffDepartments } from '../../services/staffIdeaService.js';
import { fetchAcademicYears } from '../../services/academicYearService.js';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest Idea' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'viewed', label: 'Most Viewed' },
];

const tabStyles = (active) => ({
  flex: 1,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: 16,
  color: active ? '#1f2937' : '#9ca3af',
  borderRadius: 2,
  height: 46,
  bgcolor: active ? '#ffffff' : 'transparent',
  boxShadow: active ? '0 8px 20px rgba(15, 23, 42, 0.12)' : 'none',
  '&:hover': { bgcolor: active ? '#ffffff' : 'rgba(255,255,255,0.5)' },
});

const AllIdeasPage = () => {
  const [ideas, setIdeas] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportIdea, setReportIdea] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ideaToToggle, setIdeaToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [searchParams, setSearchParams] = useState({
    search: '',
    departmentId: '',
    categoryId: '',
    academicYear: '',
    sortBy: 'latest',
  });
  const [draftFilters, setDraftFilters] = useState(searchParams);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
    const rowsPerPage = useMemo(() => {
      if (isXl) return 10;
      if (isXs) return 3;
      if (isSm) return 4;
      return 8;
    }, [isXl, isXs, isSm]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: rowsPerPage,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab]);

  useEffect(() => {
    setDraftFilters(searchParams);
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      setLoading(true);
      try {
        const [categoriesData, departmentsData] = await Promise.all([
          fetchIdeaCategories().catch(() => []),
          fetchStaffDepartments().catch(() => []),
        ]);

        if (!isMounted) return;
        setCategories(categoriesData || []);
        setDepartments(departmentsData || []);
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message || 'Failed to load ideas');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAcademicYears = async () => {
      try {
        const result = await fetchAcademicYears({ pageSize: 200 });
        if (isMounted) {
          setAcademicYearOptions(
            (result.items || []).map((year) => ({ id: year.id, label: year.academicYear })),
          );
        }
      } catch (error) {
        if (isMounted) setAcademicYearOptions([]);
      }
    };

    loadAcademicYears();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadIdeas = async (page = pagination.page, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const params = {
          page,
          pageSize,
          search: searchParams.search,
          departmentId: searchParams.departmentId || null,
          categoryId: searchParams.categoryId || null,
          academicYearId: searchParams.academicYear || null,
          sortBy: searchParams.sortBy || null,
        };
        const result = activeTab === 'reported'
          ? await fetchReportedIdeas(params)
          : await fetchManagerIdeas(params);

        if (!isMounted) return;
        setIdeas(result.items || []);
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
        if (isMounted) {
          setErrorMessage(error?.message || 'Failed to load ideas');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadIdeas();
    return () => {
      isMounted = false;
    };
  }, [activeTab, pagination.page, pagination.pageSize, searchParams]);

  const handleSearch = (filters) => {
    const nextFilters = {
      search: filters?.search || '',
      departmentId: filters?.departmentId || '',
      categoryId: filters?.categoryId || '',
      academicYear: filters?.academicYear || '',
      sortBy: filters?.sortBy || 'latest',
    };
    setSearchParams(nextFilters);
    setDraftFilters(nextFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleApplyFilters = () => {
    handleSearch(draftFilters);
  };

  const handleClearFilters = () => {
    const cleared = {
      search: '',
      departmentId: '',
      categoryId: '',
      academicYear: '',
      sortBy: 'latest',
    };
    setDraftFilters(cleared);
    setSearchParams(cleared);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: nextPage }));
  };
  const handleOpenDetail = (idea) => {
    if (!idea?.id) return;
    setSelectedIdeaId(idea.id);
    setDetailOpen(true);
  };

  const handleOpenReportDetail = (idea) => {
    if (!idea?.id) return;
    setReportIdea(idea);
    setReportOpen(true);
  };

  const handleCloseReportDetail = () => {
    setReportOpen(false);
    setReportIdea(null);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
  };

  const handleHide = (ideaId, statusId) => {
    if (ideaId) {
      setIdeas((prev) =>
        prev.map((item) => (item.id === ideaId ? { ...item, statusId } : item))
      );
    }
    setToast({
      open: true,
      message: statusId === 7 ? 'Idea is hidden' : 'Idea is visible again',
      severity: 'success',
    });
  };

  const handleOpenConfirm = (idea) => {
    if (!idea?.id) return;
    setIdeaToToggle(idea);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setIdeaToToggle(null);
  };

  const handleConfirmToggle = async () => {
    if (!ideaToToggle?.id) {
      handleCloseConfirm();
      return;
    }

    const currentStatusId = ideaToToggle.statusId ?? ideaToToggle.status?.id ?? ideaToToggle.status_id;
    const nextStatusId = currentStatusId === 7 ? 5 : 7;

    setToggling(true);
    try {
      await hideIdea(ideaToToggle.id, nextStatusId);
      setIdeas((prev) =>
        prev.map((item) =>
          item.id === ideaToToggle.id ? { ...item, statusId: nextStatusId } : item
        )
      );
      handleHide(ideaToToggle.id, nextStatusId);
      handleCloseConfirm();
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || 'Failed to update idea status',
        severity: 'error',
      });
    } finally {
      setToggling(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Box alignItems="center" justifyContent="center" sx={{ mb: 2.5 }}>
          <Paper
            elevation={0}
            alignItems="center"
            sx={{
              p: 1,
              borderRadius: 3,
              bgcolor: '#f3f4f6',
              maxWidth: 520,
              mx: 'auto',
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Button onClick={() => setActiveTab('all')} sx={tabStyles(activeTab === 'all')}>
                All Ideas
              </Button>
              <Button onClick={() => setActiveTab('reported')} sx={tabStyles(activeTab === 'reported')}>
                Reported
              </Button>
            </Stack>
          </Paper>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          justifyContent="flex-end"
          sx={{ pt: 1, pb: 2.5 }}
        >
          <TextField
            placeholder="Search by name"
            value={draftFilters.search}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ color: '#9aa3b2' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1.2,
              minWidth: { xs: '100%', sm: 220 },
              pt: 0.5,
              '& .MuiOutlinedInput-root': { borderRadius: 0.7, bgcolor: '#fff' },
            }}
          />

          <TextField
            select
            value={draftFilters.departmentId}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, departmentId: event.target.value }))}
            sx={{
              minWidth: { xs: '100%', sm: 180 },
              pt: 0.5,
              '& .MuiOutlinedInput-root': { borderRadius: 0.7, bgcolor: '#fff' },
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return 'All Departments';
                const matched = departments.find((dept) => String(dept.id) === String(value));
                return matched?.name || 'All Departments';
              },
            }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            value={draftFilters.categoryId}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, categoryId: event.target.value }))}
            sx={{
              minWidth: { xs: '100%', sm: 180 },
              pt: 0.5,
              '& .MuiOutlinedInput-root': { borderRadius: 0.7, bgcolor: '#fff', color: 'black' },
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return 'All Categories';
                const matched = categories.find((cat) => String(cat.id) === String(value));
                return matched?.name || 'All Categories';
              },
            }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            value={draftFilters.academicYear}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, academicYear: event.target.value }))}
            sx={{
              minWidth: { xs: '100%', sm: 180 },
              pt: 0.5,
              '& .MuiOutlinedInput-root': { borderRadius: 0.7, bgcolor: '#fff', color: 'black' },
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return 'All Academic Years';
                const matched = academicYearOptions.find((year) => String(year.id) === String(value));
                return matched?.label || 'All Academic Years';
              },
            }}
          >
            <MenuItem value="">All Academic Years</MenuItem>
            {academicYearOptions.map((year) => (
              <MenuItem key={year.id} value={year.id}>
                {year.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            value={draftFilters.sortBy}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, sortBy: event.target.value }))}
            sx={{
              minWidth: { xs: '100%', sm: 160 },
              pt: 0.5,
              '& .MuiOutlinedInput-root': { borderRadius: 0.7, bgcolor: '#fff' },
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            onClick={handleApplyFilters}
            sx={{
              bgcolor: '#1d5feb',
              borderRadius: 0.7,
              px: 3,
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              alignSelf: 'bottom',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Search
          </Button>

          {(searchParams.search ||
            searchParams.departmentId ||
            searchParams.categoryId ||
            searchParams.academicYear ||
            searchParams.sortBy !== 'latest') && (
            <Button
              type="button"
              variant="outlined"
              onClick={handleClearFilters}
              sx={{
                borderRadius: 0.7,
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                borderColor: '#174dcc',
                color: '#1d5feb',
                '&:hover': { borderColor: '#174dcc', bgcolor: '#eef3ff' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Clear
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Loading ideas...
            </Typography>
          </Box>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            <AllIdeasListTable
              ideas={ideas}
              onDetail={handleOpenDetail}
              onView={handleOpenConfirm}
              onReportDetail={handleOpenReportDetail}
              activeTab={activeTab}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Box>

      <AllIdeaDetailsDialog
        open={detailOpen}
        ideaId={selectedIdeaId}
        onClose={handleCloseDetail}
        onHide={handleHide}
      />

      <ReportDetailsDialog
        open={reportOpen}
        onClose={handleCloseReportDetail}
        idea={reportIdea}
        reports={[]}
        ideaId={reportIdea?.id}
      />

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog open={confirmOpen} onClose={handleCloseConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {ideaToToggle?.statusId === 7 ? 'Show Idea' : 'Hide Idea'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {ideaToToggle?.statusId === 7
              ? 'Are you sure you want to show this idea again?'
              : 'Are you sure you want to hide this idea?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseConfirm} disabled={toggling} variant="outlined" sx={{ borderRadius: 0.7 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmToggle}
            disabled={toggling}
            color={ideaToToggle?.statusId === 7 ? 'primary' : 'error'}
            variant="contained"
            sx={{ borderRadius: 0.7 }}
          >
            {toggling ? 'Updating...' : ideaToToggle?.statusId === 7 ? 'Show' : 'Hide'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default AllIdeasPage;
