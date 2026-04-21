import httpClient from './httpClient';

const normalizeAcademicYearLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace('-', '/');
};

const normalizeAcademicYearPayloadName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Allow entering a single year (e.g. 2026) and convert to 2025-2026.
  if (/^\d{4}$/.test(raw)) {
    const endYear = Number(raw);
    return `${endYear - 1}-${endYear}`;
  }

  return raw.replace('/', '-');
};

const isValidAcademicYearName = (value) => /^\d{4}-\d{4}$/.test(String(value || '').trim());

const normalizeDateForApi = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
};

const mapAcademicYear = (year) => ({
  id: year.id,
  academicYear: normalizeAcademicYearLabel(year.name),
  academicStartDate: year.start_date || year.academicStartDate || null,
  academicEndDate: year.end_date || year.academicEndDate || null,
  ideaClosureDate: year.idea_closure_date || year.ideaClosureDate || null,
  finalClosureDate: year.final_closure_date || year.finalClosureDate || null,
  createdAt: year.created_at || year.createdAt || null,
  updatedAt: year.updated_at || year.updatedAt || null,
});

const getAcademicYearEnd = (label) => {
  const raw = String(label || '').trim();
  const range = raw.match(/(\d{4})\D+(\d{4})/);
  if (range) return Number(range[2]);
  const single = raw.match(/(\d{4})/);
  if (single) return Number(single[1]);
  return null;
};

export const fetchAcademicYears = async ({ page = 1, pageSize = 10 } = {}) => {
  const response = await httpClient.get('/org/academic_years', {
    params: {
      page,
      page_size: pageSize,
    },
  });

  if (!response?.success || !Array.isArray(response?.data?.items)) {
    throw new Error(response?.message || 'Failed to fetch academic years');
  }

  const items = response.data.items.map(mapAcademicYear);
  const pagination = response.data.pagination ?? {};

  const sorted = [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const nameMatched = sorted.find((item) => getAcademicYearEnd(item.academicYear) === currentYear);

  const today = now.toISOString().slice(0, 10);
  const activeCandidate = sorted.find((item) => {
    const idea = (item.ideaClosureDate || '').slice(0, 10);
    const final = (item.finalClosureDate || '').slice(0, 10);
    return idea && final && today >= idea && today <= final;
  });

  const currentId = nameMatched?.id || activeCandidate?.id || sorted[0]?.id;

  return {
    items: sorted.map((item) => ({
      ...item,
      isCurrent: item.id === currentId,
    })),
    pagination: {
      page: pagination.page ?? page,
      pageSize: pagination.page_size ?? pageSize,
      totalItems: pagination.total_items ?? sorted.length,
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

export const updateAcademicYear = async ({
  academicYearId,
  name,
  academicStartDate,
  academicEndDate,
  ideaClosureDate,
  finalClosureDate,
}) => {
  if (!academicYearId) {
    throw new Error('Academic year id is required');
  }

  let normalizedName = name ? normalizeAcademicYearPayloadName(name) : '';

  if (!normalizedName) {
    const listResponse = await httpClient.get('/org/academic_years');
    const items = listResponse?.data?.items;
    const matched = Array.isArray(items)
      ? items.find((item) => Number(item.id) === Number(academicYearId))
      : null;
    normalizedName = matched?.name ? normalizeAcademicYearPayloadName(matched.name) : '';
  }

  if (normalizedName && !isValidAcademicYearName(normalizedName)) {
    throw new Error('Academic year must be a year (e.g. 2026) or range (e.g. 2025-2026)');
  }

  const payload = {
    ...(normalizedName ? { name: normalizedName } : {}),
    ...(academicStartDate ? { start_date: normalizeDateForApi(academicStartDate) } : {}),
    ...(academicEndDate ? { end_date: normalizeDateForApi(academicEndDate) } : {}),
    ...(ideaClosureDate ? { idea_closure_date: normalizeDateForApi(ideaClosureDate) } : {}),
    ...(finalClosureDate ? { final_closure_date: normalizeDateForApi(finalClosureDate) } : {}),
  };

  const response = await httpClient.put(`/org/academic_years/${academicYearId}`, payload);

  if (!response?.success || !response?.data?.academic_year) {
    throw new Error(response?.message || 'Failed to update academic year');
  }

  return mapAcademicYear(response.data.academic_year);
};

export const createAcademicYear = async ({
  name,
  academicStartDate,
  academicEndDate,
  ideaClosureDate,
  finalClosureDate,
}) => {
  const normalizedName = normalizeAcademicYearPayloadName(name);
  if (!isValidAcademicYearName(normalizedName)) {
    throw new Error('Academic year must be a year (e.g. 2026) or range (e.g. 2025-2026)');
  }

  const payload = {
    name: normalizedName,
    start_date: normalizeDateForApi(academicStartDate),
    end_date: normalizeDateForApi(academicEndDate),
    idea_closure_date: normalizeDateForApi(ideaClosureDate),
    final_closure_date: normalizeDateForApi(finalClosureDate),
  };

  const response = await httpClient.post('/org/academic_years', payload);

  if (!response?.success || !response?.data?.academic_year) {
    throw new Error(response?.message || 'Failed to create academic year');
  }

  return mapAcademicYear(response.data.academic_year);
};

export const deleteAcademicYear = async (academicYearId) => {
  if (!academicYearId) {
    throw new Error('Academic year id is required');
  }

  const response = await httpClient.delete(`/org/academic_years/${academicYearId}`);

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to delete academic year');
  }

  return response;
};
