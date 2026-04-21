import { createContext } from "react";

const initialAuthState = {
  accessToken: null,
  refreshToken: null,
  tokenType: "Bearer",
  expiresIn: null,
  lastLogin: null,
  lastLoginDevice: null,
  isDefaultPassword: false,
};

export const AuthContext = createContext({
  ...initialAuthState,
  isAuthenticated: false,
  currentUser: null,
  setTokens: () => {},
  clearTokens: () => {},
});