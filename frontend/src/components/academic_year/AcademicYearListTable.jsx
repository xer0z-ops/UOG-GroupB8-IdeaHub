import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Pagination,
  PaginationItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ChevronLeftRounded,
  ChevronRightRounded,
  ErrorOutlineRounded,
  DeleteRounded,
  EditRounded,
} from '@mui/icons-material';

const actionButtonStyles = {
  edit: { bgcolor: '#e7f0ff', color: '#1d4ed8' },
  delete: { bgcolor: '#ffe4e4', color: '#c62828' },
};

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const toInputDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getDateYear = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-\d{2}-\d{2}/);
  if (match) return Number(match[1]);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
};

const mapYear = (item) => ({
  id: item.id,
  label: item.label || item.academicYear || item.name || '-',
  academicStartDate: item.academicStartDate || item.academic_start_date || null,
  academicEndDate: item.academicEndDate || item.academic_end_date || null,
  ideaClosureDate: item.ideaClosureDate || item.ideaSubmissionClosureDate || item.idea_submission_closure_date || null,
  finalClosureDate: item.finalClosureDate || item.finalClosure || item.final_closure_date || null,
  isCurrent: Boolean(item.isCurrent || item.current || item.status === 'current'),
});

const getAcademicYearRank = (label) => {
  const raw = String(label || '').trim();
  const range = raw.match(/(\d{4})\D+(\d{4})/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    return { end, start };
  }
  const single = raw.match(/(\d{4})/);
  if (single) {
    const year = Number(single[1]);
    return { end: year, start: year - 1 };
  }
  return { end: -1, start: -1 };
};

const getAcademicYearEnd = (label) => {
  const raw = String(label || '').trim();
  const range = raw.match(/(\d{4})\D+(\d{4})/);
  if (range) return Number(range[2]);
  const single = raw.match(/(\d{4})/);
  if (single) return Number(single[1]);
  return null;
};

function AcademicYearListTable({
  users = [],
  years,
  onEdit,
  onEditCurrent,
  onDelete,
  onAddDepartment,
  onAddAcademicYear,
  onUpdateCurrent,
  pagination,
  onPageChange,
}) {
  const [page, setPage] = useState(1);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const currentYear = new Date().getFullYear();

  const yearItems = useMemo(() => {
    const mapped = (Array.isArray(years) ? years : users).map(mapYear);
    return [...mapped].sort((a, b) => {
      const aRank = getAcademicYearRank(a.label);
      const bRank = getAcademicYearRank(b.label);
      if (bRank.end !== aRank.end) return bRank.end - aRank.end;
      return bRank.start - aRank.start;
    });
  }, [users, years]);
  const currentYearItem = useMemo(() => yearItems.find((item) => item.isCurrent) || yearItems[0] || null, [yearItems]);
  const historyYears = useMemo(
    () => yearItems.filter((item) => !currentYearItem || item.id !== currentYearItem.id),
    [yearItems, currentYearItem],
  );
  const academicStartDate = toInputDate(currentYearItem?.academicStartDate);
  const academicEndDate = toInputDate(currentYearItem?.academicEndDate);
  const ideaClosureDate = toInputDate(currentYearItem?.ideaClosureDate);
  const finalClosureDate = toInputDate(currentYearItem?.finalClosureDate);

  const rowsPerPage = useMemo(() => {
    if (isXl) return 5;
    if (isXs) return 3;
    if (isSm) return 4;
    return 4;
  }, [isXl, isXs, isSm]);

  useEffect(() => {
    setPage(1);
  }, [rowsPerPage]);
  const useServerPagination = Boolean(pagination);
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(historyYears.length / rowsPerPage));
  const currentPage = pagination?.page ?? page;
  const pageYears = useServerPagination
    ? historyYears
    : historyYears.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          type="button"
          variant="contained"
          onClick={onAddAcademicYear || onAddDepartment}
          sx={{
            bgcolor: '#1d5feb',
            borderRadius: 0.7,
            px: 3.5,
            fontWeight: 600,
            textTransform: 'none',
            width: 'auto',
            alignSelf: 'center',
            whiteSpace: 'nowrap',
            marginLeft: 'auto',
            '&:hover': { bgcolor: '#174dcc' },
          }}
        >
          + Add Academic Year
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid #e5e9f2',
          boxShadow: '0 5px 25px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Stack sx={{ px: { xs: 2, md: 2.5 }, py: 1.5 }} direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 20, md: 26 }, lineHeight: 1.2, color: '#364152' }}>
            {currentYearItem?.label || '-'}
          </Typography>
          <Box
            sx={{
              minWidth: 100,
              px: 2,
              py: 0.75,
              textAlign: 'center',
              bgcolor: '#dbf4e8',
              color: '#10b981',
              borderRadius: 2,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Current
          </Box>
        </Stack>

        <Box sx={{ borderTop: '1px solid #edf1f7' }}>
          <Stack 
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between">
            <Box>
              <Stack
                direction={{ xs: 'row', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ px: { xs: 2, md: 2.5 }, py: 1, }}
              >
                <Typography sx={{}}>Academic Start Date</Typography>
                <Typography sx={{}}>{academicStartDate}</Typography>
              </Stack>

              <Stack
                direction={{ xs: 'row', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ px: { xs: 2, md: 2.5 } }}
              >
                <Typography sx={{}}>Academic End Date</Typography>
                <Typography sx={{}}>{academicEndDate}</Typography>
              </Stack>
            </Box>
            <Box>
              <Stack
                direction={{ xs: 'row', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ px: { xs: 2, md: 2.5 }, py: 1 }}
              >
                <Typography sx={{}}>Idea Submission Closure Date</Typography>
                <Typography sx={{}}>{ideaClosureDate}</Typography>
              </Stack>

              <Stack
                direction={{ xs: 'row', md: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ px: { xs: 2, md: 2.5 }, pb: 1 }}
              >
                <Typography sx={{}}>Final Closure Date</Typography>
                <Typography sx={{}}>{finalClosureDate}</Typography>

              </Stack>
            </Box>
          </Stack>



        </Box>



        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          sx={{ borderTop: '1px solid #edf1f7', px: { xs: 2, md: 2.5 }, py: 1.5, rowGap: 1 }}
        >
          <Alert
            icon={<ErrorOutlineRounded />}
            severity="error"
            sx={{
              p: 0,
              bgcolor: 'transparent',
              color: '#e11d48',
              '& .MuiAlert-icon': { color: '#e11d48', p: 0, mr: 1 },
              '& .MuiAlert-message': { p: 0, fontSize: 14 },
            }}
          >
            No new ideas can be submitted after this date.
          </Alert>
          <Button
            variant="contained"
            onClick={() => onEditCurrent?.(currentYearItem)}
          sx={{
            alignSelf: { xs: 'flex-start', md: 'center' },
            minWidth: 130,
            bgcolor: '#1d5feb',
            borderRadius: 0.7,
            px: 2.25,
            py: 0.8,
            fontWeight: 600,
            fontSize: 14,
              textTransform: 'none',
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Edit
          </Button>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 1,
          border: '1px solid #e5e9f2',
          boxShadow: '0 5px 25px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          overflowX: { xs: 'auto', md: 'hidden' },
          width: '100%',
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {['Academic Year', 'Academic Start Date', 'Academic End Date', 'Idea Submission Closure Date', 'Final Closure Date', 'Actions'].map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: '#364152',
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
            {pageYears.map((year, index) => {
              const endYear = getAcademicYearEnd(year.label);
              const isDeleteDisabled = endYear != null && endYear <= currentYear;
              const isEditDisabled = endYear != null && endYear < currentYear;

              return (
                <TableRow
                  key={year.id}
                  hover
                  sx={{
                    '& td': { borderBottom: '1px solid #f2f4f9' },
                    // bgcolor: index % 2 === 0 ? '#f7f9fc' : '#ffffff',
                  }}
                >
                  <TableCell sx={{ color: '#445066', textAlign: 'center', fontSize: 16 }}>{year.label}</TableCell>
                  <TableCell sx={{ color: '#445066', textAlign: 'center', fontSize: 16 }}>{formatDate(year.academicStartDate)}</TableCell>
                  <TableCell sx={{ color: '#445066', textAlign: 'center', fontSize: 16 }}>{formatDate(year.academicEndDate)}</TableCell>
                  <TableCell sx={{ color: '#445066', textAlign: 'center', fontSize: 16 }}>{formatDate(year.ideaClosureDate)}</TableCell>
                  <TableCell sx={{ color: '#445066', textAlign: 'center', fontSize: 16 }}>{formatDate(year.finalClosureDate)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Update academic year" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onEdit?.(year)}
                          disabled={isEditDisabled}
                          sx={{
                            ...actionButtonStyles.edit,
                            '&:hover': { backgroundColor: '#d9e7ff' },
                            ...(isEditDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : null),
                          }}
                        >
                          <EditRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete academic year" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDelete?.(year)}
                          disabled={isDeleteDisabled}
                          sx={{
                            ...actionButtonStyles.delete,
                            '&:hover': { backgroundColor: '#fecaca' },
                            ...(isDeleteDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : null),
                          }}
                        >
                          <DeleteRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {!pageYears.length && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#6e7b94' }}>
                  No academic years found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ px: 2.5, py: 2, borderTop: '1px solid #edf1f7' }}
        >
          <Typography variant="body2" sx={{ color: '#364152', fontWeight: 500 }}>
            Showing {pageYears.length} of {pagination?.totalItems ?? historyYears.length} years
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, value) => (onPageChange ? onPageChange(value) : setPage(value))}
            shape="rounded"
            siblingCount={0}
            boundaryCount={1}
            renderItem={(item) => <PaginationItem {...item} />}
            slots={{
              previous: ChevronLeftRounded,
              next: ChevronRightRounded,
            }}
            sx={{
              '& .MuiPagination-ul': { gap: 0.5 },
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
                fontWeight: 600,
                minWidth: 36,
                height: 36,
                bgcolor: '#f1f3f7',
                color: '#364152',
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

export default AcademicYearListTable;
