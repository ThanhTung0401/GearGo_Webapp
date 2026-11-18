import { useApp } from "../../../../context/AppContext";
import { type ImportReceipt } from "../../../../store";
import { FormModal, FormActions } from "../../forms/FormModal";
import { ImportReceiptForm } from "../../forms/ImportReceiptForm";
import GoodsReceivingModal from "../../../../components/GoodsReceivingModal";
import ImportAdjustmentModal from "../../../../components/ImportAdjustmentModal";

interface InventoryActionModalsProps {
  app: ReturnType<typeof useApp>;
  editing: ImportReceipt | "new" | null;
  setEditing: (v: ImportReceipt | "new" | null) => void;
  cancellingReceipt: ImportReceipt | null;
  setCancellingReceipt: (v: ImportReceipt | null) => void;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  cancelError: string;
  cancelLoading: boolean;
  onCancelSubmit: (e: React.FormEvent) => void;
  rejectingAdj: { receiptId: string; adjId: string } | null;
  setRejectingAdj: (v: { receiptId: string; adjId: string } | null) => void;
  rejectAdjReason: string;
  setRejectAdjReason: (v: string) => void;
  adjLoadingId: string | null;
  onRejectAdjSubmit: (e: React.FormEvent) => void;
  inspectingReceipt: ImportReceipt | null;
  setInspectingReceipt: (v: ImportReceipt | null) => void;
  adjustingReceipt: ImportReceipt | null;
  setAdjustingReceipt: (v: ImportReceipt | null) => void;
  onInspectSuccess: () => void;
  onAdjustSuccess: (receiptId: string) => void;
}

/**
 * Tập hợp các modal thao tác của phân hệ Phiếu nhập hàng:
 * lập/sửa nháp, hủy nháp (UC7.9), kiểm nhận (UC7.7), đề nghị & từ chối điều chỉnh (UC7.10).
 */
export function InventoryActionModals({
  app,
  editing,
  setEditing,
  cancellingReceipt,
  setCancellingReceipt,
  cancelReason,
  setCancelReason,
  cancelError,
  cancelLoading,
  onCancelSubmit,
  rejectingAdj,
  setRejectingAdj,
  rejectAdjReason,
  setRejectAdjReason,
  adjLoadingId,
  onRejectAdjSubmit,
  inspectingReceipt,
  setInspectingReceipt,
  adjustingReceipt,
  setAdjustingReceipt,
  onInspectSuccess,
  onAdjustSuccess,
}: InventoryActionModalsProps) {
  return (
    <>
      {editing && <ImportReceiptForm app={app} receipt={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}

      {/* UC7.9: Modal hủy phiếu nhập nháp */}
      {cancellingReceipt && (
        <FormModal
          title={`Hủy phiếu nhập nháp: ${cancellingReceipt.displayCode ?? cancellingReceipt.id}`}
          description="Thao tác hủy nháp không làm thay đổi tồn kho và bắt buộc lưu lý do (UC7.9)."
          onClose={() => setCancellingReceipt(null)}
        >
          <form onSubmit={onCancelSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Lý do hủy phiếu (Bắt buộc)
              <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="VD: Nhà cung cấp báo hết hàng / Lập nhầm sản phẩm..." className="adm-field" />
            </label>
            {cancelError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{cancelError}</div>}
            <FormActions onClose={() => setCancellingReceipt(null)} loading={cancelLoading} submitLabel="Xác nhận hủy phiếu" />
          </form>
        </FormModal>
      )}

      {/* UC7.10: Modal từ chối đề nghị điều chỉnh phiếu nhập */}
      {rejectingAdj && (
        <FormModal
          title="Từ chối đề nghị điều chỉnh phiếu nhập"
          description="Nhập lý do từ chối để lưu vết kiểm toán (UC7.10)."
          onClose={() => setRejectingAdj(null)}
        >
          <form onSubmit={onRejectAdjSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Lý do từ chối
              <textarea rows={2} value={rejectAdjReason} onChange={(e) => setRejectAdjReason(e.target.value)} placeholder="Không đủ căn cứ chứng từ..." className="adm-field" />
            </label>
            <FormActions onClose={() => setRejectingAdj(null)} loading={adjLoadingId === rejectingAdj.adjId} submitLabel="Xác nhận từ chối" />
          </form>
        </FormModal>
      )}

      {/* UC7.7: Modal kiểm nhận hàng thực tế tại kho */}
      {inspectingReceipt && (
        <GoodsReceivingModal
          receipt={inspectingReceipt}
          app={app}
          onClose={() => setInspectingReceipt(null)}
          onSuccess={onInspectSuccess}
        />
      )}

      {/* UC7.10: Modal lập đề nghị điều chỉnh sau chốt */}
      {adjustingReceipt && (
        <ImportAdjustmentModal
          receipt={adjustingReceipt}
          app={app}
          onClose={() => setAdjustingReceipt(null)}
          onSuccess={() => onAdjustSuccess(adjustingReceipt.id)}
        />
      )}
    </>
  );
}
