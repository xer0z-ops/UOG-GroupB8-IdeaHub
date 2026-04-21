import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
  ErrorOutline,
  FileUploadOutlined,
  InsertDriveFileOutlined,
  DeleteOutline,
} from "@mui/icons-material";
import {
  createStaffIdea,
  fetchIdeaCategories,
} from "../../services/staffIdeaService";
import useAuth from "../../hooks/useAuth";

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

const PostIdeaDialog = ({ open, onClose, onSubmitted }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  const [categories, setCategories] = useState([]);

  const [files, setFiles] = useState([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategoryId("");
    setDepartmentId("");
    setAcademicYearId("");
    setIsAnonymous(false);
    setHasConsented(false);
    setFiles([]);
    setFormError("");
    setFieldErrors({});
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    // Set academicYearId and departmentId from already-loaded currentUser profile
    setAcademicYearId(
      currentUser?.currentAcademicYear?.id
        ? String(currentUser.currentAcademicYear.id)
        : ""
    );
    setDepartmentId(
      currentUser?.departmentId ? String(currentUser.departmentId) : ""
    );

    let mounted = true;
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const categoryList = await fetchIdeaCategories();
        if (!mounted) return;
        setCategories(categoryList || []);
      } catch (error) {
        if (mounted) {
          setFormError(error?.message || "Unable to load supporting data.");
        }
      } finally {
        if (mounted) {
          setMetaLoading(false);
        }
      }
    };

    loadMeta();
    return () => {
      mounted = false;
    };
  }, [open, resetState, currentUser]);

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
    setFiles((prev) => [...prev, ...validated]);
  }, []);

  const readyFiles = useMemo(
    () => files.filter((item) => item.status === "ready").map((item) => item.file),
    [files],
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

  const removeFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!title.trim()) errors.title = "Idea title is required.";
    if (!description.trim()) errors.description = "Idea description is required.";
    if (!categoryId) errors.category = "Select a category.";
    if (!hasConsented) errors.terms = "Please agree before submitting.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, description, categoryId, hasConsented]);

  const handleSubmit = useCallback(async () => {
    setFormError("");
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createStaffIdea({
        title: title.trim(),
        description: description.trim(),
        academicYearId,
        departmentId,
        categoryIds: [categoryId],
        documents: readyFiles,
        isAnonymous,
      });

      onSubmitted?.();
      onClose?.();
      resetState();
    } catch (error) {
      setFormError(error?.message || "Unable to submit your idea right now.");
    } finally {
      setSubmitting(false);
    }
  }, [
    academicYearId,
    categoryId,
    departmentId,
    description,
    isAnonymous,
    onClose,
    onSubmitted,
    readyFiles,
    resetState,
    title,
    validateForm,
  ]);

  const dropZone = (
    <Box>
      <Typography variant="body2" color="text.primary" mb={1}>
        Upload Document
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
          <Typography component="span" sx={{ color: "#3b82f6", textDecoration: "underline" }}>Upload</Typography> or drag and drop
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
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

  const renderFileCard = (item) => (
    <Box
      key={item.id}
      sx={{
        border: "none",
        p: 1,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <FileUploadOutlined sx={{ color: item.status === "error" ? "#dc2626" : "#3b82f6", fontSize: 24, mt: 0.5 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ color: item.status === "error" ? "#dc2626" : "#334155" }}>
            {item.status === "error" ? "Upload failed." : item.file?.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
            <Typography variant="caption" color={item.status === "error" ? "#dc2626" : "text.secondary"}>
              {item.status === "error" ? "File too large • Failed" : `${item.helper} • Complete`}
            </Typography>
          </Box>
          <Box sx={{ height: 3, width: "100%", bgcolor: item.status === "error" ? "#fecaca" : "#bfdbfe", mt: 1, borderRadius: 0.7 }}>
            <Box sx={{ height: "100%", width: "100%", bgcolor: item.status === "error" ? "#ef4444" : "#3b82f6", borderRadius: 0.7 }} />
          </Box>
        </Box>
        <IconButton size="small" onClick={() => removeFile(item.id)} sx={{ alignSelf: 'center' }}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );

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
            Post My Idea
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
              Idea Title <Typography component="span" color="#dc2626">*</Typography>
            </Typography>
            <TextField
              fullWidth
              value={title}
              placeholder="Improve Online Course Feedback System"
              onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE))}
              error={Boolean(fieldErrors.title)}
              helperText={fieldErrors.title}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.7 } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
              {title.length}/{MAX_TITLE}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
              Tell your idea <Typography component="span" color="#dc2626">*</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              placeholder="A smart, user-friendly feedback system designed to collect meaningful, real-time insights from students about course content, instructors, and learning experience..."
              value={description}
              onChange={(event) =>
                setDescription(event.target.value.slice(0, MAX_DESCRIPTION))
              }
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.7 } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
              {description.length}/{MAX_DESCRIPTION}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="#475569" mb={0.5}>
              Category <Typography component="span" color="#dc2626">*</Typography>
            </Typography>
            <TextField
              select
              fullWidth
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={metaLoading}
              error={Boolean(fieldErrors.category)}
              helperText={fieldErrors.category}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.7 } }}
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



          {dropZone}

          {!!files.length && <Stack spacing={1}>{files.map((file) => renderFileCard(file))}</Stack>}

          <Divider />

          <Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasConsented}
                  onChange={(event) => setHasConsented(event.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="#475569">
                  I Agree to{" "}
                  <Link to="/staff/terms" style={{ color: "#3b82f6" }}>
                    Terms & Conditions
                  </Link>{" "}
                  after Submitting Idea.
                </Typography>
              }
            />
            {fieldErrors.terms && (
              <Typography variant="caption" color="#dc2626" sx={{ ml: 3 }}>
                {fieldErrors.terms}
              </Typography>
            )}
          </Stack>

          <Divider />

          {formError && (
            <Alert
              severity="error"
              icon={<ErrorOutline fontSize="small" />}
              onClose={() => setFormError("")}
              sx={{
                borderRadius: 0.7,
                bgcolor: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                "& .MuiAlert-icon": { color: "#ef4444", alignItems: "center" },
                "& .MuiAlert-message": { fontWeight: 500, fontSize: "0.875rem" },
                "& .MuiAlert-action": { alignItems: "center", pt: 0 },
              }}
            >
              {formError}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAnonymous}
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                />
              }
              label={<Typography variant="body2" color="#475569">Post as anonymous</Typography>}
            />

            <Stack direction="row" spacing={2} sx={{ mt: { xs: 2, sm: 0 } }}>
              <Button onClick={onClose} variant="contained" sx={{ textTransform: "none", bgcolor: "#a1a1aa", color: "#fff", '&:hover': { bgcolor: "#71717a" }, borderRadius: 0.7, px: 3 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                sx={{ textTransform: "none", px: 3, borderRadius: 0.7, bgcolor: "#3b82f6" }}
                onClick={handleSubmit}
                disabled={submitting || metaLoading}
              >
                {submitting ? "Submitting…" : "Submit Idea"}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default PostIdeaDialog;
