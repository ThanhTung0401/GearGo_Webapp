import { useApp } from "../../context/AppContext";
import { type ThietBiBackend, type PhanCongLichThietBiBackend } from "../../services/api";
import { Equipment, ImportReceipt, MaintenanceReceipt, Supplier } from "../../store";
import SupplierProfileModal from "../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../components/GoodsReceivingModal";
import { CreateMaintenanceModal } from "./equipment/CreateMaintenanceModal";
import { AcceptMaintenanceModal } from "./equipment/AcceptMaintenanceModal";
import { EquipScheduleModal } from "./equipment/EquipScheduleModal";
import { MaintenanceActionModals } from "./equipment/MaintenanceActionModals";

export interface EquipmentTabModalsProps {
  app: ReturnType<typeof useApp>;
  showCreateMaintenanceModal: boolean;
  setShowCreateMaintenanceModal: (v: boolean) => void;
  createMaintEquipId: string;
  setCreateMaintEquipId: (v: string) => void;
  createMaintIssue: string;
  setCreateMaintIssue: (v: string) => void;
  createMaintCost: number;
  setCreateMaintCost: (v: number) => void;
  createMaintOrderId: string;
  setCreateMaintOrderId: (v: string) => void;
  createMaintNote: string;
  setCreateMaintNote: (v: string) => void;
  acceptingMaintenance: MaintenanceReceipt | null;
  setAcceptingMaintenance: (v: MaintenanceReceipt | null) => void;
  repairOutcome: "Hoàn tất" | "Không thể sửa";
  setRepairOutcome: (v: "Hoàn tất" | "Không thể sửa") => void;
  actualRepairCost: number;
  setActualRepairCost: (v: number) => void;
  repairOutcomeNote: string;
  setRepairOutcomeNote: (v: string) => void;
  equipBusy: boolean;
  setEquipBusy: (v: boolean) => void;
  setEquipError: (v: string | null) => void;
  setEquipSuccess: (v: string | null) => void;
  transferModal: Equipment | null;
  setTransferModal: (v: Equipment | null) => void;
  targetProductId: string;
  setTargetProductId: (v: string) => void;
  viewingLifecycle: Equipment | null;
  setViewingLifecycle: (v: Equipment | null) => void;
  showAuditModal: boolean;
  setShowAuditModal: (v: boolean) => void;
  inspectingImportReceipt: ImportReceipt | null;
  setInspectingImportReceipt: (v: ImportReceipt | null) => void;
  viewingSupplierProfile: Supplier | null;
  setViewingSupplierProfile: (v: Supplier | null) => void;
  viewingEquipDetail: {
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null;
  setViewingEquipDetail: (v: {
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null) => void;
  assignMaintTarget: MaintenanceReceipt | null;
  setAssignMaintTarget: (v: MaintenanceReceipt | null) => void;
  assignHandlerId: number;
  setAssignHandlerId: (v: number) => void;
  assignReason: string;
  setAssignReason: (v: string) => void;
  progressMaintTarget: MaintenanceReceipt | null;
  setProgressMaintTarget: (v: MaintenanceReceipt | null) => void;
  progressCost: number;
  setProgressCost: (v: number) => void;
  progressNote: string;
  setProgressNote: (v: string) => void;
}

// Tập hợp các modal thuộc phân hệ Quản lý kho, bảo trì & nhập hàng của nhân viên
export function EquipmentTabModals(props: EquipmentTabModalsProps) {
  return (
    <>
      {props.showCreateMaintenanceModal && (
        <CreateMaintenanceModal
          app={props.app}
          createMaintEquipId={props.createMaintEquipId}
          setCreateMaintEquipId={props.setCreateMaintEquipId}
          createMaintIssue={props.createMaintIssue}
          setCreateMaintIssue={props.setCreateMaintIssue}
          createMaintCost={props.createMaintCost}
          setCreateMaintCost={props.setCreateMaintCost}
          createMaintOrderId={props.createMaintOrderId}
          setCreateMaintOrderId={props.setCreateMaintOrderId}
          createMaintNote={props.createMaintNote}
          setCreateMaintNote={props.setCreateMaintNote}
          setEquipBusy={props.setEquipBusy}
          setEquipError={props.setEquipError}
          setEquipSuccess={props.setEquipSuccess}
          onClose={() => props.setShowCreateMaintenanceModal(false)}
        />
      )}

      {props.acceptingMaintenance && (
        <AcceptMaintenanceModal
          app={props.app}
          acceptingMaintenance={props.acceptingMaintenance}
          repairOutcome={props.repairOutcome}
          setRepairOutcome={props.setRepairOutcome}
          actualRepairCost={props.actualRepairCost}
          setActualRepairCost={props.setActualRepairCost}
          repairOutcomeNote={props.repairOutcomeNote}
          setRepairOutcomeNote={props.setRepairOutcomeNote}
          setEquipBusy={props.setEquipBusy}
          setEquipError={props.setEquipError}
          setEquipSuccess={props.setEquipSuccess}
          onClose={() => props.setAcceptingMaintenance(null)}
        />
      )}

      {props.inspectingImportReceipt && (
        <GoodsReceivingModal
          receipt={props.inspectingImportReceipt}
          app={props.app}
          onClose={() => props.setInspectingImportReceipt(null)}
          onSuccess={() => props.setInspectingImportReceipt(null)}
        />
      )}

      {props.viewingSupplierProfile && (
        <SupplierProfileModal
          supplier={props.viewingSupplierProfile}
          app={props.app}
          onClose={() => props.setViewingSupplierProfile(null)}
        />
      )}

      {props.viewingEquipDetail && (
        <EquipScheduleModal
          viewingEquipDetail={props.viewingEquipDetail}
          onClose={() => props.setViewingEquipDetail(null)}
        />
      )}

      <MaintenanceActionModals
        app={props.app}
        equipBusy={props.equipBusy}
        setEquipBusy={props.setEquipBusy}
        setEquipError={props.setEquipError}
        setEquipSuccess={props.setEquipSuccess}
        assignMaintTarget={props.assignMaintTarget}
        setAssignMaintTarget={props.setAssignMaintTarget}
        assignHandlerId={props.assignHandlerId}
        setAssignHandlerId={props.setAssignHandlerId}
        assignReason={props.assignReason}
        setAssignReason={props.setAssignReason}
        progressMaintTarget={props.progressMaintTarget}
        setProgressMaintTarget={props.setProgressMaintTarget}
        progressCost={props.progressCost}
        setProgressCost={props.setProgressCost}
        progressNote={props.progressNote}
        setProgressNote={props.setProgressNote}
      />
    </>
  );
}
