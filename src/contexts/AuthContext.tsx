import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/auth-api";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/storage";
import type { UserResponse } from "@/types";

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const token = safeGetItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .getMe()
      .then(setUser)
      .catch((error) => {
        // Clear tokens if validation fails or user is not found
        console.error("[Auth] Failed to fetch user profile:", error);
        safeRemoveItem("access_token");
        safeRemoveItem("refresh_token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for forced logout from API interceptor (e.g. expired refresh token)
  useEffect(() => {
    const handleForceLogout = () => setUser(null);
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const tokens = await authApi.login(username, password);
      safeSetItem("access_token", tokens.access_token);
      safeSetItem("refresh_token", tokens.refresh_token);
      const me = await authApi.getMe();
      setUser(me);
    } catch (error) {
      // Clear tokens on any login error
      safeRemoveItem("access_token");
      safeRemoveItem("refresh_token");
      throw error;
    }
  }, []);

  const register = useCallback(
    async (data: { email: string; username: string; password: string; full_name?: string }) => {
      await authApi.register(data);
    },
    []
  );

  const logout = useCallback(() => {
    safeRemoveItem("access_token");
    safeRemoveItem("refresh_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
