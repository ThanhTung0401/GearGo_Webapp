/**
 * notificationApi.ts - Thông báo người dùng (/api/thong-bao) & Quản trị gửi lỗi/thử lại (/api/thong-bao)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface ThongBaoBackend {
  maThongBao: number;
  maDonThue?: number | null;
  tieuDe: string;
  noiDung: string;
  daDoc?: boolean;
  thoiDiemDoc?: string | null;
  thoiDiemTao: string;
  loaiSuKien?: string | null;
  trangThaiGui?: string;
}

export interface DanhSachThongBaoBackend {
  items: ThongBaoBackend[];
  tongSo: number;
  trang: number;
  soMoiTrang: number;
  soChuaDoc: number;
}

export interface ThongBaoGuiLoiBackend {
  maThongBao: number;
  maTaiKhoan: number;
  maDonThue?: number | null;
  tieuDe: string;
  noiDung: string;
  loaiSuKien?: string | null;
  trangThaiGui: string;
  soLanThuGui: number;
  loiGuiGanNhat?: string | null;
  thoiDiemTao: string;
}

export const notificationApi = {
  async layCuaToi(params?: { chuaDoc?: boolean; trang?: number; soMoiTrang?: number }): Promise<DanhSachThongBaoBackend> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/thong-bao${q}`);
    return unwrapResult<DanhSachThongBaoBackend>(res.data);
  },

  async demChuaDoc(): Promise<number> {
    const res = await apiClient.get<{ soLuongChuaDoc?: number; soChuaDoc?: number }>("/api/thong-bao/chua-doc/dem");
    const data = unwrapResult<{ soLuongChuaDoc?: number; soChuaDoc?: number }>(res.data);
    return Number(data?.soLuongChuaDoc ?? data?.soChuaDoc ?? 0);
  },

  async danhDauDaDoc(id: number): Promise<void> {
    await apiClient.post<unknown>(`/api/thong-bao/${id}/da-doc`);
  },

  async danhDauTatCaDaDoc(): Promise<void> {
    await apiClient.post<unknown>("/api/thong-bao/da-doc-tat-ca");
  },

  async adminGuiThuCong(req: {
    tieuDe: string;
    noiDung: string;
    maTaiKhoanNhan?: number | null;
    vaiTroNhan?: string | null;
    maDonThue?: number | null;
    loaiSuKien?: string;
  }): Promise<unknown> {
    const res = await apiClient.post<unknown>("/api/thong-bao", req);
    return unwrapResult<unknown>(res.data);
  },

  async adminLayGuiLoi(params?: { trang?: number; soMoiTrang?: number }): Promise<PagedBackendResponse<ThongBaoGuiLoiBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/thong-bao/gui-loi${q}`);
    return unwrapPaged<ThongBaoGuiLoiBackend>(res.data);
  },

  async adminThuLai(id: number, lyDo?: string): Promise<ThongBaoGuiLoiBackend> {
    const res = await apiClient.post<unknown>(`/api/thong-bao/${id}/thu-lai`, { lyDo });
    return unwrapResult<ThongBaoGuiLoiBackend>(res.data);
  },
};
