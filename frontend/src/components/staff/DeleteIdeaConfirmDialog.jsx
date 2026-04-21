import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Close as CloseIcon, DeleteOutline, WarningAmberRounded } from "@mui/icons-material";

const DeleteIdeaConfirmDialog = ({ open, onClose, onConfirm, idea, deleting = false, error = "" }) => {
  return (
    <Dialog
      open={open}
      onClose={deleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningAmberRounded sx={{ color: "#dc2626", fontSize: 24 }} />
            <Typography variant="h6" fontWeight={700} color="#1e293b">
              Delete Idea
            </Typography>
          </Stack>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={deleting}
            sx={{ color: "#94a3b8" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.7 }}>
          Are you sure you want to delete{" "}
          {idea?.title ? (
            <>
              <Typography
                component="span"
                variant="body2"
                fontWeight={700}
                color="#1e293b"
                sx={{
                  display: "inline",
                  wordBreak: "break-word",
                }}
              >
                &ldquo;{idea.title}&rdquo;
              </Typography>
              ?
            </>
          ) : (
            "this idea?"
          )}
        </Typography>
        <Typography variant="body2" color="#dc2626" fontWeight={500} sx={{ mt: 1.5 }}>
          This action cannot be undone. All associated documents and comments will
          be permanently removed.
        </Typography>
        {error && (
          <Typography
            variant="body2"
            color="#dc2626"
            fontWeight={600}
            sx={{
              mt: 2,
              px: 1.5,
              py: 1,
              bgcolor: "#fef2f2",
              borderRadius: 1.5,
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={deleting}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            borderColor: "#e2e8f0",
            color: "#475569",
            fontWeight: 600,
            "&:hover": {
              borderColor: "#cbd5e1",
              bgcolor: "#f8fafc",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={deleting}
          variant="contained"
          startIcon={
            deleting ? (
              <CircularProgress size={16} sx={{ color: "#fff" }} />
            ) : (
              <DeleteOutline fontSize="small" />
            )
          }
          sx={{
            textTransform: "none",
            borderRadius: 2,
            bgcolor: "#dc2626",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": {
              bgcolor: "#b91c1c",
              boxShadow: "none",
            },
            "&.Mui-disabled": {
              bgcolor: "#fca5a5",
              color: "#fff",
            },
          }}
        >
          {deleting ? "Deleting…" : "Delete Idea"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteIdeaConfirmDialog;