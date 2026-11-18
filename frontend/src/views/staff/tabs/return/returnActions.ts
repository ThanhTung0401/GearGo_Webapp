import { useApp } from "../../../../context/AppContext";
import { isRealApiEnabled } from "../../../../services/apiClient";
import {
  returnApi,
  surchargeApi,
  type NhanTraBackend,
  type QuaHanChiTietBackend,
  type NhatKyLienHeQuaHanBackend,
} from "../../../../services/api";
import type { Surcharge } from "../../../../types";
import { fmt, Order, ReturnReceipt, ReturnReceiptItem } from "../../../../store";
import { mapReturnCondToBackend, mapReturnCondToSurchargeType } from "../../returnMapping";
import type { ApproveLostTarget, ContactOutcome, DebtRowItem, OverdueInfoState } from "./returnTypes";

type AppCtx = ReturnType<typeof useApp>;

// UC4.3: Lập phiếu nhận trả theo đợt (backend tạo nháp -> cập nhật -> lập phụ phí -> chốt nếu không có thiết bị mất)
export async function createReturnReceiptAction(params: {
  app: AppCtx;
  order: Order;
  selectedRows: DebtRowItem[];
  itemConditions: Record<string, ReturnReceiptItem["condition"]>;
  itemNotes: Record<string, string>;
  itemSurcharges: Record<string, number>;
  returnStaffNote: string;
  currentReturnRound: number;
  damagePhotos: string[];
  reloadAll: () => Promise<void>;
}): Promise<{
  ok: boolean;
  backendReceipt?: NhanTraBackend | null;
  mockReceipt?: ReturnReceipt | null;
  successMessage?: string;
  errorMessage?: string;
}> {
  const {
    app,
    order,
    selectedRows,
    itemConditions,
    itemNotes,
    itemSurcharges,
    returnStaffNote,
    currentReturnRound,
    damagePhotos,
    reloadAll,
  } = params;

  if (app.realApi) {
    const donId = order.backendId ?? Number(order.id);
    if (!Number.isFinite(donId)) return { ok: false };
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
    let successMessage: string;
    if (!hasLostItem) {
      finalReceipt = await returnApi.chotNhanTra(draft.maPhieu);
      successMessage = `Đã lập và chốt phiếu nhận trả ${finalReceipt.maPhieuHienThi}.`;
    } else {
      successMessage = `Đã tạo phiếu nháp ${updatedDraft.maPhieuHienThi}. Do có thiết bị báo mất, vui lòng duyệt kết luận mất hoặc tách dòng chờ xử lý trước khi chốt.`;
    }

    await reloadAll();
    return { ok: true, backendReceipt: finalReceipt, successMessage };
  }

  const returnItems: ReturnReceiptItem[] = selectedRows.map((row) => {
    const ae = order.assignedEquipment.find((a) => a.equipmentId === row.equipmentId)!;
    return {
      equipmentId: row.equipmentId,
      productId: ae.productId,
      condition: itemConditions[row.key] || "Bình thường",
      surchargeAmount: itemSurcharges[row.key] || 0,
      note: itemNotes[row.key] || "",
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
    return {
      ok: true,
      mockReceipt: res.data ?? null,
      successMessage: `Đã lập phiếu nhận trả ${res.data?.id || ""}.`,
    };
  }
  return { ok: false, errorMessage: res.message };
}

// Duyệt kết luận mất thiết bị và tự tạo phụ phí bồi thường liên kết nếu chưa có
export async function confirmApproveLostAction(params: {
  order: Order;
  approveLostTarget: ApproveLostTarget;
  surchargesBackend: Surcharge[];
  lostCompAmount: number;
  lostApproveReason: string;
  lostBienBan: string;
  viewingBackendReceiptId?: number;
}): Promise<{ updatedModalReceipt: NhanTraBackend | null; successMessage: string }> {
  const {
    order,
    approveLostTarget,
    surchargesBackend,
    lostCompAmount,
    lostApproveReason,
    lostBienBan,
    viewingBackendReceiptId,
  } = params;

  const donId = order.backendId ?? Number(order.id);
  const { phieuId, chiTiet } = approveLostTarget;

  const matchedSurcharge = surchargesBackend.find(
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

  const refreshedReceipts = await returnApi.layDanhSachTheoDon(donId).catch(() => [] as NhanTraBackend[]);
  const updatedModalReceipt =
    viewingBackendReceiptId === phieuId
      ? refreshedReceipts.find((r) => r.maPhieu === phieuId) || null
      : null;

  return {
    updatedModalReceipt,
    successMessage: `Đã duyệt kết luận mất cho thiết bị ${chiTiet.maThietBiHienThi}.`,
  };
}

// Lập phụ phí trễ hạn 150% đơn giá ngày cho các thiết bị quá hạn (UC4.4)
export async function applyOverdueFeeAction(params: {
  app: AppCtx;
  order: Order;
  overdueInfo: OverdueInfoState;
  overdueDetailBackend: QuaHanChiTietBackend | null;
}): Promise<string> {
  const { app, order, overdueInfo, overdueDetailBackend } = params;

  if (app.realApi) {
    const donId = order.backendId ?? Number(order.id);
    const overdueItems =
      overdueDetailBackend?.danhSachThietBi.filter((x) => x.soNgayTre > 0 && x.phiTreDuKien > 0) || [];
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
    return `Đã lập phụ phí quá hạn ${fmt(overdueInfo.surcharge)} lên máy chủ.`;
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
  return `Đã thêm phụ phí quá hạn ${fmt(overdueInfo.surcharge)} vào đơn.`;
}

// Ghi nhận cuộc gọi liên hệ đơn quá hạn (UC4.4) cho cả backend thật và mock
export async function saveContactLogAction(params: {
  app: AppCtx;
  order: Order;
  contactOutcome: ContactOutcome;
  contactNote: string;
  newExpectedTime: string;
}): Promise<{ ok: boolean; createdBackend?: NhatKyLienHeQuaHanBackend; notice: string }> {
  const { app, order, contactOutcome, contactNote, newExpectedTime } = params;

  if (app.realApi || isRealApiEnabled()) {
    const donId = Number(order.backendId ?? order.id);
    const ketQuaMap: Record<ContactOutcome, string> = {
      "Hẹn giờ trả mới": "HenTraMoi",
      "Xin gia hạn thêm": "XinGiaHan",
      "Không nghe máy": "KhongLienHeDuoc",
      "Khách báo mất": "BaoMatThietBi",
    };
    const parsedHenTra = newExpectedTime.trim() ? new Date(newExpectedTime.trim()) : null;
    const henTraMoiIso =
      parsedHenTra && !Number.isNaN(parsedHenTra.getTime()) ? parsedHenTra.toISOString() : undefined;
    const created = await returnApi.ghiNhatKyLienHe(donId, {
      kenhLienHe: "GoiDien",
      ketQua: ketQuaMap[contactOutcome] || "DaLienHe",
      noiDung:
        henTraMoiIso || !newExpectedTime.trim()
          ? contactNote.trim()
          : `${contactNote.trim()} (Hẹn trả mới: ${newExpectedTime.trim()})`,
      henTraMoi: henTraMoiIso,
    });
    return { ok: true, createdBackend: created, notice: "Đã lưu nhật ký liên hệ lên máy chủ." };
  }

  const res = app.addContactLog(order.id, {
    staffName: app.currentUser?.name || "NV Kho",
    outcome: contactOutcome,
    note: contactNote,
    newExpectedTime: newExpectedTime || undefined,
  });
  return res.ok
    ? { ok: true, notice: "Đã lưu nhật ký liên hệ vào phiên làm việc." }
    : { ok: false, notice: res.message };
}
