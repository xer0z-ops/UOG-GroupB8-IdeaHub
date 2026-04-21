import { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import {
  Avatar,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  UploadFile,
  FileDownloadOutlined,
  ThumbUp,
  ThumbDown,
  ChatBubble,
  Visibility,
  VisibilityOutlined,
  VisibilityOffOutlined,
} from '@mui/icons-material';
import { fetchIdeaDetails, fetchIdeaComments } from '../../services/staffIdeaService';
import { hideIdea, updateCommentStatus } from '../../services/ideaService';
import { downloadFileWithAuth } from '../../utils/fileDownload';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const resolveStatusLabel = (status) => {
  if (!status) return 'Active';
  if (typeof status === 'string') return status;
  return status?.name || 'Active';
};

const resolveCategoryLabel = (idea) =>
  idea?.categories?.[0]?.name || idea?.category?.name || 'Category';

const resolveAuthorName = (idea) =>
  idea?.isAnonymous ? 'Anonymous User' : idea?.author?.name || idea?.author?.full_name || 'Unknown User';

function AllIdeaDetailsDialog({ open, onClose, ideaId, onHide, showHideActions = true }) {
  const { accessToken, tokenType } = useAuth();
  const [idea, setIdea] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHiding, setIsHiding] = useState(false);
  const [commentUpdatingId, setCommentUpdatingId] = useState(null);
  const [commentConfirmOpen, setCommentConfirmOpen] = useState(false);
  const [commentToToggle, setCommentToToggle] = useState(null);
  const [commentConfirmMode, setCommentConfirmMode] = useState('hide');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleDownload = async (doc) => {
    const url = doc?.downloadUrl || doc?.inlineUrl;
    if (!url) {
      setToast({
        open: true,
        message: 'No download URL available for this document.',
        severity: 'error',
      });
      return;
    }

    try {
      await downloadFileWithAuth({
        url,
        filename: doc?.name || 'document',
        accessToken,
        tokenType,
      });
    } catch (err) {
      setToast({
        open: true,
        message: err?.message || 'Failed to download document',
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    if (!open || !ideaId) {
      setIdea(null);
      setComments([]);
      setError('');
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [ideaData, commentData] = await Promise.all([
          fetchIdeaDetails(ideaId),
          fetchIdeaComments(ideaId),
        ]);
        if (!isMounted) return;
        setIdea(ideaData);
        setComments(commentData || []);
      } catch (err) {
        if (isMounted) setError(err?.message || 'Failed to load idea details');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open, ideaId]);

  const handleHide = async () => {
    const targetId = idea?.id ?? ideaId;
    if (!targetId) return;
    setIsHiding(true);
    setError('');
    try {
      const nextStatusId = isHidden ? 5 : 7;
      await hideIdea(targetId, nextStatusId);
      onHide?.(targetId, nextStatusId);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to hide idea');
    } finally {
      setIsHiding(false);
    }
  };

  const handleToggleCommentStatus = async (comment, nextStatusIdOverride) => {
    if (!comment?.id) return;
    const currentStatusId = comment.status?.id ?? comment.statusId ?? comment.status_id ?? null;
    const nextStatusId =
      nextStatusIdOverride ?? (currentStatusId === 8 ? 9 : 8);
    setCommentUpdatingId(comment.id);
    try {
      await updateCommentStatus(idea?.id ?? ideaId, comment.id, nextStatusId);
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? { ...item, statusId: nextStatusId, status: { ...(item.status || {}), id: nextStatusId } }
            : item
        )
      );
      setToast({
        open: true,
        message: nextStatusId === 8 ? 'Comment hidden' : 'Comment visible again',
        severity: 'success',
      });
    } catch (err) {
      setError(err?.message || 'Failed to update comment status');
    } finally {
      setCommentUpdatingId(null);
    }
  };

  const handleRequestCommentConfirm = (comment, mode) => {
    if (!comment?.id) return;
    setCommentToToggle(comment);
    setCommentConfirmMode(mode);
    setCommentConfirmOpen(true);
  };

  const handleCloseCommentConfirm = () => {
    setCommentConfirmOpen(false);
    setCommentToToggle(null);
  };

  const handleConfirmHideComment = async () => {
    if (!commentToToggle) {
      handleCloseCommentConfirm();
      return;
    }
    const nextStatusId = commentConfirmMode === 'show' ? 9 : 8;
    await handleToggleCommentStatus(commentToToggle, nextStatusId);
    handleCloseCommentConfirm();
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  const isHidden = (idea?.status?.id ?? idea?.statusId ?? idea?.status_id) === 7;

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

        {isLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        ) : idea ? (
          <>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1.5}>
              <Avatar
                sx={{ width: 46, height: 46, bgcolor: "#cbd5e1", fontSize: "1rem", color: "#fff" }}
              >
                {idea.isAnonymous ? 'A' : resolveAuthorName(idea)?.substring(0, 2)?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="body1" fontWeight={600} color="#1f2937">
                {resolveAuthorName(idea)}
              </Typography>
              <Typography variant="body2" color="#6b7280">
                {formatDate(idea.createdAt)}
              </Typography>
              <Chip
                label={resolveStatusLabel(idea.author?.statusName || idea.author?.status)}
                sx={{
                  bgcolor: '#e7f8ee',
                  color: '#10b981',
                  fontWeight: 600,
                  borderRadius: 999,
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} mt={2}>
              <Typography variant="h6" fontWeight={700} color="#1f2937">
                {idea.title}
              </Typography>
              <Chip
                label={resolveCategoryLabel(idea)}
                variant="outlined"
                sx={{
                  borderColor: '#93c5fd',
                  color: '#2563eb',
                  fontWeight: 500,
                  borderRadius: 999,
                }}
              />
            </Stack>
          </>
        ) : null}
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
        {idea && (
          <>
            <Typography variant="body1" color="#4b5563" sx={{ lineHeight: 1.7, mb: 3 }}>
              {idea.description || 'No description provided.'}
            </Typography>

            {idea.documents?.length ? (
              <Stack spacing={2} mb={3}>
                {idea.documents.map((doc) => (
                  <Stack
                    key={doc.id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <UploadFile sx={{ color: '#2563eb', fontSize: 28 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#1f2937">
                          {doc.name || 'document'}
                        </Typography>
                        <Typography variant="caption" color="#6b7280">
                          100kb
                        </Typography>
                      </Box>
                    </Stack>
                    <IconButton
                      size="small"
                      sx={{ color: '#2563eb' }}
                      onClick={() => handleDownload(doc)}
                      disabled={!doc?.downloadUrl && !doc?.inlineUrl}
                    >
                      <FileDownloadOutlined />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            ) : null}

            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ThumbUp fontSize="small" sx={{ color: '#64748b' }} />
                <Typography fontWeight={600}>{idea.thumbUpCount ?? 0}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <ThumbDown fontSize="small" sx={{ color: '#64748b' }} />
                <Typography fontWeight={600}>{idea.thumbDownCount ?? 0}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <ChatBubble fontSize="small" sx={{ color: '#64748b' }} />
                <Typography fontWeight={600}>{comments.length}</Typography>
              </Stack>
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Visibility fontSize="small" sx={{ color: '#64748b' }} />
                <Typography fontWeight={600}>{idea.viewCount ?? 0}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={3}>
              {comments.map((comment) => (
                <Box key={comment.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: '#cbd5e1' }}>
                      {comment.isAnonymous
                        ? 'A'
                        : comment.author?.name?.substring(0, 2)?.toUpperCase() || 'U'}
                    </Avatar>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                      <Typography variant="body2" fontWeight={600} color="#1f2937">
                        {comment.isAnonymous ? 'Anonymous User' : comment.author?.name}
                      </Typography>
                      <Typography variant="caption" color="#94a3b8">
                        {formatDate(comment.createdAt)}
                      </Typography>
                    </Stack>
                    <Box sx={{ flexGrow: 1 }} />
                    {showHideActions ?? <IconButton
                      size="small"
                      onClick={() => {
                        const currentStatusId = comment.status?.id ?? comment.statusId ?? comment.status_id ?? null;
                        if (currentStatusId === 8) {
                          handleRequestCommentConfirm(comment, 'show');
                        } else {
                          handleRequestCommentConfirm(comment, 'hide');
                        }
                      }}
                      disabled={commentUpdatingId === comment.id}
                      sx={{
                        bgcolor:
                          (comment.status?.id ?? comment.statusId ?? comment.status_id) === 8
                            ? '#fde9ea'
                            : '#e7f8ee',
                        color:
                          (comment.status?.id ?? comment.statusId ?? comment.status_id) === 8
                            ? '#c93529'
                            : '#10b981',
                      }}
                    >
                      {(comment.status?.id ?? comment.statusId ?? comment.status_id) === 8 ? (
                        <VisibilityOffOutlined fontSize="small" />
                      ) : (
                        <VisibilityOutlined fontSize="small" />
                      )}
                    </IconButton>}

                  </Stack>
                  <Typography variant="body2" color="#4b5563">
                    {comment.content}
                  </Typography>
                </Box>
              ))}
              {!comments.length && (
                <Typography variant="body2" color="text.secondary">
                  No comments yet.
                </Typography>
              )}
            </Stack>
          </>
        )}
      </Box>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        {showHideActions ? (
          <>
            <Button
              onClick={onClose}
              variant="contained"
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
              onClick={handleHide}
              variant="contained"
              disabled={isHiding}
              sx={{
                bgcolor: isHidden ? '#1d5feb' : '#e11d48',
                color: '#fff',
                textTransform: 'none',
                borderRadius: 0.7,
                px: 3,
                '&:hover': { bgcolor: isHidden ? '#174dcc' : '#be123c' },
              }}
            >
              {isHidden ? (isHiding ? 'Showing...' : 'Show Again') : (isHiding ? 'Hiding...' : 'Hide')}
            </Button>
          </>
        ) : (
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              bgcolor: '#1d5feb',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 0.7,
              px: 3,
              '&:hover': { bgcolor: '#174dcc' },
            }}
          >
            Close
          </Button>
        )}
      </Box>

      <Dialog open={commentConfirmOpen} onClose={handleCloseCommentConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {commentConfirmMode === 'show' ? 'Show Comment' : 'Hide Comment'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {commentConfirmMode === 'show'
              ? 'Are you sure you want to show this comment again?'
              : 'Are you sure you want to hide this comment?'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseCommentConfirm} disabled={commentUpdatingId === commentToToggle?.id} variant="outlined" sx={{ borderRadius: 0.7 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmHideComment}
            disabled={commentUpdatingId === commentToToggle?.id}
            color={commentConfirmMode === 'show' ? 'primary' : 'error'}
            variant="contained"
            sx={{ borderRadius: 0.7 }}
          >
            {commentUpdatingId === commentToToggle?.id
              ? commentConfirmMode === 'show'
                ? 'Showing...'
                : 'Hiding...'
              : commentConfirmMode === 'show'
                ? 'Show'
                : 'Hide'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2500} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Dialog>

  );
}

export default AllIdeaDetailsDialog;
