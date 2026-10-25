import React from "react";
import { type useApp } from "../App";
import { fmt, type Promotion } from "../store";

interface Props {
  promotion: Promotion;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
}

/**
 * UC8.4: Modal Tra cứu Chi tiết Khuyến mãi & Thống kê đơn áp dụng
 * - Thống kê số lượt dùng, tỷ lệ lấp đầy, tổng tiền giảm và tổng doanh thu mang lại.
 * - Hiển thị danh sách các đơn hàng thực tế đã áp dụng mã ưu đãi này (bảo toàn lịch sử theo UC8.3.1).
 */
export default function PromotionDetailModal({ promotion, app, onClose, onEdit, onToggleStatus }: Props) {
  // Lọc các bản ghi sử dụng mã khuyến mãi này
  const usages = app.promotionUsages.filter((u) => u.promotionId === promotion.id);
  
  // Lọc các đơn hàng có liên quan
  const appliedOrders = app.orders.filter((order) => {
    // Có thể gắn qua usage hoặc promoCode lưu trên order
    const hasUsage = usages.some((u) => u.orderId === order.id && u.status === "used");
    return hasUsage || (order as any).promoCode === promotion.code;
  });

  const totalDiscountGiven = usages
    .filter((u) => u.status === "used")
    .reduce((sum, u) => sum + (u.discountAmount || 0), 0);

  const totalOrderRevenue = appliedOrders.reduce((sum, o) => sum + (o.rental ?? (o as any).rentalFee ?? 0), 0);

  const isExpired = new Date(promotion.endsAt).getTime() < Date.now();
  const usagePercent = promotion.totalUsageLimit
    ? Math.min(100, Math.round((promotion.usedCount / promotion.totalUsageLimit) * 100))
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, maxWidth: 680, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        {/* Header */}
        <div style={{ background: "var(--color-parchment)", padding: "18px 24px", borderBottom: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: "var(--color-forest)", letterSpacing: "0.08em" }}>
                {promotion.code}
              </span>
              <span style={{
                background: promotion.status === "active" && !isExpired ? "#DCFCE7" : isExpired ? "#F3F4F6" : "#FEF3C7",
                color: promotion.status === "active" && !isExpired ? "#15803D" : isExpired ? "#6B7280" : "#B45309",
                padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700
              }}>
                {isExpired ? "Đã hết hạn" : promotion.status === "active" ? "Đang hoạt động" : "Tạm dừng"}
              </span>
              <span style={{ background: "white", border: "1px solid var(--color-bone)", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, color: "var(--color-amber)" }}>
                {promotion.discountType === "percentage" ? `Giảm ${promotion.discountValue}%` : `Giảm ${fmt(promotion.discountValue)}`}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--color-bark)" }}>
              {promotion.name}
            </div>
            {promotion.stopReason && (
              <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: 2 }}>
                Lý do tạm dừng: <em>{promotion.stopReason}</em>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer", color: "#6B7280" }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* 3 Thẻ KPI Thống kê (UC8.4) */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={{ background: "var(--color-cream)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 2 }}>Lượt sử dụng</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "var(--color-forest)" }}>
                {promotion.usedCount} <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#6B7280" }}>/ {promotion.totalUsageLimit ?? "Không giới hạn"}</span>
              </div>
              {usagePercent !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: "var(--color-bone)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "var(--color-forest)", width: `${usagePercent}%` }} />
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#6B7280", marginTop: 2, textAlign: "right" }}>Đạt {usagePercent}%</div>
                </div>
              )}
            </div>

            <div style={{ background: "#F0FDF4", padding: "12px 14px", borderRadius: 10, border: "1px solid #BBF7D0" }}>
              <div style={{ fontSize: "0.72rem", color: "#166534", marginBottom: 2 }}>Tổng tiền đã giảm</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "#15803D" }}>
                {fmt(totalDiscountGiven)}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#166534", marginTop: 4 }}>
                Từ {usages.filter((u) => u.status === "used").length} giao dịch thành công
              </div>
            </div>

            <div style={{ background: "#EFF6FF", padding: "12px 14px", borderRadius: 10, border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: "0.72rem", color: "#1E40AF", marginBottom: 2 }}>Doanh thu mang lại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "#1D4ED8" }}>
                {fmt(totalOrderRevenue)}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#1E40AF", marginTop: 4 }}>
                Tổng giá trị thuê của các đơn
              </div>
            </div>
          </div>

          {/* Chi tiết điều kiện áp dụng */}
          <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 14 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
              Điều kiện & Phạm vi áp dụng:
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr", fontSize: "0.78rem" }}>
              <div><span style={{ color: "#6B7280" }}>Tiền thuê tối thiểu:</span> <strong>{fmt(promotion.minimumRental)}</strong></div>
              <div><span style={{ color: "#6B7280" }}>Giảm tối đa:</span> <strong>{promotion.maxDiscount ? fmt(promotion.maxDiscount) : "Không giới hạn"}</strong></div>
              <div><span style={{ color: "#6B7280" }}>Bắt đầu:</span> <strong>{new Date(promotion.startsAt).toLocaleString("vi-VN")}</strong></div>
              <div><span style={{ color: "#6B7280" }}>Kết thúc:</span> <strong>{new Date(promotion.endsAt).toLocaleString("vi-VN")}</strong></div>
              <div><span style={{ color: "#6B7280" }}>Giới hạn mỗi khách:</span> <strong>{promotion.perCustomerLimit ?? 1} lượt/khách</strong></div>
              <div>
                <span style={{ color: "#6B7280" }}>Phạm vi:</span>{" "}
                <strong>
                  {promotion.scope === "all"
                    ? "Toàn bộ sản phẩm"
                    : promotion.scope === "categories"
                    ? `${promotion.categoryIds.length} danh mục`
                    : `${promotion.productIds.length} sản phẩm`}
                </strong>
              </div>
            </div>
          </div>

          {/* Danh sách các đơn hàng đã áp dụng (UC8.4 & UC8.3.1) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)" }}>
                Danh sách đơn hàng áp dụng ({appliedOrders.length})
              </span>
              <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                Bảo toàn mức giảm chốt ban đầu (UC8.3.1)
              </span>
            </div>

            {appliedOrders.length > 0 ? (
              <div style={{ border: "1px solid var(--color-bone)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", color: "#4B5563", textAlign: "left" }}>
                      {["Mã đơn", "Khách hàng", "Ngày đặt", "Tiền thuê gốc", "Tiền giảm", "Trạng thái"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appliedOrders.map((order, idx) => {
                      const usage = usages.find((u) => u.orderId === order.id);
                      const discount = usage?.discountAmount || order.discount || (order as any).discountAmount || 0;
                      return (
                        <tr key={order.id} style={{ borderTop: "1px solid var(--color-bone)", background: idx % 2 === 0 ? "white" : "var(--color-cream)" }}>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>
                            {order.id}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{order.customerName}</td>
                          <td style={{ padding: "8px 10px", color: "#6B7280", fontSize: "0.72rem" }}>{order.createdAt}</td>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{fmt(order.rental ?? (order as any).rentalFee)}</td>
                          <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#15803D" }}>
                            -{fmt(discount)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 600, background: "#F3F4F6", color: "#4B5563" }}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: "var(--color-cream)", borderRadius: 8, padding: 18, textAlign: "center", color: "#9CA3AF", fontSize: "0.8rem", border: "1px dashed var(--color-bone)" }}>
                Chưa có đơn hàng nào áp dụng mã khuyến mãi này.
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--color-bone)", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {onToggleStatus && !isExpired && (
              <button
                type="button"
                onClick={onToggleStatus}
                style={{
                  background: promotion.status === "active" ? "#FEF3C7" : "#DCFCE7",
                  color: promotion.status === "active" ? "#B45309" : "#15803D",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {promotion.status === "active" ? "⏸ Tạm dừng chương trình (UC8.5)" : "▶ Kích hoạt lại"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{ background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}
              >
                ✏️ Chỉnh sửa (UC8.3)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
