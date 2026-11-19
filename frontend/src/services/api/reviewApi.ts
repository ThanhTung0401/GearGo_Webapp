/**
 * reviewApi.ts - Đánh giá sản phẩm (/api/danh-gia) & Kiểm duyệt/Phản hồi (/api/danh-gia)
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
  // ─── Khách hàng & Công khai (/api/danh-gia) ───
  async layDanhGiaSanPham(
    sanPhamId: number,
    params?: { soSao?: number; coAnh?: boolean; trang?: number; soMoiTrang?: number }
  ): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/danh-gia/san-pham/${sanPhamId}${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async layTongHopDiem(sanPhamId: number): Promise<TongHopDiemBackend> {
    const res = await apiClient.get<unknown>(`/api/danh-gia/san-pham/${sanPhamId}/tong-hop`);
    return unwrapResult<TongHopDiemBackend>(res.data);
  },

  async laySanPhamDuDieuKien(): Promise<SanPhamDuDieuKienDanhGiaBackend[]> {
    const res = await apiClient.get<unknown>("/api/danh-gia/du-dieu-kien");
    return unwrapResult<SanPhamDuDieuKienDanhGiaBackend[]>(res.data);
  },

  async layDanhGiaCuaToi(params?: { trang?: number; soMoiTrang?: number }): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/danh-gia/cua-toi${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async taoDanhGia(req: {
    maChiTietDonThue: number;
    soSao: number;
    noiDung?: string;
    danhSachAnh?: string[];
  }): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>("/api/danh-gia", req);
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  async uploadHinhAnh(file: File): Promise<{ url: string; duongDan?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.postFormData<{ url?: string; duongDan?: string }>("/api/danh-gia/hinh-anh", formData);
    const data = unwrapResult<{ url?: string; duongDan?: string }>(res.data);
    const url = data?.url ?? data?.duongDan ?? "";
    return { url, duongDan: url };
  },

  // ─── Quản trị & Vận hành (/api/danh-gia) ───
  async adminTimKiem(params?: {
    trang?: number;
    soMoiTrang?: number;
    trangThai?: string;
  }): Promise<PagedBackendResponse<DanhGiaBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/danh-gia${q}`);
    return unwrapPaged<DanhGiaBackend>(res.data);
  },

  async adminAn(id: number, lyDo: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/danh-gia/${id}/an`, { lyDo });
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  async adminKhoiPhuc(id: number, lyDo?: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/danh-gia/${id}/khoi-phuc`, { lyDo });
    return unwrapResult<DanhGiaBackend>(res.data);
  },

  async phanHoi(id: number, noiDung: string): Promise<DanhGiaBackend> {
    const res = await apiClient.post<unknown>(`/api/danh-gia/${id}/phan-hoi`, { noiDung });
    return unwrapResult<DanhGiaBackend>(res.data);
  },
};
