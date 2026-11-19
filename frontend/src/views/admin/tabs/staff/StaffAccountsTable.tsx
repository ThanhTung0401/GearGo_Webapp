import type { StaffAccount } from "../../../../store";
import Icon from "../../../../components/Icon";
import { Can } from "../../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../../constants/permissions";

interface StaffAccountsTableProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: "all" | "active" | "locked";
  onStatusFilterChange: (value: "all" | "active" | "locked") => void;
  staffList: StaffAccount[];
  onEdit: (staff: StaffAccount) => void;
  onOpenPermissions: (staff: StaffAccount) => void;
  onLockClick: (staff: StaffAccount) => void;
  onUnlockClick: (staff: StaffAccount) => void;
  onResignClick: (staff: StaffAccount) => void;
}

/**
 * Thanh tìm kiếm/lọc (UC1.9) và bảng danh sách tài khoản nhân viên kèm các nút thao tác.
 */
export function StaffAccountsTable({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  staffList,
  onEdit,
  onOpenPermissions,
  onLockClick,
  onUnlockClick,
  onResignClick,
}: StaffAccountsTableProps) {
  return (
    <>
      {/* Bộ lọc & Tìm kiếm (UC1.9) */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="adm-input-icon-wrap adm-input-icon-wrap--fixed">
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, username..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="adm-input-with-icon"
          />
          <div className="adm-input-icon"><Icon name="search" size={16} /></div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="adm-select"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Nhân viên kho">Nhân viên kho</option>
          <option value="Nhân viên chăm sóc KH">Nhân viên chăm sóc KH</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "all" | "active" | "locked")}
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
              {staffList.map((s) => (
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
                        onClick={() => onEdit(s)}
                        className="adm-btn-outline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => onOpenPermissions(s)}
                        className="adm-btn-parchment adm-btn-xs"
                      >
                        Phân quyền
                      </button>
                      {/* Chặn khóa / nghỉ việc trên tài khoản Quản trị viên */}
                      {/* v2 §P3 — nút Khoá/Mở/Nghỉ việc bọc theo NhanVien_Quan */}
                      {s.role !== "Quản trị viên" && (
                        <Can perm={Permissions.NhanVien_Quan}>
                          <button
                            onClick={() => {
                              if (s.status === "active") {
                                onLockClick(s);
                              } else {
                                onUnlockClick(s);
                              }
                            }}
                            className={s.status === "active" ? "adm-btn-danger-outline" : "adm-btn-forest-solid"}
                          >
                            {s.status === "active" ? "Khóa" : "Mở"}
                          </button>
                          {s.status === "active" && (
                            <button
                              onClick={() => onResignClick(s)}
                              className="adm-btn-danger-soft"
                            >
                              Nghỉ việc
                            </button>
                          )}
                        </Can>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
