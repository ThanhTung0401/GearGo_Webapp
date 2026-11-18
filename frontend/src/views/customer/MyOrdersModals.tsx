import type { AppState } from "../../context/AppContext";
import type { Order, Surcharge } from "../../store";
import type { XemTruocHuyBackend } from "../../services/api";
import { OrderDisputeModal } from "./orders/OrderDisputeModal";
import { OrderRecordModals } from "./orders/OrderRecordModals";
import { OrderCancelModal } from "./orders/OrderCancelModal";

export interface MyOrdersModalsProps {
  app: AppState;
  detail: Order | undefined;
  disputeSurchargeTarget: Surcharge | null;
  setDisputeSurchargeTarget: (v: Surcharge | null) => void;
  disputeReason: string;
  setDisputeReason: (v: string) => void;
  disputeSubmitting: boolean;
  setDisputeSubmitting: (v: boolean) => void;
  actionError: string;
  setActionError: (v: string) => void;
  refreshOrderById: (id: string | number) => Promise<void>;
  viewingRecord: "bbbg" | "pnt" | "reconciliation" | null;
  setViewingRecord: (v: "bbbg" | "pnt" | "reconciliation" | null) => void;
  cancelling: string | null;
  setCancelling: (v: string | null) => void;
  cancellingOrder: Order | null | undefined;
  cancelPreview: XemTruocHuyBackend | null;
  localCancellationQuote: ReturnType<AppState["getCancellationQuote"]> | null;
  cancelPreviewLoading: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  cancelSubmitting: boolean;
  handleConfirmCancel: () => Promise<void>;
}

/**
 * Bộ modal tương tác của trang Đơn thuê của tôi: khiếu nại phụ phí, xem chứng từ (BBBG/PNT/Đối soát) và hủy đơn.
 */
export function MyOrdersModals({
  app,
  detail,
  disputeSurchargeTarget,
  setDisputeSurchargeTarget,
  disputeReason,
  setDisputeReason,
  disputeSubmitting,
  setDisputeSubmitting,
  actionError,
  setActionError,
  refreshOrderById,
  viewingRecord,
  setViewingRecord,
  cancelling,
  setCancelling,
  cancellingOrder,
  cancelPreview,
  localCancellationQuote,
  cancelPreviewLoading,
  cancelReason,
  setCancelReason,
  cancelSubmitting,
  handleConfirmCancel,
}: MyOrdersModalsProps) {
  return (
    <>
      {disputeSurchargeTarget && detail && (
        <OrderDisputeModal
          app={app}
          detail={detail}
          disputeSurchargeTarget={disputeSurchargeTarget}
          setDisputeSurchargeTarget={setDisputeSurchargeTarget}
          disputeReason={disputeReason}
          setDisputeReason={setDisputeReason}
          disputeSubmitting={disputeSubmitting}
          setDisputeSubmitting={setDisputeSubmitting}
          actionError={actionError}
          setActionError={setActionError}
          refreshOrderById={refreshOrderById}
        />
      )}

      <OrderRecordModals
        detail={detail}
        viewingRecord={viewingRecord}
        setViewingRecord={setViewingRecord}
      />

      {cancelling && cancellingOrder && (cancelPreview || localCancellationQuote) && (
        <OrderCancelModal
          realApi={Boolean(app.realApi)}
          cancellingOrder={cancellingOrder}
          cancelPreview={cancelPreview}
          localCancellationQuote={localCancellationQuote}
          cancelPreviewLoading={cancelPreviewLoading}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          cancelSubmitting={cancelSubmitting}
          actionError={actionError}
          onClose={() => setCancelling(null)}
          handleConfirmCancel={handleConfirmCancel}
        />
      )}
    </>
  );
}
