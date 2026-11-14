/**
 * orderApi.ts - Đơn thuê khách hàng (/api/v1/don-thue) & Vận hành (/api/v1/van-hanh/don-thue)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface TaoDonThueRequest {
  gioNhanDuKien: string;
  gioTraDuKien: string;
  tenNguoiNhan: string;
  soDienThoaiNguoiNhan: string;
  emailLienHe: string;
  ghiChu?: string;
  diaChiNhanHang?: string;
  maKhuyenMai?: string;
  idempotencyKey?: string;
  giaTamTinhKyVong?: number;
  hashBaoGia?: string;
  dongYThayDoiGia?: boolean;
  chiTiet: Array<{ maSanPham: number; soLuong: number }>;
}

export interface BaoGiaThayDoiDetail {
  soNgayThue: number;
  tongTienThueTruocGiam: number;
  tongTienGiam: number;
  tongTienThueSauGiam: number;
  tongTienCoc: number;
  tongThanhToanDuKien: number;
  hashBaoGia: string;
}

export interface DonThueCreatedBackend {
  maDonThue: number;
  maDonHienThi: string;
  tongTienThueTruocGiam: number;
  tongTienCoc: number;
  trangThai: string;
  hanThanhToan: string;
}

export interface DongThueBackend {
  maChiTietDon: number;
  maSanPham: number;
  tenSanPhamLucDat: string;
  soLuong: number;
  soNgayTinhTien: number;
  donGiaThueMoiNgay: number;
  tienGiam: number;
  mucCocMoiThietBi: number;
  thanhTienSauGiam: number;
}

export interface ThanhToanDonBackend {
  maThanhToan: number;
  phuongThuc: string;
  trangThai: string;
  tongSoTien: number;
  thoiDiemThanhCong?: string | null;
}

export interface SuKienDonBackend {
  thoiDiem: string;
  trangThaiTruoc?: string | null;
  trangThaiSau: string;
  lyDo?: string | null;
}

export interface ChiTietBanGiaoKhachBackend {
  maChiTietBanGiao: number;
  maThietBiHienThi: string;
  tenSanPham: string;
  tinhTrangTruocThue?: string | null;
  phuKienThucGiao?: string | null;
  danhSachAnh?: string | null;
}

export interface PhieuBanGiaoKhachBackend {
  maPhieuBanGiao: number;
  trangThai: string;
  thoiDiemGiaoThucTe?: string | null;
  tenNhanVienLucGiao?: string | null;
  tenNguoiNhanThucTe?: string | null;
  chiTiet: ChiTietBanGiaoKhachBackend[];
}

export interface PhuPhiKhachBackend {
  maPhuPhi: number;
  loaiPhi: string;
  soTien: number;
  lyDo?: string | null;
  trangThaiDuyet: string;
}

export interface HoanTienKhachBackend {
  maHoanTien: number;
  loaiHoan?: string | null;
  soTien: number;
  trangThai: string;
  thoiDiemThanhCong?: string | null;
  nhanHienThi: string;
}

export interface DonTaiChinhBackend {
  nhanTra: {
    tongThietBiDaGiao: number;
    daTra: number;
    matDaDuyet: number;
    dangXuLyMat: number;
    soConNo: number;
    cacDot: Array<{
      maPhieuNhanTra: number;
      maPhieuHienThi: string;
      lanTra: number;
      laLanTraCuoi: boolean;
      thoiDiemChot?: string | null;
      soTra: number;
      soMat: number;
    }>;
    conNo: Array<{
      maChiTietBanGiao: number;
      maThietBiHienThi: string;
      tenSanPham: string;
      dangXuLyMat: boolean;
    }>;
  };
  phuPhi: {
    tongDeNghi: number;
    tongDaDuyet: number;
    tongTranhChap: number;
    tongTuChoi: number;
    soTranhChapDangMo: number;
    items: Array<{
      maPhuPhi: number;
      loaiPhi: string;
      soTien: number;
      lyDo?: string | null;
      trangThaiDuyet: string;
      trangThaiTranhChap?: string | null;
      ketQuaGiaiQuyet?: string | null;
      maPhuPhiGoc?: number | null;
      maDoiSoat?: number | null;
      laDieuChinh: boolean;
    }>;
  };
  doiSoat: Array<{
    maDoiSoat: number;
    maDoiSoatGoc?: number | null;
    laDieuChinh: boolean;
    loaiDoiSoat: string;
    tienCocDuocDoiSoat: number;
    tongPhuPhiDuocDuyet: number;
    soTienCanHoan: number;
    soTienCanThuThem: number;
    trangThai: string;
    thoiDiemLap: string;
    thoiDiemChot?: string | null;
    lyDoDieuChinh?: string | null;
  }>;
  thu: {
    tienThueDaThu: number;
    tienCocDaThu: number;
    thuBoSungDaThu: number;
    chuaPhanLoai: number;
    dangCho: number;
  };
  hoan: {
    tongDuKien: number;
    tongDangXuLy: number;
    tongDaHoan: number;
    tongCanXuLyLai: number;
    items: HoanTienKhachBackend[];
  };
  huy?: {
    trangThaiHuy: string;
    thoiDiemHuy?: string | null;
    lyDoHuy?: string | null;
    tienThueGiuLai: number;
  } | null;
  thoiDiemHoanTat?: string | null;
  coDieuChinhSauHoanTat: boolean;
  nhan: string[];
}

export interface DonChiTietBackend {
  maDonThue: number;
  maDonHienThi: string;
  trangThai: string;
  ngayDat: string;
  gioNhanDuKien: string;
  gioTraDuKien: string;
  hanThanhToan?: string | null;
  tenNguoiNhan?: string | null;
  soDienThoaiNguoiNhan?: string | null;
  emailLienHe?: string | null;
  tongTienThueTruocGiam: number;
  tongTienGiam: number;
  tongTienCoc: number;
  daThuThanhCong: number;
  dong: DongThueBackend[];
  thanhToan: ThanhToanDonBackend[];
  lichSu: SuKienDonBackend[];
  banGiao: PhieuBanGiaoKhachBackend[];
  nhanTra: Array<{
    maPhieuNhanTra: number;
    maPhieuHienThi: string;
    lanTra: number;
    trangThai: string;
    thoiDiemChot?: string | null;
  }>;
  phuPhi: PhuPhiKhachBackend[];
  hoanTien: HoanTienKhachBackend[];
  thaoTacHopLe: string[];
  taiChinh: DonTaiChinhBackend;
}

export interface DonTomTatBackend {
  maDonThue: number;
  maDonHienThi: string;
  ngayDat: string;
  gioNhanDuKien: string;
  gioTraDuKien: string;
  trangThai: string;
  tongTienThue: number;
  tongTienCoc: number;
  daThu: number;
  nhan: string[];
}

export interface DonVanHanhTomTatBackend {
  maDonThue: number;
  maDonHienThi: string;
  maKhachHang: number;
  tenKhachHang: string;
  tenNguoiNhan?: string | null;
  soDienThoaiNguoiNhan?: string | null;
  ngayDat: string;
  gioNhanDuKien: string;
  gioTraDuKien: string;
  trangThai: string;
  soDongSanPham: number;
  tongThietBiCanGan: number;
  tongThietBiDaGan: number;
}

export interface DonVanHanhChiTietBackend {
  don: DonChiTietBackend;
  maKhachHang: number;
  tenKhachHang: string;
  ghiChu?: string | null;
  phanCong: Array<{
    maPhanCong: number;
    maChiTietDon: number;
    maThietBi: number;
    maThietBiHienThi: string;
    trangThai: string;
  }>;
  viecCanLam: string[];
}

export interface XemTruocHuyBackend {
  maDonThue: number;
  trangThaiHienTai: string;
  loaiHuy: string;
  coTheHuy: boolean;
  lyDoKhongTheHuy?: string | null;
  mocTinhToanUtc: string;
  gioNhanDuKien: string;
  soGioTruocNhan: number;
  nhanhChinhSach: string;
  maChinhSach: number;
  tyLeGiuLai?: number | null;
  tienThueDaThu: number;
  tienCocDaThu: number;
  tienThueGiuLai: number;
  tienThueHoan: number;
  tienCocHoan: number;
  tongHoan: number;
  tienThuVuot: number;
  dauVanTay: string;
  canhBao: string[];
}

export interface HuyDonBackend {
  maDonThue: number;
  trangThai: string;
  loaiHuy: string;
  thoiDiemHuy?: string | null;
  lyDoHuy?: string | null;
  tienThueGiuLai: number;
  hoanTien: HoanTienKhachBackend[];
  tongChoHoan: number;
  tongDaHoan: number;
  soKhoanHoanChuaXong: number;
  lichSu: SuKienDonBackend[];
}

export const orderApi = {
  // ─── Khách hàng (/api/v1/don-thue) ───
  async taoDon(req: TaoDonThueRequest): Promise<DonThueCreatedBackend> {
    const res = await apiClient.post<unknown>("/api/v1/don-thue", req);
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
    const res = await apiClient.get<unknown>(`/api/v1/don-thue${q}`);
    return unwrapPaged<DonTomTatBackend>(res.data);
  },

  async layChiTietDon(id: number): Promise<DonChiTietBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/don-thue/${id}`);
    return unwrapResult<DonChiTietBackend>(res.data);
  },

  async layLichSuDon(id: number): Promise<SuKienDonBackend[]> {
    const res = await apiClient.get<unknown>(`/api/v1/don-thue/${id}/lich-su`);
    return unwrapResult<SuKienDonBackend[]>(res.data);
  },

  async layBanGiaoDon(id: number): Promise<PhieuBanGiaoKhachBackend[]> {
    const res = await apiClient.get<unknown>(`/api/v1/don-thue/${id}/ban-giao`);
    return unwrapResult<PhieuBanGiaoKhachBackend[]>(res.data);
  },

  async layChinhSachDon(id: number): Promise<unknown> {
    const res = await apiClient.get<unknown>(`/api/v1/don-thue/${id}/chinh-sach`);
    return unwrapResult<unknown>(res.data);
  },

  async xemTruocHuy(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/don-thue/${id}/huy/xem-truoc`);
    return unwrapResult<XemTruocHuyBackend>(res.data);
  },

  async khachHuyDon(
    id: number,
    req: { lyDo: string; xacNhanChiPhi?: boolean; dauVanTayXemTruoc?: string }
  ): Promise<HuyDonBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/don-thue/${id}/huy`, {
      lyDo: req.lyDo,
      xacNhanChiPhi: req.xacNhanChiPhi ?? true,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<HuyDonBackend>(res.data);
  },

  async huyDonChuaThanhToan(id: number, lyDo: string): Promise<boolean> {
    const res = await apiClient.put<unknown>(`/api/v1/don-thue/${id}/huy`, { lyDo });
    return unwrapResult<boolean>(res.data);
  },

  // ─── Vận hành (/api/v1/van-hanh/don-thue) ───
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
    const res = await apiClient.get<unknown>(`/api/v1/van-hanh/don-thue${q}`);
    return unwrapPaged<DonVanHanhTomTatBackend>(res.data);
  },

  async layChiTietVanHanh(id: number): Promise<DonVanHanhChiTietBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/van-hanh/don-thue/${id}`);
    return unwrapResult<DonVanHanhChiTietBackend>(res.data);
  },

  async xemTruocCuaHangHuy(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/van-hanh/don-thue/${id}/cua-hang-huy/xem-truoc`);
    return unwrapResult<XemTruocHuyBackend>(res.data);
  },

  async cuaHangHuy(
    id: number,
    req: { lyDo: string; xacNhanChiPhi?: boolean; dauVanTayXemTruoc?: string }
  ): Promise<HuyDonBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/van-hanh/don-thue/${id}/cua-hang-huy`, {
      lyDo: req.lyDo,
      xacNhanChiPhi: req.xacNhanChiPhi ?? true,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<HuyDonBackend>(res.data);
  },

  async xemTruocKhongDenNhan(id: number): Promise<XemTruocHuyBackend> {
    const res = await apiClient.get<unknown>(`/api/v1/van-hanh/don-thue/${id}/khong-den-nhan/xem-truoc`);
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
    const res = await apiClient.post<unknown>(`/api/v1/van-hanh/don-thue/${id}/khong-den-nhan`, {
      ghiChu: req.ghiChu,
      bangChung: req.bangChung,
      xuLyHuy: req.xuLyHuy ?? false,
      xacNhanChiPhi: req.xacNhanChiPhi ?? false,
      dauVanTayXemTruoc: req.dauVanTayXemTruoc,
    });
    return unwrapResult<unknown>(res.data);
  },
};
