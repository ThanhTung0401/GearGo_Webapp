import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";

import { type StaffAccount } from "../../../store";
import Icon from "../../../components/Icon";
import { permissionApi, type QuyenCatalogResponse } from "../../../features/permissions";
import { fieldStyle, labelStyle } from "../forms/FormModal";

export function StaffAccountsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [permStaff, setPermStaff] = useState<StaffAccount | null>(null);
  const [lockModalStaff, setLockModalStaff] = useState<StaffAccount | null>(null);
  const [lockReason, setLockReason] = useState("Nghỉ việc từ " + new Date().toLocaleDateString("vi-VN"));
  const [resigningStaff, setResigningStaff] = useState<StaffAccount | null>(null);
  const [resignDate, setResignDate] = useState(new Date().toISOString().slice(0, 10));
  const [resignReason, setResignReason] = useState("Nghỉ việc theo quyết định nhân sự");
  const [originalEditRole, setOriginalEditRole] = useState<StaffAccount["role"]>("Nhân viên kho");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");

  // State kết nối API thật /api/v1/admin/nhan-vien (UC07 - UC11)
  const [apiStaff, setApiStaff] = useState<StaffAccount[]>([]);
  const [staffAccountToTaiKhoanId, setStaffAccountToTaiKhoanId] = useState<Record<string, number>>({});
  const [staffAccountToNhanVienId, setStaffAccountToNhanVienId] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [permCatalog, setPermCatalog] = useState<QuyenCatalogResponse[]>([]);
  const [permRoleName, setPermRoleName] = useState<"NhanVien" | "QuanTriVien">("NhanVien");
  const [permOriginalRole, setPermOriginalRole] = useState<"NhanVien" | "QuanTriVien">("NhanVien");
  const [permLoading, setPermLoading] = useState(false);

  const loadStaffList = async () => {
    if (!(app.realApi || isRealApiEnabled())) return;
    setIsLoading(true);
    setApiError("");
    try {
      const res = await staffApi.timNhanVien({
        tuKhoa: search.trim() || undefined,
        vaiTro: roleFilter === "all" ? undefined : roleFilter === "Quản trị viên" ? "QuanTriVien" : "NhanVien",
        trangThaiLamViec: statusFilter === "all" ? undefined : statusFilter === "active" ? "DangLamViec" : "DaNghiViec",
      });

      const tkMap: Record<string, number> = {};
      const nvMap: Record<string, number> = {};
      const mapped: StaffAccount[] = res.items.map((nv) => {
        const staffId = `NV-${String(nv.maNhanVien).padStart(3, "0")}`;
        tkMap[staffId] = nv.maTaiKhoan;
        nvMap[staffId] = nv.maNhanVien;

        const isLocked = nv.trangThaiTaiKhoan === "BiKhoa" || nv.trangThaiLamViec === "DaNghiViec";
        return {
          id: staffId,
          username: nv.email ? nv.email.split("@")[0] : `nv_${nv.maNhanVien}`,
          name: nv.hoTen || "Nhân viên",
          role: nv.vaiTro === "QuanTriVien" ? "Quản trị viên" : "Nhân viên kho",
          phone: nv.soDienThoai || "",
          email: nv.email || "",
          status: isLocked ? "locked" : "active",
          lockedReason: nv.trangThaiLamViec === "DaNghiViec"
            ? `Nghỉ việc từ ${nv.ngayNghiViec || "đã nghỉ"}`
            : nv.trangThaiTaiKhoan === "BiKhoa"
            ? "Tài khoản bị khóa"
            : undefined,
          permissions: nv.vaiTro === "QuanTriVien"
            ? ["Quản lý kho thiết bị", "Bàn giao & Nhận trả", "Lập phụ phí & Đối soát", "Xem báo cáo doanh thu", "Quản lý khuyến mãi"]
            : ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
          createdAt: nv.ngayVaoLam || "01/01/2026",
        };
      });

      setStaffAccountToTaiKhoanId(tkMap);
      setStaffAccountToNhanVienId(nvMap);
      setApiStaff(mapped);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Không thể tải danh sách nhân viên từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, [search, roleFilter, statusFilter]);

  const filtered = isRealApiEnabled()
    ? apiStaff
    : app.staffAccounts.filter((s) => {
        const matchSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.username.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search) ||
          s.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === "all" || s.role === roleFilter;
        const matchStatus = statusFilter === "all" || s.status === statusFilter;
        return matchSearch && matchRole && matchStatus;
      });

  const handleOpenAdd = () => {
    const nextNum = (isRealApiEnabled() ? apiStaff.length : app.staffAccounts.length) + 1;
    const newId = `NV-00${nextNum}`;
    setEditingStaff({
      id: newId,
      username: `nv_${nextNum}`,
      name: "",
      password: "GearGo@2026",
      role: "Nhân viên kho",
      phone: "",
      email: "",
      status: "active",
      permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
      createdAt: new Date().toLocaleDateString("vi-VN"),
    });
    setIsNew(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setModalError("");

    if (app.realApi || isRealApiEnabled()) {
      setSubmitting(true);
      try {
        if (isNew) {
          const vaiTroBackend = editingStaff.role === "Quản trị viên" ? "QuanTriVien" : "NhanVien";
          await staffApi.taoNhanVien({
            hoTen: editingStaff.name.trim(),
            email: editingStaff.email.trim(),
            soDienThoai: editingStaff.phone.trim(),
            vaiTro: vaiTroBackend,
            matKhauKhoiTao: editingStaff.password || "GearGo@2026",
            diaChi: "Văn phòng GearGo",
          });
        } else {
          const nvId = staffAccountToNhanVienId[editingStaff.id] || parseInt(editingStaff.id.replace(/\D/g, ""), 10);
          await staffApi.capNhatNhanVien(nvId, {
            hoTen: editingStaff.name.trim(),
            email: editingStaff.email.trim(),
            soDienThoai: editingStaff.phone.trim(),
            diaChi: "Văn phòng GearGo",
          });

          const prevIsAdmin = originalEditRole === "Quản trị viên";
          const nextIsAdmin = editingStaff.role === "Quản trị viên";
          if (prevIsAdmin !== nextIsAdmin) {
            await staffApi.doiVaiTro(nvId, {
              vaiTroMoi: nextIsAdmin ? "QuanTriVien" : "NhanVien",
              lyDo: "Cập nhật vai trò từ trang quản trị nhân viên",
            });
          }
        }
        await loadStaffList();
        setEditingStaff(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Thao tác cập nhật nhân viên thất bại.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    app.saveStaffAccount(editingStaff);
    setEditingStaff(null);
  };

  const openPermissionsModal = async (s: StaffAccount) => {
    setModalError("");
    const role: "NhanVien" | "QuanTriVien" = s.role === "Quản trị viên" ? "QuanTriVien" : "NhanVien";
    setPermRoleName(role);
    setPermOriginalRole(role);
    setPermStaff({ ...s });
    if (app.realApi || isRealApiEnabled()) {
      setPermLoading(true);
      try {
        const [catalog, rolePerms] = await Promise.all([
          permissionApi.catalog(),
          permissionApi.getRolePermissions(role),
        ]);
        setPermCatalog(catalog);
        setPermStaff((prev) => (prev ? { ...prev, permissions: rolePerms.quyenCoDuoc } : prev));
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Không thể tải danh sách quyền hạn từ máy chủ.");
      } finally {
        setPermLoading(false);
      }
    }
  };

  const handleSavePermissions = async (perms: string[]) => {
    if (!permStaff) return;
    setModalError("");
    if (app.realApi || isRealApiEnabled()) {
      setSubmitting(true);
      try {
        const nvId = staffAccountToNhanVienId[permStaff.id] || parseInt(permStaff.id.replace(/\D/g, ""), 10);
        if (permRoleName !== permOriginalRole) {
          await staffApi.doiVaiTro(nvId, {
            vaiTroMoi: permRoleName,
            lyDo: "Điều chỉnh vai trò & phân quyền nhân viên",
          });
        }
        if (permRoleName !== "QuanTriVien") {
          await permissionApi.setRolePermissions(permRoleName, perms);
          window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
        }
        await loadStaffList();
        setPermStaff(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Không thể cập nhật phân quyền.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    app.saveStaffAccount({ ...permStaff, permissions: perms });
    setPermStaff(null);
  };

  const handleConfirmLock = async () => {
    if (!lockModalStaff) return;
    setModalError("");
    if (app.realApi || isRealApiEnabled()) {
      setSubmitting(true);
      try {
        const tkId = staffAccountToTaiKhoanId[lockModalStaff.id] || parseInt(lockModalStaff.id.replace(/\D/g, ""), 10);
        await staffApi.khoaTaiKhoan(tkId, lockReason || "Khóa tài khoản theo yêu cầu quản trị viên");
        await loadStaffList();
        setLockModalStaff(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Không thể khóa tài khoản.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    app.toggleStaffLock(lockModalStaff.id, lockReason);
    setLockModalStaff(null);
  };

  const handleConfirmResign = async () => {
    if (!resigningStaff) return;
    setModalError("");
    if (!resignReason.trim()) {
      return setModalError("Vui lòng nhập lý do ghi nhận nghỉ việc.");
    }
    if (app.realApi || isRealApiEnabled()) {
      setSubmitting(true);
      try {
        const nvId = staffAccountToNhanVienId[resigningStaff.id] || parseInt(resigningStaff.id.replace(/\D/g, ""), 10);
        const res = await staffApi.ghiNhanNghiViec(nvId, {
          ngayNghiViec: new Date(`${resignDate}T00:00:00Z`).toISOString(),
          lyDo: resignReason.trim(),
        });
        await loadStaffList();
        if (res.congViecCanBanGiao && res.congViecCanBanGiao.length > 0) {
          setApiError(`Đã ghi nhận nghỉ việc cho ${resigningStaff.name}. Lưu ý: còn ${res.congViecCanBanGiao.length} phiếu bảo trì cần bàn giao.`);
        }
        setResigningStaff(null);
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Không thể ghi nhận nghỉ việc.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    app.toggleStaffLock(resigningStaff.id, `Nghỉ việc từ ${resignDate}: ${resignReason.trim()}`);
    setResigningStaff(null);
  };

  const handleUnlockStaff = async (staff: StaffAccount) => {
    setApiError("");
    if (app.realApi || isRealApiEnabled()) {
      try {
        const tkId = staffAccountToTaiKhoanId[staff.id] || parseInt(staff.id.replace(/\D/g, ""), 10);
        await staffApi.moKhoaTaiKhoan(tkId, "Mở khóa tài khoản nhân viên");
        await loadStaffList();
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Không thể mở khóa tài khoản.");
      }
      return;
    }
    app.toggleStaffLock(staff.id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Quản lý tài khoản & Phân quyền nhân viên (UC1.7, UC1.8, UC1.9, UC1.10, UC1.11)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Tạo tài khoản, cập nhật thông tin liên hệ, phân quyền theo nhóm nghiệp vụ và khóa tài khoản khi nghỉ việc.
          </p>
        </div>
        <button
          onClick={() => { setModalError(""); handleOpenAdd(); }}
          className="btn btn-primary btn-md"
        >
          + Thêm nhân viên mới
        </button>
      </div>
      {apiError && (
        <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: "0.82rem" }}>
          {apiError}
        </div>
      )}
      {isLoading && (
        <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 10 }}>Đang tải danh sách nhân viên...</div>
      )}

      {/* Bộ lọc & Tìm kiếm (UC1.9) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên kho">Nhân viên kho</option>
          <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đang bị khóa</option>
        </select>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã NV", "Họ và tên", "Tên đăng nhập", "Vai trò & Nhóm quyền", "Số điện thoại", "Email", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>
                  {s.id}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{s.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tạo ngày: {s.createdAt}</div>
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                  @{s.username}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ background: s.role === "Quản trị viên" ? "#FEF3C7" : "#E0E7FF", color: s.role === "Quản trị viên" ? "#B45309" : "#3730A3", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                    {s.role}
                  </span>
                  {s.permissions && s.permissions.length > 0 && (
                    <div style={{ fontSize: "0.68rem", color: "#6B7280", marginTop: 3 }}>
                      {s.permissions.join(", ")}
                    </div>
                  )}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#4B5563" }}>{s.phone}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#4B5563" }}>{s.email}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div>
                    <span style={{
                      background: s.status === "active" ? "#DCFCE7" : "#FEE2E2",
                      color: s.status === "active" ? "#15803D" : "#DC2626",
                      padding: "3px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                    }}>
                      {s.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                    {s.lockedReason && (
                      <div style={{ fontSize: "0.68rem", color: "#B91C1C", marginTop: 2 }}>{s.lockedReason}</div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setModalError(""); setOriginalEditRole(s.role); setEditingStaff({ ...s }); setIsNew(false); }}
                      style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => openPermissionsModal(s)}
                      style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Phân quyền
                    </button>
                    {s.role !== "Quản trị viên" && (
                      <>
                        <button
                          onClick={() => {
                            setModalError("");
                            if (s.status === "active") {
                              setLockModalStaff(s);
                            } else {
                              handleUnlockStaff(s);
                            }
                          }}
                          style={{
                            background: s.status === "active" ? "white" : "var(--color-forest)",
                            color: s.status === "active" ? "#DC2626" : "white",
                            border: `1px solid ${s.status === "active" ? "#FECACA" : "var(--color-forest)"}`,
                            borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600
                          }}
                        >
                          {s.status === "active" ? "Khóa" : "Mở"}
                        </button>
                        {s.status === "active" && (
                          <button
                            onClick={() => {
                              setModalError("");
                              setResignReason("Nghỉ việc theo quyết định nhân sự");
                              setResigningStaff(s);
                            }}
                            style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                          >
                            Nghỉ việc
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa nhân viên (UC1.7, UC1.8) */}
      {editingStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{isNew ? "Thêm tài khoản nhân viên mới (UC1.7)" : `Cập nhật thông tin ${editingStaff.name} (UC1.8)`}</h3>
              <button onClick={() => setEditingStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={handleSaveStaff} className="modal-body flex flex-col gap-3.5">
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mã nhân viên</label>
                  <input
                    disabled={!isNew}
                    value={editingStaff.id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, id: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", background: isNew ? "white" : "#F3F4F6" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Tên đăng nhập</label>
                  <input
                    required
                    value={editingStaff.username}
                    onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Họ và tên</label>
                <input
                  required
                  placeholder="VD: Trần Văn Bình"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                />
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Số điện thoại</label>
                  <input
                    required
                    type="tel"
                    placeholder="0909..."
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Email</label>
                  <input
                    required
                    type="email"
                    placeholder="binh.tv@geargo.vn"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Vai trò</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", background: "white" }}
                >
                  <option value="Nhân viên kho">Nhân viên kho</option>
                  <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </select>
              </div>

              {/* Mật khẩu khởi tạo ban đầu (UC1.7) */}
              {isNew && (
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu khởi tạo *</label>
                  <input
                    required
                    value={editingStaff.password || "GearGo@2026"}
                    onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Mật khẩu tạm thời cấp cho nhân viên đăng nhập lần đầu.</span>
                </div>
              )}

              {/* Gán quyền nghiệp vụ ban đầu (UC1.7.1) */}
              {isNew && (
                <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>
                    Gán quyền nghiệp vụ ban đầu (UC1.7.1):
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      "Quản lý kho thiết bị",
                      "Bàn giao & Nhận trả",
                      "Lập phụ phí & Đối soát",
                      "Xem báo cáo doanh thu",
                      "Quản lý khuyến mãi"
                    ].map((pKey) => {
                      const isChecked = (editingStaff.permissions || []).includes(pKey);
                      return (
                        <label key={pKey} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = editingStaff.permissions || [];
                              const next = e.target.checked ? [...cur, pKey] : cur.filter((x) => x !== pKey);
                              setEditingStaff({ ...editingStaff, permissions: next });
                            }}
                          />
                          <span>{pKey}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {modalError && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 8, fontSize: "0.82rem" }}>{modalError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" disabled={submitting} onClick={() => setEditingStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-md" style={{ flex: 1 }}>{submitting ? "Đang lưu..." : "Lưu nhân viên"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân quyền chi tiết (UC1.10) */}
      {permStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3 className="modal-title">Cấu hình phân quyền: {permStaff.name} (UC1.10)</h3>
              <button onClick={() => setPermStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 12 }}>
                Chọn vai trò và các quyền nghiệp vụ cho tài khoản <strong>@{permStaff.username}</strong>:
              </p>
              {(app.realApi || isRealApiEnabled()) && (
                <div className="mb-3">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Vai trò tài khoản</label>
                  <select
                    value={permRoleName}
                    onChange={async (e) => {
                      const nextRole = e.target.value as "NhanVien" | "QuanTriVien";
                      setPermRoleName(nextRole);
                      try {
                        const rolePerms = await permissionApi.getRolePermissions(nextRole);
                        setPermStaff((prev) => (prev ? { ...prev, permissions: rolePerms.quyenCoDuoc } : prev));
                      } catch {
                        // Ignore load error on role switch
                      }
                    }}
                    style={fieldStyle}
                  >
                    <option value="NhanVien">Nhân viên vận hành (NhanVien)</option>
                    <option value="QuanTriVien">Quản trị viên (QuanTriVien)</option>
                  </select>
                </div>
              )}
              {permLoading ? (
                <div style={{ fontSize: "0.82rem", color: "#6B7280", padding: "12px 0" }}>Đang tải danh sách quyền từ máy chủ...</div>
              ) : (app.realApi || isRealApiEnabled()) && permRoleName === "QuanTriVien" ? (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, fontSize: "0.8rem", color: "#1E40AF", marginBottom: 14 }}>
                  <strong>Quản trị viên (QuanTriVien)</strong> mặc định có toàn bộ quyền hạn trong hệ thống.
                </div>
              ) : (app.realApi || isRealApiEnabled()) && permCatalog.length > 0 ? (
                <div className="flex flex-col gap-3 mb-5">
                  {permCatalog.map((group) => (
                    <div key={group.nhom} style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, background: "#F9FAFB" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>{group.nhom}</div>
                      <div className="flex flex-col gap-1.5">
                        {group.quyen.map((q) => {
                          const currentPerms = permStaff.permissions || [];
                          const isChecked = currentPerms.includes(q.ma);
                          return (
                            <label key={q.ma} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...currentPerms, q.ma]
                                    : currentPerms.filter((k) => k !== q.ma);
                                  setPermStaff({ ...permStaff, permissions: next });
                                }}
                              />
                              <span>{q.tenHienThi}</span>
                              <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{q.ma}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 mb-5">
                  {[
                    { key: "Quản lý kho thiết bị", desc: "Xem danh sách thiết bị, quét barcode, kiểm kê và lập phiếu bảo trì" },
                    { key: "Bàn giao & Nhận trả", desc: "Thực hiện biên bản BBBG, checklist phụ kiện và nghiệm thu trả đồ" },
                    { key: "Lập phụ phí & Đối soát", desc: "Đề xuất phụ phí bồi thường và lập phiếu thu/chi hoàn cọc" },
                    { key: "Xem báo cáo doanh thu", desc: "Xem 4 trụ cột báo cáo tài chính và xuất dữ liệu thống kê" },
                    { key: "Quản lý khuyến mãi", desc: "Tạo và tạm dừng các mã voucher giảm giá" },
                  ].map((p) => {
                    const currentPerms = permStaff.permissions || [];
                    const isChecked = currentPerms.includes(p.key);
                    return (
                      <label key={p.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: isChecked ? "#EFF6FF" : "#F9FAFB", border: `1px solid ${isChecked ? "#BFDBFE" : "#E5E7EB"}`, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...currentPerms, p.key]
                              : currentPerms.filter((k) => k !== p.key);
                            setPermStaff({ ...permStaff, permissions: next });
                          }}
                          style={{ marginTop: 3 }}
                        />
                        <div>
                          <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>{p.key}</strong>
                          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {modalError && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 12 }}>{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setPermStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button disabled={submitting || permLoading} onClick={() => handleSavePermissions(permStaff.permissions || [])} className="btn btn-primary btn-md" style={{ flex: 1 }}>{submitting ? "Đang lưu..." : "Lưu quyền hạn"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa Nhân viên (UC1.11) */}
      {lockModalStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalStaff.name} (UC1.11)</h3>
              <button onClick={() => setLockModalStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: 12 }}>
                Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống vận hành. Nhập lý do khóa:
              </p>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 14 }}
              />
              {modalError && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 8, fontSize: "0.82rem", marginBottom: 12 }}>{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setLockModalStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button disabled={submitting} onClick={handleConfirmLock} className="btn btn-md" style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}>{submitting ? "Đang khóa..." : "Xác nhận khóa"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận nghỉ việc (UC1.8) */}
      {resigningStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Ghi nhận nghỉ việc: {resigningStaff.name}</h3>
              <button onClick={() => setResigningStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <label style={labelStyle}>
                Ngày nghỉ việc
                <input type="date" value={resignDate} onChange={(e) => setResignDate(e.target.value)} style={fieldStyle} />
              </label>
              <label style={labelStyle}>
                Lý do nghỉ việc (Bắt buộc)
                <textarea rows={3} value={resignReason} onChange={(e) => setResignReason(e.target.value)} style={fieldStyle} />
              </label>
              {modalError && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 8, fontSize: "0.82rem" }}>{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setResigningStaff(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button disabled={submitting} onClick={handleConfirmResign} className="btn btn-md" style={{ flex: 1, background: "#B91C1C", color: "white", border: 0 }}>{submitting ? "Đang xử lý..." : "Xác nhận nghỉ việc"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports (UC25, UC10.1 - UC10.3 Chuẩn Nghiệp Vụ) ──────────────────────────
