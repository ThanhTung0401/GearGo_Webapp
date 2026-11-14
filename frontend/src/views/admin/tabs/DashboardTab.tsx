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
import Icon, { type IconName } from "../../../components/Icon";
import { usePermissions } from "../../../features/permissions";
import { fieldStyle, labelStyle } from "../forms/FormModal";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
export function DashboardTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [adminSelectedOrder, setAdminSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>("Chờ đối soát");
  // UC5.3: Xử lý tranh chấp phụ phí
  const [resolvingSurcharge, setResolvingSurcharge] = useState<{ order: Order; surcharge: Surcharge } | null>(null);
  const [resolutionType, setResolutionType] = useState<"approved" | "rejected" | "adjusted">("approved");
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  // UC3.4: Cửa hàng hủy đơn (xem trước & xác nhận)
  const [storeCancelOrder, setStoreCancelOrder] = useState<Order | null>(null);
  const [storeCancelPreview, setStoreCancelPreview] = useState<XemTruocHuyBackend | null>(null);
  const [storeCancelReason, setStoreCancelReason] = useState("");
  const [storeCancelLoading, setStoreCancelLoading] = useState(false);
  const [storeCancelError, setStoreCancelError] = useState("");

  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<{ tongDoanhThuHoanTat?: number; soDonHoanTat?: number } | null>(null);
  const [depositSummary, setDepositSummary] = useState<{ tongCocChuaTatToan?: number } | null>(null);

  // Tải số liệu tổng quan thật trong tháng hiện tại từ Backend khi bật Real API
  useEffect(() => {
    if (!isRealApi) return;
    let active = true;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfNow = now.toISOString();
    Promise.allSettled([
      reportApi.layBaoCaoVanHanh({ tuNgay: startOfMonth, denNgay: endOfNow }),
      reportApi.layDoanhThuHoanTat({ tuNgay: startOfMonth, denNgay: endOfNow, soMoiTrang: 20 }),
      reportApi.layCocChuaTatToan({ soMoiTrang: 20 }),
    ]).then(([opsRes, revRes, depRes]) => {
      if (!active) return;
      if (opsRes.status === "fulfilled") setOpsReport(opsRes.value);
      if (revRes.status === "fulfilled") setRevenueSummary(revRes.value);
      if (depRes.status === "fulfilled") setDepositSummary(depRes.value);
    });
    return () => {
      active = false;
    };
  }, [isRealApi, app.orders.length, app.equipment.length]);

  // feat/ROLE_Adjustment: demo hasPermission — nút "Xuất báo cáo" chỉ hiện khi role đang có quyền.
  const { has, data: myPerm } = usePermissions();

  const currentMonthNum = new Date().getMonth() + 1;
  const fallbackMonthRevenue = app.orders
    .filter((o) => o.status === "Hoàn tất")
    .reduce((sum, o) => sum + (o.rental - o.discount) + o.surcharges.filter((s) => s.status === "Đã duyệt").reduce((ss, s) => ss + s.amount, 0), 0);
  const displayRevenue = isRealApi && revenueSummary ? Number(revenueSummary.tongDoanhThuHoanTat ?? 0) : fallbackMonthRevenue;
  const displayCompletedCount = isRealApi && revenueSummary ? Number(revenueSummary.soDonHoanTat ?? 0) : app.orders.filter((o) => o.status === "Hoàn tất").length;
  const displayRentedCount = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.soThietBiDangChoThue : app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const displayTotalEquip = isRealApi && opsReport?.tongQuan ? opsReport.tongQuan.tongThietBiTrongKho : app.equipment.length;
  const displayHeldDeposit = isRealApi && depositSummary ? Number(depositSummary.tongCocChuaTatToan ?? 0) : app.orders.filter((o) => o.status === "Đang thuê").reduce((s, o) => s + o.depositTotal, 0);

  const handleExportDashboardReport = async () => {
    setBannerMessage(null);
    if (!isRealApi) {
      setBannerMessage({ type: "success", text: "Đang ở chế độ dữ liệu mẫu; bật Real API để xuất tệp CSV đối soát tài chính từ máy chủ." });
      return;
    }
    setExportingCsv(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      await reportApi.xuatCsvTaiChinh({
        loaiBaoCao: "DoanhThuHoanTat",
        tuNgay: startOfMonth,
        denNgay: now.toISOString(),
      });
      setBannerMessage({ type: "success", text: `Đã tải xuống báo cáo doanh thu tháng ${currentMonthNum}.` });
    } catch (err) {
      setBannerMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể xuất báo cáo CSV." });
    } finally {
      setExportingCsv(false);
    }
  };

  const pendingSurcharges = app.orders.flatMap((order) =>
    order.surcharges
      .filter((surcharge) => surcharge.status === "Chờ duyệt" || surcharge.status === "Tranh chấp")
      .map((surcharge) => ({ order, surcharge }))
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="admin-title text-xl">Tổng quan hệ thống</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">
            Role: <strong>{myPerm?.roleName ?? "..."}</strong> · {myPerm?.quyen.length ?? 0} quyền (v{myPerm?.version ?? 0})
          </span>
          {has("BaoCao.Xuat") && (
            <button type="button" disabled={exportingCsv} onClick={handleExportDashboardReport} className="btn btn-sm btn-primary">
              {exportingCsv ? "Đang xuất..." : "Xuất báo cáo"}
            </button>
          )}
        </div>
      </div>
      {bannerMessage && (
        <div role="alert" style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, fontSize: "0.82rem", background: bannerMessage.type === "error" ? "#FEE2E2" : "#DCFCE7", color: bannerMessage.type === "error" ? "#B91C1C" : "#15803D" }}>
          {bannerMessage.text}
        </div>
      )}
      <div className="admin-stats-grid">
        {([
          { label: `Doanh thu tháng ${currentMonthNum}`, value: fmt(displayRevenue), sub: `${displayCompletedCount} đơn hoàn tất`, icon: "wallet", color: "var(--color-forest)" },
          { label: "Đơn đang xử lý", value: app.orders.filter((o) => !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(o.status)).length.toString(), sub: "Chưa hoàn tất", icon: "clipboard", color: "var(--color-amber)" },
          { label: "Thiết bị đang thuê", value: String(displayRentedCount), sub: `/ ${displayTotalEquip} tổng cộng`, icon: "tent", color: "#1D4ED8" },
          { label: "Cọc đang giữ", value: fmt(displayHeldDeposit), sub: "Không phải doanh thu", icon: "shield", color: "#6B7280" },
        ] as { label: string; value: string; sub: string; icon: IconName; color: string }[]).map((k) => (
          <div key={k.label} className="kpi-card">
            <div style={{ color: k.color }}><Icon name={k.icon} size={22} /></div>
            <div className="kpi-value" style={{ color: k.color, fontSize: "1.3rem" }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* UC5.3: Trung tâm xử lý tranh chấp & Duyệt phụ phí */}
      <div className="card-panel p-0 overflow-hidden mb-5">
        <div className="flex justify-between items-center bg-parchment p-3 px-4 border-b border-bone">
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "0.72rem", background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                UC5.3
              </span>
              <strong className="text-sm text-bark">Trung tâm xử lý tranh chấp & Duyệt phụ phí</strong>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Đối chiếu chứng cứ bàn giao (BBBG) vs nhận trả (PNT), xem phản hồi khiếu nại của khách để kết luận mức phí hợp lệ.
            </div>
          </div>
          <span className={`badge ${pendingSurcharges.length ? "badge-warning" : "badge-success"}`}>
            {pendingSurcharges.length} khoản cần xử lý
          </span>
        </div>
        {pendingSurcharges.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">✓ Tất cả phụ phí đã được duyệt hoặc xử lý tranh chấp xong.</div>
        ) : pendingSurcharges.map(({ order, surcharge }) => {
          const isDisputed = surcharge.status === "Tranh chấp";
          return (
            <div key={surcharge.id} className="flex items-center gap-3 flex-wrap p-3 px-4 border-t border-bone" style={{ background: isDisputed ? "#FFFBEB" : "white" }}>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{surcharge.type} · {surcharge.equipmentId}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 700,
                    background: isDisputed ? "#FEE2E2" : "#FEF3C7",
                    color: isDisputed ? "#DC2626" : "#B45309",
                  }}>
                    {isDisputed ? "⚠️ Khách đang khiếu nại" : "Chờ duyệt"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Đơn {order.id} · Khách: {order.customerName} ({order.customerPhone}) · Lý do: {surcharge.reason}
                </div>
                {surcharge.customerResponse && (
                  <div style={{ fontSize: "0.74rem", color: "#B45309", marginTop: 2 }}>
                    <strong>Ý kiến khách:</strong> "{surcharge.customerResponse}"
                  </div>
                )}
              </div>
              <strong className="text-red-600 font-mono">+{fmt(surcharge.amount)}</strong>
              <button
                type="button"
                onClick={() => {
                  setResolvingSurcharge({ order, surcharge });
                  setResolutionType("approved");
                  setAdjustedAmount(surcharge.amount);
                  setResolutionReason("");
                }}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                ⚖️ Xem chứng cứ & Kết luận (UC5.3)
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ background: "var(--color-parchment)", padding: "12px 16px", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)" }}>Đơn thuê gần đây</div>
          {app.orders.slice(-5).reverse().map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <div key={o.id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--color-bone)", display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{o.customerName}</div>
                  <div style={{ fontSize: "0.7rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{o.id}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 600 }}>{fmt(o.rental - o.discount + o.depositTotal)}</div>
                  <span style={{ background: sc.bg, color: sc.text, padding: "1px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{o.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ background: "var(--color-parchment)", padding: "12px 16px", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)" }}>Khả dụng thiết bị</div>
          {app.products.map((p) => {
            const avail = app.getAvailable(p.id);
            const total = app.equipment.filter((e) => e.productId === p.id && e.equipmentStatus === "Sẵn sàng").length;
            return (
              <div key={p.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 700, color: avail > 1 ? "var(--color-forest)" : "#DC2626" }}>{avail} / {total}</span>
                </div>
                <div style={{ background: "var(--color-bone)", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: avail / total > 0.5 ? "var(--color-forest)" : avail > 0 ? "var(--color-amber)" : "#EF4444", width: total > 0 ? `${(avail / total) * 100}%` : "0%", transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status flow & Đối soát cọc (UC5.4 cho Quản trị viên) */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "18px", marginTop: "18px" }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-bark)", margin: 0 }}>
              Luồng trạng thái đơn thuê & Giám sát đối soát (UC5.4)
            </h3>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Click vào một trạng thái để xem danh sách đơn hoặc thực hiện đối soát cọc</div>
          </div>
          {statusFilter && (
            <button onClick={() => setStatusFilter(null)} style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#6B7280", cursor: "pointer", textDecoration: "underline" }}>
              Bỏ chọn lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].map((s, i, arr) => {
            const sc = statusColors[s] || { bg: "#F3F4F6", text: "#374151" };
            const cnt = app.orders.filter((o) => o.status === s).length;
            const isSelected = statusFilter === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter(isSelected ? null : s)}
                  style={{
                    background: isSelected ? "var(--color-forest)" : sc.bg,
                    borderRadius: "8px",
                    padding: "7px 12px",
                    textAlign: "center",
                    minWidth: 80,
                    border: isSelected ? "2px solid var(--color-forest)" : "1px solid transparent",
                    cursor: "pointer",
                    boxShadow: isSelected ? "0 2px 8px rgba(24,61,45,0.2)" : "none",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "white" : sc.text }}>{cnt}</div>
                  <div style={{ fontSize: "0.66rem", color: isSelected ? "white" : sc.text, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</div>
                </button>
                {i < arr.length - 1 && <span style={{ color: "var(--color-bone)", fontSize: "1.1rem" }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* Danh sách đơn theo trạng thái đang chọn */}
        {statusFilter && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--color-bone)" }}>
            <div className="flex justify-between items-center mb-2">
              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                Danh sách đơn: {statusFilter} ({app.orders.filter((o) => o.status === statusFilter).length} đơn)
              </strong>
            </div>

            <div className="flex flex-col gap-2">
              {app.orders.filter((o) => o.status === statusFilter).length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#9CA3AF", fontSize: "0.8rem", background: "#F9FAFB", borderRadius: 8 }}>
                  Không có đơn hàng nào ở trạng thái {statusFilter}.
                </div>
              ) : (
                app.orders.filter((o) => o.status === statusFilter).map((o) => (
                  <div key={o.id} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.88rem" }}>{o.id}</strong>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{o.customerName}</span>
                        <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>({o.customerPhone})</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 2 }}>
                        Tiền thuê: {fmt(o.rental - o.discount)} · Tiền cọc: {fmt(o.depositTotal)} · Hẹn trả: {o.returnTime}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng bàn giao"].includes(o.status) && (
                        <button
                          type="button"
                          onClick={async () => {
                            setStoreCancelOrder(o);
                            setStoreCancelPreview(null);
                            setStoreCancelReason("");
                            setStoreCancelError("");
                            if (isRealApi) {
                              const orderNumId = Number(o.id);
                              if (!Number.isNaN(orderNumId)) {
                                setStoreCancelLoading(true);
                                try {
                                  const preview = await orderApi.xemTruocCuaHangHuy(orderNumId);
                                  setStoreCancelPreview(preview);
                                } catch (err) {
                                  setStoreCancelError(err instanceof Error ? err.message : "Không thể tải xem trước chi phí hủy đơn.");
                                } finally {
                                  setStoreCancelLoading(false);
                                }
                              }
                            }
                          }}
                          style={{
                            background: "#FEF2F2",
                            color: "#B91C1C",
                            border: "1px solid #FECACA",
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Cửa hàng hủy (UC3.4)
                        </button>
                      )}
                      {(o.status === "Chờ đối soát" || o.status === "Hoàn tất") && (
                        <button
                          type="button"
                          onClick={() => setAdminSelectedOrder(o)}
                          style={{
                            background: o.status === "Chờ đối soát" ? "var(--color-forest)" : "white",
                            color: o.status === "Chờ đối soát" ? "white" : "var(--color-bark)",
                            border: `1px solid ${o.status === "Chờ đối soát" ? "var(--color-forest)" : "var(--color-bone)"}`,
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {o.status === "Chờ đối soát" ? "📝 Mở bảng đối soát (UC5.4)" : "🔍 Xem đối soát đã khóa"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Quản trị viên xử lý kết luận tranh chấp & duyệt phụ phí (UC5.3) */}
      {resolvingSurcharge && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC5.3: DUYỆT & XỬ LÝ TRANH CHẤP PHỤ PHÍ
                </span>
                <h3 className="modal-title font-bold text-lg text-bark mt-1">
                  Hồ sơ xử lý phụ phí: {resolvingSurcharge.surcharge.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolvingSurcharge(null)}
                className="btn btn-ghost btn-sm text-xl"
                style={{ border: "none", background: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            {/* Thông tin căn cứ đề xuất & Đơn hàng */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: "0.82rem" }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>Đơn hàng: <strong>{resolvingSurcharge.order.id}</strong></div>
                <div>Khách hàng: <strong>{resolvingSurcharge.order.customerName}</strong> ({resolvingSurcharge.order.customerPhone})</div>
                <div>Thiết bị liên quan: <strong className="font-mono text-forest">{resolvingSurcharge.surcharge.equipmentId}</strong></div>
                <div>Người lập đề xuất: <strong>{resolvingSurcharge.surcharge.createdBy}</strong></div>
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px dashed var(--color-bone)" }}>
                Lý do lập phí ban đầu: <em className="text-gray-700">"{resolvingSurcharge.surcharge.reason}"</em>
              </div>
            </div>

            {/* Đối chiếu chứng cứ 2 chiều (Dòng chính 2 UC5.3) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                🔍 Đối chiếu chứng cứ trước và sau thuê (Dòng 2 UC5.3):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Cột 1: Trước thuê (BBBG - UC4.2) */}
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, fontSize: "0.78rem" }}>
                  <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>
                    📋 Lúc bàn giao (BBBG - UC4.2)
                  </div>
                  <div>Thời gian: {resolvingSurcharge.order.handoverRecord?.handoverAt || resolvingSurcharge.order.pickupTime}</div>
                  <div>Nhân viên giao: {resolvingSurcharge.order.handoverRecord?.staffName || "Cửa hàng"}</div>
                  <div>
                    Tình trạng: {
                      resolvingSurcharge.order.handoverRecord?.items.find((i) => i.equipmentId === resolvingSurcharge.surcharge.equipmentId)?.condition || "Tốt, hoạt động bình thường"
                    }
                  </div>
                  <div style={{ marginTop: 4, color: "#4B5563" }}>
                    Ghi chú giao: {resolvingSurcharge.order.handoverRecord?.initialNotes || "Không có ghi nhận lỗi"}
                  </div>
                </div>

                {/* Cột 2: Sau thuê (PNT - UC4.3) */}
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12, fontSize: "0.78rem" }}>
                  <div style={{ fontWeight: 700, color: "#DC2626", marginBottom: 4 }}>
                    📦 Lúc nhận trả (PNT - UC4.3)
                  </div>
                  <div>Thời gian: {resolvingSurcharge.order.returnedAt || "Đã nhận trả"}</div>
                  <div>
                    Tình trạng: {
                      resolvingSurcharge.order.returnReceipts?.flatMap((r) => r.items).find((i) => i.equipmentId === resolvingSurcharge.surcharge.equipmentId)?.condition || resolvingSurcharge.surcharge.type
                    }
                  </div>
                  <div style={{ marginTop: 4, color: "#991B1B" }}>
                    Tổn thất ghi nhận: {resolvingSurcharge.surcharge.reason}
                  </div>
                </div>
              </div>
            </div>

            {/* Xem phản hồi khiếu nại của khách (Dòng chính 3 UC5.3) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
                🗣️ Phản hồi khiếu nại của khách hàng (Dòng 3 UC5.3):
              </div>
              {resolvingSurcharge.surcharge.customerResponse ? (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: 12, fontSize: "0.82rem", color: "#92400E" }}>
                  <strong>Khách hàng phản hồi:</strong> "{resolvingSurcharge.surcharge.customerResponse}"
                </div>
              ) : (
                <div style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.78rem", color: "#6B7280" }}>
                  ℹ️ Khách hàng chưa có khiếu nại (Khoản phí đang ở trạng thái chờ duyệt thông thường).
                </div>
              )}
            </div>

            {/* Form kết luận & quyết định của Quản trị viên (Dòng chính 4 & 5 UC5.3) */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setResolveError("");
                const finalAmt = resolutionType === "rejected" ? 0 : resolutionType === "adjusted" ? adjustedAmount : resolvingSurcharge.surcharge.amount;
                const reasonText = resolutionReason.trim() || (
                  resolutionType === "approved"
                    ? "Quản trị viên chấp thuận mức phí đề xuất"
                    : resolutionType === "adjusted"
                    ? `Đã thương lượng giảm phí còn ${fmt(adjustedAmount)}`
                    : "Bác bỏ do không đủ căn cứ thu"
                );

                if (isRealApi) {
                  const surchargeId = Number(resolvingSurcharge.surcharge.id);
                  if (Number.isNaN(surchargeId)) {
                    setResolveError("ID phụ phí không hợp lệ.");
                    return;
                  }
                  setResolvingLoading(true);
                  try {
                    if (resolvingSurcharge.surcharge.status === "Tranh chấp") {
                      await surchargeApi.giaiQuyetTranhChap(surchargeId, {
                        ketQua: resolutionType === "approved" ? "GiuNguyen" : resolutionType === "rejected" ? "HuyPhi" : "DieuChinh",
                        lyDo: reasonText,
                        soTienDeXuatSauXuLy: resolutionType === "adjusted" ? adjustedAmount : undefined,
                      });
                    } else if (resolutionType === "approved") {
                      await surchargeApi.duyetPhi(surchargeId, reasonText);
                    } else if (resolutionType === "rejected") {
                      await surchargeApi.tuChoiPhi(surchargeId, reasonText);
                    } else {
                      await surchargeApi.capNhatPhi(surchargeId, { soTien: adjustedAmount, lyDo: reasonText });
                      await surchargeApi.duyetPhi(surchargeId, reasonText);
                    }
                    await app.refreshOrders?.();
                    setResolvingSurcharge(null);
                  } catch (err) {
                    setResolveError(err instanceof Error ? err.message : "Không thể xử lý kết luận phụ phí lên máy chủ.");
                  } finally {
                    setResolvingLoading(false);
                  }
                  return;
                }

                app.resolveDisputedSurcharge(
                  resolvingSurcharge.order.id,
                  resolvingSurcharge.surcharge.id,
                  resolutionType,
                  finalAmt,
                  reasonText
                );
                setResolvingSurcharge(null);
              }}
              style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 10, padding: 16 }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>
                ⚖️ Quyết định xử lý & Mức phí phê duyệt vào đối soát:
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "approved"}
                    onChange={() => setResolutionType("approved")}
                  />
                  <span>
                    <strong>1. Chấp thuận mức đề xuất:</strong> Giữ nguyên {fmt(resolvingSurcharge.surcharge.amount)}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "adjusted"}
                    onChange={() => {
                      setResolutionType("adjusted");
                      if (adjustedAmount === 0) setAdjustedAmount(Math.round(resolvingSurcharge.surcharge.amount / 2));
                    }}
                  />
                  <span>
                    <strong>2. Thỏa thuận giảm phí (Điều chỉnh có căn cứ):</strong>
                  </span>
                </label>

                {resolutionType === "adjusted" && (
                  <div style={{ marginLeft: 24, marginTop: 4 }}>
                    <label style={{ fontSize: "0.78rem", color: "#4B5563", display: "block", marginBottom: 3 }}>
                      Số tiền sau điều chỉnh thỏa thuận (đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={resolvingSurcharge.surcharge.amount}
                      value={adjustedAmount}
                      onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                      className="form-input"
                      style={{ padding: "6px 10px", width: 180, borderRadius: 6, border: "1px solid var(--color-bone)", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: "0.82rem" }}>
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionType === "rejected"}
                    onChange={() => setResolutionType("rejected")}
                  />
                  <span>
                    <strong>3. Bác bỏ phụ phí (Quy về 0đ - Dòng phụ 4.1):</strong> Không có căn cứ thu hoặc thuộc hao mòn cho phép
                  </span>
                </label>
              </div>

              <div className="form-group mb-3">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  Ghi chú kết luận & Căn cứ xử lý (Lưu vết kiểm toán):
                </label>
                <textarea
                  rows={2}
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Ghi nhận thỏa thuận qua điện thoại với khách, trích xuất hình ảnh kiểm tra..."
                  className="form-textarea"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.8rem" }}
                />
              </div>

              {resolveError && (
                <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 6, fontSize: "0.8rem", marginBottom: 10 }}>
                  {resolveError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={resolvingLoading}
                  onClick={() => setResolvingSurcharge(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={resolvingLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  {resolvingLoading ? "Đang xử lý..." : "✓ Xác nhận kết luận & Cập nhật đưa vào đối soát"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đối soát dành cho Quản trị viên (UC5.4) */}
      {adminSelectedOrder && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ maxWidth: 860, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
            <ReconciliationSheet
              order={adminSelectedOrder}
              app={app}
              userRole="admin"
              onClose={() => setAdminSelectedOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Cửa hàng hủy đơn (UC3.4) */}
      {storeCancelOrder && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 14, maxWidth: 520, width: "100%", padding: 22 }}>
            <div className="modal-header flex justify-between items-center mb-3">
              <h3 className="modal-title font-bold text-base text-bark">
                Cửa hàng hủy đơn {storeCancelOrder.id} (UC3.4)
              </h3>
              <button type="button" onClick={() => setStoreCancelOrder(null)} className="btn btn-ghost btn-sm text-lg">×</button>
            </div>
            <div className="modal-body grid gap-3">
              {storeCancelLoading && !storeCancelPreview && (
                <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>Đang tính toán hoàn tiền và kiểm tra điều kiện hủy...</div>
              )}
              {storeCancelPreview && (
                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.8rem", display: "grid", gap: 4 }}>
                  <div>Trạng thái hiện tại: <strong>{storeCancelPreview.trangThaiHienTai}</strong></div>
                  <div>Tiền thuê đã thu: <strong>{fmt(storeCancelPreview.tienThueDaThu)}</strong> · Tiền cọc đã thu: <strong>{fmt(storeCancelPreview.tienCocDaThu)}</strong></div>
                  <div>Hoàn tiền thuê: <strong>{fmt(storeCancelPreview.tienThueHoan)}</strong> · Hoàn tiền cọc: <strong>{fmt(storeCancelPreview.tienCocHoan)}</strong></div>
                  <div>Tổng hoàn dự kiến cho khách: <strong style={{ color: "var(--color-forest)" }}>{fmt(storeCancelPreview.tongHoan)}</strong></div>
                  {!storeCancelPreview.coTheHuy && (
                    <div style={{ color: "#B91C1C", fontWeight: 600 }}>Không thể hủy: {storeCancelPreview.lyDoKhongTheHuy}</div>
                  )}
                  {storeCancelPreview.canhBao?.length > 0 && (
                    <div style={{ color: "#B45309" }}>{storeCancelPreview.canhBao.join(" · ")}</div>
                  )}
                </div>
              )}
              <label style={labelStyle}>
                Lý do cửa hàng hủy đơn (bắt buộc)
                <textarea
                  rows={3}
                  value={storeCancelReason}
                  onChange={(e) => setStoreCancelReason(e.target.value)}
                  placeholder="Ví dụ: Thiết bị gặp sự cố kỹ thuật đột xuất trước giờ bàn giao..."
                  style={fieldStyle}
                />
              </label>
              {storeCancelError && (
                <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 10px", borderRadius: 8, fontSize: "0.8rem" }}>
                  {storeCancelError}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button type="button" disabled={storeCancelLoading} onClick={() => setStoreCancelOrder(null)} className="btn btn-secondary btn-md" style={{ flex: 1 }}>
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={storeCancelLoading || (storeCancelPreview !== null && !storeCancelPreview.coTheHuy)}
                  onClick={async () => {
                    if (!storeCancelReason.trim()) {
                      return setStoreCancelError("Vui lòng nhập lý do hủy đơn.");
                    }
                    setStoreCancelError("");
                    if (isRealApi) {
                      const orderNumId = Number(storeCancelOrder.id);
                      if (Number.isNaN(orderNumId)) return setStoreCancelError("ID đơn không hợp lệ.");
                      setStoreCancelLoading(true);
                      try {
                        await orderApi.cuaHangHuy(orderNumId, {
                          lyDo: storeCancelReason.trim(),
                          xacNhanChiPhi: true,
                          dauVanTayXemTruoc: storeCancelPreview?.dauVanTay,
                        });
                        await app.refreshOrders?.();
                        setBannerMessage({ type: "success", text: `Đã hủy đơn ${storeCancelOrder.id} từ phía cửa hàng (UC3.4).` });
                        setStoreCancelOrder(null);
                      } catch (err) {
                        setStoreCancelError(err instanceof Error ? err.message : "Không thể hủy đơn hàng.");
                      } finally {
                        setStoreCancelLoading(false);
                      }
                      return;
                    }
                    setStoreCancelOrder(null);
                  }}
                  className="btn btn-primary btn-md"
                  style={{ flex: 1, background: "#DC2626", borderColor: "#DC2626" }}
                >
                  {storeCancelLoading ? "Đang xử lý..." : "Xác nhận cửa hàng hủy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
