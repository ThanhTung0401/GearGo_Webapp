import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { reviewApi } from "../../../services/api/reviewApi";
import { policyApi, type KiemTraChinhSachBackend } from "../../../services/api/policyApi";
import { notificationApi, type ThongBaoGuiLoiBackend } from "../../../services/api/notificationApi";
import { paymentApi, type GiaoDichCanDoiChieuBackend } from "../../../services/api/paymentApi";
import { reconciliationApi, type DoiSoatBackend } from "../../../services/api/reconciliationApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { auditApi } from "../../../services/api/auditApi";
import {
  mapDanhGiaToReview,
  mapNhatKyToAuditLog,
  type AuditLogEntryWithRef,
} from "../../../services/mappers/reviewNotifAuditMapper";
import { buildTaoChinhSachRequestFromConfig } from "../../../services/mappers/policyPromoMapper";
import { fmt, statusColors, type CustomerAccount, type Review, type RentalPolicyConfig, type PolicyVersion, type FinancialAdjustment, type AppNotification } from "../../../store";
import Icon from "../../../components/Icon";
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
