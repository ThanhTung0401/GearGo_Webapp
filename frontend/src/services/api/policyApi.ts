/**
 * policyApi.ts - Chính sách thuê theo phiên bản (/api/v1/admin/chinh-sach) - UC83–UC84
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface NoiDungChinhSachBackend {
  thoiGianGiuChoPhut?: number | null;
  heSoTre?: number | null;
  tyLeCocPhanTram?: number | null;
  hanMucNhanVien?: number | null;
  huyDon?: {
    tyLeGiuLaiTu24Den48Gio?: number | null;
    tyLeGiuLaiDuoi24Gio?: number | null;
  } | null;
  khongDenNhan?: {
    soPhutChoSauGioNhan?: number | null;
    tyLeGiuLaiTienThue?: number | null;
  } | null;
  mocNhac?: Array<{
    loai?: string | null;
    soGioTruoc?: number | null;
  }> | null;
}

export interface ChinhSachBackend {
  maChinhSach: number;
  phienBan: number;
  tenChinhSach?: string | null;
  thoiDiemApDung: string;
  ngayTao: string;
  maNguoiTao: number;
  hieuLuc: string; // "HienHanh" | "TuongLai" | "DaThayThe"
  noiDung?: NoiDungChinhSachBackend | null;
  noiDungJsonGoc?: string | null;
}

export interface TaoChinhSachRequest {
  tenChinhSach: string;
  thoiDiemApDung: string; // ISO UTC
  noiDung: NoiDungChinhSachBackend;
}

export interface KiemTraChinhSachBackend {
  hopLe: boolean;
  loiTheoDuongDan: Array<{
    duongDan: string;
    thongDiep: string;
  }>;
  canhBao: string[];
  banDuKienDuocChon?: {
    maChinhSach: number;
    phienBan: number;
    thoiDiemApDung: string;
    tenChinhSach?: string | null;
  } | null;
}

export const policyApi = {
  async layDanhSach(params?: { trang?: number; kichThuoc?: number }): Promise<PagedBackendResponse<ChinhSachBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/chinh-sach${q}`);
    return unwrapPaged<ChinhSachBackend>(res.data);
  },

  async layChiTiet(id: number): Promise<ChinhSachBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/admin/chinh-sach/${id}`);
    return unwrapResult<ChinhSachBackend>(res.data);
  },

  async kiemTra(req: TaoChinhSachRequest): Promise<KiemTraChinhSachBackend> {
    const res = await apiClient.post<unknown>("/api/v1/admin/chinh-sach/kiem-tra", req);
    return unwrapResult<KiemTraChinhSachBackend>(res.data);
  },

  async taoPhienBan(req: TaoChinhSachRequest): Promise<ChinhSachBackend> {
    const res = await apiClient.post<unknown>("/api/v1/admin/chinh-sach", req);
    return unwrapResult<ChinhSachBackend>(res.data);
  },
};
