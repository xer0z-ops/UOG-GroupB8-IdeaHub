import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  UploadFile,
  FileDownloadOutlined,
  ThumbUp,
  ThumbUpOutlined,
  ThumbDown,
  ThumbDownOutlined,
  ChatBubble,
  DeleteOutline,
  EditOutlined,
  Visibility,
} from "@mui/icons-material";
import {
  fetchIdeaDetails,
  fetchIdeaComments,
  postIdeaComment,
  postThumbReaction,
  deleteThumbReaction,
} from "../../services/staffIdeaService";
import { deleteComment, editComment } from "../../services/ideaService";
import { downloadFileWithAuth } from "../../utils/fileDownload";

const DEBOUNCE_MS = 600;

// user's final intent is to remove their reaction - call DELETE.
const REMOVE = Symbol("REMOVE");

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const IdeaDetailsDialog = ({ open, onClose, onThumbChange, onCommentCountChange, onViewCountChange, idea: initialIdea, isQACoordinator, isFinalClosed }) => {
  const { accessToken, tokenType, currentUser } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [idea, setIdea] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  // Edit state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  // Delete state
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [downloadToast, setDownloadToast] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const handleDownload = async (doc) => {
    const url = doc?.downloadUrl || doc?.inlineUrl;
    if (!url) {
      setDownloadToast({
        open: true,
        message: "No download URL available for this document.",
        severity: "error",
      });
      return;
    }

    try {
      await downloadFileWithAuth({
        url,
        filename: doc?.name || "document",
        accessToken,
        tokenType,
      });
    } catch (err) {
      setDownloadToast({
        open: true,
        message: err?.message || "Failed to download document",
        severity: "error",
      });
    }
  };

  const handleDownloadToastClose = (_, reason) => {
    if (reason === "clickaway") return;
    setDownloadToast((prev) => ({ ...prev, open: false }));
  };

  // Thumb reaction state
  const [thumbState, setThumbState] = useState({
    current: null,   // null | "up" | "down"
    upCount: 0,
    downCount: 0,
  });
  const debounceRef = useRef(null);
  const pendingVoteRef = useRef(null);

  // Load idea + comments
  useEffect(() => {
    if (!open || !initialIdea?.id) {
      setIdea(null);
      setComments([]);
      setError(null);
      setThumbState({ current: null, upCount: 0, downCount: 0 });
      return;
    }

    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [ideaData, commentsData] = await Promise.all([
          fetchIdeaDetails(initialIdea.id),
          fetchIdeaComments(initialIdea.id),
        ]);

        if (mounted) {
          setIdea(ideaData);
          setComments(commentsData);
          setThumbState({
            current: ideaData.currentUserThumb ?? null,
            upCount: ideaData.thumbUpCount ?? ideaData.thumbSummary?.up ?? 0,
            downCount: ideaData.thumbDownCount ?? ideaData.thumbSummary?.down ?? 0,
          });
          // Notify the list so the card's view count stays in sync with what
          // the detail API returned (the server increments it on fetch).
          if (ideaData.viewCount != null) {
            onViewCountChange?.(initialIdea.id, ideaData.viewCount);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch idea details");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [open, initialIdea?.id, onViewCountChange]);

  // Thumb click handler with optimistic update + debounce
  const handleThumbClick = useCallback(
    (clickedVote) => {
      if (!idea?.id) return;

      const alreadyActive = thumbState.current === clickedVote;
      const opposite = clickedVote === "up" ? "down" : "up";

      let nextCurrent;
      let nextUp = thumbState.upCount;
      let nextDown = thumbState.downCount;

      if (alreadyActive) {
        // Toggle off — remove reaction
        nextCurrent = null;
        if (clickedVote === "up") nextUp = Math.max(0, thumbState.upCount - 1);
        else nextDown = Math.max(0, thumbState.downCount - 1);
      } else {
        // Undo the opposite reaction first if one is active
        if (thumbState.current === opposite) {
          if (opposite === "up") nextUp = Math.max(0, thumbState.upCount - 1);
          else nextDown = Math.max(0, thumbState.downCount - 1);
        }
        nextCurrent = clickedVote;
        if (clickedVote === "up") nextUp = thumbState.upCount + 1;
        else nextDown = thumbState.downCount + 1;
      }

      const next = { current: nextCurrent, upCount: nextUp, downCount: nextDown };
      pendingVoteRef.current = nextCurrent === null ? REMOVE : nextCurrent;
      setThumbState(next);
      onThumbChange?.(idea.id, next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const vote = pendingVoteRef.current;
        if (vote === null) return; // guard: ref never written

        try {
          if (vote === REMOVE) {
            await deleteThumbReaction(idea.id);
          } else {
            await postThumbReaction(idea.id, vote === "up" ? "thumb_up" : "thumb_down");
          }
        } catch (err) {
          // Roll back to the values fetched from the server on failure
          setThumbState({
            current: idea.currentUserThumb ?? null,
            upCount: idea.thumbUpCount ?? idea.thumbSummary?.up ?? 0,
            downCount: idea.thumbDownCount ?? idea.thumbSummary?.down ?? 0,
          });
          setDownloadToast({
            open: true,
            message: err?.message || "Failed to submit reaction. Please try again.",
            severity: "error",
          });
        }
      }, DEBOUNCE_MS);
    },
    [idea, thumbState, onThumbChange],
  );

  // Edit handlers
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleSubmitEdit = async (commentId) => {
    if (!editingText.trim() || !idea?.id) return;
    setIsSubmittingEdit(true);
    try {
      await editComment(idea.id, commentId, editingText);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editingText.trim() } : c))
      );
      setEditingCommentId(null);
      setEditingText("");
    } catch (err) {
      setError(err.message || "Failed to edit comment");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete handler
  const handleDeleteComment = async (commentId) => {
    if (!idea?.id) return;
    setDeletingCommentId(commentId);
    try {
      await deleteComment(idea.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(idea.id, comments.length - 1);
    } catch (err) {
      setError(err.message || "Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Comment submission
  const handlePostComment = async () => {
    if (!commentText.trim() || !idea?.id) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await postIdeaComment(idea.id, { commentText, isAnonymous });
      setComments((prev) => [...prev, newComment]);
      onCommentCountChange?.(idea.id, comments.length + 1);
      setCommentText("");
      setIsAnonymous(false);
    } catch (err) {
      setError(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!open) return null;
  const thumbUpActive = thumbState.current === "up";
  const thumbDownActive = thumbState.current === "down";

  const isDisabled = isQACoordinator || isFinalClosed;

  return (
    <Dialog
      maxWidth="md"
      fullWidth
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 1,
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* ── Fixed Header ── */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          pb: 2,
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
        {/* Close button */}
        <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
          <IconButton onClick={onClose} sx={{ bgcolor: "#f1f5f9", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : idea ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{ width: 44, height: 44, bgcolor: "#cbd5e1", fontSize: "1rem", color: "#fff" }}
            >
              {idea.isAnonymous ? "A" : idea.author?.name?.substring(0, 2)?.toUpperCase() || "U"}
            </Avatar>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1}>
              <Typography variant="body1" fontWeight={600} color="#1e293b">
                {idea.isAnonymous ? "Anonymous User" : idea.author?.name || "Unknown User"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                {formatDate(idea.createdAt)}
              </Typography>
             
            </Stack>
          </Stack>
        ) : null}

        {idea && (
          <Stack direction="row" spacing={1.5} alignItems="center" mt={2} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="#1e293b">
              {idea.title}
            </Typography>
            {idea.categories?.[0] && (
              <Chip
                label={idea.categories[0].name}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 999, borderColor: "#bfdbfe", color: "#3b82f6", fontWeight: 500 }}
              />
            )}
          </Stack>
        )}
      </Box>

      {/* ── Scrollable Body ── */}
      {idea && (
        <>
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: { xs: 2, md: 3 },
              py: 2,
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-track": { bgcolor: "#f1f5f9", borderRadius: 8 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 8 },
              "&::-webkit-scrollbar-thumb:hover": { bgcolor: "#94a3b8" },
            }}
          >
            {/* Description */}
            <Typography variant="body1" color="#475569" sx={{ lineHeight: 1.7, mb: 3 }}>
              {idea.description}
            </Typography>

            {/* Documents */}
            {idea.documents?.length > 0 && (
              <Stack spacing={2} mb={4}>
                {idea.documents.map((doc) => (
                  <Stack
                    key={doc.id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <UploadFile sx={{ color: "#3b82f6", fontSize: 28 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="#334155">
                          {doc.name || "document"}
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                          100kb
                        </Typography>
                      </Box>
                    </Stack>
                    <IconButton
                      size="small"
                      sx={{ color: "#3b82f6" }}
                      onClick={() => handleDownload(doc)}
                      disabled={!doc?.downloadUrl && !doc?.inlineUrl}
                    >
                      <FileDownloadOutlined />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            {/* Reaction buttons + comment count */}
            <Stack direction="row" mb={3} alignItems="center" justifyContent="space-between">

              {/* Left group: thumbs + comments */}
              <Stack direction="row" spacing={1} alignItems="center">

              {/* Thumb Up */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton
                  size="small"
                  onClick={() => handleThumbClick("up")}
                  disabled = {isDisabled}
                  sx={{
                    color: thumbUpActive ? "#3b82f6" : "#94a3b8",
                    bgcolor: thumbUpActive ? "#eff6ff" : "transparent",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      bgcolor: thumbUpActive ? "#dbeafe" : "#f1f5f9",
                      color: thumbUpActive ? "#2563eb" : "#64748b",
                    },
                  }}
                >
                  {thumbUpActive ? (
                    <ThumbUp fontSize="small" />
                  ) : (
                    <ThumbUpOutlined fontSize="small" />
                  )}
                </IconButton>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: thumbUpActive ? "#3b82f6" : "#334155", minWidth: 16 }}
                >
                  {thumbState.upCount}
                </Typography>
              </Stack>

              {/* Thumb Down */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton
                  size="small"
                  onClick={() => handleThumbClick("down")}
                  disabled = {isDisabled}
                  sx={{
                    color: thumbDownActive ? "#ef4444" : "#94a3b8",
                    bgcolor: thumbDownActive ? "#fef2f2" : "transparent",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      bgcolor: thumbDownActive ? "#fee2e2" : "#f1f5f9",
                      color: thumbDownActive ? "#dc2626" : "#64748b",
                    },
                  }}
                >
                  {thumbDownActive ? (
                    <ThumbDown fontSize="small" />
                  ) : (
                    <ThumbDownOutlined fontSize="small" />
                  )}
                </IconButton>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ color: thumbDownActive ? "#ef4444" : "#334155", minWidth: 16 }}
                >
                  {thumbState.downCount}
                </Typography>
              </Stack>

              {/* Comment count — display only */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ color: "#94a3b8", display: "flex" }}>
                  <ChatBubble fontSize="small" />
                </Box>
                <Typography variant="body2" fontWeight={700} color="#334155">
                  {comments.length}
                </Typography>
              </Stack>

              </Stack>{/* end left group */}

              {/* Right group: view count */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ color: "#94a3b8", display: "flex" }}>
                  <Visibility fontSize="small" />
                </Box>
                <Typography variant="body2" fontWeight={700} color="#334155">
                  {idea.viewCount ?? 0}
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Comments */}
            <Stack spacing={4}>
              {comments.map((comment) => {
                const isOwner = !comment.isAnonymous && currentUser?.id && comment.authorId === currentUser.id;
                const isEditing = editingCommentId === comment.id;
                const isDeleting = deletingCommentId === comment.id;

                return (
                  <Box key={comment.id}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1.5}>
                      <Avatar
                        sx={{ width: 36, height: 36, bgcolor: "#cbd5e1", fontSize: "1rem", color: "#fff", flexShrink: 0 }}
                      >
                        {comment.isAnonymous
                          ? "A"
                          : comment.author?.name?.substring(0, 2)?.toUpperCase() || "U"}
                      </Avatar>
                      <Stack flex={1} spacing={0.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600} color="#334155">
                              {comment.isAnonymous ? "Anonymous User" : comment.author?.name}
                            </Typography>
                            <Typography variant="caption" color="#94a3b8">
                              {formatDate(comment.createdAt)}
                            </Typography>
                          </Stack>
                          {isOwner && !isEditing && (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => handleStartEdit(comment)}
                                  sx={{ color: "#94a3b8", "&:hover": { color: "#3b82f6" } }}
                                >
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={isDeleting}
                                  sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444" } }}
                                >
                                  {isDeleting
                                    ? <CircularProgress size={14} />
                                    : <DeleteOutline fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Stack>

                        {isEditing ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                              fullWidth
                              size="small"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitEdit(comment.id);
                                }
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              autoFocus
                              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0.7 } }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleSubmitEdit(comment.id)}
                              disabled={!editingText.trim() || isSubmittingEdit}
                              sx={{
                                textTransform: "none", borderRadius: 0.7, bgcolor: "#3b82f6",
                                boxShadow: "none", whiteSpace: "nowrap",
                                "&:hover": { bgcolor: "#2563eb", boxShadow: "none" },
                              }}
                            >
                              {isSubmittingEdit ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="small"
                              onClick={handleCancelEdit}
                              sx={{ textTransform: "none", borderRadius: 0.7, color: "#64748b" }}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.6 }}>
                            {comment.content}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
              {comments.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No comments yet. Be the first to share your thoughts!
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Fixed Footer: Comment Input */}
          {!isQACoordinator &&
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 2, md: 3 },
              pt: 1.5,
              pb: 3,
              borderTop: "1px solid #e5e7eb",
              bgcolor: "#fff",
            }}
          >
            {isFinalClosed ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1, px: 1.5, bgcolor: "#f8fafc", borderRadius: 0.7, border: "1px solid #e2e8f0" }}>
                <Box sx={{ color: "#94a3b8", display: "flex", fontSize: 18 }}>🔒</Box>
                <Typography variant="body2" color="#64748b">
                  Interactions are closed — the final closure date for this academic year has passed.
                </Typography>
              </Stack>
            ) : (
              <>
                <Typography variant="body2" color="#475569" mb={1} fontWeight={500}>
                  Your comment
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-start" }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter your comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0.7 } }}
                  />
                  <Button
                    variant="contained"
                    onClick={handlePostComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                    sx={{
                      bgcolor: "#3b82f6",
                      textTransform: "none",
                      borderRadius: 0.7,
                      px: 4,
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                      boxShadow: "none",
                      "&:hover": { bgcolor: "#2563eb", boxShadow: "none" },
                      "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
                    }}
                  >
                    {isSubmittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </Stack>
              </>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  size="small"
                  sx={{ color: "#94a3b8", "&.Mui-checked": { color: "#3b82f6" } }}
                />
              }
              label={
                <Typography variant="caption" color="#64748b">
                  Post anonymously
                </Typography>
              }
              sx={{ mt: 0.5, ml: 0.1 }}
            />
          </Box>
          }
          
        </>
      )}

      <Snackbar
        open={downloadToast.open}
        autoHideDuration={3000}
        onClose={handleDownloadToastClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={downloadToast.severity} onClose={handleDownloadToastClose} sx={{ width: "100%" }}>
          {downloadToast.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default IdeaDetailsDialog;