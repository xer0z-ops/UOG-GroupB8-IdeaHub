const TOKEN_STORAGE_KEY = "qa_platform_tokens";

const DEFAULT_API_BASE_URL =
  (typeof window !== "undefined" && window.__env__?.VITE_API_BASE_URL) ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "http://52.237.118.127:31183/api";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const resolveApiUrl = (url, baseUrl = DEFAULT_API_BASE_URL) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedBase = trimTrailingSlash(baseUrl);
  const sanitized = url.startsWith("/") ? url.slice(1) : url;
  return `${normalizedBase}/${sanitized}`;
};

const getStoredTokens = () => {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.accessToken ?? parsed?.access_token ?? null,
      tokenType: parsed?.tokenType ?? parsed?.token_type ?? "Bearer",
    };
  } catch {
    return null;
  }
};

const resolveFileName = (url, contentDisposition) => {
  const fallback = (() => {
    try {
      const parsed = new URL(url);
      const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
      return lastSegment || "download";
    } catch {
      return "download";
    }
  })();

  if (!contentDisposition) return fallback;

  const match =
    /filename\*=(?:UTF-8'')?([^;]+)/i.exec(contentDisposition) ||
    /filename="?([^";]+)"?/i.exec(contentDisposition);

  if (!match?.[1]) return fallback;

  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
};

const createDownloadLink = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadFileWithAuth = async ({
  url,
  filename,
  accessToken,
  tokenType = "Bearer",
  headers,
  baseUrl,
  withCredentials = false,
} = {}) => {
  if (!url) throw new Error("Download URL is required");

  const resolvedUrl = resolveApiUrl(url, baseUrl);
  const stored = getStoredTokens();
  const finalToken = accessToken ?? stored?.accessToken ?? null;
  const finalTokenType = tokenType ?? stored?.tokenType ?? "Bearer";

  const requestHeaders = new Headers(headers || {});
  if (finalToken) {
    requestHeaders.set("Authorization", `${finalTokenType} ${finalToken}`);
  }

  const response = await fetch(resolvedUrl, {
    method: "GET",
    headers: requestHeaders,
    credentials: withCredentials ? "include" : "omit",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = "";
    try {
      const json = JSON.parse(text);
      message = json?.message || json?.error || text;
    } catch {
      message = text;
    }
    throw new Error(message || "Failed to download file");
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition");
  const resolvedName = filename || resolveFileName(resolvedUrl, contentDisposition);

  createDownloadLink(blob, resolvedName);

  return { filename: resolvedName, size: blob.size };
};

export const buildAuthenticatedDownloadHandler =
  (url, filename, options = {}) =>
  async () =>
    downloadFileWithAuth({ url, filename, ...options });

export { resolveApiUrl };