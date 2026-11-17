import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi, type ThietBiBackend, type PhanCongLichThietBiBackend } from "../../../services/api";
import { fmt, Equipment, ImportReceipt, MaintenanceReceipt, Supplier } from "../../../store";

import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";

interface EquipmentTabModalsProps {
  app: ReturnType<typeof useApp>;
  showCreateMaintenanceModal: boolean;
  setShowCreateMaintenanceModal: (v: boolean) => void;
  createMaintEquipId: string;
  setCreateMaintEquipId: (v: string) => void;
  createMaintIssue: string;
  setCreateMaintIssue: (v: string) => void;
  createMaintCost: number;
  setCreateMaintCost: (v: number) => void;
  createMaintOrderId: string;
  setCreateMaintOrderId: (v: string) => void;
  createMaintNote: string;
  setCreateMaintNote: (v: string) => void;
  acceptingMaintenance: MaintenanceReceipt | null;
  setAcceptingMaintenance: (v: MaintenanceReceipt | null) => void;
  repairOutcome: "Hoàn tất" | "Không thể sửa";
  setRepairOutcome: (v: "Hoàn tất" | "Không thể sửa") => void;
  actualRepairCost: number;
  setActualRepairCost: (v: number) => void;
  repairOutcomeNote: string;
  setRepairOutcomeNote: (v: string) => void;
  equipBusy: boolean;
  setEquipBusy: (v: boolean) => void;
  setEquipError: (v: string | null) => void;
  setEquipSuccess: (v: string | null) => void;
  transferModal: Equipment | null;
  setTransferModal: (v: Equipment | null) => void;
  targetProductId: string;
  setTargetProductId: (v: string) => void;
  viewingLifecycle: Equipment | null;
  setViewingLifecycle: (v: Equipment | null) => void;
  showAuditModal: boolean;
  setShowAuditModal: (v: boolean) => void;
  inspectingImportReceipt: ImportReceipt | null;
  setInspectingImportReceipt: (v: ImportReceipt | null) => void;
  viewingSupplierProfile: Supplier | null;
  setViewingSupplierProfile: (v: Supplier | null) => void;
  viewingEquipDetail: {
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null;
  setViewingEquipDetail: (v: {
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null) => void;
  assignMaintTarget: MaintenanceReceipt | null;
  setAssignMaintTarget: (v: MaintenanceReceipt | null) => void;
  assignHandlerId: number;
  setAssignHandlerId: (v: number) => void;
  assignReason: string;
  setAssignReason: (v: string) => void;
  progressMaintTarget: MaintenanceReceipt | null;
  setProgressMaintTarget: (v: MaintenanceReceipt | null) => void;
  progressCost: number;
  setProgressCost: (v: number) => void;
  progressNote: string;
  setProgressNote: (v: string) => void;
}

export function EquipmentTabModals(props: EquipmentTabModalsProps) {
  const {
    app,
    showCreateMaintenanceModal,
    setShowCreateMaintenanceModal,
    createMaintEquipId,
    setCreateMaintEquipId,
    createMaintIssue,
    setCreateMaintIssue,
    createMaintCost,
    setCreateMaintCost,
    createMaintOrderId,
    setCreateMaintOrderId,
    createMaintNote,
    setCreateMaintNote,
    acceptingMaintenance,
    setAcceptingMaintenance,
    repairOutcome,
    setRepairOutcome,
    actualRepairCost,
    setActualRepairCost,
    repairOutcomeNote,
    setRepairOutcomeNote,
    equipBusy,
    setEquipBusy,
    setEquipError,
    setEquipSuccess,
    transferModal,
    setTransferModal,
    targetProductId,
    setTargetProductId,
    viewingLifecycle,
    setViewingLifecycle,
    showAuditModal,
    setShowAuditModal,
    inspectingImportReceipt,
    setInspectingImportReceipt,
    viewingSupplierProfile,
    setViewingSupplierProfile,
    viewingEquipDetail,
    setViewingEquipDetail,
    assignMaintTarget,
    setAssignMaintTarget,
    assignHandlerId,
    setAssignHandlerId,
    assignReason,
    setAssignReason,
    progressMaintTarget,
    setProgressMaintTarget,
    progressCost,
    setProgressCost,
    progressNote,
    setProgressNote,
  } = props;
  return (
    <>
      {/* UC6.12: Modal Tạo Phiếu Bảo Trì */}
      {showCreateMaintenanceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 500, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC6.12: TẠO PHIẾU BẢO TRÌ
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Lập phiếu sửa chữa thiết bị
                </h3>
              </div>
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Thiết bị cần bảo trì:</label>
              <select
                value={createMaintEquipId}
                onChange={(e) => setCreateMaintEquipId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem", background: "white" }}
              >
                {app.equipment.filter((e) => e.equipmentStatus !== "Ngừng sử dụng").map((e) => {
                  const p = app.products.find((prod) => prod.id === e.productId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.displayCode || e.id} - {p?.name} (Hiện tại: {e.equipmentStatus})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Mô tả lỗi / Hư hỏng chi tiết:</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Rách đường chỉ may bạt nóc 10cm, chốt khoá bị kẹt..."
                value={createMaintIssue}
                onChange={(e) => setCreateMaintIssue(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem", resize: "vertical" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-12">
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Chi phí dự tính (đ):</label>
                <input
                  type="number"
                  value={createMaintCost}
                  onChange={(e) => setCreateMaintCost(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Đơn liên quan (nếu có):</label>
                <input
                  placeholder="Ví dụ: ORD-001"
                  value={createMaintOrderId}
                  onChange={(e) => setCreateMaintOrderId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú điều phối:</label>
              <input
                placeholder="Ví dụ: Gửi sang xưởng sửa chữa lều Q8..."
                value={createMaintNote}
                onChange={(e) => setCreateMaintNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                disabled={!createMaintEquipId || !createMaintIssue.trim()}
                onClick={async () => {
                  const selectedEquip = app.equipment.find((eq) => eq.id === createMaintEquipId);
                  const now = new Date().toLocaleString("vi-VN");
                  setEquipError(null);
                  setEquipSuccess(null);

                  if (app.realApi || isRealApiEnabled()) {
                    setEquipBusy(true);
                    try {
                      const equipIdNum = Number(selectedEquip?.id ?? createMaintEquipId) || parseInt(createMaintEquipId.replace(/\D/g, ""), 10);
                      const orderIdNum = createMaintOrderId && !isNaN(Number(createMaintOrderId)) ? Number(createMaintOrderId) : undefined;
                      if (!equipIdNum) {
                        throw new Error("Không xác định được mã thiết bị hợp lệ.");
                      }
                      const moTaDayDu = createMaintNote.trim()
                        ? `${createMaintIssue.trim()} (${createMaintNote.trim()})`
                        : createMaintIssue.trim();
                      const res = await equipmentApi.lapPhieuBaoTri({
                        maThietBi: equipIdNum,
                        maDonThue: orderIdNum,
                        loaiXuLy: "SuaChua",
                        moTaLoi: moTaDayDu,
                        mucDo: "Nhe",
                      });
                      await app.refreshEquipment?.();
                      setEquipSuccess(`Đã tạo phiếu bảo trì ${res?.maPhieuBaoTri ? `BT-${res.maPhieuBaoTri}` : ""} trên máy chủ.`);
                      setCreateMaintIssue("");
                      setCreateMaintNote("");
                      setShowCreateMaintenanceModal(false);
                    } catch (err) {
                      setEquipError(err instanceof Error ? err.message : "Lỗi lập phiếu bảo trì trên máy chủ.");
                    } finally {
                      setEquipBusy(false);
                    }
                    return;
                  }

                  app.saveMaintenanceReceipt({
                    id: `BT-${Date.now().toString().slice(-6)}`,
                    equipmentId: createMaintEquipId,
                    issueDescription: createMaintIssue.trim(),
                    estimatedCost: createMaintCost,
                    orderId: createMaintOrderId.trim() || undefined,
                    createdAt: now,
                    status: "Đang bảo dưỡng",
                    note: createMaintNote.trim(),
                  });
                  setEquipSuccess("Đã tạo phiếu bảo trì.");
                  setCreateMaintIssue("");
                  setCreateMaintNote("");
                  setShowCreateMaintenanceModal(false);
                }}
                style={{
                  background: (!createMaintEquipId || !createMaintIssue.trim()) ? "#9CA3AF" : "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: (!createMaintEquipId || !createMaintIssue.trim()) ? "not-allowed" : "pointer",
                }}
              >
                ✓ Tạo phiếu bảo trì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.13: Modal Nghiệm Thu Bảo Trì */}
      {acceptingMaintenance && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC6.13: NGHIỆM THU BẢO TRÌ
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Nghiệm thu phiếu: {acceptingMaintenance.id}
                </h3>
              </div>
              <button type="button" onClick={() => setAcceptingMaintenance(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: "0.82rem" }}>
              <div>Thiết bị: <strong style={{ fontFamily: "var(--font-mono)" }}>{acceptingMaintenance.equipmentId}</strong></div>
              <div>Lỗi ban đầu: <strong>{acceptingMaintenance.issueDescription}</strong></div>
              <div>Dự tính: <strong>{fmt(acceptingMaintenance.estimatedCost)}</strong></div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Chi phí sửa chữa thực tế (đ):</label>
              <input
                type="number"
                value={actualRepairCost}
                onChange={(e) => setActualRepairCost(Number(e.target.value))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.95rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Kết quả nghiệm thu:</label>
              <div className="flex flex-col gap-2">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Hoàn tất"}
                    onChange={() => setRepairOutcome("Hoàn tất")}
                    style={{ accentColor: "var(--color-forest)" }}
                  />
                  <span>✓ <strong>Đạt chuẩn</strong> — Thiết bị hoạt động tốt, đưa về kho <strong>Sẵn sàng</strong></span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Không thể sửa"}
                    onChange={() => setRepairOutcome("Không thể sửa")}
                    style={{ accentColor: "#DC2626" }}
                  />
                  <span style={{ color: "#DC2626" }}>✕ <strong>Không thể sửa</strong> — Hư hỏng nặng, chuyển sang <strong>Ngừng sử dụng</strong></span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú nghiệm thu:</label>
              <input
                value={repairOutcomeNote}
                onChange={(e) => setRepairOutcomeNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAcceptingMaintenance(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  setEquipError(null);
                  setEquipSuccess(null);

                  if (app.realApi || isRealApiEnabled()) {
                    setEquipBusy(true);
                    try {
                      const maintIdNum = Number(acceptingMaintenance.id) || parseInt(acceptingMaintenance.id.replace(/\D/g, ""), 10);
                      if (!maintIdNum) {
                        throw new Error("Không tìm thấy mã phiếu bảo trì hợp lệ.");
                      }
                      if (repairOutcome === "Hoàn tất") {
                        await equipmentApi.xacNhanHoanThanh(maintIdNum, {
                          ketQuaKiemTra: repairOutcomeNote || "Đạt chuẩn kỹ thuật",
                          chiPhi: actualRepairCost,
                          lyDo: repairOutcomeNote || "Nghiệm thu đạt chuẩn, đưa về kho Sẵn sàng",
                        });
                      } else {
                        await equipmentApi.ketThucKhongDat(maintIdNum, {
                          ketQuaKiemTra: repairOutcomeNote || "Không thể sửa",
                          chiPhi: actualRepairCost,
                          lyDo: repairOutcomeNote || "Hư hỏng nặng không thể phục hồi",
                        });
                      }
                      await app.refreshEquipment?.();
                      setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.id}.`);
                      setAcceptingMaintenance(null);
                    } catch (err) {
                      setEquipError(err instanceof Error ? err.message : "Lỗi nghiệm thu phiếu bảo trì trên máy chủ.");
                    } finally {
                      setEquipBusy(false);
                    }
                    return;
                  }

                  app.updateMaintenanceStatus(
                    acceptingMaintenance.id,
                    repairOutcome,
                    actualRepairCost,
                    repairOutcomeNote
                  );
                  setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.id}.`);
                  setAcceptingMaintenance(null);
                }}
                style={{ background: repairOutcome === "Hoàn tất" ? "var(--color-forest)" : "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                ✓ Xác nhận nghiệm thu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC7.7: Modal Kiểm nhận hàng thực tế cho nhân viên kho */}
      {inspectingImportReceipt && (
        <GoodsReceivingModal
          receipt={inspectingImportReceipt}
          app={app}
          onClose={() => setInspectingImportReceipt(null)}
          onSuccess={() => setInspectingImportReceipt(null)}
        />
      )}

      {/* UC7.3: Modal Hồ sơ Nhà Cung Cấp */}
      {viewingSupplierProfile && (
        <SupplierProfileModal
          supplier={viewingSupplierProfile}
          app={app}
          onClose={() => setViewingSupplierProfile(null)}
        />
      )}

      {/* UC6.9: Modal Chi tiết & Lịch bận thiết bị */}
      {viewingEquipDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 22 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DBEAFE", color: "#1D4ED8", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC6.9: CHI TIẾT & LỊCH BẬN THIẾT BỊ
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  {viewingEquipDetail.detail?.maThietBiHienThi || viewingEquipDetail.equip.displayCode || viewingEquipDetail.equip.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingEquipDetail(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            {viewingEquipDetail.loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>Đang tải chi tiết và lịch bận...</div>
            ) : (
              <div>
                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: "0.82rem" }}>
                  <div>Trạng thái: <strong>{viewingEquipDetail.detail?.trangThaiSuDung || viewingEquipDetail.equip.equipmentStatus}</strong></div>
                  <div>Tình trạng: <strong>{viewingEquipDetail.detail?.tinhTrang || viewingEquipDetail.equip.condition}</strong></div>
                  {viewingEquipDetail.detail?.ngayNhap && (
                    <div>Ngày nhập: <strong>{new Date(viewingEquipDetail.detail.ngayNhap).toLocaleDateString("vi-VN")}</strong></div>
                  )}
                </div>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)", display: "block", marginBottom: 6 }}>
                  Lịch phân công / giữ chỗ ({viewingEquipDetail.schedule.length}):
                </strong>
                {viewingEquipDetail.schedule.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "#6B7280", fontStyle: "italic" }}>Hiện không có lịch phân công nào.</div>
                ) : (
                  <div className="flex flex-col gap-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                    {viewingEquipDetail.schedule.map((sch) => (
                      <div key={sch.maPhanCong} style={{ border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", display: "flex", justifyContent: "space-between" }}>
                        <span>Đơn <strong>#{sch.maDonThue}</strong> · {new Date(sch.tuNgay).toLocaleDateString("vi-VN")} → {new Date(sch.denNgay).toLocaleDateString("vi-VN")}</span>
                        <span style={{ fontWeight: 700, color: "#1D4ED8" }}>{sch.trangThai}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* UC6.12: Modal Phân công xử lý bảo trì */}
      {assignMaintTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 440, width: "100%", padding: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", marginBottom: 10 }}>
              Phân công xử lý phiếu {assignMaintTarget.id}
            </h3>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Mã nhân viên xử lý:</label>
            <input
              type="number"
              min={1}
              value={assignHandlerId}
              onChange={(e) => setAssignHandlerId(Number(e.target.value))}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", marginBottom: 10 }}
            />
            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú / Lý do:</label>
            <input
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="Giao kỹ thuật viên kiểm tra..."
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", marginBottom: 14 }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignMaintTarget(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>Hủy</button>
              <button
                type="button"
                disabled={equipBusy}
                onClick={async () => {
                  setEquipBusy(true);
                  setEquipError(null);
                  try {
                    const maintIdNum = Number(assignMaintTarget.id) || parseInt(assignMaintTarget.id.replace(/\D/g, ""), 10);
                    await equipmentApi.phanCongXuLy(maintIdNum, { maNguoiXuLy: assignHandlerId, lyDo: assignReason.trim() || undefined });
                    await app.refreshEquipment?.();
                    setEquipSuccess(`Đã phân công xử lý phiếu ${assignMaintTarget.id}.`);
                    setAssignMaintTarget(null);
                  } catch (err) {
                    setEquipError(err instanceof Error ? err.message : "Không thể phân công xử lý.");
                  } finally {
                    setEquipBusy(false);
                  }
                }}
                style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer" }}
              >
                {equipBusy ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.12: Modal Cập nhật tiến độ bảo trì */}
      {progressMaintTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 440, width: "100%", padding: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", marginBottom: 10 }}>
              Cập nhật tiến độ phiếu {progressMaintTarget.id}
            </h3>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Kết quả / Tiến độ xử lý:</label>
            <textarea
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Đã thay khóa kéo và vệ sinh..."
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", marginBottom: 10 }}
            />
            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Chi phí phát sinh (đ):</label>
            <input
              type="number"
              min={0}
              value={progressCost}
              onChange={(e) => setProgressCost(Number(e.target.value))}
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", marginBottom: 14 }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setProgressMaintTarget(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>Hủy</button>
              <button
                type="button"
                disabled={equipBusy}
                onClick={async () => {
                  setEquipBusy(true);
                  setEquipError(null);
                  try {
                    const maintIdNum = Number(progressMaintTarget.id) || parseInt(progressMaintTarget.id.replace(/\D/g, ""), 10);
                    await equipmentApi.capNhatTienDo(maintIdNum, { ketQua: progressNote.trim() || undefined, chiPhi: progressCost });
                    await app.refreshEquipment?.();
                    setEquipSuccess(`Đã cập nhật tiến độ phiếu ${progressMaintTarget.id}.`);
                    setProgressMaintTarget(null);
                  } catch (err) {
                    setEquipError(err instanceof Error ? err.message : "Không thể cập nhật tiến độ.");
                  } finally {
                    setEquipBusy(false);
                  }
                }}
                style={{ background: "var(--color-amber)", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer" }}
              >
                {equipBusy ? "Đang lưu..." : "Lưu tiến độ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
