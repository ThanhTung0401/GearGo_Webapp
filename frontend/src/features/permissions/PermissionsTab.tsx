import { useCallback, useEffect, useMemo, useState } from "react";
import { MIN_STAFF } from "../../constants/permissions";
import {
  permissionApi,
  type QuyenCatalogResponse,
  type QuyenCuaToiResponse,
  type VaiTroResponse,
} from "./permissionApi";

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
    window.addEventListener("geargo:permissions-changed", handler);
    return () => {
      window.removeEventListener("geargo-permissions-changed", handler);
      window.removeEventListener("geargo:permissions-changed", handler);
    };
  }, [refresh]);

  const set = useMemo(() => new Set(data?.quyen ?? []), [data]);
  const has = useCallback(
    (code: string) => {
      if (data?.roleName === "QuanTriVien") return true;
      return set.has(code);
    },
    [data, set]
  );

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
    // Chặn admin lỡ tay gỡ các quyền thiết yếu của NhanVien (MIN_STAFF)
    if (selected === "NhanVien") {
      const thieu = MIN_STAFF.filter((p) => !selectedPerms.has(p));
      if (thieu.length > 0) {
        const ok = window.confirm(`Bạn đang gỡ ${thieu.length} quyền thiết yếu: ${thieu.join(", ")}. Tiếp tục?`);
        if (!ok) return;
      }
    }

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
