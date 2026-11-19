/**
 * surchargeApi.ts - Phụ phí phát sinh, duyệt và giải quyết tranh chấp (/api/phu-phi)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface CanCuTinhPhiBackend {
  loaiPhi?: string;
  congThuc?: string;
  donGiaSnapshot?: number;
  heSo?: number;
  soNgayTre?: number;
  gioTraDuKien?: string;
  thoiDiemKetThuc?: string;
  ghiChu?: string;
}

export interface GoiYPhuPhiBackend {
  maChiTietBanGiao: number;
  loaiPhi: string;
  soTienGoiY: number;
  lyDo: string;
  canCu: CanCuTinhPhiBackend;
}

export interface PhuPhiBackend {
  maPhuPhi: number;
  maDonThue: number;
  maChiTietBanGiao?: number | null;
  maNguoiLap: number;
  tenNguoiLap?: string | null;
  maNguoiDuyet?: number | null;
  tenNguoiDuyet?: string | null;
  maPhuPhiGoc?: number | null;
  maDoiSoat?: number | null;
  loaiPhi: string; // "TreHan" | "VeSinhDacBiet" | "HuHong" | "MatPhuKien" | "MatThietBi" | "Khac"
  soTien: number;
  lyDo?: string | null;
  canCuTinhPhi?: CanCuTinhPhiBackend | null;
  bangChung?: string[] | null;
  thoiDiemLap: string;
  thoiDiemDuyet?: string | null;
  trangThaiDuyet: string; // "ChoDuyet" | "DaDuyet" | "TuChoi"
  trangThaiTranhChap?: string | null; // "DangTranhChap" | "DaGiaiQuyet"
  ketQuaGiaiQuyet?: string | null;
  daKhoaDoiSoat: boolean;
}

export const surchargeApi = {
  async layTheoDon(donId: number): Promise<PhuPhiBackend[]> {
    const res = await apiClient.get<unknown>(`/api/phu-phi/theo-don/${donId}`);
    return unwrapResult<PhuPhiBackend[]>(res.data);
  },

  async goiYPhi(maChiTietBanGiao: number): Promise<GoiYPhuPhiBackend[]> {
    const res = await apiClient.get<unknown>(`/api/phu-phi/goi-y?maChiTietBanGiao=${maChiTietBanGiao}`);
    return unwrapResult<GoiYPhuPhiBackend[]>(res.data);
  },

  async lapPhi(req: {
    maDonThue: number;
    maChiTietBanGiao?: number | null;
    loaiPhi: string;
    soTienDeNghi?: number | null;
    lyDo: string;
    danhSachAnh?: string[];
  }): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>("/api/phu-phi", req);
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async capNhatPhi(
    id: number,
    req: { soTien?: number; lyDo?: string; danhSachAnh?: string[] }
  ): Promise<PhuPhiBackend> {
    const res = await apiClient.put<unknown>(`/api/phu-phi/${id}`, req);
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async duyetPhi(id: number, lyDo?: string): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>(`/api/phu-phi/${id}/duyet`, { ketQua: "Duyet", lyDo });
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async tuChoiPhi(id: number, lyDo: string): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>(`/api/phu-phi/${id}/tu-choi`, { ketQua: "TuChoi", lyDo });
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async taoTranhChap(id: number, noiDung: string, danhSachAnh?: string[]): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>(`/api/phu-phi/${id}/tranh-chap`, {
      noiDung,
      danhSachAnh,
    });
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async giaiQuyetTranhChap(
    id: number,
    req: { ketQua: "GiuNguyen" | "HuyPhi" | "DieuChinh"; lyDo: string; soTienDeXuatSauXuLy?: number }
  ): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>(`/api/phu-phi/${id}/giai-quyet-tranh-chap`, req);
    return unwrapResult<PhuPhiBackend>(res.data);
  },

  async lapDieuChinhPhi(
    id: number,
    req: { soTienDieuChinhCoDau: number; lyDo: string; danhSachAnh?: string[] }
  ): Promise<PhuPhiBackend> {
    const res = await apiClient.post<unknown>(`/api/phu-phi/${id}/dieu-chinh`, req);
    return unwrapResult<PhuPhiBackend>(res.data);
  },
};
