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
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  VisibilityOutlined,
  VisibilityOffOutlined,
  ReportProblemOutlined,
} from '@mui/icons-material';

const actionButtonStyles = {
  view: { bgcolor: '#e7f8ee', color: '#1f7b39' },
  hide: { bgcolor: '#fde9ea', color: '#c93529' },
};

const resolveDepartmentName = (idea) =>
  idea.departmentName || idea.department?.name || idea.department || 'Unknown';

const resolveCategoryName = (idea) =>
  idea.categoryName || idea.category?.name || idea.categories?.[0]?.name || 'Unknown';

const resolveAuthorName = (idea) =>
  idea.authorName || idea.author?.name || idea.author?.full_name || idea.user?.name || 'Unknown';

function AllIdeasListTable({
  ideas = [],
  onView,
  onDetail,
  onReportDetail,
  activeTab: controlledActiveTab,
  pagination,
  onPageChange,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const rowsPerPage = useMemo(() => {
    if (isXl) return 8;
    if (isXs) return 4;
    if (isSm) return 5;
    return 7;
  }, [isXl, isXs, isSm]);

  const [page, setPage] = useState(1);

  const isApiPagination = Boolean(pagination);
  const currentPage = pagination?.page ?? page;
  const pageSize = pagination?.pageSize ?? rowsPerPage;
  const totalItems = pagination?.totalItems ?? ideas.length;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(ideas.length / rowsPerPage));
  const pageIdeas = isApiPagination
    ? ideas
    : ideas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const startIndex = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = totalItems ? Math.min(totalItems, currentPage * pageSize) : 0;

  return (
    <Stack spacing={2.5}>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid #e5e9f2',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          overflowX: 'auto',
          width: '100%',
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {['Title', 'User Name', 'Department', 'Category', 'Tmb Up/Down/Rep', 'Actions'].map((header) => (
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
            {pageIdeas.map((idea) => (
              <TableRow
                key={idea.id}
                hover
                sx={{
                  '& td': { borderBottom: '1px solid #f2f4f9' },
                  '&:nth-of-type(even)': { backgroundColor: '#fafbff' },
                  cursor: 'pointer',
                }}
                onClick={() => onDetail?.(idea)}
              >
                <TableCell sx={{ minWidth: 240, color: '#374151' }}>{idea.title || idea.name}</TableCell>
                <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{resolveAuthorName(idea)}</TableCell>
                <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{resolveDepartmentName(idea)}</TableCell>
                <TableCell sx={{ textAlign: 'center', color: '#4a5667' }}>{resolveCategoryName(idea)}</TableCell>
                <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                  <Typography component="span" sx={{ color: '#10b981', fontWeight: 600 }}>
                    {idea.thumbUpCount ?? 0}
                  </Typography>
                  <Typography component="span" sx={{ color: '#2563eb', fontWeight: 600 }}>
                    {' / '}
                    {idea.thumbDownCount ?? 0}
                  </Typography>
                  <Typography component="span" sx={{ color: '#ef4444', fontWeight: 600 }}>
                    {' / '}
                    {idea.reportCount ?? 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    {controlledActiveTab === 'reported' && (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReportDetail?.(idea);
                        }}
                        sx={{ bgcolor: '#fde9ea', color: '#c93529', '&:hover': { backgroundColor: '#fecaca' } }}
                      >
                        <ReportProblemOutlined fontSize="small" />
                      </IconButton>
                    )}
                    {(idea.statusId ?? idea.status?.id ?? idea.status_id) === 7 ? (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onView?.(idea);
                        }}
                        sx={{ ...actionButtonStyles.hide, '&:hover': { backgroundColor: '#fecaca' } }}
                      >
                        <VisibilityOffOutlined fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onView?.(idea);
                        }}
                        sx={{ ...actionButtonStyles.view, '&:hover': { backgroundColor: '#d1fae5' } }}
                      >
                        <VisibilityOutlined fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ px: 2, py: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {startIndex} to {endIndex} of {totalItems} ideas
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

export default AllIdeasListTable;
