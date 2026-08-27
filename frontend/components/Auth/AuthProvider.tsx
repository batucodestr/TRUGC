"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as auth from "@/lib/auth";
import type { AuthSession, BrandRegisterPayload, CreatorRegisterPayload, LoginPayload } from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  registerCreator: (payload: CreatorRegisterPayload) => Promise<AuthSession>;
  registerBrand: (payload: BrandRegisterPayload) => Promise<AuthSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthState {
  session: AuthSession | null;
  loading: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [{ session, loading }, setState] = useState<AuthState>({ session: null, loading: true });
  const setSession = (session: AuthSession | null) => setState({ session, loading: false });

  useEffect(() => {
    // Fired by lib/api.ts when a silent token refresh genuinely fails (not
    // "one request 401'd" — the refresh token itself is gone/expired), so
    // the whole session is over regardless of which call noticed it first.
    function handleSessionExpired() {
      auth.logout();
      setSession(null);
      toast.error("Oturumunuz sona erdi", { description: "Lütfen tekrar giriş yapın." });
      router.push("/login");
    }
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reads the session cookie on mount only, then (in real-backend mode)
    // silently exchanges the httpOnly refresh cookie for a fresh in-memory
    // access token — the access token doesn't survive a page reload since it
    // only ever lives in JS memory. This must stay effect-based (not a lazy
    // useState initializer) because `document.cookie` is unavailable during
    // SSR — rendering `loading: true` first and syncing after mount is what
    // keeps client hydration matching the server-rendered markup.
    let cancelled = false;
    auth.restoreSession().then((session) => {
      if (!cancelled) setState({ session, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const next = await auth.login(payload);
    setSession(next);
    return next;
  }, []);

  const registerCreator = useCallback(async (payload: CreatorRegisterPayload) => {
    const next = await auth.registerCreator(payload);
    setSession(next);
    return next;
  }, []);

  const registerBrand = useCallback(async (payload: BrandRegisterPayload) => {
    const next = await auth.registerBrand(payload);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, registerCreator, registerBrand, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
