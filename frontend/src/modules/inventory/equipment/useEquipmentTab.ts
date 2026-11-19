import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi, type ThietBiBackend, type PhanCongLichThietBiBackend } from "../../../services/api";
import { MaintenanceReceipt, Equipment, ImportReceipt, Supplier } from "../../../store";

export interface ViewingEquipDetailState {
  equip: Equipment;
  detail?: ThietBiBackend;
  schedule: PhanCongLichThietBiBackend[];
  loading: boolean;
}

export const EQUIPMENT_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
  "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
  "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
  "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
  "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
};

export const EQUIPMENT_STATUS_OPTIONS = [
  "Tất cả",
  "Sẵn sàng",
  "Đang thuê",
  "Đang bảo trì",
  "Thất lạc",
  "Ngừng sử dụng",
];

// Hook quản lý trạng thái kho thiết bị, bảo trì (UC6.9-UC6.13) và nhập hàng kiểm nhận (UC7.3-UC7.8)
export function useEquipmentTab(app: ReturnType<typeof useApp>) {
  const [subTab, setSubTab] = useState<"inventory" | "maintenance" | "import">("inventory");
  const [filter, setFilter] = useState("Tất cả");
  const [productFilter, setProductFilter] = useState("Tất cả");
  const [transferModal, setTransferModal] = useState<Equipment | null>(null);
  const [targetProductId, setTargetProductId] = useState("");
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // State UC7.3 & UC7.7: Nhập hàng & Kiểm nhận cho nhân viên kho
  const [inspectingImportReceipt, setInspectingImportReceipt] = useState<ImportReceipt | null>(null);
  const [viewingSupplierProfile, setViewingSupplierProfile] = useState<Supplier | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [importStatusFilter, setImportStatusFilter] = useState("Tất cả");

  // State UC6.12: Tạo phiếu bảo trì
  const [showCreateMaintenanceModal, setShowCreateMaintenanceModal] = useState(false);
  const [createMaintEquipId, setCreateMaintEquipId] = useState("");
  const [createMaintIssue, setCreateMaintIssue] = useState("");
  const [createMaintCost, setCreateMaintCost] = useState(150000);
  const [createMaintOrderId, setCreateMaintOrderId] = useState("");
  const [createMaintNote, setCreateMaintNote] = useState("");

  // State UC6.13: Nghiệm thu bảo trì
  const [acceptingMaintenance, setAcceptingMaintenance] = useState<MaintenanceReceipt | null>(null);
  const [actualRepairCost, setActualRepairCost] = useState(0);
  const [repairOutcome, setRepairOutcome] = useState<"Hoàn tất" | "Không thể sửa">("Hoàn tất");
  const [repairOutcomeNote, setRepairOutcomeNote] = useState("");
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equipSuccess, setEquipSuccess] = useState<string | null>(null);

  // State UC6.9: Xem chi tiết & lịch bận thiết bị
  const [viewingEquipDetail, setViewingEquipDetail] = useState<ViewingEquipDetailState | null>(null);

  // State UC6.12: Phân công xử lý & cập nhật tiến độ bảo trì
  const [assignMaintTarget, setAssignMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [assignHandlerId, setAssignHandlerId] = useState<number>(1);
  const [assignReason, setAssignReason] = useState("");
  const [progressMaintTarget, setProgressMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [progressCost, setProgressCost] = useState<number>(0);

  // Tải đồng thời chi tiết và lịch bận của thiết bị (UC6.9)
  const handleOpenEquipSchedule = async (e: Equipment) => {
    setViewingEquipDetail({ equip: e, schedule: [], loading: true });
    if (!(app.realApi || isRealApiEnabled())) {
      setViewingEquipDetail({ equip: e, schedule: [], loading: false });
      return;
    }
    try {
      const equipIdNum = Number(e.id) || parseInt(e.id.replace(/\D/g, ""), 10);
      const [detail, schedule] = await Promise.all([
        equipmentApi.layChiTietThietBi(equipIdNum),
        equipmentApi.layLichThietBi(equipIdNum),
      ]);
      setViewingEquipDetail({ equip: e, detail, schedule, loading: false });
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Không tải được chi tiết và lịch bận thiết bị.");
      setViewingEquipDetail(null);
    }
  };

  const products = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];

  const filtered = app.equipment.filter((e) => {
    const matchStatus = filter === "Tất cả" || e.equipmentStatus === filter;
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    const matchProduct = productFilter === "Tất cả" || pname === productFilter;
    return matchStatus && matchProduct;
  });

  // Kiểm tra ảnh hưởng đơn đang cam kết trước khi điều chuyển / giáng cấp thiết bị sang sản phẩm đích
  const handleTransfer = async () => {
    if (!transferModal || !targetProductId) return;
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const targetProduct = app.products.find((p) => p.id === targetProductId);
        const equipIdNum = Number(transferModal.id) || parseInt(transferModal.id.replace(/\D/g, ""), 10);
        const targetSpIdNum =
          Number(targetProduct?.id ?? targetProductId) || parseInt(targetProductId.replace(/\D/g, ""), 10);
        if (!equipIdNum || !targetSpIdNum) {
          throw new Error("Không xác định được mã thiết bị hoặc sản phẩm đích hợp lệ.");
        }
        const checkImpact = await equipmentApi.xemAnhHuongThayDoi(equipIdNum, {
          loaiThayDoi: "GiangCap",
          maSanPhamDich: targetSpIdNum,
        });
        if (!checkImpact.coTheApDungHienTai) {
          setEquipError(
            `Cảnh báo cam kết: Không thể điều chuyển do vướng đơn thuê: ${checkImpact.vuongMac.join("; ")}`
          );
          return;
        }
        await equipmentApi.deNghiDieuChuyenSanPham(equipIdNum, {
          maSanPhamDich: targetSpIdNum,
          lyDo: "Giáng cấp / điều chuyển thiết bị sang phân khúc sản phẩm đích",
        });
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
        setTransferModal(null);
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi gửi đề nghị điều chuyển thiết bị.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    const res = app.transferEquipment(transferModal.id, targetProductId);
    if (res.ok) {
      setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
      setTransferModal(null);
    } else {
      setEquipError(res.message);
    }
  };

  // Gửi kiểm tra kỹ thuật cho phiếu bảo trì trên backend
  const handleSendCheckMaintenance = async (m: MaintenanceReceipt) => {
    setEquipError(null);
    setEquipSuccess(null);
    setEquipBusy(true);
    try {
      const maintIdNum = Number(m.id) || parseInt(m.id.replace(/\D/g, ""), 10);
      await equipmentApi.guiKiemTra(maintIdNum);
      await app.refreshEquipment?.();
      setEquipSuccess(`Đã gửi kiểm tra phiếu bảo trì ${m.id}.`);
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Không thể gửi kiểm tra.");
    } finally {
      setEquipBusy(false);
    }
  };

  return {
    subTab,
    setSubTab,
    filter,
    setFilter,
    productFilter,
    setProductFilter,
    transferModal,
    setTransferModal,
    targetProductId,
    setTargetProductId,
    viewingLifecycle,
    setViewingLifecycle,
    showAuditModal,
    setShowAuditModal,
    inspectingImportReceipt,
    setInspectingImportReceipt,
    viewingSupplierProfile,
    setViewingSupplierProfile,
    importSearch,
    setImportSearch,
    importStatusFilter,
    setImportStatusFilter,
    showCreateMaintenanceModal,
    setShowCreateMaintenanceModal,
    createMaintEquipId,
    setCreateMaintEquipId,
    createMaintIssue,
    setCreateMaintIssue,
    createMaintCost,
    setCreateMaintCost,
    createMaintOrderId,
    setCreateMaintOrderId,
    createMaintNote,
    setCreateMaintNote,
    acceptingMaintenance,
    setAcceptingMaintenance,
    actualRepairCost,
    setActualRepairCost,
    repairOutcome,
    setRepairOutcome,
    repairOutcomeNote,
    setRepairOutcomeNote,
    equipBusy,
    setEquipBusy,
    equipError,
    setEquipError,
    equipSuccess,
    setEquipSuccess,
    viewingEquipDetail,
    setViewingEquipDetail,
    assignMaintTarget,
    setAssignMaintTarget,
    assignHandlerId,
    setAssignHandlerId,
    assignReason,
    setAssignReason,
    progressMaintTarget,
    setProgressMaintTarget,
    progressNote,
    setProgressNote,
    progressCost,
    setProgressCost,
    products,
    filtered,
    handleOpenEquipSchedule,
    handleTransfer,
    handleSendCheckMaintenance,
  };
}
