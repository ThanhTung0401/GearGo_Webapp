/**
 * reviewApi.ts - Đánh giá sản phẩm (/api/v1/danh-gia) & Kiểm duyệt/Phản hồi (/api/v1/admin/danh-gia)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface DanhGiaBackend {
  maDanhGia: number;
  maChiTietDonThue: number;
  maDonThue: number;
  maSanPham: number;
  tenSanPham: string;
  maKhachHang: number;
  tenKhachHang: string;
  soSao: number;
  noiDung?: string | null;
  danhSachAnh: string[];
  thoiDiemTao: string;
  trangThaiHienThi: string; // "HienThi" | "BiAn"
  lyDoAn?: string | null;
  nguoiAn?: string | null;
  phanHoiCuaHang?: string | null;
  thoiDiemPhanHoi?: string | null;
  nguoiPhanHoi?: string | null;
}

export interface TongHopDiemBackend {
  maSanPham: number;
  diemTrungBinh: number;
  tongSoDanhGia: number;
  phanBoSao: Record<number, number>;
}

export interface SanPhamDuDieuKienDanhGiaBackend {
  maChiTietDonThue: number;
  maDonThue: number;
  maDonHienThi: string;
  maSanPham: number;
  tenSanPham: string;
  thoiDiemHoanTat: string;
  daDanhGia: boolean;
}

export const reviewApi = {
  // ─── Khách hàng & Công khai (/api/v1/danh-gia) ───
  async layDanhGiaSanPham(
    sanPhamId: number,
    params?: { soSao?: number; coAnh?: boolean; trang?: number; soMoiTrang?: number }
  ): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/danh-gia/san-pham/${sanPhamId}${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async layTongHopDiem(sanPhamId: number): Promise<TongHopDiemBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/danh-gia/san-pham/${sanPhamId}/tong-hop`);
    return unwrapResult<TongHopDiemBackend>(res.data);
  },

  async laySanPhamDuDieuKien(): Promise<SanPhamDuDieuKienDanhGiaBackend[]> {
    const res = await apiClient.get<unknown>("/api/v1/danh-gia/du-dieu-kien");
    return unwrapResult<SanPhamDuDieuKienDanhGiaBackend[]>(res.data);
  },

  async layDanhGiaCuaToi(params?: { trang?: number; soMoiTrang?: number }): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/danh-gia/cua-toi${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async taoDanhGia(req: {
    maChiTietDonThue: number;
    soSao: number;
    noiDung?: string;
    danhSachAnh?: string[];
  }): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>("/api/v1/danh-gia", req);
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  // ─── Quản trị & Vận hành (/api/v1/admin/danh-gia) ───
  async adminTimKiem(params?: {
    trang?: number;
    soMoiTrang?: number;
    trangThai?: string;
  }): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/danh-gia${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async adminAn(id: number, lyDo: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/danh-gia/${id}/an`, { lyDo });
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  async adminKhoiPhuc(id: number, lyDo?: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/danh-gia/${id}/khoi-phuc`, { lyDo });
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  async phanHoi(id: number, noiDung: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/danh-gia/${id}/phan-hoi`, { noiDung });
    return unwrapResult<DanhGiaBackend>(res.data);
  },
};
