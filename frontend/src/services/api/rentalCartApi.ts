/**
 * rentalCartApi.ts - Giỏ thuê & Báo giá động (/api/gio-thue)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface ChiTietBaoGiaBackend {
  maSanPham: number;
  soLuong: number;
  tienThue: number;
  tienCoc: number;
  tienGiam: number;
}

export interface BaoGiaBackend {
  soNgayThue: number;
  tongTienThueTruocGiam: number;
  tongTienCoc: number;
  tongTienGiam: number;
  hashBaoGia: string;
  chiTiet: ChiTietBaoGiaBackend[];
}

export interface ChiTietGioThueBackend {
  maChiTietGio: number;
  maSanPham: number;
  tenSanPham: string;
  soLuong: number;
  donGiaThueMoiNgay: number;
  mucCocMoiThietBi: number;
  tienThue: number;
  tienCoc: number;
  tienGiam: number;
  ngungKinhDoanh: boolean;
  soLuongKhaDung: number;
}

export interface GioThueBackend {
  maGioThue: number;
  gioNhanDuKien?: string | null;
  gioTraDuKien?: string | null;
  maKhuyenMaiApDung?: string | null;
  chiTiet: ChiTietGioThueBackend[];
  baoGia?: BaoGiaBackend | null;
}

export const rentalCartApi = {
  async layGio(): Promise<GioThueBackend> {
    const res = await apiClient.get<unknown>("/api/gio-thue");
    return unwrapResult<GioThueBackend>(res.data);
  },

  async themVaoGio(maSanPham: number, soLuong: number): Promise<GioThueBackend> {
    const res = await apiClient.post<unknown>("/api/gio-thue/them", { maSanPham, soLuong });
    return unwrapResult<GioThueBackend>(res.data);
  },

  async capNhatSoLuong(maChiTiet: number, soLuongMoi: number): Promise<GioThueBackend> {
    const res = await apiClient.put<unknown>(`/api/gio-thue/${maChiTiet}/so-luong`, { soLuongMoi });
    return unwrapResult<GioThueBackend>(res.data);
  },

  async xoaChiTiet(maChiTiet: number): Promise<void> {
    await apiClient.del<unknown>(`/api/gio-thue/${maChiTiet}`);
  },

  async datThoiGian(gioNhan: string, gioTra: string): Promise<GioThueBackend> {
    const res = await apiClient.put<unknown>("/api/gio-thue/thoi-gian", { gioNhan, gioTra });
    return unwrapResult<GioThueBackend>(res.data);
  },

  async apMaKhuyenMai(maGiamGia: string): Promise<GioThueBackend> {
    const res = await apiClient.post<unknown>("/api/gio-thue/ma-giam-gia", { maGiamGia });
    return unwrapResult<GioThueBackend>(res.data);
  },

  async boMaKhuyenMai(): Promise<GioThueBackend> {
    const res = await apiClient.del<unknown>("/api/gio-thue/ma-giam-gia");
    return unwrapResult<GioThueBackend>(res.data);
  },
};
