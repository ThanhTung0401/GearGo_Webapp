import { useApp } from "../../../../context/AppContext";
import { type Equipment, type EquipmentStatus } from "../../../../store";
import { FormModal, FormActions } from "../../forms/FormModal";
import InventoryAuditModal from "../../../../components/InventoryAuditModal";
import { type ImpactModalState } from "./useStockAdjustTab";

interface StockAdjustModalsProps {
  app: ReturnType<typeof useApp>;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  selectedEquipId: string;
  setSelectedEquipId: (v: string) => void;
  currentEquip: Equipment | undefined;
  newStatus: EquipmentStatus;
  setNewStatus: (v: EquipmentStatus) => void;
  reason: string;
  setReason: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  modalError: string;
  submitting: boolean;
  onSubmitManual: (e: React.FormEvent) => void;
  impactModal: ImpactModalState | null;
  setImpactModal: (v: ImpactModalState | null) => void;
  rejectingId: string | null;
  setRejectingId: (v: string | null) => void;
  rejectReasonInput: string;
  setRejectReasonInput: (v: string) => void;
  rejectError: string;
  actionLoadingId: string | null;
  onRejectSubmit: (e: React.FormEvent) => void;
  showAuditModal: boolean;
  setShowAuditModal: (v: boolean) => void;
  onAuditSubmitted: (createdId: string | number) => void;
}

/**
 * Các modal thao tác của phân hệ Kiểm kê & Điều chỉnh kho:
 * lập phiếu thủ công, phân tích ảnh hưởng đơn tương lai (UC6.10.1), từ chối và kiểm kê (UC6.10).
 */
export function StockAdjustModals({
  app,
  showModal,
  setShowModal,
  selectedEquipId,
  setSelectedEquipId,
  currentEquip,
  newStatus,
  setNewStatus,
  reason,
  setReason,
  notes,
  setNotes,
  modalError,
  submitting,
  onSubmitManual,
  impactModal,
  setImpactModal,
  rejectingId,
  setRejectingId,
  rejectReasonInput,
  setRejectReasonInput,
  rejectError,
  actionLoadingId,
  onRejectSubmit,
  showAuditModal,
  setShowAuditModal,
  onAuditSubmitted,
}: StockAdjustModalsProps) {
  return (
    <>
      {showModal && (
        <FormModal title="Lập phiếu điều chỉnh kho sau kiểm kê" description="Cập nhật trực tiếp số lượng và trạng thái khả dụng của thiết bị trong kho." onClose={() => setShowModal(false)}>
          <form onSubmit={onSubmitManual} className="grid gap-4 mt-4">
            <label className="adm-label">
              Thiết bị cần điều chỉnh:
              <select value={selectedEquipId} onChange={(e) => setSelectedEquipId(e.target.value)} className="adm-field">
                <option value="">-- Chọn thiết bị trong kho --</option>
                {app.equipment.map((e) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.displayCode ?? e.id} — {p?.name} (Hiện tại: {e.equipmentStatus})
                    </option>
                  );
                })}
              </select>
            </label>

            {currentEquip && (
              <div className="adm-card--parchment text-[0.8rem]">
                Trạng thái hiện tại: <strong>{currentEquip.equipmentStatus}</strong> · Tình trạng: <strong>{currentEquip.condition}</strong>
              </div>
            )}

            <label className="adm-label">
              Trạng thái mới sau điều chỉnh:
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)} className="adm-field">
                <option value="Sẵn sàng">Sẵn sàng (Tìm thấy lại sau thất lạc)</option>
                <option value="Đang bảo trì">Đang bảo trì (Phát hiện hư hỏng lúc kiểm kho)</option>
                <option value="Thất lạc">Thất lạc (Mất mát kiểm kê chưa rõ nguyên nhân)</option>
                <option value="Ngừng sử dụng">Ngừng sử dụng (Hỏng hoàn toàn, không thể sửa)</option>
              </select>
            </label>

            <label className="adm-label">
              Lý do kiểm kê / đợt kiểm kê:
              <input placeholder="VD: Kiểm kê kho định kỳ" value={reason} onChange={(e) => setReason(e.target.value)} className="adm-field" />
            </label>

            <label className="adm-label">
              Ghi chú chi tiết nguyên nhân:
              <textarea placeholder="Mô tả nguyên nhân sai lệch..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="adm-field" />
            </label>

            {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{modalError}</div>}
            <FormActions onClose={() => setShowModal(false)} loading={submitting} />
          </form>
        </FormModal>
      )}

      {impactModal && (
        <FormModal
          title={`Phân tích ảnh hưởng điều chỉnh #${impactModal.sa.id} (UC6.10.1)`}
          description="Kiểm tra xung đột lịch đặt trước và đơn thuê tương lai trước khi phê duyệt điều chỉnh kho."
          onClose={() => setImpactModal(null)}
        >
          <div className="grid gap-3 mt-3">
            {impactModal.loading && (
              <div className="adm-loading-text mb-0">Đang phân tích ảnh hưởng lên đơn thuê tương lai...</div>
            )}
            {impactModal.error && (
              <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">
                {impactModal.error}
              </div>
            )}
            {impactModal.analysis && (
              <div className="grid gap-2.5 text-[0.82rem]">
                <div className={`adm-alert adm-alert--block mb-0 font-bold ${impactModal.analysis.coTheApDungHienTai ? "is-success" : "is-error"}`}>
                  {impactModal.analysis.coTheApDungHienTai
                    ? "✓ Có thể áp dụng điều chỉnh hiện tại."
                    : "⚠ Có xung đột / vướng mắc cần xử lý trước khi áp dụng."}
                </div>
                {impactModal.analysis.camKetCuThe.length > 0 && (
                  <div className="adm-card--soft p-2.5">
                    <strong>Cam kết đơn cụ thể:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.camKetCuThe.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {impactModal.analysis.thieuSoLuongTheoLich.length > 0 && (
                  <div className="adm-alert is-warning adm-alert--block mb-0">
                    <strong>Thiếu số lượng theo lịch:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.thieuSoLuongTheoLich.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {impactModal.analysis.vuongMac.length > 0 && (
                  <div className="adm-alert is-error adm-alert--block mb-0">
                    <strong>Vướng mắc:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.vuongMac.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setImpactModal(null)} className="btn btn-secondary btn-md">Đóng</button>
            </div>
          </div>
        </FormModal>
      )}

      {rejectingId && (
        <FormModal title={`Từ chối phiếu điều chỉnh #${rejectingId}`} description="Vui lòng nhập lý do từ chối đề nghị điều chỉnh kho (UC6.11)." onClose={() => setRejectingId(null)}>
          <form onSubmit={onRejectSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Lý do từ chối
              <textarea rows={3} value={rejectReasonInput} onChange={(e) => setRejectReasonInput(e.target.value)} placeholder="VD: Số liệu kiểm đếm chưa khớp biên bản..." className="adm-field" />
            </label>
            {rejectError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{rejectError}</div>}
            <FormActions onClose={() => setRejectingId(null)} loading={actionLoadingId === rejectingId} submitLabel="Xác nhận từ chối" />
          </form>
        </FormModal>
      )}

      {showAuditModal && (
        <InventoryAuditModal
          app={app}
          onClose={() => setShowAuditModal(false)}
          onAuditSubmitted={onAuditSubmitted}
        />
      )}
    </>
  );
}
