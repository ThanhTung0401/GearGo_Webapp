/**
 * supplierApi.ts - Quản lý Nhà cung cấp & lịch sử nhập (/api/nha-cung-cap)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface NhaCungCapBackend {
  maNhaCungCap: number;
  maNhaCungCapHienThi: string;
  tenNhaCungCap: string;
  nguoiLienHe?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
  diaChi?: string | null;
  maSoThue?: string | null;
  ghiChu?: string | null;
  trangThaiHopTac: string; // "DangHopTac" | "NgungHopTac"
  canhBaoTrung?: string | null;
}

export interface LichSuNhapBackend {
  tongSoPhieuDaNhap: number;
  tongGiaTriNhap: number;
  tongSoLuongThietBi: number;
  phieuNhaps: PagedBackendResponse<{
    maPhieuNhap: number;
    maPhieuHienThi: string;
    soChungTuNhaCungCap?: string | null;
    ngayLap: string;
    ngayNhapThucTe?: string | null;
    ngayXacNhan?: string | null;
    tongTien: number;
    tenNguoiLap?: string | null;
    tenNguoiXacNhan?: string | null;
    chiTietSanPham: Array<{
      maChiTietPhieuNhap: number;
      maSanPham: number;
      tenSanPham: string;
      soLuong: number;
      donGiaNhap: number;
      thanhTien: number;
      tinhTrangKhiNhap: string;
    }>;
  }>;
}

export const supplierApi = {
  async timKiem(params?: {
    tuKhoa?: string;
    trangThaiHopTac?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<NhaCungCapBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/nha-cung-cap${q}`);
    return unwrapPaged<NhaCungCapBackend>(res.data);
  },

  async layChiTiet(id: number): Promise<NhaCungCapBackend> {
    const res = await apiClient.get<unknown>(`/api/nha-cung-cap/${id}`);
    return unwrapResult<NhaCungCapBackend>(res.data);
  },

  async tao(req: {
    maHienThi: string;
    ten: string;
    nguoiLienHe?: string;
    soDienThoai?: string;
    email?: string;
    diaChi?: string;
    maSoThue?: string;
    ghiChu?: string;
  }): Promise<NhaCungCapBackend> {
    const res = await apiClient.post<unknown>("/api/nha-cung-cap", req);
    return unwrapResult<NhaCungCapBackend>(res.data);
  },

  async capNhat(
    id: number,
    req: {
      ten: string;
      nguoiLienHe?: string;
      soDienThoai?: string;
      email?: string;
      diaChi?: string;
      maSoThue?: string;
      ghiChu?: string;
      lyDoThayDoi?: string;
    }
  ): Promise<NhaCungCapBackend> {
    const res = await apiClient.put<unknown>(`/api/nha-cung-cap/${id}`, req);
    return unwrapResult<NhaCungCapBackend>(res.data);
  },

  async doiTrangThaiHopTac(
    id: number,
    trangThaiHopTac: "DangHopTac" | "NgungHopTac",
    lyDo: string
  ): Promise<NhaCungCapBackend> {
    const res = await apiClient.put<unknown>(`/api/nha-cung-cap/${id}/trang-thai-hop-tac`, {
      trangThaiHopTac,
      lyDo,
    });
    return unwrapResult<NhaCungCapBackend>(res.data);
  },

  async layLichSuNhap(
    id: number,
    params?: { tuNgay?: string; denNgay?: string; trang?: number; soMoiTrang?: number }
  ): Promise<LichSuNhapBackend> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/nha-cung-cap/${id}/lich-su-nhap${q}`);
    const data = unwrapResult<LichSuNhapBackend>(res.data);
    return {
      ...data,
      phieuNhaps: unwrapPaged(data.phieuNhaps),
    };
  },
};
