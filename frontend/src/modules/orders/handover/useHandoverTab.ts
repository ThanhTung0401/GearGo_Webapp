import type React from "react";
import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import {
  handoverApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
} from "../../../services/api";
import { Order } from "../../../store";
import { useHandoverMutations } from "./useHandoverMutations";

// Hook quản lý state, đồng bộ dữ liệu chuẩn bị kho (UC4.1) & bàn giao tại quầy (UC4.2)
export function useHandoverTab(
  app: ReturnType<typeof useApp>,
  selectedOrder: Order | null,
  setSelectedOrderId: (id: string | null) => void,
  hydrateOperationalOrder: (id: string) => Promise<void>
) {
  const [subTab, setSubTab] = useState<"prep" | "handover">("prep");
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [prepState, setPrepState] = useState<ChuanBiResponseBackend | null>(null);
  const [draftBbbg, setDraftBbbg] = useState<PhieuBanGiaoBackend | null>(null);
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [handoverError, setHandoverError] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "Túi đựng & bao bọc bảo vệ": true,
    "Đầy đủ phụ kiện tiêu chuẩn (cọc, dây, cáp sạc...)": true,
    "Thiết bị hoạt động tốt & sạch sẽ lúc giao": true,
    "Khách hàng đã kiểm tra thực tế tại quầy": true,
  });
  const [handoverNote, setHandoverNote] = useState("");
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [changingEquip, setChangingEquip] = useState<{ productId: string; oldId: string } | null>(null);

  // State UC4.2: Đối chiếu người nhận & Quét QR
  const [qrCodeSearch, setQrCodeSearch] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverIdCard, setReceiverIdCard] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [earlyPickupAccepted, setEarlyPickupAccepted] = useState(true);
  // [HO-08] Expose setEvidencePhotos để nút 📷+ thêm ảnh được.
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=200&auto=format&fit=crop&q=60",
  ]);

  // State UC4.1: Báo thiếu thiết bị (Dòng 5.1)
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [shortageNote, setShortageNote] = useState("");

  const eligiblePrep = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị"].includes(o.status));
  const eligibleHandover = app.orders.filter((o) => o.status === "Sẵn sàng nhận");
  const order = selectedOrder;

  const syncFromPrepResponse = (prep: ChuanBiResponseBackend) => {
    setPrepState(prep);
    const nextAssignments: Record<string, string[]> = {};
    prep.danhSachDong.forEach((dong) => {
      if (dong.danhSachPhanCong.length > 0) {
        nextAssignments[String(dong.maSanPham)] = dong.danhSachPhanCong.map((pc) => String(pc.maThietBi));
      }
    });
    setAssignments(nextAssignments);
  };

  // [HO-06] useEffect CHỈ reset form (họ tên, SĐT, CCCD, error/success) khi đổi sang đơn khác.
  // Không reset khi chỉ có selectedOrder.status đổi trên cùng một đơn, để tránh xóa
  // thông tin người nhận thực tế vừa nhập (BBBG) và thông báo thành công.
  useEffect(() => {
    setHandoverError("");
    setHandoverSuccess("");
    if (!selectedOrder) {
      setPrepState(null);
      setDraftBbbg(null);
      return;
    }

    const initialAssigned: Record<string, string[]> = {};
    selectedOrder.items.forEach((item) => {
      const found = selectedOrder.assignedEquipment
        .filter((ae) => ae.productId === item.productId)
        .map((ae) => ae.equipmentId);
      if (found.length > 0) {
        initialAssigned[item.productId] = found;
      }
    });
    setAssignments(initialAssigned);

    setReceiverName(selectedOrder.customerName);
    setReceiverPhone(selectedOrder.customerPhone);
    setReceiverIdCard("");

    if (app.realApi) {
      const donId = Number(selectedOrder.backendId ?? selectedOrder.id);
      if (Number.isFinite(donId)) {
        void hydrateOperationalOrder(selectedOrder.id);
        void handoverApi.layTinhTrangChuanBi(donId).then(syncFromPrepResponse).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id]);

  // [HO-05][HO-06] Chỉ đổi subTab và tải draftBbbg khi status thay đổi - KHÔNG reset form.
  useEffect(() => {
    if (!selectedOrder) return;

    if (selectedOrder.status === "Sẵn sàng nhận") {
      setSubTab("handover");
    } else if (["Đã xác nhận", "Đang chuẩn bị"].includes(selectedOrder.status)) {
      setSubTab("prep");
    }

    if (app.realApi) {
      const donId = Number(selectedOrder.backendId ?? selectedOrder.id);
      if (Number.isFinite(donId)) {
        if (selectedOrder.status === "Sẵn sàng nhận") {
          void handoverApi.taoHoacLayNhap(donId).then(setDraftBbbg).catch(() => {});
        } else {
          setDraftBbbg(null);
        }
      }
    }
    // [HO-05] Nếu equipment cache rỗng trong Real API, kéo lại để dropdown Serial không rỗng.
    if (app.realApi && app.equipment.length === 0) {
      void app.refreshEquipment?.();
    }
  }, [selectedOrder?.id, selectedOrder?.status, app.realApi]);

  const pickEquipment = (productId: string, idx: number, equipId: string) => {
    setAssignments((prev) => {
      const arr = [...(prev[productId] || [])];
      arr[idx] = equipId;
      return { ...prev, [productId]: arr };
    });
  };

  const handleQrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeSearch.trim()) return;
    const term = qrCodeSearch.trim().toLowerCase();
    // Chỉ tìm trong các đơn hợp lệ cho chuẩn bị/bàn giao, tránh chọn nhầm đơn hủy hoặc đã hoàn tất
    const primaryPool = subTab === "prep" ? eligiblePrep : eligibleHandover;
    const secondaryPool = subTab === "prep" ? eligibleHandover : eligiblePrep;
    const matchOrder = (o: Order) =>
      (o.displayCode || o.id).toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      o.customerName.toLowerCase().includes(term);

    const found = primaryPool.find(matchOrder) ?? secondaryPool.find(matchOrder);
    if (found) {
      setSelectedOrderId(found.id);
      setQrCodeSearch("");
      setHandoverError("");
    } else {
      setHandoverError(`Không tìm thấy đơn hợp lệ chờ chuẩn bị/bàn giao khớp với "${qrCodeSearch}"!`);
    }
  };

  const mutations = useHandoverMutations({
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
  });

  const allAssigned =
    order && order.items.length > 0
      ? order.items.every((item) => {
          const picked = (assignments[item.productId] || []).filter(Boolean);
          return picked.length >= item.qty && new Set(picked).size >= item.qty;
        })
      : false;

  return {
    subTab, setSubTab, assignments, handoverBusy, handoverError, handoverSuccess,
    checklist, setChecklist, handoverNote, setHandoverNote,
    showHandoverModal, setShowHandoverModal, changingEquip, setChangingEquip,
    prepState, draftBbbg,
    qrCodeSearch, setQrCodeSearch, receiverName, setReceiverName,
    receiverPhone, setReceiverPhone, receiverIdCard, setReceiverIdCard,
    isAuthorized, setIsAuthorized, earlyPickupAccepted, setEarlyPickupAccepted,
    evidencePhotos, setEvidencePhotos, showShortageModal, setShowShortageModal, shortageNote, setShortageNote,
    eligiblePrep, eligibleHandover, order, allAssigned, pickEquipment, handleQrSearch,
    ...mutations,
  };
}
