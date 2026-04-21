import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  FileUploadOutlined,
  DeleteOutline,
  InsertDriveFileOutlined,
} from "@mui/icons-material";
import {
  fetchIdeaCategories,
  updateIdea,
  uploadIdeaDocuments,
  deleteIdeaDocument,
} from "../../services/staffIdeaService";

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_FILES = ".svg,.png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.ppt,.pptx";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};

// Represents a file that already exists on the server
// { type: "existing", doc: { id, name, mimeType, ... } }
// Represents a newly added local file pending upload
// { type: "new", id: string, file: File, status: "ready"|"error", helper: string }

const EditIdeaDialog = ({ open, onClose, onUpdated, idea: initialIdea }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [categories, setCategories] = useState([]);

  // Existing server documents still kept (not yet deleted)
  const [existingDocs, setExistingDocs] = useState([]);
  // Doc IDs queued for deletion (will be deleted on submit)
  const [docsToDelete, setDocsToDelete] = useState([]);
  // Newly selected local files
  const [newFiles, setNewFiles] = useState([]);

  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fileInputRef = useRef(null);

  // Initialise form from the idea prop
  useEffect(() => {
    if (!open || !initialIdea) {
      setTitle("");
      setDescription("");
      setCategoryId("");
      setIsAnonymous(false);
      setExistingDocs([]);
      setDocsToDelete([]);
      setNewFiles([]);
      setFormError("");
      setFieldErrors({});
      return;
    }

    setTitle(initialIdea.title ?? "");
    setDescription(initialIdea.description ?? "");
    setCategoryId(
      initialIdea.categories?.[0]?.id != null
        ? String(initialIdea.categories[0].id)
        : "",
    );
    setIsAnonymous(Boolean(initialIdea.isAnonymous));
    setExistingDocs(
      Array.isArray(initialIdea.documents) ? initialIdea.documents : [],
    );
    setDocsToDelete([]);
    setNewFiles([]);
    setFormError("");
    setFieldErrors({});
  }, [open, initialIdea]);

  // Load categories 
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const categoryList = await fetchIdeaCategories();
        if (!mounted) return;
        setCategories(categoryList || []);
      } catch (error) {
        if (mounted) {
          setFormError(error?.message || "Unable to load categories.");
        }
      } finally {
        if (mounted) setMetaLoading(false);
      }
    };

    loadMeta();
    return () => {
      mounted = false;
    };
  }, [open]);

  // Existing document removal (mark for deletion)
  const markExistingDocForDeletion = useCallback((docId) => {
    setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
    setDocsToDelete((prev) => [...prev, docId]);
  }, []);

  // New file handling
  const addFiles = useCallback((fileList) => {
    if (!fileList?.length) return;
    const validated = Array.from(fileList).map((file) => {
      if (file.size > MAX_FILE_BYTES) {
        return {
          id: `${file.name}-${file.size}-${Date.now()}`,
          file,
          status: "error",
          helper: "File too large. Maximum upload size is 3MB.",
        };
      }
      return {
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        status: "ready",
        helper: formatBytes(file.size),
      };
    });
    setNewFiles((prev) => [...prev, ...validated]);
  }, []);

  const removeNewFile = useCallback((fileId) => {
    setNewFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const readyNewFiles = useMemo(
    () => newFiles.filter((f) => f.status === "ready").map((f) => f.file),
    [newFiles],
  );

  const handleFileInput = useCallback(
    (event) => {
      addFiles(event.target.files);
      // allow re-selecting the same file
      event.target.value = "";
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      addFiles(event.dataTransfer?.files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Validation
  const validateForm = useCallback(() => {
    const errors = {};
    if (!title.trim()) errors.title = "Idea title is required.";
    if (!description.trim()) errors.description = "Idea description is required.";
    if (!categoryId) errors.category = "Select a category.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, description, categoryId]);

  // Submit
  const handleSubmit = useCallback(async () => {
    setFormError("");
    if (!validateForm()) return;
    if (!initialIdea?.id) return;

    setSubmitting(true);
    try {
      // 1. Update core idea fields
      await updateIdea(initialIdea.id, {
        title: title.trim(),
        description: description.trim(),
        categoryIds: [categoryId],
        isAnonymous,
      });

      // 2. Delete removed documents (fire in parallel)
      if (docsToDelete.length > 0) {
        await Promise.all(docsToDelete.map((docId) => deleteIdeaDocument(docId)));
      }

      // 3. Upload new documents
      if (readyNewFiles.length > 0) {
        await uploadIdeaDocuments(initialIdea.id, readyNewFiles);
      }

      onUpdated?.();
      onClose?.();
    } catch (error) {
      setFormError(error?.message || "Unable to update your idea right now.");
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    initialIdea,
    title,
    description,
    categoryId,
    isAnonymous,
    docsToDelete,
    readyNewFiles,
    onUpdated,
    onClose,
  ]);

  // Sub-renders
  const dropZone = (
    <Box>
      <Typography variant="body2" color="text.primary" mb={1}>
        Upload New Document
      </Typography>
      <Box
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: "1px dashed #e2e8f0",
          borderRadius: 0.7,
          bgcolor: "#fafaf9",
          p: 4,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <FileUploadOutlined sx={{ fontSize: 32, color: "#3b82f6", mb: 1 }} />
        <Typography variant="body2" fontWeight={500} color="#475569">
          <Typography
            component="span"
            sx={{ color: "#3b82f6", textDecoration: "underline" }}
          >
            Upload
          </Typography>{" "}
          or drag and drop
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          SVG, PNG, JPG, PDF, DOC, PPT or GIF (max. 3MB)
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept={ACCEPTED_FILES}
          onChange={handleFileInput}
        />
      </Box>
    </Box>
  );

  const renderExistingDocCard = (doc) => (
    <Box
      key={doc.id}
      sx={{
        border: "1px solid #e2e8f0",
        borderRadius: 0.7,
        px: 2,
        py: 1.5,
        bgcolor: "#f8fafc",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <InsertDriveFileOutlined sx={{ color: "#3b82f6", fontSize: 24, flexShrink: 0 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: "#334155" }}
          >
            {doc.name || "document"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {doc.mimeType || "File"} &bull; Saved
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => markExistingDocForDeletion(doc.id)}
          sx={{ color: "#dc2626", flexShrink: 0 }}
          title="Remove document"
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );

  const renderNewFileCard = (item) => (
    <Box
      key={item.id}
      sx={{
        border: "none",
        p: 1,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <FileUploadOutlined
          sx={{
            color: item.status === "error" ? "#dc2626" : "#3b82f6",
            fontSize: 24,
            mt: 0.5,
            flexShrink: 0,
          }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: item.status === "error" ? "#dc2626" : "#334155" }}
          >
            {item.status === "error" ? "Upload failed." : item.file?.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, gap: 1 }}>
            <Typography
              variant="caption"
              color={item.status === "error" ? "#dc2626" : "text.secondary"}
            >
              {item.status === "error"
                ? "File too large • Failed"
                : `${item.helper} • Ready`}
            </Typography>
          </Box>
          <Box
            sx={{
              height: 3,
              width: "100%",
              bgcolor: item.status === "error" ? "#fecaca" : "#bfdbfe",
              mt: 1,
              borderRadius: 0.7,
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: "100%",
                bgcolor: item.status === "error" ? "#ef4444" : "#3b82f6",
                borderRadius: 0.7,
              }}
            />
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={() => removeNewFile(item.id)}
          sx={{ alignSelf: "center", flexShrink: 0 }}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );

  // Render
  return (
    <Dialog
      maxWidth="md"
      fullWidth
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: 1, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            Edit My Idea
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        {metaLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {/* Title */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
                Idea Title{" "}
                <Typography component="span" color="#dc2626">
                  *
                </Typography>
              </Typography>
              <TextField
                fullWidth
                value={title}
                placeholder="Improve Online Course Feedback System"
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                error={Boolean(fieldErrors.title)}
                helperText={fieldErrors.title}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0.7 } }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "right", mt: 0.5 }}
              >
                {title.length}/{MAX_TITLE}
              </Typography>
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
                Tell your idea{" "}
                <Typography component="span" color="#dc2626">
                  *
                </Typography>
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                placeholder="Describe your idea in detail..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, MAX_DESCRIPTION))
                }
                error={Boolean(fieldErrors.description)}
                helperText={fieldErrors.description}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0.7 } }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "right", mt: 0.5 }}
              >
                {description.length}/{MAX_DESCRIPTION}
              </Typography>
            </Box>

            {/* Category */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
                Category{" "}
                <Typography component="span" color="#dc2626">
                  *
                </Typography>
              </Typography>
              <TextField
                select
                fullWidth
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={metaLoading}
                error={Boolean(fieldErrors.category)}
                helperText={fieldErrors.category}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0.7 } }}
              >
                <MenuItem value="" disabled>
                  {metaLoading ? "Loading..." : "Select category"}
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Existing documents */}
            {existingDocs.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={1}>
                  Attached Documents
                </Typography>
                <Stack spacing={1}>
                  {existingDocs.map((doc) => renderExistingDocCard(doc))}
                </Stack>
              </Box>
            )}

            {/* Drop zone for new files */}
            {dropZone}

            {/* New file cards */}
            {newFiles.length > 0 && (
              <Stack spacing={1}>{newFiles.map((f) => renderNewFileCard(f))}</Stack>
            )}

            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* Form-level error */}
            {formError && (
              <Typography color="#dc2626" fontWeight={600}>
                {formError}
              </Typography>
            )}

            {/* Footer row: anonymous + actions */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" color="#475569">
                    Post as anonymous
                  </Typography>
                }
              />

              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: { xs: 2, sm: 0 } }}
              >
                <Button
                  onClick={onClose}
                  variant="contained"
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
                  variant="contained"
                  color="primary"
                  sx={{
                    textTransform: "none",
                    px: 3,
                    borderRadius: 0.7,
                    bgcolor: "#3b82f6",
                    "&:hover": { bgcolor: "#2563eb" },
                  }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save Changes"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditIdeaDialog;