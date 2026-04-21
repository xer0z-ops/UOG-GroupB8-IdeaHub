import { useEffect, useState, useCallback, useMemo } from "react";
import useAuth from "../../hooks/useAuth.js";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,

  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import PostIdeaDialog from "../../components/staff/PostIdeaDialog.jsx";
import IdeaDetailsDialog from "../../components/staff/IdeaDetailsDialog.jsx";
import EditIdeaDialog from "../../components/staff/EditIdeaDialog.jsx";
import DeleteIdeaConfirmDialog from "../../components/staff/DeleteIdeaConfirmDialog.jsx";
import ReportIdeaDialog from "../../components/staff/ReportIdeaDialog.jsx";
import IdeaRow from "../../components/staff/IdeaRow.jsx";
import { fetchIdeaCategories, deleteIdea } from "../../services/staffIdeaService";
import { fetchAcademicYears } from "../../services/academicYearService.js";

const SORT_OPTIONS = ["Latest Idea", "Latest Comment", "Most Popular", "Most Viewed"];
const SORT_MAPPING = {
  "Latest Idea": "latest_idea",
  "Latest Comment": "latest_comment",
  "Most Popular": "most_popular",
  "Most Viewed": "most_viewed"
};
const ALL_CATEGORY = { id: null, name: "All Ideas" };


const DEFAULT_FILTERS = {
  searchInput: "",
  selectedCategory: ALL_CATEGORY,
  selectedAcademicYear: "",
  sortBy: SORT_OPTIONS[0],
};

const IdeasListPage = ({ fetchFn, title = "Ideas", myRole }) => {
  const { currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.searchInput);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_FILTERS.selectedCategory);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(DEFAULT_FILTERS.selectedAcademicYear);
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [sortBy, setSortBy] = useState(DEFAULT_FILTERS.sortBy);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [isPostIdeaOpen, setIsPostIdeaOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [editingIdea, setEditingIdea] = useState(null);
  const [deletingIdea, setDeletingIdea] = useState(null);
  const [reportingIdea, setReportingIdea] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Idea submitted successfully!");
  const [toastSeverity, setToastSeverity] = useState("success");
  const isQACoordinator = myRole === "qa_coordinator"
  const now = new Date();
  const isIdeaClosed = currentUser?.currentAcademicYear?.ideaClosureDate
    ? now > new Date(currentUser.currentAcademicYear.ideaClosureDate)
    : false;
  const isFinalClosed = currentUser?.currentAcademicYear?.finalClosureDate
    ? now > new Date(currentUser.currentAcademicYear.finalClosureDate)
    : false;

  const [categories, setCategories] = useState([ALL_CATEGORY]);
  const [ideas, setIdeas] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Load categories once 
  useEffect(() => {
    fetchIdeaCategories()
      .then((cats) => setCategories([ALL_CATEGORY, ...cats]))
      .catch(() => { });
  }, []);

  const loadIdeas = useCallback(
    async (
      pageToLoad = 1,
      sizeToLoad = 5,
      search = "",
      categoryId = null,
      sortValue = SORT_OPTIONS[0],
      academicYearId = null,
    ) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await fetchFn({
          page: pageToLoad,
          pageSize: sizeToLoad,
          search,
          categoryId,
          sortBy: SORT_MAPPING[sortValue] || SORT_MAPPING["Latest Idea"],
          academicYearId,
        });
        setIdeas(result.items || []);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev,
        });
      } catch (err) {
        setLoadError(err.message || "Something went wrong fetching ideas.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFn],
  );

  useEffect(() => {
    loadIdeas(1, 5, "", null, DEFAULT_FILTERS.sortBy, DEFAULT_FILTERS.selectedAcademicYear);
  }, [loadIdeas]);

  const handleApplyFilters = () => {
    const next = { searchInput, selectedCategory, selectedAcademicYear, sortBy };
    setAppliedFilters(next);
    loadIdeas(1, pagination.pageSize, searchInput, selectedCategory.id, sortBy, selectedAcademicYear || null);
  };

  const handleResetFilters = () => {
    setSearchInput(DEFAULT_FILTERS.searchInput);
    setSelectedCategory(DEFAULT_FILTERS.selectedCategory);
    setSelectedAcademicYear(DEFAULT_FILTERS.selectedAcademicYear);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setAppliedFilters(DEFAULT_FILTERS);
    loadIdeas(1, pagination.pageSize, "", null, DEFAULT_FILTERS.sortBy, DEFAULT_FILTERS.selectedAcademicYear);
  };

  // Show Reset only when the *applied* filters differ from defaults
  const isFiltersActive =
    appliedFilters.searchInput.trim() !== "" ||
    appliedFilters.selectedCategory.id !== null ||
    appliedFilters.selectedAcademicYear !== "" ||
    appliedFilters.sortBy !== DEFAULT_FILTERS.sortBy;

  const handleCategorySelect = (e) => {
    const selectedCat = categories.find((c) => c.id === e.target.value) || ALL_CATEGORY;
    setSelectedCategory(selectedCat);
  };

  useEffect(() => {
    let isMounted = true;
    const loadAcademicYears = async () => {
      try {
        const result = await fetchAcademicYears({ pageSize: 200 });
        if (isMounted) {
          setAcademicYearOptions(
            (result.items || []).map((year) => ({ id: year.id, label: year.academicYear })),
          );
        }
      } catch {
        if (isMounted) setAcademicYearOptions([]);
      }
    };
    loadAcademicYears();
    return () => { isMounted = false; };
  }, []);


  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") handleApplyFilters();
  };

  const handlePageChange = (delta) => {
    const nextPage = pagination.page + delta;
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    loadIdeas(
      nextPage,
      pagination.pageSize,
      appliedFilters.searchInput,
      appliedFilters.selectedCategory.id,
      appliedFilters.sortBy,
      appliedFilters.selectedAcademicYear || null,
    );
  };

  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    if (totalPages > 0) pages.push(1);

    if (totalPages <= 5) {
      for (let i = 2; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
      pages.push(2, 3, 4, "...", totalPages);
    } else if (page >= totalPages - 2) {
      pages.push("...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push("...", page - 1, page, page + 1, "...", totalPages);
    }

    return [...new Set(pages)].filter((p) => p !== undefined && p !== null);
  };

  const handleIdeaSubmitted = async () => {
    setSuccessMessage("Idea submitted successfully!");
    setShowSuccessToast(true);
    setIsPostIdeaOpen(false);
    await loadIdeas(
      1,
      pagination.pageSize,
      appliedFilters.searchInput,
      appliedFilters.selectedCategory.id,
      appliedFilters.sortBy,
      appliedFilters.selectedAcademicYear || null,
    );
  };

  const handleIdeaUpdated = async () => {
    setSuccessMessage("Idea updated successfully!");
    setShowSuccessToast(true);
    setEditingIdea(null);
    await loadIdeas(
      pagination.page,
      pagination.pageSize,
      appliedFilters.searchInput,
      appliedFilters.selectedCategory.id,
      appliedFilters.sortBy,
      appliedFilters.selectedAcademicYear || null,
    );
  };

  const handleIdeaReported = () => {
    setSuccessMessage("Idea reported successfully!");
    setShowSuccessToast(true);
    setReportingIdea(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingIdea?.id) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteIdea(deletingIdea.id);
      setDeletingIdea(null);
      setSuccessMessage("Idea deleted successfully!");
      setShowSuccessToast(true);
      // If the current page would be empty after deletion, go back one page
      const itemsOnPage = ideas.length;
      const targetPage =
        itemsOnPage === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;
      await loadIdeas(
        targetPage,
        pagination.pageSize,
        appliedFilters.searchInput,
        appliedFilters.selectedCategory.id,
        appliedFilters.sortBy,
        appliedFilters.selectedAcademicYear || null,
      );
    } catch (err) {
      setDeleteError(err?.message || "Unable to delete the idea. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    if (isDeleting) return;
    setDeletingIdea(null);
    setDeleteError("");
  };

  const handleThumbChange = useCallback((ideaId, thumbState) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? {
            ...idea,
            thumbUpCount: thumbState.upCount,
            thumbDownCount: thumbState.downCount,
            currentUserThumb: thumbState.current,
          }
          : idea,
      ),
    );
  }, []);

  const handleCommentCountChange = useCallback((ideaId, newCount) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId ? { ...idea, commentCount: newCount } : idea,
      ),
    );
  }, []);

  const handleViewCountChange = useCallback((ideaId, newCount) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId ? { ...idea, viewCount: newCount } : idea,
      ),
    );
  }, []);

  const handleSnackbarClose = (_, reason) => {
    if (reason === "clickaway") return;
    setShowSuccessToast(false);
    setToastSeverity("success");
  };



  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
      <PostIdeaDialog
        open={isPostIdeaOpen}
        onClose={() => setIsPostIdeaOpen(false)}
        onSubmitted={handleIdeaSubmitted}
      />
      <EditIdeaDialog
        open={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        onUpdated={handleIdeaUpdated}
        idea={editingIdea}
      />
      <DeleteIdeaConfirmDialog
        open={!!deletingIdea}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        idea={deletingIdea}
        deleting={isDeleting}
        error={deleteError}
      />
      <IdeaDetailsDialog
        open={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
        onThumbChange={handleThumbChange}
        onCommentCountChange={handleCommentCountChange}
        onViewCountChange={handleViewCountChange}
        idea={selectedIdea}
        isQACoordinator = {isQACoordinator}
        isFinalClosed={isFinalClosed}
      />
      <ReportIdeaDialog
        open={!!reportingIdea}
        onClose={() => setReportingIdea(null)}
        idea={reportingIdea}
        onReported={handleIdeaReported}
      />



      {/* Search / Filter Bar */}
      <Box
        elevation={0}
        sx={{
          borderRadius: 1,
          px: 0,
          py: 0,
          mb: 1,
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              flexGrow: 1,
              flexWrap: "wrap",
              rowGap: 2,
              // justifyContent: { xs: "flex-end", md: "flex-start" },
              justifyContent: "flex-end",
            }}
          >
            <TextField
              placeholder="Search ideas..."
              size="small"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              fullWidth
              sx={{
                flex: 1,
                minWidth: { xs: "100%", sm: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0.7,
                },
              }}
            />
            <TextField
              select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0.7,
                },
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
              <TextField
              select
              size="small"
              value={selectedCategory.id || "all"}
              onChange={handleCategorySelect}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0.7,
                },
              }}
            >
              <MenuItem value="all">{ALL_CATEGORY.name}</MenuItem>
              {categories.filter(c => c.id !== null).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            {isQACoordinator ? 
            <TextField
              select
              size="small"
              value={selectedAcademicYear || "all"}
              onChange={(e) => setSelectedAcademicYear(e.target.value === "all" ? "" : e.target.value)}
              sx={{
                minWidth: { xs: "100%", sm: 180 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0.7,
                },
              }}
            >
              <MenuItem value="all">All Academic Years</MenuItem>
              {academicYearOptions.map((year) => (
                <MenuItem key={year.id} value={year.id}>
                  {year.label}
                </MenuItem>
              ))}
            </TextField>
            : ''
            }
            
            <Button
              variant="contained"
              sx={{
                textTransform: "none",
                borderRadius: 0.7,
                minWidth: 120,
                width: { xs: "100%", sm: "auto" },
                bgcolor: "#3b82f6",
                "&:hover": { bgcolor: "#2563eb" }
              }}
              onClick={handleApplyFilters}
            >
              { isQACoordinator ? "Search" : "Apply Filters"}
            </Button>
            {isFiltersActive && (
              <Button
                variant="outlined"
                sx={{
                  textTransform: "none",
                  borderRadius: 0.7,
                  minWidth: 120,
                  width: { xs: "100%", sm: "auto" },
                  borderColor: "#2563eb", color: "#2563eb",
                  "&:hover": { borderColor: "#2563eb", bgcolor: "#f8fafc" }
                }}
                onClick={handleResetFilters}
              >
                { isQACoordinator ? "Clear" : "Reset Filters"}
              </Button>
            )}
          </Stack>
          {!isQACoordinator && (
            <Button
              variant="contained"
              startIcon={<Add />}
              disabled={isIdeaClosed || isFinalClosed}
              sx={{
                minWidth: 160, borderRadius: 0.7, textTransform: "none",
                bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" },
                "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
              }}
              onClick={() => setIsPostIdeaOpen(true)}
            >
              Post My Idea
            </Button>
          )}
          
        </Stack>
      </Box>

      {/* Ideas List */}
      {isLoading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      ) : ideas.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px dashed #e5e7eb" }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No ideas found
          </Typography>
              {
                isQACoordinator ? <Typography variant="body2" color="text.secondary" gutterBottom>
                  Try adjusting your filters.
                </Typography> :
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Try adjusting your filters or submit a new idea to get started.
                  </Typography>
              }
          
          {!isQACoordinator && <Button
            variant="contained"
            startIcon={<Add />}
            disabled={isIdeaClosed || isFinalClosed}
            sx={{
              mt: 2, borderRadius: 0.7, textTransform: "none",
              bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" },
              "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
            }}
            onClick={() => setIsPostIdeaOpen(true)}
          >
            Post New Idea
          </Button>}
          
        </Paper>
      ) : (
        ideas.map((idea) => (
          <IdeaRow
            key={idea.id}
            idea={idea}
            currentUser={currentUser}
            onOpen={(i) => setSelectedIdea(i)}
            onEdit={(i) => setEditingIdea(i)}
            onDelete={(i) => {
              setDeleteError("");
              setDeletingIdea(i);
            }}
            onReport={(i) => setReportingIdea(i)}
            onThumbChange={handleThumbChange}
            onError={(msg) => {
              setToastSeverity("error");
              setSuccessMessage(msg);
              setShowSuccessToast(true);
            }}
            isQACoordinator={isQACoordinator}
            isFinalClosed={isFinalClosed}
          />
        ))
      )}

      {/* Pagination */}
      <Box
        sx={{
          mt: 1,
          borderRadius: 1,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          px: { xs: 2.5, lg: 3.5 },
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="body2" fontWeight={600} color="#475569">
          Showing {ideas.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0} to{" "}
          {(pagination.page - 1) * pagination.pageSize + ideas.length} of{" "}
          {pagination.totalItems ?? 0} ideas
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" disabled={!pagination.hasPrev} onClick={() => handlePageChange(-1)}>
            <Typography fontWeight={700}>‹</Typography>
          </IconButton>
          {getPageNumbers().map((page, i) =>
            page === "..." ? (
              <Typography key={`ellipsis-${i}`} variant="body2" color="text.secondary" sx={{ px: 1 }}>
                ...
              </Typography>
            ) : (
              <Button
                key={page}
                size="small"
                sx={{
                  minWidth: 32,
                  height: 32,
                  p: 0,
                  bgcolor: page === pagination.page ? "#3b82f6" : "#f1f5f9",
                  color: page === pagination.page ? "#fff" : "#64748b",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor: page === pagination.page ? "#2563eb" : "#e2e8f0",
                  },
                }}
                onClick={() =>
                  loadIdeas(
                    page,
                    pagination.pageSize,
                    appliedFilters.searchInput,
                    appliedFilters.selectedCategory.id,
                    appliedFilters.sortBy,
                    appliedFilters.selectedAcademicYear || null,
                  )
                }
              >
                {page}
              </Button>
            ),
          )}
          <IconButton size="small" disabled={!pagination.hasNext} onClick={() => handlePageChange(1)}>
            <Typography fontWeight={700}>›</Typography>
          </IconButton>
        </Stack>
      </Box>

      <Snackbar
        open={showSuccessToast}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={toastSeverity} variant="filled" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IdeasListPage;
