/**
 * promotionApi.ts - Quản trị Khuyến mãi (/api/v1/admin/khuyen-mai)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface KhuyenMaiBackend {
  maKhuyenMai: number;
  maGiamGia: string;
  tenKhuyenMai?: string | null;
  loaiGiam: string | number; // "PhanTram" | "SoTien" | 0 | 1
  giaTriGiam: number;
  mucGiamToiDa?: number | null;
  tienThueToiThieu: number;
  phamVi: string | number; // "TatCa" | "TheoSanPham" | "TheoDanhMuc" | 0 | 1 | 2
  batDau: string;
  ketThuc: string;
  gioiHanTongLuot?: number | null;
  gioiHanMoiKhach?: number | null;
  trangThai: string | number; // "HienThi" | "TamAn" | 0 | 1
  sanPhamIds: number[];
  danhMucIds: number[];
  soLuotDaDung: number;
  soLuotDangGiuConHan: number;
  soLuotDaGiaiPhong: number;
}

export interface SuDungKhuyenMaiBackend {
  maKhuyenMai: number;
  maGiamGia: string;
  tenKhuyenMai?: string | null;
  tongLuotDaDung: number;
  tongLuotDangGiuConHan: number;
  tongLuotDaGiaiPhong: number;
  tongTienGiamDaDung: number;
  chiTietSuDung: Array<{
    maLuotSuDung: number;
    maDonThue: number;
    maDonHienThi: string;
    maKhachHang: number;
    tenKhachHang?: string | null;
    trangThaiLuot: string;
    thoiDiemGiuLuot: string;
    thoiDiemHetHan: string;
    thoiDiemSuDung?: string | null;
    tienGiamDon: number;
    trangThaiDonThue: string;
  }>;
}

export interface TaoKhuyenMaiRequest {
  maGiamGia: string;
  tenKhuyenMai?: string;
  loaiGiam: "PhanTram" | "SoTien";
  giaTriGiam: number;
  mucGiamToiDa?: number | null;
  tienThueToiThieu: number;
  phamVi: "TatCa" | "TheoSanPham" | "TheoDanhMuc";
  batDau: string;
  ketThuc: string;
  gioiHanTongLuot?: number | null;
  gioiHanMoiKhach?: number | null;
  sanPhamIds?: number[];
  danhMucIds?: number[];
}

export type CapNhatKhuyenMaiRequest = Partial<Omit<TaoKhuyenMaiRequest, "maGiamGia">>;

export const promotionApi = {
  async timKiem(params?: {
    tuKhoa?: string;
    trangThai?: string;
    phamVi?: string;
    hieuLuc?: boolean;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<KhuyenMaiBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/khuyen-mai${q}`);
    return unwrapPaged<KhuyenMaiBackend>(res.data);
  },

  async layChiTiet(id: number): Promise<KhuyenMaiBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/admin/khuyen-mai/${id}`);
    return unwrapResult<KhuyenMaiBackend>(res.data);
  },

  async tao(req: TaoKhuyenMaiRequest): Promise<KhuyenMaiBackend> {
    const res = await apiClient.post<unknown>("/api/v1/admin/khuyen-mai", req);
    return unwrapResult<KhuyenMaiBackend>(res.data);
  },

  async capNhat(id: number, req: CapNhatKhuyenMaiRequest): Promise<KhuyenMaiBackend> {
    const res = await apiClient.put<unknown>(`/api/v1/admin/khuyen-mai/${id}`, req);
    return unwrapResult<KhuyenMaiBackend>(res.data);
  },

  async tamAn(id: number, lyDo?: string): Promise<KhuyenMaiBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/khuyen-mai/${id}/tam-an`, { lyDo: lyDo ?? "Tạm ẩn chương trình" });
    return unwrapResult<KhuyenMaiBackend>(res.data);
  },

  async hienThi(id: number, lyDo?: string): Promise<KhuyenMaiBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/khuyen-mai/${id}/hien-thi`, { lyDo: lyDo ?? "Kích hoạt hiển thị lại" });
    return unwrapResult<KhuyenMaiBackend>(res.data);
  },

  async layTinhHinhSuDung(id: number): Promise<SuDungKhuyenMaiBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/admin/khuyen-mai/${id}/su-dung`);
    return unwrapResult<SuDungKhuyenMaiBackend>(res.data);
  },
};
