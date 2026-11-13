/**
 * profileApi.ts - Quản lý hồ sơ cá nhân người dùng đang đăng nhập (/api/v1/ho-so)
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
}

export const profileApi = {
  async layHoSoToi(): Promise<HoSoBackend> {
    const res = await apiClient.get<unknown>("/api/v1/ho-so/toi");
    return unwrapResult<HoSoBackend>(res.data);
  },

  async capNhatHoSoToi(req: CapNhatHoSoRequest): Promise<HoSoBackend> {
    const res = await apiClient.put<unknown>("/api/v1/ho-so/toi", req);
    return unwrapResult<HoSoBackend>(res.data);
  },
};
