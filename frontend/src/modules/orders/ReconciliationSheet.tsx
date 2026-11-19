import type { useApp } from "../../context/AppContext";
import { statusColors, type Order } from "../../store";
import { CollectSurchargeModal } from "./reconciliation/CollectSurchargeModal";
import { RefundDepositModal } from "./reconciliation/RefundDepositModal";
import { ReconciliationTraceModals } from "./reconciliation/ReconciliationTraceModals";
import { FinancialAdjustmentModal } from "./reconciliation/FinancialAdjustmentModal";
import { useReconciliationSheet } from "./reconciliation/useReconciliationSheet";
import { ReconciliationPrecheckPanel } from "./reconciliation/ReconciliationPrecheckPanel";
import { ReconciliationSummaryCard } from "./reconciliation/ReconciliationSummaryCard";
import { ReconciliationPaymentPanel } from "./reconciliation/ReconciliationPaymentPanel";

interface ReconciliationSheetProps {
  order: Order;
  app: ReturnType<typeof useApp>;
  userRole?: "staff" | "admin";
  onClose?: () => void;
  onAfterMutation?: () => Promise<void> | void;
}

/**
 * UC5.4: Đối soát cọc và hoàn tất đơn (Reconciliation & Order Completion)
 * Tác nhân: Nhân viên, Quản trị viên
 * Đầy đủ 7 bước chính + Dòng sự kiện phụ 1.1, 5.1, 5.2
 */
export default function ReconciliationSheet({
  order,
  app,
  userRole = "staff",
  onClose,
  onAfterMutation,
}: ReconciliationSheetProps) {
  // Gom toàn bộ state, đồng bộ API và xử lý nghiệp vụ vào custom hook
  const sheet = useReconciliationSheet({ order, app, onAfterMutation });

  return (
    <div className="recon-sheet">
      {/* ─── Header: Tên nghiệp vụ & Trạng thái ────────────────────────────── */}
      <div className="recon-header">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Đổi màu nhãn UC5.4 sang xanh lá khi đơn đã khóa hoàn tất */}
            <span className={`recon-uc-badge ${sheet.isOrderCompleted ? "is-completed" : ""}`}>
              UC5.4: ĐỐI SOÁT CỌC & HOÀN TẤT ĐƠN
            </span>
            <span className="recon-role-meta">Tác nhân: {userRole === "admin" ? "Quản trị viên" : "Nhân viên kho"}</span>
          </div>
          <h3 className="recon-header-title">
            Bảng Đối Soát Cọc & Quyết Toán: Đơn {order.displayCode || order.id}
          </h3>
          <div className="recon-header-sub">
            Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""} · Nhận: {order.pickupTime} · Hẹn trả: {order.returnTime}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sheet.isOrderCompleted ? (
            <div className="locked-seal">
              <span>🔒</span> ĐÃ KHÓA & HOÀN TẤT
            </div>
          ) : (
            <span
              className="recon-status-pill"
              style={{
                background: statusColors[order.status]?.bg || "#F3F4F6",
                color: statusColors[order.status]?.text || "#374151",
              }}
            >
              {order.status}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="recon-close-btn">
              Đóng
            </button>
          )}
        </div>
      </div>

      <div className="recon-body">
        {sheet.reconError && <div className="recon-alert-error">{sheet.reconError}</div>}
        {sheet.reconSuccess && <div className="recon-alert-success">{sheet.reconSuccess}</div>}
        {sheet.reconLoading && (
          <div className="recon-loading-note">
            Đang tải dữ liệu đối soát & hoàn tiền từ máy chủ...
          </div>
        )}

        <ReconciliationPrecheckPanel
          realApi={Boolean(app.realApi)}
          previewBackend={sheet.previewBackend}
          isBlocked={sheet.isBlocked}
          isOrderCompleted={sheet.isOrderCompleted}
          debtEquipment={sheet.debtEquipment}
          pendingSurcharges={sheet.pendingSurcharges}
          disputedSurcharges={sheet.disputedSurcharges}
          reconBusy={sheet.reconBusy}
          onApproveSurcharge={sheet.handleApproveSurchargeInline}
          onRejectSurcharge={sheet.handleRejectSurchargeInline}
        />

        <ReconciliationSummaryCard
          order={order}
          isOrderCompleted={sheet.isOrderCompleted}
          initialTransaction={sheet.initialTransaction}
          depositCollected={sheet.depositCollected}
          approvedSurcharges={sheet.approvedSurcharges}
          totalApprovedSurcharges={sheet.totalApprovedSurcharges}
          priorCollect={sheet.priorCollect}
          priorRefund={sheet.priorRefund}
          priorSettled={sheet.priorSettled}
          isBalanced={sheet.isBalanced}
          netDifference={sheet.netDifference}
          refundAmount={sheet.refundAmount}
          extraAmount={sheet.extraAmount}
          netStateClass={sheet.netStateClass}
          onOpenPrint={() => sheet.setShowPrintModal(true)}
          onViewTx={sheet.setViewingTx}
          onViewReturnReceipt={sheet.setViewingReturnReceipt}
          onViewSurcharge={sheet.setViewingSurcharge}
        />

        <ReconciliationPaymentPanel
          order={order}
          realApi={Boolean(app.realApi)}
          userRole={userRole}
          isOrderCompleted={sheet.isOrderCompleted}
          isConfirmed={sheet.isConfirmed}
          isBlocked={sheet.isBlocked}
          isBalanced={sheet.isBalanced}
          reconBusy={sheet.reconBusy}
          extraAmount={sheet.extraAmount}
          refundAmount={sheet.refundAmount}
          doiSoatBackend={sheet.doiSoatBackend}
          refundsBackend={sheet.refundsBackend}
          onConfirmStep4={sheet.handleConfirmStep4}
          onFinalizeBalanced={sheet.handleFinalizeBalanced}
          onOpenCollect={() => {
            sheet.setCashTendered(sheet.extraAmount);
            sheet.setShowCollectModal(true);
          }}
          onOpenRefund={() => {
            sheet.setBankHolder(order.customerName.toUpperCase());
            sheet.setShowRefundModal(true);
          }}
          onLockReconciliation={sheet.handleLockReconciliation}
          onProcessRefund={sheet.handleProcessRefund}
          onCheckRefund={sheet.handleCheckRefund}
          onSimulateFailedTx={() => {
            app.settleOrder(order.id, false, { note: "Khách chưa đủ tiền / Ngân hàng báo lỗi giao dịch" });
          }}
          onOpenPrint={() => sheet.setShowPrintModal(true)}
          onOpenAdjustment={() => {
            sheet.setAdjAmount(50000);
            sheet.setAdjReason("");
            sheet.setAdjMessage("");
            sheet.setShowAdjustmentModal(true);
          }}
        />
      </div>

      {sheet.showCollectModal && (
        <CollectSurchargeModal
          order={order}
          app={app}
          donId={sheet.donId}
          extraAmount={sheet.extraAmount}
          collectMethod={sheet.collectMethod}
          setCollectMethod={sheet.setCollectMethod}
          cashTendered={sheet.cashTendered}
          setCashTendered={sheet.setCashTendered}
          posTerminalCode={sheet.posTerminalCode}
          setPosTerminalCode={sheet.setPosTerminalCode}
          posAuthCode={sheet.posAuthCode}
          setPosAuthCode={sheet.setPosAuthCode}
          collectNote={sheet.collectNote}
          setCollectNote={sheet.setCollectNote}
          pendingCollectReq={sheet.pendingCollectReq}
          setPendingCollectReq={sheet.setPendingCollectReq}
          doiSoatBackend={sheet.doiSoatBackend}
          ensureConfirmedDoiSoat={sheet.ensureConfirmedDoiSoat}
          syncAfterMutation={sheet.syncAfterMutation}
          reconBusy={sheet.reconBusy}
          setReconBusy={sheet.setReconBusy}
          setReconError={sheet.setReconError}
          setReconSuccess={sheet.setReconSuccess}
          onClose={() => sheet.setShowCollectModal(false)}
        />
      )}
      {sheet.showRefundModal && (
        <RefundDepositModal
          order={order}
          app={app}
          donId={sheet.donId}
          refundAmount={sheet.refundAmount}
          refundMethod={sheet.refundMethod}
          setRefundMethod={sheet.setRefundMethod}
          bankName={sheet.bankName}
          setBankName={sheet.setBankName}
          bankAccount={sheet.bankAccount}
          setBankAccount={sheet.setBankAccount}
          bankHolder={sheet.bankHolder}
          setBankHolder={sheet.setBankHolder}
          refundNote={sheet.refundNote}
          setRefundNote={sheet.setRefundNote}
          ensureConfirmedDoiSoat={sheet.ensureConfirmedDoiSoat}
          syncAfterMutation={sheet.syncAfterMutation}
          reconBusy={sheet.reconBusy}
          setReconBusy={sheet.setReconBusy}
          setReconError={sheet.setReconError}
          setReconSuccess={sheet.setReconSuccess}
          onClose={() => sheet.setShowRefundModal(false)}
        />
      )}
      <ReconciliationTraceModals
        order={order}
        viewingTx={sheet.viewingTx}
        setViewingTx={sheet.setViewingTx}
        viewingReturnReceipt={sheet.viewingReturnReceipt}
        setViewingReturnReceipt={sheet.setViewingReturnReceipt}
        viewingSurcharge={sheet.viewingSurcharge}
        setViewingSurcharge={sheet.setViewingSurcharge}
        showPrintModal={sheet.showPrintModal}
        setShowPrintModal={sheet.setShowPrintModal}
        depositCollected={sheet.depositCollected}
        totalApprovedSurcharges={sheet.totalApprovedSurcharges}
        approvedSurcharges={sheet.approvedSurcharges}
        priorSettled={sheet.priorSettled}
        netDifference={sheet.netDifference}
        refundAmount={sheet.refundAmount}
        extraAmount={sheet.extraAmount}
        isBalanced={sheet.isBalanced}
        initialTransaction={sheet.initialTransaction}
      />
      {sheet.showAdjustmentModal && (
        <FinancialAdjustmentModal
          order={order}
          app={app}
          userRole={userRole}
          depositCollected={sheet.depositCollected}
          totalApprovedSurcharges={sheet.totalApprovedSurcharges}
          approvedSurcharges={sheet.approvedSurcharges}
          doiSoatBackend={sheet.doiSoatBackend}
          syncAfterMutation={sheet.syncAfterMutation}
          setReconBusy={sheet.setReconBusy}
          setReconError={sheet.setReconError}
          adjType={sheet.adjType}
          setAdjType={sheet.setAdjType}
          adjAmount={sheet.adjAmount}
          setAdjAmount={sheet.setAdjAmount}
          adjReason={sheet.adjReason}
          setAdjReason={sheet.setAdjReason}
          adjMessage={sheet.adjMessage}
          setAdjMessage={sheet.setAdjMessage}
          adjSurchargeId={sheet.adjSurchargeId}
          setAdjSurchargeId={sheet.setAdjSurchargeId}
          onClose={() => sheet.setShowAdjustmentModal(false)}
        />
      )}
    </div>
  );
}
