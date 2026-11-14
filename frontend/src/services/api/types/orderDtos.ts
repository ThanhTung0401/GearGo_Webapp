/**
 * orderDtos.ts - Các kiểu dữ liệu DTO từ API Đơn thuê & Vận hành
 */

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
