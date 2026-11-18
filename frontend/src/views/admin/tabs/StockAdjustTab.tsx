import { useApp } from "../../../context/AppContext";
import { useStockAdjustTab } from "./stockAdjust/useStockAdjustTab";
import { StockAdjustTable } from "./stockAdjust/StockAdjustTable";
import { StockAdjustModals } from "./stockAdjust/StockAdjustModals";

/**
 * Tab Kiểm kê & Điều chỉnh kho (UC6.10 & UC6.11).
 */
export function StockAdjustTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useStockAdjustTab(app);

  return (
    <div>
      <StockAdjustTable
        isRealApi={vm.isRealApi}
        tabMessage={vm.tabMessage}
        displayedAdjustments={vm.displayedAdjustments}
        actionLoadingId={vm.actionLoadingId}
        onOpenAuditModal={() => vm.setShowAuditModal(true)}
        onOpenManualModal={() => {
          vm.setShowModal(true);
          vm.setModalError("");
        }}
        onCheckImpact={(sa) => void vm.handleCheckImpact(sa)}
        onApprove={(sa) => void vm.handleApprove(sa)}
        onOpenReject={(saId) => {
          vm.setRejectingId(saId);
          vm.setRejectReasonInput("");
          vm.setRejectError("");
        }}
      />

      <StockAdjustModals
        app={app}
        showModal={vm.showModal}
        setShowModal={vm.setShowModal}
        selectedEquipId={vm.selectedEquipId}
        setSelectedEquipId={vm.setSelectedEquipId}
        currentEquip={vm.currentEquip}
        newStatus={vm.newStatus}
        setNewStatus={vm.setNewStatus}
        reason={vm.reason}
        setReason={vm.setReason}
        notes={vm.notes}
        setNotes={vm.setNotes}
        modalError={vm.modalError}
        submitting={vm.submitting}
        onSubmitManual={(e) => void vm.handleSubmit(e)}
        impactModal={vm.impactModal}
        setImpactModal={vm.setImpactModal}
        rejectingId={vm.rejectingId}
        setRejectingId={vm.setRejectingId}
        rejectReasonInput={vm.rejectReasonInput}
        setRejectReasonInput={vm.setRejectReasonInput}
        rejectError={vm.rejectError}
        actionLoadingId={vm.actionLoadingId}
        onRejectSubmit={(e) => void vm.handleRejectSubmit(e)}
        showAuditModal={vm.showAuditModal}
        setShowAuditModal={vm.setShowAuditModal}
        onAuditSubmitted={(createdId) => {
          void vm.loadRealAdjustments();
          vm.setTabMessage({ type: "success", text: `Đã lập phiếu kiểm kê #${createdId} và gửi duyệt thành công (UC6.10).` });
        }}
      />
    </div>
  );
}
