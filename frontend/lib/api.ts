// İnce bir API istemci sınırı. Uygulamadaki her gerçek ağ çağrısı, doğrudan
// `fetch` çağırmak yerine aşağıdaki `request()`/`apiClient` üzerinden geçer.
//
// Kimlik doğrulama: access token yalnızca bellekte tutulur (bkz. lib/token-store.ts)
// ve `Authorization: Bearer <token>` olarak eklenir. Bir 401 durumunda, tam
// olarak bir kez sessiz refresh denenir (httpOnly refresh cookie'sini okuyan
// /api/auth/refresh route handler'ı üzerinden) ve pes edip hatayı göstermeden
// önce orijinal istek bir kez daha denenir.

import { getAccessToken, setAccessToken } from "@/lib/token-store";

const isServer = typeof window === "undefined";

// Tarayıcı, göreli bir "/api/v1"i kendi origin'ine göre çözebilir (Caddy bunu
// backend'e proxy'ler), ancak sunucudaki Node'un `fetch`'inin çözümleyeceği
// bir origin'i yoktur — mutlak bir URL gerekir, aksi halde her server
// component fetch'i "unknown scheme" hatasıyla başarısız olur. Sunucu kodu,
// Caddy üzerinden dolaşmak yerine Docker ağı üzerinden doğrudan Django'yla konuşur.
const API_BASE_URL = isServer
  ? (process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1")
  : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "");

/**
 * Server Components render before any client JS runs, so they can't reach
 * the in-memory access token (lib/token-store.ts) — that only exists in the
 * browser. Login/refresh (app/api/auth/*) also set the access token as a
 * short-lived httpOnly cookie for exactly this case; this reads it back.
 * Returns null on the client (where the in-memory token is used instead) or
 * if there's no cookie (server render for a signed-out visitor).
 */
async function getServerAccessToken(): Promise<string | null> {
  if (!isServer) return null;
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return store.get("trugc_access")?.value ?? null;
  } catch {
    return null;
  }
}

export type ApiErrorKind = "network" | "unauthorized" | "forbidden" | "not_found" | "validation" | "rate_limited" | "server" | "unknown";

/**
 * Matches backend/apps/accounts/exceptions.py::custom_exception_handler exactly:
 *   { error: true, code: "NOT_FOUND", message: "Kaynak bulunamadı.", fields?: { [field]: string[] } }
 * `fields` is only present for 400s where DRF produced per-field validation errors.
 */
interface ApiErrorBody {
  error?: boolean;
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  /** The backend's machine-readable error code (e.g. "NOT_FOUND", "VALIDATION_ERROR"), when available. */
  code?: string;
  data: unknown;
  /** Field-level validation errors, when the backend returned any. */
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, data?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kindForStatus(status);
    this.code = data?.code;
    this.data = data;
    this.fieldErrors = data?.fields;
  }
}

/** A network-level failure (DNS, connection refused, offline) — the request never got a response at all. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Network request failed");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the automatic Authorization header (used for public endpoints). */
  anonymous?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

/** Calls the Next.js route handler that exchanges the httpOnly refresh cookie for a new access token. */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.access ?? null);
        return Boolean(data.access);
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function rawFetch(endpoint: string, options: RequestOptions, isRetry: boolean): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!options.anonymous) {
    const token = isServer ? await getServerAccessToken() : getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
      // Yalnızca tarayıcının gönderecek bir cookie jar'ı vardır; sunucu
      // tarafındaki istekler bunun yerine yukarıda ayarlanan açık Authorization
      // header'ı ile kimlik doğrulama taşır.
      credentials: isServer ? undefined : "include",
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  // Sessiz refresh-ve-yeniden-deneme yalnızca tarayıcıda anlamlıdır (göreli
  // bir same-origin route handler'ı çağırır ve tarayıcının cookie jar'ına
  // dayanır). Server Component'ler, istek anında access cookie'sinin tuttuğu
  // değerle tek bir şans alır — bayatsa, aşağıdaki fetch başarısız olur,
  // çağıran gerçek bir 401 görür ve bir sonraki istemci taraflı refresh
  // bunu düzeltir.
  if (res.status === 401 && !options.anonymous && !isRetry && !isServer) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return rawFetch(endpoint, options, true);
    // Refresh gerçekten başarısız oldu (refresh token eksik/süresi dolmuş/
    // kara listede) — bu "bir istek 401 aldı" durumu değil, oturumun tamamı
    // bitti demektir. Her çağrı noktasının bir 401'i fark edip kendi başına
    // bunu yapması yerine, uygulamanın durumu temizleyip yönlendirebilmesi
    // için bunu bildir.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }
  }

  return res;
}

/** Fallback Turkish message for responses that didn't come from custom_exception_handler at
 * all — Caddy/gateway errors (502/503/504 when a container is down), or any other response
 * with no JSON body. The backend's own envelope (data.message) is always preferred when present. */
const FALLBACK_MESSAGE_BY_STATUS: Record<number, string> = {
  400: "Gönderilen bilgilerde bir hata var.",
  401: "Bu işlem için giriş yapmanız gerekiyor.",
  403: "Bu işlemi gerçekleştirme yetkiniz bulunmuyor.",
  404: "Kaynak bulunamadı.",
  429: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.",
  502: "Sunucuya ulaşılamıyor. Lütfen birazdan tekrar deneyin.",
  503: "Servis şu anda kullanılamıyor. Lütfen birazdan tekrar deneyin.",
  504: "Sunucu yanıt vermedi. Lütfen birazdan tekrar deneyin.",
};

async function request<T>(endpoint: string, options: RequestOptions): Promise<T> {
  const res = await rawFetch(endpoint, options, false);

  if (!res.ok) {
    let data: ApiErrorBody | undefined;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    const message = data?.message ?? FALLBACK_MESSAGE_BY_STATUS[res.status] ?? "Sunucuda beklenmeyen bir hata oluştu.";
    throw new ApiError(message, res.status, data);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: "PATCH", body }),
  put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: "PUT", body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  /** Multipart upload (avatars, covers, portfolio media, attachments, etc). */
  upload: <T>(endpoint: string, formData: FormData, method: "POST" | "PATCH" | "PUT" = "POST") =>
    request<T>(endpoint, { method, body: formData }),
  /** Public endpoints — skips the Authorization header (and the 401-retry loop) entirely. */
  getPublic: <T>(endpoint: string) => request<T>(endpoint, { method: "GET", anonymous: true }),
};
