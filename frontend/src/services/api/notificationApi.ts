/**
 * notificationApi.ts - Thông báo người dùng (/api/v1/thong-bao) & Quản trị gửi lỗi/thử lại (/api/v1/admin/thong-bao)
 */

import { apiClient } from "../apiClient";
import { buildQuery, PagedBackendResponse, unwrapPaged, unwrapResult } from "./apiHelpers";

export interface ThongBaoBackend {
  maThongBao: number;
  maDonThue?: number | null;
  tieuDe: string;
  noiDung: string;
  daDoc: boolean;
  thoiDiemTao: string;
  loaiSuKien?: string | null;
  trangThaiGui: string;
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
    const res = await apiClient.get<unknown>(`/api/v1/thong-bao${q}`);
    return unwrapResult<DanhSachThongBaoBackend>(res.data);
  },

  async demChuaDoc(): Promise<number> {
    const res = await apiClient.get<{ soChuaDoc?: number }>("/api/v1/thong-bao/chua-doc/dem");
    const data = unwrapResult<{ soChuaDoc?: number }>(res.data);
    return Number(data?.soChuaDoc ?? 0);
  },

  async danhDauDaDoc(id: number): Promise<void> {
    await apiClient.post<unknown>(`/api/v1/thong-bao/${id}/da-doc`);
  },

  async danhDauTatCaDaDoc(): Promise<void> {
    await apiClient.post<unknown>("/api/v1/thong-bao/da-doc-tat-ca");
  },

  async adminGuiThuCong(req: {
    tieuDe: string;
    noiDung: string;
    maTaiKhoanNhan?: number | null;
    maDonThue?: number | null;
    loaiSuKien?: string;
  }): Promise<unknown> {
    const res = await apiClient.post<unknown>("/api/v1/admin/thong-bao", req);
    return unwrapResult<unknown>(res.data);
  },

  async adminLayGuiLoi(params?: { trang?: number; soMoiTrang?: number }): Promise<PagedBackendResponse<ThongBaoGuiLoiBackend>> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/thong-bao/gui-loi${q}`);
    return unwrapPaged<ThongBaoGuiLoiBackend>(res.data);
  },

  async adminThuLai(id: number, lyDo?: string): Promise<ThongBaoGuiLoiBackend> {
    const res = await apiClient.post<unknown>(`/api/v1/admin/thong-bao/${id}/thu-lai`, { lyDo });
    return unwrapResult<ThongBaoGuiLoiBackend>(res.data);
  },
};
