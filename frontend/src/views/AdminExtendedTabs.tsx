import { useState } from "react";
import { useApp } from "../App";
import { fmt, statusColors, type CustomerAccount, type Review, type RentalPolicyConfig, type FinancialAdjustment, type AuditLogEntry, type AppNotification } from "../store";
import Icon, { type IconName } from "../components/Icon";

// ─── 1. Quản lý Khách Hàng (UC1.13) ──────────────────────────────────────────
export function CustomersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [lockModalCustomer, setLockModalCustomer] = useState<CustomerAccount | null>(null);
  const [lockReason, setLockReason] = useState("");

  const filtered = app.customers.filter((c) => {
    const matchQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const handleConfirmLock = () => {
    if (!lockModalCustomer) return;
    app.toggleCustomerLock(lockModalCustomer.id, lockReason);
    setLockModalCustomer(null);
    setLockReason("");
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
            Tổng {app.customers.length} khách hàng
          </span>
        </div>
      </div>

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
            {filtered.length === 0 ? (
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
                            app.toggleCustomerLock(c.id);
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
                <button onClick={() => setLockModalCustomer(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button onClick={handleConfirmLock} className="btn btn-md" style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}>Xác nhận khóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Kiểm Duyệt Đánh Giá (UC9.2) ──────────────────────────────────────────
export function ReviewsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [hideModalReview, setHideModalReview] = useState<Review | null>(null);
  const [hideReason, setHideReason] = useState("Vi phạm ngôn từ / Spammer");

  const filtered = app.reviews.filter((r) => {
    const matchRating = ratingFilter === 0 || r.rating === ratingFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch =
      (r.productName || "").toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());
    return matchRating && matchStatus && matchSearch;
  });

  const handleConfirmHide = () => {
    if (!hideModalReview) return;
    app.hideReview(hideModalReview.id, hideReason);
    setHideModalReview(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Kiểm duyệt đánh giá sản phẩm (UC9.2)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Kiểm tra và ẩn các đánh giá có nội dung thô tục, sai sự thật hoặc quảng cáo không hợp lệ.
          </p>
        </div>
        <span className="badge badge-success" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
          Tổng cộng {app.reviews.length} đánh giá
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, khách hàng, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(Number(e.target.value))}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value={0}>Tất cả số sao</option>
          <option value={5}>5 sao ★★★★★</option>
          <option value={4}>4 sao ★★★★</option>
          <option value={3}>3 sao ★★★</option>
          <option value={2}>2 sao ★★</option>
          <option value={1}>1 sao ★</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", background: "white" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hiển thị công khai</option>
          <option value="hidden">Đã ẩn vi phạm</option>
        </select>
      </div>

      {/* Reviews list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 30, textAlign: "center", color: "#6B7280" }}>
            Không tìm thấy đánh giá nào phù hợp.
          </div>
        ) : (
          filtered.map((rev) => (
            <div
              key={rev.id}
              style={{
                background: "white",
                borderRadius: 12,
                border: "1px solid var(--color-bone)",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>{rev.productName || rev.productId}</strong>
                  <span style={{ color: "#E07A43", fontWeight: 700, fontSize: "0.85rem" }}>{"★".repeat(rev.rating)}</span>
                  <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Mã đơn: {rev.orderId}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: rev.status === "active" ? "#DCFCE7" : "#FEE2E2",
                    color: rev.status === "active" ? "#15803D" : "#DC2626"
                  }}>
                    {rev.status === "active" ? "✓ Đang hiển thị" : "✕ Đã ẩn vi phạm"}
                  </span>
                </div>
                <div style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>
                  "{rev.comment}"
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  Người gửi: <strong>{rev.customerName}</strong> ({rev.customerId}) · Ngày gửi: {rev.createdAt}
                  {rev.hiddenReason && (
                    <span style={{ color: "#B91C1C", marginLeft: 8 }}>
                      · Lý do ẩn: <strong>{rev.hiddenReason}</strong> ({rev.hiddenBy || "Admin"})
                    </span>
                  )}
                </div>
              </div>

              <div>
                {rev.status === "active" ? (
                  <button
                    onClick={() => {
                      setHideModalReview(rev);
                      setHideReason("Vi phạm ngôn từ / Spammer");
                    }}
                    style={{
                      background: "white",
                      border: "1px solid #FECACA",
                      color: "#DC2626",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Ẩn vi phạm
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      app.reviews = app.reviews.map((r) => r.id === rev.id ? { ...r, status: "active", hiddenReason: undefined } : r);
                      app.addAuditLog({ actor: "Admin", role: "Quản trị viên", action: "Bỏ ẩn đánh giá", targetEntity: "Review", targetId: rev.id, detail: "Mở hiển thị lại đánh giá đã kiểm duyệt" });
                    }}
                    style={{
                      background: "var(--color-parchment)",
                      border: "1px solid var(--color-bone)",
                      color: "var(--color-forest)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Bỏ ẩn
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Ẩn đánh giá */}
      {hideModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Ẩn đánh giá vi phạm</h3>
              <button onClick={() => setHideModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.85rem", color: "#4B5563", marginBottom: 10 }}>
                Đánh giá này sẽ bị ẩn khỏi giao diện xem sản phẩm của khách hàng. Chọn hoặc nhập lý do:
              </p>
              <select
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 12, background: "white" }}
              >
                <option value="Vi phạm ngôn từ / Spammer">Vi phạm ngôn từ / Thô tục</option>
                <option value="Thông tin sai sự thật về thiết bị">Thông tin sai sự thật về thiết bị</option>
                <option value="Chứa liên kết quảng cáo spam">Chứa liên kết quảng cáo spam</option>
                <option value="Tranh chấp đơn hàng đang giải quyết">Tranh chấp đơn hàng đang giải quyết</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setHideModalReview(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button onClick={handleConfirmHide} className="btn btn-md" style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}>Xác nhận ẩn</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Cấu hình Chính Sách Thuê & Hủy (UC8.1) ────────────────────────────────
export function PoliciesTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [form, setForm] = useState<RentalPolicyConfig>({ ...app.policies });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    app.updatePolicy(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: 840 }}>
      <div className="mb-5">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
          Cấu hình chính sách thuê & hủy (UC8.1)
        </h2>
        <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
          Thiết lập các mốc thời gian giữ chỗ tự động, biểu phí bồi thường và công thức phạt hủy đơn toàn hệ thống.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 24 }}>
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
              Thời gian giữ chỗ đơn (phút)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={form.holdMinutes}
              onChange={(e) => setForm({ ...form, holdMinutes: Number(e.target.value) })}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Đơn Chờ thanh toán sẽ tự động hủy khi hết hạn thời gian này.</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
              Hệ số phạt trễ hạn (%/ngày)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="3.0"
              value={form.overdueMultiplier}
              onChange={(e) => setForm({ ...form, overdueMultiplier: Number(e.target.value) })}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Hệ số 1.5 tương ứng 150% đơn giá ngày cho mỗi ngày trễ hạn.</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
              Tỷ lệ phạt hủy đơn trước 24-48 giờ (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.cancellationTier1FeePercent}
              onChange={(e) => setForm({ ...form, cancellationTier1FeePercent: Number(e.target.value) })}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách hủy trong mốc 24h-48h trước giờ nhận sẽ chịu mức phí này.</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
              Tỷ lệ phạt hủy đơn dưới 24 giờ (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.cancellationTier2FeePercent}
              onChange={(e) => setForm({ ...form, cancellationTier2FeePercent: Number(e.target.value) })}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách hủy sát giờ (&lt;24h) không được hoàn tiền thuê theo quy định.</span>
          </div>
        </div>

        <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginTop: 20, fontSize: "0.8rem", color: "#4B5563" }}>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="shield" size={16} />
            <strong>Phiên bản chính sách hiện thời:</strong>
          </div>
          <div>Cập nhật lần cuối: <strong>{app.policies.updatedAt}</strong> bởi <strong>{app.policies.updatedBy}</strong></div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button type="submit" className="btn btn-primary btn-md">
            Lưu và Áp dụng chính sách
          </button>
          {savedSuccess && (
            <span className="badge badge-success">✓ Cập nhật chính sách thành công!</span>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── 4. Soạn & Gửi Thông Báo Hệ Thống (UC9.4) ─────────────────────────────────
export function NotificationsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<AppNotification["targetRole"]>("all");
  const [type, setType] = useState<AppNotification["type"]>("info");
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    app.sendNotification({ title, message, targetRole, type });
    setTitle("");
    setMessage("");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
      {/* Form soạn tin */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 22 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginBottom: 4 }}>
          Soạn thông báo hệ thống (UC9.4)
        </h2>
        <p style={{ color: "#6B7280", fontSize: "0.82rem", marginBottom: 16 }}>
          Phát thông báo đẩy đến danh sách khách hàng hoặc nhân viên trực ban.
        </p>

        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Tiêu đề thông báo</label>
            <input
              required
              placeholder="VD: Cập nhật quy định trả lều trong mùa mưa bão"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}
            />
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Nhóm nhận tin</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
              >
                <option value="all">Toàn bộ người dùng</option>
                <option value="customer">Khách hàng</option>
                <option value="staff">Nhân viên kho & vận hành</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Mức độ ưu tiên</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
              >
                <option value="info">Thông tin chung (Xanh dương)</option>
                <option value="success">Thành công (Xanh lá)</option>
                <option value="warning">Cảnh báo (Vàng)</option>
                <option value="alert">Khẩn cấp (Đỏ)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Nội dung chi tiết</label>
            <textarea
              required
              rows={4}
              placeholder="Nhập nội dung thông báo gửi đến người dùng..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary btn-md">
              Gửi thông báo ngay
            </button>
            {sentSuccess && (
              <span className="badge badge-success">✓ Đã phát thông báo thành công!</span>
            )}
          </div>
        </form>
      </div>

      {/* Danh sách đã phát */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 22, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)", marginBottom: 14 }}>
          Thông báo gần đây ({app.notifications.length})
        </h3>
        <div style={{ overflowY: "auto", maxHeight: 420, display: "flex", flexDirection: "column", gap: 10 }}>
          {app.notifications.map((n) => (
            <div key={n.id} style={{ border: "1px solid var(--color-bone)", borderRadius: 10, padding: 12, background: "var(--color-cream)" }}>
              <div className="flex justify-between items-start mb-1">
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>{n.title}</strong>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: n.type === "alert" ? "#FEE2E2" : n.type === "warning" ? "#FEF3C7" : "#DBEAFE", color: n.type === "alert" ? "#DC2626" : n.type === "warning" ? "#B45309" : "#1D4ED8" }}>
                  {n.targetRole.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#4B5563", lineHeight: 1.4, margin: "4px 0" }}>{n.message}</p>
              <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{n.createdAt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 5. Điều Chỉnh Tài Chính & Sai Lệch Phiếu Nhập (UC5.7, UC7.10) ─────────────
export function AdjustmentsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<FinancialAdjustment["type"]>("Sai lệch kiểm kê");
  const [amount, setAmount] = useState<number>(100000);
  const [orderId, setOrderId] = useState("");
  const [importReceiptId, setImportReceiptId] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    app.saveFinancialAdjustment({
      type,
      amount,
      orderId: orderId || undefined,
      importReceiptId: importReceiptId || undefined,
      reason,
      status: "Đã duyệt",
      createdBy: "Quản trị viên",
      approvedBy: "Quản trị viên",
    });
    setShowModal(false);
    setReason("");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Lập chứng từ bù trừ số liệu tài chính sau khi đã đối soát đơn hoặc xử lý sai lệch số lượng/giá phiếu nhập kho.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md"
        >
          + Lập chứng từ điều chỉnh
        </button>
      </div>

      {/* Bảng chứng từ */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Số chứng từ", "Loại điều chỉnh", "Chứng từ liên quan", "Số tiền (đ)", "Lý do bù trừ", "Người lập / Duyệt", "Thời gian", "Trạng thái"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {app.financialAdjustments.map((a, i) => (
              <tr key={a.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-forest)" }}>
                  {a.id}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600 }}>{a.type}</td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  {a.orderId || a.importReceiptId || "—"}
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#B45309" }}>
                  {fmt(a.amount)}
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "#374151" }}>{a.reason}</td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem" }}>
                  <div>{a.createdBy}</div>
                  <div style={{ fontSize: "0.7rem", color: "#15803D" }}>Duyệt: {a.approvedBy}</div>
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: "#6B7280" }}>{a.createdAt}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Lập chứng từ */}
      {showModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Lập chứng từ điều chỉnh bù trừ</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body flex flex-col gap-4">
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Loại điều chỉnh</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                >
                  <option value="Sai lệch kiểm kê">Sai lệch kiểm kê</option>
                  <option value="Bù trừ chiết khấu">Bù trừ chiết khấu phát sinh</option>
                  <option value="Thu bù">Thu bù phụ phí sau hoàn tất</option>
                  <option value="Hoàn trả">Hoàn trả chênh lệch cọc</option>
                </select>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Đơn hàng liên quan</label>
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                  >
                    <option value="">Không có</option>
                    {app.orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.id} ({o.customerName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Phiếu nhập liên quan</label>
                  <select
                    value={importReceiptId}
                    onChange={(e) => setImportReceiptId(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                  >
                    <option value="">Không có</option>
                    {app.importReceipts.map((r) => (
                      <option key={r.id} value={r.id}>{r.id} ({r.supplierName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Số tiền điều chỉnh (VNĐ)</label>
                <input
                  required
                  type="number"
                  min="1000"
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Lý do điều chỉnh</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ghi rõ nguyên nhân sai lệch hoặc thỏa thuận bồi thường..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Lưu chứng từ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. Nhật Ký Hệ Thống - Audit Log (UC10.4) ──────────────────────────────────
export function AuditLogTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = app.auditLogs.filter((l) => {
    const matchSearch =
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || l.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Nhật ký hệ thống — Audit Log (UC10.4)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Lưu vết toàn bộ thao tác quan trọng: phân quyền, đổi trạng thái đơn, sửa xóa chứng từ, đổi chính sách.
          </p>
        </div>
        <button
          onClick={() => alert("Đã xuất 1 tệp Audit_Logs_Export.csv với " + filtered.length + " bản ghi.")}
          className="btn btn-secondary btn-sm"
        >
          <span className="icon-label"><Icon name="chart" size={14} /> Xuất file CSV</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div style={{ position: "relative", minWidth: 280 }}>
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành động, chứng từ..."
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
          <option value="Nhân viên">Nhân viên kho / CSKH</option>
          <option value="Khách hàng">Khách hàng</option>
        </select>
      </div>

      {/* Bảng timeline audit */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Đối tượng tác động", "Chi tiết nội dung"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => (
              <tr key={log.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#6B7280", whiteSpace: "nowrap" }}>
                  {log.timestamp}
                </td>
                <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: "0.85rem", color: "var(--color-bark)" }}>
                  {log.actor}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: log.role === "Quản trị viên" ? "#FEF3C7" : log.role === "Nhân viên" ? "#E0E7FF" : "#F3F4F6",
                    color: log.role === "Quản trị viên" ? "#B45309" : log.role === "Nhân viên" ? "#3730A3" : "#4B5563"
                  }}>
                    {log.role}
                  </span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-forest)" }}>
                  {log.action}
                </td>
                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                  <span style={{ color: "#6B7280" }}>{log.targetEntity}:</span> <strong>{log.targetId}</strong>
                </td>
                <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#374151" }}>
                  {log.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
