import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import useAuth from '../../hooks/useAuth.js';
import { fetchDepartmentIdeas } from '../../services/staffIdeaService.js';
import { notifyDepartment } from '../../services/engagementService.js';

const SUBJECT_LIMIT = 120;
const DESCRIPTION_LIMIT = 500;

const EngagementPage = () => {
  const { currentUser } = useAuth();
  const departmentId = currentUser?.departmentId ?? null;
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [highlightIdeaId, setHighlightIdeaId] = useState('all');
  const [ideas, setIdeas] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let isMounted = true;
    const loadIdeas = async () => {
      setLoadingIdeas(true);
      try {
        const result = await fetchDepartmentIdeas({
          departmentId,
          page: 1,
          pageSize: 200,
        });
        if (!isMounted) return;
        setIdeas(result.items || []);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load ideas');
      } finally {
        if (isMounted) setLoadingIdeas(false);
      }
    };

    loadIdeas();
    return () => {
      isMounted = false;
    };
  }, [departmentId]);

  const highlightOptions = useMemo(() => {
    const options = [{  }];
    ideas.forEach((idea) => {
      options.push({ id: idea.id, title: idea.title || idea.name || 'Untitled' });
    });
    return options;
  }, [ideas]);

  const subjectCount = `${subject.length}/${SUBJECT_LIMIT}`;
  const descriptionCount = `${description.length}/${DESCRIPTION_LIMIT}`;

  const handleCancel = () => {
    setSubject('');
    setDescription('');
    setHighlightIdeaId('all');
  };

  const handleAnnounce = () => {
    if (!subject.trim() || !description.trim()) {
      setToast({ open: true, message: 'Please the filled the required fields.', severity: 'error' });
      return;
    }
    if (!highlightIdeaId || highlightIdeaId === 'all') {
      setToast({ open: true, message: 'Please select a highlighted idea.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    notifyDepartment(highlightIdeaId, { subject, description })
      .then((response) => {
        const count = response?.data?.notified_count;
        setToast({
          open: true,
          message: response?.message || (count ? `Notification sent to ${count} user(s).` : 'Notification sent.'),
          severity: 'success',
        });
        setSubject('');
        setDescription('');
        setHighlightIdeaId('all');
      })
      .catch((error) => {
        setToast({ open: true, message: error?.message || 'Failed to send notification', severity: 'error' });
      })
      .finally(() => setSubmitting(false));
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: '#f9fafb',
            border: '1px solid #eef2f7',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#374151', mb: 2.5 }}>
            Engagement
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 0.8 }}>
                Subject *
              </Typography>
              <TextField
                fullWidth
                value={subject}
                placeholder="Enter subject here..."
                onChange={(event) => setSubject(event.target.value.slice(0, SUBJECT_LIMIT))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    height: 44,
                    bgcolor: '#fff',
                  },
                }}
              />
              <Typography sx={{ mt: 0.6, fontSize: 12, color: '#9aa3b2', textAlign: 'right' }}>
                {subjectCount}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 0.8 }}>
                Description *
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={description}
                placeholder="Enter your description here..."
                onChange={(event) => setDescription(event.target.value.slice(0, DESCRIPTION_LIMIT))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    bgcolor: '#fff',
                  },
                }}
              />
              <Typography sx={{ mt: 0.6, fontSize: 12, color: '#9aa3b2', textAlign: 'right' }}>
                {descriptionCount}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 0.8 }}>
                Highlight Post Title *
              </Typography>
              <Autocomplete
                fullWidth
                options={highlightOptions}
                getOptionLabel={(option) => option.title || ''}
                value={highlightOptions.find((option) => option.id === highlightIdeaId) || highlightOptions[0]}
                onChange={(_, newValue) => setHighlightIdeaId(newValue?.id ?? 'all')}
                loading={loadingIdeas}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select highlight post..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0.7,
                        height: 44,
                        bgcolor: '#fff',
                      },
                    }}
                  />
                )}
              />
            </Box>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handleCancel}
                sx={{
                  bgcolor: '#bdbdbd',
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 0.7,
                  px: 3,
                  '&:hover': { bgcolor: '#a3a3a3' },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAnnounce}
                disabled={submitting}
                sx={{
                  bgcolor: '#1d5feb',
                  borderRadius: 0.7,
                  px: 3,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#174dcc' },
                }}
              >
                {submitting ? 'Announcing...' : 'Announce All'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default EngagementPage;
