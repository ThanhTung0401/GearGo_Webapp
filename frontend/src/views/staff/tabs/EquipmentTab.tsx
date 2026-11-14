import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  equipmentApi,
  orderApi,
  handoverApi,
  returnApi,
  surchargeApi,
  reportApi,
  auditApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type ThietBiConNoBackend,
  type QuaHanChiTietBackend,
  type BaoCaoVanHanhBackend,
  type XemTruocHuyBackend,
  type DonQuaHanBackend,
  type NhatKyLienHeQuaHanBackend,
  type ThietBiBackend,
  type PhanCongLichThietBiBackend,
} from "../../../services/api";
import { mapDonVanHanhChiTietToOrder, mapPhuPhiToSurcharge, mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers";
import type { Surcharge } from "../../../types";
import {
  fmt,
  statusColors,
  Order,
  ReturnReceipt,
  ReturnReceiptItem,
  MaintenanceReceipt,
  Equipment,
  ImportReceipt,
  Supplier,
} from "../../../store";
import Icon from "../../../components/Icon";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import { mapReturnCondToBackend, mapReturnCondToSurchargeType, type StaffTab } from "../returnMapping";
import { EquipmentTabModals } from "./EquipmentTabModals";
export function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [subTab, setSubTab] = useState<"inventory" | "maintenance" | "import">("inventory");
  const [filter, setFilter] = useState("Tất cả");
  const [productFilter, setProductFilter] = useState("Tất cả");
  const [transferModal, setTransferModal] = useState<Equipment | null>(null);
  const [targetProductId, setTargetProductId] = useState("");
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // State UC7.3 & UC7.7: Nhập hàng & Kiểm nhận cho nhân viên kho
  const [inspectingImportReceipt, setInspectingImportReceipt] = useState<ImportReceipt | null>(null);
  const [viewingSupplierProfile, setViewingSupplierProfile] = useState<Supplier | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [importStatusFilter, setImportStatusFilter] = useState("Tất cả");

  // State UC6.12: Tạo phiếu bảo trì
  const [showCreateMaintenanceModal, setShowCreateMaintenanceModal] = useState(false);
  const [createMaintEquipId, setCreateMaintEquipId] = useState("");
  const [createMaintIssue, setCreateMaintIssue] = useState("");
  const [createMaintCost, setCreateMaintCost] = useState(150000);
  const [createMaintOrderId, setCreateMaintOrderId] = useState("");
  const [createMaintNote, setCreateMaintNote] = useState("");

  // State UC6.13: Nghiệm thu bảo trì
  const [acceptingMaintenance, setAcceptingMaintenance] = useState<MaintenanceReceipt | null>(null);
  const [actualRepairCost, setActualRepairCost] = useState(0);
  const [repairOutcome, setRepairOutcome] = useState<"Hoàn tất" | "Không thể sửa">("Hoàn tất");
  const [repairOutcomeNote, setRepairOutcomeNote] = useState("");
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equipSuccess, setEquipSuccess] = useState<string | null>(null);

  // State UC6.9: Xem chi tiết & lịch bận thiết bị
  const [viewingEquipDetail, setViewingEquipDetail] = useState<{
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null>(null);

  // State UC6.12: Phân công xử lý & cập nhật tiến độ bảo trì
  const [assignMaintTarget, setAssignMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [assignHandlerId, setAssignHandlerId] = useState<number>(1);
  const [assignReason, setAssignReason] = useState("");
  const [progressMaintTarget, setProgressMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [progressCost, setProgressCost] = useState<number>(0);

  const handleOpenEquipSchedule = async (e: Equipment) => {
    setViewingEquipDetail({ equip: e, schedule: [], loading: true });
    if (!(app.realApi || isRealApiEnabled())) {
      setViewingEquipDetail({ equip: e, schedule: [], loading: false });
      return;
    }
    try {
      const equipIdNum = Number(e.id) || parseInt(e.id.replace(/\D/g, ""), 10);
      const [detail, schedule] = await Promise.all([
        equipmentApi.layChiTietThietBi(equipIdNum),
        equipmentApi.layLichThietBi(equipIdNum),
      ]);
      setViewingEquipDetail({ equip: e, detail, schedule, loading: false });
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Không tải được chi tiết và lịch bận thiết bị.");
      setViewingEquipDetail(null);
    }
  };

  const products = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];
  const statuses = ["Tất cả", "Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"];

  const filtered = app.equipment.filter((e) => {
    const matchStatus = filter === "Tất cả" || e.equipmentStatus === filter;
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    const matchProduct = productFilter === "Tất cả" || pname === productFilter;
    return matchStatus && matchProduct;
  });

  const statusStyle: Record<string, { bg: string; text: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
  };

  const handleTransfer = async () => {
    if (!transferModal || !targetProductId) return;
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const targetProduct = app.products.find((p) => p.id === targetProductId);
        const equipIdNum = Number(transferModal.id) || parseInt(transferModal.id.replace(/\D/g, ""), 10);
        const targetSpIdNum = Number(targetProduct?.id ?? targetProductId) || parseInt(targetProductId.replace(/\D/g, ""), 10);
        if (!equipIdNum || !targetSpIdNum) {
          throw new Error("Không xác định được mã thiết bị hoặc sản phẩm đích hợp lệ.");
        }
        const checkImpact = await equipmentApi.xemAnhHuongThayDoi(equipIdNum, {
          loaiThayDoi: "GiangCap",
          maSanPhamDich: targetSpIdNum,
        });
        if (!checkImpact.coTheApDungHienTai) {
          setEquipError(`Cảnh báo cam kết: Không thể điều chuyển do vướng đơn thuê: ${checkImpact.vuongMac.join("; ")}`);
          return;
        }
        await equipmentApi.deNghiDieuChuyenSanPham(equipIdNum, {
          maSanPhamDich: targetSpIdNum,
          lyDo: "Giáng cấp / điều chuyển thiết bị sang phân khúc sản phẩm đích",
        });
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
        setTransferModal(null);
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi gửi đề nghị điều chuyển thiết bị.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    const res = app.transferEquipment(transferModal.id, targetProductId);
    if (res.ok) {
      setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
      setTransferModal(null);
    } else {
      setEquipError(res.message);
    }
  };

  return (
    <div>
      {equipError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.82rem", fontWeight: 600 }}>
          {equipError}
        </div>
      )}
      {equipSuccess && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.82rem", fontWeight: 600 }}>
          {equipSuccess}
        </div>
      )}
      {/* Sub tabs: Kho / Phiếu bảo trì / Nhập hàng */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-2 flex-wrap">
        <button onClick={() => setSubTab("inventory")}
          style={{ background: subTab === "inventory" ? "var(--color-forest)" : "white", color: subTab === "inventory" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          📦 Danh sách kho ({app.equipment.length} thiết bị)
        </button>
        <button onClick={() => setSubTab("maintenance")}
          style={{ background: subTab === "maintenance" ? "var(--color-forest)" : "white", color: subTab === "maintenance" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          🛠 Phiếu bảo trì & sửa chữa ({app.maintenanceReceipts.length} phiếu)
        </button>
        <button onClick={() => setSubTab("import")}
          style={{ background: subTab === "import" ? "var(--color-forest)" : "white", color: subTab === "import" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          🚚 Nhập hàng & Kiểm nhận ({app.importReceipts.length} phiếu)
        </button>
      </div>

      {subTab === "inventory" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc theo trạng thái thiết bị"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
            >
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Lọc theo sản phẩm"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
            >
              {products.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2 flex-wrap">
              {["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc"].map((s) => {
                const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
                const style = statusStyle[s];
                return <div key={s} style={{ background: style.bg, color: style.text, padding: "5px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>{s}: {cnt}</div>;
              })}
            </div>
            <button onClick={() => setShowAuditModal(true)}
              style={{ background: "var(--color-amber)", color: "white", padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", marginLeft: "auto" }}>
              📋 Kiểm kê kho (UC6.10)
            </button>
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã thiết bị", "Sản phẩm hiện tại", "Phiếu nhập", "Ngày nhập", "Tình trạng", "Trạng thái", "Số lần thuê", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  const origP = app.products.find((pr) => pr.id === e.originalProductId);
                  const moved = e.productId !== e.originalProductId;
                  const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{e.displayCode || e.id}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 600 }}>{p?.name}</div>
                        {moved && <div style={{ fontSize: "0.68rem", color: "var(--color-amber)", fontWeight: 700 }}>↳ Giáng cấp/chuyển từ {origP?.name}</div>}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{e.importReceiptId}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#6B7280" }}>{e.importDate}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.8rem", color: "#6B7280" }}>{e.condition}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: st.bg, color: st.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 600 }}>{e.equipmentStatus}</span>
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", textAlign: "center" }}>{e.rentCount}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingLifecycle(e)}
                            style={{ background: "white", border: "1px solid var(--color-forest)", color: "var(--color-forest)", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                            🔍 Sổ đời
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOpenEquipSchedule(e)}
                            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                          >
                            📅 Lịch bận
                          </button>
                          {e.equipmentStatus === "Sẵn sàng" && (
                            <button onClick={() => { setTransferModal(e); setTargetProductId(""); }}
                              style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                              Chuyển loại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal chuyển loại thiết bị (giáng cấp cũ sang tiết kiệm) */}
          {transferModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
              <div style={{ background: "white", borderRadius: 14, maxWidth: 460, width: "100%", padding: 20 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginBottom: 8 }}>
                  Chuyển loại thiết bị: {transferModal.displayCode || transferModal.id}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 12 }}>
                  Dùng khi thiết bị cũ khấu hao (ví dụ từ Tiêu chuẩn sang Tiết kiệm).
                </p>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Sản phẩm đích mới:</label>
                <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px", fontSize: "0.85rem", marginBottom: 14, background: "white" }}>
                  <option value="">-- Chọn sản phẩm đích --</option>
                  {app.products.filter((p) => p.id !== transferModal.productId && p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({fmt(p.pricePerDay)}/ngày)</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setTransferModal(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Hủy</button>
                  <button disabled={!targetProductId} onClick={handleTransfer} style={{ background: targetProductId ? "var(--color-forest)" : "#9CA3AF", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", cursor: targetProductId ? "pointer" : "not-allowed", fontWeight: 700 }}>Xác nhận chuyển</button>
                </div>
              </div>
            </div>
          )}

          {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
          {showAuditModal && <InventoryAuditModal app={app} onClose={() => setShowAuditModal(false)} />}
        </div>
      )}

      {subTab === "maintenance" && (
        /* Tab Phiếu bảo trì (UC6.12 & UC6.13) */
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)" }}>
                Hồ sơ bảo trì & sửa chữa thiết bị
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                Ghi nhận các thiết bị hư hỏng, ước tính kinh phí và nghiệm thu đưa về kho Sẵn sàng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstAvailable = app.equipment.find((e) => e.equipmentStatus !== "Ngừng sử dụng")?.id || "";
                setCreateMaintEquipId(firstAvailable);
                setShowCreateMaintenanceModal(true);
              }}
              style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
            >
              + Tạo phiếu bảo trì (UC6.12)
            </button>
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Mã thiết bị", "Mô tả lỗi / Hư hỏng", "Đơn liên quan", "Ngày tạo", "Dự tính", "Thực tế", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.maintenanceReceipts.map((m, i) => {
                  const matchedEquip = app.equipment.find(
                    (eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId
                  );
                  const equipDisplay = matchedEquip?.displayCode || m.equipmentId;
                  return (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{m.id}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{equipDisplay}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                      <div>{m.issueDescription}</div>
                      {m.note && <div style={{ fontSize: "0.7rem", color: "#6B7280" }}>{m.note}</div>}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "#6B7280" }}>{m.orderId || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#6B7280" }}>{m.createdAt}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700 }}>{fmt(m.estimatedCost)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: m.actualCost ? "var(--color-forest)" : "#9CA3AF" }}>
                      {m.actualCost !== undefined ? fmt(m.actualCost) : "—"}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{
                        background: m.status === "Hoàn tất" ? "#DCFCE7" : m.status === "Đang bảo dưỡng" ? "#FEF3C7" : m.status === "Không thể sửa" ? "#FEE2E2" : "#F3F4F6",
                        color: m.status === "Hoàn tất" ? "#15803D" : m.status === "Đang bảo dưỡng" ? "#B45309" : m.status === "Không thể sửa" ? "#DC2626" : "#4B5563",
                        padding: "3px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      {m.status !== "Hoàn tất" && m.status !== "Không thể sửa" ? (
                        <div className="flex gap-1 flex-wrap">
                          {(app.realApi || isRealApiEnabled()) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignMaintTarget(m);
                                  setAssignHandlerId(1);
                                  setAssignReason("");
                                }}
                                style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                              >
                                Phân công
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProgressMaintTarget(m);
                                  setProgressNote(m.note || "");
                                  setProgressCost(m.actualCost ?? m.estimatedCost);
                                }}
                                style={{ background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                              >
                                Tiến độ
                              </button>
                              <button
                                type="button"
                                disabled={equipBusy}
                                onClick={async () => {
                                  setEquipError(null);
                                  setEquipSuccess(null);
                                  setEquipBusy(true);
                                  try {
                                    const maintIdNum = Number(m.id) || parseInt(m.id.replace(/\D/g, ""), 10);
                                    await equipmentApi.guiKiemTra(maintIdNum);
                                    await app.refreshEquipment?.();
                                    setEquipSuccess(`Đã gửi kiểm tra phiếu bảo trì ${m.id}.`);
                                  } catch (err) {
                                    setEquipError(err instanceof Error ? err.message : "Không thể gửi kiểm tra.");
                                  } finally {
                                    setEquipBusy(false);
                                  }
                                }}
                                style={{ background: "#F3E8FF", color: "#7C3AED", border: "1px solid #DDD6FE", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                              >
                                Gửi KT
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptingMaintenance(m);
                              setActualRepairCost(m.actualCost ?? m.estimatedCost);
                              setRepairOutcome("Hoàn tất");
                              setRepairOutcomeNote(m.note || "Đã kiểm tra kỹ thuật và vệ sinh đạt chuẩn.");
                            }}
                            style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                          >
                            Nghiệm thu →
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Đã chốt</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Nhập Hàng & Kiểm Nhận (UC7.3 - UC7.8) */}
      {subTab === "import" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)" }}>
                Quản lý nhập hàng & Kiểm nhận thực tế tại kho (UC7.3 - UC7.8)
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                Khi xe hàng tới kho, nhân viên kho mở biên bản kiểm nhận thực tế để đếm số lượng, phân loại đạt/lỗi/từ chối và chốt mã serial.
              </p>
            </div>
          </div>

          {/* Bộ lọc tìm kiếm cho nhân viên kho */}
          <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
            <input
              type="text"
              placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem" }}
            />
            <select
              value={importStatusFilter}
              onChange={(e) => setImportStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái phiếu"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
            >
              {["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"].map((s) => (
                <option key={s} value={s}>{s === "Tất cả" ? "Tất cả trạng thái" : s}</option>
              ))}
            </select>
            {(importSearch || importStatusFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={() => { setImportSearch(""); setImportStatusFilter("Tất cả"); }}
                style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Nhà cung cấp", "Ngày lập / Người lập", "Số lượng mặt hàng", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.importReceipts
                  .slice()
                  .reverse()
                  .filter((r) => {
                    const matchStatus = importStatusFilter === "Tất cả" || r.status === importStatusFilter;
                    const q = importSearch.toLowerCase().trim();
                    const matchQ = !q ||
                      (r.displayCode ?? r.id).toLowerCase().includes(q) ||
                      r.supplierName.toLowerCase().includes(q) ||
                      r.createdBy.toLowerCase().includes(q);
                    return matchStatus && matchQ;
                  })
                  .map((r, i) => {
                    const totalQty = r.lines.reduce((s, l) => s + l.quantity, 0);
                    const supplier = app.suppliers.find((s) => s.id === r.supplierId || s.displayCode === r.supplierId);
                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-forest)" }}>
                          {r.displayCode ?? r.id}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>{r.supplierName}</div>
                          {supplier && (
                            <button
                              type="button"
                              onClick={() => setViewingSupplierProfile(supplier)}
                              style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                            >
                              👁 Xem hồ sơ NCC (UC7.3)
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: "#6B7280" }}>
                          <div>{r.createdAt}</div>
                          <div style={{ fontWeight: 500 }}>Bởi {r.createdBy}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>
                          <strong>{r.lines.length}</strong> dòng · <strong>{totalQty}</strong> thiết bị
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            background: r.status === "Đã nhập kho" ? "#DCFCE7" : r.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                            color: r.status === "Đã nhập kho" ? "#15803D" : r.status === "Đã hủy" ? "#6B7280" : "#B45309",
                            padding: "3px 9px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {r.status === "Nháp" ? (
                            <button
                              type="button"
                              onClick={() => setInspectingImportReceipt(r)}
                              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 700, boxShadow: "0 2px 6px rgba(34, 197, 94, 0.25)" }}
                            >
                              📦 Kiểm nhận thực tế (UC7.7) →
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                              {r.status === "Đã nhập kho" ? `✓ Đã nhập kho lúc ${r.confirmedAt}` : "Phiếu đã hủy"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EquipmentTabModals
        app={app}
        showCreateMaintenanceModal={showCreateMaintenanceModal}
        setShowCreateMaintenanceModal={setShowCreateMaintenanceModal}
        createMaintEquipId={createMaintEquipId}
        setCreateMaintEquipId={setCreateMaintEquipId}
        createMaintIssue={createMaintIssue}
        setCreateMaintIssue={setCreateMaintIssue}
        createMaintCost={createMaintCost}
        setCreateMaintCost={setCreateMaintCost}
        createMaintOrderId={createMaintOrderId}
        setCreateMaintOrderId={setCreateMaintOrderId}
        createMaintNote={createMaintNote}
        setCreateMaintNote={setCreateMaintNote}
        acceptingMaintenance={acceptingMaintenance}
        setAcceptingMaintenance={setAcceptingMaintenance}
        repairOutcome={repairOutcome}
        setRepairOutcome={setRepairOutcome}
        actualRepairCost={actualRepairCost}
        setActualRepairCost={setActualRepairCost}
        repairOutcomeNote={repairOutcomeNote}
        setRepairOutcomeNote={setRepairOutcomeNote}
        equipBusy={equipBusy}
        setEquipBusy={setEquipBusy}
        setEquipError={setEquipError}
        setEquipSuccess={setEquipSuccess}
        transferModal={transferModal}
        setTransferModal={setTransferModal}
        targetProductId={targetProductId}
        setTargetProductId={setTargetProductId}
        viewingLifecycle={viewingLifecycle}
        setViewingLifecycle={setViewingLifecycle}
        showAuditModal={showAuditModal}
        setShowAuditModal={setShowAuditModal}
        inspectingImportReceipt={inspectingImportReceipt}
        setInspectingImportReceipt={setInspectingImportReceipt}
        viewingSupplierProfile={viewingSupplierProfile}
        setViewingSupplierProfile={setViewingSupplierProfile}
        viewingEquipDetail={viewingEquipDetail}
        setViewingEquipDetail={setViewingEquipDetail}
        assignMaintTarget={assignMaintTarget}
        setAssignMaintTarget={setAssignMaintTarget}
        assignHandlerId={assignHandlerId}
        setAssignHandlerId={setAssignHandlerId}
        assignReason={assignReason}
        setAssignReason={setAssignReason}
        progressMaintTarget={progressMaintTarget}
        setProgressMaintTarget={setProgressMaintTarget}
        progressCost={progressCost}
        setProgressCost={setProgressCost}
        progressNote={progressNote}
        setProgressNote={setProgressNote}
      />
    </div>
  );
}

// ─── Báo cáo ca trực & Nhật ký thao tác nhân viên (UC10.1 & UC10.4 cho Nhân viên) ────
