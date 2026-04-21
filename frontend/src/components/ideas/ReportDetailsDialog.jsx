import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { fetchIdeaReports } from '../../services/ideaService.js';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const resolveCategoryLabel = (idea) =>
  idea?.categories?.[0]?.name || idea?.category?.name || idea?.categoryName || 'Category';

const resolveStatusLabel = (idea) => {
  const raw = idea?.statusName || idea?.status?.name || idea?.status || '';
  return typeof raw === 'string' ? raw : raw?.name || '';
};

const isActiveStatus = (value) => String(value || '').toLowerCase() === 'active';

function ReportDetailsDialog({ open, onClose, idea, reports = [], ideaId }) {
  const [apiReports, setApiReports] = useState([]);
  const [apiIdea, setApiIdea] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const targetIdeaId = ideaId ?? idea?.id;

  useEffect(() => {
    if (!open || !targetIdeaId) {
      setApiReports([]);
      setApiIdea(null);
      setError('');
      return;
    }

    let isMounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await fetchIdeaReports(targetIdeaId);
        if (!isMounted) return;
        setApiIdea(result?.idea ?? null);
        setApiReports(result?.reports ?? []);
      } catch (err) {
        if (isMounted) setError(err?.message || 'Failed to load report details');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [open, targetIdeaId]);

  const reportCount = apiReports.length || reports.length;
  const resolvedReports = useMemo(
    () =>
      reportCount
        ? (apiReports.length ? apiReports : reports)
        : Array.from({ length: idea?.reportCount ?? 0 }).map((_, index) => ({
            id: `placeholder-${index}`,
            reportedBy: { full_name: 'Anonymous User' },
            createdAt: idea?.createdAt,
            reason: 'Report details will appear here once API is available.',
          })),
    [reports, reportCount, apiReports, idea?.reportCount, idea?.createdAt],
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
          maxHeight: '92vh',
        },
      }}
    >
      <Box sx={{ position: 'relative', px: 3, pt: 3, pb: 2, borderBottom: '1px solid #e5e7eb' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            width: 36,
            height: 36,
            bgcolor: '#f3f4f6',
            '&:hover': { bgcolor: '#e5e7eb' },
          }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Report Details - scroll
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1.5}>
          <Avatar sx={{ width: 46, height: 46, bgcolor: '#cbd5e1' }}>
            {(idea?.authorName || 'U')[0]}
          </Avatar>
          <Typography variant="body1" fontWeight={600} color="#1f2937">
            {idea?.authorName || 'Unknown User'}
          </Typography>
          <Typography variant="body2" color="#6b7280">
            {formatDate(idea?.createdAt)}
          </Typography>
          <Chip
            label={resolveStatusLabel(idea) || 'Disabled'}
            sx={{
              bgcolor: isActiveStatus(resolveStatusLabel(idea)) ? '#e7f8ee' : '#fde9ea',
              color: isActiveStatus(resolveStatusLabel(idea)) ? '#1f7b39' : '#c93529',
              fontWeight: 600,
              borderRadius: 999,
            }}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} mt={2}>
          <Typography variant="h6" fontWeight={700} color="#1f2937">
            {apiIdea?.title || idea?.title || 'Untitled Idea'}
          </Typography>
          <Chip
            label={resolveCategoryLabel(idea)}
            variant="outlined"
            size="small"
            sx={{ borderColor: '#93c5fd', color: '#2563eb', fontWeight: 500, borderRadius: 999 }}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          px: 3,
          py: 2.5,
          overflowY: 'auto',
          bgcolor: '#ffffff',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: '#f3f4f6', borderRadius: 8 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 8 },
        }}
      >
        <Box
          sx={{
            bgcolor: '#f9fafb',
            borderRadius: 1.5,
            p: 2,
            mb: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} color="#1f2937">
            Reports ({idea?.reportCount ?? reportCount ?? 0})
          </Typography>
        </Box>

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading reports...
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {resolvedReports.map((report) => {
              const reporterName =
                report.reportedBy?.full_name ||
                report.reportedBy?.name ||
                report.reportedBy?.fullName ||
                report.author?.name ||
                'Anonymous User';
              return (
                <Box
                  key={report.id}
                  sx={{
                    bgcolor: '#f3f4f6',
                    borderRadius: 1.5,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: '#cbd5e1' }}>
                      {reporterName.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="#1f2937">
                        {reporterName}
                      </Typography>
                      <Typography variant="caption" color="#94a3b8">
                        {formatDate(report.createdAt)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="#4b5563">
                    {report.reason || report.content}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}

export default ReportDetailsDialog;
