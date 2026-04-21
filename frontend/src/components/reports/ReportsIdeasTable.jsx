import { useMemo, useState } from 'react';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DescriptionOutlined } from '@mui/icons-material';

const actionButtonStyles = {
  detail: { bgcolor: '#e7f0ff', color: '#1d4ed8' },
};

function ReportsIdeasTable({ title, rows = [], onDetail }) {
  const [page, setPage] = useState(1);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const rowsPerPage = useMemo(() => {
    if (isXl) return 10;
    if (isXs) return 3;
    if (isSm) return 4;
    return 6;
  }, [isXl, isXs, isSm]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pageItems = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#364152', mb: 2 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No data to show
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['Title', 'User Name', 'Department', 'Category', 'Tmb Up/Down/Rep', 'Actions'].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: 700,
                        fontSize: 12,
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
                {pageItems.map((item) => (
                  <TableRow key={item.id} hover sx={{ '& td': { borderBottom: '1px solid #f2f4f9' } }}>
                    <TableCell sx={{ color: '#4a5667' }}>{item.title}</TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{item.userName}</TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{item.department}</TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{item.category}</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                      <Typography component="span" sx={{ color: '#10b981', fontWeight: 600 }}>
                        {item.thumbUpCount}
                      </Typography>
                      <Typography component="span" sx={{ color: '#2563eb', fontWeight: 600 }}>
                        {' / '}
                        {item.thumbDownCount}
                      </Typography>
                      <Typography component="span" sx={{ color: '#ef4444', fontWeight: 600 }}>
                        {' / '}
                        {item.reportCount}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="View details" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDetail?.(item)}
                          sx={{ ...actionButtonStyles.detail, '&:hover': { backgroundColor: '#d9e7ff' } }}
                        >
                          <DescriptionOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {pageItems.length} of {rows.length} ideas
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
        </>
      )}
    </Paper>
  );
}

export default ReportsIdeasTable;
