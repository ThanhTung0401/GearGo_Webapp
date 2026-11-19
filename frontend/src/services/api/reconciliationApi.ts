/**
 * reconciliationApi.ts - Đối soát cọc 7 bước & điều chỉnh sau chốt (/api/doi-soat)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface NguonCocBackend {
  maChiTietThanhToan: number;
  maThanhToan: number;
  maYeuCau: string;
  soTien: number;
  phuongThuc: string;
  thoiDiem: string;
}

export interface PhuPhiDoiSoatBackend {
  maPhuPhi: number;
  maChiTietBanGiao?: number | null;
  loaiPhi: string;
  soTien: number;
  lyDo?: string | null;
  trangThaiDuyet: string;
  trangThaiTranhChap?: string | null;
}

export interface XemTruocDoiSoatBackend {
  maDonThue: number;
  maDonHienThi: string;
  duDieuKien: boolean;
  vuongMac: string[];
  tienCocDuocDoiSoat: number;
  tongPhuPhiDuocDuyet: number;
  soTienCanHoan: number;
  soTienCanThuThem: number;
  nguonCoc: NguonCocBackend[];
  phuPhi: PhuPhiDoiSoatBackend[];
  dauVanTayBangTinh: string;
}

export interface DoiSoatBackend {
  maDoiSoat: number;
  maDonThue: number;
  maDonHienThi: string;
  maDoiSoatGoc?: number | null;
  loaiDoiSoat: string; // "BanDau" | "DieuChinh"
  lyDoDieuChinh?: string | null;
  tienCocDuocDoiSoat: number;
  tongPhuPhiDuocDuyet: number;
  soTienCanHoan: number;
  soTienCanThuThem: number;
  trangThai: string; // "ChoChot" | "DaXacNhan" | "DangXuLyTien" | "DaChot"
  dauVanTayBangTinh?: string | null;
  thoiDiemLap: string;
  thoiDiemChot?: string | null;
  nguoiLap?: string | null;
  nguoiChot?: string | null;
  phuPhis?: PhuPhiDoiSoatBackend[];
  nguonCoc?: NguonCocBackend[];
  hoanTiens?: Array<{
    maHoanTien: number;
    maYeuCau?: string | null;
    soTien: number;
    trangThai: string;
    nhanHienThi?: string;
  }>;
  thuBoSungs?: Array<{
    maThanhToan: number;
    maYeuCau: string;
    soTien: number;
    trangThai: string;
  }>;
}

export const reconciliationApi = {
  async xemTruoc(donId: number): Promise<XemTruocDoiSoatBackend> {
    const res = await apiClient.get<unknown>(`/api/doi-soat/theo-don/${donId}/xem-truoc`);
    return unwrapResult<XemTruocDoiSoatBackend>(res.data);
  },

  async layTheoDon(donId: number): Promise<DoiSoatBackend> {
    const res = await apiClient.get<unknown>(`/api/doi-soat/theo-don/${donId}`);
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async layTheoId(id: number): Promise<DoiSoatBackend> {
    const res = await apiClient.get<unknown>(`/api/doi-soat/${id}`);
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async lapDoiSoat(donId: number, ghiChu?: string): Promise<DoiSoatBackend> {
    const res = await apiClient.post<unknown>(`/api/doi-soat/theo-don/${donId}`, {
      maDonThue: donId,
      ghiChu,
    });
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async xacNhanBangTinh(id: number, dauVanTayBangTinh: string, ghiChu?: string): Promise<DoiSoatBackend> {
    const res = await apiClient.post<unknown>(`/api/doi-soat/${id}/xac-nhan`, {
      dauVanTayBangTinh,
      ghiChu,
    });
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async yeuCauXuLyTien(id: number): Promise<DoiSoatBackend> {
    const res = await apiClient.post<unknown>(`/api/doi-soat/${id}/xu-ly-tien`);
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async chotDoiSoat(id: number): Promise<DoiSoatBackend> {
    const res = await apiClient.post<unknown>(`/api/doi-soat/${id}/chot`);
    return unwrapResult<DoiSoatBackend>(res.data);
  },

  async lapDieuChinh(
    doiSoatGocId: number,
    req: { lyDoDieuChinh: string; danhSachMaPhuPhiDieuChinh?: number[]; ghiChu?: string }
  ): Promise<DoiSoatBackend> {
    const res = await apiClient.post<unknown>(`/api/doi-soat/${doiSoatGocId}/dieu-chinh`, req);
    return unwrapResult<DoiSoatBackend>(res.data);
  },
};
