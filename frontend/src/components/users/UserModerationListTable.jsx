import { useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { EditRounded, SearchRounded } from '@mui/icons-material';

const statusStyles = {
  Active: { bgcolor: '#e7f8ee', color: '#1f7b39' },
  Disabled: { bgcolor: '#fde9ea', color: '#c93529' },
};

const actionButtonStyles = {
  edit: { bgcolor: '#e7f0ff', color: '#1d4ed8' },
};

function UserModerationListTable({
  users = [],
  onEdit,
  showActions = true,
  pagination,
  onPageChange,
}) {
  const [page, setPage] = useState(1);
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(users.length / rowsPerPage));
  const currentPage = pagination?.page ?? page;
  const pageItems = pagination ? users : users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <Stack spacing={3}>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid #e5e9f2',
          boxShadow: '0 5px 25px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {[
                'Name',
                'Role',
                'Status',
                'Ideas',
                'Comment',
                ...(showActions ? ['Actions'] : []),
              ].map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#6e7b94',
                    textAlign: 'center',
                    borderBottom: '1px solid #edf1f7',
                    backgroundColor: '#f8f9fd',
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {pageItems.map((user) => (
              <TableRow key={user.id} hover sx={{ '& td': { borderBottom: '1px solid #f2f4f9' } }}>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 40, height: 40, bgcolor: "#cbd5e1", fontSize: "0.875rem", color: "#fff" }}>
                      {user.name?.substring(0, 2)?.toUpperCase() || "U"}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={600}>{user.name}</Typography>
                      <Typography variant="body2" color="#9aa3b2">
                        {user.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                {/* <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.email}</TableCell> */}
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    label={user.roleLabel || user.roleValue || 'User'}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 999,
                      px: 1.5,
                      height: 28,
                      bgcolor: '#e7f0ff',
                      color: '#1d4ed8',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    label={user.statusId === 2 ? 'Disabled' : 'Active'}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 999,
                      px: 1.5,
                      height: 30,
                      ...(statusStyles[user.statusId === 2 ? 'Disabled' : 'Active'] || statusStyles.Active),
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.ideaCount ?? 0}</TableCell>
                <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.commentCount ?? 0}</TableCell>
                {showActions && (
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => onEdit?.(user)}
                      sx={{ ...actionButtonStyles.edit, '&:hover': { backgroundColor: '#d9e7ff' } }}
                    >
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ px: 2, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {pageItems.length} of {pagination?.totalItems ?? users.length} users
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, value) => (onPageChange ? onPageChange(value) : setPage(value))}
              shape="rounded"
              siblingCount={0}
              boundaryCount={1}
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2,
                  fontWeight: 600,
                },
                '& .Mui-selected': {
                  bgcolor: '#1d5feb',
                  color: '#fff',
                  '&:hover': { bgcolor: '#174dcc' },
                },
              }}
            />
            
          </Stack>
        </Stack>
      </TableContainer>
    </Stack>
  );
}

export default UserModerationListTable;
