import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { configureHttpClientAuth } from "../services/httpClient";
import { AuthContext } from "./authContext";

const TOKEN_STORAGE_KEY = "qa_platform_tokens";
const PROFILE_STORAGE_KEY = "qa_platform_profile";
const storage = sessionStorage;

const initialAuthState = {
  accessToken: null,
  refreshToken: null,
  tokenType: "Bearer",
  expiresIn: null,
  lastLogin: null,
  lastLoginDevice: null,
  isDefaultPassword: false,
};



const persistTokens = (tokens) => {
  try {
    storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.warn("Unable to persist tokens:", error);
  }
};

const persistProfile = (profile) => {
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn("Unable to persist profile:", error);
  }
};

const loadProfile = () => {
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadTokens = () => {
  try {
    const raw = storage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return initialAuthState;

    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.accessToken ?? parsed?.access_token ?? null,
      refreshToken: parsed?.refreshToken ?? parsed?.refresh_token ?? null,
      tokenType: parsed?.tokenType ?? parsed?.token_type ?? "Bearer",
      expiresIn: parsed?.expiresIn ?? parsed?.expires_in ?? null,
      lastLogin: parsed?.lastLogin ?? parsed?.last_login ?? null,
      lastLoginDevice: parsed?.lastLoginDevice ?? parsed?.last_login_device ?? null,
      isDefaultPassword: parsed?.isDefaultPassword ?? parsed?.is_default_password ?? false,
    };
  } catch {
    return initialAuthState;
  }
};

export const AuthProvider = ({ children }) => {
  const [tokens, setTokensState] = useState(loadTokens);
  const tokensRef = useRef(tokens);
  const [currentUser, setCurrentUser] = useState(loadProfile);
  const wasAuthenticatedRef = useRef(Boolean(tokens.accessToken));

  const setTokens = useCallback((incomingTokens) => {
    const sourceTokens = incomingTokens ?? {};
    setTokensState((prevTokens = initialAuthState) => {
      const hasKey = (key) => Object.prototype.hasOwnProperty.call(sourceTokens, key);
      const merged = {
        accessToken: hasKey("accessToken") ? sourceTokens.accessToken : prevTokens?.accessToken ?? null,
        refreshToken: hasKey("refreshToken") ? sourceTokens.refreshToken : prevTokens?.refreshToken ?? null,
        tokenType: hasKey("tokenType") ? sourceTokens.tokenType : prevTokens?.tokenType ?? "Bearer",
        expiresIn: hasKey("expiresIn") ? sourceTokens.expiresIn : prevTokens?.expiresIn ?? null,
        lastLogin: hasKey("lastLogin") ? sourceTokens.lastLogin : prevTokens?.lastLogin ?? null,
        lastLoginDevice: hasKey("lastLoginDevice") ? sourceTokens.lastLoginDevice : prevTokens?.lastLoginDevice ?? null,
        isDefaultPassword: hasKey("isDefaultPassword")
          ? sourceTokens.isDefaultPassword
          : prevTokens?.isDefaultPassword ?? false,
      };
      tokensRef.current = merged;
      persistTokens(merged);
      return merged;
    });
  }, []);

  const updateCurrentUser = useCallback((profile) => {
    setCurrentUser(profile);
    persistProfile(profile);
  }, []);

  const clearTokens = useCallback(() => {
    const resetTokens = { ...initialAuthState };
    tokensRef.current = resetTokens;
    setTokensState(resetTokens);
    setCurrentUser(null);
    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(PROFILE_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear tokens:", error);
    }
  }, []);

  useEffect(() => {
    const wasAuthenticated = wasAuthenticatedRef.current;
    const isAuthenticatedNow = Boolean(tokens.accessToken);
    if (wasAuthenticated && !isAuthenticatedNow) {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    wasAuthenticatedRef.current = isAuthenticatedNow;
  }, [tokens.accessToken]);



  useLayoutEffect(() => {
    configureHttpClientAuth({
      getAccessToken: () => tokensRef.current?.accessToken,
      getRefreshToken: () => tokensRef.current?.refreshToken,
      getTokenType: () => tokensRef.current?.tokenType || "Bearer",
      onTokensUpdated: (updatedTokens) => setTokens(updatedTokens),
      onLogout: clearTokens,
    });
  }, [setTokens, clearTokens]);

  const value = useMemo(
    () => ({
      ...tokens,
      isAuthenticated: Boolean(tokens.accessToken),
      currentUser,
      setTokens,
      clearTokens,
      updateCurrentUser,
    }),
    [tokens, currentUser, setTokens, clearTokens, updateCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
