/**
 * importReceiptApi.ts - Phiếu nhập kho (/api/phieu-nhap)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface ChiTietPhieuNhapBackend {
  maChiTietPhieuNhap: number;
  maPhieuNhap: number;
  maSanPham: number;
  tenSanPham: string;
  soLuong: number;
  donGiaNhap: number;
  thanhTien: number;
  tinhTrangKhiNhap: string;
  ghiChu?: string | null;
}

export interface PhieuNhapBackend {
  maPhieuNhap: number;
  maPhieuHienThi: string;
  maNhaCungCap: number;
  tenNhaCungCap: string;
  maNguoiLap: number;
  tenNguoiLap?: string | null;
  maNguoiXacNhan?: number | null;
  tenNguoiXacNhan?: string | null;
  ngayLap: string;
  ngayNhapDuKien?: string | null;
  ngayNhapThucTe?: string | null;
  ngayXacNhan?: string | null;
  soChungTuNhaCungCap?: string | null;
  tongTien: number;
  trangThai: string | number; // "Nhap" | "DaNhapKho" | "DaHuy" hoặc enum number
  lyDoHuy?: string | null;
  ghiChu?: string | null;
  coTheSua: boolean;
  chiTietPhieuNhaps: ChiTietPhieuNhapBackend[];
}

export interface DongNhapRequest {
  maSanPham: number;
  soLuong: number;
  donGiaNhap: number;
  tinhTrangKhiNhap: string;
  ghiChu?: string;
}

export const importReceiptApi = {
  async timKiem(params?: {
    tuKhoa?: string;
    maNhaCungCap?: number;
    trangThai?: string;
    tuNgay?: string;
    denNgay?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<PhieuNhapBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/phieu-nhap${q}`);
    return unwrapPaged<PhieuNhapBackend>(res.data);
  },

  async layChiTiet(id: number): Promise<PhieuNhapBackend> {
    const res = await apiClient.get<unknown>(`/api/phieu-nhap/${id}`);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async taoPhieu(req: {
    maNhaCungCap: number;
    ngayNhapDuKien?: string;
    soChungTuNhaCungCap?: string;
    ghiChu?: string;
  }): Promise<PhieuNhapBackend> {
    const res = await apiClient.post<unknown>("/api/phieu-nhap", req);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async capNhatPhieu(
    id: number,
    req: {
      maNhaCungCap: number;
      ngayNhapDuKien?: string;
      soChungTuNhaCungCap?: string;
      ghiChu?: string;
    }
  ): Promise<PhieuNhapBackend> {
    const res = await apiClient.put<unknown>(`/api/phieu-nhap/${id}`, req);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async themDong(id: number, req: DongNhapRequest): Promise<PhieuNhapBackend> {
    const res = await apiClient.post<unknown>(`/api/phieu-nhap/${id}/chi-tiet`, req);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async suaDong(id: number, chiTietId: number, req: DongNhapRequest): Promise<PhieuNhapBackend> {
    const res = await apiClient.put<unknown>(`/api/phieu-nhap/${id}/chi-tiet/${chiTietId}`, req);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async xoaDong(id: number, chiTietId: number): Promise<PhieuNhapBackend> {
    const res = await apiClient.del<unknown>(`/api/phieu-nhap/${id}/chi-tiet/${chiTietId}`);
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async huyPhieu(id: number, lyDo: string): Promise<PhieuNhapBackend> {
    const res = await apiClient.post<unknown>(`/api/phieu-nhap/${id}/huy`, { lyDo });
    return unwrapResult<PhieuNhapBackend>(res.data);
  },

  async xacNhanNhapKho(
    id: number,
    req?: {
      ngayNhapThucTe?: string;
      soChungTuNhaCungCap?: string;
      ghiChuXacNhan?: string;
      tinhTrangDong?: Array<{ maChiTietPhieuNhap: number; tinhTrangThucTe?: string; ghiChu?: string }>;
    }
  ): Promise<PhieuNhapBackend> {
    const res = await apiClient.post<unknown>(`/api/phieu-nhap/${id}/xac-nhan`, req ?? {});
    return unwrapResult<PhieuNhapBackend>(res.data);
  },
};
