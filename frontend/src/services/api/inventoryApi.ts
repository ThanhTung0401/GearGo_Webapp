/**
 * inventoryApi.ts - Quản lý Kiểm kê kho và Điều chỉnh kho (WP-M06: UC55, UC56, UC57, UC58 / UC6.10, UC6.11)
 * Kết nối trực tiếp tới ASP.NET Core Backend qua apiClient.
 */

import { apiClient } from "../apiClient";

export interface DongDieuChinhDto {
  maThietBi?: number;
  maChiTietPhieuNhap?: number;
  giaTriDeNghiSau?: unknown;
  ghiChu?: string;
}

export interface LapDieuChinhKhoDto {
  loaiDieuChinh: string; // "KiemKeSaiLech" | "GiangCapThietBi" | "NgungSuDung" | "SaiGiaNhap" | "KhaiBaoThieuThietBi" | "KhaiBaoTrungSaiThietBi"
  maPhieuNhapLienQuan?: number;
  lyDo: string;
  bangChung?: string[];
  chiTiet: DongDieuChinhDto[];
}

export interface ChiTietDieuChinhBackend {
  maChiTietDieuChinh: number;
  maThietBi?: number;
  maThietBiHienThi?: string;
  maChiTietPhieuNhap?: number;
  giaTriTruoc?: string;
  giaTriSau?: string;
  ghiChu?: string;
}

export interface DieuChinhKhoResponseBackend {
  maPhieuDieuChinh: number;
  maPhieuNhapLienQuan?: number;
  loaiDieuChinh?: string;
  lyDo?: string;
  bangChung?: string[];
  trangThai: string; // "Nhap" | "ChoDuyet" | "DaDuyet" | "TuChoi"
  maNguoiLap: number;
  tenNguoiLapLucLap?: string;
  thoiDiemLap: string;
  maNguoiDuyet?: number;
  tenNguoiDuyetLucDuyet?: string;
  thoiDiemDuyet?: string;
  thoiDiemApDung?: string;
  chiTiet: ChiTietDieuChinhBackend[];
}

export interface DanhSachDieuChinhBackend {
  items: DieuChinhKhoResponseBackend[];
  tongSo: number;
  trang: number;
  soMoiTrang: number;
}

export const inventoryApi = {
  // ─── Danh sách & Chi tiết Phiếu Điều Chỉnh (UC55 - UC58) ───
  async timPhieu(params?: {
    trang?: number;
    soMoiTrang?: number;
    loaiDieuChinh?: string;
    trangThai?: string;
    // [PN-11] Lọc theo phiếu nhập gốc; BE clamp pageSize 1..100 nên client-side filter sẽ miss.
    maPhieuNhapLienQuan?: number;
  }): Promise<DanhSachDieuChinhBackend> {
    const qs = new URLSearchParams();
    if (params?.trang) qs.set("trang", String(params.trang));
    if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
    if (params?.loaiDieuChinh) qs.set("loaiDieuChinh", params.loaiDieuChinh);
    if (params?.trangThai) qs.set("trangThai", params.trangThai);
    if (params?.maPhieuNhapLienQuan) qs.set("maPhieuNhapLienQuan", String(params.maPhieuNhapLienQuan));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ duLieu?: DanhSachDieuChinhBackend } | DanhSachDieuChinhBackend>(
      `/api/dieu-chinh-kho${suffix}`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return (res.data as DanhSachDieuChinhBackend) || { items: [], tongSo: 0, trang: 1, soMoiTrang: 20 };
  },

  async layChiTiet(id: number): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.get<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      `/api/dieu-chinh-kho/${id}`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  /**
   * Lập phiếu điều chỉnh kho mới (UC55 / UC6.10: Kiểm kê kho & đề xuất lệch)
   */
  async lapPhieu(dto: LapDieuChinhKhoDto): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.post<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      "/api/dieu-chinh-kho",
      dto
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  async capNhatNhap(id: number, dto: LapDieuChinhKhoDto): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.put<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      `/api/dieu-chinh-kho/${id}`,
      dto
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  /**
   * Gửi duyệt phiếu điều chỉnh kho (chuyển sang ChoDuyet)
   */
  async guiDuyet(id: number): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.post<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      `/api/dieu-chinh-kho/${id}/gui-duyet`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  /**
   * Quản trị viên phê duyệt và áp dụng điều chỉnh kho nguyên tử (UC57, UC58 / UC6.11)
   */
  async duyetVaApDung(id: number): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.post<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      `/api/dieu-chinh-kho/${id}/duyet-ap-dung`
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  /**
   * Quản trị viên từ chối phiếu điều chỉnh kho
   */
  async tuChoi(id: number, lyDoTuChoi: string): Promise<DieuChinhKhoResponseBackend> {
    const res = await apiClient.post<{ duLieu?: DieuChinhKhoResponseBackend } | DieuChinhKhoResponseBackend>(
      `/api/dieu-chinh-kho/${id}/tu-choi`,
      { lyDo: lyDoTuChoi }
    );
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DieuChinhKhoResponseBackend;
  },

  /**
   * Tra cứu giá trị hiệu lực của phiếu nhập sau các đợt điều chỉnh
   */
  async layGiaTriHieuLucPhieuNhap(maPhieuNhap: number): Promise<unknown> {
    const res = await apiClient.get(`/api/dieu-chinh-kho/hieu-luc/${maPhieuNhap}`);
    return res.data;
  },
};

