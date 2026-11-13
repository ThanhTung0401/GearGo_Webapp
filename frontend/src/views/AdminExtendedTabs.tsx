import { useState, useEffect, useCallback } from "react";
import { useApp } from "../App";
import { isRealApiEnabled } from "../services/apiClient";
import { staffApi } from "../services/api/staffApi";
import { reviewApi } from "../services/api/reviewApi";
import { policyApi, type KiemTraChinhSachBackend } from "../services/api/policyApi";
import { notificationApi, type ThongBaoGuiLoiBackend } from "../services/api/notificationApi";
import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../services/api/reconciliationApi";
import { surchargeApi } from "../services/api/surchargeApi";
import { auditApi } from "../services/api/auditApi";
import {
  mapDanhGiaToReview,
  mapNhatKyToAuditLog,
  type AuditLogEntryWithRef,
} from "../services/mappers/reviewNotifAuditMapper";
import { buildTaoChinhSachRequestFromConfig } from "../services/mappers/policyPromoMapper";
import { fmt, statusColors, type CustomerAccount, type Review, type RentalPolicyConfig, type PolicyVersion, type FinancialAdjustment, type AppNotification } from "../store";
import Icon from "../components/Icon";

// ─── 1. Quản lý Khách Hàng (UC1.13) ──────────────────────────────────────────
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
export function ReviewsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [hideModalReview, setHideModalReview] = useState<Review | null>(null);
  const [hideReason, setHideReason] = useState("Vi phạm ngôn từ / Thô tục");
  const [orderBasisReview, setOrderBasisReview] = useState<Review | null>(null);
  const [replyModalReview, setReplyModalReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  // State đồng bộ API đánh giá thật (/api/v1/admin/danh-gia)
  const [apiReviews, setApiReviews] = useState<Review[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [hideError, setHideError] = useState("");
  const [replyError, setReplyError] = useState("");

  const loadReviews = useCallback(async () => {
    if (!realApi) return;
    setReviewLoading(true);
    setReviewError("");
    try {
      const res = await reviewApi.adminTimKiem({
        trangThai: statusFilter === "active" ? "HienThi" : statusFilter === "hidden" ? "BiAn" : undefined,
        soMoiTrang: 50,
      });
      setApiReviews((res.items ?? []).map(mapDanhGiaToReview));
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Không thể tải danh sách đánh giá từ máy chủ.");
    } finally {
      setReviewLoading(false);
    }
  }, [realApi, statusFilter]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const sourceReviews = realApi ? apiReviews : app.reviews;

  const filtered = sourceReviews.filter((r) => {
    const matchRating = ratingFilter === 0 || r.rating === ratingFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch =
      (r.productName || "").toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());
    return matchRating && matchStatus && matchSearch;
  });

  const handleConfirmHide = async () => {
    if (!hideModalReview) return;
    if (realApi) {
      const reviewId = Number(hideModalReview.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setHideError("Mã đánh giá không hợp lệ để kiểm duyệt.");
        return;
      }
      setActionBusy(true);
      setHideError("");
      setReviewSuccess("");
      try {
        await reviewApi.adminAn(reviewId, hideReason);
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã ẩn đánh giá #${hideModalReview.id} với lý do vi phạm.`);
        setHideModalReview(null);
      } catch (err) {
        setHideError(err instanceof Error ? err.message : "Không thể ẩn đánh giá trên máy chủ.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    app.hideReview(hideModalReview.id, hideReason);
    setHideModalReview(null);
  };

  const handleConfirmReply = async () => {
    if (!replyModalReview || !replyText.trim()) return;
    if (realApi) {
      const reviewId = Number(replyModalReview.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setReplyError("Mã đánh giá không hợp lệ để gửi phản hồi.");
        return;
      }
      setActionBusy(true);
      setReplyError("");
      setReviewSuccess("");
      try {
        await reviewApi.phanHoi(reviewId, replyText.trim());
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã phát hành phản hồi chính thức cho đánh giá #${replyModalReview.id}.`);
        setReplyModalReview(null);
        setReplyText("");
      } catch (err) {
        setReplyError(err instanceof Error ? err.message : "Không thể lưu phản hồi đánh giá.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    app.replyReview(replyModalReview.id, replyText.trim());
    setReplyModalReview(null);
    setReplyText("");
  };

  const handleRestoreReview = async (rev: Review) => {
    if (realApi) {
      const reviewId = Number(rev.id);
      if (!Number.isFinite(reviewId) || reviewId <= 0) {
        setReviewError("Mã đánh giá không hợp lệ để khôi phục.");
        return;
      }
      setActionBusy(true);
      setReviewError("");
      setReviewSuccess("");
      try {
        await reviewApi.adminKhoiPhuc(reviewId, "Mở hiển thị lại đánh giá đã kiểm duyệt");
        await Promise.all([loadReviews(), app.refreshReviews?.()]);
        setReviewSuccess(`Đã khôi phục hiển thị đánh giá #${rev.id}.`);
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : "Không thể khôi phục hiển thị đánh giá.");
      } finally {
        setActionBusy(false);
      }
      return;
    }
    app.addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Bỏ ẩn đánh giá",
      targetEntity: "Review",
      targetId: rev.id,
      detail: "Mở hiển thị lại đánh giá đã kiểm duyệt",
    });
  };

  const orderBasisDetail = orderBasisReview
    ? app.orders.find(
        (o) =>
          o.id === orderBasisReview.orderId ||
          String(o.backendId ?? "") === orderBasisReview.orderId
      )
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Kiểm duyệt đánh giá sản phẩm (UC9.2)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Kiểm tra và xử lý đánh giá theo quy tắc khách quan: Đánh giá điểm thấp không phải lý do vi phạm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {realApi && (
            <button
              type="button"
              disabled={reviewLoading}
              onClick={() => void loadReviews()}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <span className="badge badge-success" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
            Tổng cộng {sourceReviews.length} đánh giá
          </span>
        </div>
      </div>

      {reviewError && (
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
          <span>{reviewError}</span>
        </div>
      )}

      {reviewSuccess && (
        <div
          role="status"
          style={{
            background: "#DCFCE7",
            border: "1px solid #A7F3D0",
            color: "#15803D",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size={16} />
          <span>{reviewSuccess}</span>
        </div>
      )}

      {/* Thông điệp nghiệp vụ bất biến UC9.2 */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.2rem" }}>⚖️</span>
        <div style={{ fontSize: "0.8rem", color: "#1E40AF" }}>
          <strong>Quy tắc bất biến kiểm duyệt (UC9.2):</strong> Điểm đánh giá thấp (1 - 2 sao) tự nó không phải căn cứ vi phạm. Hệ thống bảo vệ tính khách quan của phản hồi, không cho phép sửa đổi điểm số hoặc bình luận của khách. Quản trị viên chỉ ẩn khi nội dung chứa từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
        </div>
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
        {reviewLoading ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 30, textAlign: "center", color: "#6B7280" }}>
            Đang tải danh sách đánh giá từ máy chủ...
          </div>
        ) : filtered.length === 0 ? (
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
                  <span style={{ color: "#E07A43", fontWeight: 700, fontSize: "0.85rem" }}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>Đơn #{rev.orderId}</span>
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
                  <span style={{ fontSize: "0.68rem", background: "#ECFDF5", color: "#059669", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                    ✓ Đã xác thực đơn thuê thực tế
                  </span>
                </div>

                <div style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>
                  "{rev.comment}"
                </div>

                {/* Ảnh đính kèm (UC9.1.2) */}
                {rev.images && rev.images.length > 0 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>Ảnh dã ngoại:</span>
                    {rev.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Ảnh đánh giá ${idx + 1}`}
                        style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1", cursor: "pointer" }}
                        onClick={() => window.open(img, "_blank")}
                        title="Click để xem ảnh kích thước gốc"
                      />
                    ))}
                  </div>
                )}

                {/* Phản hồi chính thức của cửa hàng (storeResponse) */}
                {(rev.storeResponse || rev.response) && (
                  <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
                      <span>💬 Phản hồi từ GearGo ({rev.storeResponse?.respondedBy || "Cửa hàng"})</span>
                      <span style={{ fontWeight: 400, color: "#64748B" }}>{rev.storeResponse?.respondedAt}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#14532D" }}>{rev.storeResponse?.response || rev.response}</p>
                  </div>
                )}

                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  Người gửi: <strong>{rev.customerName}</strong> ({rev.customerId}) · Ngày gửi: {rev.createdAt}
                  {rev.hiddenReason && (
                    <span style={{ color: "#B91C1C", marginLeft: 8 }}>
                      · Lý do ẩn: <strong>{rev.hiddenReason}</strong> ({rev.hiddenBy || "Admin"})
                    </span>
                  )}
                </div>
              </div>

              {/* Nhóm nút hành động */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
                {/* Nút xem căn cứ đơn thuê (UC9.2.1) */}
                <button
                  type="button"
                  onClick={() => setOrderBasisReview(rev)}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  📋 Căn cứ đơn thuê
                </button>

                {/* Nút viết phản hồi từ cửa hàng */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyModalReview(rev);
                    setReplyText(rev.storeResponse?.response || rev.response || "");
                    setReplyError("");
                  }}
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    color: "#15803D",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  💬 {rev.storeResponse ? "Sửa phản hồi" : "Phản hồi"}
                </button>

                {/* Nút Ẩn / Bỏ ẩn */}
                {rev.status === "active" ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      setHideModalReview(rev);
                      setHideReason("Vi phạm ngôn từ / Thô tục");
                      setHideError("");
                    }}
                    style={{
                      background: "white",
                      border: "1px solid #FECACA",
                      color: "#DC2626",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    ✕ Ẩn vi phạm
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleRestoreReview(rev)}
                    style={{
                      background: "var(--color-parchment)",
                      border: "1px solid var(--color-bone)",
                      color: "var(--color-forest)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    ✓ Bỏ ẩn
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Căn cứ đơn thuê (UC9.2.1) */}
      {orderBasisReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">Căn cứ đơn thuê thực tế (UC9.2.1)</h3>
              <button onClick={() => setOrderBasisReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", marginBottom: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)" }}>Đơn thuê #{orderBasisReview.orderId}</span>
                  <span className="badge badge-success">{orderBasisDetail?.status || "Hoàn tất"}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>Khách thuê: <strong>{orderBasisReview.customerName}</strong></div>
                  <div>Mã khách hàng: <strong>{orderBasisReview.customerId}</strong></div>
                  <div>Sản phẩm đánh giá: <strong>{orderBasisReview.productName}</strong></div>
                  <div>Ngày đặt: <strong>{orderBasisDetail?.createdAt || "Chuyến đi gần nhất"}</strong></div>
                </div>
              </div>

              {orderBasisDetail && (
                <div className="mb-3">
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6 }}>Danh sách thiết bị trong đơn:</div>
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                    {orderBasisDetail.items.map((it, idx) => (
                      <div key={idx} style={{ padding: "8px 12px", borderBottom: idx < orderBasisDetail.items.length - 1 ? "1px solid #E2E8F0" : "none", display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                        <span>{it.productName} (x{it.qty})</span>
                        <span style={{ color: "#64748B" }}>{it.days} ngày · {fmt((it.price ?? it.pricePerDay) * it.qty * it.days)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.8rem", fontWeight: 700 }}>
                    <span>Tổng tiền thanh toán đơn:</span>
                    <span style={{ color: "var(--color-forest)" }}>{fmt(orderBasisDetail.total)}</span>
                  </div>
                </div>
              )}

              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: 10, fontSize: "0.75rem", color: "#92400E" }}>
                ✓ Đơn thuê đã được nghiệm thu và hoàn tất bàn giao / trả đồ đầy đủ. Đánh giá của khách hàng đủ điều kiện hiển thị công khai.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setOrderBasisReview(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phản hồi chính thức từ GearGo (UC9.2) */}
      {replyModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Phản hồi chính thức từ GearGo (UC9.2)</h3>
              <button onClick={() => setReplyModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {replyError && (
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
                  <span>{replyError}</span>
                </div>
              )}
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, border: "1px solid #E2E8F0", marginBottom: 12, fontSize: "0.8rem" }}>
                <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{replyModalReview.customerName} đánh giá {replyModalReview.rating} sao:</div>
                <div style={{ fontStyle: "italic", color: "#475569", marginTop: 2 }}>"{replyModalReview.comment}"</div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Nội dung phản hồi từ Cửa hàng / Admin</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="GearGo trân trọng cảm ơn quý khách đã phản hồi..."
                  className="form-textarea"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setReplyModalReview(null);
                  setReplyError("");
                }}
                className="btn btn-secondary btn-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmReply()}
                className="btn btn-primary btn-sm"
                disabled={actionBusy || !replyText.trim()}
              >
                {actionBusy ? "Đang lưu..." : "Lưu và phát hành phản hồi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ẩn đánh giá vi phạm */}
      {hideModalReview && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Ẩn đánh giá vi phạm</h3>
              <button onClick={() => setHideModalReview(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body">
              {hideError && (
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
                  <span>{hideError}</span>
                </div>
              )}
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: "0.75rem", color: "#991B1B" }}>
                <strong>LƯU Ý NGHIỆP VỤ BẮT BUỘC:</strong> Điểm đánh giá 1-2 sao tự nó KHÔNG phải lý do vi phạm. Chỉ được ẩn khi nhận xét có từ ngữ thô tục, quảng cáo spam hoặc hình ảnh phản cảm.
              </div>
              <p style={{ fontSize: "0.82rem", color: "#4B5563", marginBottom: 8 }}>
                Chọn căn cứ vi phạm chuẩn:
              </p>
              <select
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", marginBottom: 12, background: "white" }}
              >
                <option value="Vi phạm ngôn từ / Thô tục">Vi phạm ngôn từ / Xúc phạm thô tục</option>
                <option value="Chứa liên kết quảng cáo spam">Chứa liên kết quảng cáo spam</option>
                <option value="Hình ảnh phản cảm, không liên quan dã ngoại">Hình ảnh phản cảm, không liên quan dã ngoại</option>
                <option value="Tiết lộ thông tin cá nhân trái phép">Tiết lộ thông tin cá nhân trái phép</option>
                <option value="Thông tin hoàn toàn sai sự thật">Thông tin hoàn toàn sai sự thật (đã xác minh đối chiếu)</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    setHideModalReview(null);
                    setHideError("");
                  }}
                  className="btn btn-secondary btn-md"
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleConfirmHide()}
                  className="btn btn-md"
                  style={{ flex: 1, background: "#DC2626", color: "white", border: 0 }}
                >
                  {actionBusy ? "Đang xử lý..." : "Xác nhận ẩn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Cấu hình Chính Sách Thuê & Hủy (UC8.1 & UC8.1.1) ───────────────────────
function formatLocalDatetimeMinutes(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PoliciesTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [subTab, setSubTab] = useState<"current" | "history">("current");
  const [form, setForm] = useState<RentalPolicyConfig>({ ...app.policies });
  const [changeReason, setChangeReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => formatLocalDatetimeMinutes(new Date(Date.now() + 5 * 60_000)));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PolicyVersion | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalError, setModalError] = useState("");
  const [policySaving, setPolicySaving] = useState(false);
  const [checkingPolicy, setCheckingPolicy] = useState(false);
  const [previewCheck, setPreviewCheck] = useState<KiemTraChinhSachBackend | null>(null);

  useEffect(() => {
    if (realApi) {
      void app.refreshPolicies?.();
    }
  }, [realApi]);

  // Đồng bộ form khi app.policies thay đổi
  useEffect(() => {
    setForm({ ...app.policies });
  }, [app.policies]);

  // Tìm danh sách các trường thay đổi so với bản hiện hành
  const getChangedFields = () => {
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    if (form.holdMinutes !== app.policies.holdMinutes) {
      diffs.push({ field: "Thời gian giữ chỗ", oldVal: `${app.policies.holdMinutes} phút`, newVal: `${form.holdMinutes} phút` });
    }
    if (form.standardPickupTime !== app.policies.standardPickupTime) {
      diffs.push({ field: "Giờ nhận tiêu chuẩn", oldVal: app.policies.standardPickupTime, newVal: form.standardPickupTime });
    }
    if (form.standardReturnTime !== app.policies.standardReturnTime) {
      diffs.push({ field: "Giờ trả tiêu chuẩn", oldVal: app.policies.standardReturnTime, newVal: form.standardReturnTime });
    }
    if (form.minDepositPercentage !== app.policies.minDepositPercentage) {
      diffs.push({ field: "Tỷ lệ đặt cọc tối thiểu", oldVal: `${app.policies.minDepositPercentage}%`, newVal: `${form.minDepositPercentage}%` });
    }
    if (form.overdueMultiplier !== app.policies.overdueMultiplier) {
      diffs.push({ field: "Hệ số phạt trễ hạn", oldVal: `${app.policies.overdueMultiplier}x`, newVal: `${form.overdueMultiplier}x` });
    }
    if (form.cancellationTier1FeePercent !== app.policies.cancellationTier1FeePercent) {
      diffs.push({ field: "Phí phạt hủy 24h-48h", oldVal: `${app.policies.cancellationTier1FeePercent}%`, newVal: `${form.cancellationTier1FeePercent}%` });
    }
    if (form.cancellationTier2FeePercent !== app.policies.cancellationTier2FeePercent) {
      diffs.push({ field: "Phí phạt hủy <24h", oldVal: `${app.policies.cancellationTier2FeePercent}%`, newVal: `${form.cancellationTier2FeePercent}%` });
    }
    if (form.damageCompensationPercent !== app.policies.damageCompensationPercent) {
      diffs.push({ field: "Tỷ lệ bồi thường hư hỏng", oldVal: `${app.policies.damageCompensationPercent}%`, newVal: `${form.damageCompensationPercent}%` });
    }
    if (form.adminApprovalFeeThreshold !== app.policies.adminApprovalFeeThreshold) {
      diffs.push({ field: "Ngưỡng duyệt phụ phí của Admin", oldVal: fmt(app.policies.adminApprovalFeeThreshold), newVal: fmt(form.adminApprovalFeeThreshold) });
    }
    if (form.reminderPickupHoursBefore !== app.policies.reminderPickupHoursBefore) {
      diffs.push({ field: "Nhắc nhận máy trước", oldVal: `${app.policies.reminderPickupHoursBefore}h`, newVal: `${form.reminderPickupHoursBefore}h` });
    }
    if (form.reminderReturnHoursBefore !== app.policies.reminderReturnHoursBefore) {
      diffs.push({ field: "Nhắc trả máy trước", oldVal: `${app.policies.reminderReturnHoursBefore}h`, newVal: `${form.reminderReturnHoursBefore}h` });
    }
    return diffs;
  };

  const handleOpenReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const diffs = getChangedFields();
    if (diffs.length === 0) {
      setMessage({ type: "error", text: "Bạn chưa thay đổi thông số nào so với chính sách hiện hành." });
      return;
    }
    // Validation sơ bộ dòng phụ 2.1
    if (form.holdMinutes <= 0) return setMessage({ type: "error", text: "Thời gian giữ chỗ phải lớn hơn 0 phút." });
    if (form.overdueMultiplier <= 0) return setMessage({ type: "error", text: "Hệ số phạt trễ phải lớn hơn 0." });
    if (form.cancellationTier1FeePercent > form.cancellationTier2FeePercent) {
      return setMessage({ type: "error", text: "Mâu thuẫn mốc hủy: Phạt hủy 24-48h không được cao hơn phạt hủy sát giờ (<24h)." });
    }
    setMessage(null);
    setModalError("");
    setPreviewCheck(null);

    const parsedEff = new Date(effectiveDate);
    const nextEff =
      !isNaN(parsedEff.getTime()) && parsedEff.getTime() > Date.now()
        ? effectiveDate
        : formatLocalDatetimeMinutes(new Date(Date.now() + 5 * 60_000));
    if (nextEff !== effectiveDate) {
      setEffectiveDate(nextEff);
    }

    setShowConfirmModal(true);

    if (realApi) {
      setCheckingPolicy(true);
      try {
        const req = buildTaoChinhSachRequestFromConfig(
          changeReason.trim() || `Cập nhật chính sách từ ${nextEff.slice(0, 10)}`,
          new Date(nextEff).toISOString(),
          form
        );
        const check = await policyApi.kiemTra(req);
        setPreviewCheck(check);
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể kiểm tra hợp lệ chính sách với máy chủ.");
      } finally {
        setCheckingPolicy(false);
      }
    }
  };

  const handleConfirmSave = async () => {
    if (!changeReason.trim()) {
      setModalError("Vui lòng ghi rõ lý do ban hành chính sách mới (bắt buộc theo UC8.1).");
      return;
    }

    if (realApi) {
      const parsed = new Date(effectiveDate);
      if (isNaN(parsed.getTime())) {
        setModalError("Thời điểm bắt đầu có hiệu lực không hợp lệ.");
        return;
      }
      setPolicySaving(true);
      setModalError("");
      try {
        const req = buildTaoChinhSachRequestFromConfig(
          changeReason.trim(),
          parsed.toISOString(),
          form
        );
        const check = await policyApi.kiemTra(req);
        setPreviewCheck(check);
        if (!check.hopLe) {
          const detail = (check.loiTheoDuongDan ?? [])
            .map((l) => (l.duongDan ? `${l.duongDan}: ${l.thongDiep}` : l.thongDiep))
            .join(" | ");
          setModalError(detail || "Nội dung chính sách chưa hợp lệ theo kiểm tra máy chủ.");
          return;
        }
        await policyApi.taoPhienBan(req);
        await app.refreshPolicies?.();
        setShowConfirmModal(false);
        setChangeReason("");
        setPreviewCheck(null);
        setMessage({
          type: "success",
          text: "Đã ban hành phiên bản chính sách mới lên máy chủ! Đơn cũ giữ nguyên chính sách đã chốt (UC8.1).",
        });
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể ban hành phiên bản chính sách mới.");
      } finally {
        setPolicySaving(false);
      }
      return;
    }

    const res = app.updatePolicy(form, changeReason.trim(), effectiveDate.trim() || undefined);
    if (res.ok) {
      setShowConfirmModal(false);
      setChangeReason("");
      setMessage({ type: "success", text: `Đã ban hành phiên bản chính sách mới thành công! Đơn cũ giữ nguyên chính sách đã chốt (UC8.1).` });
    } else {
      setModalError(res.message);
    }
  };

  const updateAccessoryFee = (index: number, newFee: number) => {
    const nextSchedule = [...(form.accessoryLossFeeSchedule || [])];
    if (nextSchedule[index]) {
      nextSchedule[index] = { ...nextSchedule[index], defaultFee: newFee };
      setForm({ ...form, accessoryLossFeeSchedule: nextSchedule });
    }
  };

  const currentVer = app.policies.version || "v1.2";

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header & SubTabs */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>
              Cấu hình chính sách thuê & hủy (UC8.1)
            </h2>
            <span style={{ background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {currentVer}
            </span>
          </div>
          <p style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 2 }}>
            Thiết lập quy tắc kinh doanh có phiên bản. Thay đổi chỉ áp dụng cho đơn mới, giữ nguyên chính sách trên các đơn cũ (không tính hồi tố).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab("current")}
            style={{
              background: subTab === "current" ? "var(--color-forest)" : "white",
              color: subTab === "current" ? "white" : "var(--color-bark)",
              border: "1px solid var(--color-bone)",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            ⚙️ Cấu hình hiện hành
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            style={{
              background: subTab === "history" ? "var(--color-forest)" : "white",
              color: subTab === "history" ? "white" : "var(--color-bark)",
              border: "1px solid var(--color-bone)",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            📜 Lịch sử phiên bản ({app.policyVersions.length})
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.type === "success" ? "#DCFCE7" : "#FEE2E2",
          color: message.type === "success" ? "#15803D" : "#B91C1C",
          border: `1px solid ${message.type === "success" ? "#A7F3D0" : "#FECACA"}`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", fontWeight: 600
        }}>
          {message.text}
        </div>
      )}

      {/* SUBTAB 1: CẤU HÌNH HIỆN HÀNH */}
      {subTab === "current" && (
        <form onSubmit={handleOpenReview} className="flex flex-col gap-5">
          {/* Nhóm 1: Thời gian & Giữ chỗ */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⏱</span> 1. Thời gian & Quy định giữ chỗ
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Kiểm soát vòng đời đơn Chờ thanh toán và khung giờ tiếp đón khách giao nhận thiết bị tại cửa hàng.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Hạn giữ chỗ thanh toán (phút)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.holdMinutes}
                  onChange={(e) => setForm({ ...form, holdMinutes: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Đơn Chờ thanh toán tự động hủy khi hết hạn.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Giờ nhận máy tiêu chuẩn
                </label>
                <input
                  type="time"
                  value={form.standardPickupTime || "08:00"}
                  onChange={(e) => setForm({ ...form, standardPickupTime: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Giờ mở cửa phục vụ giao máy sớm nhất.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Giờ trả máy tiêu chuẩn
                </label>
                <input
                  type="time"
                  value={form.standardReturnTime || "20:00"}
                  onChange={(e) => setForm({ ...form, standardReturnTime: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Giờ đóng cửa tiếp nhận trả máy trong ngày.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ đặt cọc tối thiểu (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.minDepositPercentage ?? 100}
                  onChange={(e) => setForm({ ...form, minDepositPercentage: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Mặc định 100% giá trị cọc quy định.</span>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Mốc hủy đơn & Phạt hoàn tiền (UC8.1) */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🚫</span> 2. Mốc hủy đơn & Tỷ lệ phạt hoàn cọc (UC8.1)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Quy tắc tính phí phạt hủy khi khách chủ động hủy đơn trước giờ nhận máy. Chặn mâu thuẫn mốc thời gian (Dòng phụ 2.1).
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#15803D", marginBottom: 4 }}>
                  Mốc 1: Hủy trước &gt; {form.cancellationFreeHours ?? 48} giờ
                </div>
                <div style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                  Phí phạt hủy: <strong>0%</strong> (Hoàn 100% tiền cọc và tiền thuê).
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ phạt hủy trước 24h - 48h (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.cancellationTier1FeePercent}
                  onChange={(e) => setForm({ ...form, cancellationTier1FeePercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Áp dụng khi khách hủy đơn trong khoảng 24h đến 48h trước giờ nhận.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ phạt hủy sát giờ &lt; 24h (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.cancellationTier2FeePercent}
                  onChange={(e) => setForm({ ...form, cancellationTier2FeePercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Hủy sát giờ (&lt;24h) không được hoàn tiền thuê theo quy định.</span>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Phạt trễ hạn & Biểu phí bồi thường hư hỏng / phụ kiện */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️</span> 3. Phạt trễ hạn & Biểu phí bồi thường hư hại / phụ kiện
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Cơ sở để nhân viên kho tính phụ phí quá hạn và bồi thường khi khách làm hỏng máy hoặc thất lạc phụ kiện.
            </p>
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Hệ số phạt trễ hạn (lần/ngày)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={form.overdueMultiplier}
                  onChange={(e) => setForm({ ...form, overdueMultiplier: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Ví dụ: 1.5 tương ứng 150% đơn giá ngày cho mỗi ngày quá hạn.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ đền bù hư hỏng cơ bản (% giá trị thiết bị)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={form.damageCompensationPercent ?? 50}
                  onChange={(e) => setForm({ ...form, damageCompensationPercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Mức phạt gợi ý khi thiết bị trầy xước nặng hoặc hỏng linh kiện.</span>
              </div>
            </div>

            {/* Biểu phí phụ kiện lẻ */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                Biểu phí bồi thường mất phụ kiện lẻ kèm theo:
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                {(form.accessoryLossFeeSchedule || []).map((item, idx) => (
                  <div key={item.accessoryName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{item.accessoryName}</span>
                    <input
                      type="number"
                      step="10000"
                      min="0"
                      value={item.defaultFee}
                      onChange={(e) => updateAccessoryFee(idx, Number(e.target.value))}
                      style={{ width: 110, textAlign: "right", border: "1px solid var(--color-bone)", borderRadius: 4, padding: "4px 6px", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nhóm 4: Ngưỡng duyệt phí quản trị & Lịch nhắc khách */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛡</span> 4. Ngưỡng duyệt phụ phí & Lịch nhắc khách tự động
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Cấu hình bảo vệ kiểm soát nội bộ và tự động hóa trải nghiệm khách hàng trước các mốc nhận/trả.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Ngưỡng phụ phí Admin duyệt (VNĐ)
                </label>
                <input
                  type="number"
                  step="100000"
                  min="0"
                  value={form.adminApprovalFeeThreshold ?? 1000000}
                  onChange={(e) => setForm({ ...form, adminApprovalFeeThreshold: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Phụ phí vượt mức này nhân viên không được tự quyết, cần Admin duyệt.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Nhắc nhận máy trước (giờ)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.reminderPickupHoursBefore ?? 4}
                  onChange={(e) => setForm({ ...form, reminderPickupHoursBefore: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Hệ thống gửi thông báo nhắc khách đến nhận máy.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Nhắc trả máy trước (giờ)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.reminderReturnHoursBefore ?? 2}
                  onChange={(e) => setForm({ ...form, reminderReturnHoursBefore: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Gửi cảnh báo trước giờ hẹn trả để tránh phát sinh phụ phí trễ.</span>
              </div>
            </div>
          </div>

          {/* Banner thông tin phiên bản & Nút lưu */}
          <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-bark)", fontWeight: 700 }}>
                Chính sách đang áp dụng: <span style={{ color: "var(--color-forest)" }}>{currentVer}</span> (Hiệu lực từ {app.policies.effectiveDate || "01/12/2024"})
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 2 }}>
                Ban hành bởi <strong>{app.policies.updatedBy}</strong> lúc {app.policies.updatedAt}
              </div>
            </div>
            <button
              type="submit"
              style={{
                background: "var(--color-forest)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)"
              }}
            >
              Xem lại tác động & Ban hành phiên bản mới (UC8.1.1) →
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: LỊCH SỬ PHIÊN BẢN (UC8.1.1) */}
      {subTab === "history" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-bark)" }}>
              Lịch sử các phiên bản chính sách đã ban hành ({app.policyVersions.length})
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: 0 }}>
              Mỗi phiên bản lưu giữ toàn bộ snapshot quy tắc kinh doanh tại thời điểm ban hành. Đơn thuê phát sinh thời điểm nào giữ nguyên căn cứ tính của phiên bản đó.
            </p>
          </div>
          <div className="responsive-table">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)" }}>
                  {["Phiên bản", "Ngày hiệu lực", "Ngày cập nhật", "Người ban hành", "Lý do ban hành / Nội dung thay đổi", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.policyVersions.map((v, i) => (
                  <tr key={v.version} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)", fontSize: "0.8rem" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>
                      {v.version}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{v.effectiveDate}</td>
                    <td style={{ padding: "12px 14px", color: "#6B7280", fontSize: "0.75rem" }}>{v.updatedAt}</td>
                    <td style={{ padding: "12px 14px" }}>{v.updatedBy}</td>
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{v.changeReason}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedSnapshot(v)}
                        style={{ background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                      >
                        👁 Xem snapshot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL SO SÁNH ĐỐI CHIẾU CŨ VS MỚI (UC8.1.1) */}
      {showConfirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC8.1.1: ĐỐI CHIẾU PHIÊN BẢN MỚI
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Xác nhận ban hành chính sách mới
                </h3>
              </div>
              <button type="button" onClick={() => setShowConfirmModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ fontSize: "0.78rem", color: "#4B5563", marginBottom: 12 }}>
              Hệ thống đã phát hiện <strong>{getChangedFields().length} thông số</strong> có sự thay đổi so với phiên bản hiện tại:
            </p>

            {/* Bảng diff Cũ vs Mới */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10, marginBottom: 16, border: "1px solid var(--color-bone)", maxHeight: 180, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ color: "#6B7280", textAlign: "left" }}>
                    <th style={{ padding: "4px 8px" }}>Thông số</th>
                    <th style={{ padding: "4px 8px" }}>Giá trị cũ</th>
                    <th style={{ padding: "4px 8px" }}>Giá trị mới</th>
                  </tr>
                </thead>
                <tbody>
                  {getChangedFields().map((d) => (
                    <tr key={d.field} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{d.field}</td>
                      <td style={{ padding: "6px 8px", color: "#9CA3AF", textDecoration: "line-through" }}>{d.oldVal}</td>
                      <td style={{ padding: "6px 8px", color: "var(--color-forest)", fontWeight: 700 }}>{d.newVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Lý do điều chỉnh chính sách * (Bắt buộc theo UC8.1)
              </label>
              <textarea
                placeholder="VD: Cập nhật biểu phí bồi thường phụ kiện và nâng tỷ lệ phạt hủy mùa cao điểm..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                rows={2}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem", resize: "none" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Thời điểm bắt đầu có hiệu lực
              </label>
              <input
                type="datetime-local"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem" }}
              />
              <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Chính sách mới sẽ chỉ áp dụng cho các đơn đặt thuê phát sinh từ mốc thời gian này (không hồi tố).</span>
            </div>

            {checkingPolicy && (
              <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 10 }}>
                Đang kiểm tra hợp lệ phiên bản chính sách với máy chủ...
              </div>
            )}

            {previewCheck && (previewCheck.canhBao?.length ?? 0) > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", marginBottom: 10 }}>
                <strong>Cảnh báo từ hệ thống:</strong> {previewCheck.canhBao.join(" | ")}
              </div>
            )}

            {modalError && (
              <div
                role="alert"
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: "0.78rem",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="alert-circle" size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={policySaving}
                onClick={() => {
                  setShowConfirmModal(false);
                  setModalError("");
                }}
                style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={policySaving}
                onClick={() => void handleConfirmSave()}
                style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {policySaving ? "Đang ban hành..." : "✓ Ban hành & Lưu phiên bản mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT SNAPSHOT PHIÊN BẢN CŨ */}
      {selectedSnapshot && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "var(--color-parchment)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  SNAPSHOT {selectedSnapshot.version}
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Chính sách có hiệu lực từ {selectedSnapshot.effectiveDate}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedSnapshot(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
              Lý do ban hành: <strong>{selectedSnapshot.changeReason}</strong> (Cập nhật bởi {selectedSnapshot.updatedBy} lúc {selectedSnapshot.updatedAt})
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, fontSize: "0.78rem", display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              <div className="flex justify-between"><span>Thời gian giữ chỗ:</span><strong>{selectedSnapshot.configSnapshot.holdMinutes} phút</strong></div>
              <div className="flex justify-between"><span>Giờ nhận / trả chuẩn:</span><strong>{selectedSnapshot.configSnapshot.standardPickupTime || "08:00"} - {selectedSnapshot.configSnapshot.standardReturnTime || "20:00"}</strong></div>
              <div className="flex justify-between"><span>Phí phạt hủy 24-48h:</span><strong>{selectedSnapshot.configSnapshot.cancellationTier1FeePercent}%</strong></div>
              <div className="flex justify-between"><span>Phí phạt hủy &lt;24h:</span><strong>{selectedSnapshot.configSnapshot.cancellationTier2FeePercent}%</strong></div>
              <div className="flex justify-between"><span>Hệ số phạt trễ hạn:</span><strong>{selectedSnapshot.configSnapshot.overdueMultiplier}x/ngày</strong></div>
              <div className="flex justify-between"><span>Tỷ lệ bồi thường hỏng:</span><strong>{selectedSnapshot.configSnapshot.damageCompensationPercent}%</strong></div>
              <div className="flex justify-between"><span>Ngưỡng duyệt phụ phí:</span><strong>{fmt(selectedSnapshot.configSnapshot.adminApprovalFeeThreshold)}</strong></div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. Soạn & Gửi Thông Báo Hệ Thống (UC9.4 & UC9.5) ──────────────────────────
export function NotificationsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<AppNotification["targetRole"]>("all");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [type, setType] = useState<AppNotification["type"]>("info");
  const [category, setCategory] = useState<"order" | "rental" | "finance" | "promo" | "system">("system");
  const [hasActionLink, setHasActionLink] = useState(false);
  const [actionType, setActionType] = useState<"order" | "page" | "reviews">("order");
  const [actionTargetId, setActionTargetId] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  // Bộ lọc danh sách đã phát
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // State UC95: Hàng chờ gửi lỗi & Thử lại (/api/v1/admin/thong-bao/gui-loi & thu-lai)
  const [failedItems, setFailedItems] = useState<ThongBaoGuiLoiBackend[]>([]);
  const [failedTotal, setFailedTotal] = useState(0);
  const [failedPage, setFailedPage] = useState(1);
  const [failedLoading, setFailedLoading] = useState(false);
  const [failedError, setFailedError] = useState("");
  const [failedSuccess, setFailedSuccess] = useState("");
  const [retryTarget, setRetryTarget] = useState<ThongBaoGuiLoiBackend | null>(null);
  const [retryReason, setRetryReason] = useState("Thử gửi lại thông báo qua hàng chờ thủ công");
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadFailedQueue = useCallback(
    async (page = 1) => {
      if (!realApi) return;
      setFailedLoading(true);
      setFailedError("");
      try {
        const res = await notificationApi.adminLayGuiLoi({ trang: page, soMoiTrang: 10 });
        setFailedItems(res.items ?? []);
        setFailedTotal(Number(res.totalItems ?? (res.items ?? []).length));
        setFailedPage(res.currentPage || page);
      } catch (err) {
        setFailedError(err instanceof Error ? err.message : "Không thể tải danh sách thông báo gửi lỗi.");
      } finally {
        setFailedLoading(false);
      }
    },
    [realApi]
  );

  useEffect(() => {
    void loadFailedQueue(1);
  }, [loadFailedQueue]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (realApi) {
      setSendError("");
      let maTaiKhoanNhan: number | null = null;
      if (targetAccountId.trim()) {
        const parsedTk = Number(targetAccountId.trim());
        if (!Number.isInteger(parsedTk) || parsedTk <= 0) {
          setSendError("Mã tài khoản nhận phải là số nguyên dương hoặc để trống để gửi toàn hệ thống.");
          return;
        }
        maTaiKhoanNhan = parsedTk;
      }

      let maDonThue: number | null = null;
      if (hasActionLink && actionType === "order" && actionTargetId.trim()) {
        const rawOrder = actionTargetId.trim();
        const matched = app.orders.find((o) => o.id === rawOrder || o.displayCode === rawOrder);
        if (matched?.backendId) {
          maDonThue = matched.backendId;
        } else {
          const digits = Number(rawOrder.replace(/\D/g, ""));
          if (Number.isInteger(digits) && digits > 0) {
            maDonThue = digits;
          }
        }
      }

      const loaiSuKienMap: Record<typeof category, string> = {
        order: "DonThue",
        rental: "NhacLichThue",
        finance: "ThanhToan",
        promo: "KhuyenMai",
        system: type === "warning" || type === "alert" ? "CanhBaoHeThong" : "HeThong",
      };

      setSendLoading(true);
      try {
        await notificationApi.adminGuiThuCong({
          tieuDe: title.trim(),
          noiDung: message.trim(),
          maTaiKhoanNhan,
          maDonThue,
          loaiSuKien: loaiSuKienMap[category],
        });
        await Promise.all([app.refreshNotifications?.(), loadFailedQueue(failedPage)]);
        setTitle("");
        setMessage("");
        setTargetAccountId("");
        setHasActionLink(false);
        setActionTargetId("");
        setActionLabel("");
        setSentSuccess(true);
        setTimeout(() => setSentSuccess(false), 3500);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Không thể phát hành thông báo qua máy chủ.");
      } finally {
        setSendLoading(false);
      }
      return;
    }

    app.sendNotification({
      title: title.trim(),
      message: message.trim(),
      targetRole,
      type,
      category,
      actionLink: hasActionLink ? {
        type: actionType,
        targetId: actionType === "order" ? (actionTargetId.trim() || "ORD-001") : undefined,
        label: actionLabel.trim() || (actionType === "order" ? "Xem chi tiết đơn →" : actionType === "reviews" ? "Đánh giá chuyến đi →" : "Khám phá catalog →"),
      } : undefined
    });

    setTitle("");
    setMessage("");
    setHasActionLink(false);
    setActionTargetId("");
    setActionLabel("");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3500);
  };

  const handleConfirmRetry = async () => {
    if (!retryTarget) return;
    setRetryingId(retryTarget.maThongBao);
    setFailedError("");
    setFailedSuccess("");
    try {
      await notificationApi.adminThuLai(retryTarget.maThongBao, retryReason.trim() || undefined);
      setFailedSuccess(`Đã kích hoạt thử lại gửi thông báo #${retryTarget.maThongBao} ("${retryTarget.tieuDe}").`);
      setRetryTarget(null);
      await Promise.all([loadFailedQueue(failedPage), app.refreshNotifications?.()]);
    } catch (err) {
      setFailedError(err instanceof Error ? err.message : `Không thể thử lại gửi thông báo #${retryTarget.maThongBao}.`);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredHistory = app.notifications.filter((n) => {
    const matchRole = filterRole === "all" || n.targetRole === filterRole || n.targetRole === "all";
    const matchCat = filterCategory === "all" || n.category === filterCategory;
    return matchRole && matchCat;
  });

  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
      {/* Form soạn tin & Live Preview */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 22 }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginBottom: 4 }}>
              Soạn & Phát hành thông báo (UC9.4)
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.82rem" }}>
              Gửi thông báo đẩy tức thời đến khách hàng hoặc nhân viên trực ban kèm Deep Link điều hướng đích (UC9.3.1).
            </p>
          </div>
        </div>

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

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
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

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Danh mục nghiệp vụ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
              >
                <option value="system">⚙️ Hệ thống</option>
                <option value="rental">⛺ Đơn thuê</option>
                <option value="order">📦 Đơn hàng</option>
                <option value="finance">💰 Tài chính / Cọc</option>
                <option value="promo">🎁 Khuyến mãi</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Nội dung chi tiết</label>
            <textarea
              required
              rows={3}
              placeholder="Nhập nội dung thông báo gửi đến người dùng..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}
            />
          </div>

          {/* Cấu hình Deep Link điều hướng (UC9.3.1 & UC9.4.1) */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)" }}>
              <input
                type="checkbox"
                checked={hasActionLink}
                onChange={(e) => setHasActionLink(e.target.checked)}
              />
              🔗 Gắn liên kết hành động điều hướng (Deep-link - UC9.3.1)
            </label>

            {hasActionLink && (
              <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Trang đích điều hướng</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 10px", fontSize: "0.8rem", background: "white" }}
                  >
                    <option value="order">Chi tiết đơn hàng cụ thể (UC9.3.1)</option>
                    <option value="reviews">Trang đánh giá sản phẩm (UC9.1)</option>
                    <option value="page">Trang danh mục thuê đồ</option>
                  </select>
                </div>

                {actionType === "order" ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Mã đơn hàng đích</label>
                    <input
                      type="text"
                      placeholder="VD: ORD-001 hoặc ORD-002"
                      value={actionTargetId}
                      onChange={(e) => setActionTargetId(e.target.value)}
                      style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 10px", fontSize: "0.8rem" }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Nhãn nút bấm</label>
                    <input
                      type="text"
                      placeholder={actionType === "reviews" ? "Đánh giá ngay →" : "Xem đồ dã ngoại →"}
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                      style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 10px", fontSize: "0.8rem" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BƯỚC 4 UC9.4: KHUNG LIVE PREVIEW (Xem trước thông báo trước khi phát hành) */}
          <div style={{ background: "#F1F5F9", borderRadius: 10, padding: 14, border: "1px dashed #94A3B8" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>👁️ BƯỚC 4 UC9.4: XEM TRƯỚC THÔNG BÁO (LIVE PREVIEW)</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "#64748B" }}>Mô phỏng giao diện người nhận</span>
            </div>

            <div style={{ background: "white", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex justify-between items-start mb-1.5">
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                    {title.trim() || "(Chưa nhập tiêu đề)"}
                  </strong>
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: category === "rental" ? "#FEF3C7" : category === "order" ? "#DBEAFE" : category === "finance" ? "#DCFCE7" : "#F3F4F6",
                    color: category === "rental" ? "#B45309" : category === "order" ? "#1D4ED8" : category === "finance" ? "#15803D" : "#4B5563"
                  }}>
                    {category.toUpperCase()}
                  </span>
                </div>
                <span style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: type === "alert" ? "#FEE2E2" : type === "warning" ? "#FEF3C7" : "#DCFCE7",
                  color: type === "alert" ? "#DC2626" : type === "warning" ? "#B45309" : "#15803D"
                }}>
                  {targetRole === "all" ? "TẤT CẢ" : targetRole.toUpperCase()}
                </span>
              </div>

              <p style={{ fontSize: "0.78rem", color: "#4B5563", margin: "4px 0 8px", lineHeight: 1.45 }}>
                {message.trim() || "(Chưa nhập nội dung thông báo...)"}
              </p>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>Vừa xong</span>
                {hasActionLink && (
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 8px", borderRadius: 4 }}>
                    {actionLabel.trim() || (actionType === "order" ? `Xem đơn #${actionTargetId || "ORD-001"} →` : actionType === "reviews" ? "Đánh giá ngay →" : "Xem catalog →")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {realApi && (
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>
                Mã tài khoản nhận cụ thể (tùy chọn)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Để trống để gửi thông báo hệ thống chung"
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem" }}
              />
            </div>
          )}

          {sendError && (
            <div
              role="alert"
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="alert-circle" size={16} />
              <span>{sendError}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={sendLoading} className="btn btn-primary btn-md">
              {sendLoading ? "Đang phát hành..." : "✓ Xác nhận & Phát hành thông báo (UC9.4)"}
            </button>
            {sentSuccess && (
              <span className="badge badge-success">✓ Đã phát thông báo thành công đến đối tượng mục tiêu!</span>
            )}
          </div>
        </form>
      </div>

      {/* Danh sách đã phát & Bộ lọc */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 22, display: "flex", flexDirection: "column" }}>
        <div className="flex justify-between items-center mb-3">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)" }}>
            Thông báo đã phát ({filteredHistory.length})
          </h3>
        </div>

        {/* Bộ lọc lịch sử phát */}
        <div className="flex gap-2 mb-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.75rem", background: "white" }}
          >
            <option value="all">Tất cả đối tượng</option>
            <option value="customer">Khách hàng</option>
            <option value="staff">Nhân viên kho</option>
            <option value="admin">Quản trị viên</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.75rem", background: "white" }}
          >
            <option value="all">Tất cả danh mục</option>
            <option value="rental">⛺ Đơn thuê</option>
            <option value="order">📦 Đơn hàng</option>
            <option value="finance">💰 Tài chính</option>
            <option value="system">⚙️ Hệ thống</option>
          </select>
        </div>

        <div style={{ overflowY: "auto", maxHeight: 480, display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredHistory.map((n) => (
            <div key={n.id} style={{ border: "1px solid var(--color-bone)", borderRadius: 10, padding: 12, background: "var(--color-cream)" }}>
              <div className="flex justify-between items-start mb-1">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>{n.title}</strong>
                  {n.category && (
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#E2E8F0", color: "#475569" }}>
                      {n.category.toUpperCase()}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: n.type === "alert" ? "#FEE2E2" : n.type === "warning" ? "#FEF3C7" : "#DBEAFE", color: n.type === "alert" ? "#DC2626" : n.type === "warning" ? "#B45309" : "#1D4ED8" }}>
                  {n.targetRole.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#4B5563", lineHeight: 1.4, margin: "4px 0" }}>{n.message}</p>
              
              <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-200">
                <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{n.createdAt}</span>
                {n.actionLink && (
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#2563EB" }}>
                    🔗 {n.actionLink.label || "Liên kết"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* Hàng chờ gửi lỗi & Thử lại thủ công (UC9.5) */}
      <div style={{ background: "#F8F6F0", borderRadius: 12, border: "1px solid #E2DDD1", padding: 20 }}>
        <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "#11231B", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alert-circle" size={18} style={{ color: "#E07A43" }} />
              <span>Hàng chờ gửi lỗi &amp; Thử lại (UC9.5)</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  background: failedTotal > 0 ? "#FEF2F2" : "#E2DDD1",
                  color: failedTotal > 0 ? "#B91C1C" : "#11231B",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                {failedTotal} bản ghi lỗi
              </span>
            </h3>
            <p style={{ color: "#6B7280", fontSize: "0.8rem", margin: 0 }}>
              Theo dõi các thông báo/email gửi thất bại từ hàng chờ nền và kích hoạt thử lại thủ công theo dõi số lần thử.
            </p>
          </div>
          {realApi && (
            <button
              type="button"
              disabled={failedLoading}
              onClick={() => void loadFailedQueue(failedPage)}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label">
                <Icon name="refresh" size={14} />
                {failedLoading ? "Đang tải..." : "Tải lại hàng chờ"}
              </span>
            </button>
          )}
        </div>

        {failedError && (
          <div
            role="alert"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#B91C1C",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="alert-circle" size={15} />
            <span>{failedError}</span>
          </div>
        )}

        {failedSuccess && (
          <div
            role="status"
            style={{
              background: "#DCFCE7",
              border: "1px solid #A7F3D0",
              color: "#15803D",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="check" size={15} />
            <span>{failedSuccess}</span>
          </div>
        )}

        {!realApi ? (
          <div style={{ background: "#F1ECE2", borderRadius: 8, padding: 14, fontSize: "0.8rem", color: "#4B5563" }}>
            Hàng chờ gửi lỗi kết nối trực tiếp tới máy chủ (/api/v1/admin/thong-bao/gui-loi). Vui lòng bật chế độ API thật để theo dõi và thử lại.
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 10, border: "1px solid #E2DDD1", overflow: "hidden" }}>
            <div className="responsive-table">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F1ECE2", fontSize: "0.78rem", fontWeight: 700, color: "#11231B" }}>
                    {["Mã TB", "Tài khoản / Đơn", "Tiêu đề & Nội dung", "Trạng thái / Lần thử", "Lỗi gần nhất", "Thời điểm tạo", "Thao tác"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {failedLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.82rem" }}>
                        Đang tải hàng chờ thông báo gửi lỗi...
                      </td>
                    </tr>
                  ) : failedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#1B3F2F", fontSize: "0.82rem" }}>
                        Không có thông báo nào đang lỗi trong hàng chờ gửi.
                      </td>
                    </tr>
                  ) : (
                    failedItems.map((item, idx) => (
                      <tr key={item.maThongBao} style={{ borderTop: "1px solid #E2DDD1", background: idx % 2 === 0 ? "white" : "#F8F6F0", fontSize: "0.8rem" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1B3F2F" }}>
                          #{item.maThongBao}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>
                          <div>TK #{item.maTaiKhoan}</div>
                          {item.maDonThue && <div style={{ color: "#6B7280" }}>Đơn #{item.maDonThue}</div>}
                        </td>
                        <td style={{ padding: "10px 12px", maxWidth: 260 }}>
                          <div style={{ fontWeight: 700, color: "#11231B" }}>{item.tieuDe}</div>
                          <div style={{ fontSize: "0.74rem", color: "#4B5563", marginTop: 2 }}>{item.noiDung}</div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "2px 7px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>
                            {item.trangThaiGui}
                          </span>
                          <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 4 }}>
                            Đã thử: <strong>{item.soLanThuGui}</strong> lần
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#991B1B", maxWidth: 220 }}>
                          {item.loiGuiGanNhat || "Lỗi kết nối cổng gửi"}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "#6B7280", whiteSpace: "nowrap" }}>
                          {new Date(item.thoiDiemTao).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            type="button"
                            disabled={retryingId === item.maThongBao}
                            onClick={() => {
                              setRetryTarget(item);
                              setRetryReason("Thử gửi lại thông báo qua hàng chờ thủ công");
                            }}
                            style={{
                              background: "#E07A43",
                              color: "white",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Icon name="refresh" size={13} />
                            Thử lại
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {failedTotal > 10 && (
              <div className="flex justify-between items-center p-3" style={{ borderTop: "1px solid #E2DDD1", background: "#F8F6F0", fontSize: "0.78rem" }}>
                <span>Trang {failedPage} · Tổng {failedTotal} bản ghi</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={failedPage <= 1 || failedLoading}
                    onClick={() => void loadFailedQueue(failedPage - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={failedPage * 10 >= failedTotal || failedLoading}
                    onClick={() => void loadFailedQueue(failedPage + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal xác nhận thử lại gửi thông báo lỗi (UC9.5) */}
      {retryTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Thử lại gửi thông báo #{retryTarget.maThongBao}</h3>
              <button type="button" onClick={() => setRetryTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <div style={{ background: "#F8F6F0", borderRadius: 8, padding: 10, border: "1px solid #E2DDD1", fontSize: "0.8rem" }}>
                <div style={{ fontWeight: 700, color: "#11231B" }}>{retryTarget.tieuDe}</div>
                <div style={{ color: "#4B5563", marginTop: 4 }}>{retryTarget.noiDung}</div>
                {retryTarget.loiGuiGanNhat && (
                  <div style={{ color: "#B91C1C", fontSize: "0.74rem", marginTop: 6 }}>
                    Lỗi gần nhất: {retryTarget.loiGuiGanNhat}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>
                  Lý do / ghi chú thử lại (lưu nhật ký UC9.5)
                </label>
                <textarea
                  rows={2}
                  value={retryReason}
                  onChange={(e) => setRetryReason(e.target.value)}
                  placeholder="VD: Đã kiểm tra cấu hình SMTP, kích hoạt gửi lại..."
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 8, fontSize: "0.82rem" }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={retryingId !== null}
                  onClick={() => setRetryTarget(null)}
                  className="btn btn-secondary btn-md"
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={retryingId !== null}
                  onClick={() => void handleConfirmRetry()}
                  className="btn btn-primary btn-md"
                  style={{ flex: 1 }}
                >
                  {retryingId === retryTarget.maThongBao ? "Đang gửi lại..." : "Xác nhận thử lại"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. Điều Chỉnh Tài Chính & Sai Lệch Phiếu Nhập (UC5.7, UC7.10) ─────────────
export function AdjustmentsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<FinancialAdjustment["type"]>("Thu bù");
  const [amount, setAmount] = useState<number>(100000);
  const [orderId, setOrderId] = useState("");
  const [importReceiptId, setImportReceiptId] = useState("");
  const [reason, setReason] = useState("");

  // State kết nối API thật: đối chiếu ngoại lệ thanh toán & điều chỉnh đối soát sau chốt
  const [pendingPayments, setPendingPayments] = useState<GiaoDichCanDoiChieuBackend[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const [reconcileTarget, setReconcileTarget] = useState<GiaoDichCanDoiChieuBackend | null>(null);
  const [reconcileOutcome, setReconcileOutcome] = useState<"HopLe_XacNhan" | "HopLe_HoanTienThua" | "TuChoi">("HopLe_XacNhan");
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileRefundAmount, setReconcileRefundAmount] = useState<number>(0);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileModalError, setReconcileModalError] = useState("");

  // Tra cứu biên bản đối soát gốc & phụ phí của đơn được chọn để điều chỉnh sau chốt (UC5.7)
  const [orderDoiSoat, setOrderDoiSoat] = useState<DoiSoatBackend | null>(null);
  const [orderSurchargeIds, setOrderSurchargeIds] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedSurchargeId, setSelectedSurchargeId] = useState("");
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [orderLookupError, setOrderLookupError] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);

  const loadPendingPayments = useCallback(async () => {
    if (!realApi) return;
    setPayLoading(true);
    setPayError("");
    try {
      const items = await paymentApi.layDanhSachCanDoiChieu();
      setPendingPayments(items ?? []);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thể tải danh sách giao dịch cần đối chiếu ngoại lệ.");
    } finally {
      setPayLoading(false);
    }
  }, [realApi]);

  useEffect(() => {
    void loadPendingPayments();
  }, [loadPendingPayments]);

  const resolveOrderBackendId = (rawOrderId: string): number | null => {
    if (!rawOrderId) return null;
    const matched = app.orders.find((o) => o.id === rawOrderId || o.displayCode === rawOrderId);
    if (matched?.backendId) return matched.backendId;
    const parsed = Number(rawOrderId.replace(/\D/g, ""));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  useEffect(() => {
    if (!realApi || !showModal || !orderId) {
      setOrderDoiSoat(null);
      setOrderSurchargeIds([]);
      setSelectedSurchargeId("");
      setOrderLookupError("");
      return;
    }
    const maDonThue = resolveOrderBackendId(orderId);
    if (!maDonThue) {
      setOrderLookupError("Không xác định được mã đơn thuê hợp lệ trên máy chủ.");
      return;
    }
    let cancelled = false;
    setOrderLookupLoading(true);
    setOrderLookupError("");
    void Promise.all([
      reconciliationApi.layTheoDon(maDonThue).catch(() => null),
      surchargeApi.layTheoDon(maDonThue).catch(() => []),
    ])
      .then(([ds, phis]) => {
        if (cancelled) return;
        setOrderDoiSoat(ds);
        if (!ds) {
          setOrderLookupError("Đơn hàng này chưa có biên bản đối soát gốc (UC5.4) để lập điều chỉnh sau chốt.");
        }
        const list = (phis ?? []).map((p) => ({
          id: p.maPhuPhi,
          label: `#${p.maPhuPhi} · ${p.loaiPhi} (${fmt(p.soTien)}) — ${p.trangThaiDuyet}`,
        }));
        setOrderSurchargeIds(list);
      })
      .finally(() => {
        if (!cancelled) setOrderLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [realApi, showModal, orderId]);

  const handleConfirmReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;
    if (!reconcileNote.trim()) {
      setReconcileModalError("Vui lòng nhập ghi chú kết luận đối chiếu giao dịch.");
      return;
    }
    if (reconcileOutcome === "HopLe_HoanTienThua" && reconcileRefundAmount <= 0) {
      setReconcileModalError("Số tiền hoàn lại cho khách phải lớn hơn 0.");
      return;
    }
    setReconcileBusy(true);
    setReconcileModalError("");
    setPaySuccess("");
    try {
      await paymentApi.doiChieuGiaoDich(reconcileTarget.maThanhToan, {
        ketLuan: reconcileOutcome,
        ghiChu: reconcileNote.trim(),
        soTienHoan: reconcileOutcome === "HopLe_HoanTienThua" ? Number(reconcileRefundAmount) : undefined,
      });
      await Promise.all([loadPendingPayments(), app.refreshOrders?.()]);
      setPaySuccess(`Đã hoàn tất đối chiếu giao dịch ${reconcileTarget.maYeuCau}.`);
      setReconcileTarget(null);
      setReconcileNote("");
    } catch (err) {
      setReconcileModalError(err instanceof Error ? err.message : "Không thể lưu kết quả đối chiếu giao dịch.");
    } finally {
      setReconcileBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (realApi) {
      setModalError("");
      if (!reason.trim()) {
        setModalError("Vui lòng nhập lý do điều chỉnh bù trừ.");
        return;
      }
      if (!orderId && importReceiptId) {
        setModalError("Sai lệch phiếu nhập kho (UC7.10) được kiểm soát và duyệt tại mục Điều chỉnh kho.");
        return;
      }
      if (!orderDoiSoat) {
        setModalError("Vui lòng chọn đơn thuê đã có biên bản đối soát gốc để lập điều chỉnh tài chính sau chốt (UC5.7).");
        return;
      }

      const signedAmount =
        type === "Hoàn trả" || type === "Bù trừ chiết khấu"
          ? -Math.abs(Number(amount || 0))
          : Math.abs(Number(amount || 0));

      setSubmitBusy(true);
      setPaySuccess("");
      try {
        let adjustedSurchargeIds: number[] | undefined;
        if (selectedSurchargeId) {
          const createdPhi = await surchargeApi.lapDieuChinhPhi(Number(selectedSurchargeId), {
            soTienDieuChinhCoDau: signedAmount,
            lyDo: reason.trim(),
          });
          adjustedSurchargeIds = [createdPhi.maPhuPhi];
        }
        await reconciliationApi.lapDieuChinh(orderDoiSoat.maDoiSoat, {
          lyDoDieuChinh: reason.trim(),
          danhSachMaPhuPhiDieuChinh: adjustedSurchargeIds,
          ghiChu: reason.trim(),
        });
        await Promise.all([loadPendingPayments(), app.refreshOrders?.()]);
        setPaySuccess(`Đã lập biên bản điều chỉnh sau chốt cho đơn #${orderDoiSoat.maDonHienThi || orderDoiSoat.maDonThue}.`);
        setShowModal(false);
        setReason("");
        setSelectedSurchargeId("");
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể lập chứng từ điều chỉnh tài chính trên máy chủ.");
      } finally {
        setSubmitBusy(false);
      }
      return;
    }

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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Đối chiếu giao dịch thanh toán ngoại lệ, lập chứng từ bù trừ sau đối soát đơn hoặc xử lý sai lệch nhập kho.
          </p>
        </div>
        <div className="flex gap-2">
          {realApi && (
            <button
              type="button"
              disabled={payLoading}
              onClick={() => void loadPendingPayments()}
              className="btn btn-secondary btn-md"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới đối chiếu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setModalError("");
              setShowModal(true);
            }}
            className="btn btn-primary btn-md"
          >
            + Lập chứng từ điều chỉnh
          </button>
        </div>
      </div>

      {payError && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="alert-circle" size={16} />
          <span>{payError}</span>
        </div>
      )}

      {paySuccess && (
        <div
          role="status"
          style={{
            background: "#DCFCE7",
            border: "1px solid #A7F3D0",
            color: "#15803D",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="check" size={16} />
          <span>{paySuccess}</span>
        </div>
      )}

      {/* Giao dịch thanh toán cần đối chiếu ngoại lệ (/api/v1/thanh-toan/can-doi-chieu) */}
      {realApi && (
        <div style={{ background: "#F8F6F0", borderRadius: 12, border: "1px solid #E2DDD1", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2DDD1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#11231B", margin: 0 }}>
                Giao dịch thanh toán cần đối chiếu ngoại lệ ({pendingPayments.length})
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: "2px 0 0" }}>
                Xử lý các giao dịch lệch số tiền, trùng thanh toán hoặc cần hoàn tiền thừa qua cổng thanh toán.
              </p>
            </div>
          </div>
          <div className="responsive-table">
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
              <thead>
                <tr style={{ background: "#F1ECE2", fontSize: "0.78rem", fontWeight: 700, color: "#11231B" }}>
                  {["Mã GD", "Đơn thuê", "Phương thức", "Số tiền", "Lý do cần đối chiếu", "Trạng thái", "Thời điểm", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.82rem" }}>
                      Đang tải danh sách giao dịch cần đối chiếu...
                    </td>
                  </tr>
                ) : pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#1B3F2F", fontSize: "0.82rem" }}>
                      Không có giao dịch thanh toán ngoại lệ nào đang chờ đối chiếu.
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((g, i) => (
                    <tr key={g.maThanhToan} style={{ borderTop: "1px solid #E2DDD1", background: i % 2 === 0 ? "white" : "#F8F6F0", fontSize: "0.8rem" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1B3F2F" }}>
                        {g.maYeuCau}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>#{g.maDonThue}</td>
                      <td style={{ padding: "10px 12px" }}>{g.phuongThuc}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#B45309" }}>
                        {fmt(g.tongSoTien)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{g.lyDoCanDoiChieu || "Chênh lệch đối soát cổng thanh toán"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                          {g.trangThaiDoiChieu || g.trangThai}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.74rem", color: "#6B7280" }}>
                        {new Date(g.thoiDiemTao).toLocaleString("vi-VN")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReconcileTarget(g);
                            setReconcileOutcome("HopLe_XacNhan");
                            setReconcileNote("");
                            setReconcileRefundAmount(Number(g.tongSoTien || 0));
                            setReconcileModalError("");
                          }}
                          style={{ background: "#E07A43", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Đối chiếu
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <div style={{ fontSize: "0.7rem", color: "#15803D" }}>Duyệt: {a.approvedBy || "Hệ thống"}</div>
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

      {/* Modal Đối chiếu giao dịch ngoại lệ */}
      {reconcileTarget && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Đối chiếu giao dịch {reconcileTarget.maYeuCau}</h3>
              <button type="button" onClick={() => setReconcileTarget(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleConfirmReconcilePayment(e)} className="modal-body flex flex-col gap-3">
              {reconcileModalError && (
                <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="alert-circle" size={15} />
                  <span>{reconcileModalError}</span>
                </div>
              )}
              <div style={{ background: "#F8F6F0", borderRadius: 8, padding: 10, border: "1px solid #E2DDD1", fontSize: "0.8rem" }}>
                <div>Đơn thuê: <strong>#{reconcileTarget.maDonThue}</strong> · Phương thức: <strong>{reconcileTarget.phuongThuc}</strong></div>
                <div>Số tiền giao dịch: <strong style={{ color: "#B45309" }}>{fmt(reconcileTarget.tongSoTien)}</strong></div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Kết luận đối chiếu</label>
                <select
                  value={reconcileOutcome}
                  onChange={(e) => setReconcileOutcome(e.target.value as any)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem", background: "white" }}
                >
                  <option value="HopLe_XacNhan">Hợp lệ — Xác nhận ghi nhận thanh toán</option>
                  <option value="HopLe_HoanTienThua">Hợp lệ — Cần hoàn tiền thừa cho khách</option>
                  <option value="TuChoi">Từ chối — Không ghi nhận giao dịch</option>
                </select>
              </div>
              {reconcileOutcome === "HopLe_HoanTienThua" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Số tiền cần hoàn (VNĐ)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={reconcileRefundAmount}
                    onChange={(e) => setReconcileRefundAmount(Number(e.target.value))}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem" }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>Ghi chú kết luận *</label>
                <textarea
                  required
                  rows={2}
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Ghi rõ căn cứ sao kê / mã giao dịch ngân hàng..."
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 9, fontSize: "0.84rem" }}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" disabled={reconcileBusy} onClick={() => setReconcileTarget(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={reconcileBusy} className="btn btn-primary btn-md" style={{ flex: 1 }}>
                  {reconcileBusy ? "Đang lưu..." : "Xác nhận đối chiếu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập chứng từ */}
      {showModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">Lập chứng từ điều chỉnh bù trừ</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="modal-body flex flex-col gap-4">
              {modalError && (
                <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="alert-circle" size={15} />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>Loại điều chỉnh</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.85rem", background: "white" }}
                >
                  <option value="Thu bù">Thu bù phụ phí sau hoàn tất</option>
                  <option value="Hoàn trả">Hoàn trả chênh lệch cọc</option>
                  <option value="Bù trừ chiết khấu">Bù trừ chiết khấu phát sinh</option>
                  <option value="Sai lệch kiểm kê">Sai lệch kiểm kê</option>
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
                      <option key={o.id} value={o.id}>{o.displayCode || o.id} ({o.customerName})</option>
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

              {realApi && orderId && (
                <div style={{ background: "#F8F6F0", borderRadius: 8, padding: 10, border: "1px solid #E2DDD1", fontSize: "0.78rem" }}>
                  {orderLookupLoading ? (
                    <span style={{ color: "#6B7280" }}>Đang kiểm tra biên bản đối soát &amp; phụ phí của đơn...</span>
                  ) : orderDoiSoat ? (
                    <div className="flex flex-col gap-2">
                      <div>
                        Biên bản đối soát gốc: <strong style={{ color: "#1B3F2F" }}>#{orderDoiSoat.maDoiSoat}</strong> ({orderDoiSoat.trangThai})
                      </div>
                      {orderSurchargeIds.length > 0 && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 3 }}>
                            Phụ phí gốc cần lập dòng điều chỉnh kèm (tùy chọn):
                          </label>
                          <select
                            value={selectedSurchargeId}
                            onChange={(e) => setSelectedSurchargeId(e.target.value)}
                            style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 8px", fontSize: "0.78rem", background: "white" }}
                          >
                            <option value="">Chỉ lập điều chỉnh trên biên bản đối soát</option>
                            {orderSurchargeIds.map((p) => (
                              <option key={p.id} value={String(p.id)}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#B91C1C" }}>{orderLookupError || "Đơn chưa có biên bản đối soát."}</span>
                  )}
                </div>
              )}

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
                <button type="button" disabled={submitBusy} onClick={() => setShowModal(false)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" disabled={submitBusy} className="btn btn-primary btn-md" style={{ flex: 1 }}>
                  {submitBusy ? "Đang lưu..." : "Lưu chứng từ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultAuditDates(): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    from: past.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function escapeCsvCell(raw: unknown): string {
  const s = String(raw ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ─── 6. Nhật Ký Hệ Thống - Audit Log (UC10.4 & UC10.4.2) ─────────────────────────
export function AuditLogTab({ app }: { app: ReturnType<typeof useApp> }) {
  const realApi = app.realApi || isRealApiEnabled();
  const defaultRange = getDefaultAuditDates();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // State đồng bộ API nhật ký thật (/api/v1/admin/nhat-ky)
  const [apiLogs, setApiLogs] = useState<AuditLogEntryWithRef[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  // State mở xem chứng từ liên quan từ nhật ký (UC10.4.2)
  const [inspectDoc, setInspectDoc] = useState<{
    type: "order" | "import" | "equipment" | "generic";
    id: string;
    title: string;
    data?: any;
  } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  // State xem chi tiết biến động sự kiện (UC10.4 Bước 4)
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntryWithRef | null>(null);

  const loadAuditLogs = useCallback(
    async (targetPage = page) => {
      if (!realApi) return;
      setLogsLoading(true);
      setLogsError("");
      try {
        const res = await auditApi.traCuu({
          tuKhoa: search.trim() || undefined,
          tuNgay: fromDate || undefined,
          denNgay: toDate || undefined,
          trang: targetPage,
          soMoiTrang: 50,
        });
        setApiLogs((res.items ?? []).map(mapNhatKyToAuditLog));
        setTotalLogs(Number(res.totalItems ?? (res.items ?? []).length));
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : "Không thể tải nhật ký thao tác hệ thống từ máy chủ.");
      } finally {
        setLogsLoading(false);
      }
    },
    [realApi, search, fromDate, toDate, page]
  );

  useEffect(() => {
    if (!realApi) return;
    const timer = window.setTimeout(() => {
      void loadAuditLogs(page);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [realApi, page, loadAuditLogs]);

  // Hàm kiểm tra ngày nằm trong khoảng lọc (dành cho dữ liệu mock)
  const isWithinRange = (dateStr?: string) => {
    if (!dateStr) return true;
    let d: Date;
    const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    } else {
      d = new Date(dateStr.replace(" ", "T"));
    }
    if (isNaN(d.getTime())) return true;
    const start = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const end = toDate ? new Date(toDate + "T23:59:59") : null;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const matchRoleValue = (entryRole: string, selected: string): boolean => {
    if (selected === "all") return true;
    const norm = entryRole.toLowerCase();
    if (selected === "Quản trị viên") return norm.includes("quản trị") || norm.includes("quantrivien") || norm.includes("admin");
    if (selected === "Nhân viên") return norm.includes("nhân viên") || norm.includes("nhanvien") || norm.includes("staff");
    if (selected === "Khách hàng") return norm.includes("khách") || norm.includes("khachhang") || norm.includes("customer");
    return entryRole === selected;
  };

  const sourceLogs: AuditLogEntryWithRef[] = realApi ? apiLogs : app.auditLogs;

  const filtered = sourceLogs.filter((l) => {
    const matchSearch =
      realApi ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase());
    const matchRole = matchRoleValue(l.role, roleFilter);
    const matchDate = realApi ? true : isWithinRange(l.timestamp);
    return matchSearch && matchRole && matchDate;
  });

  // Xử lý mở chứng từ liên quan (UC10.4.2)
  const handleOpenRelatedDoc = async (targetEntity: string, targetId: string, logEntry?: AuditLogEntryWithRef) => {
    setDocError("");
    setDocLoading(false);

    // 1. Kiểm tra nếu là Đơn hàng (DT-... hoặc backendId)
    const order = app.orders.find(
      (o) => o.id === targetId || o.displayCode === targetId || String(o.backendId ?? "") === targetId
    );
    if (order && (targetEntity.toLowerCase().includes("order") || targetEntity.toLowerCase().includes("don") || targetId.startsWith("DT-"))) {
      setInspectDoc({
        type: "order",
        id: order.displayCode || order.id,
        title: `Chứng từ đơn thuê — ${order.displayCode || order.id}`,
        data: order,
      });
      return;
    }

    // 2. Kiểm tra nếu là Phiếu nhập kho (PN-...)
    const receipt = app.importReceipts.find((r) => r.id === targetId || r.displayCode === targetId);
    if (receipt && (targetEntity.toLowerCase().includes("import") || targetEntity.toLowerCase().includes("phieunhap") || targetId.startsWith("PN-"))) {
      setInspectDoc({
        type: "import",
        id: receipt.displayCode || receipt.id,
        title: `Chứng từ phiếu nhập kho — ${receipt.displayCode || receipt.id}`,
        data: receipt,
      });
      return;
    }

    // 3. Kiểm tra nếu là Thiết bị
    const equip = app.equipment.find((e) => e.id === targetId || e.displayCode === targetId);
    if (equip) {
      setInspectDoc({
        type: "equipment",
        id: equip.displayCode || equip.id,
        title: `Hồ sơ vòng đời thiết bị — ${equip.displayCode || equip.id}`,
        data: equip,
      });
      return;
    }

    // 4. Nạp chứng từ gốc trực tiếp từ URL tham chiếu backend nếu có
    if (realApi && logEntry?.thamChieuUrl) {
      setInspectDoc({
        type: "generic",
        id: targetId,
        title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
        data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: null },
      });
      setDocLoading(true);
      try {
        const doc = await auditApi.xemChungTuThamChieu(logEntry.thamChieuUrl);
        setInspectDoc({
          type: "generic",
          id: targetId,
          title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
          data: { entity: targetEntity, id: targetId, thamChieuUrl: logEntry.thamChieuUrl, serverDoc: doc },
        });
      } catch (err) {
        setDocError(err instanceof Error ? err.message : "Không thể tải dữ liệu chứng từ tham chiếu từ máy chủ.");
      } finally {
        setDocLoading(false);
      }
      return;
    }

    // 5. Mở thông tin tham chiếu chung
    setInspectDoc({
      type: "generic",
      id: targetId,
      title: `Chứng từ tham chiếu: ${targetEntity} #${targetId}`,
      data: { entity: targetEntity, id: targetId },
    });
  };

  const handleExportCsv = () => {
    const header = ["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Loại đối tượng", "Mã đối tượng", "Chi tiết"];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...filtered.map((row) =>
        [row.timestamp, row.actor, row.role, row.action, row.targetEntity, row.targetId, row.detail]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Logs_Export_${toDate || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportNotice(`Đã xuất ${filtered.length} bản ghi nhật ký ra tệp CSV.`);
    window.setTimeout(() => setExportNotice(""), 4000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Nhật ký hệ thống — Audit Log (UC10.4 & UC10.4.2)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Truy vết toàn bộ thao tác quan trọng: phân quyền, đổi trạng thái đơn, sửa xóa chứng từ, đổi chính sách. Không cho phép sửa xóa qua giao diện tra cứu (Read-only).
          </p>
        </div>
        <div className="flex gap-2">
          {realApi && (
            <button
              type="button"
              disabled={logsLoading}
              onClick={() => void loadAuditLogs(page)}
              className="btn btn-secondary btn-sm"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary btn-sm"
          >
            <span className="icon-label"><Icon name="chart" size={14} /> Xuất file CSV</span>
          </button>
        </div>
      </div>

      {logsError && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="alert-circle" size={16} />
          <span>{logsError}</span>
        </div>
      )}

      {exportNotice && (
        <div role="status" style={{ background: "#DCFCE7", border: "1px solid #A7F3D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter kết hợp thời gian (UC10.4 Dòng sự kiện 2) */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành động, chứng từ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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

        <div className="flex items-center gap-1.5 bg-white border border-bone rounded-lg p-1.5 px-3 text-xs shadow-xs">
          <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>Thời gian:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "2px 5px", fontSize: "0.75rem" }}
          />
          <span>→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            style={{ border: "1px solid var(--color-bone)", borderRadius: 4, padding: "2px 5px", fontSize: "0.75rem" }}
          />
        </div>
      </div>

      {/* Bảng timeline audit */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Thời gian", "Người thực hiện", "Vai trò", "Hành động", "Đối tượng tác động (UC10.4.2)", "Chi tiết nội dung", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: "36px 0", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                  Đang tải nhật ký thao tác hệ thống...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "36px 0", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
                  Không tìm thấy nhật ký biến động phù hợp với bộ lọc đã chọn.
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => (
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
                      background: matchRoleValue(log.role, "Quản trị viên") ? "#FEF3C7" : matchRoleValue(log.role, "Nhân viên") ? "#E0E7FF" : "#F3F4F6",
                      color: matchRoleValue(log.role, "Quản trị viên") ? "#B45309" : matchRoleValue(log.role, "Nhân viên") ? "#3730A3" : "#4B5563"
                    }}>
                      {log.role}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-forest)" }}>
                    {log.action}
                  </td>
                  {/* Nhấn vào để mở chứng từ liên quan (UC10.4.2) */}
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                    <button
                      type="button"
                      onClick={() => void handleOpenRelatedDoc(log.targetEntity, log.targetId, log)}
                      style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                      title="Nhấn để mở chứng từ đối chiếu (UC10.4.2)"
                    >
                      <span style={{ color: "#6B7280" }}>{log.targetEntity}:</span>{" "}
                      <strong style={{ color: "var(--color-forest)", textDecoration: "underline" }}>
                        {log.targetId}
                      </strong>
                    </button>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#374151" }}>
                    {log.detail}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(log)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {realApi && totalLogs > 50 && (
          <div className="flex justify-between items-center p-3" style={{ borderTop: "1px solid var(--color-bone)", background: "var(--color-cream)", fontSize: "0.78rem" }}>
            <span>Trang {page} · Tổng {totalLogs} bản ghi</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || logsLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn btn-secondary btn-sm">
                Trước
              </button>
              <button type="button" disabled={page * 50 >= totalLogs || logsLoading} onClick={() => setPage((p) => p + 1)} className="btn btn-secondary btn-sm">
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL XEM CHI TIẾT SỰ KIỆN BIẾN ĐỘNG (UC10.4 Bước 4) ───────────── */}
      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 640, width: "100%", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  Chi tiết sự kiện truy vết (Audit Event #{selectedEvent.id})
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Thời điểm: {selectedEvent.timestamp}</div>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", fontSize: "0.85rem", maxHeight: "75vh" }}>
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Người thực hiện:</div>
                  <strong style={{ color: "var(--color-bark)" }}>{selectedEvent.actor}</strong>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-forest)", marginTop: 2 }}>Vai trò: {selectedEvent.role}</div>
                </div>

                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Đối tượng biến động:</div>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{selectedEvent.targetEntity}: {selectedEvent.targetId}</strong>
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const ev = selectedEvent;
                        setSelectedEvent(null);
                        void handleOpenRelatedDoc(ev.targetEntity, ev.targetId, ev);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                    >
                      Mở chứng từ đối chiếu (UC10.4.2)
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 700, marginBottom: 4 }}>HÀNH ĐỘNG & NỘI DUNG BIẾN ĐỘNG:</div>
                <div style={{ fontWeight: 600, color: "var(--color-forest)", marginBottom: 6 }}>{selectedEvent.action}</div>
                <div style={{ color: "#374151", lineHeight: 1.5 }}>{selectedEvent.detail}</div>
                {selectedEvent.lyDo && (
                  <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#4B5563" }}>
                    <strong>Lý do ghi nhận:</strong> {selectedEvent.lyDo}
                  </div>
                )}
              </div>

              {(selectedEvent.duLieuTruoc || selectedEvent.duLieuSau) && (
                <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {selectedEvent.duLieuTruoc && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 10, fontSize: "0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>Dữ liệu trước</div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)" }}>{selectedEvent.duLieuTruoc}</pre>
                    </div>
                  )}
                  {selectedEvent.duLieuSau && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 10, fontSize: "0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>Dữ liệu sau</div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)" }}>{selectedEvent.duLieuSau}</pre>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: "0.75rem", color: "#9CA3AF", fontStyle: "italic" }}>
                🔒 Nhật ký kiểm toán được niêm phong bất biến. Chức năng tra cứu chỉ hỗ trợ đọc (Read-only) và không cung cấp thao tác sửa/xóa theo chuẩn an toàn thông tin (UC10.4 Dòng phụ 4.2).
              </div>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM CHỨNG TỪ LIÊN QUAN TỪ NHẬT KÝ (UC10.4.2) ─────────────── */}
      {inspectDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 760, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-bark)" }}>
                  {inspectDoc.title}
                </h3>
                <div style={{ fontSize: "0.75rem", color: "var(--color-forest)", fontWeight: 600 }}>Chế độ tra cứu chứng từ gốc (Read-only — UC10.4.2)</div>
              </div>
              <button type="button" onClick={() => setInspectDoc(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1, fontSize: "0.82rem" }}>
              {inspectDoc.type === "order" && (
                <div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Khách hàng</div>
                      <strong>{inspectDoc.data.customerName}</strong>
                      <div style={{ color: "#6B7280" }}>{inspectDoc.data.customerPhone}</div>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Trạng thái</div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-forest)" }}>{inspectDoc.data.status}</span>
                      <div style={{ color: "#6B7280" }}>Tạo lúc: {inspectDoc.data.createdAt}</div>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Tổng tiền thanh toán</div>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "1.1rem" }}>{fmt(inspectDoc.data.rental - inspectDoc.data.discount + inspectDoc.data.depositTotal)}</strong>
                      <div style={{ color: "#6B7280" }}>Cọc: {fmt(inspectDoc.data.depositTotal)}</div>
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Danh sách thiết bị thuê:</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Tên sản phẩm</th>
                        <th style={{ padding: "6px 8px" }}>Số lượng</th>
                        <th style={{ padding: "6px 8px" }}>Số ngày</th>
                        <th style={{ padding: "6px 8px" }}>Đơn giá</th>
                        <th style={{ padding: "6px 8px" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectDoc.data.items.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{it.productName}</td>
                          <td style={{ padding: "6px 8px" }}>{it.qty}</td>
                          <td style={{ padding: "6px 8px" }}>{it.days} ngày</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{fmt(it.pricePerDay)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(it.pricePerDay * it.qty * it.days)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inspectDoc.type === "import" && (
                <div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Nhà cung cấp</div>
                      <strong>{inspectDoc.data.supplierName} ({inspectDoc.data.supplierId})</strong>
                    </div>
                    <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Trạng thái & Ngày xác nhận</div>
                      <strong style={{ color: "var(--color-forest)" }}>{inspectDoc.data.status}</strong> — {inspectDoc.data.confirmedAt || inspectDoc.data.createdAt}
                    </div>
                  </div>

                  <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Vật phẩm nhập kho:</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Sản phẩm</th>
                        <th style={{ padding: "6px 8px" }}>Số lượng</th>
                        <th style={{ padding: "6px 8px" }}>Đơn giá</th>
                        <th style={{ padding: "6px 8px" }}>Thành tiền</th>
                        <th style={{ padding: "6px 8px" }}>Mã sinh ra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectDoc.data.lines.map((l: any, idx: number) => (
                        <tr key={idx} style={{ borderTop: "1px solid var(--color-bone)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{l.productNameSnapshot || l.productId}</td>
                          <td style={{ padding: "6px 8px" }}>{l.quantity}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{fmt(l.unitPrice)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmt(l.quantity * l.unitPrice)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", color: "var(--color-amber)" }}>{l.equipmentCodes.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inspectDoc.type === "equipment" && (
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Mã định danh thiết bị:</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", color: "var(--color-forest)" }}>{inspectDoc.data.id}</strong>
                  <div style={{ marginTop: 8 }}>Tình trạng hiện tại: <strong>{inspectDoc.data.condition}</strong> · Trạng thái kho: <strong>{inspectDoc.data.equipmentStatus}</strong></div>
                  <div style={{ marginTop: 4 }}>Số lượt cho thuê lũy kế: <strong>{inspectDoc.data.rentCount} lượt</strong> · Ngày nhập kho: {inspectDoc.data.importDate}</div>
                </div>
              )}

              {inspectDoc.type === "generic" && (
                <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 14 }}>
                  <div>Chứng từ tham chiếu: <strong>{inspectDoc.data.entity}</strong></div>
                  <div>Mã định danh: <strong style={{ fontFamily: "var(--font-mono)" }}>{inspectDoc.data.id}</strong></div>
                  {inspectDoc.data.thamChieuUrl && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 4 }}>
                      Đường dẫn máy chủ: <code style={{ fontFamily: "var(--font-mono)" }}>{inspectDoc.data.thamChieuUrl}</code>
                    </div>
                  )}
                  {docLoading && (
                    <div style={{ marginTop: 10, color: "#6B7280" }}>Đang tải dữ liệu chứng từ gốc từ máy chủ...</div>
                  )}
                  {docError && (
                    <div role="alert" style={{ marginTop: 10, color: "#B91C1C" }}>{docError}</div>
                  )}
                  {inspectDoc.data.serverDoc ? (
                    <pre
                      style={{
                        marginTop: 10,
                        background: "white",
                        border: "1px solid var(--color-bone)",
                        borderRadius: 8,
                        padding: 12,
                        maxHeight: 280,
                        overflow: "auto",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {JSON.stringify(inspectDoc.data.serverDoc, null, 2)}
                    </pre>
                  ) : (
                    !docLoading && (
                      <div style={{ marginTop: 8, color: "#6B7280" }}>Dữ liệu gốc được lưu trữ trong cơ sở dữ liệu hệ thống.</div>
                    )
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-bone)", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setInspectDoc(null)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
