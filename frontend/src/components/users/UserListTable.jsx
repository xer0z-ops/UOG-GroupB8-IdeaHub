import { useMemo, useState } from 'react';
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  EditRounded,
  DeleteRounded,
  LockResetRounded,
} from '@mui/icons-material';

const statusStyles = {
  Active: { bgcolor: '#e7f8ee', color: '#1f7b39', shadow: '0 2px 6px rgba(31, 123, 57, 0.15)' },
  Disabled: { bgcolor: '#fde9ea', color: '#c93529', shadow: '0 2px 6px rgba(201, 53, 41, 0.15)' },
};

const actionButtonStyles = {
  edit: { bgcolor: '#e7f0ff', color: '#1d4ed8' },
  warn: { bgcolor: '#fff4dc', color: '#d97706' },
  delete: { bgcolor: '#ffe4e4', color: '#c62828' },
};

function UserList({
  users = [],
  onEdit,
  onDeactivate,
  onDelete,
  roleValue,
  pagination,
  onPageChange,
}) {
  const [page, setPage] = useState(1);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const rowsPerPage = useMemo(() => {
    if (isXl) return 8;
    if (isXs) return 3;
    if (isSm) return 4;
    return 6;
  }, [isXl, isXs, isSm]);
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(users.length / rowsPerPage));
  const currentPage = pagination?.page ?? page;
  const pageUsers = pagination
    ? users
    : users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const AdminHeader = ['Name', 'Department', 'Role', 'Status', 'Actions'];
  const ManagerHeader = ['Name', 'Role', 'Status', 'Idea', 'Comments', 'Actions'];
  const CoordinatorHeader = ['Name', 'Role', 'Status', 'Idea', 'Comments'];
  const isAdmin = roleValue === 'admin';
  const isManager = roleValue === 'qa_manager';
  const isCoordinator = roleValue === 'qa_coordinator';

  const TableHeader = isAdmin ? AdminHeader : (isCoordinator ? CoordinatorHeader : ManagerHeader);

  return (
    <Stack spacing={1}>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid #e5e9f2',
          boxShadow: '0 5px 25px rgba(15, 23, 42, 0.05)',
          overflowX: 'auto',
          width: '100%',
        }}
      >
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              {TableHeader.map((header) => (
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
            {pageUsers.map((user) => (
              <TableRow key={user.id} hover sx={{ '& td': { borderBottom: '1px solid #f2f4f9' } }}>
                <TableCell sx={{ minWidth: 220 }}>
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
                {/* <TableCell sx={{ color: '#4a5667' }}>{user.email}</TableCell> */}
                {isAdmin ? <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.department}</TableCell>
                  : null}
                {isAdmin ?
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Chip
                      label={user.role}
                      sx={{
                        bgcolor: '#e6efff',
                        color: '#1f3a8a',
                        fontWeight: 600,
                        borderRadius: 999,
                        px: 1.5,
                        height: 30,
                      }}
                    />
                  </TableCell>
                  :
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
                }
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    label={user.statusId === 2 ? 'Disabled' : 'Active'}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 999,
                      px: 1.5,
                      height: 30,
                      ...(statusStyles[user.statusId === 2 ? 'Disabled' : 'Active'] || statusStyles.Active),
                      // boxShadow: statusStyles[user.statusId === 2 ? 'Disabled' : 'Active']?.shadow || statusStyles.Active.shadow,
                    }}
                  />
                </TableCell>
                {!isAdmin ?
                  <>
                    <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.ideaCount ?? 0}</TableCell>
                    <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>{user.commentCount ?? 0}</TableCell>
                  </>
                  : null
                }
                {isAdmin ?
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Update user" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onEdit?.(user)}
                          sx={{ ...actionButtonStyles.edit, '&:hover': { backgroundColor: '#d9e7ff' } }}
                        >
                          <EditRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset password" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDeactivate?.(user)}
                          sx={{ ...actionButtonStyles.warn, '&:hover': { backgroundColor: '#ffe9a6' } }}
                        >
                          <LockResetRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete user" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDelete?.(user)}
                          sx={{ ...actionButtonStyles.delete, '&:hover': { backgroundColor: '#fecaca' } }}
                        >
                          <DeleteRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  : (!isCoordinator ?
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => onEdit?.(user)}
                        sx={{ ...actionButtonStyles.edit, '&:hover': { backgroundColor: '#d9e7ff' } }}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </TableCell>
                    :
                    null
                  )
                }


              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ px: 2, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {pageUsers.length} of {pagination?.totalItems ?? users.length} users
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

export default UserList;
