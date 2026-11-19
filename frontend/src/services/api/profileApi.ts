/**
 * profileApi.ts - Quản lý hồ sơ cá nhân người dùng đang đăng nhập (/api/ho-so)
 */

import { apiClient } from "../apiClient";
import { unwrapResult } from "./apiHelpers";

export interface HoSoBackend {
  maHoSo: number;
  hoTen: string;
  email: string;
  soDienThoai: string;
  diaChi?: string | null;
  ngaySinh?: string | null;
  anhDaiDien?: string | null;
}

export interface CapNhatHoSoRequest {
  hoTen: string;
  email: string;
  soDienThoai: string;
  diaChi?: string | null;
  ngaySinh?: string | null;
  anhDaiDien?: string | null;
  maOtp?: string | null;
}

export interface GuiOtpDoiLienHeRequest {
  emailMoi?: string | null;
  soDienThoaiMoi?: string | null;
}

export interface GuiOtpDoiLienHeResponse {
  thongDiep: string;
  hetHanLuc: string;
}

export const profileApi = {
  async layHoSoToi(): Promise<HoSoBackend> {
    const res = await apiClient.get<unknown>("/api/ho-so/toi");
    return unwrapResult<HoSoBackend>(res.data);
  },

  async guiOtpDoiLienHe(req: GuiOtpDoiLienHeRequest): Promise<GuiOtpDoiLienHeResponse> {
    const res = await apiClient.post<unknown>("/api/ho-so/toi/gui-otp-lien-he", req);
    return unwrapResult<GuiOtpDoiLienHeResponse>(res.data);
  },

  async capNhatHoSoToi(req: CapNhatHoSoRequest): Promise<HoSoBackend> {
    const res = await apiClient.put<unknown>("/api/ho-so/toi", req);
    return unwrapResult<HoSoBackend>(res.data);
  },
};
