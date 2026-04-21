import { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  MenuItem,
  Stack,
  Button,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 0.7,
    bgcolor: '#ffffff',
    height: 48,
    '& fieldset': { borderColor: '#d1d5db' },
  },
  '& .MuiOutlinedInput-input': {
    fontSize: 15,
    color: '#374151',
  },
  '& .MuiInputLabel-root': {
    fontSize: 16,
    color: '#374151',
    fontWeight: 600,
  },
};

function UserDialog({
  open,
  onClose,
  onSubmit,
  values = {},
  errors = {},
  onChange = () => {},
  submitting = false,
  departmentOptions = [],
  roleOptions = [],
  statusOptions = [],
  isEditMode = false,
}) {
  const controlledValues = useMemo(
    () => ({
      fullName: values.fullName ?? '',
      email: values.email ?? '',
      departmentId: values.departmentId ?? '',
      role: values.role ?? '',
      status: values.status ?? '',
    }),
    [values]
  );

  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
        },
      }}
    >
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700, pr: 6, px: 3.5, pt: 2.5 }}>
        {isEditMode ? 'Update User' : 'Add New User'}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: '#f3f4f6',
            color: '#6b7280',
            '&:hover': { bgcolor: '#e5e7eb' },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3.5, pt: 1.5, pb: 1.5 }}>
        <Stack spacing={2.5}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            Full Name
          </Typography>
          <TextField
            placeholder="Enter Full Name"
            value={controlledValues.fullName}
            onChange={handleChange('fullName')}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName}
            fullWidth
            sx={inputStyles}
          />

          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            Email
          </Typography>
          <TextField
            placeholder="Enter Email"
            value={controlledValues.email}
            onChange={handleChange('email')}
            error={Boolean(errors.email)}
            helperText={errors.email}
            type="email"
            fullWidth
            sx={inputStyles}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
                Department
              </Typography>
              <TextField
                select
                value={controlledValues.departmentId}
                onChange={handleChange('departmentId')}
                fullWidth
                sx={inputStyles}
                SelectProps={{ displayEmpty: true }}
                error={Boolean(errors.departmentId)}
                helperText={errors.departmentId || (!departmentOptions.length ? 'No departments available' : undefined)}
                disabled={!departmentOptions.length}
              >
                {departmentOptions.length ? (
                  departmentOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    No departments available
                  </MenuItem>
                )}
              </TextField>
            </Stack>

            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
                Role
              </Typography>
              <TextField
                select
                value={controlledValues.role}
                onChange={handleChange('role')}
                fullWidth
                sx={inputStyles}
                SelectProps={{ displayEmpty: true }}
                error={Boolean(errors.role)}
                helperText={errors.role || (!roleOptions.length ? 'No roles available' : undefined)}
                disabled={!roleOptions.length}
              >
                {roleOptions.length ? (
                  roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label ?? option.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    No roles available
                  </MenuItem>
                )}
              </TextField>
            </Stack>
          </Stack>

          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            Status
          </Typography>
          <TextField
            select
            value={controlledValues.status}
            onChange={handleChange('status')}
            fullWidth
            sx={inputStyles}
            SelectProps={{ displayEmpty: true }}
            error={Boolean(errors.status)}
            helperText={errors.status || (!statusOptions.length ? 'No statuses available' : undefined)}
            disabled={!statusOptions.length}
          >
            {statusOptions.length ? (
              statusOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled value="">
                No statuses available
              </MenuItem>
            )}
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3.5, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            minWidth: 120,
            height: 44,
            borderRadius: 0.7,
            borderColor: '#d1d5db',
            color: '#6b7280',
            bgcolor: '#e5e7eb',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: '#cbd5e1', bgcolor: '#d1d5db' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={submitting}
          sx={{
            minWidth: 130,
            height: 44,
            borderRadius: 0.7,
            bgcolor: '#0d6efd',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#0b5ed7' },
          }}
        >
          {
            submitting
              ? (isEditMode ? 'Updating...' : 'Adding...')
              : (isEditMode ? 'Update User' : 'Add User')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserDialog;
