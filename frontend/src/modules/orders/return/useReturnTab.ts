import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  returnApi,
  surchargeApi,
  type NhanTraBackend,
  type ThietBiConNoBackend,
  type QuaHanChiTietBackend,
  type DonQuaHanBackend,
  type NhatKyLienHeQuaHanBackend,
} from "../../../services/api";
import { mapPhuPhiToSurcharge } from "../../../services/mappers";
import type { Surcharge } from "../../../types";
import { Order, ReturnReceipt, ReturnReceiptItem } from "../../../store";
import {
  getDefaultReturnFee,
  type ApproveLostTarget,
  type ContactOutcome,
  type DebtRowItem,
  type ReturnStatusFilter,
} from "./returnTypes";
import { useReturnMutations } from "./useReturnMutations";

// Hook quản lý state, tải dữ liệu & tính toán quá hạn cho tab Nhận trả nhiều đợt (UC4.3 & UC4.4)
export function useReturnTab(
  app: ReturnType<typeof useApp>,
  selectedOrder: Order | null,
  hydrateOperationalOrder: (id: string) => Promise<void>
) {
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<Record<string, boolean>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, ReturnReceiptItem["condition"]>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemSurcharges, setItemSurcharges] = useState<Record<string, number>>({});
  const [returnStaffNote, setReturnStaffNote] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReturnReceipt | null>(null);
  const [viewingBackendReceipt, setViewingBackendReceipt] = useState<NhanTraBackend | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>("active");

  // State đồng bộ API thật: thiết bị còn nợ, phiếu nhận trả, phụ phí, quá hạn & duyệt mất
  const [debtItemsBackend, setDebtItemsBackend] = useState<ThietBiConNoBackend[]>([]);
  const [returnReceiptsBackend, setReturnReceiptsBackend] = useState<NhanTraBackend[]>([]);
  const [surchargesBackend, setSurchargesBackend] = useState<Surcharge[]>([]);
  const [overdueDetailBackend, setOverdueDetailBackend] = useState<QuaHanChiTietBackend | null>(null);
  const [affectedOrdersBackend, setAffectedOrdersBackend] = useState<Array<Record<string, unknown>>>([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);
  const [rejectingSurchargeId, setRejectingSurchargeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveLostTarget, setApproveLostTarget] = useState<ApproveLostTarget | null>(null);
  const [lostApproveReason, setLostApproveReason] = useState("Xác nhận mất thiết bị sau đối chiếu kho và khách hàng");
  const [lostBienBan, setLostBienBan] = useState("");
  const [lostCompAmount, setLostCompAmount] = useState<number>(1000000);

  // State UC4.4: Nhật ký liên hệ quá hạn & quét nhắc
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactOutcome, setContactOutcome] = useState<ContactOutcome>("Hẹn giờ trả mới");
  const [contactNote, setContactNote] = useState("");
  const [newExpectedTime, setNewExpectedTime] = useState("");
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [overdueOrdersBackend, setOverdueOrdersBackend] = useState<DonQuaHanBackend[]>([]);
  const [scanningOverdue, setScanningOverdue] = useState(false);
  const [contactLogsBackend, setContactLogsBackend] = useState<NhatKyLienHeQuaHanBackend[]>([]);
  const [damagePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=200&auto=format&fit=crop&q=60",
  ]);

  const order = selectedOrder;

  const eligibleOrders = app.orders.filter((o) => {
    if (statusFilter === "active") return ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status);
    if (statusFilter === "completed") return o.status === "Hoàn tất";
    return ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status);
  });

  // Tải đồng thời 6 nguồn dữ liệu nhận trả của đơn đang chọn từ máy chủ
  const loadReturnData = useCallback(async () => {
    if (!app.realApi || !order) return;
    const donId = order.backendId ?? Number(order.id);
    if (!Number.isFinite(donId)) return;
    setReturnLoading(true);
    setReturnError(null);
    try {
      const [debt, receipts, surcharges, overdue, affected, contactLogs] = await Promise.all([
        returnApi.layThietBiConNo(donId).catch(() => [] as ThietBiConNoBackend[]),
        returnApi.layDanhSachTheoDon(donId).catch(() => [] as NhanTraBackend[]),
        surchargeApi.layTheoDon(donId).catch(() => []),
        returnApi.layChiTietQuaHan(donId).catch(() => null),
        returnApi.layDonBiAnhHuong(donId).catch(() => []),
        returnApi.layNhatKyLienHe(donId).catch(() => [] as NhatKyLienHeQuaHanBackend[]),
      ]);
      setDebtItemsBackend(debt);
      setReturnReceiptsBackend(receipts);
      setSurchargesBackend(surcharges.map(mapPhuPhiToSurcharge));
      setOverdueDetailBackend(overdue);
      setContactLogsBackend(contactLogs);
      setAffectedOrdersBackend(Array.isArray(affected) ? (affected as Array<Record<string, unknown>>) : []);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể tải dữ liệu nhận trả của đơn.");
    } finally {
      setReturnLoading(false);
    }
  }, [app.realApi, order?.id, order?.backendId]);

  useEffect(() => {
    setReturnSuccess(null);
    setReturnError(null);
    void loadReturnData();
  }, [loadReturnData]);

  useEffect(() => {
    if (!app.realApi && !isRealApiEnabled()) return;
    void returnApi
      .layDonQuaHan({ trang: 1, soMoiTrang: 50 })
      .then((paged) => setOverdueOrdersBackend(paged.items || []))
      .catch(() => {});
  }, [app.realApi]);

  // Tính thông tin quá hạn (ưu tiên backend khi bật realApi)
  const mockOverdueInfo = order
    ? app.checkOrderOverdue(order)
    : { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
  const realMaxDays = overdueDetailBackend
    ? Math.max(0, ...overdueDetailBackend.danhSachThietBi.map((x) => x.soNgayTre))
    : 0;
  const overdueInfo =
    app.realApi && overdueDetailBackend
      ? {
          isOverdue: realMaxDays > 0 || Number(overdueDetailBackend.tongPhiTreDuKien ?? 0) > 0,
          overdueDays: realMaxDays,
          overdueHours: realMaxDays * 24,
          surcharge: Number(overdueDetailBackend.tongPhiTreDuKien ?? 0),
        }
      : mockOverdueInfo;
  const overdueConflicts = order && !app.realApi ? app.getOverdueConflicts(order.id) : [];

  // Chuẩn hóa danh sách thiết bị còn nợ giữa realApi và mock store
  const debtEquipment = order?.assignedEquipment.filter((ae) => !ae.returnedAt) || [];
  const returnedEquipment = order?.assignedEquipment.filter((ae) => ae.returnedAt) || [];
  const debtRows: DebtRowItem[] = app.realApi
    ? debtItemsBackend.map((d) => {
        const prod = app.products.find((p) => p.name === d.tenSanPham);
        return {
          key: String(d.maChiTietBanGiao),
          maChiTietBanGiao: d.maChiTietBanGiao,
          equipmentId: String(d.maThietBi),
          displayCode: d.maThietBiHienThi,
          productName: d.tenSanPham,
          compensation: prod?.compensation || 1000000,
        };
      })
    : debtEquipment.map((ae) => {
        const prod = app.products.find((p) => p.id === ae.productId);
        return {
          key: ae.equipmentId,
          maChiTietBanGiao: undefined,
          equipmentId: ae.equipmentId,
          displayCode: ae.equipmentDisplayCode || ae.equipmentId,
          productName: prod?.name || "Thiết bị thuê",
          compensation: prod?.compensation || 1000000,
        };
      });

  const currentReturnRound = app.realApi ? returnReceiptsBackend.length + 1 : (order?.returnReceipts?.length || 0) + 1;
  const displaySurcharges = app.realApi ? surchargesBackend : order?.surcharges || [];

  const handleToggleSelect = (rowKey: string, _compensation: number, maChiTietBanGiao?: number) => {
    setSelectedItemsToReturn((prev) => {
      const next = !prev[rowKey];
      if (next && !itemConditions[rowKey]) {
        setItemConditions((c) => ({ ...c, [rowKey]: "Bình thường" }));
        setItemSurcharges((s) => ({ ...s, [rowKey]: 0 }));
      }
      if (next && app.realApi && maChiTietBanGiao) {
        void surchargeApi
          .goiYPhi(maChiTietBanGiao)
          .then((hints) => {
            const overdueHint = hints.find((h) => h.loaiPhi === "TreHan");
            if (overdueHint && overdueHint.soTienGoiY > 0 && !(itemSurcharges[rowKey] > 0)) {
              setItemSurcharges((s) => ({ ...s, [rowKey]: s[rowKey] || overdueHint.soTienGoiY }));
            }
          })
          .catch(() => {});
      }
      return { ...prev, [rowKey]: next };
    });
  };

  const handleConditionChange = (rowKey: string, cond: ReturnReceiptItem["condition"], compensation: number) => {
    setItemConditions((prev) => ({ ...prev, [rowKey]: cond }));
    setItemSurcharges((prev) => ({ ...prev, [rowKey]: getDefaultReturnFee(cond, compensation) }));
  };

  const mutations = useReturnMutations({
    app, order, debtRows, selectedItemsToReturn, setSelectedItemsToReturn,
    itemConditions, itemNotes, setItemNotes, itemSurcharges, returnStaffNote, setReturnStaffNote,
    currentReturnRound, damagePhotos, surchargesBackend, overdueInfo, overdueDetailBackend,
    viewingBackendReceipt, setViewingBackendReceipt, setViewingReceipt,
    approveLostTarget, setApproveLostTarget, lostCompAmount, lostApproveReason, lostBienBan,
    rejectReason, setRejectReason, setRejectingSurchargeId,
    contactOutcome, contactNote, setContactNote, newExpectedTime, setNewExpectedTime,
    setContactNotice, setContactLogsBackend, setOverdueOrdersBackend, setScanningOverdue,
    setReturnBusy, setReturnError, setReturnSuccess, loadReturnData, hydrateOperationalOrder,
  });

  const resetSelectionState = () => {
    setSelectedItemsToReturn({});
    setItemConditions({});
    setItemNotes({});
    setItemSurcharges({});
    setReturnStaffNote("");
    setRejectingSurchargeId(null);
    setRejectReason("");
  };

  return {
    selectedItemsToReturn, setSelectedItemsToReturn, itemConditions, itemNotes, setItemNotes,
    itemSurcharges, setItemSurcharges, returnStaffNote, setReturnStaffNote,
    viewingReceipt, setViewingReceipt, viewingBackendReceipt, setViewingBackendReceipt,
    statusFilter, setStatusFilter, returnReceiptsBackend, affectedOrdersBackend,
    returnLoading, returnBusy, returnError, returnSuccess, setReturnSuccess,
    rejectingSurchargeId, setRejectingSurchargeId, rejectReason, setRejectReason,
    approveLostTarget, setApproveLostTarget, lostApproveReason, setLostApproveReason,
    lostBienBan, setLostBienBan, lostCompAmount, setLostCompAmount,
    showContactModal, setShowContactModal, contactOutcome, setContactOutcome,
    contactNote, setContactNote, newExpectedTime, setNewExpectedTime,
    contactNotice, setContactNotice, overdueOrdersBackend, scanningOverdue, contactLogsBackend,
    eligibleOrders, order, overdueInfo, overdueConflicts, returnedEquipment, debtRows,
    currentReturnRound, displaySurcharges, loadReturnData, resetSelectionState,
    handleToggleSelect, handleConditionChange, ...mutations,
  };
}
