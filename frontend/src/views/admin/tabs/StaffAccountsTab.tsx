import type { useApp } from "../../../context/AppContext";
import { useStaffAccounts } from "./staff/useStaffAccounts";
import { StaffAccountsTable } from "./staff/StaffAccountsTable";
import { StaffAccountModal } from "./staff/StaffAccountModal";
import { StaffPermissionsModal } from "./staff/StaffPermissionsModal";
import { StaffStatusModals } from "./staff/StaffStatusModals";
import { Can } from "../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../constants/permissions";

/**
 * Tab Quản lý tài khoản & Phân quyền nhân viên (UC1.7 - UC1.11).
 */
export function StaffAccountsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const staff = useStaffAccounts(app);

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
        {/* v2 §P3 — nút tạo nhân viên bọc theo NhanVien_Quan (demo pattern <Can>) */}
        <Can perm={Permissions.NhanVien_Quan}>
          <button onClick={staff.handleOpenAdd} className="btn btn-primary btn-md">
            + Thêm nhân viên mới
          </button>
        </Can>
      </div>

      {staff.apiError && (
        <div role="alert" className="adm-alert is-error-solid adm-alert--block">
          {staff.apiError}
        </div>
      )}
      {staff.isLoading && (
        <div className="adm-loading-text">Đang tải danh sách nhân viên...</div>
      )}

      <StaffAccountsTable
        search={staff.search}
        onSearchChange={staff.setSearch}
        roleFilter={staff.roleFilter}
        onRoleFilterChange={staff.setRoleFilter}
        statusFilter={staff.statusFilter}
        onStatusFilterChange={staff.setStatusFilter}
        staffList={staff.filtered}
        onEdit={staff.handleOpenEdit}
        onOpenPermissions={staff.openPermissionsModal}
        onLockClick={(s) => {
          staff.setModalError("");
          staff.setLockModalStaff(s);
        }}
        onUnlockClick={staff.handleUnlockStaff}
        onResignClick={(s) => {
          staff.setModalError("");
          staff.setResignReason("Nghỉ việc theo quyết định nhân sự");
          staff.setResigningStaff(s);
        }}
      />

      {staff.editingStaff && (
        <StaffAccountModal
          editingStaff={staff.editingStaff}
          isNew={staff.isNew}
          submitting={staff.submitting}
          modalError={staff.modalError}
          onChange={staff.setEditingStaff}
          onSubmit={staff.handleSaveStaff}
          onClose={() => staff.setEditingStaff(null)}
        />
      )}

      {staff.permStaff && (
        <StaffPermissionsModal
          isRealApi={staff.isRealApi}
          permStaff={staff.permStaff}
          permRoleName={staff.permRoleName}
          permCatalog={staff.permCatalog}
          permLoading={staff.permLoading}
          submitting={staff.submitting}
          modalError={staff.modalError}
          onSwitchRole={staff.handleSwitchPermRole}
          onChangeStaff={staff.setPermStaff}
          onSave={staff.handleSavePermissions}
          onClose={() => staff.setPermStaff(null)}
        />
      )}

      <StaffStatusModals
        lockModalStaff={staff.lockModalStaff}
        lockReason={staff.lockReason}
        onLockReasonChange={staff.setLockReason}
        onConfirmLock={staff.handleConfirmLock}
        onCloseLock={() => staff.setLockModalStaff(null)}
        resigningStaff={staff.resigningStaff}
        resignDate={staff.resignDate}
        onResignDateChange={staff.setResignDate}
        resignReason={staff.resignReason}
        onResignReasonChange={staff.setResignReason}
        onConfirmResign={staff.handleConfirmResign}
        onCloseResign={() => staff.setResigningStaff(null)}
        submitting={staff.submitting}
        modalError={staff.modalError}
      />
    </div>
  );
}
