import type { useApp } from "../../../context/AppContext";
import Icon, { type IconName } from "../../../components/Icon";
import { ReportsDrilldownModals } from "./ReportsDrilldownModals";
import { ReportsImportSection } from "./ReportsImportSection";
import { useReportsTab } from "./reports/useReportsTab";
import { OperationsReportsSection } from "./reports/OperationsReportsSection";
import { RevenueReportsSection } from "./reports/RevenueReportsSection";
import { CashflowReportsSection } from "./reports/CashflowReportsSection";

/**
 * Tab Báo cáo & Phân tích chuyên sâu (UC10.1 - UC10.3): điều phối bộ lọc kỳ,
 * xuất CSV và 4 sub-tab báo cáo tách biệt.
 */
export function ReportsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const reports = useReportsTab(app);

  return (
    <div>
      {/* Tiêu đề & Bộ chọn kỳ báo cáo (UC10.1, UC10.1.1) */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="adm-page-title adm-page-title--lg">
            Báo cáo & Phân tích chuyên sâu (UC10.1 - UC10.3)
          </h2>
          <p className="adm-page-subtitle">
            Hệ thống 4 báo cáo tách biệt, tuân thủ nghiêm ngặt nguyên tắc kế toán tài chính và hỗ trợ truy vết cấu thành.
          </p>
        </div>

        {/* Bộ lọc khoảng ngày & Xuất CSV */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="adm-date-range shadow-xs">
            <span className="adm-date-range-label">Kỳ báo cáo:</span>
            <input
              type="date"
              value={reports.fromDate}
              onChange={(e) => reports.setFromDate(e.target.value)}
              className="adm-date-input adm-date-input--xs"
            />
            <span>→</span>
            <input
              type="date"
              value={reports.toDate}
              onChange={(e) => reports.setToDate(e.target.value)}
              className="adm-date-input adm-date-input--xs"
            />
          </div>
          <button
            type="button"
            disabled={reports.exporting}
            onClick={reports.handleExportCsv}
            className="btn btn-secondary btn-sm"
          >
            <span className="icon-label">
              <Icon name="chart" size={14} /> {reports.exporting ? "Đang xuất..." : "Xuất CSV"}
            </span>
          </button>
        </div>
      </div>

      {reports.loadingReports && (
        <div className="adm-loading-text">
          Đang tổng hợp số liệu báo cáo từ máy chủ...
        </div>
      )}
      {reports.reportError && (
        <div role="alert" className="adm-alert is-error-solid adm-alert--block">
          {reports.reportError}
        </div>
      )}
      {reports.exportStatus && (
        <div role="alert" className={`adm-alert adm-alert--block ${reports.exportStatus.type === "error" ? "is-error-solid" : "is-success"}`}>
          {reports.exportStatus.text}
        </div>
      )}

      {/* Cảnh báo ngày không hợp lệ (Dòng sự kiện phụ 2.1) */}
      {reports.isDateInvalid && (
        <div className="adm-alert is-error-solid mb-4">
          <strong>Lỗi kỳ báo cáo:</strong> Ngày kết thúc ({reports.toDate}) không được nhỏ hơn ngày bắt đầu ({reports.fromDate}). Vui lòng điều chỉnh lại bộ lọc để cập nhật dữ liệu.
        </div>
      )}

      {/* Sub-tabs điều hướng 4 báo cáo */}
      <div className="flex gap-2 mb-6 border-b border-bone pb-3 flex-wrap">
        {[
          { key: "operational" as const, label: "1. Vận hành kho (UC10.1)", icon: "tool" as IconName },
          { key: "revenue" as const, label: "2. Doanh thu thuần (UC10.2)", icon: "chart" as IconName },
          { key: "cashflow" as const, label: "3. Dòng tiền thực tế (UC10.2.1)", icon: "wallet" as IconName },
          { key: "inventory" as const, label: "4. Nhập kho & Tài sản (UC10.3)", icon: "package" as IconName },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => reports.setReportSubTab(tab.key)}
            className={`adm-tab-btn ${reports.reportSubTab === tab.key ? "is-active" : ""}`}
          >
            <span className="icon-label"><Icon name={tab.icon} size={16} /> {tab.label}</span>
          </button>
        ))}
      </div>

      {reports.reportSubTab === "operational" && (
        <OperationsReportsSection
          app={app}
          isRealApi={reports.isRealApi}
          fromDate={reports.fromDate}
          toDate={reports.toDate}
          opsReport={reports.opsReport}
          stockReport={reports.stockReport}
          maintReport={reports.maintReport}
          ordersToPickup={reports.ordersToPickup}
          ordersToReturn={reports.ordersToReturn}
          overdueOrders={reports.overdueOrders}
          pendingReconcileOrders={reports.pendingReconcileOrders}
          handedOverOrders={reports.handedOverOrders}
          damageRecords={reports.damageRecords}
          onDrilldown={reports.setDrilldownData}
        />
      )}

      {reports.reportSubTab === "revenue" && (
        <RevenueReportsSection
          app={app}
          isRealApi={reports.isRealApi}
          revReport={reports.revReport}
          revAdjReport={reports.revAdjReport}
          cancelFeeReport={reports.cancelFeeReport}
          depositReport={reports.depositReport}
          completedOrders={reports.completedOrders}
          approvedSurcharges={reports.approvedSurcharges}
          pureRentalRevenue={reports.pureRentalRevenue}
          surchargeRevenue={reports.surchargeRevenue}
          deltaAdjustmentRevenue={reports.deltaAdjustmentRevenue}
          totalNetRevenue={reports.totalNetRevenue}
          completedCountDisplay={reports.completedCountDisplay}
          cancellationRate={reports.cancellationRate}
          canceledCount={reports.canceledCount}
          validDenominator={reports.validDenominator}
          returningCustomersCount={reports.returningCustomersCount}
          cancellationFees={reports.cancellationFees}
          currentHeldDeposit={reports.currentHeldDeposit}
          onDrilldown={reports.setDrilldownData}
        />
      )}

      {reports.reportSubTab === "cashflow" && (
        <CashflowReportsSection
          isRealApi={reports.isRealApi}
          cashReport={reports.cashReport}
          pendingItemsReport={reports.pendingItemsReport}
          totalCashInflow={reports.totalCashInflow}
          totalCashOutflow={reports.totalCashOutflow}
          netCashflow={reports.netCashflow}
          totalNetRevenue={reports.totalNetRevenue}
          currentHeldDeposit={reports.currentHeldDeposit}
          cancellationFees={reports.cancellationFees}
          inRangeTransactions={reports.inRangeTransactions}
        />
      )}

      {reports.reportSubTab === "inventory" && (
        <ReportsImportSection
          app={app}
          isRealApi={reports.isRealApi}
          supplierFilter={reports.supplierFilter}
          setSupplierFilter={reports.setSupplierFilter}
          totalImportAssetValue={reports.totalImportAssetValue}
          importReport={reports.importReport}
          importAdjReport={reports.importAdjReport}
          priceHistoryReport={reports.priceHistoryReport}
          inRangeImports={reports.inRangeImports}
          setViewingReceipt={reports.setViewingReceipt}
        />
      )}

      <ReportsDrilldownModals
        drilldownData={reports.drilldownData}
        setDrilldownData={reports.setDrilldownData}
        viewingReceipt={reports.viewingReceipt}
        setViewingReceipt={reports.setViewingReceipt}
      />
    </div>
  );
}
