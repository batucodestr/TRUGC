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
    // lib/api.ts tarafından, sessiz bir token refresh'i gerçekten başarısız
    // olduğunda tetiklenir ("bir istek 401 aldı" değil — refresh token'ın
    // kendisi gitmiş/süresi dolmuş), bu yüzden hangi çağrının önce fark
    // ettiğinden bağımsız olarak oturumun tamamı bitmiştir.
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
    // Oturum cookie'sini yalnızca mount'ta okur, ardından (gerçek backend
    // modunda) httpOnly refresh cookie'sini sessizce taze bir bellek içi
    // access token ile değiştirir — access token bir sayfa yenilemeyi
    // atlatmaz çünkü yalnızca JS belleğinde yaşar. Bu, effect tabanlı kalmak
    // zorundadır (tembel bir useState initializer'ı değil) çünkü
    // `document.cookie`, SSR sırasında kullanılamaz — önce `loading: true`
    // render etmek ve mount sonrası senkronize etmek, istemci hidrasyonunu
    // sunucu tarafında render edilen markup ile eşleşir tutan şeydir.
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
