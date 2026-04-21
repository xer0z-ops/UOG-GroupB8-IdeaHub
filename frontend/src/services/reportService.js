import httpClient from './httpClient';

const API_BASE_URL =
  (typeof window !== 'undefined' && window.__env__?.VITE_API_BASE_URL) ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://52.237.118.127:31183/api';

const getAuthHeaders = () => {
  try {
    const raw = sessionStorage.getItem('qa_platform_tokens');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const token = parsed?.accessToken ?? parsed?.access_token ?? null;
    const tokenType = parsed?.tokenType ?? parsed?.token_type ?? 'Bearer';
    return token ? { Authorization: `${tokenType} ${token}` } : {};
  } catch {
    return {};
  }
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'download';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const parseFilenameFromContentDisposition = (header) => {
  if (!header) return null;
  const match =
    /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header) ||
    /filename="?([^";]+)"?/i.exec(header);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
};

const parseMultipartMixed = async (response, boundary) => {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();

  // Encode delimiters as bytes so we never decode binary body data
  const delimiter = encoder.encode(`--${boundary}`);
  const CRLF = encoder.encode('\r\n');
  const CRLFCRLF = encoder.encode('\r\n\r\n');

  const indexOf = (haystack, needle, start = 0) => {
    outer: for (let i = start; i <= haystack.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  };

  const results = [];
  let pos = 0;

  while (pos < bytes.length) {
    // Find next boundary
    const boundaryStart = indexOf(bytes, delimiter, pos);
    if (boundaryStart === -1) break;

    pos = boundaryStart + delimiter.length;

    // Check for terminal boundary (--)
    if (bytes[pos] === 0x2d && bytes[pos + 1] === 0x2d) break;

    // Skip the CRLF after the boundary line
    if (bytes[pos] === 0x0d && bytes[pos + 1] === 0x0a) pos += 2;
    else if (bytes[pos] === 0x0a) pos += 1;

    // Find the header/body separator (first blank line = CRLFCRLF)
    const headerEnd = indexOf(bytes, CRLFCRLF, pos);
    if (headerEnd === -1) break;

    // Parse headers as text (headers are always ASCII/UTF-8)
    const headerText = decoder.decode(bytes.slice(pos, headerEnd));
    const headers = {};
    for (const line of headerText.split(/\r?\n/)) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      headers[line.slice(0, colonIndex).trim().toLowerCase()] = line.slice(colonIndex + 1).trim();
    }

    // Body starts after CRLFCRLF
    const bodyStart = headerEnd + CRLFCRLF.length;

    // Body ends at the next boundary (preceded by CRLF)
    const nextBoundary = indexOf(bytes, delimiter, bodyStart);
    if (nextBoundary === -1) break;

    // Strip the trailing CRLF before the boundary
    let bodyEnd = nextBoundary;
    if (bytes[bodyEnd - 2] === 0x0d && bytes[bodyEnd - 1] === 0x0a) bodyEnd -= 2;
    else if (bytes[bodyEnd - 1] === 0x0a) bodyEnd -= 1;

    // Slice the raw bytes — no text decoding, no re-encoding, binary safe
    const bodyBytes = bytes.slice(bodyStart, bodyEnd);

    const contentType = headers['content-type'] || 'application/octet-stream';
    const filename = parseFilenameFromContentDisposition(headers['content-disposition']) || 'download';
    const blob = new Blob([bodyBytes], { type: contentType });

    results.push({ filename, blob, contentType });

    pos = nextBoundary;
  }

  return results;
};

//for statistics charts
const normalizeItem = (item) => ({
  department: item.department || item.department_name || item.departmentName || 'Unknown',
  academicYear: item.academic_year || item.academicYear || '',
  ideaCount: item.idea_count ?? item.ideaCount ?? 0,
  contributorCount: item.contributor_count ?? item.contributorCount ?? 0,
  percentage: item.percentage ?? item.percent ?? 0,
});

export const fetchReportStatistics = async (academicYear) => {
  const params = academicYear ? { academic_year: academicYear } : undefined;
  const response = await httpClient.get('/reports/statistics', { params });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch report statistics');
  }

  const data = response.data;
  const ideasRaw = data.ideas_per_department || data.ideasPerDepartment || [];
  const contributorsRaw = data.contributors_per_department || data.contributorsPerDepartment || [];

  return {
    ideasPerDepartment: Array.isArray(ideasRaw) ? ideasRaw.map(normalizeItem) : [],
    contributorsPerDepartment: Array.isArray(contributorsRaw) ? contributorsRaw.map(normalizeItem) : [],
  };
};

const normalizeCategoryItem = (item) => ({
  category: item.category || item.category_name || item.categoryName || 'Unknown',
  ideaCount: item.idea_count ?? item.ideaCount ?? 0,
  percentage: item.percentage ?? item.percent ?? 0,
});

const normalizeContribution = (item) => ({
  academicYear: item.academic_year || item.academicYear || '',
  contributedCount: item.contributed_count ?? item.contributedCount ?? 0,
  notContributedCount: item.not_contributed_count ?? item.notContributedCount ?? 0,
  totalUserCount: item.total_user_count ?? item.totalUserCount ?? 0,
  contributedPercentage: item.contributed_percentage ?? item.contributedPercentage ?? 0,
  notContributedPercentage: item.not_contributed_percentage ?? item.notContributedPercentage ?? 0,
});

export const fetchCoordinatorStatistics = async (academicYear) => {
  const params = academicYear ? { academic_year: academicYear } : undefined;
  const response = await httpClient.get('/reports/statistics', { params });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch report statistics');
  }

  const data = response.data;
  const categoriesRaw = data.ideas_per_category || data.ideasPerCategory || [];
  const contributionsRaw = data.contributions || [];

  return {
    ideasPerCategory: Array.isArray(categoriesRaw) ? categoriesRaw.map(normalizeCategoryItem) : [],
    contributions: Array.isArray(contributionsRaw) ? contributionsRaw.map(normalizeContribution) : [],
  };
};

//for admin, system analytics
const normalizeLoginActivity = (item) => ({
  date: item.date ?? '',
  count: Number(item.count ?? 0),
});

const normalizeMostActiveUser = (item) => ({
  name: item.full_name ?? item.name ?? item.user_name ?? item.username ?? 'User',
  count: Number(item.count ?? item.idea_count ?? item.login_count ?? 0),
});

export const fetchSystemAnalytics = async (academicYear) => {
  const params = academicYear ? { academic_year: academicYear } : undefined;
  const response = await httpClient.get('/reports/statistics', { params });

  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to fetch system analytics');
  }

  const data = response.data;
  const browserUsage = data.browser_usage_percentage ?? {};
  const mostActiveUsers = Array.isArray(data.most_active_users)
    ? data.most_active_users.map(normalizeMostActiveUser)
    : [];
  const loginActivity = Array.isArray(data.login_activity)
    ? data.login_activity.map(normalizeLoginActivity)
    : [];

  return {
    browserUsage,
    mostActiveUsers,
    loginActivity,
  };
};
// admin system analytics end

//for idea table of posted by annonymous and no comments
const normalizeReportIdea = (idea) => ({
  id: idea.id,
  title: idea.title ?? idea.name ?? '',
  author: idea.user ?? idea.author ?? null,
  authorName: idea.user?.full_name ?? idea.user?.name ?? idea.author?.name ?? '',
  departmentName:
    idea.department?.name ??
    idea.department_name ??
    idea.departmentName ??
    idea.department ??
    'Unknown',
  categoryName:
    (Array.isArray(idea.categories) && idea.categories.length
      ? idea.categories[0]?.name
      : idea.category?.name) ??
    idea.category_name ??
    idea.categoryName ??
    'Unknown',
  thumbUpCount: idea.thumb_up_count ?? idea.thumbUpCount ?? 0,
  thumbDownCount: idea.thumb_down_count ?? idea.thumbDownCount ?? 0,
  reportCount: idea.report_count ?? idea.reportCount ?? idea.reports_count ?? 0,
  statusId: idea.status_id ?? idea.status?.id ?? null,
});

export const fetchReportIdeas = async ({ type, academicYear } = {}) => {
  const params = {
    ...(type ? { type } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
  };
  const response = await httpClient.get('/reports/ideas', { params });

  const items =
    response?.data?.items ||
    response?.data?.ideas ||
    response?.data?.reports ||
    response?.data ||
    [];

  if (!response?.success || !Array.isArray(items)) {
    throw new Error(response?.message || 'Failed to fetch report ideas');
  }

  return items.map(normalizeReportIdea);
};

//Anonymous comments table
const normalizeReportComment = (comment) => ({
  id: comment.id,
  ideaId: comment.idea_id ?? comment.ideaId ?? comment.idea?.id ?? null,
  statusId: comment.status?.id ?? comment.status_id ?? null,
  statusName: comment.status?.name ?? comment.status_name ?? '',
  comment: comment.text ?? comment.comment ?? comment.content ?? '',
  title: comment.idea?.title ?? comment.idea_title ?? comment.ideaTitle ?? 'Untitled Idea',
  department:
    comment.idea?.department?.name ??
    comment.department?.name ??
    comment.department_name ??
    comment.departmentName ??
    comment.department ??
    'Unknown',
  category:
    comment.idea?.category?.name ??
    (Array.isArray(comment.idea?.categories) && comment.idea.categories.length
      ? comment.idea.categories[0]?.name
      : undefined) ??
    comment.category?.name ??
    comment.category_name ??
    comment.categoryName ??
    comment.category ??
    'Unknown',
  thumbUpCount: comment.idea?.thumb_up ?? comment.thumb_up_count ?? comment.thumbUpCount ?? 0,
  thumbDownCount: comment.idea?.thumb_down ?? comment.thumb_down_count ?? comment.thumbDownCount ?? 0,
  reportCount:
    comment.idea?.report_count ??
    comment.report_count ??
    comment.reportCount ??
    comment.reports_count ??
    0,
});

export const fetchReportComments = async ({ type, academicYear } = {}) => {
  const params = {
    ...(type ? { type } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
  };
  const response = await httpClient.get('/reports/comments', { params });

  const items =
    response?.data?.items ||
    response?.data?.comments ||
    response?.data ||
    [];

  if (!response?.success || !Array.isArray(items)) {
    throw new Error(response?.message || 'Failed to fetch report comments');
  }

  return items.map(normalizeReportComment);
};

export const exportIdeasFile = async (academicYear) => {
  if (!academicYear) {
    throw new Error('Academic year is required');
  }

  const url = new URL(`${API_BASE_URL.replace(/\/+$/, '')}/reports/ideas-file-export`);
  url.searchParams.set('academic_year', academicYear);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
    credentials: 'omit',
  });

  if (!response.ok) {
    // Try to parse a JSON error body first
    const text = await response.text().catch(() => '');
    let message = '';
    try {
      const json = JSON.parse(text);
      message = json?.message || json?.error || text;
    } catch {
      message = text;
    }
    throw new Error(message || 'Failed to export ideas');
  }

  const contentType = response.headers.get('content-type') || '';

  // Handle multipart/mixed — extract boundary and download each part
  if (contentType.includes('multipart/mixed')) {
    const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
    if (!boundaryMatch?.[1]) {
      throw new Error('Malformed multipart response: missing boundary');
    }
    const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
    const parts = await parseMultipartMixed(response, boundary);

    if (parts.length === 0) {
      throw new Error('Export response contained no downloadable files');
    }

    for (const part of parts) {
      triggerDownload(part.blob, part.filename);
      // Small delay so the browser registers each download separately
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return { count: parts.length, files: parts.map((p) => p.filename) };
  }

  // Fallback: treat the whole response as a single file download
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const filename = parseFilenameFromContentDisposition(disposition) || `ideas_export_${academicYear}`;
  triggerDownload(blob, filename);

  return { count: 1, files: [filename] };
};
