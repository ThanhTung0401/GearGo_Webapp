/**
 * HTTP Client dùng chung cho toàn bộ Frontend khi kết nối ASP.NET Core Backend.
 * Tự động gắn Bearer token (khớp khóa `geargo-token` với `permissions.tsx`)
 * và chuẩn hóa thông điệp lỗi `{ maLoi, thongDiep }` từ API.
 */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const API_BASE = (env.VITE_API_URL ?? "").replace(/\/+$/, "");
export const TOKEN_KEY = "geargo-token";

export function isRealApiEnabled(): boolean {
  return Boolean(API_BASE) && env.VITE_USE_MOCK !== "true";
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; status: number }> {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return { data: undefined as T, status: 204 };
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { thongDiep: text } : null;
  }

  if (!response.ok) {
    const errObj = (payload && typeof payload === "object" ? payload : {}) as {
      maLoi?: string;
      MaLoi?: string;
      thongDiep?: string;
      ThongDiep?: string;
      message?: string;
    };
    const msg = errObj.thongDiep ?? errObj.ThongDiep ?? errObj.message ?? `Lỗi HTTP ${response.status}`;
    const code = errObj.maLoi ?? errObj.MaLoi;
    if (response.status === 401) {
      setAuthToken(null);
    }
    throw new ApiError(msg, response.status, code);
  }

  return { data: payload as T, status: response.status };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  postFormData: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

