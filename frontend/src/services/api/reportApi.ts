/**
 * reportApi.ts - Báo cáo vận hành, tài chính, kho, bảo trì & Xuất CSV
 */

import { apiClient } from "../apiClient";
import { buildQuery, unwrapResult } from "./apiHelpers";

export interface BaoCaoVanHanhBackend {
  tongQuan: {
    tongDonPhatSinh: number;
    tongDonThanhCong: number;
    tongDonBiHuy: number;
    tyLeHuyDonPhanTram: number;
    tongThietBiTrongKho: number;
    soThietBiDangChoThue: number;
    soThietBiDangBaoTri: number;
    soThietBiThatLac: number;
    tyLeHaoMonPhanTram: number;
    soNgayThueTrungBinh: number;
    tyLeQuayVongThietBi: number;
  };
  chiSoTheoSanPham: Array<{
    maSanPham: number;
    tenSanPham: string;
    tenDanhMuc: string;
    tongSoThietBi: number;
    soLuotThue: number;
    soLuotHongHoc: number;
    soLuotMat: number;
    tongDoanhThuUocTinh: number;
  }>;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const reportApi = {
  // ─── Vận hành (StaffOrAdmin - UC96/UC98) ───
  async layBaoCaoVanHanh(params?: {
    tuNgay?: string;
    denNgay?: string;
    maDanhMuc?: number;
    maSanPham?: number;
  }): Promise<BaoCaoVanHanhBackend> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao-van-hanh${q}`);
    return unwrapResult<BaoCaoVanHanhBackend>(res.data);
  },

  // ─── Kho & Bảo trì (StaffOrAdmin) ───
  async layHienTrangKho(maSanPham?: number): Promise<any> {
    const q = buildQuery({ maSanPham });
    const res = await apiClient.get<unknown>(`/api/v1/bao-cao/kho/hien-trang${q}`);
    return unwrapResult<any>(res.data);
  },

  async layThongKeBaoTri(params?: {
    tuNgay?: string;
    denNgay?: string;
    mocLoc?: string;
    loaiXuLy?: string;
  }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/bao-cao/kho/bao-tri${q}`);
    return unwrapResult<any>(res.data);
  },

  // ─── Kho Admin (AdminOnly) ───
  async layNhapHang(params?: {
    tuNgay?: string;
    denNgay?: string;
    maNhaCungCap?: number;
    maSanPhamNguon?: number;
    cheDo?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/kho/nhap-hang${q}`);
    return unwrapResult<any>(res.data);
  },

  async layDieuChinhNhap(params?: {
    tuNgay?: string;
    denNgay?: string;
    maNhaCungCap?: number;
    maSanPhamNguon?: number;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/kho/dieu-chinh-nhap${q}`);
    return unwrapResult<any>(res.data);
  },

  async layLichSuDonGia(params?: {
    tuNgay?: string;
    denNgay?: string;
    maNhaCungCap?: number;
    maSanPhamNguon?: number;
  }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/kho/lich-su-don-gia${q}`);
    return unwrapResult<any>(res.data);
  },

  async xuatCsvKho(params: {
    loaiBaoCao: "NhapHang" | "DieuChinhNhap" | "LichSuDonGia" | "HienTrangKho" | "BaoTri";
    tuNgay?: string;
    denNgay?: string;
    maNhaCungCap?: number;
    maSanPhamNguon?: number;
    maSanPham?: number;
    cheDo?: string;
    mocLoc?: string;
    loaiXuLy?: string;
  }): Promise<void> {
    const q = buildQuery(params as Record<string, unknown>);
    const { blob, fileName } = await apiClient.getBlob(`/api/v1/admin/bao-cao/kho/xuat-csv${q}`);
    triggerDownload(blob, fileName);
  },

  // ─── Tài chính (AdminOnly) ───
  async layDoanhThuHoanTat(params?: { tuNgay?: string; denNgay?: string; maDon?: number; trang?: number; soMoiTrang?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/doanh-thu-hoan-tat${q}`);
    return unwrapResult<any>(res.data);
  },

  async layPhiHuy(params?: { tuNgay?: string; denNgay?: string; maDon?: number; trang?: number; soMoiTrang?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/phi-huy${q}`);
    return unwrapResult<any>(res.data);
  },

  async layDieuChinhDoanhThu(params?: { tuNgay?: string; denNgay?: string; maDon?: number; trang?: number; soMoiTrang?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/dieu-chinh${q}`);
    return unwrapResult<any>(res.data);
  },

  async layThuHoan(params?: { tuNgay?: string; denNgay?: string; maDon?: number; trang?: number; soMoiTrang?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/thu-hoan${q}`);
    return unwrapResult<any>(res.data);
  },

  async layCocChuaTatToan(params?: { maDon?: number; trang?: number; soMoiTrang?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/coc-chua-tat-toan${q}`);
    return unwrapResult<any>(res.data);
  },

  async layKhoanCanXuLy(params?: { maDon?: number }): Promise<any> {
    const q = buildQuery(params as Record<string, unknown>);
    const res = await apiClient.get<unknown>(`/api/v1/admin/bao-cao/tai-chinh/can-xu-ly${q}`);
    return unwrapResult<any>(res.data);
  },

  async xuatCsvTaiChinh(params: {
    loaiBaoCao: "DoanhThuHoanTat" | "PhiHuy" | "DieuChinhDoanhThu" | "ThuHoan" | "CocChuaTatToan" | "CanXuLy";
    tuNgay?: string;
    denNgay?: string;
    maDon?: number;
  }): Promise<void> {
    const q = buildQuery(params as Record<string, unknown>);
    const { blob, fileName } = await apiClient.getBlob(`/api/v1/admin/bao-cao/tai-chinh/xuat-csv${q}`);
    triggerDownload(blob, fileName);
  },
};
