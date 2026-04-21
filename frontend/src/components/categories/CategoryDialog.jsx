import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, Box, Button, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

function CategoryDialog({
  open,
  onClose,
  onSubmit,
  values = {},
  errors = {},
  onChange = () => {},
  submitting = false,
  isEditMode = false,
}) {
  const categoryName = values.categoryName ?? values.name ?? '';
  const categoryNameError = errors.categoryName ?? errors.name ?? '';

  const handleChange = (event) => {
    const nextValue = event.target.value;
    onChange('categoryName', nextValue);
    onChange('name', nextValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 600,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#ffffff',
        },
      }}
      BackdropProps={{
        sx: { bgcolor: 'rgba(13, 17, 23, 0.4)' },
      }}
    >
      <DialogTitle sx={{ px: 3.5, pt: 2.5, pb: 2, position: 'relative' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#364152' }}>
          {isEditMode ? 'Update Category' : 'Add New Category'}
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

      <DialogContent sx={{ px: 3.5, pt: 2.5, pb: 2.25 }}>
        <Typography sx={{ mb: 1.2, fontSize: 16, fontWeight: 700, color: '#374151' }}>
          Category Name
        </Typography>
        <TextField
          fullWidth
          value={categoryName}
          onChange={handleChange}
          placeholder="Enter Category Name"
          error={Boolean(categoryNameError)}
          helperText={categoryNameError}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0.7,
              height: 56,
              bgcolor: '#ffffff',
              '& fieldset': { borderColor: '#b7bec8' },
            },
            '& input': {
              fontSize: 16,
              color: '#2f3947',
              '::placeholder': { color: '#a3a8b1', opacity: 1 },
            },
            '& .MuiFormHelperText-root': {
              fontSize: 13,
            },
          }}
        />
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
          disabled={submitting}
          sx={{
            minWidth: 170,
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
          {submitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Category' : 'Add Category')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CategoryDialog;
