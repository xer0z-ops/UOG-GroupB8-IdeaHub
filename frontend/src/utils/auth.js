import { getJwtClaim } from "./jwt";
import { ROLES } from "../constants/roles";

const DEFAULT_FALLBACK_CLAIMS = [
  "role",
  "role.name",
  "role_value",
  "roleName",
  "role_name",
  "user.role",
  "user.role.name",
  "user.role_name",
  "data.role",
  "data.role.name",
  "data.role_name",
];

const KNOWN_ROLE_VALUES = Object.values(ROLES);

/**
 * Attempts to determine the user's role from the provided JWT token.
 *
 * Order of operations:
 * 1. Walk through a list of fallback claim paths for role names.
 * 2. Normalize to lowercase role values (e.g., "admin").
 *
 * @param {string} token - JWT access token whose payload will be inspected.
 * @param {{ claimPaths?: string[] }} options - Optional overrides for claim paths.
 * @returns {string|null} Normalized role value (e.g., "admin") or null when unavailable.
 */
export const extractRoleFromToken = (token, options = {}) => {
  if (!token) {
    return null;
  }

  const claimPaths = Array.isArray(options.claimPaths) && options.claimPaths.length
    ? options.claimPaths
    : DEFAULT_FALLBACK_CLAIMS;
  
  //console.log('claimPaths - ', claimPaths)

  for (const path of claimPaths) {
    const rawRole = getJwtClaim(token, path);
    
    //console.log('rawRole - ', rawRole)
    const roleValue = typeof rawRole === "string"
      ? rawRole
      : (rawRole && typeof rawRole === "object" && typeof rawRole.name === "string" ? rawRole.name : null);

    //console.log('roleValue - ', roleValue)
    if (typeof roleValue === "string") {
      const normalizedRole = roleValue.trim().toLowerCase();
      //console.log('normalizedRole - ', normalizedRole)
      if (KNOWN_ROLE_VALUES.includes(normalizedRole)) {
        return normalizedRole;
      }
    }
  }

  return null;
};