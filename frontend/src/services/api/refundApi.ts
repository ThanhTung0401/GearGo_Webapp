/**
 * refundApi.ts - Yêu cầu hoàn tiền cọc / hủy đơn & đối chiếu hoàn (/api/v1/hoan-tien)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface HoanTienBackend {
  maHoanTien: number;
  maYeuCau?: string | null;
  maChiTietThanhToanGoc: number;
  mucDichNguon: string;
  maDoiSoat?: number | null;
  loaiHoan?: string | null;
  soTien: number;
  trangThai: string;
  nhanHienThi: string;
  thoiDiemYeuCau: string;
  thoiDiemThanhCong?: string | null;
  lyDo?: string | null;
  maGiaoDichHoanCong?: string | null;
}

export interface NghiaVuHoanBackend {
  khoaNghiaVu: string;
  loaiHoan?: string | null;
  tongSoTien: number;
  daHoanThanhCong: number;
  conCho: number;
  soKhoanCanXuLyLai: number;
  daHoanThanh: boolean;
}

export interface HoanTienTheoDonBackend {
  maDonThue: number;
  items: HoanTienBackend[];
  tongDuKien: number;
  tongDangXuLy: number;
  tongDaHoan: number;
  tongCanXuLyLai: number;
  nghiaVu: NghiaVuHoanBackend[];
}

export const refundApi = {
  async layTheoDon(donId: number): Promise<HoanTienTheoDonBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/hoan-tien/theo-don/${donId}`);
    return unwrapResult<HoanTienTheoDonBackend>(res.data);
  },

  async xuLyHoan(id: number, ghiChuXuLy?: string): Promise<HoanTienBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/hoan-tien/${id}/xu-ly`, { ghiChuXuLy });
    return unwrapResult<HoanTienBackend>(res.data);
  },

  async doiChieuHoan(id: number): Promise<HoanTienBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/hoan-tien/${id}/doi-chieu`);
    return unwrapResult<HoanTienBackend>(res.data);
  },
};
