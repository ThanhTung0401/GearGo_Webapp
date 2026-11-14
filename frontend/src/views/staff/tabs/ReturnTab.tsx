import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  equipmentApi,
  orderApi,
  handoverApi,
  returnApi,
  surchargeApi,
  reportApi,
  auditApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type ThietBiConNoBackend,
  type QuaHanChiTietBackend,
  type BaoCaoVanHanhBackend,
  type XemTruocHuyBackend,
  type DonQuaHanBackend,
  type NhatKyLienHeQuaHanBackend,
  type ThietBiBackend,
  type PhanCongLichThietBiBackend,
} from "../../../services/api";
import { mapDonVanHanhChiTietToOrder, mapPhuPhiToSurcharge, mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../../../services/mappers";
import type { Surcharge } from "../../../types";
import {
  fmt,
  statusColors,
  Order,
  ReturnReceipt,
  ReturnReceiptItem,
  MaintenanceReceipt,
  Equipment,
  ImportReceipt,
  Supplier,
} from "../../../store";
import Icon from "../../../components/Icon";
import ReconciliationSheet from "../../ReconciliationSheet";
import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";
import SupplierProfileModal from "../../../components/SupplierProfileModal";
import GoodsReceivingModal from "../../../components/GoodsReceivingModal";
import { mapReturnCondToBackend, mapReturnCondToSurchargeType, type StaffTab } from "../returnMapping";
import { ReturnTabModals } from "./ReturnTabModals";
export function ReturnTab({
  app,
  selectedOrder,
  setSelectedOrderId,
  hydrateOperationalOrder,
}: {
  app: ReturnType<typeof useApp>;
  selectedOrder: Order | null;
  setSelectedOrderId: (id: string | null) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<Record<string, boolean>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, ReturnReceiptItem["condition"]>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemSurcharges, setItemSurcharges] = useState<Record<string, number>>({});
  const [returnStaffNote, setReturnStaffNote] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReturnReceipt | null>(null);
  const [viewingBackendReceipt, setViewingBackendReceipt] = useState<NhanTraBackend | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "all">("active");

  // State kết nối API thật nhận trả, phụ phí, quá hạn & duyệt mất
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
  const [approveLostTarget, setApproveLostTarget] = useState<{ phieuId: number; chiTiet: ChiTietNhanTraBackend } | null>(null);
  const [lostApproveReason, setLostApproveReason] = useState("Xác nhận mất thiết bị sau đối chiếu kho và khách hàng");
  const [lostBienBan, setLostBienBan] = useState("");
  const [lostCompAmount, setLostCompAmount] = useState<number>(1000000);

  // State UC4.4: Nhật ký liên hệ quá hạn & Xung đột lịch
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactOutcome, setContactOutcome] = useState<"Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất">("Hẹn giờ trả mới");
  const [contactNote, setContactNote] = useState("");
  const [newExpectedTime, setNewExpectedTime] = useState("");
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [overdueOrdersBackend, setOverdueOrdersBackend] = useState<DonQuaHanBackend[]>([]);
  const [scanningOverdue, setScanningOverdue] = useState(false);
  const [contactLogsBackend, setContactLogsBackend] = useState<NhatKyLienHeQuaHanBackend[]>([]);

  // State UC4.3: Ảnh bằng chứng hư hại
  const [damagePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=200&auto=format&fit=crop&q=60"
  ]);

  // Lọc đơn theo trạng thái: Đang xử lý, Đã hoàn tất hoặc Tất cả
  const eligibleOrders = app.orders.filter((o) => {
    if (statusFilter === "active") return ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status);
    if (statusFilter === "completed") return o.status === "Hoàn tất";
    return ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status);
  });
  const order = selectedOrder;

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

  // Tính toán quá hạn (ưu tiên backend khi realApi bật)
  const mockOverdueInfo = order ? app.checkOrderOverdue(order) : { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
  const realMaxDays = overdueDetailBackend
    ? Math.max(0, ...overdueDetailBackend.danhSachThietBi.map((x) => x.soNgayTre))
    : 0;
  const overdueInfo = app.realApi && overdueDetailBackend
    ? {
        isOverdue: realMaxDays > 0 || Number(overdueDetailBackend.tongPhiTreDuKien ?? 0) > 0,
        overdueDays: realMaxDays,
        overdueHours: realMaxDays * 24,
        surcharge: Number(overdueDetailBackend.tongPhiTreDuKien ?? 0),
      }
    : mockOverdueInfo;
  const overdueConflicts = order && !app.realApi ? app.getOverdueConflicts(order.id) : [];

  // Danh sách thiết bị còn nợ (hợp nhất từ API thật hoặc mock)
  const debtEquipment = order?.assignedEquipment.filter((ae) => !ae.returnedAt) || [];
  const returnedEquipment = order?.assignedEquipment.filter((ae) => ae.returnedAt) || [];
  const debtRows = app.realApi
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
          maChiTietBanGiao: undefined as number | undefined,
          equipmentId: ae.equipmentId,
          displayCode: ae.equipmentDisplayCode || ae.equipmentId,
          productName: prod?.name || "Thiết bị thuê",
          compensation: prod?.compensation || 1000000,
        };
      });

  const currentReturnRound = app.realApi
    ? returnReceiptsBackend.length + 1
    : (order?.returnReceipts?.length || 0) + 1;
  const displaySurcharges = app.realApi ? surchargesBackend : order?.surcharges || [];

  const defaultFee = (cond: ReturnReceiptItem["condition"], compensation: number) => {
    if (cond === "Cần vệ sinh") return 50000;
    if (cond === "Hỏng nhẹ") return Math.round(compensation * 0.1);
    if (cond === "Hỏng nặng") return Math.round(compensation * 0.4);
    if (cond === "Thiếu phụ kiện") return 80000;
    if (cond === "Mất thiết bị") return compensation;
    return 0;
  };

  const handleToggleSelect = (rowKey: string, _compensation: number, maChiTietBanGiao?: number) => {
    setSelectedItemsToReturn((prev) => {
      const next = !prev[rowKey];
      if (next && !itemConditions[rowKey]) {
        setItemConditions((c) => ({ ...c, [rowKey]: "Bình thường" }));
        setItemSurcharges((s) => ({ ...s, [rowKey]: 0 }));
      }
      if (next && app.realApi && maChiTietBanGiao) {
        // Lấy gợi ý phí quá hạn / hư hỏng nếu có từ backend
        void surchargeApi.goiYPhi(maChiTietBanGiao).then((hints) => {
          const overdueHint = hints.find((h) => h.loaiPhi === "TreHan");
          if (overdueHint && overdueHint.soTienGoiY > 0 && !(itemSurcharges[rowKey] > 0)) {
            setItemSurcharges((s) => ({ ...s, [rowKey]: s[rowKey] || overdueHint.soTienGoiY }));
          }
        }).catch(() => {});
      }
      return { ...prev, [rowKey]: next };
    });
  };

  const handleConditionChange = (rowKey: string, cond: ReturnReceiptItem["condition"], compensation: number) => {
    setItemConditions((prev) => ({ ...prev, [rowKey]: cond }));
    const fee = defaultFee(cond, compensation);
    setItemSurcharges((prev) => ({ ...prev, [rowKey]: fee }));
  };

  const handleCreateReceipt = async () => {
    if (!order) return;
    setReturnError(null);
    setReturnSuccess(null);

    const selectedRows = debtRows.filter((r) => selectedItemsToReturn[r.key]);
    if (selectedRows.length === 0) {
      setReturnError("Vui lòng tick chọn ít nhất 1 thiết bị khách mang đến trả đợt này.");
      return;
    }

    if (app.realApi) {
      const donId = order.backendId ?? Number(order.id);
      if (!Number.isFinite(donId)) return;
      setReturnBusy(true);
      try {
        const bgIds = selectedRows
          .map((r) => r.maChiTietBanGiao)
          .filter((x): x is number => typeof x === "number" && x > 0);
        if (bgIds.length === 0) {
          throw new Error("Không tìm thấy mã chi tiết bàn giao hợp lệ để lập phiếu nhận trả.");
        }
        const noteText =
          returnStaffNote.trim() || `Nhận trả đợt ${currentReturnRound} (${selectedRows.length} thiết bị)`;
        const draft = await returnApi.taoPhieuNhap(donId, bgIds, noteText);
        const nowIso = new Date().toISOString();

        const updatedDraft = await returnApi.capNhatPhieuNhap(
          draft.maPhieu,
          selectedRows.map((row) => {
            const cond = itemConditions[row.key] || "Bình thường";
            return {
              maChiTietBanGiao: row.maChiTietBanGiao!,
              thoiDiemTraThucTe: nowIso,
              ketLuan: mapReturnCondToBackend(cond),
              tinhTrangSauThue: cond,
              danhSachAnh: cond === "Bình thường" ? undefined : damagePhotos,
              bienBanMat:
                cond === "Mất thiết bị"
                  ? itemNotes[row.key]?.trim() || "Khách báo mất thiết bị khi nhận trả"
                  : undefined,
              ghiChu: itemNotes[row.key]?.trim() || undefined,
            };
          }),
          noteText
        );

        // Lập phụ phí phát sinh kèm theo nếu có số tiền > 0 hoặc báo mất
        for (const row of selectedRows) {
          const cond = itemConditions[row.key] || "Bình thường";
          const fee = itemSurcharges[row.key] || 0;
          if (fee > 0 || cond === "Mất thiết bị") {
            await surchargeApi.lapPhi({
              maDonThue: donId,
              maChiTietBanGiao: row.maChiTietBanGiao,
              loaiPhi: mapReturnCondToSurchargeType(cond),
              soTienDeNghi: fee > 0 ? fee : row.compensation,
              lyDo: itemNotes[row.key]?.trim() || `Phụ phí ${cond} (${row.displayCode})`,
              danhSachAnh: cond === "Bình thường" ? undefined : damagePhotos,
            });
          }
        }

        const hasLostItem = selectedRows.some(
          (row) => (itemConditions[row.key] || "Bình thường") === "Mất thiết bị"
        );
        let finalReceipt = updatedDraft;
        if (!hasLostItem) {
          finalReceipt = await returnApi.chotNhanTra(draft.maPhieu);
          setReturnSuccess(`Đã lập và chốt phiếu nhận trả ${finalReceipt.maPhieuHienThi}.`);
        } else {
          setReturnSuccess(
            `Đã tạo phiếu nháp ${updatedDraft.maPhieuHienThi}. Do có thiết bị báo mất, vui lòng duyệt kết luận mất hoặc tách dòng chờ xử lý trước khi chốt.`
          );
        }

        setViewingBackendReceipt(finalReceipt);
        setSelectedItemsToReturn({});
        setItemNotes({});
        setReturnStaffNote("");
        await Promise.all([
          loadReturnData(),
          hydrateOperationalOrder(order.id),
          app.refreshOrders?.(),
          app.refreshEquipment?.(),
        ]);
      } catch (err) {
        setReturnError(err instanceof Error ? err.message : "Không thể lập phiếu nhận trả trên máy chủ.");
      } finally {
        setReturnBusy(false);
      }
      return;
    }

    const returnItems: ReturnReceiptItem[] = selectedRows.map((row) => {
      const ae = order.assignedEquipment.find((a) => a.equipmentId === row.equipmentId)!;
      const cond = itemConditions[row.key] || "Bình thường";
      const surcharge = itemSurcharges[row.key] || 0;
      const note = itemNotes[row.key] || "";
      return {
        equipmentId: row.equipmentId,
        productId: ae.productId,
        condition: cond,
        surchargeAmount: surcharge,
        note,
        lostApproved: false,
      };
    });

    const res = app.createReturnReceipt(order.id, {
      returnItems,
      staffName: app.currentUser?.name || "NV Kho",
      note: returnStaffNote || `Nhận trả đợt ${currentReturnRound} (${returnItems.length} thiết bị)`,
      photoUrls: damagePhotos,
    });

    if (res.ok) {
      setViewingReceipt(res.data ?? null);
      setSelectedItemsToReturn({});
      setItemNotes({});
      setReturnStaffNote("");
      setReturnSuccess(`Đã lập phiếu nhận trả ${res.data?.id || ""}.`);
    } else {
      setReturnError(res.message);
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
        loadReturnData(),
        hydrateOperationalOrder(order.id),
        app.refreshOrders?.(),
        app.refreshEquipment?.(),
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
        phieuId,
        [chiTietId],
        "Tách dòng thiết bị mất/cần xác minh thêm sang phiếu xử lý riêng"
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
    const donId = order.backendId ?? Number(order.id);
    if (!Number.isFinite(donId)) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      const { phieuId, chiTiet } = approveLostTarget;
      // Tìm phụ phí bồi thường hiện có của thiết bị này, nếu chưa có thì lập mới
      let matchedSurcharge = surchargesBackend.find(
        (s) => s.handoverItemId === chiTiet.maChiTietBanGiao && s.type === "Mất đồ" && s.backendId
      );
      let surchargeId = matchedSurcharge?.backendId;
      if (!surchargeId) {
        const created = await surchargeApi.lapPhi({
          maDonThue: donId,
          maChiTietBanGiao: chiTiet.maChiTietBanGiao,
          loaiPhi: "MatThietBi",
          soTienDeNghi: lostCompAmount,
          lyDo: lostApproveReason.trim() || `Bồi thường mất thiết bị ${chiTiet.maThietBiHienThi}`,
        });
        surchargeId = created.maPhuPhi;
      }
      await returnApi.duyetKetLuanMat(phieuId, chiTiet.maChiTietNhanTra, {
        lyDo: lostApproveReason.trim() || "Duyệt kết luận mất thiết bị",
        bienBanMat: lostBienBan.trim() || chiTiet.bienBanMat || `Biên bản mất ${chiTiet.maThietBiHienThi}`,
        maPhuPhiBoiThuong: surchargeId,
      });
      setApproveLostTarget(null);
      setReturnSuccess(`Đã duyệt kết luận mất cho thiết bị ${chiTiet.maThietBiHienThi}.`);
      const refreshedReceipts = await returnApi.layDanhSachTheoDon(donId).catch(() => [] as NhanTraBackend[]);
      const updatedModalReceipt = refreshedReceipts.find((r) => r.maPhieu === phieuId) || null;
      if (viewingBackendReceipt?.maPhieu === phieuId) {
        setViewingBackendReceipt(updatedModalReceipt);
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
    if (app.realApi) {
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
      return;
    }
    app.approveSurcharge(order.id, surcharge.id);
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
    setReturnError(null);
    setReturnSuccess(null);

    if (app.realApi) {
      const donId = order.backendId ?? Number(order.id);
      if (!Number.isFinite(donId)) return;
      setReturnBusy(true);
      try {
        const overdueItems = overdueDetailBackend?.danhSachThietBi.filter((x) => x.soNgayTre > 0 && x.phiTreDuKien > 0) || [];
        if (overdueItems.length > 0) {
          for (const item of overdueItems) {
            await surchargeApi.lapPhi({
              maDonThue: donId,
              maChiTietBanGiao: item.maChiTietBanGiao,
              loaiPhi: "TreHan",
              soTienDeNghi: item.phiTreDuKien,
              lyDo: `Quá hạn trả ${item.soNgayTre} ngày (${item.maThietBiHienThi}) × 150% giá thuê ngày`,
            });
          }
        } else {
          await surchargeApi.lapPhi({
            maDonThue: donId,
            loaiPhi: "TreHan",
            soTienDeNghi: overdueInfo.surcharge,
            lyDo: `Quá hạn trả ${overdueInfo.overdueDays} ngày × 150% đơn giá thuê ngày`,
          });
        }
        setReturnSuccess(`Đã lập phụ phí quá hạn ${fmt(overdueInfo.surcharge)} lên máy chủ.`);
        await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
      } catch (err) {
        setReturnError(err instanceof Error ? err.message : "Không thể lập phụ phí quá hạn.");
      } finally {
        setReturnBusy(false);
      }
      return;
    }

    app.addSurcharge(order.id, {
      id: `PC-OVERDUE-${order.id}-${Date.now()}`,
      type: "Quá hạn",
      equipmentId: "TẤT CẢ",
      amount: overdueInfo.surcharge,
      reason: `Quá hạn trả ${overdueInfo.overdueDays} ngày (${overdueInfo.overdueHours} giờ) × 150% tiền thuê ngày`,
      status: "Chờ duyệt",
      createdBy: "Hệ thống tự động",
    });
    setReturnSuccess(`Đã thêm phụ phí quá hạn ${fmt(overdueInfo.surcharge)} vào đơn.`);
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

  useEffect(() => {
    if (!app.realApi && !isRealApiEnabled()) return;
    void returnApi
      .layDonQuaHan({ trang: 1, soMoiTrang: 50 })
      .then((paged) => setOverdueOrdersBackend(paged.items || []))
      .catch(() => {});
  }, [app.realApi]);

  const handleSaveContactLog = async () => {
    if (!order || !contactNote.trim()) {
      setContactNotice("Vui lòng nhập ghi chú nội dung cuộc gọi nhắc khách.");
      return;
    }

    if (app.realApi || isRealApiEnabled()) {
      setReturnBusy(true);
      setContactNotice(null);
      try {
        const donId = Number(order.backendId ?? order.id);
        const ketQuaMap: Record<typeof contactOutcome, string> = {
          "Hẹn giờ trả mới": "HenTraMoi",
          "Xin gia hạn thêm": "XinGiaHan",
          "Không nghe máy": "KhongLienHeDuoc",
          "Khách báo mất": "BaoMatThietBi",
        };
        const parsedHenTra = newExpectedTime.trim() ? new Date(newExpectedTime.trim()) : null;
        const henTraMoiIso = parsedHenTra && !Number.isNaN(parsedHenTra.getTime()) ? parsedHenTra.toISOString() : undefined;
        const created = await returnApi.ghiNhatKyLienHe(donId, {
          kenhLienHe: "GoiDien",
          ketQua: ketQuaMap[contactOutcome] || "DaLienHe",
          noiDung: henTraMoiIso || !newExpectedTime.trim()
            ? contactNote.trim()
            : `${contactNote.trim()} (Hẹn trả mới: ${newExpectedTime.trim()})`,
          henTraMoi: henTraMoiIso,
        });
        setContactLogsBackend((prev) => [created, ...prev]);
        setContactNotice("Đã lưu nhật ký liên hệ lên máy chủ.");
        setContactNote("");
        setNewExpectedTime("");
      } catch (err) {
        setContactNotice(err instanceof Error ? err.message : "Không thể lưu nhật ký liên hệ lên máy chủ.");
      } finally {
        setReturnBusy(false);
      }
      return;
    }

    const res = app.addContactLog(order.id, {
      staffName: app.currentUser?.name || "NV Kho",
      outcome: contactOutcome,
      note: contactNote,
      newExpectedTime: newExpectedTime || undefined,
    });
    if (res.ok) {
      setContactNotice("Đã lưu nhật ký liên hệ vào phiên làm việc.");
      setContactNote("");
      setNewExpectedTime("");
    } else {
      setContactNotice(res.message);
    }
  };

  return (
    <div className="responsive-staff-grid grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>
      {/* Cột trái: Danh sách đơn */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)", marginBottom: "8px" }}>
          Đơn nhận trả & đối soát
        </h3>

        {(app.realApi || isRealApiEnabled()) && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: "0.74rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#991B1B", fontWeight: 600 }}>
              ⏰ Quá hạn hệ thống: <strong>{overdueOrdersBackend.length}</strong> đơn
            </span>
            <button
              type="button"
              disabled={scanningOverdue}
              onClick={() => void handleScanOverdueReminders()}
              style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
            >
              {scanningOverdue ? "Đang quét..." : "Quét nhắc"}
            </button>
          </div>
        )}

        {/* Bộ lọc trạng thái đơn */}
        <div className="flex gap-1 mb-3">
          {[
            { key: "active", label: "Đang xử lý", count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status)).length },
            { key: "completed", label: "Hoàn tất", count: app.orders.filter((o) => o.status === "Hoàn tất").length },
            { key: "all", label: "Tất cả", count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status)).length },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key as typeof statusFilter)}
              style={{
                flex: 1,
                padding: "5px 6px",
                borderRadius: 6,
                fontSize: "0.72rem",
                fontWeight: statusFilter === f.key ? 700 : 500,
                border: "1px solid",
                borderColor: statusFilter === f.key ? "var(--color-forest)" : "var(--color-bone)",
                background: statusFilter === f.key ? "var(--color-forest)" : "white",
                color: statusFilter === f.key ? "white" : "var(--color-bark)",
                cursor: "pointer",
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {eligibleOrders.length === 0 ? (
            <div style={{ background: "white", borderRadius: 10, padding: "20px 14px", border: "1px solid var(--color-bone)", fontSize: "0.82rem", color: "#6B7280", textAlign: "center" }}>
              Không có đơn nào trong nhóm lọc này.
            </div>
          ) : (
            eligibleOrders.map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isOd = app.checkOrderOverdue(o).isOverdue;
              const retCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
              const isPart = o.status === "Đang thuê" && retCnt > 0 && retCnt < o.assignedEquipment.length;

              return (
                <button
                  key={o.id}
                  onClick={() => {
                    setSelectedOrderId(o.id);
                    setSelectedItemsToReturn({});
                    void hydrateOperationalOrder(o.id);
                  }}
                  style={{
                    background: selectedOrder?.id === o.id ? "var(--color-forest)" : "white",
                    color: selectedOrder?.id === o.id ? "white" : "var(--color-bark)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: `1px solid ${selectedOrder?.id === o.id ? "var(--color-forest)" : "var(--color-bone)"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", opacity: 0.85 }}>{o.displayCode || o.id}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{o.customerName}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span style={{ background: selectedOrder?.id === o.id ? "rgba(255,255,255,0.2)" : sc.bg, color: selectedOrder?.id === o.id ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                      {o.status}
                    </span>
                    {isPart && <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Trả 1 phần</span>}
                    {isOd && <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Quá hạn</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Cột phải: Xử lý nhận trả từng đợt & Đối soát */}
      <div>
        {returnError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {returnError}
          </div>
        )}
        {returnSuccess && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {returnSuccess}
          </div>
        )}

        {!order ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "var(--color-moss)" }}>
              <Icon name="arrow-down" size={36} />
            </div>
            <p>Chọn một đơn thuê ở bên trái để lập phiếu nhận trả hoặc đối soát cọc.</p>
          </div>
        ) : order.status === "Hoàn tất" ? (
          <div>
            <ReconciliationSheet
              order={order}
              app={app}
              userRole={app.currentUser?.role === "admin" ? "admin" : "staff"}
              onAfterMutation={async () => {
                await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
              }}
            />
          </div>
        ) : (
          <div>
            {/* Header info đơn */}
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>
                    {order.displayCode || order.id}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ""}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                    Hẹn trả dự kiến: <strong style={{ color: overdueInfo.isOverdue ? "#DC2626" : "inherit" }}>{order.returnTime}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                    Tổng thiết bị đã giao: <strong>{order.assignedEquipment.length}</strong>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#15803D" }}>
                    Đã trả / xử lý: <strong>{app.realApi ? Math.max(0, order.assignedEquipment.length - debtRows.length) : returnedEquipment.length}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: debtRows.length > 0 ? "#DC2626" : "#15803D", fontWeight: 700 }}>
                    Còn nợ: {debtRows.length} chiếc
                  </div>
                </div>
              </div>
              {returnLoading && (
                <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#6B7280" }}>
                  Đang đồng bộ danh sách thiết bị còn nợ và phiếu nhận trả từ máy chủ...
                </div>
              )}
            </div>

            {/* Banner Cảnh báo quá hạn & Đơn kế tiếp bị ảnh hưởng */}
            {overdueInfo.isOverdue && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 700, color: "#DC2626", fontSize: "0.95rem" }}>
                        <span className="icon-label">
                          <Icon name="alert-circle" size={16} />
                          ĐƠN THUÊ QUÁ HẠN: Trễ {overdueInfo.overdueDays} ngày
                        </span>
                      </span>
                      {(overdueConflicts.length > 0 || affectedOrdersBackend.length > 0) && (
                        <span style={{ background: "#DC2626", color: "white", padding: "1px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                          ẢNH HƯỞNG {app.realApi ? affectedOrdersBackend.length : overdueConflicts.length} ĐƠN SAU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#991B1B", marginTop: 2 }}>
                      Phạt trễ 150% đơn giá ngày = <strong>+{fmt(overdueInfo.surcharge)}</strong>.
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => {
                        setContactNotice(null);
                        setShowContactModal(true);
                      }}
                      style={{ background: "#1E40AF", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Nhật ký gọi ({order.contactLogs?.length || 0})
                    </button>
                    <button
                      disabled={returnBusy}
                      onClick={handleApplyOverdueFee}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: returnBusy ? "not-allowed" : "pointer" }}
                    >
                      + Lập phụ phí trễ
                    </button>
                  </div>
                </div>

                {overdueConflicts.length > 0 && (
                  <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                      CẢNH BÁO KẸT THIẾT BỊ ĐƠN TIẾP THEO:
                    </div>
                    {overdueConflicts.map((c, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 2 }}>
                        • Thiết bị <strong style={{ color: "var(--color-forest)" }}>{c.equipmentId}</strong> đang bị trễ cho đơn kế tiếp: <strong>{c.nextOrderId}</strong> ({c.nextCustomerName} - Hẹn nhận: {c.nextPickupTime}).
                        {c.availableSubstitutes.length > 0 ? (
                          <span style={{ color: "#15803D", marginLeft: 6 }}>
                            Gợi ý mã thay thế: <strong>{c.availableSubstitutes.slice(0, 3).join(", ")}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#DC2626", marginLeft: 6, fontWeight: 700 }}>
                            (Kho không còn mã thay thế)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {app.realApi && affectedOrdersBackend.length > 0 && (
                  <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                      ĐƠN ĐẶT KẾ TIẾP BỊ ẢNH HƯỞNG BỞI THIẾT BỊ TRỄ HẠN:
                    </div>
                    {affectedOrdersBackend.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 2 }}>
                        • {String(item.maDonHienThi || item.maDonThue || `Đơn #${idx + 1}`)} — {String(item.tenSanPham || item.tenKhachHang || "Cần điều phối thiết bị dự phòng")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Lập Phiếu Nhận Trả Từng Đợt (khi còn thiết bị nợ) */}
            {debtRows.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-forest)", padding: "18px", marginBottom: 20 }}>
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <div>
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                      ĐỢT TRẢ SỐ {currentReturnRound}
                    </span>
                    <h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", margin: "4px 0 0" }}>
                      Lập Phiếu Nhận Trả ({order.displayCode || order.id})
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const allSel: Record<string, boolean> = {};
                      debtRows.forEach((row) => {
                        allSel[row.key] = true;
                      });
                      setSelectedItemsToReturn(allSel);
                    }}
                    style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                  >
                    Chọn tất cả {debtRows.length} món nợ
                  </button>
                </div>

                <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
                  Tick chọn những thiết bị khách mang đến trả lần này. Những món chưa chọn sẽ giữ nguyên trạng thái nợ thiết bị.
                </p>

                <div className="flex flex-col gap-3">
                  {debtRows.map((row) => {
                    const isSelected = !!selectedItemsToReturn[row.key];
                    const cond = itemConditions[row.key] || "Bình thường";
                    const fee = itemSurcharges[row.key] || 0;

                    return (
                      <div key={row.key} style={{ background: isSelected ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${isSelected ? "#86EFAC" : "var(--color-bone)"}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.key, row.compensation, row.maChiTietBanGiao)}
                            style={{ width: 18, height: 18, accentColor: "var(--color-forest)", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.85rem" }}>
                                {row.displayCode}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{row.productName}</span>
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                              Giá trị bồi thường tham chiếu: {fmt(row.compensation)}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #CBD5E1" }}>
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>Tình trạng nhận lại:</span>
                              {(["Bình thường", "Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện", "Mất thiết bị"] as ReturnReceiptItem["condition"][]).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleConditionChange(row.key, c, row.compensation)}
                                  style={{
                                    border: "1px solid",
                                    borderColor: cond === c ? "var(--color-forest)" : "var(--color-bone)",
                                    background: cond === c ? "var(--color-forest)" : "white",
                                    color: cond === c ? "white" : "var(--color-bark)",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                    fontWeight: cond === c ? 700 : 500,
                                  }}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-2 items-center flex-wrap">
                              <input
                                placeholder="Ghi chú chi tiết lỗi/hư hỏng hoặc tình trạng..."
                                value={itemNotes[row.key] || ""}
                                onChange={(e) => setItemNotes((prev) => ({ ...prev, [row.key]: e.target.value }))}
                                style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", background: "white" }}
                              />
                              <div className="flex items-center gap-1">
                                <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Phụ phí:</span>
                                <input
                                  type="number"
                                  value={fee}
                                  onChange={(e) => setItemSurcharges((prev) => ({ ...prev, [row.key]: Number(e.target.value) }))}
                                  style={{ width: 110, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: fee > 0 ? "#DC2626" : "inherit" }}
                                />
                                <span style={{ fontSize: "0.75rem" }}>đ</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12 }}>
                  <input
                    placeholder="Ghi chú chung của nhân viên nhận trả đợt này (tùy chọn)..."
                    value={returnStaffNote}
                    onChange={(e) => setReturnStaffNote(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
                  />
                </div>

                {(() => {
                  const selCount = debtRows.filter((r) => selectedItemsToReturn[r.key]).length;
                  const remainAfter = debtRows.length - selCount;
                  return (
                    <div style={{ marginTop: 12, background: remainAfter > 0 ? "#FFF7ED" : "#DCFCE7", border: `1px solid ${remainAfter > 0 ? "#FFEDD5" : "#BBF7D0"}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: remainAfter > 0 ? "#C2410C" : "#15803D" }}>
                      {remainAfter > 0 ? (
                        <>
                          <strong>Nhận trả một phần:</strong> Khách trả {selCount} món, còn nợ lại <strong>{remainAfter} món</strong>. Đơn vẫn giữ trạng thái <strong>Đang thuê</strong> cho đến khi thu hồi đủ.
                        </>
                      ) : (
                        <>
                          <strong>Hoàn tất nhận trả (Lần trả cuối):</strong> Toàn bộ {debtRows.length} thiết bị còn lại sẽ được thu hồi / xử lý, sẵn sàng bước <strong>Đối soát cọc</strong>.
                        </>
                      )}
                    </div>
                  );
                })()}

                <button
                  disabled={returnBusy}
                  onClick={handleCreateReceipt}
                  style={{ marginTop: 14, background: "var(--color-forest)", color: "white", padding: "10px 22px", borderRadius: 8, border: "none", cursor: returnBusy ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  {returnBusy ? "Đang xử lý..." : `✓ Xác nhận lập Phiếu Nhận Trả Đợt ${currentReturnRound}`}
                </button>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả đã lập (Backend realApi) */}
            {app.realApi && returnReceiptsBackend.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12 }}>
                  Lịch sử các đợt nhận trả ({returnReceiptsBackend.length} phiếu)
                </h4>
                <div className="flex flex-col gap-2">
                  {returnReceiptsBackend.map((rc) => {
                    const isClosed = rc.trangThai === "DaChot";
                    return (
                      <div key={rc.maPhieu} style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.85rem" }}>
                              {rc.maPhieuHienThi}
                            </strong>
                            <span style={{ fontSize: "0.72rem", background: rc.laLanTraCuoi ? "#DCFCE7" : "#FFF7ED", color: rc.laLanTraCuoi ? "#15803D" : "#C2410C", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                              {rc.laLanTraCuoi ? "Lần trả cuối" : `Đợt ${rc.lanTra}`}
                            </span>
                            <span style={{ fontSize: "0.7rem", background: isClosed ? "#DCFCE7" : "#FEF3C7", color: isClosed ? "#15803D" : "#B45309", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                              {isClosed ? "Đã chốt" : rc.trangThai}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 2 }}>
                            {rc.thoiDiemChot || rc.thoiDiemLap} · {rc.tenNhanVienLucNhan || "Nhân viên kho"} · {rc.chiTiet.length} thiết bị
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isClosed && (
                            <button
                              disabled={returnBusy}
                              onClick={() => handleCloseBackendReceipt(rc.maPhieu)}
                              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.74rem", cursor: "pointer", fontWeight: 700 }}
                            >
                              Chốt phiếu
                            </button>
                          )}
                          <button
                            onClick={() => setViewingBackendReceipt(rc)}
                            style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                          >
                            Xem phiếu
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả (Mock mode) */}
            {!app.realApi && (order.returnReceipts?.length || 0) > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12 }}>
                  Lịch sử các đợt nhận trả ({order.returnReceipts?.length} phiếu)
                </h4>
                <div className="flex flex-col gap-2">
                  {order.returnReceipts?.map((rc) => (
                    <div key={rc.id} style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.85rem" }}>{rc.id}</strong>
                          <span style={{ fontSize: "0.72rem", background: rc.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: rc.isFinalReturn ? "#15803D" : "#C2410C", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                            {rc.isFinalReturn ? "Lần trả cuối" : `Đợt ${rc.returnRound}`}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                          {rc.returnedAt} · Người nhận: {rc.staffName} · {rc.items.length} thiết bị
                        </div>
                      </div>
                      <button onClick={() => setViewingReceipt(rc)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
                        Xem phiếu
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách phụ phí đã đề xuất */}
            {displaySurcharges.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>Phụ phí bồi thường & trễ hạn</h4>
                {displaySurcharges.map((s) => (
                  <div key={s.id} style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA", marginBottom: 8 }}>
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.type} — {s.equipmentId}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{s.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>+{fmt(s.amount)}</span>
                        <span style={{ background: s.status === "Đã duyệt" ? "#DCFCE7" : s.status === "Từ chối" ? "#FEE2E2" : "#FEF3C7", color: s.status === "Đã duyệt" ? "#15803D" : s.status === "Từ chối" ? "#B91C1C" : "#B45309", padding: "3px 8px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 600 }}>
                          {s.status}
                        </span>
                        {s.status === "Chờ duyệt" && (
                          <>
                            <button
                              disabled={returnBusy}
                              onClick={() => handleApproveSurcharge(s)}
                              style={{ background: "#15803D", color: "white", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700 }}
                            >
                              Duyệt
                            </button>
                            {app.realApi && s.backendId && (
                              <button
                                disabled={returnBusy}
                                onClick={() => {
                                  setRejectingSurchargeId(s.id);
                                  setRejectReason("");
                                }}
                                style={{ background: "white", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, padding: "3px 8px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700 }}
                              >
                                Từ chối
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {rejectingSurchargeId === s.id && (
                      <div className="flex gap-2 items-center mt-2 pt-2" style={{ borderTop: "1px dashed #FDBA74" }}>
                        <input
                          placeholder="Nhập lý do từ chối phụ phí..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem", background: "white" }}
                        />
                        <button
                          disabled={returnBusy}
                          onClick={() => handleRejectSurcharge(s)}
                          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.74rem", cursor: "pointer", fontWeight: 700 }}
                        >
                          Xác nhận từ chối
                        </button>
                        <button
                          onClick={() => setRejectingSurchargeId(null)}
                          style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.74rem", cursor: "pointer" }}
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Chuyển sang Chờ đối soát (mock) hoặc mở bảng đối soát trực tiếp (realApi / Chờ đối soát) */}
            {!app.realApi && order.status === "Đã nhận trả" && (
              <div style={{ background: "#EFF6FF", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid #BFDBFE" }}>
                <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: "4px" }}>✓ Toàn bộ thiết bị đã nhận trả xong</div>
                <div style={{ fontSize: "0.82rem", color: "#1E40AF", marginBottom: "10px" }}>Chuyển đơn sang Chờ đối soát để lập lệnh hoàn cọc hoặc thu thêm.</div>
                <button
                  onClick={() => app.advanceOrderStatus(order.id, "Chờ đối soát")}
                  style={{ background: "#1D4ED8", color: "white", padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}
                >
                  Chuyển sang Chờ đối soát →
                </button>
              </div>
            )}

            {(order.status === "Chờ đối soát" || (app.realApi && order.status === "Đã nhận trả")) && (
              <div style={{ marginTop: 20 }}>
                <ReconciliationSheet
                  order={order}
                  app={app}
                  userRole={app.currentUser?.role === "admin" ? "admin" : "staff"}
                  onAfterMutation={async () => {
                    await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
                  }}
                />
              </div>
            )}
          </div>
        )}

        <ReturnTabModals
          app={app}
          order={order}
          viewingBackendReceipt={viewingBackendReceipt}
          setViewingBackendReceipt={setViewingBackendReceipt}
          viewingReceipt={viewingReceipt}
          setViewingReceipt={setViewingReceipt}
          returnBusy={returnBusy}
          setReturnSuccess={setReturnSuccess}
          contactNotice={contactNotice}
          setApproveLostTarget={setApproveLostTarget}
          approveLostTarget={approveLostTarget}
          lostApproveReason={lostApproveReason}
          setLostApproveReason={setLostApproveReason}
          lostCompAmount={lostCompAmount}
          setLostCompAmount={setLostCompAmount}
          lostBienBan={lostBienBan}
          setLostBienBan={setLostBienBan}
          handleSplitPendingLine={handleSplitPendingLine}
          handleCloseBackendReceipt={handleCloseBackendReceipt}
          handleConfirmApproveLost={handleConfirmApproveLost}
          showContactModal={showContactModal}
          setShowContactModal={setShowContactModal}
          contactLogsBackend={contactLogsBackend}
          contactOutcome={contactOutcome}
          setContactOutcome={setContactOutcome}
          newExpectedTime={newExpectedTime}
          setNewExpectedTime={setNewExpectedTime}
          contactNote={contactNote}
          setContactNote={setContactNote}
          handleSaveContactLog={handleSaveContactLog}
        />
      </div>
    </div>
  );
}

// ─── Equipment & Maintenance Tab (UC16) ───────────────────────────────────────
