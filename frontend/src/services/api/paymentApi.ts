/**
 * paymentApi.ts - Thanh toán đơn thuê, thu bổ sung đối soát & đối chiếu ngoại lệ (/api/v1/thanh-toan)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface XacNhanThanhToanRequest {
  maDonThue: number;
  phuongThucThanhToan: string; // "VietQR" | "VNPAY" | "TienMat" | "ChuyenKhoan"
  soTienDaTra: number;
  maGiaoDichDoiTac?: string;
}

export interface YeuCauThuBackend {
  maThanhToan: number;
  maYeuCau: string;
  soTien: number;
  mucDich: string;
  trangThai: string;
  paymentUrl?: string | null;
  canDoiChieu: boolean;
}

export interface GiaoDichCanDoiChieuBackend {
  maThanhToan: number;
  maYeuCau: string;
  maDonThue: number;
  tongSoTien: number;
  phuongThuc: string;
  trangThai: string;
  trangThaiDoiChieu?: string | null;
  lyDoCanDoiChieu?: string | null;
  thoiDiemTao: string;
}

export const paymentApi = {
  async xacNhanThanhToan(req: XacNhanThanhToanRequest): Promise<string> {
    const res = await apiClient.post<unknown>("/api/v1/thanh-toan/xac-nhan", req);
    return unwrapResult<string>(res.data);
  },

  async taoThuBoSung(doiSoatId: number, phuongThucDuocHoTro = "VNPAY"): Promise<YeuCauThuBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/thanh-toan/doi-soat/${doiSoatId}/thu-bo-sung`, {
      maDoiSoat: doiSoatId,
      phuongThucDuocHoTro,
    });
    return unwrapResult<YeuCauThuBackend>(res.data);
  },

  async layTrangThaiGiaoDich(maYeuCau: string): Promise<YeuCauThuBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/thanh-toan/${encodeURIComponent(maYeuCau)}/trang-thai`);
    return unwrapResult<YeuCauThuBackend>(res.data);
  },

  async layDanhSachCanDoiChieu(): Promise<GiaoDichCanDoiChieuBackend[]> {
    const res = await apiClient.get<unknown>("/api/v1/thanh-toan/can-doi-chieu");
    return unwrapResult<GiaoDichCanDoiChieuBackend[]>(res.data);
  },

  async doiChieuGiaoDich(
    id: number,
    req: { ketLuan: "HopLe_XacNhan" | "HopLe_HoanTienThua" | "TuChoi"; ghiChu: string; soTienHoan?: number }
  ): Promise<string> {
    const res = await apiClient.post<unknown>(`/api/v1/thanh-toan/${id}/doi-chieu`, req);
    return unwrapResult<string>(res.data);
  },
};
