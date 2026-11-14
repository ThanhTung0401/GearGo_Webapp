/**
 * equipmentApi.ts - Quản lý Thiết bị, Vòng đời Sổ đời và Bảo trì thiết bị
 * (WP-M06: UC54, UC59, UC60, UC61, UC62, UC63 / UC6.9, UC6.12, UC6.13, UC6.14, UC6.15)
 * Kết nối trực tiếp tới ASP.NET Core Backend qua apiClient.
 */

import { apiClient } from "../apiClient";

export interface ThietBiBackend {
  maThietBi: number;
  maThietBiHienThi: string;
  maSanPhamHienTai: number;
  maChiTietPhieuNhap?: number;
  trangThaiSuDung: string; // "SanSang" | "DangThue" | "DangBaoTri" | "ThatLac" | "NgungSuDung"
  tinhTrang: string;
  ngayNhap: string;
  giaNhap?: number | null;
  tenSanPham?: string;
  maSanPhamNguon?: number;
  tenSanPhamNguon?: string;
  soLanThue?: number;
}

export interface TimThietBiParams {
  tuKhoa?: string;
  maSanPham?: number;
  trangThaiSuDung?: string;
  tinhTrang?: string;
  trang?: number;
  soMoiTrang?: number;
}

export interface TomTatBaoTriDto {
  maPhieuBaoTri: number;
  loaiXuLy?: string;
  moTaLoi?: string;
  trangThai: string;
  ngayBatDau?: string;
  ngayHoanThanhThucTe?: string;
}

export interface TomTatDieuChinhDto {
  maPhieuDieuChinh: number;
  loaiDieuChinh?: string;
  trangThai: string;
  lyDo?: string;
  thoiDiemLap: string;
  thoiDiemApDung?: string;
}

export interface TomTatTinhTrangDto {
  maLichSu: number;
  trangThaiTruoc?: string;
  trangThaiSau?: string;
  tinhTrangTruoc?: string;
  tinhTrangSau?: string;
  thoiDiem: string;
  lyDo?: string;
}

export interface HoSoVongDoiResponse {
  maThietBi: number;
  maThietBiHienThi: string;
  trangThaiSuDung: string;
  tinhTrang: string;
  ngayNhap: string;
  giaNhap?: number | null;
  maChiTietPhieuNhap?: number;
  maSanPhamNguon: number;
  tenSanPhamNguon: string;
  maSanPhamHienTai: number;
  tenSanPhamHienTai: string;
  lichSuBaoTri: TomTatBaoTriDto[];
  lichSuDieuChinh: TomTatDieuChinhDto[];
  lichSuTinhTrang: TomTatTinhTrangDto[];
}

export interface AnhHuongThayDoiResponse {
  coTheApDungHienTai: boolean;
  vuongMac: string[];
  thieuSoLuongTheoLich: string[];
}

export interface BaoTriResponseBackend {
  maPhieuBaoTri: number;
  maThietBi: number;
  maThietBiHienThi: string;
  tenSanPham: string;
  maDonThue?: number;
  maNguoiLap: number;
  tenNguoiLap?: string;
  maNguoiXuLy?: number;
  tenNguoiXuLy?: string;
  loaiXuLy?: string;
  moTaLoi?: string;
  mucDo?: string;
  ngayBatDau?: string;
  ngayDuKienHoanThanh?: string;
  ngayHoanThanhThucTe?: string;
  chiPhi?: number;
  ketQua?: string;
  trangThai: string;
}

export interface DanhSachBaoTriBackend {
  items: BaoTriResponseBackend[];
  tongSo: number;
  trang: number;
  soMoiTrang: number;
}

export interface PhanCongLichThietBiBackend {
  maPhanCong: number;
  maDonThue: number;
  tuNgay: string;
  denNgay: string;
  trangThai: string;
}

export const equipmentApi = {
  // ─── Thiết bị (UC54 / UC6.9) ───
  async timKiemThietBi(params?: TimThietBiParams): Promise<{ items: ThietBiBackend[]; tongSo: number }> {
    const qs = new URLSearchParams();
    if (params?.tuKhoa) qs.set("tuKhoa", params.tuKhoa);
    if (params?.maSanPham) qs.set("maSanPham", String(params.maSanPham));
    if (params?.trangThaiSuDung) qs.set("trangThaiSuDung", params.trangThaiSuDung);
    if (params?.tinhTrang) qs.set("tinhTrang", params.tinhTrang);
    if (params?.trang) qs.set("trang", String(params.trang));
    if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ duLieu?: { items: ThietBiBackend[]; tongSo: number } } | { items: ThietBiBackend[]; tongSo: number }>(
      `/api/thiet-bi${suffix}`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return (res.data as { items: ThietBiBackend[]; tongSo: number }) || { items: [], tongSo: 0 };
  },

  async layChiTietThietBi(id: number): Promise<ThietBiBackend> {
    const res = await apiClient.get<{ duLieu?: ThietBiBackend } | ThietBiBackend>(`/api/thiet-bi/${id}`);
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as ThietBiBackend;
  },

  async layLichThietBi(
    id: number,
    params?: { tuNgay?: string; denNgay?: string }
  ): Promise<PhanCongLichThietBiBackend[]> {
    const qs = new URLSearchParams();
    if (params?.tuNgay) qs.set("tuNgay", params.tuNgay);
    if (params?.denNgay) qs.set("denNgay", params.denNgay);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ duLieu?: PhanCongLichThietBiBackend[] } | PhanCongLichThietBiBackend[]>(
      `/api/thiet-bi/${id}/lich${suffix}`
    );
    if (res.data && !Array.isArray(res.data) && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  // ─── Sổ đời & Vòng đời thiết bị (UC54, UC62, UC63 / UC6.9, UC6.14, UC6.15) ───
  async layHoSoVongDoi(id: number): Promise<HoSoVongDoiResponse> {
    const res = await apiClient.get<{ duLieu?: HoSoVongDoiResponse } | HoSoVongDoiResponse>(`/api/vong-doi-thiet-bi/${id}`);
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as HoSoVongDoiResponse;
  },

  async xemAnhHuongThayDoi(
    id: number,
    req: { loaiThayDoi: string; maSanPhamDich?: number }
  ): Promise<AnhHuongThayDoiResponse> {
    const res = await apiClient.post<{ duLieu?: AnhHuongThayDoiResponse } | AnhHuongThayDoiResponse>(
      `/api/vong-doi-thiet-bi/${id}/xem-anh-huong`,
      req
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as AnhHuongThayDoiResponse;
  },

  async deNghiGiangCap(
    id: number,
    req: { maSanPhamDich: number; lyDo: string; tinhTrangMoi?: string }
  ): Promise<unknown> {
    const res = await apiClient.post(`/api/vong-doi-thiet-bi/${id}/de-nghi-giang-cap`, req);
    return res.data;
  },

  async deNghiDieuChuyenSanPham(
    id: number,
    req: { maSanPhamDich: number; lyDo: string; tinhTrangMoi?: string }
  ): Promise<unknown> {
    const res = await apiClient.post(`/api/vong-doi-thiet-bi/${id}/dieu-chuyen-san-pham`, req);
    return res.data;
  },

  async deNghiNgungSuDung(id: number, req: { lyDo: string; tinhTrangMoi?: string }): Promise<unknown> {
    const res = await apiClient.post(`/api/vong-doi-thiet-bi/${id}/de-nghi-ngung-su-dung`, req);
    return res.data;
  },

  async duyetDeNghiVongDoi(maPhieuDieuChinh: number): Promise<unknown> {
    const res = await apiClient.post(`/api/vong-doi-thiet-bi/de-nghi/${maPhieuDieuChinh}/duyet`);
    return res.data;
  },

  // ─── Bảo trì thiết bị (UC59, UC60, UC61 / UC6.12, UC6.13) ───
  async timKiemBaoTri(params?: {
    maThietBi?: number;
    trangThai?: string;
    loaiXuLy?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<DanhSachBaoTriBackend> {
    const qs = new URLSearchParams();
    if (params?.maThietBi) qs.set("maThietBi", String(params.maThietBi));
    if (params?.trangThai) qs.set("trangThai", params.trangThai);
    if (params?.loaiXuLy) qs.set("loaiXuLy", params.loaiXuLy);
    if (params?.trang) qs.set("trang", String(params.trang));
    if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ duLieu?: DanhSachBaoTriBackend } | DanhSachBaoTriBackend>(
      `/api/bao-tri${suffix}`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return (res.data as DanhSachBaoTriBackend) || { items: [], tongSo: 0, trang: 1, soMoiTrang: 20 };
  },

  async layChiTietBaoTri(id: number): Promise<BaoTriResponseBackend> {
    const res = await apiClient.get<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>(`/api/bao-tri/${id}`);
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },

  async lapPhieuBaoTri(req: {
    maThietBi: number;
    maDonThue?: number;
    loaiXuLy?: string;
    moTaLoi: string;
    mucDo?: string;
    ngayDuKienHoanThanh?: string;
    bangChung?: string;
  }): Promise<BaoTriResponseBackend> {
    const res = await apiClient.post<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>("/api/bao-tri", req);
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },

  async phanCongXuLy(
    id: number,
    req: { maNguoiXuLy: number; lyDo?: string }
  ): Promise<BaoTriResponseBackend> {
    const res = await apiClient.post<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>(
      `/api/bao-tri/${id}/phan-cong`,
      req
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },

  async capNhatTienDo(
    id: number,
    req: { ketQua?: string; chiPhi?: number; ngayDuKienHoanThanh?: string; bangChung?: string }
  ): Promise<BaoTriResponseBackend> {
    const res = await apiClient.put<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>(
      `/api/bao-tri/${id}/tien-do`,
      req
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },

  async guiKiemTra(id: number): Promise<unknown> {
    const res = await apiClient.post(`/api/bao-tri/${id}/gui-kiem-tra`);
    return res.data;
  },

  async xacNhanHoanThanh(
    id: number,
    req: { ketQuaKiemTra: string; chiPhi?: number; lyDo?: string; bangChung?: string }
  ): Promise<BaoTriResponseBackend> {
    const res = await apiClient.post<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>(
      `/api/bao-tri/${id}/hoan-thanh`,
      req
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },

  async ketThucKhongDat(
    id: number,
    req: { ketQuaKiemTra: string; chiPhi?: number; lyDo?: string; bangChung?: string }
  ): Promise<BaoTriResponseBackend> {
    const res = await apiClient.post<{ duLieu?: BaoTriResponseBackend } | BaoTriResponseBackend>(
      `/api/bao-tri/${id}/ket-thuc-khong-dat`,
      req
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as BaoTriResponseBackend;
  },
};

