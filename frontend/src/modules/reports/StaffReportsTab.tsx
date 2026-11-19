import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";
import { type StaffTab } from "../orders/returnMapping";
import { useStaffReportsTab } from "./staffReports/useStaffReportsTab";
import { ShiftMetricsSection } from "./staffReports/ShiftMetricsSection";
import { StaffAuditLogSection } from "./staffReports/StaffAuditLogSection";

// Tab Báo cáo ca trực & Nhật ký thao tác nhân viên (UC10.1 & UC10.4)
export function StaffReportsTab({
  app,
  openOrder,
}: {
  app: ReturnType<typeof useApp>;
  openOrder: (id: string, tab: StaffTab) => void;
}) {
  const state = useStaffReportsTab(app);

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="so-page-title">
            Báo cáo ca trực & Nhật ký nhân viên (UC10.1 & UC10.4)
          </h2>
          <p className="so-page-subtitle">
            Theo dõi khối lượng giao nhận, thiết bị kho trong ca trực và truy vết nhật ký thao tác phục vụ công việc.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => state.setSubTab("shift")}
            className={`so-tab-btn is-compact ${state.subTab === "shift" ? "is-active" : ""}`}
          >
            <span className="icon-label"><Icon name="tool" size={15} /> Chỉ tiêu ca trực</span>
          </button>
          <button
            onClick={() => state.setSubTab("audit")}
            className={`so-tab-btn is-compact ${state.subTab === "audit" ? "is-active" : ""}`}
          >
            <span className="icon-label"><Icon name="clipboard" size={15} /> Nhật ký thao tác ({state.staffLogs.length})</span>
          </button>
        </div>
      </div>

      {state.reportError && (
        <div className="so-alert-error">
          {state.reportError}
        </div>
      )}

      {state.subTab === "shift" && (
        <ShiftMetricsSection
          reportLoading={state.reportLoading}
          pickupCount={state.pickupInShift.length}
          returnCount={state.returnInShift.length}
          overdueCount={state.overdueOrders.length}
          pendingReconcileCount={state.pendingReconcile.length}
          handedOverCount={state.handedOverToday.length}
          tongQuan={state.tongQuan}
          readyEquip={state.readyEquip}
          rentingEquip={state.rentingEquip}
          maintEquip={state.maintEquip}
          lostEquip={state.lostEquip}
          maintReport={state.maintReport}
          opsReport={state.opsReport}
        />
      )}

      {state.subTab === "audit" && (
        <StaffAuditLogSection
          searchAudit={state.searchAudit}
          setSearchAudit={state.setSearchAudit}
          staffLogs={state.staffLogs}
          openOrder={openOrder}
        />
      )}
    </div>
  );
}
