import Icon from "../../../components/Icon";
import { fmt, formatDateVi, type CustomerAccount } from "../../../store";
import { Can } from "../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../constants/permissions";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface CustomersTableProps {
  totalCount: number;
  apiError: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: "all" | "active" | "locked";
  setStatusFilter: (v: "all" | "active" | "locked") => void;
  loading: boolean;
  filtered: CustomerAccount[];
  onViewOrders: (c: CustomerAccount) => void;
  onRequestLock: (c: CustomerAccount) => void;
  onUnlock: (c: CustomerAccount) => void;
}

/**
 * Tiêu đề, bộ lọc tìm kiếm và bảng quản lý tài khoản khách hàng (UC1.13).
 */
export function CustomersTable({
  totalCount,
  apiError,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  loading,
  filtered,
  onViewOrders,
  onRequestLock,
  onUnlock,
}: CustomersTableProps) {
  const paging = usePagination(filtered, 8);
  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title">
            Quản lý tài khoản khách hàng (UC1.13)
          </h2>
          <p className="adm-page-subtitle">
            Tra cứu lịch sử đơn thuê, theo dõi tiền cọc đang giữ và quản lý trạng thái tài khoản khách.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success text-[0.8rem] px-3 py-1.5">
            Tổng {totalCount} khách hàng
          </span>
        </div>
      </div>

      {apiError && (
        <div role="alert" className="adm-alert is-error">
          <Icon name="alert-circle" size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="adm-input-icon-wrap adm-input-icon-wrap--fixed">
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="adm-input-with-icon"
          />
          <div className="adm-input-icon"><Icon name="search" size={16} /></div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "locked")}
          className="adm-select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đang bị khóa</option>
        </select>
      </div>

      {/* Bảng danh sách */}
      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Mã KH", "Họ và tên", "Liên hệ", "Địa chỉ", "Số đơn", "Tổng chi tiêu", "Cọc đang giữ", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="adm-table-empty">
                    Đang tải danh sách tài khoản khách hàng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="adm-table-empty text-[#9CA3AF]">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paging.pagedItems.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-cell-code text-[0.82rem]">
                      {c.id}
                    </td>
                    <td>
                      <div className="adm-cell-title text-[0.88rem]">{c.name}</div>
                      <div className="adm-cell-sub">Tham gia: {formatDateVi(c.createdAt)}</div>
                    </td>
                    <td className="text-[0.82rem]">
                      <div><strong>{c.phone}</strong></div>
                      <div className="adm-hint-text text-[0.75rem]">{c.email}</div>
                    </td>
                    <td className="adm-cell-truncate text-[0.8rem] text-[#4B5563]" title={c.address}>
                      {c.address}
                    </td>
                    <td className="adm-cell-center text-[0.85rem] font-semibold">
                      {c.totalOrders}
                    </td>
                    <td className="adm-cell-mono text-[0.85rem] font-bold text-[var(--color-forest)]">
                      {fmt(c.totalSpent)}
                    </td>
                    <td className={`adm-cell-mono text-[0.85rem] font-bold ${c.currentDeposit > 0 ? "text-[#B45309]" : "text-[#6B7280]"}`}>
                      {fmt(c.currentDeposit)}
                    </td>
                    <td>
                      <span className={`adm-pill ${c.status === "active" ? "is-success" : "is-danger"}`}>
                        {c.status === "active" ? "Hoạt động" : "Đã khóa"}
                      </span>
                      {c.lockedReason && (
                        <div className="text-[0.68rem] text-[#B91C1C] mt-0.5">{c.lockedReason}</div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onViewOrders(c)}
                          className="adm-btn-parchment adm-btn-xs"
                        >
                          Đơn thuê
                        </button>
                        <Can perm={Permissions.TaiKhoan_Quan}>
                          <button
                            onClick={() => {
                              if (c.status === "active") {
                                onRequestLock(c);
                              } else {
                                onUnlock(c);
                              }
                            }}
                            className={c.status === "active" ? "adm-btn-danger-outline" : "adm-btn-forest-solid"}
                          >
                            {c.status === "active" ? "Khóa" : "Mở"}
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="khách hàng"
      />
    </>
  );
}
