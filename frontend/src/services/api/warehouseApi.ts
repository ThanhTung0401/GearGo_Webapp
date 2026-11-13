/**
 * warehouseApi.ts - Tổng quan kho, kiểm kê đối chiếu & phân tích ảnh hưởng (/api/v1/kho)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface ThongKeSanPhamKhoBackend {
  maSanPham: number;
  tenSanPham: string;
  tongSo: number;
  sanSang: number;
  dangThue: number;
  baoTri: number;
  ngungSuDung: number;
  thatLac: number;
  khaDungTheoLich?: number | null;
}

export interface KhoTongQuanBackend {
  tongHoSoThietBi: number;
  sanSangTaiKho: number;
  dangChoThue: number;
  dangBaoTri: number;
  ngungSuDung: number;
  thatLac: number;
  khaDungTheoLich?: number | null;
  tongGiaTriNhap?: number | null;
  chiTietSanPham: ThongKeSanPhamKhoBackend[];
}

export interface ThietBiKhoItemBackend {
  maThietBi: number;
  maThietBiHienThi: string;
  maSanPhamHienTai: number;
  tenSanPhamHienTai: string;
  maSanPhamGoc: number;
  tenSanPhamGoc: string;
  maChiTietPhieuNhap: number;
  trangThaiSuDung: string;
  tinhTrang?: string | null;
  giaNhap?: number | null;
  ngayNhap: string;
  coLichHenSapToi: boolean;
}

export interface DoiChieuKiemKeBackend {
  thoiDiemDoiChieu: string;
  tongSoKyVongTaiKho: number;
  tongSoQuetThucTe: number;
  danhSachKhop: string[];
  danhSachThieu: Array<{
    maThietBi: number;
    maThietBiHienThi: string;
    tenSanPham: string;
    tinhTrang?: string | null;
  }>;
  danhSachQuetTrung: string[];
  danhSachMaLa: string[];
  danhSachDangLuuHanhNgoaiKho: Array<{
    maThietBi: number;
    maThietBiHienThi: string;
    tenSanPham: string;
    lyDoNgoaiKho: string;
  }>;
}

export interface PhanTichAnhHuongBackend {
  coTheApDungHienTai: boolean;
  camKetCuThe: string[];
  thieuSoLuongTheoLich: string[];
  vuongMac: string[];
}

export const warehouseApi = {
  async layTongQuan(params?: {
    maSanPhamHienTai?: number;
    gioNhan?: string;
    gioTra?: string;
  }): Promise<KhoTongQuanBackend> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/kho/tong-quan${q}`);
    return unwrapResult<KhoTongQuanBackend>(res.data);
  },

  async timThietBi(params?: {
    maSanPhamHienTai?: number;
    trangThai?: string;
    tuKhoa?: string;
    gioNhan?: string;
    gioTra?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<ThietBiKhoItemBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/kho/thiet-bi${q}`);
    return unwrapPaged<ThietBiKhoItemBackend>(res.data);
  },

  async doiChieuKiemKe(req: {
    phamViMaSanPham?: number[];
    danhSachMaQuet: string[];
    thoiDiemKiemKe?: string;
    ghiChu?: string;
  }): Promise<DoiChieuKiemKeBackend> {
    const res = await apiClient.post<unknown>("/api/v1/kho/kiem-ke/doi-chieu", req);
    return unwrapResult<DoiChieuKiemKeBackend>(res.data);
  },

  async xemAnhHuongDieuChinh(req: {
    maThietBi: number;
    loaiThayDoi: "GiangCap" | "NgungSuDung" | "BaoTri";
    maSanPhamDich?: number;
    lyDo?: string;
  }): Promise<PhanTichAnhHuongBackend> {
    const res = await apiClient.post<unknown>("/api/v1/kho/dieu-chinh/xem-anh-huong", req);
    return unwrapResult<PhanTichAnhHuongBackend>(res.data);
  },
};
