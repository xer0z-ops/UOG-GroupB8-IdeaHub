/**
 * Utility helpers for decoding JWT tokens without relying on external libraries.
 * These helpers are intentionally lightweight and defensive against malformed tokens.
 */

/**
 * Provides cross-environment base64 decoding (browser + Node).
 */
const safeBase64Decode = (input) => {
  if (typeof globalThis !== "undefined" && typeof globalThis.atob === "function") {
    return globalThis.atob(input);
  }

  if (typeof globalThis !== "undefined" && typeof globalThis.Buffer === "function") {
    return globalThis.Buffer.from(input, "base64").toString("binary");
  }

  throw new Error("Base64 decoding is not supported in this environment.");
};

/**
 * Safely decodes a base64url-encoded string into UTF-8 text.
 *
 * @param {string} value - Base64URL encoded segment from a JWT.
 * @returns {string} UTF-8 decoded string.
 */
const decodeBase64Url = (value = "") => {
  if (typeof value !== "string") return "";

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = safeBase64Decode(padded);
    // Handle UTF-8 characters
    return decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
  } catch {
    return "";
  }
};

/**
 * Parses the payload segment of a JWT and returns the decoded JSON object.
 *
 * @param {string} token - The JWT token (access or refresh).
 * @returns {object|null} Decoded payload or null if invalid.
 */
export const decodeJwtPayload = (token) => {
  if (typeof token !== "string" || !token.includes(".")) return null;

  const segments = token.split(".");
  if (segments.length < 2) return null;

  const payloadSegment = segments[1];
  const jsonString = decodeBase64Url(payloadSegment);
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

/**
 * Extracts a nested value from the JWT payload using a dot-delimited path.
 *
 * @param {string} token - The JWT token.
 * @param {string} path - Dot-delimited path, e.g., "user.role.name".
 * @returns {unknown} The value at the specified path or undefined if unavailable.
 */
export const getJwtClaim = (token, path) => {
  if (!path) return undefined;
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key];
    }
    return undefined;
  }, payload);
};
