import { useContext } from "react";
import { AuthContext } from "../context/authContext";

/**
 * Convenience hook for accessing authentication state/actions.
 *
 * @returns {{
 *   accessToken: string | null;
 *   refreshToken: string | null;
 *   tokenType: string;
 *   expiresIn: number | null;
 *   isAuthenticated: boolean;
 *   setTokens: (tokens: {
 *     accessToken?: string | null;
 *     refreshToken?: string | null;
 *     tokenType?: string;
 *     expiresIn?: number | null;
 *   }) => void;
 *   clearTokens: () => void;
 * }}
 */
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default useAuth;