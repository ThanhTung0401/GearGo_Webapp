/**
 * equipmentDtos.ts - Các kiểu dữ liệu DTO từ API Thiết bị & Bảo trì
 */

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
