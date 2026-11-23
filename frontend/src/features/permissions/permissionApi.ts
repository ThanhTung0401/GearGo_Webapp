import { API_BASE, isRealApiEnabled } from "../../services/apiClient";

export interface VaiTroResponse {
  roleName: string;
  tenHienThi: string;
  version: number;
  soQuyen: number;
}

export interface QuyenItem {
  ma: string;
  tenHienThi: string;
}

export interface QuyenCatalogResponse {
  nhom: string;
  quyen: QuyenItem[];
}

export interface QuyenCuaVaiTroResponse {
  roleName: string;
  version: number;
  quyenCoDuoc: string[];
}

export interface QuyenCuaNhanVienResponse {
  maTaiKhoan: number;
  maNhanVien?: number | null;
  hoTen: string;
  email: string;
  roleName: string;
  coPhanQuyenRieng: boolean;
  quyenCoDuoc: string[];
  quyenTheoVaiTro: string[];
}

export interface QuyenCuaToiResponse {
  maTaiKhoan: number;
  roleName: string;
  version: number;
  quyen: string[];
}

const TOKEN_KEY = "geargo-token";
const MOCK_KEY = "geargo-permission-mock";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Đọc thông điệp lỗi chuẩn hóa từ Backend để báo lỗi thật thay vì rơi im lặng về mock
async function extractApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { thongDiep?: string; ThongDiep?: string; message?: string; maLoi?: string };
    return data.thongDiep ?? data.ThongDiep ?? data.message ?? `Lỗi HTTP ${res.status}`;
  } catch {
    return `Lỗi HTTP ${res.status}`;
  }
}

async function apiRequest<T>(path: string, method: "GET" | "PUT" | "DELETE", body?: unknown): Promise<T | null> {
  if (!isRealApiEnabled()) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
    },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(await extractApiError(res));
  }
  return (await res.json()) as T;
}

interface MockShape {
  roles: Record<string, { version: number; permissions: string[] }>;
  staffOverrides?: Record<string, string[]>;
  currentRole: string;
}

const CATALOG_SEED: QuyenCatalogResponse[] = [
  {
    nhom: "DonThue",
    quyen: [
      { ma: "DonThue.Xem", tenHienThi: "Xem đơn thuê" },
      { ma: "DonThue.Tao", tenHienThi: "Tạo đơn thuê" },
      { ma: "DonThue.CapNhat", tenHienThi: "Cập nhật đơn thuê" },
      { ma: "DonThue.Xoa", tenHienThi: "Xóa đơn thuê" },
      { ma: "DonThue.Huy", tenHienThi: "Hủy đơn thuê" },
    ],
  },
  {
    nhom: "SanPham",
    quyen: [
      { ma: "SanPham.Xem", tenHienThi: "Xem sản phẩm" },
      { ma: "SanPham.Tao", tenHienThi: "Tạo sản phẩm" },
      { ma: "SanPham.CapNhat", tenHienThi: "Cập nhật sản phẩm" },
      { ma: "SanPham.Xoa", tenHienThi: "Xóa sản phẩm" },
    ],
  },
  { nhom: "DanhMuc", quyen: [{ ma: "DanhMuc.Xem", tenHienThi: "Xem danh mục" }, { ma: "DanhMuc.Quan", tenHienThi: "Quản lý danh mục" }] },
  { nhom: "KhuyenMai", quyen: [{ ma: "KhuyenMai.Xem", tenHienThi: "Xem khuyến mãi" }, { ma: "KhuyenMai.Quan", tenHienThi: "Quản lý khuyến mãi" }] },
  { nhom: "ChinhSach", quyen: [{ ma: "ChinhSach.Xem", tenHienThi: "Xem chính sách" }, { ma: "ChinhSach.Quan", tenHienThi: "Quản lý chính sách" }] },
  { nhom: "BaoCao", quyen: [{ ma: "BaoCao.Xem", tenHienThi: "Xem báo cáo" }, { ma: "BaoCao.Xuat", tenHienThi: "Xuất báo cáo" }] },
  {
    nhom: "TaiKhoan",
    quyen: [
      { ma: "TaiKhoan.Xem", tenHienThi: "Xem tài khoản" },
      { ma: "TaiKhoan.Quan", tenHienThi: "Quản lý tài khoản" },
      { ma: "NhanVien.Xem", tenHienThi: "Xem nhân viên" },
      { ma: "NhanVien.Quan", tenHienThi: "Quản lý nhân viên" },
    ],
  },
  { nhom: "PhanQuyen", quyen: [{ ma: "PhanQuyen.Xem", tenHienThi: "Xem phân quyền" }, { ma: "PhanQuyen.Quan", tenHienThi: "Quản lý phân quyền" }] },
];

const ROLE_LABELS: Record<string, string> = {
  QuanTriVien: "Quản trị viên",
  NhanVien: "Nhân viên",
  KhachHang: "Khách hàng",
};

function saveMock(m: MockShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_KEY, JSON.stringify(m));
}

function loadMock(): MockShape {
  if (typeof window === "undefined") return { roles: {}, currentRole: "NhanVien" };
  try {
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockShape;
  } catch {
    // Bỏ qua dữ liệu mock lỗi
  }
  const seeded: MockShape = {
    roles: {
      QuanTriVien: { version: 1, permissions: CATALOG_SEED.flatMap((g) => g.quyen.map((q) => q.ma)) },
      NhanVien: { version: 1, permissions: ["DonThue.Xem", "DonThue.CapNhat", "SanPham.Xem", "DanhMuc.Xem", "KhuyenMai.Xem", "ChinhSach.Xem", "BaoCao.Xem"] },
      KhachHang: { version: 1, permissions: [] },
    },
    staffOverrides: {},
    currentRole: "QuanTriVien",
  };
  saveMock(seeded);
  return seeded;
}

export async function fetchQuyenCuaToi(): Promise<QuyenCuaToiResponse | null> {
  if (isRealApiEnabled()) {
    try {
      return await apiRequest<QuyenCuaToiResponse>("/api/auth/quyen-cua-toi", "GET");
    } catch {
      return null;
    }
  }
  const m = loadMock();
  const roleData = m.roles[m.currentRole] ?? { version: 1, permissions: [] };
  return { maTaiKhoan: 1, roleName: m.currentRole, version: roleData.version, quyen: roleData.permissions };
}

export const permissionApi = {
  async listRoles(): Promise<VaiTroResponse[]> {
    const real = await apiRequest<VaiTroResponse[]>("/api/phan-quyen/vai-tro", "GET");
    if (real) return real;
    const m = loadMock();
    return Object.entries(m.roles).map(([roleName, v]) => ({
      roleName,
      tenHienThi: ROLE_LABELS[roleName] ?? roleName,
      version: v.version,
      soQuyen: v.permissions.length,
    }));
  },

  async catalog(): Promise<QuyenCatalogResponse[]> {
    const real = await apiRequest<QuyenCatalogResponse[]>("/api/phan-quyen/quyen", "GET");
    return real ?? CATALOG_SEED;
  },

  async getRolePermissions(roleName: string): Promise<QuyenCuaVaiTroResponse> {
    const real = await apiRequest<QuyenCuaVaiTroResponse>(`/api/phan-quyen/vai-tro/${encodeURIComponent(roleName)}`, "GET");
    if (real) return real;
    const m = loadMock();
    const r = m.roles[roleName] ?? { version: 0, permissions: [] };
    return { roleName, version: r.version, quyenCoDuoc: [...r.permissions].sort() };
  },

  async setRolePermissions(roleName: string, quyen: string[]): Promise<QuyenCuaVaiTroResponse> {
    const real = await apiRequest<QuyenCuaVaiTroResponse>(`/api/phan-quyen/vai-tro/${encodeURIComponent(roleName)}`, "PUT", { quyen });
    if (real) return real;
    const m = loadMock();
    const prev = m.roles[roleName] ?? { version: 0, permissions: [] };
    m.roles[roleName] = { version: prev.version + 1, permissions: [...new Set(quyen)].sort() };
    saveMock(m);
    return { roleName, version: m.roles[roleName].version, quyenCoDuoc: m.roles[roleName].permissions };
  },

  async getStaffPermissions(id: number): Promise<QuyenCuaNhanVienResponse> {
    const real = await apiRequest<QuyenCuaNhanVienResponse>(`/api/phan-quyen/nhan-vien/${id}`, "GET");
    if (real) return real;
    const m = loadMock();
    const rolePerms = m.roles.NhanVien?.permissions ?? [];
    const ov = m.staffOverrides?.[String(id)];
    return {
      maTaiKhoan: id,
      hoTen: `Nhân viên #${id}`,
      email: "",
      roleName: "NhanVien",
      coPhanQuyenRieng: Boolean(ov),
      quyenCoDuoc: ov ? [...ov].sort() : [...rolePerms].sort(),
      quyenTheoVaiTro: [...rolePerms].sort(),
    };
  },

  async setStaffPermissions(id: number, quyen: string[]): Promise<QuyenCuaNhanVienResponse> {
    const real = await apiRequest<QuyenCuaNhanVienResponse>(`/api/phan-quyen/nhan-vien/${id}`, "PUT", { quyen });
    if (real) return real;
    const m = loadMock();
    m.staffOverrides = { ...(m.staffOverrides ?? {}), [String(id)]: [...new Set(quyen)].sort() };
    saveMock(m);
    return this.getStaffPermissions(id);
  },

  async resetStaffPermissions(id: number): Promise<QuyenCuaNhanVienResponse> {
    const real = await apiRequest<QuyenCuaNhanVienResponse>(`/api/phan-quyen/nhan-vien/${id}`, "DELETE");
    if (real) return real;
    const m = loadMock();
    if (m.staffOverrides) delete m.staffOverrides[String(id)];
    saveMock(m);
    return this.getStaffPermissions(id);
  },

  async myPermissions(): Promise<QuyenCuaToiResponse> {
    const real = await apiRequest<QuyenCuaToiResponse>("/api/auth/quyen-cua-toi", "GET");
    if (real) return real;
    const m = loadMock();
    const r = m.roles[m.currentRole] ?? { version: 0, permissions: [] };
    return { maTaiKhoan: 0, roleName: m.currentRole, version: r.version, quyen: r.permissions };
  },

  setMockCurrentRole(roleName: string) {
    const m = loadMock();
    m.currentRole = roleName;
    saveMock(m);
  },
};
