import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";
import { useAdjustmentsTab } from "./adjustments/useAdjustmentsTab";
import { PendingPaymentsTable } from "./adjustments/PendingPaymentsTable";
import { FinancialAdjustmentsTable } from "./adjustments/FinancialAdjustmentsTable";
import { AdjustmentsModals } from "./adjustments/AdjustmentsModals";

/**
 * Tab Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10).
 */
export function AdjustmentsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useAdjustmentsTab(app);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title">
            Điều chỉnh tài chính & Sai lệch phiếu nhập (UC5.7, UC7.10)
          </h2>
          <p className="adm-page-subtitle">
            Đối chiếu giao dịch thanh toán ngoại lệ, lập chứng từ bù trừ sau đối soát đơn hoặc xử lý sai lệch nhập kho.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {vm.realApi && (
            <button
              type="button"
              disabled={vm.payLoading}
              onClick={() => void vm.loadPendingPayments()}
              className="btn btn-secondary btn-md"
            >
              <span className="icon-label"><Icon name="refresh" size={14} /> Làm mới đối chiếu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              vm.setModalError("");
              vm.setShowModal(true);
            }}
            className="btn btn-primary btn-md"
          >
            + Lập chứng từ điều chỉnh
          </button>
        </div>
      </div>

      {vm.payError && (
        <div role="alert" className="adm-alert is-error mb-0">
          <Icon name="alert-circle" size={16} />
          <span>{vm.payError}</span>
        </div>
      )}

      {vm.paySuccess && (
        <div role="status" className="adm-alert is-success mb-0">
          <Icon name="check" size={16} />
          <span>{vm.paySuccess}</span>
        </div>
      )}

      {vm.realApi && (
        <PendingPaymentsTable
          pendingPayments={vm.pendingPayments}
          payLoading={vm.payLoading}
          onSelectReconcile={vm.openReconcileModal}
        />
      )}

      <FinancialAdjustmentsTable adjustments={app.financialAdjustments} />

      <AdjustmentsModals
        realApi={vm.realApi}
        orders={app.orders}
        importReceipts={app.importReceipts}
        reconcileTarget={vm.reconcileTarget}
        setReconcileTarget={vm.setReconcileTarget}
        reconcileOutcome={vm.reconcileOutcome}
        setReconcileOutcome={vm.setReconcileOutcome}
        reconcileNote={vm.reconcileNote}
        setReconcileNote={vm.setReconcileNote}
        reconcileRefundAmount={vm.reconcileRefundAmount}
        setReconcileRefundAmount={vm.setReconcileRefundAmount}
        reconcileBusy={vm.reconcileBusy}
        reconcileModalError={vm.reconcileModalError}
        onConfirmReconcilePayment={(e) => void vm.handleConfirmReconcilePayment(e)}
        showModal={vm.showModal}
        setShowModal={vm.setShowModal}
        type={vm.type}
        setType={vm.setType}
        amount={vm.amount}
        setAmount={vm.setAmount}
        orderId={vm.orderId}
        setOrderId={vm.setOrderId}
        importReceiptId={vm.importReceiptId}
        setImportReceiptId={vm.setImportReceiptId}
        reason={vm.reason}
        setReason={vm.setReason}
        orderDoiSoat={vm.orderDoiSoat}
        orderSurchargeIds={vm.orderSurchargeIds}
        selectedSurchargeId={vm.selectedSurchargeId}
        setSelectedSurchargeId={vm.setSelectedSurchargeId}
        orderLookupLoading={vm.orderLookupLoading}
        orderLookupError={vm.orderLookupError}
        modalError={vm.modalError}
        submitBusy={vm.submitBusy}
        onSubmitAdjustment={(e) => void vm.handleSubmit(e)}
      />
    </div>
  );
}
