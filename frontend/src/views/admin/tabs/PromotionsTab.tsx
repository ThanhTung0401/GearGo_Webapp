import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { catalogApi, type HinhAnhSanPhamBackend } from "../../../services/api/catalogApi";
import { equipmentApi } from "../../../services/api/equipmentApi";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { orderApi, type XemTruocHuyBackend } from "../../../services/api/orderApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";
import { supplierApi } from "../../../services/api/supplierApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";
import { promotionApi } from "../../../services/api/promotionApi";
import { surchargeApi } from "../../../services/api/surchargeApi";
import { reportApi, type BaoCaoVanHanhBackend } from "../../../services/api/reportApi";
import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import {
  fmt, statusColors, type Category, type Product, type Supplier, type Promotion, type ImportReceipt,
  type StaffAccount, type StockAdjustmentReceipt, type StockAdjustmentLine, type EquipmentStatus, type Order,
  type Equipment, type Surcharge
} from "../../../store";
import Icon from "../../../components/Icon";
import { FormModal, FormActions, fieldStyle, labelStyle } from "../forms/FormModal";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
import { PromotionForm } from "../forms/PromotionForm";

export function PromotionsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [action, setAction] = useState<Promotion | "new" | null>(null);
  const [promoSearch, setPromoSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "percentage" | "fixed">("all");
  const [selectedPromoDetail, setSelectedPromoDetail] = useState<Promotion | null>(null);
  const [promoActionError, setPromoActionError] = useState("");
  const [togglingPromoId, setTogglingPromoId] = useState<string | null>(null);

  // Modal tạm dừng chương trình (UC8.5)
  const [stoppingPromo, setStoppingPromo] = useState<Promotion | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopError, setStopError] = useState("");
  const [stopLoading, setStopLoading] = useState(false);

  const now = new Date();

  // Lọc danh sách khuyến mãi đa chiều (UC8.4)
  const filteredPromotions = app.promotions.filter((p) => {
    const isExpired = new Date(p.endsAt) < now;
    if (statusFilter === "active" && (p.status !== "active" || isExpired)) return false;
    if (statusFilter === "inactive" && (p.status !== "inactive" || isExpired)) return false;
    if (statusFilter === "expired" && !isExpired) return false;
    if (typeFilter !== "all" && p.discountType !== typeFilter) return false;
    if (promoSearch.trim()) {
      const q = promoSearch.toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingPromo) return;
    if (!stopReason.trim()) {
      return setStopError("Bắt buộc phải nhập lý do tạm dừng chương trình (UC8.5)!");
    }
    if (isRealApi) {
      const promoId = Number(stoppingPromo.id);
      if (Number.isNaN(promoId)) return setStopError("ID khuyến mãi không hợp lệ.");
      setStopLoading(true);
      try {
        await promotionApi.tamAn(promoId, stopReason.trim());
        await app.refreshPromotions?.();
        setStoppingPromo(null);
        setStopReason("");
        setStopError("");
      } catch (err) {
        setStopError(err instanceof Error ? err.message : "Không thể tạm dừng khuyến mãi trên máy chủ.");
      } finally {
        setStopLoading(false);
      }
      return;
    }

    const res = app.pausePromotion(stoppingPromo.id, stopReason.trim());
    if (!res.ok) {
      return setStopError(res.message);
    }
    setStoppingPromo(null);
    setStopReason("");
    setStopError("");
  };

  const handleToggleStatus = async (p: Promotion) => {
    setPromoActionError("");
    const isExpired = new Date(p.endsAt) < now;
    if (p.status === "active") {
      // Mở modal nhập lý do tạm dừng
      setStoppingPromo(p);
      setStopReason("");
      setStopError("");
    } else {
      // Kích hoạt lại
      if (isExpired) {
        setPromoActionError("Chương trình đã quá hạn thời gian hiệu lực, không thể kích hoạt lại (UC8.5)!");
        return;
      }
      if (isRealApi) {
        const promoId = Number(p.id);
        if (Number.isNaN(promoId)) {
          setPromoActionError("ID khuyến mãi không hợp lệ.");
          return;
        }
        setTogglingPromoId(p.id);
        try {
          await promotionApi.hienThi(promoId, "Kích hoạt lại từ quản trị khuyến mãi");
          await app.refreshPromotions?.();
        } catch (err) {
          setPromoActionError(err instanceof Error ? err.message : "Không thể kích hoạt khuyến mãi.");
        } finally {
          setTogglingPromoId(null);
        }
        return;
      }
      const res = app.resumePromotion(p.id);
      if (!res.ok) setPromoActionError(res.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>Quản lý chính sách khuyến mãi (UC8.2 - UC8.5)</h2>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>
            Kiểm soát mã giảm giá, giới hạn ngân sách, theo dõi doanh thu và tra cứu đơn áp dụng thực tế.
          </p>
        </div>
        <button
          onClick={() => setAction("new")}
          style={{ background: "var(--color-forest)", color: "white", padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          <span>+</span> Tạo mã giảm mới (UC8.2)
        </button>
      </div>
      {promoActionError && (
        <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: "0.82rem" }}>
          {promoActionError}
        </div>
      )}

      {/* Bộ lọc và thanh tra cứu (UC8.4) */}
      <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--color-bone)", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            value={promoSearch}
            onChange={(e) => setPromoSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm theo mã code hoặc tên chương trình..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", background: "white" }}
          >
            <option value="all">Tất cả ({app.promotions.length})</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm dừng</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>Loại giảm:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", background: "white" }}
          >
            <option value="all">Tất cả hình thức</option>
            <option value="percentage">Phần trăm (%)</option>
            <option value="fixed">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
      </div>

      {/* Danh sách khuyến mãi */}
      {filteredPromotions.length === 0 ? (
        <div style={{ background: "white", borderRadius: 10, padding: 36, textAlign: "center", border: "1px dashed var(--color-bone)" }}>
          <p style={{ color: "#6B7280", margin: 0 }}>Không tìm thấy chương trình khuyến mãi nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPromotions.map((p) => {
            const isExpired = new Date(p.endsAt) < now;
            const usagePercent = p.totalUsageLimit ? Math.min(100, (p.usedCount / p.totalUsageLimit) * 100) : 0;
            const isFull = p.totalUsageLimit !== null && p.usedCount >= p.totalUsageLimit;

            return (
              <div
                key={p.id}
                style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  border: isExpired ? "1px dashed #D1D5DB" : "1px solid var(--color-bone)",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  opacity: isExpired || p.status === "inactive" ? 0.85 : 1,
                }}
              >
                {/* Badge mã code */}
                <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "12px 16px", textAlign: "center", minWidth: 125, border: "1px solid var(--color-bone)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--color-forest)", letterSpacing: "0.06em", fontSize: "1rem" }}>
                    {p.code}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#D97706", fontWeight: 700, marginTop: 2 }}>
                    {p.discountType === "percentage" ? `Giảm ${p.discountValue}%` : `Giảm ${fmt(p.discountValue)}`}
                  </div>
                  {p.maxDiscount && (
                    <div style={{ fontSize: "0.68rem", color: "#6B7280" }}>
                      Tối đa {fmt(p.maxDiscount)}
                    </div>
                  )}
                </div>

                {/* Thông tin chương trình */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>{p.name}</strong>
                    {isExpired ? (
                      <span style={{ background: "#FEE2E2", color: "#B91C1C", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Đã hết hạn</span>
                    ) : p.status === "inactive" ? (
                      <span style={{ background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Tạm dừng</span>
                    ) : isFull ? (
                      <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Hết lượt</span>
                    ) : (
                      <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>Đang hiệu lực</span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#4B5563", marginBottom: 4 }}>
                    Đơn tối thiểu: <strong>{fmt(p.minimumRental)}</strong> · Phạm vi:{" "}
                    <strong>{p.scope === "all" ? "Tất cả thiết bị" : p.scope === "products" ? `Theo sản phẩm (${p.productIds.length})` : `Theo danh mục (${p.categoryIds.length})`}</strong>
                  </div>

                  <div style={{ fontSize: "0.74rem", color: "#6B7280" }}>
                    Hiệu lực: {new Date(p.startsAt).toLocaleDateString("vi-VN")} → {new Date(p.endsAt).toLocaleDateString("vi-VN")} · Đã dùng: <strong>{p.usedCount}</strong> / {p.totalUsageLimit ?? "∞"} lượt
                  </div>

                  {/* Thanh tiến độ sử dụng lượt */}
                  {p.totalUsageLimit && (
                    <div style={{ background: "var(--color-bone)", borderRadius: "4px", height: "6px", marginTop: "6px", overflow: "hidden", maxWidth: 300 }}>
                      <div style={{ height: "100%", background: usagePercent >= 90 ? "#EF4444" : "var(--color-forest)", width: `${usagePercent}%`, transition: "width 0.3s ease" }} />
                    </div>
                  )}

                  {/* Lý do tạm dừng nếu có */}
                  {p.status === "inactive" && p.stopReason && (
                    <div style={{ marginTop: 6, fontSize: "0.74rem", color: "#92400E", background: "#FEF3C7", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                      ⚠️ Lý do tạm dừng: {p.stopReason}
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", minWidth: 150 }}>
                  {/* Nút xem chi tiết & đơn áp dụng (UC8.4) */}
                  <button
                    onClick={() => setSelectedPromoDetail(p)}
                    style={{
                      background: "white",
                      border: "1px solid var(--color-forest)",
                      color: "var(--color-forest)",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    👁 Xem đơn áp dụng (UC8.4)
                  </button>

                  <div style={{ display: "flex", gap: 6 }}>
                    {/* Nút sửa */}
                    <button
                      onClick={() => setAction(p)}
                      style={{
                        flex: 1,
                        border: "1px solid var(--color-bone)",
                        borderRadius: 6,
                        background: "white",
                        padding: "5px 8px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Sửa (UC8.3)
                    </button>

                    {/* Nút tạm dừng / kích hoạt lại (UC8.5) */}
                    <button
                      disabled={togglingPromoId === p.id}
                      onClick={() => handleToggleStatus(p)}
                      style={{
                        flex: 1,
                        border: "1px solid",
                        borderColor: p.status === "active" ? "#F59E0B" : "#10B981",
                        background: p.status === "active" ? "#FFFBEB" : "#ECFDF5",
                        color: p.status === "active" ? "#B45309" : "#047857",
                        borderRadius: 6,
                        padding: "5px 8px",
                        cursor: togglingPromoId === p.id ? "wait" : "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {togglingPromoId === p.id ? "..." : p.status === "active" ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form tạo/sửa khuyến mãi (UC8.2 & UC8.3) */}
      {action && (
        <PromotionForm
          app={app}
          promotion={action === "new" ? undefined : action}
          onClose={() => setAction(null)}
        />
      )}

      {/* Modal tra cứu chi tiết và thống kê doanh thu / đơn hàng áp dụng (UC8.4) */}
      {selectedPromoDetail && (
        <PromotionDetailModal
          promotion={selectedPromoDetail}
          app={app}
          onClose={() => setSelectedPromoDetail(null)}
          onEdit={() => {
            setAction(selectedPromoDetail);
            setSelectedPromoDetail(null);
          }}
          onToggleStatus={() => {
            handleToggleStatus(selectedPromoDetail);
            // Cập nhật lại modal detail
            const updated = app.promotions.find((item) => item.id === selectedPromoDetail.id);
            if (updated) setSelectedPromoDetail(updated);
          }}
        />
      )}

      {/* Modal xác nhận lý do tạm dừng chương trình (UC8.5) */}
      {stoppingPromo && (
        <FormModal
          title={`Tạm dừng khuyến mãi: ${stoppingPromo.code}`}
          description="Bắt buộc nhập lý do tạm dừng để ghi nhận Audit Log theo đúng quy tắc UC8.5."
          onClose={() => setStoppingPromo(null)}
        >
          <form onSubmit={handlePauseSubmit} className="grid gap-4 mt-4">
            <label style={labelStyle}>
              Lý do tạm dừng chương trình (Bắt buộc)
              <textarea
                rows={3}
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="VD: Hết ngân sách chiến dịch tháng này / Phát hiện gian lận lạm dụng mã / Tạm dừng theo chỉ đạo của ban giám đốc..."
                style={fieldStyle}
              />
            </label>
            {stopError && (
              <div role="alert" style={{ color: "#B91C1C", background: "#FEE2E2", padding: 10, borderRadius: 8, fontSize: "0.85rem" }}>
                {stopError}
              </div>
            )}
            <div className="modal-footer mt-2" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                disabled={stopLoading}
                onClick={() => setStoppingPromo(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-bone)", background: "white", cursor: "pointer" }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={stopLoading}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#D97706", color: "white", fontWeight: 700, cursor: stopLoading ? "wait" : "pointer" }}
              >
                {stopLoading ? "Đang xử lý..." : "⏸ Xác nhận tạm dừng (UC8.5)"}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}

// ─── Stock Adjustments (UC6.10 & UC6.11) ──────────────────────────────────────────
