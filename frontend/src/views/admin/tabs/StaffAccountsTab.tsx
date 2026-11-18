import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";

import { type StaffAccount } from "../../../store";
import Icon from "../../../components/Icon";
import { permissionApi, type QuyenCatalogResponse } from "../../../features/permissions";

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
          <h2 className="adm-page-title">
            Quản lý tài khoản & Phân quyền nhân viên (UC1.7, UC1.8, UC1.9, UC1.10, UC1.11)
          </h2>
          <p className="adm-page-subtitle">
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
        <div role="alert" className="adm-alert is-error-solid adm-alert--block">
          {apiError}
        </div>
      )}
      {isLoading && (
        <div className="adm-loading-text">Đang tải danh sách nhân viên...</div>
      )}

      {/* Bộ lọc & Tìm kiếm (UC1.9) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="adm-input-icon-wrap adm-input-icon-wrap--fixed">
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adm-input-with-icon"
          />
          <div className="adm-input-icon"><Icon name="search" size={16} /></div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="adm-select"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên kho">Nhân viên kho</option>
          <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="adm-select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đang bị khóa</option>
        </select>
      </div>

      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Mã NV", "Họ và tên", "Tên đăng nhập", "Vai trò & Nhóm quyền", "Số điện thoại", "Email", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="adm-cell-code">
                    {s.id}
                  </td>
                  <td>
                    <div className="font-bold text-[0.88rem]">{s.name}</div>
                    <div className="adm-cell-sub">Tạo ngày: {s.createdAt}</div>
                  </td>
                  <td className="adm-cell-mono text-[0.82rem]">
                    @{s.username}
                  </td>
                  <td>
                    <span className={`adm-pill ${s.role === "Quản trị viên" ? "is-warning" : "is-purple"}`}>
                      {s.role}
                    </span>
                    {s.permissions && s.permissions.length > 0 && (
                      <div className="text-[0.68rem] text-[#6B7280] mt-0.5">
                        {s.permissions.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="text-[0.82rem] text-[#4B5563]">{s.phone}</td>
                  <td className="text-[0.82rem] text-[#4B5563]">{s.email}</td>
                  <td>
                    <div>
                      <span className={`adm-pill ${s.status === "active" ? "is-success" : "is-danger"}`}>
                        {s.status === "active" ? "Hoạt động" : "Đã khóa"}
                      </span>
                      {s.lockedReason && (
                        <div className="text-[0.68rem] text-[#B91C1C] mt-0.5">{s.lockedReason}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => { setModalError(""); setOriginalEditRole(s.role); setEditingStaff({ ...s }); setIsNew(false); }}
                        className="adm-btn-outline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => openPermissionsModal(s)}
                        className="adm-btn-parchment adm-btn-xs"
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
                            className={s.status === "active" ? "adm-btn-danger-outline" : "adm-btn-forest-solid"}
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
                              className="adm-btn-danger-soft"
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
      </div>

      {/* Modal Thêm / Sửa nhân viên (UC1.7, UC1.8) */}
      {editingStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-520">
            <div className="modal-header">
              <h3 className="modal-title">{isNew ? "Thêm tài khoản nhân viên mới (UC1.7)" : `Cập nhật thông tin ${editingStaff.name} (UC1.8)`}</h3>
              <button onClick={() => setEditingStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={handleSaveStaff} className="modal-body flex flex-col gap-3.5">
              <div className="adm-grid-2">
                <div>
                  <label className="adm-label--block">Mã nhân viên</label>
                  <input
                    disabled={!isNew}
                    value={editingStaff.id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, id: e.target.value })}
                    className={`adm-field adm-field--compact ${isNew ? "" : "adm-field--readonly-muted"}`}
                  />
                </div>
                <div>
                  <label className="adm-label--block">Tên đăng nhập</label>
                  <input
                    required
                    value={editingStaff.username}
                    onChange={(e) => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    className="adm-field adm-field--compact"
                  />
                </div>
              </div>

              <div>
                <label className="adm-label--block">Họ và tên</label>
                <input
                  required
                  placeholder="VD: Trần Văn Bình"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="adm-field adm-field--compact"
                />
              </div>

              <div className="adm-grid-2">
                <div>
                  <label className="adm-label--block">Số điện thoại</label>
                  <input
                    required
                    type="tel"
                    placeholder="0909..."
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="adm-field adm-field--compact"
                  />
                </div>
                <div>
                  <label className="adm-label--block">Email</label>
                  <input
                    required
                    type="email"
                    placeholder="binh.tv@geargo.vn"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="adm-field adm-field--compact"
                  />
                </div>
              </div>

              <div>
                <label className="adm-label--block">Vai trò</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                  className="adm-field adm-field--compact"
                >
                  <option value="Nhân viên kho">Nhân viên kho</option>
                  <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </select>
              </div>

              {/* Mật khẩu khởi tạo ban đầu (UC1.7) */}
              {isNew && (
                <div>
                  <label className="adm-label--block">Mật khẩu khởi tạo *</label>
                  <input
                    required
                    value={editingStaff.password || "GearGo@2026"}
                    onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                    className="adm-field adm-field--compact adm-field--mono"
                  />
                  <span className="adm-hint-text">Mật khẩu tạm thời cấp cho nhân viên đăng nhập lần đầu.</span>
                </div>
              )}

              {/* Gán quyền nghiệp vụ ban đầu (UC1.7.1) */}
              {isNew && (
                <div className="adm-card--soft">
                  <label className="adm-label--block mb-1.5">
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
                        <label key={pKey} className="adm-checkbox-row">
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

              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-0">{modalError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" disabled={submitting} onClick={() => setEditingStaff(null)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button type="submit" disabled={submitting} className="btn btn-primary btn-md adm-btn-flex">{submitting ? "Đang lưu..." : "Lưu nhân viên"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân quyền chi tiết (UC1.10) */}
      {permStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-560">
            <div className="modal-header">
              <h3 className="modal-title">Cấu hình phân quyền: {permStaff.name} (UC1.10)</h3>
              <button onClick={() => setPermStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p className="adm-page-subtitle--compact text-[#6B7280] mb-3">
                Chọn vai trò và các quyền nghiệp vụ cho tài khoản <strong>@{permStaff.username}</strong>:
              </p>
              {(app.realApi || isRealApiEnabled()) && (
                <div className="mb-3">
                  <label className="adm-label--sub">Vai trò tài khoản</label>
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
                    className="adm-field"
                  >
                    <option value="NhanVien">Nhân viên vận hành (NhanVien)</option>
                    <option value="QuanTriVien">Quản trị viên (QuanTriVien)</option>
                  </select>
                </div>
              )}
              {permLoading ? (
                <div className="adm-loading-text py-3">Đang tải danh sách quyền từ máy chủ...</div>
              ) : (app.realApi || isRealApiEnabled()) && permRoleName === "QuanTriVien" ? (
                <div className="adm-alert is-info adm-alert--block mb-3.5">
                  <strong>Quản trị viên (QuanTriVien)</strong> mặc định có toàn bộ quyền hạn trong hệ thống.
                </div>
              ) : (app.realApi || isRealApiEnabled()) && permCatalog.length > 0 ? (
                <div className="flex flex-col gap-3 mb-5">
                  {permCatalog.map((group) => (
                    <div key={group.nhom} className="adm-card--soft p-2.5">
                      <div className="adm-label--sub mb-1.5">{group.nhom}</div>
                      <div className="flex flex-col gap-1.5">
                        {group.quyen.map((q) => {
                          const currentPerms = permStaff.permissions || [];
                          const isChecked = currentPerms.includes(q.ma);
                          return (
                            <label key={q.ma} className="adm-checkbox-row">
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
                              <span className="ml-auto text-[0.7rem] text-[#9CA3AF] adm-cell-mono">{q.ma}</span>
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
                      /* Đánh dấu nổi bật thẻ quyền hạn khi đang được chọn */
                      <label key={p.key} className={`adm-checkbox-card ${isChecked ? "is-checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...currentPerms, p.key]
                              : currentPerms.filter((k) => k !== p.key);
                            setPermStaff({ ...permStaff, permissions: next });
                          }}
                        />
                        <div>
                          <strong className="adm-cell-title">{p.key}</strong>
                          <div className="adm-hint-text">{p.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-3">{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setPermStaff(null)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button disabled={submitting || permLoading} onClick={() => handleSavePermissions(permStaff.permissions || [])} className="btn btn-primary btn-md adm-btn-flex">{submitting ? "Đang lưu..." : "Lưu quyền hạn"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa Nhân viên (UC1.11) */}
      {lockModalStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-xs">
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalStaff.name} (UC1.11)</h3>
              <button onClick={() => setLockModalStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p className="text-[0.85rem] text-[#4B5563] mb-3">
                Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống vận hành. Nhập lý do khóa:
              </p>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="adm-field adm-field--compact mb-3.5"
              />
              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-3">{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setLockModalStaff(null)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button disabled={submitting} onClick={handleConfirmLock} className="btn btn-md adm-btn-flex adm-btn-danger-solid">{submitting ? "Đang khóa..." : "Xác nhận khóa"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận nghỉ việc (UC1.8) */}
      {resigningStaff && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Ghi nhận nghỉ việc: {resigningStaff.name}</h3>
              <button onClick={() => setResigningStaff(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <label className="adm-label">
                Ngày nghỉ việc
                <input type="date" value={resignDate} onChange={(e) => setResignDate(e.target.value)} className="adm-field" />
              </label>
              <label className="adm-label">
                Lý do nghỉ việc (Bắt buộc)
                <textarea rows={3} value={resignReason} onChange={(e) => setResignReason(e.target.value)} className="adm-field" />
              </label>
              {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-0">{modalError}</div>}
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => setResigningStaff(null)} className="btn btn-secondary btn-md adm-btn-flex">Hủy</button>
                <button disabled={submitting} onClick={handleConfirmResign} className="btn btn-md adm-btn-flex adm-btn-crimson-solid">{submitting ? "Đang xử lý..." : "Xác nhận nghỉ việc"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports (UC25, UC10.1 - UC10.3 Chuẩn Nghiệp Vụ) ──────────────────────────
