import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';

function AcademicYearDialog({
  open,
  onClose,
  onSubmit,
  values = {},
  errors = {},
  onChange = () => {},
  submitting = false,
  title = 'Add Academic Year',
  submitLabel = 'Save',
}) {
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseInputDate = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const pickMin = (a, b) => {
    if (a && b) return a > b ? a : b;
    return a || b || null;
  };

  const pickMax = (a, b) => {
    if (a && b) return a < b ? a : b;
    return a || b || null;
  };

  const parseAcademicYear = (value) => {
    const years = String(value || '').match(/\d{4}/g);
    if (!years || years.length < 2) return null;
    const startYear = Number(years[0]);
    const endYear = Number(years[1]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    return { startYear, endYear };
  };

  const today = new Date();
  const minDate = new Date(today);
  minDate.setFullYear(minDate.getFullYear() - 10);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 10);
  const minDateValue = formatDate(minDate);
  const maxDateValue = formatDate(maxDate);
  const isUpdate = submitLabel === 'Update' || String(title || '').toLowerCase().includes('update');

  const academicYearRange = parseAcademicYear(values.academicYear);
  const startYearMin = academicYearRange
    ? new Date(academicYearRange.startYear, 0, 1)
    : (isUpdate ? null : minDate);
  const startYearMax = academicYearRange
    ? new Date(academicYearRange.endYear, 11, 31)
    : (isUpdate ? null : maxDate);
  const endYearMin = academicYearRange
    ? new Date(academicYearRange.endYear, 0, 1)
    : (isUpdate ? null : minDate);
  const endYearMax = academicYearRange
    ? new Date(academicYearRange.endYear, 11, 31)
    : (isUpdate ? null : maxDate);
  const globalMinDate = isUpdate ? null : minDate;
  const globalMaxDate = isUpdate ? null : maxDate;

  const selectedStartDate = parseInputDate(values.academicStartDate);
  const selectedEndDate = parseInputDate(values.academicEndDate);

  const academicStartMinDate = pickMin(startYearMin, globalMinDate);
  const academicStartMaxDate = pickMax(
    pickMin(startYearMax, globalMaxDate),
    selectedEndDate ? pickMin(startYearMax, selectedEndDate) : null,
  );
  const academicEndMinDate = academicYearRange
    ? pickMax(endYearMin, selectedStartDate || null)
    : pickMax(selectedStartDate || null, globalMinDate);
  const academicEndMaxDate = academicYearRange
    ? endYearMax
    : globalMaxDate;

  const academicStartMinValue = academicStartMinDate ? formatDate(academicStartMinDate) : undefined;
  const academicStartMaxValue = academicStartMaxDate ? formatDate(academicStartMaxDate) : undefined;
  const academicEndMinValue = academicEndMinDate ? formatDate(academicEndMinDate) : undefined;
  const academicEndMaxValue = academicEndMaxDate ? formatDate(academicEndMaxDate) : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#ffffff',
          maxWidth: 920,
        },
      }}
      BackdropProps={{
        sx: { bgcolor: 'rgba(13, 17, 23, 0.4)' },
      }}
    >
      <DialogTitle sx={{ px: 4, pt: 3, pb: 2.25, position: 'relative' }}>
        <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#374151' }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: '#f3f4f6',
            color: '#374151',
            '&:hover': { bgcolor: '#e5e7eb' },
          }}
        >
          <CloseRounded sx={{ fontSize: 26 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderTop: '1px solid #ebedf0' }} />

      <DialogContent sx={{ px: 4, pt: 2.5, pb: 1.5 }}>
        <Typography sx={{ mb: 1, fontSize: 17, fontWeight: 700, color: '#374151' }}>
          Academic Year
        </Typography>
        <TextField
          fullWidth
          value={values.academicYear || ''}
          onChange={(event) => onChange('academicYear', event.target.value)}
          placeholder=""
          error={Boolean(errors.academicYear)}
          helperText={errors.academicYear}
          inputProps={{ readOnly: true }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 48,
              bgcolor: '#f9fafb',
              '& fieldset': { borderColor: '#d1d5db' },
            },
            '& input': { fontSize: 15, color: '#374151' },
          }}
        />

        <Typography sx={{ mb: 1, fontSize: 17, fontWeight: 700, color: '#374151' }}>
          Academic Start Date
        </Typography>
        <TextField
          fullWidth
          type="date"
          size="small"
          value={values.academicStartDate || ''}
          onChange={(event) => onChange('academicStartDate', event.target.value)}
          error={Boolean(errors.academicStartDate)}
          helperText={errors.academicStartDate}
          inputProps={{
            min: academicStartMinValue,
            max: academicStartMaxValue,
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 48,
              color: '#374151',
              fontSize: 13,
              backgroundColor: '#f9fafb',
            },
          }}
        />

        <Typography sx={{ mb: 1, fontSize: 17, fontWeight: 700, color: '#374151' }}>
          Academic End Date
        </Typography>
        <TextField
          fullWidth
          type="date"
          size="small"
          value={values.academicEndDate || ''}
          onChange={(event) => onChange('academicEndDate', event.target.value)}
          error={Boolean(errors.academicEndDate)}
          helperText={errors.academicEndDate}
          inputProps={{
            min: academicEndMinValue,
            max: academicEndMaxValue,
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 48,
              color: '#374151',
              fontSize: 13,
              backgroundColor: '#f9fafb',
            },
          }}
        />

        <Typography sx={{ mb: 1, fontSize: 17, fontWeight: 700, color: '#374151' }}>
          Idea Submission Closure Date
        </Typography>
        <TextField
          fullWidth
          type="date"
          size="small"
          value={values.ideaClosureDate || ''}
          onChange={(event) => onChange('ideaClosureDate', event.target.value)}
          error={Boolean(errors.ideaClosureDate)}
          helperText={errors.ideaClosureDate}
          inputProps={{
            min: values.academicStartDate || minDateValue,
            max: values.academicEndDate || values.finalClosureDate || maxDateValue,
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 48,
              color: '#374151',
              fontSize: 13,
              backgroundColor: '#f9fafb',
            },
          }}
        />

        <Typography sx={{ mb: 1, fontSize: 17, fontWeight: 700, color: '#374151' }}>
          Final Closure Date
        </Typography>
        <TextField
          fullWidth
          type="date"
          size="small"
          value={values.finalClosureDate || ''}
          onChange={(event) => onChange('finalClosureDate', event.target.value)}
          error={Boolean(errors.finalClosureDate)}
          helperText={errors.finalClosureDate}
          inputProps={{
            min: values.academicStartDate || values.ideaClosureDate || minDateValue,
            max: values.academicEndDate || maxDateValue,
          }}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 48,
              color: '#374151',
              fontSize: 13,
              backgroundColor: '#f9fafb',
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3, justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type="button"
          onClick={onClose}
          variant="contained"
          sx={{
            minWidth: 120,
            height: 44,
            borderRadius: 0.7,
            bgcolor: '#bdbdbd',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#a3a3a3', boxShadow: 'none' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={submitting}
          sx={{
            minWidth: 120,
            height: 44,
            borderRadius: 0.7,
            bgcolor: '#0d6efd',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0b5ed7', boxShadow: 'none' },
          }}
        >
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AcademicYearDialog;
