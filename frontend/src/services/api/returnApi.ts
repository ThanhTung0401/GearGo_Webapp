/**
 * returnApi.ts - Nhận trả nhiều đợt (/api/v1/nhan-tra) & Xử lý quá hạn (/api/v1/qua-han)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface ChiTietNhanTraBackend {
  maChiTietNhanTra: number;
  maChiTietBanGiao: number;
  maThietBi: number;
  maThietBiHienThi: string;
  tenSanPham: string;
  thoiDiemTraThucTe?: string | null;
  ketLuan?: string | null; // "Dat" | "CanVeSinh" | "HongNhe" | "HongNang" | "ThieuPhuKien" | "MatThietBi"
  tinhTrangSauThue?: string | null;
  phuKienThucNhan?: string | null;
  phuKienConThieu?: string | null;
  danhSachAnh?: string | null;
  bienBanMat?: string | null;
  trangThaiXuLy?: string | null;
  maNguoiDuyetMat?: number | null;
  tenNguoiDuyetMat?: string | null;
  thoiDiemDuyetMat?: string | null;
  ghiChu?: string | null;
}

export interface NhanTraBackend {
  maPhieu: number;
  maDonThue: number;
  maPhieuHienThi: string;
  lanTra: number;
  trangThai: string;
  thoiDiemLap: string;
  thoiDiemChot?: string | null;
  tenNhanVienLucNhan?: string | null;
  ghiChu?: string | null;
  laLanTraCuoi: boolean;
  soThietBiConNo: number;
  chiTiet: ChiTietNhanTraBackend[];
  canhBaoDonSau: string[];
}

export interface ThietBiConNoBackend {
  maChiTietBanGiao: number;
  maThietBi: number;
  maThietBiHienThi: string;
  tenSanPham: string;
  tinhTrangTruocThue?: string | null;
  phuKienThucGiao?: string | null;
  maPhieuNhanTraDangGiu?: number | null;
  trangThaiXuLy?: string | null;
}

export interface DongNhanTraRequest {
  maChiTietBanGiao: number;
  thoiDiemTraThucTe?: string | null;
  ketLuan?: string | null;
  tinhTrangSauThue?: string | null;
  phuKienThucNhan?: Array<{ ten: string; soLuong: number }>;
  phuKienConThieu?: Array<{ ten: string; soLuong: number }>;
  danhSachAnh?: string[];
  bienBanMat?: string | null;
  ghiChu?: string | null;
}

export interface DonQuaHanBackend {
  maDonThue: number;
  maDonHienThi: string;
  tenKhachHang: string;
  soDienThoai: string;
  gioNhanThucTe?: string | null;
  gioTraDuKien: string;
  soThietBiChuaTra: number;
  tongSoThietBi: number;
  soNgayTreMax: number;
  tongPhiTreDuKien: number;
  laTraMotPhan: boolean;
}

export interface QuaHanChiTietBackend {
  maDonThue: number;
  gioTraDuKien: string;
  mocTinhNow: string;
  laTraMotPhan: boolean;
  danhSachThietBi: Array<{
    maChiTietBanGiao: number;
    maThietBi: number;
    maThietBiHienThi: string;
    maSanPham: number;
    tenSanPham: string;
    gioTraThucTe?: string | null;
    gioDuyetMat?: string | null;
    trangThai: string;
    soNgayTre: number;
    donGiaSnapshot: number;
    heSo: number;
    phiTreDuKien: number;
  }>;
  tongPhiTreDuKien: number;
}

export interface NhatKyLienHeQuaHanBackend {
  maNhatKyLienHe: number;
  maDonThue: number;
  maTaiKhoan: number;
  tenNguoiLienHe: string;
  kenhLienHe: string;
  ketQua: string;
  noiDung: string;
  henTraMoi?: string | null;
  thoiDiemLienHe: string;
}

export interface TaoNhatKyLienHeQuaHanRequest {
  kenhLienHe: string;
  ketQua: string;
  noiDung: string;
  henTraMoi?: string | null;
}

export const returnApi = {
  // ─── Nhận trả (/api/v1/nhan-tra) ───
  async layDanhSachTheoDon(donId: number): Promise<NhanTraBackend[]> {
    const res = await apiClient.get<unknown>(`/api/v1/nhan-tra/theo-don/${donId}`);
    return unwrapResult<NhanTraBackend[]>(res.data);
  },

  async layThietBiConNo(donId: number): Promise<ThietBiConNoBackend[]> {
    const res = await apiClient.get<unknown>(`/api/v1/nhan-tra/theo-don/${donId}/con-no`);
    return unwrapResult<ThietBiConNoBackend[]>(res.data);
  },

  async taoPhieuNhap(
    donId: number,
    danhSachChiTietBanGiao: number[],
    ghiChu?: string
  ): Promise<NhanTraBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/nhan-tra/theo-don/${donId}`, {
      danhSachChiTietBanGiao,
      ghiChu,
    });
    return unwrapResult<NhanTraBackend>(res.data);
  },

  async capNhatPhieuNhap(
    phieuId: number,
    danhSachDong: DongNhanTraRequest[],
    ghiChu?: string
  ): Promise<NhanTraBackend> {
    const res = await apiClient.put<unknown>(`/api/v1/nhan-tra/${phieuId}`, {
      danhSachDong,
      ghiChu,
    });
    return unwrapResult<NhanTraBackend>(res.data);
  },

  async tachDongChoXuLy(
    phieuId: number,
    danhSachChiTietNhanTra: number[],
    lyDo: string
  ): Promise<{ phieuGoc: NhanTraBackend; phieuMoi: NhanTraBackend }> {
    const res = await apiClient.post<unknown>(`/api/v1/nhan-tra/${phieuId}/tach-cho-xu-ly`, {
      danhSachChiTietNhanTra,
      lyDo,
    });
    return unwrapResult<{ phieuGoc: NhanTraBackend; phieuMoi: NhanTraBackend }>(res.data);
  },

  async duyetKetLuanMat(
    phieuId: number,
    chiTietId: number,
    req: { lyDo: string; bienBanMat?: string; maPhuPhiBoiThuong: number }
  ): Promise<ChiTietNhanTraBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/nhan-tra/${phieuId}/chi-tiet/${chiTietId}/duyet-mat`, req);
    return unwrapResult<ChiTietNhanTraBackend>(res.data);
  },

  async chotNhanTra(phieuId: number): Promise<NhanTraBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/nhan-tra/${phieuId}/chot`);
    return unwrapResult<NhanTraBackend>(res.data);
  },

  // ─── Quá hạn (/api/v1/qua-han) ───
  async layDonQuaHan(params?: {
    denThoiDiem?: string;
    maDon?: number;
    maSanPham?: number;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<PagedBackendResponse<DonQuaHanBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/qua-han${q}`);
    return unwrapPaged<DonQuaHanBackend>(res.data);
  },

  async layChiTietQuaHan(donId: number): Promise<QuaHanChiTietBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/qua-han/${donId}`);
    return unwrapResult<QuaHanChiTietBackend>(res.data);
  },

  async layDonBiAnhHuong(donId: number): Promise<unknown[]> {
    const res = await apiClient.get<unknown>(`/api/v1/qua-han/${donId}/don-bi-anh-huong`);
    return unwrapResult<unknown[]>(res.data);
  },

  async quetNhacQuaHan(mocQuet?: string): Promise<unknown> {
    const q = buildQuery({ mocQuet });
    const res = await apiClient.post<unknown>(`/api/v1/qua-han/quet-nhac${q}`);
    return unwrapResult<unknown>(res.data);
  },

  async layNhatKyLienHe(donId: number): Promise<NhatKyLienHeQuaHanBackend[]> {
    const res = await apiClient.get<unknown>(`/api/v1/qua-han/${donId}/nhat-ky-lien-he`);
    return unwrapResult<NhatKyLienHeQuaHanBackend[]>(res.data);
  },

  async ghiNhatKyLienHe(
    donId: number,
    req: TaoNhatKyLienHeQuaHanRequest
  ): Promise<NhatKyLienHeQuaHanBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/qua-han/${donId}/nhat-ky-lien-he`, req);
    return unwrapResult<NhatKyLienHeQuaHanBackend>(res.data);
  },
};
