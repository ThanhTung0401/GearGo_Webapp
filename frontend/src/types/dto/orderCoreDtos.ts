/**
 * orderCoreDtos.ts - DTO đặt đơn, chi tiết đơn, lịch sử và bàn giao cơ bản
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
