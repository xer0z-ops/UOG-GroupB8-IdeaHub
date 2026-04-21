import { useCallback, useRef } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
  Divider
} from "@mui/material";
import {
  ChatBubble,
  DeleteOutline,
  EditOutlined,
  ThumbDown,
  ThumbDownOutlined,
  ThumbUp,
  ThumbUpOutlined,
  UploadFile,
  ReportOutlined,
  Visibility,
} from "@mui/icons-material";
import { postThumbReaction, deleteThumbReaction } from "../../services/staffIdeaService";

const DEBOUNCE_MS = 600;

// user's final intent is to remove their reaction - call DELETE.

const REMOVE = Symbol("REMOVE");

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const IdeaRow = ({ idea, currentUser, onOpen, onEdit, onDelete, onThumbChange, onReport, onError, isQACoordinator, isFinalClosed }) => {
  // No local thumb state — the parent's ideas array is the single source of
  // truth. Every optimistic update is pushed up via onThumbChange immediately,
  // which patches the matching idea in the list and re-renders this row with
  // the correct props. This means the modal and the list are always in sync.
  const debounceRef = useRef(null);
  const pendingVoteRef = useRef(null);

  const isOwner =
    currentUser?.id &&
    idea.authorId === currentUser.id;
  const isDisabled = isQACoordinator || isFinalClosed;

  // Derive active states directly from the prop
  const thumbUpActive = idea.currentUserThumb === "up";
  const thumbDownActive = idea.currentUserThumb === "down";

  // Optimistic toggle logic — mutates the parent state via onThumbChange
  //   clicking active thumb  → remove reaction  (next = null)
  //   clicking opposite thumb → switch reaction
  //   clicking with no reaction → set reaction
  const handleThumbClick = useCallback(
    (e, clickedVote) => {
      e.stopPropagation();

      const prev = {
        current: idea.currentUserThumb ?? null,
        upCount: idea.thumbUpCount ?? 0,
        downCount: idea.thumbDownCount ?? 0,
      };

      const alreadyActive = prev.current === clickedVote;
      const opposite = clickedVote === "up" ? "down" : "up";

      let nextCurrent;
      let nextUp = prev.upCount;
      let nextDown = prev.downCount;

      if (alreadyActive) {
        // Toggle off — remove reaction
        nextCurrent = null;
        if (clickedVote === "up") nextUp = Math.max(0, prev.upCount - 1);
        else nextDown = Math.max(0, prev.downCount - 1);
      } else {
        // Undo the opposite if one is active
        if (prev.current === opposite) {
          if (opposite === "up") nextUp = Math.max(0, prev.upCount - 1);
          else nextDown = Math.max(0, prev.downCount - 1);
        }
        nextCurrent = clickedVote;
        if (clickedVote === "up") nextUp = prev.upCount + 1;
        else nextDown = prev.downCount + 1;
      }

      // Push optimistic update to parent immediately so every subscriber
      // (this row AND the detail modal via selectedIdea) sees it at once.
      const next = { current: nextCurrent, upCount: nextUp, downCount: nextDown };
      onThumbChange?.(idea.id, next);

      // Store the intended final state for the debounced API call.
      pendingVoteRef.current = nextCurrent === null ? REMOVE : nextCurrent;

      // Debounce — collapse rapid clicks into one API call.
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
          // On API failure roll back to the original server values so the UI
          // stays honest on the next page load.
          onThumbChange?.(idea.id, {
            current: idea.currentUserThumb ?? null,
            upCount: idea.thumbUpCount ?? 0,
            downCount: idea.thumbDownCount ?? 0,
          });
          onError?.(err?.message || "Failed to submit reaction");
        }
      }, DEBOUNCE_MS);
    },
    [idea, onThumbChange, onError],
  );

  return (
    <Paper
      onClick={() => onOpen?.(idea)}
      sx={{
        mb: 0.5,
        borderRadius: 1,
        border: "1px solid #e5e8f0",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
        px: { xs: 2.5, lg: 3.5 }, py: { xs: 1, lg: 2 },
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      {/* <> */}
      {/* <Box
        onClick={() => onOpen?.(idea)}
        sx={{
          px: { xs: 2.5, lg: 3.5 }, py: { xs: 1, lg: 2 },
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: "#f8f9fb",
          },
        }}
      > */}
      {/* Top row: author + category + actions */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 40, height: 40, bgcolor: "#cbd5e1", fontSize: "0.875rem", color: "#fff" }}>
            {idea.isAnonymous ? "A" : idea.author?.name?.substring(0, 2)?.toUpperCase() || "U"}
          </Avatar>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight={700} color="#1e293b">
              {idea.isAnonymous ? "Anonymous User" : idea.author?.name || "Unknown User"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.8rem" }}>
              {formatDate(idea.createdAt)}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {idea.categories?.[0] && (
            <Chip
              label={idea.categories[0].name}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: 3,
                px: 0.5,
                borderColor: "#bfdbfe",
                color: "#1d4ed8",
                backgroundColor: "#eef6ff",
              }}
            />
          )}
          {isOwner && (
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                disabled={isFinalClosed}
                sx={{
                  bgcolor: isFinalClosed ? "transparent" : "#edf2ff",
                  color: isFinalClosed ? "#94a3b8" : "#1d4ed8",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(idea);
                }}
              >
                <EditOutlined fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                disabled={isFinalClosed}
                sx={{
                  bgcolor: isFinalClosed ? "transparent" : "#feecee",
                  color: isFinalClosed ? "#94a3b8" : "#dc2626",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(idea);
                }}
              >
                <DeleteOutline fontSize="inherit" />
              </IconButton>
            </Stack>
          )}
          {!isOwner && !isQACoordinator && !isFinalClosed && (
            <IconButton
              size="small"
              sx={{
                bgcolor: "#fff1f2",
                color: "#e11d48",
                transition: "background-color 0.15s ease, color 0.15s ease",
                "&:hover": {
                  bgcolor: "#ffe4e6",
                  color: "#be123c",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                onReport?.(idea);
              }}
              title="Report Idea"
            >
              <ReportOutlined fontSize="inherit" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {/* Title + description */}
      <Typography variant="h6" fontWeight={700} mt={2} mb={0.5}>
        {idea.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {idea.description}
      </Typography>

      {/* Attached documents */}
      {idea.documents?.length > 0 && (
        <Stack direction="row" spacing={2} mt={2} flexWrap="wrap">
          {idea.documents.slice(0, 3).map((doc) => (
            <Stack
              key={doc.id}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 1, py: 0.5 }}
            >
              <UploadFile fontSize="medium" sx={{ color: "#3b82f6" }} />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: "#334155", fontSize: "0.85rem" }}
                  noWrap
                  maxWidth={160}
                >
                  {doc.name || "document_file_name.pdf"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                  {doc.mimeType || "File"}
                </Typography>
              </Box>
            </Stack>
          ))}
          {idea.documents.length > 3 && (
            <Button
              size="small"
              sx={{ textTransform: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              View More
            </Button>
          )}
        </Stack>
      )}

      {/* Reaction + comment stats */}
      <Stack direction="row" mt={3} alignItems="center" justifyContent="space-between">

        {/* Left group: thumbs + comments */}
        <Stack direction="row" spacing={1} alignItems="center">

        {/* Thumb Up */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            size="small"
            onClick={(e) => handleThumbClick(e, "up")}
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
            {idea.thumbUpCount ?? 0}
          </Typography>
        </Stack>

        {/* Thumb Down */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            size="small"
            onClick={(e) => handleThumbClick(e, "down")}
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
            {idea.thumbDownCount ?? 0}
          </Typography>
        </Stack>

        {/* Comment count — display only */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ color: "#94a3b8", display: "flex" }}>
            <ChatBubble fontSize="small" />
          </Box>
          <Typography variant="body2" fontWeight={700} color="#334155">
            {idea.commentCount ?? 0}
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

      {/* </Box> */}
      {/* <Divider /> */}
      {/* </> */}
    </Paper>
  );
};

export default IdeaRow;