import type React from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import {
  handoverApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
} from "../../../services/api";
import type { Order } from "../../../store";
import {
  startPreparationAction,
  swapEquipmentAction,
  completePreparationAction,
  reportShortageAction,
  completeHandoverAction,
} from "./handoverActions";

interface UseHandoverMutationsParams {
  app: ReturnType<typeof useApp>;
  order: Order | null;
  assignments: Record<string, string[]>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  prepState: ChuanBiResponseBackend | null;
  draftBbbg: PhieuBanGiaoBackend | null;
  checklist: Record<string, boolean>;
  evidencePhotos: string[];
  handoverNote: string;
  receiverName: string;
  receiverPhone: string;
  receiverIdCard: string;
  isAuthorized: boolean;
  earlyPickupAccepted: boolean;
  shortageNote: string;
  setShortageNote: (v: string) => void;
  setShowShortageModal: (v: boolean) => void;
  setChangingEquip: (v: { productId: string; oldId: string } | null) => void;
  setSubTab: (v: "prep" | "handover") => void;
  setShowHandoverModal: (v: boolean) => void;
  setHandoverBusy: (v: boolean) => void;
  setHandoverError: (v: string) => void;
  setHandoverSuccess: (v: string) => void;
  syncFromPrepResponse: (prep: ChuanBiResponseBackend) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}

// Hook đóng gói các thao tác ghi dữ liệu của phân hệ Chuẩn bị kho & Bàn giao (UC4.1 & UC4.2)
export function useHandoverMutations(p: UseHandoverMutationsParams) {
  const {
    app,
    order,
    assignments,
    setAssignments,
    prepState,
    draftBbbg,
    checklist,
    evidencePhotos,
    handoverNote,
    receiverName,
    receiverPhone,
    receiverIdCard,
    isAuthorized,
    earlyPickupAccepted,
    shortageNote,
    setShortageNote,
    setShowShortageModal,
    setChangingEquip,
    setSubTab,
    setShowHandoverModal,
    setHandoverBusy,
    setHandoverError,
    setHandoverSuccess,
    syncFromPrepResponse,
    hydrateOperationalOrder,
  } = p;

  const handleStartPreparation = async () => {
    if (!order) return;
    setHandoverBusy(true);
    setHandoverError("");
    try {
      await startPreparationAction({ app, order, syncFromPrepResponse, hydrateOperationalOrder });
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể chuyển sang trạng thái Đang chuẩn bị.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleSwapEquipment = async (productId: string, oldId: string, newId: string) => {
    if (!order) return;
    setHandoverBusy(true);
    setHandoverError("");
    try {
      const res = await swapEquipmentAction({
        app,
        order,
        prepState,
        productId,
        oldId,
        newId,
        syncFromPrepResponse,
        hydrateOperationalOrder,
        onMockSwap: () => {
          setAssignments((prev) => ({
            ...prev,
            [productId]: (prev[productId] || []).map((id) => (id === oldId ? newId : id)),
          }));
        },
      });
      if (!res.ok) {
        setHandoverError(res.message || "Không thể thay thế mã thiết bị.");
        return;
      }
      setChangingEquip(null);
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể thay thế mã thiết bị.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleCompletePreparation = async () => {
    if (!order) return;
    setHandoverError("");
    setHandoverSuccess("");
    setHandoverBusy(true);
    try {
      const res = await completePreparationAction({
        app,
        order,
        assignments,
        prepState,
        handoverNote,
        syncFromPrepResponse,
        hydrateOperationalOrder,
      });
      if (res.ok) {
        setHandoverSuccess(res.successMessage || "");
        setSubTab("handover");
      } else {
        setHandoverError(res.errorMessage || "Không thể hoàn tất chuẩn bị đơn hàng.");
      }
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể hoàn tất chuẩn bị đơn hàng.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleReportShortage = async () => {
    if (!order || !shortageNote.trim()) {
      setHandoverError("Vui lòng nhập lý do thiếu thiết bị để báo Quản trị viên!");
      return;
    }
    setHandoverBusy(true);
    setHandoverError("");
    try {
      const res = await reportShortageAction({ app, order, shortageNote, hydrateOperationalOrder });
      if (res.ok) {
        setHandoverSuccess(res.successMessage || "");
        setShowShortageModal(false);
        setShortageNote("");
      } else {
        setHandoverError(res.errorMessage || "Không thể gửi báo thiếu thiết bị lên máy chủ.");
      }
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể gửi báo thiếu thiết bị lên máy chủ.");
    } finally {
      setHandoverBusy(false);
    }
  };

  // UC4.1: Hủy phân công thiết bị đã gán ở khâu chuẩn bị
  const handleCancelAssignment = async (productId: string, equipId: string) => {
    if (!order) return;
    setHandoverError("");
    if ((app.realApi || isRealApiEnabled()) && prepState) {
      const donId = Number(order.backendId ?? order.id);
      const dong = prepState.danhSachDong.find((d) => String(d.maSanPham) === productId);
      const pc = dong?.danhSachPhanCong.find((item) => String(item.maThietBi) === equipId);
      if (pc) {
        setHandoverBusy(true);
        try {
          const updated = await handoverApi.huyPhanCong(
            donId,
            pc.maPhanCong,
            "Hủy phân công thiết bị tại khâu chuẩn bị"
          );
          syncFromPrepResponse(updated);
          await hydrateOperationalOrder(order.id);
          void app.refreshEquipment?.();
          setHandoverSuccess("Đã hủy phân công thiết bị.");
        } catch (err) {
          setHandoverError(err instanceof Error ? err.message : "Không thể hủy phân công thiết bị.");
        } finally {
          setHandoverBusy(false);
        }
        return;
      }
    }
    setAssignments((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).filter((id) => id !== equipId),
    }));
  };

  const handleCompleteHandover = async () => {
    if (!order) return;
    // [HO-08] Validate đầu vào trước khi gọi Backend để tránh chốt BBBG với dữ liệu trống.
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setHandoverError("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận thực tế tại quầy!");
      return;
    }
    const phoneValid = /^[0-9+\-\s]{9,15}$/.test(receiverPhone.trim());
    if (!phoneValid) {
      setHandoverError("Số điện thoại người nhận không hợp lệ (9-15 ký tự số, có thể có + - khoảng trắng).");
      return;
    }
    if (isAuthorized && !receiverIdCard.trim()) {
      setHandoverError("Người nhận thay bắt buộc phải cung cấp số CCCD/Mã định danh.");
      return;
    }
    if (!earlyPickupAccepted) {
      setHandoverError("Cần xác nhận Quản lý ca đã duyệt bàn giao trước khi lập BBBG.");
      return;
    }
    const allChecklistOk = Object.values(checklist).every(Boolean);
    if (!allChecklistOk) {
      setHandoverError("Cần tích đủ các mục checklist an toàn/vệ sinh/phụ kiện trước khi chốt BBBG.");
      return;
    }
    setHandoverBusy(true);
    setHandoverError("");
    try {
      const res = await completeHandoverAction({
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
      });
      if (res.ok) {
        setShowHandoverModal(true);
      } else {
        setHandoverError(res.errorMessage || "Không thể chốt bàn giao thiết bị (BBBG).");
      }
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể chốt bàn giao thiết bị (BBBG).");
    } finally {
      setHandoverBusy(false);
    }
  };

  return {
    handleStartPreparation,
    handleSwapEquipment,
    handleCompletePreparation,
    handleReportShortage,
    handleCancelAssignment,
    handleCompleteHandover,
  };
}
