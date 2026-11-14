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
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../components/ImportAdjustmentModal";
import PromotionDetailModal from "../../../components/PromotionDetailModal";
export function TransferPanel({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [equipId, setEquipId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [resultNote, setResultNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [impactPreview, setImpactPreview] = useState<Awaited<ReturnType<typeof equipmentApi.xemAnhHuongThayDoi>> | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const eq = app.equipment.find((e) => e.id === equipId);
  const currentProduct = eq ? app.products.find((p) => p.id === eq.productId) : null;
  const origProduct = eq ? app.products.find((p) => p.id === eq.originalProductId) : null;
  const targetProduct = app.products.find((p) => p.id === targetProductId);

  const canTransfer = Boolean(
    eq &&
      eq.equipmentStatus === "Sẵn sàng" &&
      targetProductId &&
      targetProductId !== eq.productId &&
      reason.trim().length > 0 &&
      (!isRealApi || !impactPreview || impactPreview.coTheApDungHienTai)
  );

  // Kiểm tra ảnh hưởng lịch đặt & xung đột trước khi chuyển loại thiết bị trên Real API
  useEffect(() => {
    if (!isRealApi || !eq || !targetProductId || targetProductId === eq.productId) {
      setImpactPreview(null);
      return;
    }
    const idNum = Number(eq.id);
    const targetNum = Number(targetProductId);
    if (Number.isNaN(idNum) || Number.isNaN(targetNum)) {
      setImpactPreview(null);
      return;
    }
    let active = true;
    setLoadingImpact(true);
    const isDowngrade = (targetProduct?.pricePerDay ?? 0) < (currentProduct?.pricePerDay ?? 0);
    equipmentApi
      .xemAnhHuongThayDoi(idNum, {
        loaiThayDoi: isDowngrade ? "GiangCapThietBi" : "DieuChuyenSanPham",
        maSanPhamDich: targetNum,
      })
      .then((res) => {
        if (active) setImpactPreview(res);
      })
      .catch(() => {
        if (active) setImpactPreview(null);
      })
      .finally(() => {
        if (active) setLoadingImpact(false);
      });
    return () => {
      active = false;
    };
  }, [isRealApi, eq?.id, targetProductId, targetProduct?.pricePerDay, currentProduct?.pricePerDay]);

  const handleTransfer = async () => {
    if (!canTransfer || !eq) return;
    setError("");

    if (isRealApi) {
      const idNum = Number(eq.id);
      const targetNum = Number(targetProductId);
      if (Number.isNaN(idNum) || Number.isNaN(targetNum)) {
        return setError("Mã thiết bị hoặc sản phẩm đích không hợp lệ.");
      }
      setSubmitting(true);
      try {
        const isDowngrade = (targetProduct?.pricePerDay ?? 0) < (currentProduct?.pricePerDay ?? 0);
        const res = (isDowngrade
          ? await equipmentApi.deNghiGiangCap(idNum, { maSanPhamDich: targetNum, lyDo: reason.trim() })
          : await equipmentApi.deNghiDieuChuyenSanPham(idNum, { maSanPhamDich: targetNum, lyDo: reason.trim() })) as Record<string, any>;
        const maPhieu = res?.maPhieuDieuChinh ?? res?.duLieu?.maPhieuDieuChinh;
        if (typeof maPhieu === "number") {
          await equipmentApi.duyetDeNghiVongDoi(maPhieu);
          setResultNote("Đề nghị đã được duyệt và áp dụng ngay lập tức.");
        } else {
          setResultNote("Đề nghị chuyển loại đã được ghi nhận vào hệ thống.");
        }
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể thực hiện chuyển loại thiết bị.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const result = app.transferEquipment(eq.id, targetProductId);
    if (!result.ok) return setError(result.message);
    setResultNote("Khả dụng của hai sản phẩm đã được cập nhật.");
    setError("");
    setDone(true);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: "8px" }}>Chuyển loại sản phẩm cho thuê của thiết bị</h2>
      <p style={{ fontSize: "0.85rem", color: "#6B7280", marginBottom: "20px" }}>
        Cho phép chuyển thiết bị đã cũ sang sản phẩm cho thuê rẻ hơn (VD: Tiêu chuẩn → Tiết kiệm). Lịch sử nhập kho gốc được giữ nguyên.
      </p>

      {done ? (
        <div style={{ background: "#DCFCE7", borderRadius: "12px", padding: "24px", border: "1px solid #A7F3D0", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>✅</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-forest)", marginBottom: "8px" }}>Đã chuyển thành công!</h3>
          <p style={{ fontSize: "0.88rem", color: "#15803D", marginBottom: "4px" }}>Thiết bị <strong>{eq?.displayCode ?? equipId}</strong> nay thuộc <strong>{targetProduct?.name}</strong>.</p>
          <p style={{ fontSize: "0.78rem", color: "#15803D" }}>{resultNote || "Khả dụng của hai sản phẩm đã được cập nhật."}</p>
          <button onClick={() => { setDone(false); setEquipId(""); setTargetProductId(""); setReason(""); setResultNote(""); setImpactPreview(null); }}
            style={{ marginTop: "14px", background: "var(--color-forest)", color: "white", padding: "10px 22px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Chuyển thiết bị khác
          </button>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "20px" }}>
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>1. Chọn mã thiết bị</label>
              <select value={equipId} onChange={(e) => { setEquipId(e.target.value); setDone(false); }}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.88rem", background: "white" }}
              >
                <option value="">-- Chọn thiết bị sẵn sàng --</option>
                {app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").map((e) => {
                  const pname = app.products.find((p) => p.id === e.productId)?.name || e.productId;
                  return <option key={e.id} value={e.id}>{e.displayCode ?? e.id} — {pname} — {e.condition}</option>;
                })}
              </select>
            </div>

            {eq && (
              <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#9CA3AF" }}>Sản phẩm hiện tại</span>
                  <span style={{ fontWeight: 600 }}>{currentProduct?.name}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#9CA3AF" }}>Nguồn nhập ban đầu</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{origProduct?.name} · {eq.importReceiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#9CA3AF" }}>Điều kiện</span>
                  <span>{eq.condition} · {eq.rentCount} lần thuê</span>
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>2. Chọn sản phẩm mới</label>
              <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.88rem", background: "white" }}
                disabled={!eq}
              >
                <option value="">-- Chọn sản phẩm đích --</option>
                {app.products.filter((p) => p.id !== eq?.productId && p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {fmt(p.pricePerDay)}/ngày</option>
                ))}
              </select>
            </div>

            {eq && targetProduct && targetProduct.pricePerDay > (currentProduct?.pricePerDay || 0) && (
              <div style={{ background: "#FEE2E2", borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem", color: "#DC2626", border: "1px solid #FECACA" }}>
                ⚠ Sản phẩm đích có giá cao hơn sản phẩm hiện tại. Thường chỉ chuyển từ tiêu chuẩn xuống tiết kiệm.
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "5px" }}>3. Lý do chuyển loại</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="VD: Thiết bị đã qua 20+ lần thuê, độ mòn đáng kể, chuyển về sản phẩm Tiết kiệm"
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.85rem", resize: "none" }}
              />
            </div>

            {/* Impact preview */}
            {eq && targetProduct && (
              <div style={{ background: impactPreview && !impactPreview.coTheApDungHienTai ? "#FEF2F2" : "#EFF6FF", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem", color: impactPreview && !impactPreview.coTheApDungHienTai ? "#991B1B" : "#1E40AF" }}>
                <strong>Ảnh hưởng {loadingImpact ? "(Đang kiểm tra lịch đặt...)" : ""}:</strong>
                <div className="flex flex-col gap-1 mt-1">
                  <div>· Sản phẩm <strong>{currentProduct?.name}</strong>: khả dụng {app.getAvailable(eq.productId)} → {Math.max(0, app.getAvailable(eq.productId) - 1)} chiếc</div>
                  <div>· Sản phẩm <strong>{targetProduct.name}</strong>: khả dụng {app.getAvailable(targetProductId)} → {app.getAvailable(targetProductId) + 1} chiếc</div>
                  <div>· Lịch sử nhập kho ({eq.importReceiptId}) được giữ nguyên</div>
                  {impactPreview?.vuongMac?.map((vm, i) => (
                    <div key={`vm-${i}`} style={{ color: "#B91C1C", fontWeight: 600 }}>⚠ {vm}</div>
                  ))}
                  {impactPreview?.thieuSoLuongTheoLich?.map((ts, i) => (
                    <div key={`ts-${i}`} style={{ color: "#B45309" }}>• {ts}</div>
                  ))}
                </div>
              </div>
            )}

          {error && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", borderRadius: 8, padding: 10, fontSize: "0.8rem" }}>{error}</div>}
          <button
              disabled={!canTransfer || submitting}
              onClick={handleTransfer}
              style={{ background: canTransfer && !submitting ? "var(--color-forest)" : "#9CA3AF", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: canTransfer && !submitting ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem" }}
            >
              {submitting ? "Đang gửi yêu cầu..." : "✓ Xác nhận chuyển loại thiết bị"}
            </button>
            {!canTransfer && equipId && <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Thiếu sản phẩm đích, lý do, hoặc đang có vướng mắc lịch đặt. Chỉ chuyển được thiết bị đang Sẵn sàng.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Tab (UC7.8: Bộ lọc NCC, Trạng thái & Khoảng ngày) ───────────
