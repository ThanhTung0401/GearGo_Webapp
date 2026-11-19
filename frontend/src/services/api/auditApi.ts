/**
 * auditApi.ts - Nhật ký thao tác hệ thống (/api/nhat-ky) - StaffOrAdmin (UC100/UC102)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface NhatKyThaoTacBackend {
  maNhatKy: number;
  maTaiKhoan?: number | null;
  nguoiThucHien?: string | null;
  vaiTro?: string | null;
  hanhDong: string;
  loaiDoiTuong: string;
  maDoiTuong?: string | null;
  duLieuTruoc?: string | null;
  duLieuSau?: string | null;
  thoiDiem: string;
  lyDo?: string | null;
  thamChieuUrl?: string | null;
}

export const auditApi = {
  async traCuu(params?: {
    maTaiKhoan?: number;
    hanhDong?: string;
    loaiDoiTuong?: string;
    maDoiTuong?: string;
    tuNgay?: string;
    denNgay?: string;
    tuKhoa?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<NhatKyThaoTacBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/nhat-ky${q}`);
    return unwrapPaged<NhatKyThaoTacBackend>(res.data);
  },

  /**
   * Tra cứu chứng từ gốc theo URL tham chiếu do backend cung cấp (nếu người dùng có quyền).
   */
  async xemChungTuThamChieu(thamChieuUrl: string): Promise<unknown> {
    const path = thamChieuUrl.startsWith("/") ? thamChieuUrl : `/${thamChieuUrl}`;
    const res = await apiClient.get<unknown>(path);
    return unwrapResult<unknown>(res.data);
  },
};
