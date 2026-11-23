import type React from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  returnApi,
  surchargeApi,
  type NhanTraBackend,
  type QuaHanChiTietBackend,
  type DonQuaHanBackend,
  type NhatKyLienHeQuaHanBackend,
} from "../../../services/api";
import type { Surcharge } from "../../../types";
import type { Order, ReturnReceipt, ReturnReceiptItem } from "../../../store";
import type { ApproveLostTarget, ContactOutcome, DebtRowItem, OverdueInfoState } from "./returnTypes";
import {
  createReturnReceiptAction,
  confirmApproveLostAction,
  applyOverdueFeeAction,
  saveContactLogAction,
} from "./returnActions";

interface UseReturnMutationsParams {
  app: ReturnType<typeof useApp>;
  order: Order | null;
  debtRows: DebtRowItem[];
  selectedItemsToReturn: Record<string, boolean>;
  setSelectedItemsToReturn: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  itemConditions: Record<string, ReturnReceiptItem["condition"]>;
  itemNotes: Record<string, string>;
  setItemNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  itemSurcharges: Record<string, number>;
  returnStaffNote: string;
  setReturnStaffNote: (v: string) => void;
  currentReturnRound: number;
  damagePhotos: string[];
  surchargesBackend: Surcharge[];
  overdueInfo: OverdueInfoState;
  overdueDetailBackend: QuaHanChiTietBackend | null;
  viewingBackendReceipt: NhanTraBackend | null;
  setViewingBackendReceipt: (v: NhanTraBackend | null) => void;
  setViewingReceipt: React.Dispatch<React.SetStateAction<ReturnReceipt | null>>;
  approveLostTarget: ApproveLostTarget | null;
  setApproveLostTarget: (v: ApproveLostTarget | null) => void;
  lostCompAmount: number;
  lostApproveReason: string;
  lostBienBan: string;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  setRejectingSurchargeId: (v: string | null) => void;
  contactOutcome: ContactOutcome;
  contactNote: string;
  setContactNote: (v: string) => void;
  newExpectedTime: string;
  setNewExpectedTime: (v: string) => void;
  setContactNotice: (v: string | null) => void;
  setContactLogsBackend: React.Dispatch<React.SetStateAction<NhatKyLienHeQuaHanBackend[]>>;
  setOverdueOrdersBackend: React.Dispatch<React.SetStateAction<DonQuaHanBackend[]>>;
  setScanningOverdue: (v: boolean) => void;
  setReturnBusy: (v: boolean) => void;
  setReturnError: (v: string | null) => void;
  setReturnSuccess: (v: string | null) => void;
  loadReturnData: () => Promise<void>;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}

// Hook đóng gói các mutation của tab Nhận trả: lập/chốt/tách phiếu, duyệt mất, phụ phí & nhật ký gọi
export function useReturnMutations(p: UseReturnMutationsParams) {
  const {
    app, order, debtRows, selectedItemsToReturn, setSelectedItemsToReturn,
    itemConditions, itemNotes, setItemNotes, itemSurcharges, returnStaffNote, setReturnStaffNote,
    currentReturnRound, damagePhotos, surchargesBackend, overdueInfo, overdueDetailBackend,
    viewingBackendReceipt, setViewingBackendReceipt, setViewingReceipt,
    approveLostTarget, setApproveLostTarget, lostCompAmount, lostApproveReason, lostBienBan,
    rejectReason, setRejectReason, setRejectingSurchargeId,
    contactOutcome, contactNote, setContactNote, newExpectedTime, setNewExpectedTime,
    setContactNotice, setContactLogsBackend, setOverdueOrdersBackend, setScanningOverdue,
    setReturnBusy, setReturnError, setReturnSuccess, loadReturnData, hydrateOperationalOrder,
  } = p;

  const handleCreateReceipt = async () => {
    if (!order) return;
    setReturnError(null);
    setReturnSuccess(null);
    const selectedRows = debtRows.filter((r) => selectedItemsToReturn[r.key]);
    if (selectedRows.length === 0) {
      setReturnError("Vui lòng tick chọn ít nhất 1 thiết bị khách mang đến trả đợt này.");
      return;
    }
    setReturnBusy(true);
    try {
      const res = await createReturnReceiptAction({
        app, order, selectedRows, itemConditions, itemNotes, itemSurcharges,
        returnStaffNote, currentReturnRound, damagePhotos,
        reloadAll: async () => {
          await Promise.all([
            loadReturnData(), hydrateOperationalOrder(order.id), app.refreshOrders?.(), app.refreshEquipment?.(),
          ]);
        },
      });
      if (!res.ok) {
        setReturnError(res.errorMessage || "Không thể lập phiếu nhận trả.");
        return;
      }
      if (res.backendReceipt !== undefined) setViewingBackendReceipt(res.backendReceipt);
      if (res.mockReceipt !== undefined) setViewingReceipt(res.mockReceipt);
      setSelectedItemsToReturn({});
      setItemNotes({});
      setReturnStaffNote("");
      setReturnSuccess(res.successMessage || null);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể lập phiếu nhận trả trên máy chủ.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleCloseBackendReceipt = async (phieuId: number) => {
    if (!order) return;
    setReturnBusy(true);
    setReturnError(null);
    setReturnSuccess(null);
    try {
      const closed = await returnApi.chotNhanTra(phieuId);
      setViewingBackendReceipt(closed);
      setReturnSuccess(`Đã chốt phiếu ${closed.maPhieuHienThi}.`);
      await Promise.all([
        loadReturnData(), hydrateOperationalOrder(order.id), app.refreshOrders?.(), app.refreshEquipment?.(),
      ]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể chốt phiếu nhận trả.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleSplitPendingLine = async (phieuId: number, chiTietId: number) => {
    if (!order) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      const { phieuGoc, phieuMoi } = await returnApi.tachDongChoXuLy(
        phieuId, [chiTietId], "Tách dòng thiết bị mất/cần xác minh thêm sang phiếu xử lý riêng"
      );
      setViewingBackendReceipt(phieuGoc);
      setReturnSuccess(`Đã tách dòng chờ xử lý sang phiếu ${phieuMoi.maPhieuHienThi}.`);
      await loadReturnData();
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể tách dòng chờ xử lý.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleConfirmApproveLost = async () => {
    if (!order || !approveLostTarget) return;
    if (!Number.isFinite(order.backendId ?? Number(order.id))) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      const res = await confirmApproveLostAction({
        order, approveLostTarget, surchargesBackend, lostCompAmount, lostApproveReason, lostBienBan,
        viewingBackendReceiptId: viewingBackendReceipt?.maPhieu,
      });
      setApproveLostTarget(null);
      setReturnSuccess(res.successMessage);
      if (viewingBackendReceipt?.maPhieu === approveLostTarget.phieuId) {
        setViewingBackendReceipt(res.updatedModalReceipt);
      }
      await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể duyệt kết luận mất (yêu cầu quyền Quản trị viên).");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleApproveSurcharge = async (surcharge: Surcharge) => {
    if (!order) return;
    if (!app.realApi) {
      app.approveSurcharge(order.id, surcharge.id);
      return;
    }
    if (!surcharge.backendId) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      await surchargeApi.duyetPhi(surcharge.backendId);
      setReturnSuccess("Đã duyệt phụ phí thành công.");
      await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể duyệt phụ phí (cần quyền Quản trị viên).");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleRejectSurcharge = async (surcharge: Surcharge) => {
    if (!order || !surcharge.backendId) return;
    if (!rejectReason.trim()) {
      setReturnError("Vui lòng nhập lý do từ chối phụ phí.");
      return;
    }
    setReturnBusy(true);
    setReturnError(null);
    try {
      await surchargeApi.tuChoiPhi(surcharge.backendId, rejectReason.trim());
      setRejectingSurchargeId(null);
      setRejectReason("");
      setReturnSuccess("Đã từ chối phụ phí.");
      await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể từ chối phụ phí.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleApplyOverdueFee = async () => {
    if (!order || !overdueInfo.isOverdue) return;
    if (app.realApi && !Number.isFinite(order.backendId ?? Number(order.id))) return;
    // FN5-04: chặn lập trùng — nếu đã có phụ phí trễ hạn (Chờ duyệt / Đã duyệt) thì không gọi lại
    const existing = surchargesBackend.find(
      (s) => s.type === "Quá hạn trả" && (s.status === "Chờ duyệt" || s.status === "Đã duyệt")
    );
    if (existing) {
      setReturnError("Phụ phí trễ hạn đã tồn tại cho đơn này. Không thể lập trùng.");
      return;
    }
    setReturnError(null);
    setReturnSuccess(null);
    setReturnBusy(true);
    try {
      const msg = await applyOverdueFeeAction({ app, order, overdueInfo, overdueDetailBackend });
      setReturnSuccess(msg);
      if (app.realApi) await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể lập phụ phí quá hạn.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleScanOverdueReminders = async () => {
    if (!app.realApi && !isRealApiEnabled()) return;
    setScanningOverdue(true);
    setReturnError(null);
    try {
      await returnApi.quetNhacQuaHan();
      const paged = await returnApi.layDonQuaHan({ trang: 1, soMoiTrang: 50 });
      setOverdueOrdersBackend(paged.items || []);
      setReturnSuccess(`Đã quét nhắc quá hạn (${paged.items?.length ?? 0} đơn quá hạn).`);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể quét nhắc quá hạn.");
    } finally {
      setScanningOverdue(false);
    }
  };

  const handleSaveContactLog = async () => {
    if (!order || !contactNote.trim()) {
      setContactNotice("Vui lòng nhập ghi chú nội dung cuộc gọi nhắc khách.");
      return;
    }
    setReturnBusy(true);
    setContactNotice(null);
    try {
      const res = await saveContactLogAction({ app, order, contactOutcome, contactNote, newExpectedTime });
      if (res.createdBackend) setContactLogsBackend((prev) => [res.createdBackend!, ...prev]);
      setContactNotice(res.notice);
      if (res.ok) {
        setContactNote("");
        setNewExpectedTime("");
      }
    } catch (err) {
      setContactNotice(err instanceof Error ? err.message : "Không thể lưu nhật ký liên hệ lên máy chủ.");
    } finally {
      setReturnBusy(false);
    }
  };

  return {
    handleCreateReceipt,
    handleCloseBackendReceipt,
    handleSplitPendingLine,
    handleConfirmApproveLost,
    handleApproveSurcharge,
    handleRejectSurcharge,
    handleApplyOverdueFee,
    handleScanOverdueReminders,
    handleSaveContactLog,
  };
}
