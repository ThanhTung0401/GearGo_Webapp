import { useApp } from "../../../../context/AppContext";
import { isRealApiEnabled } from "../../../../services/apiClient";
import {
  handoverApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
} from "../../../../services/api";
import { Order } from "../../../../store";

type AppCtx = ReturnType<typeof useApp>;

// Bắt đầu chuyển đơn sang trạng thái Đang chuẩn bị (UC4.1)
export async function startPreparationAction(params: {
  app: AppCtx;
  order: Order;
  syncFromPrepResponse: (prep: ChuanBiResponseBackend) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const { app, order, syncFromPrepResponse, hydrateOperationalOrder } = params;
  if (!app.realApi) {
    app.advanceOrderStatus(order.id, "Đang chuẩn bị", app.currentUser?.name || "Nhân viên kho");
    return;
  }
  const donId = Number(order.backendId ?? order.id);
  const prep = await handoverApi.batDauChuanBi(donId);
  syncFromPrepResponse(prep);
  await hydrateOperationalOrder(order.id);
}

// Đổi mã thiết bị (serial) đã phân công cho một slot sản phẩm trước khi bàn giao
export async function swapEquipmentAction(params: {
  app: AppCtx;
  order: Order;
  prepState: ChuanBiResponseBackend | null;
  productId: string;
  oldId: string;
  newId: string;
  syncFromPrepResponse: (prep: ChuanBiResponseBackend) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
  onMockSwap: () => void;
}): Promise<{ ok: boolean; message?: string }> {
  const { app, order, prepState, productId, oldId, newId, syncFromPrepResponse, hydrateOperationalOrder, onMockSwap } =
    params;

  if ((app.realApi || isRealApiEnabled()) && prepState) {
    const donId = Number(order.backendId ?? order.id);
    const dong = prepState.danhSachDong.find((d) => String(d.maSanPham) === productId);
    const oldPc = dong?.danhSachPhanCong.find((pc) => String(pc.maThietBi) === oldId);
    if (oldPc) {
      const updatedPrep = await handoverApi.thayTheThietBi(
        donId,
        oldPc.maPhanCong,
        Number(newId),
        "Đổi mã thiết bị tại khâu chuẩn bị"
      );
      syncFromPrepResponse(updatedPrep);
      await hydrateOperationalOrder(order.id);
      void app.refreshEquipment?.();
      return { ok: true };
    }
  }

  const res = app.changeAssignedEquipment(order.id, oldId, newId);
  if (!res.ok) {
    return { ok: false, message: res.message };
  }
  onMockSwap();
  return { ok: true };
}

// UC4.1: Đồng bộ toàn bộ serial đã chọn lên backend (gán mới / thay thế) và xác nhận "Sẵn sàng nhận"
export async function completePreparationAction(params: {
  app: AppCtx;
  order: Order;
  assignments: Record<string, string[]>;
  prepState: ChuanBiResponseBackend | null;
  handoverNote: string;
  syncFromPrepResponse: (prep: ChuanBiResponseBackend) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}): Promise<{ ok: boolean; successMessage?: string; errorMessage?: string }> {
  const { app, order, assignments, prepState, handoverNote, syncFromPrepResponse, hydrateOperationalOrder } = params;

  // Kiểm tra đủ số lượng serial cho từng dòng sản phẩm trong đơn
  const itemsArr: { productId: string; equipmentId: string }[] = [];
  for (const item of order.items) {
    const assignedIds = assignments[item.productId] || [];
    if (assignedIds.filter(Boolean).length < item.qty) {
      return { ok: false, errorMessage: `Vui lòng chọn đủ ${item.qty} mã thiết bị cho "${item.productName}"!` };
    }
    assignedIds.forEach((eid) => {
      if (eid) itemsArr.push({ productId: item.productId, equipmentId: eid });
    });
  }

  if (app.realApi) {
    const donId = Number(order.backendId ?? order.id);
    let latestPrep = prepState;
    if (order.status === "Đã xác nhận") {
      latestPrep = await handoverApi.batDauChuanBi(donId);
    } else if (!latestPrep) {
      latestPrep = await handoverApi.layTinhTrangChuanBi(donId);
    }

    // Gửi gán / thay thế từng dòng chi tiết đơn cho backend
    for (const dong of latestPrep.danhSachDong) {
      const desiredIds = (assignments[String(dong.maSanPham)] || []).map((x) => Number(x)).filter(Boolean);
      const existingIds = dong.danhSachPhanCong.map((pc) => pc.maThietBi);
      const remainingToAssign = desiredIds.filter((id) => !existingIds.includes(id));

      // Thay thế những slot đã gán cũ mà người dùng đổi lựa chọn
      for (let i = 0; i < dong.danhSachPhanCong.length; i++) {
        const pc = dong.danhSachPhanCong[i];
        if (!desiredIds.includes(pc.maThietBi) && remainingToAssign.length > 0) {
          const replacementId = remainingToAssign.shift()!;
          latestPrep = await handoverApi.thayTheThietBi(
            donId,
            pc.maPhanCong,
            replacementId,
            "Cập nhật phân công thiết bị"
          );
        }
      }

      if (remainingToAssign.length > 0) {
        latestPrep = await handoverApi.ganThietBi(donId, dong.maChiTietDon, remainingToAssign);
      }
    }

    const readyPrep = await handoverApi.xacNhanSanSang(donId, handoverNote.trim() || undefined);
    syncFromPrepResponse(readyPrep);
    await hydrateOperationalOrder(order.id);
    await app.refreshOrders?.();
    void app.refreshEquipment?.();
    return {
      ok: true,
      successMessage: `Đã hoàn tất chuẩn bị và chuyển đơn ${order.displayCode || order.id} sang "Sẵn sàng nhận"!`,
    };
  }

  const res = app.completePreparation(order.id, itemsArr, app.currentUser?.name || "Nhân viên kho");
  if (res.ok) {
    return { ok: true, successMessage: `Đã hoàn tất chuẩn bị và chuyển đơn ${order.id} sang "Sẵn sàng nhận"!` };
  }
  return { ok: false, errorMessage: res.message };
}

// UC4.1: Gửi cảnh báo thiếu thiết bị lên QTV
export async function reportShortageAction(params: {
  app: AppCtx;
  order: Order;
  shortageNote: string;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}): Promise<{ ok: boolean; successMessage?: string; errorMessage?: string }> {
  const { app, order, shortageNote, hydrateOperationalOrder } = params;
  if (app.realApi || isRealApiEnabled()) {
    const donId = Number(order.backendId ?? order.id);
    await handoverApi.baoThieuThietBi(donId, {
      lyDo: shortageNote.trim(),
      ghiChu: shortageNote.trim(),
    });
    await hydrateOperationalOrder(order.id);
    await app.refreshOrders?.();
    return { ok: true, successMessage: `Đã gửi báo thiếu thiết bị cho đơn ${order.displayCode || order.id}.` };
  }

  const res = app.reportEquipmentShortage(order.id, shortageNote, app.currentUser?.name || "Nhân viên kho");
  if (res.ok) {
    return {
      ok: true,
      successMessage: `Đã ghi nhận cảnh báo thiếu hàng cho đơn ${order.displayCode || order.id}.`,
    };
  }
  return { ok: false, errorMessage: res.message };
}

// UC4.2: Lập nháp / cập nhật phiếu bàn giao tại quầy & chốt ký BBBG
export async function completeHandoverAction(params: {
  app: AppCtx;
  order: Order;
  draftBbbg: PhieuBanGiaoBackend | null;
  prepState: ChuanBiResponseBackend | null;
  assignments: Record<string, string[]>;
  checklist: Record<string, boolean>;
  evidencePhotos: string[];
  handoverNote: string;
  receiverName: string;
  receiverPhone: string;
  receiverIdCard: string;
  isAuthorized: boolean;
  earlyPickupAccepted: boolean;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const {
    app,
    order,
    draftBbbg,
    prepState,
    assignments,
    checklist,
    evidencePhotos,
    handoverNote,
    receiverName,
    receiverPhone,
    receiverIdCard,
    isAuthorized,
    earlyPickupAccepted,
    hydrateOperationalOrder,
  } = params;

  if (app.realApi) {
    const donId = Number(order.backendId ?? order.id);
    const draft = draftBbbg ?? (await handoverApi.taoHoacLayNhap(donId));
    const latestPrep = prepState ?? (await handoverApi.layTinhTrangChuanBi(donId));
    const allPhanCongs = latestPrep.danhSachDong.flatMap((d) => d.danhSachPhanCong);

    await handoverApi.capNhatNhap(draft.maPhieuBanGiao, {
      tenNguoiNhanThucTe: receiverName.trim(),
      thoiDiemKhachXacNhan: new Date().toISOString(),
      bangChungXacNhan: JSON.stringify(evidencePhotos),
      ghiChu: handoverNote || "Thiết bị và phụ kiện bàn giao đầy đủ, đúng hiện trạng cam kết.",
      chiTiet: allPhanCongs.map((pc) => ({
        maPhanCong: pc.maPhanCong,
        tinhTrangTruocThue: "Tốt (Đã kiểm tại quầy)",
        phuKienThucGiao: JSON.stringify(
          Object.entries(checklist)
            .filter(([, checked]) => checked)
            .map(([name]) => name)
        ),
        danhSachAnh: JSON.stringify(evidencePhotos),
        ghiChu: handoverNote || undefined,
      })),
    });

    await handoverApi.chotBanGiao(draft.maPhieuBanGiao, receiverName.trim());
    await hydrateOperationalOrder(order.id);
    await app.refreshOrders?.();
    void app.refreshEquipment?.();
    return { ok: true };
  }

  const itemsCheck = order.items.flatMap((item) => {
    const assignedIds = assignments[item.productId] || [];
    return assignedIds.map((eid) => ({
      equipmentId: eid,
      productId: item.productId,
      condition: "Tốt (Đã kiểm tại quầy)",
      accessoriesOk: true,
      note: handoverNote || "Hoạt động chuẩn, phụ kiện nguyên vẹn",
    }));
  });

  const checklistArr = Object.entries(checklist).map(([name, checked]) => ({ name, checked }));
  const res = app.createHandoverRecord(order.id, {
    orderId: order.id,
    staffName: app.currentUser?.name || "Nhân viên kho",
    customerName: order.customerName,
    receiverName,
    receiverPhone,
    receiverIdCard,
    isAuthorizedReceiver: isAuthorized,
    earlyPickupConfirmed: earlyPickupAccepted,
    photoUrls: evidencePhotos,
    items: itemsCheck,
    accessoriesChecklist: checklistArr,
    initialNotes: handoverNote || "Thiết bị và phụ kiện bàn giao đầy đủ, đúng hiện trạng cam kết.",
    signatureConfirmed: true,
  });

  return res.ok ? { ok: true } : { ok: false, errorMessage: res.message };
}
