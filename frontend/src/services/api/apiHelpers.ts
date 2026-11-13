/**
 * Các hàm tiện ích chuẩn hóa Query String, Result<T> và PagedResult<T> từ ASP.NET Core Backend.
 */

import { ApiError } from "../apiClient";

export interface PagedBackendResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Tạo chuỗi query string từ object, bỏ qua các giá trị rỗng/undefined/"all".
 */
export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "" || val === "all") return;
    if (Array.isArray(val)) {
      val.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") qs.append(key, String(v));
      });
    } else {
      qs.append(key, String(val));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Mở vỏ bọc Result<T> (nếu endpoint trả trực tiếp `{ thanhCong, duLieu }`) hoặc trả thẳng payload.
 */
export function unwrapResult<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "duLieu" in payload) {
    const wrapped = payload as {
      thanhCong?: boolean;
      duLieu?: T;
      maLoi?: string;
      thongDiep?: string;
    };
    if (wrapped.thanhCong === false) {
      throw new ApiError(wrapped.thongDiep ?? "Thao tác thất bại", 400, wrapped.maLoi);
    }
    if (wrapped.duLieu !== undefined) {
      return wrapped.duLieu;
    }
  }
  return payload as T;
}

/**
 * Chuẩn hóa kết quả phân trang giữa hai biến thể backend:
 * { items, totalItems, currentPage, pageSize } và { items, tongSo, trang, soMoiTrang }.
 */
export function unwrapPaged<T>(payload: unknown): PagedBackendResponse<T> {
  const raw = unwrapResult<Record<string, unknown>>(payload) ?? {};
  const items = (Array.isArray(raw.items) ? raw.items : Array.isArray(raw.Items) ? raw.Items : []) as T[];
  const totalItems = Number(raw.totalItems ?? raw.TotalItems ?? raw.tongSo ?? raw.TongSo ?? items.length) || 0;
  const currentPage = Number(raw.currentPage ?? raw.CurrentPage ?? raw.trang ?? raw.Trang ?? 1) || 1;
  const pageSize = Number(raw.pageSize ?? raw.PageSize ?? raw.soMoiTrang ?? raw.SoMoiTrang ?? (items.length || 20)) || 20;
  return { items, totalItems, currentPage, pageSize };
}
