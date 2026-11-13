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
    // Khi backend báo quyền/vai trò trong token đã lệch với DB, phát sự kiện để App và hook phân quyền làm mới ngay
    if (response.status === 403 && code === "QUYEN_DA_THAY_DOI" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("geargo:permissions-changed", { detail: { code, message: msg } }));
      window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
    }
    throw new ApiError(msg, response.status, code);
  }

  return { data: payload as T, status: response.status };
}

/**
 * Tải tệp nhị phân (CSV/PDF) kèm JWT Bearer token và tự tách tên tệp từ Content-Disposition.
 */
async function requestBlob(path: string): Promise<{ blob: Blob; fileName: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!response.ok) {
    let msg = `Lỗi tải tệp HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const ct = response.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const errObj = (await response.json()) as { maLoi?: string; thongDiep?: string; message?: string };
        msg = errObj.thongDiep ?? errObj.message ?? msg;
        code = errObj.maLoi;
      }
    } catch {
      // Giữ thông điệp mặc định khi response lỗi không phải JSON
    }
    if (response.status === 401) {
      setAuthToken(null);
    }
    if (response.status === 403 && code === "QUYEN_DA_THAY_DOI" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("geargo:permissions-changed", { detail: { code, message: msg } }));
    }
    throw new ApiError(msg, response.status, code);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  let fileName = "geargo-export.csv";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (utf8Match?.[1]) {
    fileName = decodeURIComponent(utf8Match[1].trim());
  } else if (asciiMatch?.[1]) {
    fileName = asciiMatch[1].trim();
  }
  return { blob, fileName };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  getBlob: (path: string) => requestBlob(path),
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

