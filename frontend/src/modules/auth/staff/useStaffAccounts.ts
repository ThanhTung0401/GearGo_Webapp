import { useState, useEffect } from "react";
import type { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import type { StaffAccount } from "../../../store";
import { permissionApi, type QuyenCatalogResponse } from "../../../features/permissions";
import { mapBackendStaffItems, filterMockStaffAccounts } from "./staffAccountsUtils";

/**
 * Hook quản lý danh sách nhân viên, tìm kiếm/lọc và các thao tác
 * thêm/sửa/phân quyền/khóa/mở khóa/nghỉ việc (UC1.7 - UC1.11).
 */
export function useStaffAccounts(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");

  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [originalEditRole, setOriginalEditRole] = useState<StaffAccount["role"]>("Nhân viên");

  const [permStaff, setPermStaff] = useState<StaffAccount | null>(null);
  const [permCatalog, setPermCatalog] = useState<QuyenCatalogResponse[]>([]);
  const [permRoleName, setPermRoleName] = useState<"NhanVien" | "QuanTriVien">("NhanVien");
  const [permOriginalRole, setPermOriginalRole] = useState<"NhanVien" | "QuanTriVien">("NhanVien");
  const [permHasOverride, setPermHasOverride] = useState(false);
  const [permLoading, setPermLoading] = useState(false);

  const [lockModalStaff, setLockModalStaff] = useState<StaffAccount | null>(null);
  const [lockReason, setLockReason] = useState("Nghỉ việc từ " + new Date().toLocaleDateString("vi-VN"));
  const [resigningStaff, setResigningStaff] = useState<StaffAccount | null>(null);
  const [resignDate, setResignDate] = useState(new Date().toISOString().slice(0, 10));
  const [resignReason, setResignReason] = useState("Nghỉ việc theo quyết định nhân sự");

  // State kết nối API thật /api/nhan-vien (UC07 - UC11)
  const [apiStaff, setApiStaff] = useState<StaffAccount[]>([]);
  const [staffAccountToTaiKhoanId, setStaffAccountToTaiKhoanId] = useState<Record<string, number>>({});
  const [staffAccountToNhanVienId, setStaffAccountToNhanVienId] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadStaffList = async () => {
    if (!isRealApi) return;
    setIsLoading(true);
    setApiError("");
    try {
      const res = await staffApi.timNhanVien({
        tuKhoa: search.trim() || undefined,
        vaiTro: roleFilter === "all" ? undefined : roleFilter === "Quản trị viên" ? "QuanTriVien" : "NhanVien",
        trangThaiTaiKhoan: statusFilter === "all" ? undefined : statusFilter === "active" ? "HoatDong" : "BiKhoa",
        soMoiTrang: 200,
      });
      const { mapped, tkMap, nvMap } = mapBackendStaffItems(res.items);
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
    const timer = window.setTimeout(() => {
      void loadStaffList();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  const filtered = isRealApi
    ? apiStaff
    : filterMockStaffAccounts(app.staffAccounts, search, roleFilter, statusFilter);

  const resolveNvId = (staffId: string) =>
    staffAccountToNhanVienId[staffId] || parseInt(staffId.replace(/\D/g, ""), 10);
  const resolveTkId = (staffId: string) =>
    staffAccountToTaiKhoanId[staffId] || parseInt(staffId.replace(/\D/g, ""), 10);

  // Thực thi thao tác modal trên API thật kèm xử lý lỗi và tải lại danh sách
  const runModalMutation = async (task: () => Promise<void>, fallbackErr: string, onSuccess: () => void) => {
    setSubmitting(true);
    try {
      await task();
      await loadStaffList();
      onSuccess();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : fallbackErr);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAdd = () => {
    setModalError("");
    const nextNum = (isRealApiEnabled() ? apiStaff.length : app.staffAccounts.length) + 1;
    setEditingStaff({
      id: `NV-00${nextNum}`,
      username: `nv_${nextNum}`,
      name: "",
      password: "GearGo@2026",
      role: "Nhân viên",
      phone: "",
      email: "",
      status: "active",
      permissions: ["Quản lý kho thiết bị", "Bàn giao & Nhận trả"],
      createdAt: new Date().toLocaleDateString("vi-VN"),
    });
    setIsNew(true);
  };

  const handleOpenEdit = (s: StaffAccount) => {
    setModalError("");
    setOriginalEditRole(s.role);
    setEditingStaff({ ...s });
    setIsNew(false);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setModalError("");

    if (isRealApi) {
      await runModalMutation(
        async () => {
          if (isNew) {
            await staffApi.taoNhanVien({
              hoTen: editingStaff.name.trim(),
              email: editingStaff.email.trim(),
              soDienThoai: editingStaff.phone.trim(),
              vaiTro: editingStaff.role === "Quản trị viên" ? "QuanTriVien" : "NhanVien",
              matKhauKhoiTao: editingStaff.password || "GearGo@2026",
              diaChi: "Văn phòng GearGo",
            });
          } else {
            const nvId = resolveNvId(editingStaff.id);
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
        },
        "Thao tác cập nhật nhân viên thất bại.",
        () => setEditingStaff(null)
      );
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
    setPermHasOverride(false);
    setPermStaff({ ...s });
    if (isRealApi) {
      setPermLoading(true);
      try {
        const tkId = resolveTkId(s.id);
        const [catalog, staffPerms] = await Promise.all([
          permissionApi.catalog(),
          permissionApi.getStaffPermissions(tkId),
        ]);
        setPermCatalog(catalog);
        setPermHasOverride(staffPerms.coPhanQuyenRieng);
        setPermStaff((prev) => (prev ? { ...prev, permissions: staffPerms.quyenCoDuoc } : prev));
      } catch (error) {
        setModalError(error instanceof Error ? error.message : "Không thể tải danh sách quyền hạn từ máy chủ.");
      } finally {
        setPermLoading(false);
      }
    }
  };

  const handleSwitchPermRole = async (nextRole: "NhanVien" | "QuanTriVien") => {
    setPermRoleName(nextRole);
    try {
      const rolePerms = await permissionApi.getRolePermissions(nextRole);
      setPermStaff((prev) => (prev ? { ...prev, permissions: rolePerms.quyenCoDuoc } : prev));
    } catch {
      // Bỏ qua lỗi tải khi đổi nhanh vai trò
    }
  };

  const handleSavePermissions = async (perms: string[]) => {
    if (!permStaff) return;
    setModalError("");
    if (isRealApi) {
      await runModalMutation(
        async () => {
          const nvId = resolveNvId(permStaff.id);
          const tkId = resolveTkId(permStaff.id);
          if (permRoleName !== permOriginalRole) {
            await staffApi.doiVaiTro(nvId, {
              vaiTroMoi: permRoleName,
              lyDo: "Điều chỉnh vai trò & phân quyền nhân viên",
            });
          }
          if (permRoleName !== "QuanTriVien") {
            // Lưu phân quyền riêng cho đúng tài khoản nhân viên này (không ghi đè cả role)
            await permissionApi.setStaffPermissions(tkId, perms);
            window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
          }
        },
        "Không thể cập nhật phân quyền.",
        () => setPermStaff(null)
      );
      return;
    }
    app.saveStaffAccount({ ...permStaff, permissions: perms });
    setPermStaff(null);
  };

  const handleResetStaffPermissions = async () => {
    if (!permStaff || !isRealApi) return;
    setModalError("");
    setSubmitting(true);
    try {
      const tkId = resolveTkId(permStaff.id);
      const res = await permissionApi.resetStaffPermissions(tkId);
      setPermHasOverride(false);
      setPermStaff((prev) => (prev ? { ...prev, permissions: res.quyenCoDuoc } : prev));
      window.dispatchEvent(new CustomEvent("geargo-permissions-changed"));
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Không thể khôi phục quyền theo vai trò.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!lockModalStaff) return;
    setModalError("");
    if (isRealApi) {
      await runModalMutation(
        () => staffApi.khoaTaiKhoan(resolveTkId(lockModalStaff.id), lockReason || "Khóa tài khoản theo yêu cầu quản trị viên").then(() => undefined),
        "Không thể khóa tài khoản.",
        () => setLockModalStaff(null)
      );
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
    if (isRealApi) {
      await runModalMutation(
        async () => {
          const res = await staffApi.ghiNhanNghiViec(resolveNvId(resigningStaff.id), {
            ngayNghiViec: new Date(`${resignDate}T00:00:00Z`).toISOString(),
            lyDo: resignReason.trim(),
          });
          if (res.congViecCanBanGiao && res.congViecCanBanGiao.length > 0) {
            setApiError(
              `Đã ghi nhận nghỉ việc cho ${resigningStaff.name}. Lưu ý: còn ${res.congViecCanBanGiao.length} phiếu bảo trì cần bàn giao.`
            );
          }
        },
        "Không thể ghi nhận nghỉ việc.",
        () => setResigningStaff(null)
      );
      return;
    }
    app.toggleStaffLock(resigningStaff.id, `Nghỉ việc từ ${resignDate}: ${resignReason.trim()}`);
    setResigningStaff(null);
  };

  const handleUnlockStaff = async (staff: StaffAccount) => {
    setApiError("");
    if (isRealApi) {
      try {
        await staffApi.moKhoaTaiKhoan(resolveTkId(staff.id), "Mở khóa tài khoản nhân viên");
        await loadStaffList();
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Không thể mở khóa tài khoản.");
      }
      return;
    }
    app.toggleStaffLock(staff.id);
  };

  return {
    isRealApi, search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter,
    filtered, isLoading, apiError, modalError, setModalError, submitting,
    editingStaff, setEditingStaff, isNew, handleOpenAdd, handleOpenEdit, handleSaveStaff,
    permStaff, setPermStaff, permCatalog, permRoleName, permHasOverride, permLoading,
    openPermissionsModal, handleSwitchPermRole, handleSavePermissions, handleResetStaffPermissions,
    lockModalStaff, setLockModalStaff, lockReason, setLockReason, handleConfirmLock,
    resigningStaff, setResigningStaff, resignDate, setResignDate, resignReason, setResignReason,
    handleConfirmResign, handleUnlockStaff,
  };
}
