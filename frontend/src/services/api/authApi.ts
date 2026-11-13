/**
 * authApi.ts - Quản trị xác thực và phiên làm việc người dùng (WP-M01: UC01 - UC06, UC12, UC14, UC15)
 * Kết nối trực tiếp tới ASP.NET Core Backend qua apiClient.
 */

import { apiClient, setAuthToken } from "../apiClient";

export interface DangKyRequest {
  email: string;
  soDienThoai: string;
  matKhau: string;
  xacNhanMatKhau: string;
  hoTen?: string;
  diaChi?: string;
  ngaySinh?: string;
}

export interface DangNhapRequest {
  taiKhoan: string;
  matKhau: string;
}

export interface AuthResponse {
  token: string;
  hetHanSau: string;
  maTaiKhoan: number;
  vaiTro: string;
  hoTen?: string;
  email?: string;
}

export interface QuenMatKhauRequest {
  email: string;
}

export interface XacThucOtpRequest {
  email: string;
  otp: string;
}

export interface DatLaiMatKhauRequest {
  token: string;
  matKhauMoi: string;
  xacNhanMatKhau: string;
}

export interface DoiMatKhauRequest {
  matKhauHienTai: string;
  matKhauMoi: string;
  xacNhanMatKhauMoi: string;
}

export interface QuyenResponse {
  vaiTro: string;
  cacQuyen: string[];
}

export const authApi = {
  /**
   * Đăng ký tài khoản khách hàng mới (UC01 / UC1.1)
   * Backend sẽ kiểm tra Rate Limiting chống spam bot và kiểm tra trùng lặp Email/SĐT.
   */
  async dangKy(req: DangKyRequest): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/api/auth/dang-ky", req);
    if (res.data.token) {
      setAuthToken(res.data.token);
    }
    return res.data;
  },

  /**
   * Đăng nhập hệ thống & lưu JWT Bearer token (UC02 / UC1.2)
   */
  async dangNhap(req: DangNhapRequest): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/api/auth/dang-nhap", req);
    if (res.data.token) {
      setAuthToken(res.data.token);
    }
    return res.data;
  },

  /**
   * Gửi yêu cầu nhận mã xác minh OTP qua Email khi quên mật khẩu (UC04 / UC15)
   */
  async quenMatKhau(email: string): Promise<{ thongDiep: string }> {
    const res = await apiClient.post<{ thongDiep: string }>("/api/auth/quen-mat-khau", { email });
    return res.data;
  },

  /**
   * Xác minh mã OTP 6 chữ số người dùng nhập (UC04 Bước 2)
   */
  async xacThucOtp(email: string, otp: string): Promise<{ thongDiep: string; token: string }> {
    const res = await apiClient.post<{ thongDiep: string; token: string }>("/api/auth/xac-thuc-otp", { email, otp });
    return res.data;
  },

  /**
   * Đặt lại mật khẩu mới sau khi xác thực OTP thành công (UC04 Bước 3)
   */
  async datLaiMatKhau(req: DatLaiMatKhauRequest): Promise<{ thongDiep: string }> {
    const res = await apiClient.post<{ thongDiep: string }>("/api/auth/dat-lai-mat-khau", req);
    return res.data;
  },

  /**
   * Lấy thông tin hồ sơ của tài khoản đang đăng nhập hiện tại (UC05 / UC1.5)
   */
  async layThongTinToi(): Promise<AuthResponse> {
    const res = await apiClient.get<AuthResponse>("/api/auth/toi");
    return res.data;
  },

  /**
   * Lấy danh sách quyền hạn chi tiết của phiên đăng nhập (UC10 / Phân quyền)
   */
  async layQuyenCuaToi(): Promise<QuyenResponse> {
    const res = await apiClient.get<QuyenResponse>("/api/auth/quyen-cua-toi");
    return res.data;
  },

  /**
   * Đăng xuất và thu hồi JWT token phía server (UC03 / UC1.3)
   */
  async dangXuat(): Promise<{ thongDiep: string }> {
    try {
      const res = await apiClient.post<{ thongDiep: string }>("/api/auth/dang-xuat");
      return res.data;
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Đổi mật khẩu trong phiên làm việc hiện tại (UC12 / UC1.12)
   */
  async doiMatKhau(req: DoiMatKhauRequest): Promise<{ thongDiep: string }> {
    const res = await apiClient.post<{ thongDiep: string }>("/api/auth/doi-mat-khau", req);
    // Sau khi đổi mật khẩu, server đã thu hồi token cũ -> xóa token local
    setAuthToken(null);
    return res.data;
  },
};
