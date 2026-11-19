/**
 * catalogApi.ts - Quản trị Danh mục và Sản phẩm (WP-M06: UC44 - UC53 / UC6.1 - UC6.8)
 * Kết nối trực tiếp tới ASP.NET Core Backend qua apiClient.
 */

import { apiClient } from "../apiClient";

export interface DanhMucBackend {
  maDanhMuc: number;
  tenDanhMuc: string;
  maDanhMucCha?: number | null;
  moTa?: string;
  thuTuHienThi: number;
  trangThai: string; // "HienThi" | "TamAn"
  danhMucCon?: DanhMucBackend[];
}

export interface TaoDanhMucDto {
  tenDanhMuc: string;
  maDanhMucCha?: number | null;
  moTa?: string;
  thuTuHienThi?: number;
  trangThai?: string;
}

export interface CapNhatDanhMucDto extends TaoDanhMucDto {}

export interface SanPhamBackend {
  maSanPham: number;
  maDanhMuc: number;
  maSanPhamHienThi: string;
  tenSanPham: string;
  thuongHieu?: string;
  moTa?: string;
  sucChua?: number;
  kichThuoc?: string;
  thongSo?: string;
  giaThueMoiNgay: number;
  mucCocMoiThietBi: number;
  giaTriBoiThuong: number;
  trangThaiKinhDoanh: string; // "DangKinhDoanh" | "TamNgung" | "NgungKinhDoanh"
  hinhAnhChinh?: string;
  hinhAnhs?: string[];
  soLuongKhaDung?: number;
  diemTrungBinh?: number;
  soLuongDanhGia?: number;
}

export interface TaoSanPhamDto {
  maDanhMuc: number;
  maSanPhamHienThi: string;
  tenSanPham: string;
  thuongHieu?: string;
  moTa?: string;
  sucChua?: number;
  kichThuoc?: string;
  thongSo?: string;
  giaThueMoiNgay: number;
  mucCocMoiThietBi: number;
  giaTriBoiThuong: number;
  trangThaiKinhDoanh?: string;
}

export interface CapNhatSanPhamDto extends TaoSanPhamDto {}

export interface HinhAnhSanPhamBackend {
  maHinhAnh: number;
  maSanPham: number;
  duongDan: string;
  laAnhChinh: boolean;
  thuTu: number;
}

export const catalogApi = {
  // ─── Danh mục công khai (UC47 / UC6.3) ───
  async layCayDanhMuc(): Promise<DanhMucBackend[]> {
    const res = await apiClient.get<{ duLieu?: DanhMucBackend[]; thanhCong?: boolean } | DanhMucBackend[]>("/api/danh-muc");
    // Xử lý cả dạng bọc Result<T> hoặc trả mảng trực tiếp
    if (res.data && "duLieu" in res.data && Array.isArray(res.data.duLieu)) {
      return res.data.duLieu;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  async layChiTietDanhMuc(id: number): Promise<DanhMucBackend> {
    const res = await apiClient.get<{ duLieu?: DanhMucBackend } | DanhMucBackend>(`/api/danh-muc/${id}`);
    if (res.data && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as DanhMucBackend;
  },

  // ─── Quản trị Danh mục (Admin - UC44, UC45, UC46, UC48) ───
  async adminLayDanhSachDanhMuc(): Promise<DanhMucBackend[]> {
    const res = await apiClient.get<DanhMucBackend[]>("/api/danh-muc/quan-ly");
    return Array.isArray(res.data) ? res.data : [];
  },

  async adminTaoDanhMuc(dto: TaoDanhMucDto): Promise<DanhMucBackend> {
    const res = await apiClient.post<DanhMucBackend>("/api/danh-muc", {
      tenDanhMuc: dto.tenDanhMuc,
      maDanhMucCha: dto.maDanhMucCha ?? null,
      moTa: dto.moTa ?? "",
      thuTuHienThi: dto.thuTuHienThi ?? 0,
      trangThai: dto.trangThai ?? "HienThi",
    });
    return res.data;
  },

  async adminCapNhatDanhMuc(id: number, dto: CapNhatDanhMucDto): Promise<DanhMucBackend> {
    const res = await apiClient.put<DanhMucBackend>(`/api/danh-muc/${id}`, {
      tenDanhMuc: dto.tenDanhMuc,
      maDanhMucCha: dto.maDanhMucCha ?? null,
      moTa: dto.moTa ?? "",
      thuTuHienThi: dto.thuTuHienThi ?? 0,
      trangThai: dto.trangThai ?? "HienThi",
    });
    return res.data;
  },

  async adminDoiTrangThaiDanhMuc(id: number, trangThaiMoi: "HienThi" | "TamAn" | string): Promise<{ message: string }> {
    const res = await apiClient.patch<{ message: string }>(`/api/danh-muc/${id}/trang-thai`, {
      trangThaiMoi,
    });
    return res.data;
  },

  async adminXoaDanhMuc(id: number): Promise<{ message: string }> {
    const res = await apiClient.del<{ message: string }>(`/api/danh-muc/${id}`);
    return res.data;
  },

  // ─── Sản phẩm công khai ───
  async layDanhSachSanPham(params?: {
    tuKhoa?: string;
    maDanhMuc?: number;
    gioNhan?: string;
    gioTra?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<SanPhamBackend[]> {
    const qs = new URLSearchParams();
    if (params?.tuKhoa) qs.set("tuKhoa", params.tuKhoa);
    if (params?.maDanhMuc) qs.set("maDanhMuc", String(params.maDanhMuc));
    if (params?.gioNhan) qs.set("gioNhan", params.gioNhan);
    if (params?.gioTra) qs.set("gioTra", params.gioTra);
    if (params?.trang) qs.set("trang", String(params.trang));
    if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<unknown>(`/api/san-pham${suffix}`);
    const data = res.data as Record<string, unknown> | SanPhamBackend[];
    // SanPhamController trả Result<PagedResult<SanPhamResponse>>: { thanhCong, duLieu: { items } }
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      const inner = ("duLieu" in data && data.duLieu ? data.duLieu : data) as Record<string, unknown> | SanPhamBackend[];
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === "object" && "items" in inner && Array.isArray(inner.items)) {
        return inner.items as SanPhamBackend[];
      }
    }
    return [];
  },

  async layChiTietSanPham(id: number, params?: { gioNhan?: string; gioTra?: string }): Promise<SanPhamBackend> {
    const qs = new URLSearchParams();
    if (params?.gioNhan) qs.set("gioNhan", params.gioNhan);
    if (params?.gioTra) qs.set("gioTra", params.gioTra);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ duLieu?: SanPhamBackend } | SanPhamBackend>(`/api/san-pham/${id}${suffix}`);
    if (res.data && typeof res.data === "object" && "duLieu" in res.data && res.data.duLieu) {
      return res.data.duLieu;
    }
    return res.data as SanPhamBackend;
  },

  // ─── Quản trị Sản phẩm (Admin - UC49, UC50, UC51, UC52, UC53) ───
  async adminLayDanhSachSanPham(params?: {
    tuKhoa?: string;
    trang?: number;
    soMoiTrang?: number;
  }): Promise<{ total: number; items: SanPhamBackend[] }> {
    const qs = new URLSearchParams();
    if (params?.tuKhoa) qs.set("tuKhoa", params.tuKhoa);
    if (params?.trang) qs.set("trang", String(params.trang));
    if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await apiClient.get<{ total?: number; Total?: number; items?: SanPhamBackend[]; Items?: SanPhamBackend[] }>(
      `/api/san-pham/quan-ly${suffix}`
    );
    const total = res.data.total ?? res.data.Total ?? 0;
    const items = res.data.items ?? res.data.Items ?? [];
    return { total, items };
  },

  async adminTaoSanPham(dto: TaoSanPhamDto): Promise<SanPhamBackend> {
    const res = await apiClient.post<SanPhamBackend>("/api/san-pham", dto);
    return res.data;
  },

  async adminCapNhatSanPham(id: number, dto: CapNhatSanPhamDto): Promise<SanPhamBackend> {
    const res = await apiClient.put<SanPhamBackend>(`/api/san-pham/${id}`, dto);
    return res.data;
  },

  async adminDoiTrangThaiSanPham(
    id: number,
    trangThaiMoi: "DangKinhDoanh" | "TamNgung" | "NgungKinhDoanh" | string
  ): Promise<{ message: string }> {
    const res = await apiClient.patch<{ message: string }>(`/api/san-pham/${id}/trang-thai`, {
      trangThaiMoi,
    });
    return res.data;
  },

  async adminLayHinhAnh(id: number): Promise<HinhAnhSanPhamBackend[]> {
    const res = await apiClient.get<HinhAnhSanPhamBackend[]>(`/api/san-pham/${id}/hinh-anh`);
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Upload hình ảnh sản phẩm dưới dạng Multipart Form Data (UC49)
   */
  async adminUploadHinhAnh(id: number, file: File): Promise<HinhAnhSanPhamBackend> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.postFormData<HinhAnhSanPhamBackend>(`/api/san-pham/${id}/hinh-anh`, formData);
    return res.data;
  },

  async adminXoaHinhAnh(maHinhAnh: number): Promise<{ message: string }> {
    const res = await apiClient.del<{ message: string }>(`/api/san-pham/hinh-anh/${maHinhAnh}`);
    return res.data;
  },
};

