import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

function UserStatusDialog({
  open,
  onClose,
  onSubmit,
  user,
  statusOptions = [],
  value = '',
  onChange = () => {},
  submitting = false,
  error = '',
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 620,
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
          User Status
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
        {/* <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Avatar src="./src/assets/profile.png" sx={{ width: 44, height: 44 }} />
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
              {user?.name || 'User'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#9aa3b2' }}>
              {user?.email || 'user@university.edu'}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2.2} sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ mb: 1.1, fontSize: 15, fontWeight: 700, color: '#374151' }}>
              Full Name
            </Typography>
            <TextField
              fullWidth
              value={user?.fullName || user?.name || ''}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0.7,
                  height: 50,
                  bgcolor: '#ffffff',
                  '& fieldset': { borderColor: '#b7bec8' },
                },
                '& input': {
                  fontSize: 15,
                  color: '#2f3947',
                },
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ mb: 1.1, fontSize: 15, fontWeight: 700, color: '#374151' }}>
              Email
            </Typography>
            <TextField
              fullWidth
              value={user?.email || ''}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0.7,
                  height: 50,
                  bgcolor: '#ffffff',
                  '& fieldset': { borderColor: '#b7bec8' },
                },
                '& input': {
                  fontSize: 15,
                  color: '#2f3947',
                },
              }}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 1.1, fontSize: 15, fontWeight: 700, color: '#374151' }}>
                Department
              </Typography>
              <TextField
                fullWidth
                value={user?.departmentName || user?.department || ''}
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    height: 50,
                    bgcolor: '#ffffff',
                    '& fieldset': { borderColor: '#b7bec8' },
                  },
                  '& input': {
                    fontSize: 15,
                    color: '#2f3947',
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 1.1, fontSize: 15, fontWeight: 700, color: '#374151' }}>
                Role
              </Typography>
              <TextField
                fullWidth
                value={user?.roleLabel || user?.role || ''}
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    height: 50,
                    bgcolor: '#ffffff',
                    '& fieldset': { borderColor: '#b7bec8' },
                  },
                  '& input': {
                    fontSize: 15,
                    color: '#2f3947',
                  },
                }}
              />
            </Box>
          </Stack>
        </Stack> */}

        <Typography sx={{ mb: 1.2, fontSize: 16, fontWeight: 700, color: '#374151' }}>
          Status
        </Typography>
        <TextField
          select
          fullWidth
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="User Status"
          error={Boolean(error)}
          helperText={error}
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
            },
          }}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>
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
          {submitting ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserStatusDialog;
