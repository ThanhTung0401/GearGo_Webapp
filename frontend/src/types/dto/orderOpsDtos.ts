/**
 * orderOpsDtos.ts - DTO chi tiết đơn, đơn vận hành và xem trước/thực hiện hủy đơn
 */
import type {
  DongThueBackend,
  PhieuBanGiaoKhachBackend,
  SuKienDonBackend,
  ThanhToanDonBackend,
} from "./orderCoreDtos";
import type {
  DonTaiChinhBackend,
  HoanTienKhachBackend,
  PhuPhiKhachBackend,
} from "./orderFinanceDtos";

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
  tongTienThueTruocGiam?: number;
  tongTienGiam?: number;
  tongTienCoc?: number;
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
