/**
 * feat/ROLE_Adjustment — Frontend phân quyền động.
 *
 * Một file gộp: API client (real + mock localStorage), hook `usePermissions`,
 * và trang `PermissionsTab` cho admin.
 *
 * Contract khớp 1-1 backend:
 *   GET  /api/admin/phan-quyen/vai-tro
 *   GET  /api/admin/phan-quyen/quyen
 *   GET  /api/admin/phan-quyen/vai-tro/{role}
 *   PUT  /api/admin/phan-quyen/vai-tro/{role}   body: { quyen: string[] }
 *   GET  /api/auth/quyen-cua-toi
 */

import { useCallback, useEffect, useMemo, useState } from "react";

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

export interface QuyenCuaToiResponse {
  maTaiKhoan: number;
  roleName: string;
  version: number;
  quyen: string[];
}

const API_BASE = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
const TOKEN_KEY = "geargo-token";
const MOCK_KEY = "geargo-permission-mock";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiGet<T>(path: string): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function apiPut<T>(path: string, body: unknown): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface MockShape {
  roles: Record<string, { version: number; permissions: string[] }>;
  currentRole: string;
}

const CATALOG_SEED: QuyenCatalogResponse[] = [
  { nhom: "DonThue", quyen: [
    { ma: "DonThue.Xem", tenHienThi: "Xem đơn thuê" },
    { ma: "DonThue.Tao", tenHienThi: "Tạo đơn thuê" },
    { ma: "DonThue.CapNhat", tenHienThi: "Cập nhật đơn thuê" },
    { ma: "DonThue.Xoa", tenHienThi: "Xóa đơn thuê" },
    { ma: "DonThue.Huy", tenHienThi: "Hủy đơn thuê" },
  ]},
  { nhom: "SanPham", quyen: [
    { ma: "SanPham.Xem", tenHienThi: "Xem sản phẩm" },
    { ma: "SanPham.Tao", tenHienThi: "Tạo sản phẩm" },
    { ma: "SanPham.CapNhat", tenHienThi: "Cập nhật sản phẩm" },
    { ma: "SanPham.Xoa", tenHienThi: "Xóa sản phẩm" },
  ]},
  { nhom: "DanhMuc", quyen: [
    { ma: "DanhMuc.Xem", tenHienThi: "Xem danh mục" },
    { ma: "DanhMuc.Quan", tenHienThi: "Quản lý danh mục" },
  ]},
  { nhom: "KhuyenMai", quyen: [
    { ma: "KhuyenMai.Xem", tenHienThi: "Xem khuyến mãi" },
    { ma: "KhuyenMai.Quan", tenHienThi: "Quản lý khuyến mãi" },
  ]},
  { nhom: "ChinhSach", quyen: [
    { ma: "ChinhSach.Xem", tenHienThi: "Xem chính sách" },
    { ma: "ChinhSach.Quan", tenHienThi: "Quản lý chính sách" },
  ]},
  { nhom: "BaoCao", quyen: [
    { ma: "BaoCao.Xem", tenHienThi: "Xem báo cáo" },
    { ma: "BaoCao.Xuat", tenHienThi: "Xuất báo cáo" },
  ]},
  { nhom: "TaiKhoan", quyen: [
    { ma: "TaiKhoan.Xem", tenHienThi: "Xem tài khoản" },
    { ma: "TaiKhoan.Quan", tenHienThi: "Quản lý tài khoản" },
    { ma: "NhanVien.Xem", tenHienThi: "Xem nhân viên" },
    { ma: "NhanVien.Quan", tenHienThi: "Quản lý nhân viên" },
  ]},
  { nhom: "PhanQuyen", quyen: [
    { ma: "PhanQuyen.Xem", tenHienThi: "Xem phân quyền" },
    { ma: "PhanQuyen.Quan", tenHienThi: "Quản lý phân quyền" },
  ]},
];

function loadMock(): MockShape {
  if (typeof window === "undefined") return { roles: {}, currentRole: "NhanVien" };
  try {
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockShape;
  } catch {
    // fall through
  }
  const seeded: MockShape = {
    roles: {
      QuanTriVien: { version: 1, permissions: CATALOG_SEED.flatMap((g) => g.quyen.map((q) => q.ma)) },
      NhanVien: { version: 1, permissions: ["DonThue.Xem", "DonThue.CapNhat", "SanPham.Xem", "DanhMuc.Xem", "KhuyenMai.Xem", "ChinhSach.Xem", "BaoCao.Xem"] },
      KhachHang: { version: 1, permissions: [] },
    },
    currentRole: "QuanTriVien",
  };
  saveMock(seeded);
  return seeded;
}

function saveMock(m: MockShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_KEY, JSON.stringify(m));
}

const ROLE_LABELS: Record<string, string> = {
  QuanTriVien: "Quản trị viên",
  NhanVien: "Nhân viên",
  KhachHang: "Khách hàng",
};

export const permissionApi = {
  async listRoles(): Promise<VaiTroResponse[]> {
    const real = await apiGet<VaiTroResponse[]>("/api/admin/phan-quyen/vai-tro");
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
    const real = await apiGet<QuyenCatalogResponse[]>("/api/admin/phan-quyen/quyen");
    return real ?? CATALOG_SEED;
  },

  async getRolePermissions(roleName: string): Promise<QuyenCuaVaiTroResponse> {
    const real = await apiGet<QuyenCuaVaiTroResponse>(`/api/admin/phan-quyen/vai-tro/${encodeURIComponent(roleName)}`);
    if (real) return real;
    const m = loadMock();
    const r = m.roles[roleName] ?? { version: 0, permissions: [] };
    return { roleName, version: r.version, quyenCoDuoc: [...r.permissions].sort() };
  },

  async setRolePermissions(roleName: string, quyen: string[]): Promise<QuyenCuaVaiTroResponse> {
    const real = await apiPut<QuyenCuaVaiTroResponse>(`/api/admin/phan-quyen/vai-tro/${encodeURIComponent(roleName)}`, { quyen });
    if (real) return real;
    const m = loadMock();
    const prev = m.roles[roleName] ?? { version: 0, permissions: [] };
    m.roles[roleName] = { version: prev.version + 1, permissions: [...new Set(quyen)].sort() };
    saveMock(m);
    return { roleName, version: m.roles[roleName].version, quyenCoDuoc: m.roles[roleName].permissions };
  },

  async myPermissions(): Promise<QuyenCuaToiResponse> {
    const real = await apiGet<QuyenCuaToiResponse>("/api/auth/quyen-cua-toi");
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

export function usePermissions() {
  const [data, setData] = useState<QuyenCuaToiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await permissionApi.myPermissions();
      setData(me);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("geargo-permissions-changed", handler);
    return () => window.removeEventListener("geargo-permissions-changed", handler);
  }, [refresh]);

  const set = useMemo(() => new Set(data?.quyen ?? []), [data]);
  const has = useCallback((code: string) => {
    if (data?.roleName === "QuanTriVien") return true;
    return set.has(code);
  }, [data, set]);

  return { data, loading, has, refresh };
}

export function PermissionsTab() {
  const [roles, setRoles] = useState<VaiTroResponse[]>([]);
  const [catalog, setCatalog] = useState<QuyenCatalogResponse[]>([]);
  const [selected, setSelected] = useState<string>("NhanVien");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [rs, cat] = await Promise.all([permissionApi.listRoles(), permissionApi.catalog()]);
    setRoles(rs);
    setCatalog(cat);
  }, []);

  const loadRole = useCallback(async (role: string) => {
    const r = await permissionApi.getRolePermissions(role);
    setSelectedPerms(new Set(r.quyenCoDuoc));
    setVersion(r.version);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => { void loadRole(selected); }, [selected, loadRole]);

  const toggle = (code: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await permissionApi.setRolePermissions(selected, [...selectedPerms]);
      setVersion(r.version);
      setMsg(`Đã lưu. Version mới: ${r.version}`);
      window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
      await loadAll();
    } catch (e) {
      setMsg(`Lỗi: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const customerLocked = selected === "KhachHang";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Phân quyền theo vai trò</h2>
          <p className="text-sm text-gray-500">
            Bật/tắt từng quyền cho một role. Mọi user mang role đó nhận thay đổi ngay request kế mà không cần đăng nhập lại.
          </p>
        </div>
        <div className="text-xs text-gray-500">Version hiện tại: <strong>{version}</strong></div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {roles.map((r) => (
          <button
            key={r.roleName}
            type="button"
            onClick={() => setSelected(r.roleName)}
            className={`btn btn-sm ${selected === r.roleName ? "btn-primary" : "btn-secondary"}`}
          >
            {r.tenHienThi} <span className="ml-1 text-xs opacity-70">({r.soQuyen})</span>
          </button>
        ))}
      </div>

      {customerLocked ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm">
          Role <strong>KhachHang</strong> không nhận quyền quản trị. Phần dành cho khách dùng policy <code>CustomerOnly</code> riêng biệt.
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {catalog.map((group) => (
            <div key={group.nhom} className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-sm mb-3">{group.nhom}</h3>
              <div className="space-y-2">
                {group.quyen.map((q) => (
                  <label key={q.ma} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPerms.has(q.ma)}
                      onChange={() => toggle(q.ma)}
                      disabled={selected === "QuanTriVien"}
                    />
                    <span>{q.tenHienThi}</span>
                    <span className="ml-auto text-xs text-gray-400">{q.ma}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected === "QuanTriVien" && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <strong>Quản trị viên</strong> luôn có mọi quyền (bypass tại handler backend); không cần cấu hình.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || customerLocked || selected === "QuanTriVien"}
          className="btn btn-primary btn-md"
        >
          {saving ? "Đang lưu…" : "Lưu phân quyền"}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
