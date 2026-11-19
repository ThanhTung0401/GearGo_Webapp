/**
 * orderApi.ts - Đơn thuê khách hàng (/api/don-thue) & Vận hành (/api/don-thue/xu-ly)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";
import type {
  DonChiTietBackend,
  DonThueCreatedBackend,
  DonTomTatBackend,
  DonVanHanhChiTietBackend,
  DonVanHanhTomTatBackend,
  HuyDonBackend,
  PhieuBanGiaoKhachBackend,
  SuKienDonBackend,
  TaoDonThueRequest,
  XemTruocHuyBackend,
} from "./types/orderDtos";

export * from "./types/orderDtos";

export const orderApi = {
  // ─── Khách hàng (/api/don-thue) ───
  async taoDon(req: TaoDonThueRequest): Promise<DonThueCreatedBackend> {
    const res = await apiClient.post<unknown>("/api/don-thue", req);
    return unwrapResult<DonThueCreatedBackend>(res.data);
  },

  async layDonCuaToi(params?: {
    maDon?: string;
    tuNgay?: string;
    denNgay?: string;
    trangThai?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<DonTomTatBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/don-thue${q}`);
    return unwrapPaged<DonTomTatBackend>(res.data);
  },

  async layChiTietDon(id: number): Promise<DonChiTietBackend> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}`);
    return unwrapResult<DonChiTietBackend>(res.data);
  },

  async layLichSuDon(id: number): Promise<SuKienDonBackend[]> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/lich-su`);
    return unwrapResult<SuKienDonBackend[]>(res.data);
  },

  async layBanGiaoDon(id: number): Promise<PhieuBanGiaoKhachBackend[]> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/ban-giao`);
    return unwrapResult<PhieuBanGiaoKhachBackend[]>(res.data);
  },

  async layChinhSachDon(id: number): Promise<unknown> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/chinh-sach`);
    return unwrapResult<unknown>(res.data);
  },

  async xemTruocHuy(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/huy/xem-truoc`);
    return unwrapResult<XemTruocHuyBackend>(res.data);
  },

  async khachHuyDon(
    id: number,
    req: { lyDo: string; xacNhanChiPhi?: boolean; dauVanTayXemTruoc?: string }
  ): Promise<HuyDonBackend> {
    const res = await apiClient.post<unknown>(`/api/don-thue/${id}/huy`, {
      lyDo: req.lyDo,
      xacNhanChiPhi: req.xacNhanChiPhi ?? true,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<HuyDonBackend>(res.data);
  },

  async huyDonChuaThanhToan(id: number, lyDo: string): Promise<boolean> {
    const res = await apiClient.put<unknown>(`/api/don-thue/${id}/huy`, { lyDo });
    return unwrapResult<boolean>(res.data);
  },

  // ─── Vận hành (/api/don-thue/xu-ly) ───
  async timDonVanHanh(params?: {
    maDon?: string;
    tuNgay?: string;
    denNgay?: string;
    trangThai?: string;
    chiCanChuanBi?: boolean;
    chiCanBanGiao?: boolean;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<DonVanHanhTomTatBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/don-thue/xu-ly${q}`);
    return unwrapPaged<DonVanHanhTomTatBackend>(res.data);
  },

  async layChiTietVanHanh(id: number): Promise<DonVanHanhChiTietBackend> {
    const res = await apiClient.get<unknown>(`/api/don-thue/xu-ly/${id}`);
    return unwrapResult<DonVanHanhChiTietBackend>(res.data);
  },

  async xemTruocCuaHangHuy(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/cua-hang-huy/xem-truoc`);
    return unwrapResult<XemTruocHuyBackend>(res.data);
  },

  async cuaHangHuy(
    id: number,
    req: { lyDo: string; xacNhanChiPhi?: boolean; dauVanTayXemTruoc?: string }
  ): Promise<HuyDonBackend> {
    const res = await apiClient.post<unknown>(`/api/don-thue/${id}/cua-hang-huy`, {
      lyDo: req.lyDo,
      xacNhanChiPhi: req.xacNhanChiPhi ?? true,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<HuyDonBackend>(res.data);
  },

  async xemTruocKhongDenNhan(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/don-thue/${id}/khong-den-nhan/xem-truoc`);
    return unwrapResult<XemTruocHuyBackend>(res.data);
  },

  async ghiNhanKhongDenNhan(
    id: number,
    req: {
      ghiChu: string;
      bangChung?: unknown;
      xuLyHuy?: boolean;
      xacNhanChiPhi?: boolean;
      dauVanTayXemTruoc?: string;
    }
  ): Promise<unknown> {
    const res = await apiClient.post<unknown>(`/api/don-thue/${id}/khong-den-nhan`, {
      ghiChu: req.ghiChu,
      bangChung: req.bangChung,
      xuLyHuy: req.xuLyHuy ?? false,
      xacNhanChiPhi: req.xacNhanChiPhi ?? false,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<unknown>(res.data);
  },
};
