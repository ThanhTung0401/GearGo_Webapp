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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Quản lý tài khoản khách hàng (UC1.13)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Tra cứu lịch sử đơn thuê, theo dõi tiền cọc đang giữ và quản lý trạng thái tài khoản khách.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
            Tổng {realApi ? apiCustomers.length : app.customers.length} khách hàng
          </span>
        </div>
      </div>

      {apiError && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert-circle" size={16} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>
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

      {/* Bảng danh sách */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã KH", "Họ và tên", "Liên hệ", "Địa chỉ", "Số đơn", "Tổng chi tiêu", "Cọc đang giữ", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                  Đang tải danh sách tài khoản khách hàng...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: "0.85rem" }}>
                  Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-forest)" }}>
                    {c.id}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)" }}>{c.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Tham gia: {c.createdAt}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.82rem" }}>
                    <div><strong>{c.phone}</strong></div>
                    <div style={{ color: "#6B7280", fontSize: "0.75rem" }}>{c.email}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#4B5563", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.address}>
                    {c.address}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.85rem", fontWeight: 600, textAlign: "center" }}>
                    {c.totalOrders}
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-forest)" }}>
                    {fmt(c.totalSpent)}
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: c.currentDeposit > 0 ? "#B45309" : "#6B7280" }}>
                    {fmt(c.currentDeposit)}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      background: c.status === "active" ? "#DCFCE7" : "#FEE2E2",
                      color: c.status === "active" ? "#15803D" : "#DC2626",
                      padding: "3px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                    }}>
                      {c.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                    {c.lockedReason && (
                      <div style={{ fontSize: "0.68rem", color: "#B91C1C", marginTop: 2 }}>{c.lockedReason}</div>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
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
                        style={{
                          background: c.status === "active" ? "white" : "var(--color-forest)",
                          color: c.status === "active" ? "#DC2626" : "white",
                          border: `1px solid ${c.status === "active" ? "#FECACA" : "var(--color-forest)"}`,
                          borderRadius: 6, padding: "4px 8px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600
                        }}
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

      {/* Modal Lịch sử Đơn thuê của khách */}
      {selectedCustomer && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Lịch sử thuê đồ: {selectedCustomer.name}</h3>
                <p className="text-xs text-gray-500 mt-1">SĐT: {selectedCustomer.phone} · Email: {selectedCustomer.email}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {customerOrders.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>Khách hàng chưa có đơn thuê nào trên hệ thống.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {customerOrders.map((o) => {
                    const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <div key={o.id} style={{ border: "1px solid var(--color-bone)", borderRadius: 10, padding: 12, background: "var(--color-cream)" }}>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.9rem" }}>{o.id}</strong>
                            <span style={{ fontSize: "0.75rem", color: "#6B7280", marginLeft: 8 }}>Tạo lúc: {o.createdAt}</span>
                          </div>
                          <span style={{ background: sc.bg, color: sc.text, padding: "3px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                            {o.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#4B5563", marginBottom: 6 }}>
                          {o.items.map((it) => `${it.productName} (SL: ${it.qty})`).join(", ")}
                        </div>
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-bone">
                          <span>Tiền thuê: <strong>{fmt(o.rental - o.discount)}</strong></span>
                          <span>Tiền cọc: <strong style={{ color: "#B45309" }}>{fmt(o.depositTotal)}</strong></span>
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
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Khóa tài khoản {lockModalCustomer.name}</h3>
              <button onClick={() => setLockModalCustomer(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {lockError && (
                <div
                  role="alert"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    color: "#B91C1C",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: "0.78rem",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="alert-circle" size={15} />
                  <span>{lockError}</span>
                </div>
              )}
              <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: 12 }}>
                Khi bị khóa, khách hàng sẽ không thể đặt thuê thiết bị mới. Vui lòng nhập lý do khóa tài khoản:
              </p>
              <textarea
                rows={3}
                placeholder="VD: Không hoàn trả đồ đúng hạn, chưa thanh toán phụ phí bồi thường..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 14 }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setLockModalCustomer(null);
                    setLockError("");
                  }}
                  className="btn btn-secondary btn-md"
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleConfirmLock()}
                  className="btn btn-md"
                  style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}
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
