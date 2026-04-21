import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { reportIdea } from "../../services/staffIdeaService";

const MAX_LENGTH = 500;

const ReportIdeaDialog = ({ open, onClose, idea, onReported }) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset when dialog opens
  if (open && !reason && !isSubmitting && error) {
    setError("");
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setError("");
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Report reason is required");
      return;
    }

    if (!idea?.id) return;

    setIsSubmitting(true);
    setError("");

    try {
      await reportIdea(idea.id, trimmedReason);
      setReason("");
      onReported?.(); // Tells the parent it was successful
    } catch (err) {
      setError(err?.message || "Something went wrong while reporting the idea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 1 } }}>
      <DialogTitle sx={{ m: 0, px: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" fontWeight={600} color="#334155">
          Report the post
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            bgcolor: "#f1f5f9",
            borderRadius: 1.5,
            p: 0.5,
            "&:hover": {
              bgcolor: "#e2e8f0",
            },
          }}
          disabled={isSubmitting}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderBottom: "none", px: { xs: 2, md: 3 }, pt: 2, pb: 0 }}>
        <Box>
          <Typography variant="body2" fontWeight={600} color="#475569" sx={{ display: 'inline-flex', alignItems: 'center', mb: 1 }}>
            Report reason <Box component="span" sx={{ color: "#ef4444", ml: 0.5 }}>*</Box>
          </Typography>
        </Box>
        <TextField
          multiline
          minRows={5}
          maxRows={8}
          fullWidth
          placeholder="Enter your report reason..."
          value={reason}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setReason(e.target.value);
            }
          }}
          disabled={isSubmitting}
          error={!!error}
          helperText={error}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 0.7,
            },
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {reason.length}/{MAX_LENGTH}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{
        px: { xs: 2, md: 3 },
        pb: 3,
      }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          sx={{
            textTransform: "none",
            bgcolor: "#a1a1aa",
            color: "#fff",
            "&:hover": { bgcolor: "#71717a" },
            borderRadius: 0.7,
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !reason.trim()}
          variant="contained"
          sx={{
            textTransform: "none",
            px: 3,
            borderRadius: 0.7,
            bgcolor: "#3b82f6",
            "&:hover": { bgcolor: "#2563eb" },
          }}
        >
          {isSubmitting ? "Reporting..." : "Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportIdeaDialog;
