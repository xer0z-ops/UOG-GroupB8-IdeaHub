const API_BASE_URL =
  (typeof window !== "undefined" && window.__env__?.VITE_API_BASE_URL) ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://52.237.118.127:31183/api";
const AUTH_PATH_REGEX = /^\/?auth\//i;

const defaultHeaders = {
  "Content-Type": "application/json",
};

const REFRESH_ENDPOINT = "/auth/refresh-token";
const isUnauthorizedStatus = (status) => status === 401 || status === 403;

let authHandlers = {
  getAccessToken: null,
  getRefreshToken: null,
  getTokenType: null,
  onTokensUpdated: null,
  onLogout: null,
};

let refreshPromise = null;

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

export const configureHttpClientAuth = (handlers = {}) => {
  authHandlers = {
    ...authHandlers,
    ...handlers,
  };
};

export const setAuthHandlers = configureHttpClientAuth;
export const configureAuth = configureHttpClientAuth;

const buildUrl = (endpoint = "", params) => {
  const rawEndpoint = endpoint || "";
  const isAbsolute = /^https?:\/\//i.test(rawEndpoint);

  const sanitizedEndpoint = rawEndpoint.startsWith("/") ? rawEndpoint.slice(1) : rawEndpoint;
  const normalizedBase = trimTrailingSlash(API_BASE_URL);
  const baseUrl = isAbsolute ? rawEndpoint : `${normalizedBase}/${sanitizedEndpoint}`;

  const url = new URL(baseUrl);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  const payload = isJson ? await response.json() : await response.text();

  if (isJson && payload && typeof payload === "object" && payload.success === false) {
    // Extract field-level validation messages from error object when present
    // e.g. { error: { academic_year_id: ["Idea submissions are closed."] } }
    const fieldErrorMessage =
      payload?.error &&
      typeof payload.error === "object" &&
      !Array.isArray(payload.error)
        ? Object.values(payload.error)
            .flatMap((v) => (Array.isArray(v) ? v : [v]))
            .filter((m) => typeof m === "string" && m.trim())
            .join(" ")
        : null;

    const message =
      fieldErrorMessage ||
      payload?.message ||
      payload?.error?.details?.detail ||
      "Request failed";
    const error = new Error(message);
    const unauthorizedByMessage = /invalid token|authentication credentials were not provided|unauthorized|forbidden/i.test(message);
    // const unauthorizedByMessage =
    //   /invalid token|authentication credentials were not provided|unauthorized|forbidden|token expired/i.test(message);
    error.status = unauthorizedByMessage ? 401 : response.status;
    error.payload = payload;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const performTokenRefresh = async () => {
  if (typeof authHandlers.getRefreshToken !== "function") {
    throw new Error("Refresh token handler is not configured");
  }

  const refreshToken = authHandlers.getRefreshToken();
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await fetch(buildUrl(REFRESH_ENDPOINT), {
    method: "POST",
    headers: {
      ...defaultHeaders,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseResponse(response);
  const newAccessToken = payload?.data?.access_token;
  const nextRefreshToken = payload?.data?.refresh_token || refreshToken;

  if (!newAccessToken) {
    throw new Error(payload?.message || "Unable to refresh access token");
  }

  authHandlers.onTokensUpdated?.({
    accessToken: newAccessToken,
    refreshToken: nextRefreshToken,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: nextRefreshToken,
  };
};

const request = async ({
  endpoint = "",
  method = "GET",
  data,
  params,
  token,
  headers,
  signal,
  useAuth,
} = {}) => {
  const resolvedUseAuth = typeof useAuth === "boolean" ? useAuth : !AUTH_PATH_REGEX.test(endpoint || "");

  const execute = async (hasRetried = false, overrideToken = null) => {
    const computedToken =
      overrideToken ??
      (hasRetried
        ? authHandlers.getAccessToken?.()
        : token ?? (resolvedUseAuth ? authHandlers.getAccessToken?.() : null));

    const config = {
      method,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      signal,
    };

    if (computedToken) {
      const tokenType = authHandlers.getTokenType?.() || "Bearer";
      config.headers.Authorization = `${tokenType} ${computedToken}`;
    }

    if (data instanceof FormData) {
      delete config.headers["Content-Type"];
      config.body = data;
    } else if (data !== undefined) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(buildUrl(endpoint, params), config);
      return await parseResponse(response);
    } catch (error) {
      const shouldAttemptRefresh =
        resolvedUseAuth &&
        !hasRetried &&
        isUnauthorizedStatus(error?.status) &&
        typeof authHandlers.getRefreshToken === "function";

      if (shouldAttemptRefresh) {
        if (!refreshPromise) {
          refreshPromise = performTokenRefresh()
            .catch((refreshError) => {
              authHandlers.onLogout?.();
              throw refreshError;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const refreshedTokens = await refreshPromise;
        const nextAccessToken = refreshedTokens?.accessToken;
        return execute(true, nextAccessToken);
      }

      throw error;
    }
  };

  return execute(false);
};

const httpClient = {
  configureHttpClientAuth,
  setAuthHandlers: configureHttpClientAuth,
  configureAuth: configureHttpClientAuth,
  get: (endpoint, options = {}) => request({ endpoint, ...options }),
  post: (endpoint, data, options = {}) => request({ endpoint, method: "POST", data, ...options }),
  put: (endpoint, data, options = {}) => request({ endpoint, method: "PUT", data, ...options }),
  patch: (endpoint, data, options = {}) => request({ endpoint, method: "PATCH", data, ...options }),
  delete: (endpoint, options = {}) => request({ endpoint, method: "DELETE", ...options }),
  request,
};

export default httpClient;
