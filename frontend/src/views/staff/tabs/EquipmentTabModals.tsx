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
        <div className="so-modal-overlay">
          <div className="so-modal-card-500">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="so-modal-tag is-amber">
                  UC6.12: TẠO PHIẾU BẢO TRÌ
                </span>
                <h3 className="so-modal-title-md">
                  Lập phiếu sửa chữa thiết bị
                </h3>
              </div>
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} className="so-modal-close-sm">✕</button>
            </div>

            <div className="so-field-group">
              <label className="so-field-label">Thiết bị cần bảo trì:</label>
              <select
                value={createMaintEquipId}
                onChange={(e) => setCreateMaintEquipId(e.target.value)}
                className="so-input"
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

            <div className="so-field-group">
              <label className="so-field-label">Mô tả lỗi / Hư hỏng chi tiết:</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Rách đường chỉ may bạt nóc 10cm, chốt khoá bị kẹt..."
                value={createMaintIssue}
                onChange={(e) => setCreateMaintIssue(e.target.value)}
                className="so-textarea-v"
              />
            </div>

            <div className="so-modal-grid-2">
              <div>
                <label className="so-field-label">Chi phí dự tính (đ):</label>
                <input
                  type="number"
                  value={createMaintCost}
                  onChange={(e) => setCreateMaintCost(Number(e.target.value))}
                  className="so-input-mono"
                />
              </div>
              <div>
                <label className="so-field-label">Đơn liên quan (nếu có):</label>
                <input
                  placeholder="Ví dụ: ORD-001"
                  value={createMaintOrderId}
                  onChange={(e) => setCreateMaintOrderId(e.target.value)}
                  className="so-input-mono"
                />
              </div>
            </div>

            <div className="so-field-group-lg">
              <label className="so-field-label">Ghi chú điều phối:</label>
              <input
                placeholder="Ví dụ: Gửi sang xưởng sửa chữa lều Q8..."
                value={createMaintNote}
                onChange={(e) => setCreateMaintNote(e.target.value)}
                className="so-input"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} className="so-btn-cancel-md">
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
                className="so-btn-primary-md"
              >
                ✓ Tạo phiếu bảo trì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.13: Modal Nghiệm Thu Bảo Trì */}
      {acceptingMaintenance && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-480">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="so-modal-tag is-green">
                  UC6.13: NGHIỆM THU BẢO TRÌ
                </span>
                <h3 className="so-modal-title-md">
                  Nghiệm thu phiếu: {acceptingMaintenance.id}
                </h3>
              </div>
              <button type="button" onClick={() => setAcceptingMaintenance(null)} className="so-modal-close-sm">✕</button>
            </div>

            <div className="so-info-box">
              <div>Thiết bị: <strong className="so-td-mono-plain">{acceptingMaintenance.equipmentId}</strong></div>
              <div>Lỗi ban đầu: <strong>{acceptingMaintenance.issueDescription}</strong></div>
              <div>Dự tính: <strong>{fmt(acceptingMaintenance.estimatedCost)}</strong></div>
            </div>

            <div className="so-field-group">
              <label className="so-field-label">Chi phí sửa chữa thực tế (đ):</label>
              <input
                type="number"
                value={actualRepairCost}
                onChange={(e) => setActualRepairCost(Number(e.target.value))}
                className="so-input-mono-bold"
              />
            </div>

            <div className="so-field-group-md">
              <label className="so-field-label-bold">Kết quả nghiệm thu:</label>
              <div className="flex flex-col gap-2">
                <label className="so-radio-label">
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Hoàn tất"}
                    onChange={() => setRepairOutcome("Hoàn tất")}
                    className="so-radio-forest"
                  />
                  <span>✓ <strong>Đạt chuẩn</strong> — Thiết bị hoạt động tốt, đưa về kho <strong>Sẵn sàng</strong></span>
                </label>
                <label className="so-radio-label">
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Không thể sửa"}
                    onChange={() => setRepairOutcome("Không thể sửa")}
                    className="so-radio-danger"
                  />
                  <span className="so-text-danger">✕ <strong>Không thể sửa</strong> — Hư hỏng nặng, chuyển sang <strong>Ngừng sử dụng</strong></span>
                </label>
              </div>
            </div>

            <div className="so-field-group-lg">
              <label className="so-field-label">Ghi chú nghiệm thu:</label>
              <input
                value={repairOutcomeNote}
                onChange={(e) => setRepairOutcomeNote(e.target.value)}
                className="so-input"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAcceptingMaintenance(null)} className="so-btn-cancel-md">
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
                /* Đổi màu nút xác nhận theo kết quả nghiệm thu (Đạt chuẩn vs Không thể sửa) */
                className={`so-btn-confirm-outcome ${repairOutcome === "Hoàn tất" ? "is-forest" : "is-danger"}`}
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
        <div className="so-modal-overlay">
          <div className="so-modal-card-540">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="so-modal-tag is-blue">
                  UC6.9: CHI TIẾT & LỊCH BẬN THIẾT BỊ
                </span>
                <h3 className="so-modal-title-sm">
                  {viewingEquipDetail.detail?.maThietBiHienThi || viewingEquipDetail.equip.displayCode || viewingEquipDetail.equip.id}
                </h3>
              </div>
              <button type="button" onClick={() => setViewingEquipDetail(null)} className="so-modal-close-sm">✕</button>
            </div>
            {viewingEquipDetail.loading ? (
              <div className="so-loading-center">Đang tải chi tiết và lịch bận...</div>
            ) : (
              <div>
                <div className="so-info-box-sm">
                  <div>Trạng thái: <strong>{viewingEquipDetail.detail?.trangThaiSuDung || viewingEquipDetail.equip.equipmentStatus}</strong></div>
                  <div>Tình trạng: <strong>{viewingEquipDetail.detail?.tinhTrang || viewingEquipDetail.equip.condition}</strong></div>
                  {viewingEquipDetail.detail?.ngayNhap && (
                    <div>Ngày nhập: <strong>{new Date(viewingEquipDetail.detail.ngayNhap).toLocaleDateString("vi-VN")}</strong></div>
                  )}
                </div>
                <strong className="so-schedule-heading">
                  Lịch phân công / giữ chỗ ({viewingEquipDetail.schedule.length}):
                </strong>
                {viewingEquipDetail.schedule.length === 0 ? (
                  <div className="so-schedule-empty">Hiện không có lịch phân công nào.</div>
                ) : (
                  <div className="flex flex-col gap-2 so-schedule-list">
                    {viewingEquipDetail.schedule.map((sch) => (
                      <div key={sch.maPhanCong} className="so-schedule-item">
                        <span>Đơn <strong>#{sch.maDonThue}</strong> · {new Date(sch.tuNgay).toLocaleDateString("vi-VN")} → {new Date(sch.denNgay).toLocaleDateString("vi-VN")}</span>
                        <span className="so-schedule-status">{sch.trangThai}</span>
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
        <div className="so-modal-overlay">
          <div className="so-modal-card-440">
            <h3 className="so-modal-title-10">
              Phân công xử lý phiếu {assignMaintTarget.id}
            </h3>
            <label className="so-field-label">Mã nhân viên xử lý:</label>
            <input
              type="number"
              min={1}
              value={assignHandlerId}
              onChange={(e) => setAssignHandlerId(Number(e.target.value))}
              className="so-input-mb10"
            />
            <label className="so-field-label">Ghi chú / Lý do:</label>
            <input
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="Giao kỹ thuật viên kiểm tra..."
              className="so-input-mb14-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignMaintTarget(null)} className="so-btn-cancel-modal">Hủy</button>
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
                className="so-btn-primary-modal"
              >
                {equipBusy ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.12: Modal Cập nhật tiến độ bảo trì */}
      {progressMaintTarget && (
        <div className="so-modal-overlay">
          <div className="so-modal-card-440">
            <h3 className="so-modal-title-10">
              Cập nhật tiến độ phiếu {progressMaintTarget.id}
            </h3>
            <label className="so-field-label">Kết quả / Tiến độ xử lý:</label>
            <textarea
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Đã thay khóa kéo và vệ sinh..."
              className="so-input-mb10"
            />
            <label className="so-field-label">Chi phí phát sinh (đ):</label>
            <input
              type="number"
              min={0}
              value={progressCost}
              onChange={(e) => setProgressCost(Number(e.target.value))}
              className="so-input-mb14-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setProgressMaintTarget(null)} className="so-btn-cancel-modal">Hủy</button>
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
                className="so-btn-amber-modal"
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
