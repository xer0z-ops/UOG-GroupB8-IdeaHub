import httpClient from "./httpClient";

const mapCategory = (category) => ({
  id: category?.id ?? category?.category_id ?? null,
  name: category?.name ?? category?.title ?? "Unnamed Category",
});

const mapDepartment = (department) => ({
  id: department?.id ?? department?.department_id ?? null,
  name: department?.name ?? department?.title ?? "Unnamed Department",
});

const ensureArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const isFileConstructorAvailable = typeof File !== "undefined";
const isBlobConstructorAvailable = typeof Blob !== "undefined";

export const fetchIdeaCategories = async () => {
  const response = await httpClient.get("/ideas/categories");

  const rawItems =
    response?.data?.items ??
    response?.data?.categories ??
    response?.data ??
    [];
    
  //console.log('raw categories ', rawItems)

  if (!response?.success || !Array.isArray(rawItems)) {
    throw new Error(response?.message || "Failed to fetch idea categories");
  }

  return rawItems.map(mapCategory);
};

export const fetchStaffDepartments = async () => {
  const response = await httpClient.get("/org/departments");

  const rawItems =
    response?.data?.items ??
    response?.data?.departments ??
    response?.data ??
    [];

  if (!response?.success || !Array.isArray(rawItems)) {
    throw new Error(response?.message || "Failed to fetch departments");
  }

  return rawItems.map(mapDepartment);
};

export const fetchStaffIdeas = async ({
  page = 1,
  pageSize = 10,
  search = "",
  categoryId = null,
  sortBy = null,
  departmentId = null,
  academicYearId = null,
} = {}) => {
  const response = await httpClient.get("/ideas/ideas", {
    params: {
      page,
      page_size: pageSize,
      ...(search ? { search } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(sortBy ? { sort_by: sortBy } : {}),
      ...(departmentId ? { department_id: departmentId } : {}),
      ...(academicYearId ? { academic_year_id: academicYearId } : {}),
    },
  });

  if (!response?.success || !Array.isArray(response?.data?.items)) {
    throw new Error(response?.message || "Failed to fetch ideas");
  }

  const items = response.data.items.map((idea) => ({
    id: idea.id,
    title: idea.title ?? "",
    description: idea.description ?? "",
    isAnonymous: Boolean(idea.is_anonymous),
    author: idea.is_anonymous
      ? { id: null, name: "Anonymous", email: null }
      : {
          id: idea.user?.id ?? idea.user_id ?? null,
          name: idea.user?.full_name ?? idea.user?.name ?? "Unknown User",
          email: idea.user?.email ?? null,
        },
    authorId: idea.user_id,
    department: idea.department ?? null,
    academicYear: idea.academic_year
      ? {
          id: idea.academic_year?.id ?? null,
          name: idea.academic_year?.name ?? null,
          startDate: idea.academic_year?.start_date ?? null,
          endDate: idea.academic_year?.end_date ?? null,
          ideaClosureDate: idea.academic_year?.idea_closure_date ?? null,
          finalClosureDate: idea.academic_year?.final_closure_date ?? null,
        }
      : null,
    status: idea.status ?? null,
    categories: Array.isArray(idea.categories)
      ? idea.categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      : [],
    documents: Array.isArray(idea.documents)
      ? idea.documents.map((doc) => ({
          id: doc.id,
          name: doc.file_name,
          mimeType: doc.mime_type,
          inlineUrl: doc.inline_url,
          downloadUrl: doc.download_url,
        }))
      : [],
    createdAt: idea.created_at ?? null,
    viewCount: idea.view_count ?? 0,
    thumbSummary: idea.thumb_summary ?? { up: 0, down: 0 },
    thumbUpCount: idea.thumb_up_count ?? 0,
    thumbDownCount: idea.thumb_down_count ?? 0,
    commentCount: idea.comment_count ?? 0,
    currentUserThumb: idea.current_user_thumb ?? null,
    reportCount: idea.report_count ?? 0,
  }));

  const pagination = response.data.pagination ?? {};
  return {
    items,
    pagination: {
      page: pagination.page ?? page,
      pageSize: pagination.page_size ?? pageSize,
      totalItems: pagination.total_items ?? items.length,
      totalPages: pagination.total_pages ?? 1,
      hasNext: Boolean(
        pagination.has_next ?? (pagination.page ?? page) < (pagination.total_pages ?? 1),
      ),
      hasPrev: Boolean(
        pagination.has_prev ?? (pagination.page ?? page) > 1,
      ),
    },
  };
};

export const fetchDepartmentIdeas = async ({
  departmentId,
  page = 1,
  pageSize = 10,
  search = "",
  categoryId = null,
  sortBy = null,
  academicYearId = null,
} = {}) => {
  if (!departmentId) {
    return fetchStaffIdeas({ page, pageSize, search, categoryId, sortBy, academicYearId });
  }
  return fetchStaffIdeas({ page, pageSize, search, categoryId, sortBy, departmentId, academicYearId });
};

export const fetchMyIdeas = async ({
  page = 1,
  pageSize = 10,
  search = "",
  categoryId = null,
  sortBy = null,
  academicYearId = null,
} = {}) => {
  const response = await httpClient.get("/ideas/ideas/mine", {
    params: {
      page,
      page_size: pageSize,
      ...(search ? { search } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(sortBy ? { sort_by: sortBy } : {}),
      ...(academicYearId ? { academic_year_id: academicYearId } : {}),
    },
  });

  if (!response?.success || !Array.isArray(response?.data?.items)) {
    throw new Error(response?.message || "Failed to fetch your ideas");
  }

  const items = response.data.items.map((idea) => ({
    id: idea.id,
    title: idea.title ?? "",
    description: idea.description ?? "",
    isAnonymous: Boolean(idea.is_anonymous),
    author: idea.is_anonymous
      ? { id: null, name: "Anonymous", email: null }
      : {
          id: idea.user?.id ?? idea.user_id ?? null,
          name: idea.user?.full_name ?? idea.user?.name ?? "Unknown User",
          email: idea.user?.email ?? null,
        },
    authorId: idea.user_id,
    department: idea.department ?? null,
    academicYear: idea.academic_year
      ? {
          id: idea.academic_year?.id ?? null,
          name: idea.academic_year?.name ?? null,
          startDate: idea.academic_year?.start_date ?? null,
          endDate: idea.academic_year?.end_date ?? null,
          ideaClosureDate: idea.academic_year?.idea_closure_date ?? null,
          finalClosureDate: idea.academic_year?.final_closure_date ?? null,
        }
      : null,
    status: idea.status ?? null,
    categories: Array.isArray(idea.categories)
      ? idea.categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      : [],
    documents: Array.isArray(idea.documents)
      ? idea.documents.map((doc) => ({
          id: doc.id,
          name: doc.file_name,
          mimeType: doc.mime_type,
          inlineUrl: doc.inline_url,
          downloadUrl: doc.download_url,
        }))
      : [],
    createdAt: idea.created_at ?? null,
    viewCount: idea.view_count ?? 0,
    thumbSummary: idea.thumb_summary ?? { up: 0, down: 0 },
    thumbUpCount: idea.thumb_up_count ?? 0,
    thumbDownCount: idea.thumb_down_count ?? 0,
    commentCount: idea.comment_count ?? 0,
    currentUserThumb: idea.current_user_thumb ?? null,
  }));

  const pagination = response.data.pagination ?? {};
  return {
    items,
    pagination: {
      page: pagination.page ?? page,
      pageSize: pagination.page_size ?? pageSize,
      totalItems: pagination.total_items ?? items.length,
      totalPages: pagination.total_pages ?? 1,
      hasNext: Boolean(
        pagination.has_next ?? (pagination.page ?? page) < (pagination.total_pages ?? 1),
      ),
      hasPrev: Boolean(
        pagination.has_prev ?? (pagination.page ?? page) > 1,
      ),
    },
  };
};

export const createStaffIdea = async ({
  title,
  description,
  academicYearId,
  departmentId,
  categoryIds,
  documents,
  isAnonymous = false,
} = {}) => {
  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();

  if (!trimmedTitle) {
    throw new Error("Idea title is required");
  }

  if (!trimmedDescription) {
    throw new Error("Idea description is required");
  }

  const formData = new FormData();
  formData.append("title", trimmedTitle);
  formData.append("description", trimmedDescription);
  formData.append("descripton", trimmedDescription);
  appendIfPresent(formData, "academic_year_id", academicYearId ?? "");
  appendIfPresent(formData, "department_id", departmentId ?? "");
  formData.append("is_anonymous", isAnonymous ? "1" : "0");

  ensureArray(categoryIds).forEach((categoryId) => {
    if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
      formData.append("category_ids", categoryId);
    }
  });

  ensureArray(documents).forEach((file) => {
    const isFileObject = isFileConstructorAvailable && file instanceof File;
    const isBlobObject = isBlobConstructorAvailable && file instanceof Blob;
    if (isFileObject || isBlobObject) {
      formData.append("documents", file);
    }
  });

  const response = await httpClient.post("/ideas/ideas/create", formData);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to create idea");
  }

  return response?.data?.idea ?? response?.data ?? response;
};

export const fetchIdeaDetails = async (id) => {
  if (!id) throw new Error("Idea ID is required");
  
  const response = await httpClient.get(`/ideas/ideas/${id}`);

  if (!response?.success || !response?.data?.idea) {
    throw new Error(response?.message || "Failed to fetch idea details");
  }

  const idea = response.data.idea;
  return {
    id: idea.id,
    title: idea.title ?? "",
    description: idea.description ?? "",
    isAnonymous: Boolean(idea.is_anonymous),
    author: idea.is_anonymous
      ? { id: null, name: "Anonymous User", email: null }
      : {
          id: idea.user?.id ?? idea.user_id ?? null,
          name: idea.user?.full_name ?? idea.user?.name ?? "Unknown User",
          email: idea.user?.email ?? null,
          statusId: idea.user?.status?.id ?? idea.user?.status_id ?? null,
          statusName: idea.user?.status?.name ?? idea.user?.status_name ?? "",
        },
    department: idea.department ?? null,
    academicYear: idea.academic_year ?? null,
    status: idea.status ?? null,
    categories: Array.isArray(idea.categories)
      ? idea.categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      : [],
    documents: Array.isArray(idea.documents)
      ? idea.documents.map((doc) => ({
          id: doc.id,
          name: doc.file_name,
          mimeType: doc.mime_type,
          inlineUrl: doc.inline_url,
          downloadUrl: doc.download_url,
        }))
      : [],
    createdAt: idea.created_at ?? null,
    viewCount: idea.view_count ?? 0,
    thumbSummary: idea.thumb_summary ?? { up: 0, down: 0 },
    thumbUpCount: idea.thumb_up_count ?? idea.thumb_summary?.up ?? 0,
    thumbDownCount: idea.thumb_down_count ?? idea.thumb_summary?.down ?? 0,
    currentUserThumb: idea.current_user_thumb ?? null,
  };
};

export const fetchIdeaComments = async (id) => {
  if (!id) throw new Error("Idea ID is required");

  const response = await httpClient.get(`/ideas/ideas/${id}/comments`);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to fetch idea comments");
  }

  const rawComments = response?.data?.comments || [];
  
  return rawComments.map((comment) => ({
    id: comment.id,
    content: comment.comment_text,
    isAnonymous: Boolean(comment.is_anonymous),
    authorId: comment.user?.id ?? null,
    author: comment.is_anonymous
      ? { id: null, name: "Anonymous User", email: null }
      : {
          id: comment.user?.id ?? null,
          name: comment.user?.full_name ?? "Unknown User",
          email: comment.user?.email ?? null,
        },
    status: comment.status,
    createdAt: comment.created_at,
    likes: 0, // Placeholder as per API, add later if thumb_summary exists for comments
    replies: 0,
  }));
};

export const postThumbReaction = async (ideaId, voteType) => {
  if (!ideaId) throw new Error("Idea ID is required");
  if (voteType !== "thumb_up" && voteType !== "thumb_down") {
    throw new Error("vote_type must be 'thumb_up' or 'thumb_down'");
  }

  const response = await httpClient.post(`/ideas/ideas/${ideaId}/thumbs`, {
    vote_type: voteType,
  });

  if (!response?.success) {
    throw new Error(response?.message || "Failed to submit reaction");
  }

  return response?.data ?? response;
};

export const deleteThumbReaction = async (ideaId) => {
  if (!ideaId) throw new Error("Idea ID is required");

  const response = await httpClient.delete(`/ideas/ideas/${ideaId}/thumbs`);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to remove reaction");
  }

  return response?.data ?? response;
};

export const reportIdea = async (ideaId, reason) => {
  if (!ideaId) throw new Error("Idea ID is required");
  if (!reason?.trim()) throw new Error("Report reason is required");

  // Endpoint specified by user: http://127.0.0.1:8000/api/ideas/ideas/1/report
  const response = await httpClient.post(`/ideas/ideas/${ideaId}/report`, {
    reason: reason.trim(),
  });

  if (!response?.success) {
    throw new Error(response?.message || "Failed to report idea");
  }

  return response?.data ?? response;
};

export const updateIdea = async (id, {
  title,
  description,
  categoryIds,
  isAnonymous,
} = {}) => {
  if (!id) throw new Error("Idea ID is required");

  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();

  if (!trimmedTitle) throw new Error("Idea title is required");
  if (!trimmedDescription) throw new Error("Idea description is required");

  const payload = {
    title: trimmedTitle,
    description: trimmedDescription,
    is_anonymous: Boolean(isAnonymous),
    category_ids: ensureArray(categoryIds).filter(
      (cid) => cid !== undefined && cid !== null && cid !== "",
    ),
  };

  const response = await httpClient.patch(`/ideas/ideas/${id}`, payload);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to update idea");
  }

  return response?.data?.idea ?? response?.data ?? response;
};

export const uploadIdeaDocuments = async (ideaId, files = []) => {
  if (!ideaId) throw new Error("Idea ID is required");

  const validFiles = ensureArray(files).filter((file) => {
    const isFileObject = isFileConstructorAvailable && file instanceof File;
    const isBlobObject = isBlobConstructorAvailable && file instanceof Blob;
    return isFileObject || isBlobObject;
  });

  if (!validFiles.length) return null;

  const formData = new FormData();
  validFiles.forEach((file) => formData.append("documents", file));

  const response = await httpClient.post(`/ideas/ideas/${ideaId}/documents`, formData);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to upload documents");
  }

  return response?.data ?? response;
};

export const deleteIdeaDocument = async (documentId) => {
  if (!documentId) throw new Error("Document ID is required");

  const response = await httpClient.delete(`/ideas/documents/${documentId}`);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to delete document");
  }

  return response?.data ?? response;
};

export const deleteIdea = async (id) => {
  if (!id) throw new Error("Idea ID is required");

  const response = await httpClient.delete(`/ideas/ideas/${id}`);

  if (!response?.success) {
    throw new Error(response?.message || "Failed to delete idea");
  }

  return response?.data ?? response;
};

export const postIdeaComment = async (id, { commentText, isAnonymous = false }) => {
  if (!id) throw new Error("Idea ID is required");
  if (!commentText?.trim()) throw new Error("Comment text is required");

  const response = await httpClient.post(`/ideas/ideas/${id}/comments`, {
    comment_text: commentText.trim(),
    is_anonymous: Boolean(isAnonymous),
  });

  if (!response?.success) {
    throw new Error(response?.message || "Failed to post comment");
  }

  const comment = response?.data?.comment || {};
  return {
    id: comment.id,
    content: comment.comment_text,
    isAnonymous: Boolean(comment.is_anonymous),
    authorId: comment.user?.id ?? null,
    author: comment.is_anonymous
      ? { id: null, name: "Anonymous User", email: null }
      : {
          id: comment.user?.id ?? null,
          name: comment.user?.full_name ?? "Unknown User",
          email: comment.user?.email ?? null,
        },
    status: comment.status,
    createdAt: comment.created_at,
    likes: 0,
    replies: 0,
  };
};
