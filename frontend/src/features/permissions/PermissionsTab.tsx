import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_ONLY_PERMISSIONS, MIN_STAFF } from "../../constants/permissions";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { staffApi, type NhanVienResponse } from "../../services/api/staffApi";
import { isRealApiEnabled } from "../../services/apiClient";
import {
  permissionApi,
  type QuyenCatalogResponse,
  type QuyenCuaNhanVienResponse,
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

type PermissionScopeMode = "role" | "staff";

export function PermissionsTab() {
  const [mode, setMode] = useState<PermissionScopeMode>("role");
  const [roles, setRoles] = useState<VaiTroResponse[]>([]);
  const [catalog, setCatalog] = useState<QuyenCatalogResponse[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("NhanVien");

  // State cho chế độ phân quyền riêng từng nhân viên
  const [staffList, setStaffList] = useState<NhanVienResponse[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffDetail, setStaffDetail] = useState<QuyenCuaNhanVienResponse | null>(null);

  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState<number>(0);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [confirmMissingPerms, setConfirmMissingPerms] = useState<string[] | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const [rs, cat] = await Promise.all([permissionApi.listRoles(), permissionApi.catalog()]);
      setRoles(rs);
      setCatalog(cat);
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    }
  }, []);

  const loadStaffList = useCallback(async () => {
    // [PERM-01]: ở chế độ Mock/Demo (!isRealApiEnabled()), fallback nạp danh sách từ store để
    // tab "Phân quyền riêng 1 nhân viên" hoạt động đầy đủ — trước đây staffList luôn rỗng.
    if (!isRealApiEnabled()) {
      try {
        const mod = await import("../../data/initialStaff");
        const items = (mod as { INITIAL_STAFF_ACCOUNTS?: Array<{ id: string; username?: string; name: string; email?: string }> }).INITIAL_STAFF_ACCOUNTS ?? [];
        const mapped = items.map((s) => ({
          maTaiKhoan: Number(s.id),
          hoTen: s.name,
          email: s.email ?? s.username ?? "",
          vaiTro: "NhanVien" as const,
        }));
        setStaffList(mapped as any);
        if (mapped.length > 0) setSelectedStaffId((prev) => prev ?? mapped[0].maTaiKhoan);
      } catch {
        /* nếu không có INITIAL_STAFF_ACCOUNTS vẫn im lặng — Demo mode chỉ cần không crash */
      }
      return;
    }
    try {
      const res = await staffApi.timNhanVien({ vaiTro: "NhanVien", soMoiTrang: 100 });
      const items = res.items ?? [];
      setStaffList(items);
      if (items.length > 0) {
        setSelectedStaffId((prev) => prev ?? items[0].maTaiKhoan);
      }
    } catch {
      // Không chặn giao diện chính nếu tải danh sách nhân viên lỗi
    }
  }, []);

  const loadRolePerms = useCallback(async (role: string) => {
    setLoadingPerms(true);
    setMsg(null);
    try {
      const r = await permissionApi.getRolePermissions(role);
      setSelectedPerms(new Set(r.quyenCoDuoc));
      setVersion(r.version);
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  const loadStaffPerms = useCallback(async (maTaiKhoan: number) => {
    setLoadingPerms(true);
    setMsg(null);
    try {
      const r = await permissionApi.getStaffPermissions(maTaiKhoan);
      setStaffDetail(r);
      setSelectedPerms(new Set(r.quyenCoDuoc));
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
    void loadStaffList();
  }, [loadMeta, loadStaffList]);

  useEffect(() => {
    if (mode === "role") {
      void loadRolePerms(selectedRole);
    } else if (selectedStaffId != null) {
      void loadStaffPerms(selectedStaffId);
    }
  }, [mode, selectedRole, selectedStaffId, loadRolePerms, loadStaffPerms]);

  // Lọc bỏ hoàn toàn nhóm quyền AdminOnly (PhanQuyen.*) khi cấu hình cho Nhân viên
  const visibleCatalog = useMemo(() => {
    const isAdminRole = mode === "role" && selectedRole === "QuanTriVien";
    if (isAdminRole) return catalog;
    return catalog
      .map((g) => ({
        ...g,
        quyen: g.quyen.filter((q) => !ADMIN_ONLY_PERMISSIONS.has(q.ma)),
      }))
      .filter((g) => g.quyen.length > 0);
  }, [catalog, mode, selectedRole]);

  const toggle = (code: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleGroup = (codes: string[]) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      const allSelected = codes.every((c) => next.has(c));
      for (const c of codes) {
        if (allSelected) next.delete(c);
        else next.add(c);
      }
      return next;
    });
  };

  const commitSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const filteredPerms = [...selectedPerms].filter((p) => !ADMIN_ONLY_PERMISSIONS.has(p));
      if (mode === "role") {
        const r = await permissionApi.setRolePermissions(selectedRole, filteredPerms);
        setVersion(r.version);
        setMsg({ type: "ok", text: `Đã lưu quyền cho vai trò ${selectedRole}. Version mới: ${r.version}` });
        await loadMeta();
      } else if (selectedStaffId != null) {
        const r = await permissionApi.setStaffPermissions(selectedStaffId, filteredPerms);
        setStaffDetail(r);
        setSelectedPerms(new Set(r.quyenCoDuoc));
        setMsg({ type: "ok", text: `Đã lưu phân quyền riêng cho ${r.hoTen} (${r.quyenCoDuoc.length} quyền).` });
      }
      // [BOOT-02]: phát đồng thời cả 2 tên sự kiện để useBootstrapData nhận được dù lắng nghe
      // tên nào (gạch ngang hoặc hai chấm). Tránh race-condition mất event khi đổi quyền.
      window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
      window.dispatchEvent(new CustomEvent("geargo:permissions-changed"));
    } catch (e) {
      setMsg({ type: "err", text: `Lỗi: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleResetStaffOverride = async () => {
    if (selectedStaffId == null) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await permissionApi.resetStaffPermissions(selectedStaffId);
      setStaffDetail(r);
      setSelectedPerms(new Set(r.quyenCoDuoc));
      setMsg({ type: "ok", text: `Đã đưa ${r.hoTen} về kế thừa quyền mặc định của vai trò Nhân viên.` });
      // [BOOT-02]: phát đồng thời cả 2 tên sự kiện (xem ghi chú ở save()).
      window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
      window.dispatchEvent(new CustomEvent("geargo:permissions-changed"));
    } catch (e) {
      setMsg({ type: "err", text: `Lỗi: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    // [PERM-01]: kiểm MIN_STAFF CHO CẢ chế độ phân quyền theo vai trò VÀ phân quyền riêng NhanVien.
    // Trước đây chỉ kiểm ở mode "role" nên Admin có thể lưu 0 quyền cho 1 nhân viên cụ thể khiến
    // nhân viên đó đăng nhập bị tê liệt hoàn toàn (không có quyền cơ bản nào).
    if (mode === "role" && selectedRole === "NhanVien") {
      const thieu = MIN_STAFF.filter((p) => !selectedPerms.has(p));
      if (thieu.length > 0) {
        setConfirmMissingPerms(thieu);
        return;
      }
    }
    if (mode === "staff" && staffDetail?.roleName === "NhanVien") {
      const thieu = MIN_STAFF.filter((p) => !selectedPerms.has(p));
      if (thieu.length > 0) {
        setConfirmMissingPerms(thieu);
        return;
      }
    }
    await commitSave();
  };

  const isRoleReadonly = mode === "role" && (selectedRole === "KhachHang" || selectedRole === "QuanTriVien");

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="adm-page-title adm-page-title--compact">Phân quyền hệ thống</h2>
          <p className="adm-page-subtitle adm-page-subtitle--sm">
            Chỉ Quản trị viên được cấu hình. Hỗ trợ phân quyền chung cho tất cả nhân viên hoặc phân quyền riêng cho từng nhân viên cụ thể.
          </p>
        </div>
        {mode === "role" && (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-parchment)] border border-[var(--color-bone)] text-[var(--color-bark)]">
            Phiên bản vai trò: <strong>v{version}</strong>
          </div>
        )}
      </header>

      {/* Chuyển đổi 2 chế độ phân quyền: Tất cả nhân viên (Role) vs 1 nhân viên cụ thể */}
      <div className="inline-flex rounded-xl border border-[var(--color-bone)] bg-white p-1 gap-1 shadow-2xs" role="tablist" aria-label="Chế độ phân quyền">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "role"}
          onClick={() => setMode("role")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === "role"
              ? "bg-[var(--color-forest)] text-white"
              : "text-[var(--color-bark)] hover:bg-[var(--color-parchment)]"
          }`}
        >
          Tất cả nhân viên (Theo vai trò)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "staff"}
          onClick={() => setMode("staff")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === "staff"
              ? "bg-[var(--color-forest)] text-white"
              : "text-[var(--color-bark)] hover:bg-[var(--color-parchment)]"
          }`}
        >
          Phân quyền riêng 1 nhân viên
        </button>
      </div>

      {/* Bộ chọn đối tượng tùy theo chế độ */}
      {mode === "role" ? (
        <div className="flex gap-2 flex-wrap">
          {roles.map((r) => (
            <button
              key={r.roleName}
              type="button"
              onClick={() => setSelectedRole(r.roleName)}
              className={`btn btn-sm ${selectedRole === r.roleName ? "btn-primary" : "btn-secondary"}`}
            >
              {r.tenHienThi} <span className="ml-1 text-xs opacity-75">({r.soQuyen})</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-bone)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="select-staff-perm" className="text-xs font-bold text-[var(--color-bark)]">
              Chọn nhân viên:
            </label>
            <select
              id="select-staff-perm"
              value={selectedStaffId ?? ""}
              // [PERM-01]: Number("") trả về 0 → gọi GET /api/phan-quyen/nhan-vien/0 gây 404.
              // Chuyển value rỗng về null thay vì 0 để không kích hoạt loadStaffPerms(0).
              onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
              className="adm-select min-w-[260px]"
            >
              {staffList.length === 0 && <option value="">Chưa có nhân viên nào</option>}
              {staffList.map((nv) => (
                <option key={nv.maTaiKhoan} value={nv.maTaiKhoan}>
                  {nv.hoTen} ({nv.email})
                </option>
              ))}
            </select>
            {staffDetail && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  staffDetail.coPhanQuyenRieng
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {staffDetail.coPhanQuyenRieng ? "Đang áp dụng quyền riêng" : "Đang kế thừa theo vai trò Nhân viên"}
              </span>
            )}
          </div>
          {staffDetail?.coPhanQuyenRieng && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleResetStaffOverride()}
              className="btn btn-secondary btn-sm"
            >
              Đưa về theo vai trò
            </button>
          )}
        </div>
      )}

      {mode === "role" && selectedRole === "KhachHang" ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950">
          Vai trò <strong>Khách hàng</strong> không nhận quyền quản trị nội bộ; phần đặt thuê của khách dùng chính sách riêng.
        </div>
      ) : loadingPerms ? (
        <div className="text-sm text-gray-500 py-6">Đang tải danh sách quyền...</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(265px, 1fr))" }}>
          {visibleCatalog.map((group) => {
            const codes = group.quyen.map((q) => q.ma);
            const allChecked = codes.length > 0 && codes.every((c) => selectedPerms.has(c));
            return (
              <div key={group.nhom} className="rounded-xl border border-[var(--color-bone)] bg-white p-4">
                <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[var(--color-bone)]">
                  <h3 className="font-bold text-sm text-[var(--color-bark)]">{group.nhom}</h3>
                  {!isRoleReadonly && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(codes)}
                      className="text-[0.7rem] font-semibold text-[var(--color-forest)] hover:underline cursor-pointer"
                    >
                      {allChecked ? "Bỏ nhóm" : "Chọn cả nhóm"}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {group.quyen.map((q) => (
                    <label key={q.ma} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPerms.has(q.ma)}
                        onChange={() => toggle(q.ma)}
                        disabled={isRoleReadonly}
                      />
                      <span className="text-[var(--color-bark)]">{q.tenHienThi}</span>
                      <span className="ml-auto text-[0.68rem] text-gray-400 font-mono">{q.ma}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "role" && selectedRole === "QuanTriVien" && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-950">
          <strong>Quản trị viên</strong> luôn có toàn bộ quyền hệ thống (bao gồm quản lý phân quyền).
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || isRoleReadonly || (mode === "staff" && selectedStaffId == null)}
          className="btn btn-primary btn-md"
        >
          {saving ? "Đang lưu…" : mode === "role" ? "Lưu phân quyền vai trò" : "Lưu quyền riêng nhân viên"}
        </button>
        {msg && (
          <span
            role="status"
            className={`text-sm font-medium ${msg.type === "err" ? "text-rose-700" : "text-emerald-700"}`}
          >
            {msg.text}
          </span>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmMissingPerms)}
        onClose={() => setConfirmMissingPerms(null)}
        onConfirm={() => {
          setConfirmMissingPerms(null);
          void commitSave();
        }}
        title="Xác nhận gỡ quyền tối thiểu"
        message={
          confirmMissingPerms
            ? `Vai trò Nhân viên bắt buộc giữ quyền tối thiểu: ${confirmMissingPerms.join(", ")}. Backend sẽ từ chối nếu thiếu quyền này.`
            : ""
        }
        confirmText="Thử lưu"
        isDanger
        isLoading={saving}
      />
    </div>
  );
}
