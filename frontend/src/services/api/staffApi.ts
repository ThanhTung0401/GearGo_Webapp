/**
 * staffApi.ts - Quản trị nhân sự, vai trò & tài khoản (WP-M01: UC07 - UC11, UC13, UC16)
 * Kết nối các API admin (/api/nhan-vien, /api/tai-khoan) qua apiClient.
 */

import { apiClient } from "../apiClient";

export interface PhanTrangResponse<T> {
  items: T[];
  tongSo: number;
  trang: number;
  soMoiTrang: number;
}

export interface TimNhanVienParams {
  tuKhoa?: string;
  vaiTro?: string;
  trangThaiLamViec?: string;
  trangThaiTaiKhoan?: string;
  trang?: number;
  soMoiTrang?: number;
}

export interface TaoNhanVienRequest {
  hoTen: string;
  email: string;
  soDienThoai: string;
  diaChi?: string;
  ngayVaoLam?: string;
  vaiTro: string; // "NhanVien" | "QuanTriVien"
  matKhauKhoiTao: string;
}

export interface CapNhatNhanVienRequest {
  hoTen: string;
  email: string;
  soDienThoai: string;
  diaChi?: string;
  ngayVaoLam?: string;
}

export interface DoiVaiTroRequest {
  vaiTroMoi: string;
  lyDo: string;
}

export interface NghiViecRequest {
  ngayNghiViec: string;
  lyDo: string;
}

export interface NhanVienResponse {
  maNhanVien: number;
  maTaiKhoan: number;
  hoTen?: string;
  email?: string;
  soDienThoai?: string;
  diaChi?: string;
  ngayVaoLam?: string;
  ngayNghiViec?: string;
  vaiTro: string;
  trangThaiTaiKhoan: string;
  trangThaiLamViec: string;
  congViecCanBanGiao?: Array<{
    maPhieuBaoTri: number;
    maThietBi: number;
    trangThai: string;
    loaiXuLy?: string;
    moTaLoi?: string;
  }>;
}

export interface TimTaiKhoanParams {
  tuKhoa?: string;
  vaiTro?: string; // "KhachHang" | "NhanVien" | "QuanTriVien"
  trangThai?: string; // "HoatDong" | "BiKhoa"
  trang?: number;
  soMoiTrang?: number;
}

export interface TaiKhoanResponse {
  maTaiKhoan: number;
  email?: string;
  soDienThoai?: string;
  vaiTro: string;
  trangThai: string;
  lyDoKhoa?: string;
  hoTen?: string;
  maNhanVien?: number;
  maKhachHang?: number;
  ngayTao: string;
  ngayCapNhat: string;
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "all") {
      query.append(key, String(val));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : "";
}

export const staffApi = {
  /**
   * Tra cứu danh sách nhân viên có phân trang, tìm kiếm & bộ lọc vai trò (UC09 / UC1.9)
   */
  async timNhanVien(params?: TimNhanVienParams): Promise<PhanTrangResponse<NhanVienResponse>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<PhanTrangResponse<NhanVienResponse>>(`/api/nhan-vien${q}`);
    return res.data;
  },

  /**
   * Xem chi tiết hồ sơ nhân viên (UC08 / UC1.8)
   */
  async layNhanVien(id: number): Promise<NhanVienResponse> {
    const res = await apiClient.get<NhanVienResponse>(`/api/nhan-vien/${id}`);
    return res.data;
  },

  /**
   * Tạo tài khoản nhân viên mới kèm mật khẩu khởi tạo và phân quyền vai trò (UC07 / UC1.7, UC16 / UC1.7.1)
   */
  async taoNhanVien(req: TaoNhanVienRequest): Promise<NhanVienResponse> {
    const res = await apiClient.post<NhanVienResponse>("/api/nhan-vien", req);
    return res.data;
  },

  /**
   * Cập nhật thông tin lý lịch nhân sự (UC08 / UC1.8)
   */
  async capNhatNhanVien(id: number, req: CapNhatNhanVienRequest): Promise<NhanVienResponse> {
    const res = await apiClient.put<NhanVienResponse>(`/api/nhan-vien/${id}`, req);
    return res.data;
  },

  /**
   * Thay đổi vai trò nghiệp vụ (Admin <-> Staff) kèm lý do phê duyệt (UC10 / UC1.10)
   */
  async doiVaiTro(id: number, req: DoiVaiTroRequest): Promise<NhanVienResponse> {
    const res = await apiClient.post<NhanVienResponse>(`/api/nhan-vien/${id}/doi-vai-tro`, req);
    return res.data;
  },

  /**
   * Ghi nhận nhân viên nghỉ việc và hủy hiệu lực tài khoản (UC08 Phụ lục / UC1.8)
   */
  async ghiNhanNghiViec(id: number, req: NghiViecRequest): Promise<NhanVienResponse> {
    const res = await apiClient.post<NhanVienResponse>(`/api/nhan-vien/${id}/nghi-viec`, req);
    return res.data;
  },

  /**
   * Tra cứu danh sách tài khoản toàn hệ thống hoặc theo vai trò Khách hàng (UC13 / UC1.13)
   */
  async timTaiKhoan(params?: TimTaiKhoanParams): Promise<PhanTrangResponse<TaiKhoanResponse>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<PhanTrangResponse<TaiKhoanResponse>>(`/api/tai-khoan${q}`);
    return res.data;
  },

  /**
   * Khóa tài khoản khách hàng hoặc nhân viên kèm lý do bắt buộc (UC11 / UC1.11)
   */
  async khoaTaiKhoan(maTaiKhoan: number, lyDo: string): Promise<TaiKhoanResponse> {
    const res = await apiClient.post<TaiKhoanResponse>(`/api/tai-khoan/${maTaiKhoan}/khoa`, { lyDo });
    return res.data;
  },

  /**
   * Mở khóa tài khoản đã bị khóa (UC11 / UC1.11)
   */
  async moKhoaTaiKhoan(maTaiKhoan: number, lyDo: string): Promise<TaiKhoanResponse> {
    const res = await apiClient.post<TaiKhoanResponse>(`/api/tai-khoan/${maTaiKhoan}/mo-khoa`, { lyDo });
    return res.data;
  },
};
