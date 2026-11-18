import { useApp } from "../../../context/AppContext";
import { useAuditLogTab } from "./audit/useAuditLogTab";
import { AuditLogTable } from "./audit/AuditLogTable";
import { AuditEventDetailModal } from "./audit/AuditEventDetailModal";
import { AuditRelatedDocModal } from "./audit/AuditRelatedDocModal";

/**
 * Tab Nhật ký hệ thống - Audit Log (UC10.4 & UC10.4.2).
 */
export function AuditLogTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useAuditLogTab(app);

  return (
    <div>
      <AuditLogTable
        realApi={vm.realApi}
        search={vm.search}
        setSearch={vm.setSearch}
        roleFilter={vm.roleFilter}
        setRoleFilter={vm.setRoleFilter}
        fromDate={vm.fromDate}
        setFromDate={vm.setFromDate}
        toDate={vm.toDate}
        setToDate={vm.setToDate}
        page={vm.page}
        setPage={vm.setPage}
        totalLogs={vm.totalLogs}
        logsLoading={vm.logsLoading}
        logsError={vm.logsError}
        exportNotice={vm.exportNotice}
        filtered={vm.filtered}
        onRefresh={() => void vm.loadAuditLogs(vm.page)}
        onExportCsv={vm.handleExportCsv}
        onOpenRelatedDoc={(entity, id, log) => void vm.handleOpenRelatedDoc(entity, id, log)}
        onSelectEvent={vm.setSelectedEvent}
      />

      {vm.selectedEvent && (
        <AuditEventDetailModal
          selectedEvent={vm.selectedEvent}
          onClose={() => vm.setSelectedEvent(null)}
          onOpenRelatedDoc={(entity, id, log) => void vm.handleOpenRelatedDoc(entity, id, log)}
        />
      )}

      {vm.inspectDoc && (
        <AuditRelatedDocModal
          inspectDoc={vm.inspectDoc}
          docLoading={vm.docLoading}
          docError={vm.docError}
          onClose={() => vm.setInspectDoc(null)}
        />
      )}
    </div>
  );
}
