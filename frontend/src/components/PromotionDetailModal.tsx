import { useEffect, useState } from "react";
import { type useApp } from "../App";
import { promotionApi, type SuDungKhuyenMaiBackend } from "../services/api";
import { fmt, formatBackendEnum, formatDateTimeVi, type Promotion } from "../store";
import { Can } from "../features/permissions/PermissionsContext";
import { Permissions } from "../constants/permissions";
import Pagination from "./ui/Pagination";
import { usePagination } from "../hooks/usePagination";

interface Props {
  promotion: Promotion;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
}

/**
 * UC8.4: Modal Tra cứu Chi tiết Khuyến mãi & Thống kê đơn áp dụng
 */
export default function PromotionDetailModal({ promotion, app, onClose, onEdit, onToggleStatus }: Props) {
  const [usageReport, setUsageReport] = useState<SuDungKhuyenMaiBackend | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    if (!app.realApi) return;
    const kmId = Number(promotion.id);
    if (!Number.isFinite(kmId)) return;
    let cancelled = false;
    setLoadingUsage(true);
    void promotionApi
      .layTinhHinhSuDung(kmId)
      .then((res) => {
        if (!cancelled) setUsageReport(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingUsage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [app.realApi, promotion.id]);

  // Lọc các bản ghi sử dụng mã khuyến mãi này
  const usages = app.promotionUsages.filter((u) => u.promotionId === promotion.id);

  // Dữ liệu hiển thị ưu tiên backend nếu có
  const appliedRows = app.realApi && usageReport
    ? usageReport.chiTietSuDung.map((ct) => {
        // [PROMO-06]: lấy tiền thuê gốc từ Backend (tienThueDon mới bổ sung ở ChiTietSuDungItem);
        // fallback tra từ app.orders nếu đơn nằm trong 50 đơn đầu.
        const tienThueDon = Number((ct as { tienThueDon?: number | null }).tienThueDon ?? NaN);
        const fallback = app.orders.find((o) => o.displayCode === ct.maDonHienThi || (o as { backendId?: number }).backendId === ct.maDonThue)?.rental ?? 0;
        return {
          key: String(ct.maLuotSuDung),
          displayId: ct.maDonHienThi || String(ct.maDonThue),
          customerName: ct.tenKhachHang || `KH#${ct.maKhachHang}`,
          date: ct.thoiDiemSuDung || ct.thoiDiemGiuLuot,
          rental: Number.isFinite(tienThueDon) ? tienThueDon : fallback,
          discount: Number(ct.tienGiamDon ?? 0),
          status: ct.trangThaiDonThue || ct.trangThaiLuot,
        };
      })
    : app.orders
        .filter((order) => {
          const hasUsage = usages.some((u) => u.orderId === order.id && u.status === "used");
          return hasUsage || (order as any).promoCode === promotion.code;
        })
        .map((order) => {
          const usage = usages.find((u) => u.orderId === order.id);
          return {
            key: order.id,
            displayId: order.displayCode || order.id,
            customerName: order.customerName,
            date: order.createdAt,
            rental: order.rental ?? (order as any).rentalFee ?? 0,
            discount: usage?.discountAmount || order.discount || (order as any).discountAmount || 0,
            status: order.status,
          };
        });

  const usedCountDisplay = app.realApi && usageReport ? usageReport.tongLuotDaDung : promotion.usedCount;
  const totalDiscountGiven = app.realApi && usageReport
    ? Number(usageReport.tongTienGiamDaDung ?? 0)
    : usages
        .filter((u) => u.status === "used")
        .reduce((sum, u) => sum + (u.discountAmount || 0), 0);

  const totalOrderRevenue = appliedRows.reduce((sum, r) => sum + r.rental, 0);

  const isExpired = new Date(promotion.endsAt).getTime() < Date.now();
  const usagePercent = promotion.totalUsageLimit
    ? Math.min(100, Math.round((usedCountDisplay / promotion.totalUsageLimit) * 100))
    : null;
  const rowsPaging = usePagination(appliedRows, 6);

  return (
    /* zIndex: 250 (< .modal-overlay 300) để modal xác nhận tạm dừng (UC8.5) hiện nổi lên trên */
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "grid", placeItems: "center", padding: 20 }}>
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
                {usedCountDisplay} <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#6B7280" }}>/ {promotion.totalUsageLimit ?? "Không giới hạn"}</span>
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
                {app.realApi && usageReport
                  ? `Đã dùng ${usageReport.tongLuotDaDung} · Đang giữ ${usageReport.tongLuotDangGiuConHan}`
                  : `Từ ${usages.filter((u) => u.status === "used").length} giao dịch thành công`}
              </div>
            </div>

            <div style={{ background: "#EFF6FF", padding: "12px 14px", borderRadius: 10, border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: "0.72rem", color: "#1E40AF", marginBottom: 2 }}>
                {app.realApi && usageReport ? "Lượt giải phóng / hoàn lại" : "Doanh thu mang lại"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "#1D4ED8" }}>
                {app.realApi && usageReport ? usageReport.tongLuotDaGiaiPhong : fmt(totalOrderRevenue)}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#1E40AF", marginTop: 4 }}>
                {app.realApi && usageReport ? "Lượt giữ chỗ hết hạn/đơn hủy" : "Tổng giá trị thuê của các đơn"}
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
                Danh sách đơn hàng áp dụng ({appliedRows.length})
              </span>
              <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>
                {loadingUsage ? "Đang tải thống kê..." : "Bảo toàn mức giảm chốt ban đầu (UC8.3.1)"}
              </span>
            </div>

            {appliedRows.length > 0 ? (
              <div style={{ border: "1px solid var(--color-bone)", borderRadius: 10, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-parchment)", color: "#4B5563", textAlign: "left" }}>
                      {["Mã đơn", "Khách hàng", "Ngày đặt", "Tiền thuê gốc", "Tiền giảm", "Trạng thái"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowsPaging.pagedItems.map((row, idx) => (
                      <tr key={row.key} style={{ borderTop: "1px solid var(--color-bone)", background: idx % 2 === 0 ? "white" : "var(--color-cream)" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>
                          {row.displayId}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.customerName}</td>
                        <td style={{ padding: "8px 10px", color: "#6B7280", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{formatDateTimeVi(row.date)}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>
                          {row.rental > 0 ? fmt(row.rental) : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#15803D" }}>
                          -{fmt(row.discount)}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 600, background: "#F3F4F6", color: "#4B5563" }}>
                            {formatBackendEnum(row.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 pb-2">
                  <Pagination
                    page={rowsPaging.page}
                    totalPages={rowsPaging.totalPages}
                    totalItems={rowsPaging.totalItems}
                    startIndex={rowsPaging.startIndex}
                    endIndex={rowsPaging.endIndex}
                    onPageChange={rowsPaging.setPage}
                    itemLabel="đơn áp dụng"
                  />
                </div>
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
              <Can perm={Permissions.KhuyenMai_Quan}>
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
              </Can>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Can perm={Permissions.KhuyenMai_Quan}>
                <button
                  type="button"
                  onClick={onEdit}
                  style={{ background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}
                >
                  ✏️ Chỉnh sửa (UC8.3)
                </button>
              </Can>
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
