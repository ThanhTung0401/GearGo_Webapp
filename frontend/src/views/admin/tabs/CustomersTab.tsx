import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";

import { fmt, statusColors, type CustomerAccount } from "../../../store";
import Icon from "../../../components/Icon";
export function CustomersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [lockModalCustomer, setLockModalCustomer] = useState<CustomerAccount | null>(null);
  const [lockReason, setLockReason] = useState("");

  // State kết nối API thật /api/v1/admin/tai-khoan?vaiTro=KhachHang (UC13 / UC1.13, UC11)
  const realApi = app.realApi || isRealApiEnabled();
  const [apiCustomers, setApiCustomers] = useState<CustomerAccount[]>([]);
  const [customerIdToTaiKhoanId, setCustomerIdToTaiKhoanId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lockError, setLockError] = useState("");

  const loadCustomerList = async () => {
    if (!realApi) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await staffApi.timTaiKhoan({
        vaiTro: "KhachHang",
        tuKhoa: searchQuery.trim() || undefined,
        trangThai: statusFilter === "all" ? undefined : statusFilter === "active" ? "HoatDong" : "BiKhoa",
        soMoiTrang: 50,
      });

      const idMap: Record<string, number> = {};
      const mapped: CustomerAccount[] = res.items.map((tk) => {
        const rawCustomerId = String(tk.maKhachHang ?? tk.maTaiKhoan);
        const custId = `KH${rawCustomerId.padStart(3, "0")}`;
        idMap[custId] = tk.maTaiKhoan;

        // Tính lịch sử đơn thuê và tiền cọc từ đơn hàng đã đồng bộ của hệ thống
        const matchingOrders = app.orders.filter(
          (o) =>
            o.customerId === custId ||
            o.customerId === rawCustomerId ||
            (tk.soDienThoai && o.customerPhone === tk.soDienThoai)
        );
        const totalOrders = matchingOrders.length;
        const totalSpent = matchingOrders.reduce((sum, o) => sum + (o.rental - o.discount), 0);
        const currentDeposit = matchingOrders
          .filter((o) => !["Hoàn tất", "Đã hủy", "Hết hạn"].includes(o.status))
          .reduce((sum, o) => sum + o.depositTotal, 0);

        return {
          id: custId,
          name: tk.hoTen || (tk.email ? tk.email.split("@")[0] : "Khách hàng"),
          phone: tk.soDienThoai || "Chưa cập nhật",
          email: tk.email || "",
          address: "Khách hàng GearGo",
          status: tk.trangThai === "HoatDong" ? "active" : "locked",
          lockedReason: tk.lyDoKhoa || undefined,
          createdAt: tk.ngayTao ? new Date(tk.ngayTao).toLocaleDateString("vi-VN") : "01/01/2026",
          totalOrders,
          totalSpent,
          currentDeposit,
        };
      });

      setCustomerIdToTaiKhoanId(idMap);
      setApiCustomers(mapped);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Không thể tải danh sách tài khoản khách hàng từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomerList();
  }, [realApi, searchQuery, statusFilter]);

  const filtered = realApi
    ? apiCustomers
    : app.customers.filter((c) => {
        const matchQuery =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || c.status === statusFilter;
        return matchQuery && matchStatus;
      });

  const handleConfirmLock = async () => {
    if (!lockModalCustomer) return;
    if (realApi) {
      const maTaiKhoan = customerIdToTaiKhoanId[lockModalCustomer.id] || parseInt(lockModalCustomer.id.replace(/\D/g, ""), 10);
      if (!Number.isFinite(maTaiKhoan) || maTaiKhoan <= 0) {
        setLockError("Không xác định được mã tài khoản để khóa.");
        return;
      }
      setActionLoading(true);
      setLockError("");
      try {
        await staffApi.khoaTaiKhoan(maTaiKhoan, lockReason.trim() || "Khóa tài khoản khách hàng vi phạm quy chế");
        await loadCustomerList();
        setLockModalCustomer(null);
        setLockReason("");
      } catch (err) {
        setLockError(err instanceof Error ? err.message : "Không thể khóa tài khoản khách hàng.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    app.toggleCustomerLock(lockModalCustomer.id, lockReason);
    setLockModalCustomer(null);
    setLockReason("");
  };

  const handleUnlockCustomer = async (cust: CustomerAccount) => {
    if (realApi) {
      const maTaiKhoan = customerIdToTaiKhoanId[cust.id] || parseInt(cust.id.replace(/\D/g, ""), 10);
      if (!Number.isFinite(maTaiKhoan) || maTaiKhoan <= 0) {
        setApiError("Không xác định được mã tài khoản để mở khóa.");
        return;
      }
      setActionLoading(true);
      setApiError("");
      try {
        await staffApi.moKhoaTaiKhoan(maTaiKhoan, "Mở khóa tài khoản khách hàng");
        await loadCustomerList();
      } catch (err) {
        setApiError(err instanceof Error ? err.message : "Không thể mở khóa tài khoản khách hàng.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    app.toggleCustomerLock(cust.id);
  };

  const customerOrders = selectedCustomer
    ? app.orders.filter((o) => o.customerId === selectedCustomer.id || o.customerPhone === selectedCustomer.phone)
    : [];

  return (
    <div>
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
            Tổng {realApi ? apiCustomers.length : app.customers.length} khách hàng
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
          onChange={(e) => setStatusFilter(e.target.value as any)}
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
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-cell-code text-[0.82rem]">
                      {c.id}
                    </td>
                    <td>
                      <div className="adm-cell-title text-[0.88rem]">{c.name}</div>
                      <div className="adm-cell-sub">Tham gia: {c.createdAt}</div>
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
                          onClick={() => setSelectedCustomer(c)}
                          className="adm-btn-parchment adm-btn-xs"
                        >
                          Đơn thuê
                        </button>
                        <button
                          onClick={() => {
                            if (c.status === "active") {
                              setLockModalCustomer(c);
                              setLockReason("");
                            } else {
                              handleUnlockCustomer(c);
                            }
                          }}
                          className={c.status === "active" ? "adm-btn-danger-outline" : "adm-btn-forest-solid"}
                        >
                          {c.status === "active" ? "Khóa" : "Mở"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lịch sử Đơn thuê của khách */}
      {selectedCustomer && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-700">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Lịch sử thuê đồ: {selectedCustomer.name}</h3>
                <p className="text-xs text-gray-500 mt-1">SĐT: {selectedCustomer.phone} · Email: {selectedCustomer.email}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {customerOrders.length === 0 ? (
                <div className="adm-table-empty">Khách hàng chưa có đơn thuê nào trên hệ thống.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {customerOrders.map((o) => {
                    const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <div key={o.id} className="adm-card--cream">
                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                          <div>
                            <strong className="adm-cell-code text-[0.9rem]">{o.id}</strong>
                            <span className="adm-hint-text ml-2">Tạo lúc: {o.createdAt}</span>
                          </div>
                          {/* Huy hiệu trạng thái đơn trong modal lịch sử lấy màu động theo statusColors */}
                          <span className="adm-pill" style={{ background: sc.bg, color: sc.text }}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-[0.8rem] text-[#4B5563] mb-1.5">
                          {o.items.map((it) => `${it.productName} (SL: ${it.qty})`).join(", ")}
                        </div>
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-bone flex-wrap gap-2">
                          <span>Tiền thuê: <strong>{fmt(o.rental - o.discount)}</strong></span>
                          <span>Tiền cọc: <strong className="text-[#B45309]">{fmt(o.depositTotal)}</strong></span>
                          <span>Thời gian: {o.pickupTime} → {o.returnTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Khóa Tài Khoản Khách */}
      {lockModalCustomer && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container is-sm">
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalCustomer.name}</h3>
              <button onClick={() => setLockModalCustomer(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {lockError && (
                <div role="alert" className="adm-alert adm-alert--compact is-error">
                  <Icon name="alert-circle" size={15} />
                  <span>{lockError}</span>
                </div>
              )}
              <p className="text-[0.85rem] text-[#4B5563] mb-3">
                Khi bị khóa, khách hàng sẽ không thể đặt thuê thiết bị mới. Vui lòng nhập lý do khóa tài khoản:
              </p>
              <textarea
                rows={3}
                placeholder="VD: Không hoàn trả đồ đúng hạn, chưa thanh toán phụ phí bồi thường..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="adm-field adm-field--compact mb-3.5"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setLockModalCustomer(null);
                    setLockError("");
                  }}
                  className="btn btn-secondary btn-md adm-btn-flex"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleConfirmLock()}
                  className="btn btn-md adm-btn-flex adm-btn-danger-solid"
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận khóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Kiểm Duyệt Đánh Giá (UC9.2) ──────────────────────────────────────────
