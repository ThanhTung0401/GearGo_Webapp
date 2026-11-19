import { useApp } from "../../context/AppContext";
import { Order } from "../../store";
import Icon from "../../components/Icon";
import ReconciliationSheet from "./ReconciliationSheet";
import { ReturnTabModals } from "./ReturnTabModals";
import { useReturnTab } from "./return/useReturnTab";
import { ReturnQueuePanel } from "./return/ReturnQueuePanel";
import { ReturnOverdueBanner } from "./return/ReturnOverdueBanner";
import { ReturnInspectionForm } from "./return/ReturnInspectionForm";
import { ReturnHistoryPanel } from "./return/ReturnHistoryPanel";
import { ReturnSurchargePanel } from "./return/ReturnSurchargePanel";

// Tab Nhận trả nhiều đợt & Trả 1 phần (UC4.3), Xử lý quá hạn & Nhật ký gọi khách (UC4.4)
export function ReturnTab({
  app,
  selectedOrder,
  setSelectedOrderId,
  hydrateOperationalOrder,
}: {
  app: ReturnType<typeof useApp>;
  selectedOrder: Order | null;
  setSelectedOrderId: (id: string | null) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const state = useReturnTab(app, selectedOrder, hydrateOperationalOrder);

  return (
    <div className="responsive-staff-grid so-split-layout">
      {/* Cột trái: Danh sách đơn */}
      <ReturnQueuePanel
        app={app}
        selectedOrder={selectedOrder}
        statusFilter={state.statusFilter}
        setStatusFilter={state.setStatusFilter}
        eligibleOrders={state.eligibleOrders}
        overdueOrdersBackend={state.overdueOrdersBackend}
        scanningOverdue={state.scanningOverdue}
        onScanOverdue={state.handleScanOverdueReminders}
        onSelectOrder={(orderId) => {
          setSelectedOrderId(orderId);
          state.setSelectedItemsToReturn({});
          void hydrateOperationalOrder(orderId);
        }}
      />

      {/* Cột phải: Xử lý nhận trả từng đợt & Đối soát */}
      <div>
        {state.returnError && <div className="so-alert-error">{state.returnError}</div>}
        {state.returnSuccess && <div className="so-alert-success">{state.returnSuccess}</div>}

        {!state.order ? (
          <div className="so-empty-panel">
            <div className="so-empty-icon-wrap">
              <Icon name="arrow-down" size={36} />
            </div>
            <p>Chọn một đơn thuê ở bên trái để lập phiếu nhận trả hoặc đối soát cọc.</p>
          </div>
        ) : state.order.status === "Hoàn tất" ? (
          <div>
            <ReconciliationSheet
              order={state.order}
              app={app}
              userRole={app.currentUser?.role === "admin" ? "admin" : "staff"}
              onAfterMutation={async () => {
                await Promise.all([state.loadReturnData(), hydrateOperationalOrder(state.order!.id)]);
              }}
            />
          </div>
        ) : (
          <div>
            <ReturnOverdueBanner
              app={app}
              order={state.order}
              overdueInfo={state.overdueInfo}
              overdueConflicts={state.overdueConflicts}
              affectedOrdersBackend={state.affectedOrdersBackend}
              debtCount={state.debtRows.length}
              returnedCount={state.returnedEquipment.length}
              returnLoading={state.returnLoading}
              returnBusy={state.returnBusy}
              onOpenContactModal={() => {
                state.setContactNotice(null);
                state.setShowContactModal(true);
              }}
              onApplyOverdueFee={state.handleApplyOverdueFee}
            />

            {state.debtRows.length > 0 && (
              <ReturnInspectionForm
                order={state.order}
                debtRows={state.debtRows}
                currentReturnRound={state.currentReturnRound}
                selectedItemsToReturn={state.selectedItemsToReturn}
                setSelectedItemsToReturn={state.setSelectedItemsToReturn}
                itemConditions={state.itemConditions}
                itemNotes={state.itemNotes}
                setItemNotes={state.setItemNotes}
                itemSurcharges={state.itemSurcharges}
                setItemSurcharges={state.setItemSurcharges}
                returnStaffNote={state.returnStaffNote}
                setReturnStaffNote={state.setReturnStaffNote}
                returnBusy={state.returnBusy}
                onToggleSelect={state.handleToggleSelect}
                onConditionChange={state.handleConditionChange}
                onCreateReceipt={state.handleCreateReceipt}
              />
            )}

            <ReturnHistoryPanel
              realApi={Boolean(app.realApi)}
              order={state.order}
              returnReceiptsBackend={state.returnReceiptsBackend}
              returnBusy={state.returnBusy}
              onCloseBackendReceipt={state.handleCloseBackendReceipt}
              onViewBackendReceipt={state.setViewingBackendReceipt}
              onViewMockReceipt={state.setViewingReceipt}
            />

            <ReturnSurchargePanel
              app={app}
              order={state.order}
              displaySurcharges={state.displaySurcharges}
              returnBusy={state.returnBusy}
              rejectingSurchargeId={state.rejectingSurchargeId}
              setRejectingSurchargeId={state.setRejectingSurchargeId}
              rejectReason={state.rejectReason}
              setRejectReason={state.setRejectReason}
              onApproveSurcharge={state.handleApproveSurcharge}
              onRejectSurcharge={state.handleRejectSurcharge}
              onAfterReconcileMutation={async () => {
                await Promise.all([state.loadReturnData(), hydrateOperationalOrder(state.order!.id)]);
              }}
            />
          </div>
        )}

        <ReturnTabModals
          app={app}
          order={state.order}
          viewingBackendReceipt={state.viewingBackendReceipt}
          setViewingBackendReceipt={state.setViewingBackendReceipt}
          viewingReceipt={state.viewingReceipt}
          setViewingReceipt={state.setViewingReceipt}
          returnBusy={state.returnBusy}
          setReturnSuccess={state.setReturnSuccess}
          contactNotice={state.contactNotice}
          setApproveLostTarget={state.setApproveLostTarget}
          approveLostTarget={state.approveLostTarget}
          lostApproveReason={state.lostApproveReason}
          setLostApproveReason={state.setLostApproveReason}
          lostCompAmount={state.lostCompAmount}
          setLostCompAmount={state.setLostCompAmount}
          lostBienBan={state.lostBienBan}
          setLostBienBan={state.setLostBienBan}
          handleSplitPendingLine={state.handleSplitPendingLine}
          handleCloseBackendReceipt={state.handleCloseBackendReceipt}
          handleConfirmApproveLost={state.handleConfirmApproveLost}
          showContactModal={state.showContactModal}
          setShowContactModal={state.setShowContactModal}
          contactLogsBackend={state.contactLogsBackend}
          contactOutcome={state.contactOutcome}
          setContactOutcome={state.setContactOutcome}
          newExpectedTime={state.newExpectedTime}
          setNewExpectedTime={state.setNewExpectedTime}
          contactNote={state.contactNote}
          setContactNote={state.setContactNote}
          handleSaveContactLog={state.handleSaveContactLog}
        />
      </div>
    </div>
  );
}
