import { useApp } from "../../../context/AppContext";
import { EquipmentTabModals } from "./EquipmentTabModals";
import { useEquipmentTab } from "./equipment/useEquipmentTab";
import { InventorySubTab } from "./equipment/InventorySubTab";
import { MaintenanceSubTab } from "./equipment/MaintenanceSubTab";
import { ImportSubTab } from "./equipment/ImportSubTab";

// Tab Quản lý kho thiết bị, bảo trì & nhập hàng kiểm nhận cho nhân viên kho
export function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const state = useEquipmentTab(app);

  return (
    <div>
      {state.equipError && <div className="so-alert-error">{state.equipError}</div>}
      {state.equipSuccess && <div className="so-alert-success">{state.equipSuccess}</div>}

      {/* Sub tabs: Kho / Phiếu bảo trì / Nhập hàng */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-2 flex-wrap">
        <button
          onClick={() => state.setSubTab("inventory")}
          className={`so-tab-btn ${state.subTab === "inventory" ? "is-active" : ""}`}
        >
          📦 Danh sách kho ({app.equipment.length} thiết bị)
        </button>
        <button
          onClick={() => state.setSubTab("maintenance")}
          className={`so-tab-btn ${state.subTab === "maintenance" ? "is-active" : ""}`}
        >
          🛠 Phiếu bảo trì & sửa chữa ({app.maintenanceReceipts.length} phiếu)
        </button>
        <button
          onClick={() => state.setSubTab("import")}
          className={`so-tab-btn ${state.subTab === "import" ? "is-active" : ""}`}
        >
          🚚 Nhập hàng & Kiểm nhận ({app.importReceipts.length} phiếu)
        </button>
      </div>

      {state.subTab === "inventory" && (
        <InventorySubTab
          app={app}
          filter={state.filter}
          setFilter={state.setFilter}
          productFilter={state.productFilter}
          setProductFilter={state.setProductFilter}
          products={state.products}
          filtered={state.filtered}
          transferModal={state.transferModal}
          setTransferModal={state.setTransferModal}
          targetProductId={state.targetProductId}
          setTargetProductId={state.setTargetProductId}
          viewingLifecycle={state.viewingLifecycle}
          setViewingLifecycle={state.setViewingLifecycle}
          showAuditModal={state.showAuditModal}
          setShowAuditModal={state.setShowAuditModal}
          handleOpenEquipSchedule={state.handleOpenEquipSchedule}
          handleTransfer={state.handleTransfer}
        />
      )}

      {state.subTab === "maintenance" && (
        <MaintenanceSubTab
          app={app}
          equipBusy={state.equipBusy}
          onOpenCreateModal={() => {
            const firstAvailable = app.equipment.find((e) => e.equipmentStatus !== "Ngừng sử dụng")?.id || "";
            state.setCreateMaintEquipId(firstAvailable);
            state.setShowCreateMaintenanceModal(true);
          }}
          onOpenAssignModal={(m) => {
            state.setAssignMaintTarget(m);
            state.setAssignHandlerId(1);
            state.setAssignReason("");
          }}
          onOpenProgressModal={(m) => {
            state.setProgressMaintTarget(m);
            state.setProgressNote(m.note || "");
            state.setProgressCost(m.actualCost ?? m.estimatedCost);
          }}
          onSendCheck={state.handleSendCheckMaintenance}
          onOpenAcceptModal={(m) => {
            state.setAcceptingMaintenance(m);
            state.setActualRepairCost(m.actualCost ?? m.estimatedCost);
            state.setRepairOutcome("Hoàn tất");
            state.setRepairOutcomeNote(m.note || "Đã kiểm tra kỹ thuật và vệ sinh đạt chuẩn.");
          }}
        />
      )}

      {state.subTab === "import" && (
        <ImportSubTab
          app={app}
          importSearch={state.importSearch}
          setImportSearch={state.setImportSearch}
          importStatusFilter={state.importStatusFilter}
          setImportStatusFilter={state.setImportStatusFilter}
          setInspectingImportReceipt={state.setInspectingImportReceipt}
          setViewingSupplierProfile={state.setViewingSupplierProfile}
        />
      )}

      <EquipmentTabModals
        app={app}
        showCreateMaintenanceModal={state.showCreateMaintenanceModal}
        setShowCreateMaintenanceModal={state.setShowCreateMaintenanceModal}
        createMaintEquipId={state.createMaintEquipId}
        setCreateMaintEquipId={state.setCreateMaintEquipId}
        createMaintIssue={state.createMaintIssue}
        setCreateMaintIssue={state.setCreateMaintIssue}
        createMaintCost={state.createMaintCost}
        setCreateMaintCost={state.setCreateMaintCost}
        createMaintOrderId={state.createMaintOrderId}
        setCreateMaintOrderId={state.setCreateMaintOrderId}
        createMaintNote={state.createMaintNote}
        setCreateMaintNote={state.setCreateMaintNote}
        acceptingMaintenance={state.acceptingMaintenance}
        setAcceptingMaintenance={state.setAcceptingMaintenance}
        repairOutcome={state.repairOutcome}
        setRepairOutcome={state.setRepairOutcome}
        actualRepairCost={state.actualRepairCost}
        setActualRepairCost={state.setActualRepairCost}
        repairOutcomeNote={state.repairOutcomeNote}
        setRepairOutcomeNote={state.setRepairOutcomeNote}
        equipBusy={state.equipBusy}
        setEquipBusy={state.setEquipBusy}
        setEquipError={state.setEquipError}
        setEquipSuccess={state.setEquipSuccess}
        transferModal={state.transferModal}
        setTransferModal={state.setTransferModal}
        targetProductId={state.targetProductId}
        setTargetProductId={state.setTargetProductId}
        viewingLifecycle={state.viewingLifecycle}
        setViewingLifecycle={state.setViewingLifecycle}
        showAuditModal={state.showAuditModal}
        setShowAuditModal={state.setShowAuditModal}
        inspectingImportReceipt={state.inspectingImportReceipt}
        setInspectingImportReceipt={state.setInspectingImportReceipt}
        viewingSupplierProfile={state.viewingSupplierProfile}
        setViewingSupplierProfile={state.setViewingSupplierProfile}
        viewingEquipDetail={state.viewingEquipDetail}
        setViewingEquipDetail={state.setViewingEquipDetail}
        assignMaintTarget={state.assignMaintTarget}
        setAssignMaintTarget={state.setAssignMaintTarget}
        assignHandlerId={state.assignHandlerId}
        setAssignHandlerId={state.setAssignHandlerId}
        assignReason={state.assignReason}
        setAssignReason={state.setAssignReason}
        progressMaintTarget={state.progressMaintTarget}
        setProgressMaintTarget={state.setProgressMaintTarget}
        progressCost={state.progressCost}
        setProgressCost={state.setProgressCost}
        progressNote={state.progressNote}
        setProgressNote={state.setProgressNote}
      />
    </div>
  );
}
