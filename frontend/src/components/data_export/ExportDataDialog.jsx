import { useMemo } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

function ExportDataDialog({
  open,
  onClose,
  departments = [],
  categories = [],
  selectedDepartmentIds = [],
  selectedCategoryIds = [],
  passwordProtected = false,
  showPasswordOption = true,
  submitLabel = 'Export',
  onToggleDepartment,
  onToggleCategory,
  onToggleAllDepartments,
  onToggleAllCategories,
  onTogglePassword,
  onSubmit,
}) {
  const allDepartmentsSelected = useMemo(
    () => departments.length > 0 && selectedDepartmentIds.length === departments.length,
    [departments, selectedDepartmentIds],
  );

  const allCategoriesSelected = useMemo(
    () => categories.length > 0 && selectedCategoryIds.length === categories.length,
    [categories, selectedCategoryIds],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          overflow: 'hidden',
        },
      }}
      BackdropProps={{
        sx: { bgcolor: 'rgba(13, 17, 23, 0.4)' },
      }}
    >
      <DialogTitle sx={{ px: 3.5, pt: 2.5, pb: 2, position: 'relative' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#364152' }}>
          Export Data
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{
            position: 'absolute',
            top: 14,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: '#f3f4f6',
            color: '#364152',
            '&:hover': { bgcolor: '#e9ecef' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderTop: '1px solid #ebedf0' }} />

      <DialogContent sx={{ px: 3.5, pt: 2.5, pb: 2.5 }}>
        <Typography sx={{ mb: 2.5, fontSize: 16, fontWeight: 700, color: '#374151' }}>
          Select departments and categories to export data
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              borderRadius: 2,
              borderColor: '#d6dde6',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
              <Typography sx={{ fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                Department
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ px: 2.5, py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allDepartmentsSelected}
                    onChange={onToggleAllDepartments}
                  />
                }
                label="All Departments"
              />
              {departments.map((department) => (
                <FormControlLabel
                  key={department.id}
                  control={
                    <Checkbox
                      checked={selectedDepartmentIds.includes(department.id)}
                      onChange={() => onToggleDepartment(department.id)}
                    />
                  }
                  label={department.name}
                />
              ))}
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              borderRadius: 2,
              borderColor: '#d6dde6',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
              <Typography sx={{ fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                Category
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ px: 2.5, py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allCategoriesSelected}
                    onChange={onToggleAllCategories}
                  />
                }
                label="All Categories"
              />
              {categories.map((category) => (
                <FormControlLabel
                  key={category.id}
                  control={
                    <Checkbox
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => onToggleCategory(category.id)}
                    />
                  }
                  label={category.name}
                />
              ))}
            </Stack>
          </Paper>
        </Stack>

        {showPasswordOption && (
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={passwordProtected} onChange={onTogglePassword} />}
              label="Password protection"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3.5, pb: 2.75, justifyContent: 'flex-end', gap: 1.5 }}>
        <Button
          type="button"
          onClick={onClose}
          variant="contained"
          sx={{
            minWidth: 120,
            height: 44,
            borderRadius: 0.7,
            bgcolor: '#a9aaad',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#96979b', boxShadow: 'none' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          sx={{
            minWidth: 140,
            height: 44,
            borderRadius: 0.7,
            bgcolor: '#1687f5',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 500,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0e76dc', boxShadow: 'none' },
          }}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportDataDialog;
