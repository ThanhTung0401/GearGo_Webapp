/**
 * aiAdvisorApi.ts - Tư vấn AI chọn bộ đồ dã ngoại (/api/tu-van)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface TuVanBoDoRequest {
  diemDen: string;
  soNguoi: number;
  gioNhan?: string | null;
  gioTra?: string | null;
  nganSach?: number | null;
  loaiNganSach?: "TienThue" | "TongBanDau" | string;
  nhuCau?: string | null;
}

export interface DongGoiYBackend {
  maSanPham: number;
  maSanPhamHienThi?: string;
  tenSanPham: string;
  soLuong: number;
  sucChua?: number | null;
  donGiaThueMoiNgay: number;
  mucCocMoiThietBi: number;
  tienThue: number;
  tienCoc: number;
  soLuongKhaDung: number;
  lyDo?: string;
}

export interface TuVanBoDoBackend {
  nguonGoiY: string; // "AI" | "QuyTac" | "Mock"
  trangThai: string; // "ThanhCong" | "CanBoSungThongTin" | "KhongTimThayPhuongAn"
  gioNhan?: string | null;
  gioTra?: string | null;
  thoiGianThueNgay?: number | null;
  thoiDiemKiemTra: string;
  tongTienThue?: number | null;
  tongTienCoc: number;
  tongBanDau?: number | null;
  thongBaoPhanThieu?: string | null;
  cacDong: DongGoiYBackend[];
}

export interface ThemBoDoRequest {
  gioNhan?: string | null;
  gioTra?: string | null;
  cacDong: Array<{ maSanPham: number; soLuong: number }>;
  xuLyXungDotLich?: "ThayThe" | "GiuHienTai" | string;
}

export const aiAdvisorApi = {
  async tuVanBoDo(req: TuVanBoDoRequest): Promise<TuVanBoDoBackend> {
    const res = await apiClient.post<unknown>("/api/tu-van/bo-do", req);
    return unwrapResult<TuVanBoDoBackend>(res.data);
  },

  async kiemTraBoDo(req: TuVanBoDoRequest): Promise<TuVanBoDoBackend> {
    const res = await apiClient.post<unknown>("/api/tu-van/bo-do/kiem-tra", req);
    return unwrapResult<TuVanBoDoBackend>(res.data);
  },

  async themBoDoVaoGio(req: ThemBoDoRequest): Promise<unknown> {
    const res = await apiClient.post<unknown>("/api/tu-van/bo-do/them-vao-gio", req);
    return unwrapResult<unknown>(res.data);
  },
};
