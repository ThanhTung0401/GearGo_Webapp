import type { useApp } from "../../context/AppContext";
import ReconciliationSheet from "../orders/ReconciliationSheet";
import { useDashboardTab } from "./dashboard/useDashboardTab";
import { DashboardKpiGrid, DashboardOverviewGrid } from "./dashboard/DashboardKpiGrid";
import { DisputeCenterPanel } from "./dashboard/DisputeCenterPanel";
import { OrderStatusFlowPanel } from "./dashboard/OrderStatusFlowPanel";
import { ResolveSurchargeModal } from "./dashboard/ResolveSurchargeModal";
import { StoreCancelOrderModal } from "./dashboard/StoreCancelOrderModal";

/**
 * Tab Tổng quan hệ thống cho Quản trị viên: hiển thị KPI, trung tâm tranh chấp UC5.3,
 * đơn gần đây, khả dụng thiết bị và luồng giám sát đối soát UC5.4.
 */
export function DashboardTab({ app }: { app: ReturnType<typeof useApp> }) {
  const dash = useDashboardTab(app);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="admin-title text-xl">Tổng quan hệ thống</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">
            Role: <strong>{dash.myPerm?.roleName ?? "..."}</strong> · {dash.myPerm?.quyen.length ?? 0} quyền (v{dash.myPerm?.version ?? 0})
          </span>
          {/* [DB-07] Backend yêu cầu BaoCaoTaiChinh.Xuat; chấp nhận cả BaoCao.Xuat cho tương thích. */}
          {(dash.has("BaoCaoTaiChinh.Xuat") || dash.has("BaoCao.Xuat")) && (
            <button type="button" disabled={dash.exportingCsv} onClick={dash.handleExportDashboardReport} className="btn btn-sm btn-primary">
              {dash.exportingCsv ? "Đang xuất..." : "Xuất báo cáo"}
            </button>
          )}
        </div>
      </div>

      {dash.bannerMessage && (
        <div role="alert" className={`adm-alert ${dash.bannerMessage.type === "error" ? "is-error-solid" : "is-success"}`}>
          {dash.bannerMessage.text}
        </div>
      )}

      <DashboardKpiGrid
        currentMonthNum={dash.currentMonthNum}
        displayRevenue={dash.displayRevenue}
        displayCompletedCount={dash.displayCompletedCount}
        processingOrdersCount={dash.processingOrdersCount}
        displayRentedCount={dash.displayRentedCount}
        displayTotalEquip={dash.displayTotalEquip}
        displayHeldDeposit={dash.displayHeldDeposit}
      />

      <DisputeCenterPanel
        pendingSurcharges={dash.pendingSurcharges}
        onResolveClick={dash.handleOpenResolveSurcharge}
      />

      <DashboardOverviewGrid app={app} />

      <OrderStatusFlowPanel
        orders={app.orders}
        statusFilter={dash.statusFilter}
        onStatusFilterChange={dash.setStatusFilter}
        onOpenStoreCancel={dash.handleOpenStoreCancel}
        onOpenReconciliation={dash.setAdminSelectedOrder}
      />

      {dash.resolvingSurcharge && (
        <ResolveSurchargeModal
          resolvingSurcharge={dash.resolvingSurcharge}
          resolutionType={dash.resolutionType}
          onResolutionTypeChange={dash.setResolutionType}
          adjustedAmount={dash.adjustedAmount}
          onAdjustedAmountChange={dash.setAdjustedAmount}
          resolutionReason={dash.resolutionReason}
          onResolutionReasonChange={dash.setResolutionReason}
          resolvingLoading={dash.resolvingLoading}
          resolveError={dash.resolveError}
          onSubmit={dash.handleSubmitResolveSurcharge}
          onClose={() => dash.setResolvingSurcharge(null)}
        />
      )}

      {/* Modal Đối soát dành cho Quản trị viên (UC5.4) */}
      {dash.adminSelectedOrder && (
        <div role="dialog" aria-modal="true" className="adm-modal-overlay">
          <div className="adm-modal-dialog is-reconcile max-h-[92vh] overflow-y-auto">
            <ReconciliationSheet
              order={dash.adminSelectedOrder}
              app={app}
              userRole="admin"
              onClose={() => dash.setAdminSelectedOrder(null)}
            />
          </div>
        </div>
      )}

      {dash.storeCancelOrder && (
        <StoreCancelOrderModal
          order={dash.storeCancelOrder}
          preview={dash.storeCancelPreview}
          reason={dash.storeCancelReason}
          onReasonChange={dash.setStoreCancelReason}
          loading={dash.storeCancelLoading}
          error={dash.storeCancelError}
          onConfirm={dash.handleConfirmStoreCancel}
          onClose={() => dash.setStoreCancelOrder(null)}
        />
      )}
    </div>
  );
}
