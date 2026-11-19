/**
 * handoverApi.ts - Chuẩn bị đơn (/api/chuan-bi-don) & Bàn giao BBBG (/api/ban-giao)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface PhanCongChiTietBackend {
  maPhanCong: number;
  maThietBi: number;
  maThietBiHienThi: string;
  trangThaiThietBi: string;
  trangThaiPhanCong: string;
  thoiDiemGan: string;
  nguoiGan?: string | null;
}

export interface DongChuanBiBackend {
  maChiTietDon: number;
  maSanPham: number;
  tenSanPham: string;
  soLuongCanGan: number;
  soLuongDaGan: number;
  soLuongConThieu: number;
  danhSachPhanCong: PhanCongChiTietBackend[];
}

export interface ChuanBiResponseBackend {
  maDonThue: number;
  trangThaiDon: string;
  duDieuKienSanSang: boolean;
  danhSachDong: DongChuanBiBackend[];
  lyDoChuaDuDieuKien: string[];
}

export interface BaoThieuThietBiRequest {
  dongDonId?: number;
  soLuongThieu?: number;
  lyDo: string;
  ghiChu?: string;
}

export interface BaoThieuThietBiResponse {
  maDonThue: number;
  maDonHienThi: string;
  trangThaiDon: string;
  dongDonId?: number | null;
  soLuongThieu?: number | null;
  lyDo: string;
  ghiChu?: string | null;
  thoiDiemBao: string;
  soThongBaoDaGui: number;
}

export interface ChiTietBanGiaoBackend {
  maChiTietBanGiao: number;
  maPhanCong: number;
  tinhTrangTruocThue?: string | null;
  phuKienThucGiao?: string | null;
  danhSachAnh?: string | null;
}

export interface PhieuBanGiaoBackend {
  maPhieuBanGiao: number;
  maDonThue: number;
  maNhanVien: number;
  thoiDiemLap: string;
  thoiDiemGiaoThucTe?: string | null;
  tenNhanVienLucGiao?: string | null;
  tenNguoiNhanThucTe?: string | null;
  trangThai: string; // "ChoGiao" | "DaGiao"
  chiTiet: ChiTietBanGiaoBackend[];
}

export interface CapNhatPhieuBanGiaoRequest {
  tenNguoiNhanThucTe?: string;
  thoiDiemKhachXacNhan: string;
  bangChungXacNhan?: string;
  ghiChu?: string;
  chiTiet: Array<{
    maPhanCong: number;
    tinhTrangTruocThue?: string;
    phuKienThucGiao?: string;
    danhSachAnh?: string;
    ghiChu?: string;
  }>;
}

export const handoverApi = {
  // ─── Chuẩn bị đơn (/api/chuan-bi-don) ───
  async layTinhTrangChuanBi(donId: number): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.get<unknown>(`/api/chuan-bi-don/${donId}`);
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async batDauChuanBi(donId: number): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/bat-dau`);
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async ganThietBi(donId: number, dongDonId: number, thietBiIds: number[]): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/phan-cong`, {
      dongDonId,
      thietBiIds,
    });
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async huyPhanCong(donId: number, phanCongId: number, lyDo: string): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/phan-cong/${phanCongId}/huy`, { lyDo });
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async thayTheThietBi(
    donId: number,
    phanCongId: number,
    thietBiMoiId: number,
    lyDo: string
  ): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/phan-cong/${phanCongId}/thay-the`, {
      thietBiMoiId,
      lyDo,
    });
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async xacNhanSanSang(donId: number, ghiChu?: string): Promise<ChuanBiResponseBackend> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/san-sang`, { ghiChu });
    return unwrapResult<ChuanBiResponseBackend>(res.data);
  },

  async baoThieuThietBi(donId: number, req: BaoThieuThietBiRequest): Promise<BaoThieuThietBiResponse> {
    const res = await apiClient.post<unknown>(`/api/chuan-bi-don/${donId}/bao-thieu`, req);
    return unwrapResult<BaoThieuThietBiResponse>(res.data);
  },

  // ─── Bàn giao BBBG (/api/ban-giao) ───
  async layTheoDon(maDonThue: number): Promise<PhieuBanGiaoBackend> {
    const res = await apiClient.get<unknown>(`/api/ban-giao/don-thue/${maDonThue}`);
    return unwrapResult<PhieuBanGiaoBackend>(res.data);
  },

  async taoHoacLayNhap(maDonThue: number): Promise<PhieuBanGiaoBackend> {
    const res = await apiClient.post<unknown>(`/api/ban-giao/nhap/${maDonThue}`);
    return unwrapResult<PhieuBanGiaoBackend>(res.data);
  },

  async capNhatNhap(maPhieuBanGiao: number, req: CapNhatPhieuBanGiaoRequest): Promise<PhieuBanGiaoBackend> {
    const res = await apiClient.put<unknown>(`/api/ban-giao/nhap/${maPhieuBanGiao}`, req);
    return unwrapResult<PhieuBanGiaoBackend>(res.data);
  },

  async chotBanGiao(maPhieuBanGiao: number, tenNguoiNhanThucTe: string): Promise<boolean> {
    const res = await apiClient.post<unknown>(`/api/ban-giao/${maPhieuBanGiao}/chot`, { tenNguoiNhanThucTe });
    return unwrapResult<boolean>(res.data);
  },
};
