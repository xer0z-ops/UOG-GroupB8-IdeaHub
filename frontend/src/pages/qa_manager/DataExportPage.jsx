import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import { fetchAcademicYears } from '../../services/academicYearService.js';
import { exportIdeasFile } from '../../services/reportService.js';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

function DataExportPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadYears = async () => {
      setLoading(true);
      try {
        const result = await fetchAcademicYears();
        if (!isMounted) return;
        setAcademicYears(result.items || []);
        const current = result.items.find((item) => item.isCurrent) || result.items[0];
        setSelectedYearId(current?.id ?? '');
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load academic years');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadYears();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedYear = useMemo(
    () => academicYears.find((year) => String(year.id) === String(selectedYearId)),
    [academicYears, selectedYearId],
  );

  const canExport = useMemo(() => {
    if (!selectedYear?.finalClosureDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    const final = String(selectedYear.finalClosureDate).slice(0, 10);
    return today > final;
  }, [selectedYear]);

  const handleExport = () => {
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => setConfirmOpen(false);

  const handleConfirmExport = async () => {
    if (!selectedYear?.academicYear) {
      setToast({ open: true, message: 'Academic year is required', severity: 'error' });
      return;
    }

    const academicYearValue = selectedYear.academicYear.replace('/', '-');
    setExporting(true);
    try {
      const result = await exportIdeasFile(academicYearValue);
      const fileList = result?.files?.join(', ') || 'files';
      setToast({
        open: true,
        message: `Export successful. Downloaded: ${fileList}`,
        severity: 'success',
      });
      setConfirmOpen(false);
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to export ideas', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading academic years...
          </Typography>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 2,
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                bgcolor: '#fff',
              }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#394150', mb: 3 }}>
                Export Setting
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#394150' }}>
                  Academic year :
                </Typography>
                <TextField
                  select
                  value={selectedYearId}
                  onChange={(event) => setSelectedYearId(event.target.value)}
                  sx={{
                    width: 140,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0.7,
                      height: 40,
                      bgcolor: '#fff',
                    },
                  }}
                >
                  {academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.academicYear}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3, width: '450px' }}>
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 3,
                    borderRadius: 2,
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#394150', mb: 0.8 }}>
                    Export Data
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: '#6b7280', mb: 3 }}>
                    Export ideas as CSV file
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleExport}
                    disabled={!canExport}
                    sx={{
                      bgcolor: '#1d5feb',
                      borderRadius: 0.7,
                      px: 4,
                      minWidth: 150,
                      height: 44,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#174dcc' },
                    }}
                  >
                    Export
                  </Button>
                </Paper>
              </Stack>

              {!canExport && (
                <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                  Idea submission is currently open. Data export will be enabled after the final closure date
                  {selectedYear?.finalClosureDate ? ` (${formatDate(selectedYear.finalClosureDate)}).` : '.'}
                </Alert>
              )}
            </Paper>
          </>
        )}
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog open={confirmOpen} onClose={handleCloseConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Export Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to export ideas for the selected academic year?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseConfirm} disabled={exporting} variant="outlined" sx={{ borderRadius: 0.7 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmExport}
            disabled={exporting}
            variant="contained"
            sx={{ borderRadius: 0.7 }}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}

export default DataExportPage;
