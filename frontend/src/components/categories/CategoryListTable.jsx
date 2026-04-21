import { useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import { EditRounded, DeleteRounded } from '@mui/icons-material';

const actionButtonStyles = {
  edit: { bgcolor: '#e7f0ff', color: '#1d4ed8' },
  delete: { bgcolor: '#ffe4e4', color: '#c62828' },
};

function CategoryListTable({
  categories = [],
  onEdit,
  onDelete,
}) {
  const [page, setPage] = useState(1);

  const rowsPerPage = 7;
  const totalPages = Math.max(1, Math.ceil(categories.length / rowsPerPage));
  const pageItems = categories.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Stack spacing={3}>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid #e5e9f2',
          boxShadow: '0 5px 25px rgba(15, 23, 42, 0.05)',
          // width: '50%'
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {['Name', 'Ideas', 'Actions'].map((header) => (
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
            {pageItems.map((category) => (
              <TableRow key={category.id} hover sx={{ '& td': { borderBottom: '1px solid #f2f4f9' } }}>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="left">
                    <Box>
                      <Typography fontWeight={600}>{category.name}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: '#4a5667', textAlign: 'center' }}>
                  {category.ideaCount ?? 0}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Edit Category" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onEdit?.(category)}
                        sx={{ ...actionButtonStyles.edit, '&:hover': { backgroundColor: '#d9e7ff' } }}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Category" arrow>
                      <IconButton
                        size="small"
                        onClick={() => onDelete?.(category)}
                        sx={{ ...actionButtonStyles.delete, '&:hover': { backgroundColor: '#fecaca' } }}
                      >
                        <DeleteRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ px: 2, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {pageItems.length} of {categories.length} categories
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
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
      </TableContainer>
    </Stack>
  );
}

export default CategoryListTable;
