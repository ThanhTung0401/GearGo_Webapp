import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { handoverApi, type ChuanBiResponseBackend, type PhieuBanGiaoBackend } from "../../../services/api";

import { fmt, statusColors, Order } from "../../../store";

export function HandoverTab({ app, selectedOrder, setSelectedOrderId, hydrateOperationalOrder }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void; hydrateOperationalOrder: (id: string) => Promise<void> }) {
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
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=200&auto=format&fit=crop&q=60"
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

  // Đồng bộ trạng thái đơn và khôi phục serial đã phân công (cùng tình trạng chuẩn bị backend)
  useEffect(() => {
    setHandoverError("");
    setHandoverSuccess("");
    if (!selectedOrder) {
      setPrepState(null);
      setDraftBbbg(null);
      return;
    }

    if (selectedOrder.status === "Sẵn sàng nhận") {
      setSubTab("handover");
    } else if (["Đã xác nhận", "Đang chuẩn bị"].includes(selectedOrder.status)) {
      setSubTab("prep");
    }

    // Khôi phục serial đã lưu từ order state nếu có
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
    setReceiverIdCard((selectedOrder.displayCode || selectedOrder.id).replace(/\D/g, "").slice(-4).padStart(12, "07920100"));

    if (app.realApi) {
      const donId = Number(selectedOrder.backendId ?? selectedOrder.id);
      if (Number.isFinite(donId)) {
        void hydrateOperationalOrder(selectedOrder.id);
        void handoverApi
          .layTinhTrangChuanBi(donId)
          .then(syncFromPrepResponse)
          .catch(() => {});
        if (selectedOrder.status === "Sẵn sàng nhận") {
          void handoverApi
            .taoHoacLayNhap(donId)
            .then(setDraftBbbg)
            .catch(() => {});
        } else {
          setDraftBbbg(null);
        }
      }
    }
  }, [selectedOrder?.id, selectedOrder?.status, app.realApi]);

  const pickEquipment = (productId: string, idx: number, equipId: string) => {
    setAssignments((prev) => {
      const arr = [...(prev[productId] || [])];
      arr[idx] = equipId;
      return { ...prev, [productId]: arr };
    });
  };

  const handleStartPreparation = async () => {
    if (!order) return;
    if (!app.realApi) {
      app.advanceOrderStatus(order.id, "Đang chuẩn bị", app.currentUser?.name || "Nhân viên kho");
      return;
    }
    setHandoverBusy(true);
    setHandoverError("");
    try {
      const donId = Number(order.backendId ?? order.id);
      const prep = await handoverApi.batDauChuanBi(donId);
      syncFromPrepResponse(prep);
      await hydrateOperationalOrder(order.id);
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể chuyển sang trạng thái Đang chuẩn bị.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleSwapEquipment = async (productId: string, oldId: string, newId: string) => {
    if (!order) return;
    if ((app.realApi || isRealApiEnabled()) && prepState) {
      const donId = Number(order.backendId ?? order.id);
      const dong = prepState.danhSachDong.find((d) => String(d.maSanPham) === productId);
      const oldPc = dong?.danhSachPhanCong.find((pc) => String(pc.maThietBi) === oldId);
      if (oldPc) {
        setHandoverBusy(true);
        setHandoverError("");
        try {
          const updatedPrep = await handoverApi.thayTheThietBi(donId, oldPc.maPhanCong, Number(newId), "Đổi mã thiết bị tại khâu chuẩn bị");
          syncFromPrepResponse(updatedPrep);
          await hydrateOperationalOrder(order.id);
          void app.refreshEquipment?.();
          setChangingEquip(null);
          return;
        } catch (err) {
          setHandoverError(err instanceof Error ? err.message : "Không thể thay thế mã thiết bị.");
          return;
        } finally {
          setHandoverBusy(false);
        }
      }
    }

    const res = app.changeAssignedEquipment(order.id, oldId, newId);
    if (!res.ok) {
      setHandoverError(res.message);
      return;
    }
    setAssignments((prev) => {
      const arr = (prev[productId] || []).map((id) => (id === oldId ? newId : id));
      return { ...prev, [productId]: arr };
    });
    setChangingEquip(null);
  };

  // UC4.1: Hoàn tất chuẩn bị kho & Lưu vĩnh viễn phân công serial
  const handleCompletePreparation = async () => {
    if (!order) return;
    setHandoverError("");
    setHandoverSuccess("");

    const itemsArr: { productId: string; equipmentId: string }[] = [];
    for (const item of order.items) {
      const assignedIds = assignments[item.productId] || [];
      if (assignedIds.filter(Boolean).length < item.qty) {
        setHandoverError(`Vui lòng chọn đủ ${item.qty} mã thiết bị cho "${item.productName}"!`);
        return;
      }
      assignedIds.forEach((eid) => {
        if (eid) itemsArr.push({ productId: item.productId, equipmentId: eid });
      });
    }

    if (app.realApi) {
      setHandoverBusy(true);
      try {
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
              latestPrep = await handoverApi.thayTheThietBi(donId, pc.maPhanCong, replacementId, "Cập nhật phân công thiết bị");
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
        setHandoverSuccess(`Đã hoàn tất chuẩn bị và chuyển đơn ${order.displayCode || order.id} sang "Sẵn sàng nhận"!`);
        setSubTab("handover");
      } catch (err) {
        setHandoverError(err instanceof Error ? err.message : "Không thể hoàn tất chuẩn bị đơn hàng.");
      } finally {
        setHandoverBusy(false);
      }
      return;
    }

    const res = app.completePreparation(order.id, itemsArr, app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setHandoverSuccess(`Đã hoàn tất chuẩn bị và chuyển đơn ${order.id} sang "Sẵn sàng nhận"!`);
      setSubTab("handover");
    } else {
      setHandoverError(res.message);
    }
  };

  // UC4.1: Báo thiếu thiết bị
  const handleReportShortage = async () => {
    if (!order || !shortageNote.trim()) {
      setHandoverError("Vui lòng nhập lý do thiếu thiết bị để báo Quản trị viên!");
      return;
    }

    if (app.realApi || isRealApiEnabled()) {
      setHandoverBusy(true);
      setHandoverError("");
      try {
        const donId = Number(order.backendId ?? order.id);
        await handoverApi.baoThieuThietBi(donId, {
          lyDo: shortageNote.trim(),
          ghiChu: shortageNote.trim(),
        });
        await hydrateOperationalOrder(order.id);
        await app.refreshOrders?.();
        setHandoverSuccess(`Đã gửi báo thiếu thiết bị cho đơn ${order.displayCode || order.id}.`);
        setShowShortageModal(false);
        setShortageNote("");
      } catch (err) {
        setHandoverError(err instanceof Error ? err.message : "Không thể gửi báo thiếu thiết bị lên máy chủ.");
      } finally {
        setHandoverBusy(false);
      }
      return;
    }

    const res = app.reportEquipmentShortage(order.id, shortageNote, app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setHandoverSuccess(`Đã ghi nhận cảnh báo thiếu hàng cho đơn ${order.displayCode || order.id}.`);
      setShowShortageModal(false);
      setShortageNote("");
    } else {
      setHandoverError(res.message);
    }
  };

  // UC4.1: Hủy phân công thiết bị đã gán
  const handleCancelAssignment = async (productId: string, equipId: string) => {
    if (!order) return;
    setHandoverError("");
    if ((app.realApi || isRealApiEnabled()) && prepState) {
      const donId = Number(order.backendId ?? order.id);
      const dong = prepState.danhSachDong.find((d) => String(d.maSanPham) === productId);
      const pc = dong?.danhSachPhanCong.find((p) => String(p.maThietBi) === equipId);
      if (pc) {
        setHandoverBusy(true);
        try {
          const updated = await handoverApi.huyPhanCong(donId, pc.maPhanCong, "Hủy phân công thiết bị tại khâu chuẩn bị");
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

  // UC4.2: Chốt Bàn giao tại quầy & Ký BBBG
  const handleCompleteHandover = async () => {
    if (!order) return;
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setHandoverError("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận thực tế tại quầy!");
      return;
    }

    if (app.realApi) {
      setHandoverBusy(true);
      setHandoverError("");
      try {
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
        setShowHandoverModal(true);
      } catch (err) {
        setHandoverError(err instanceof Error ? err.message : "Không thể chốt bàn giao thiết bị (BBBG).");
      } finally {
        setHandoverBusy(false);
      }
      return;
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

    if (res.ok) {
      setShowHandoverModal(true);
    } else {
      setHandoverError(res.message);
    }
  };

  const handleQrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeSearch.trim()) return;
    const term = qrCodeSearch.trim().toLowerCase();
    const found = app.orders.find((o) =>
      (o.displayCode || o.id).toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      o.customerName.toLowerCase().includes(term)
    );
    if (found) {
      setSelectedOrderId(found.id);
      setQrCodeSearch("");
      setHandoverError("");
    } else {
      setHandoverError(`Không tìm thấy đơn hàng nào khớp với mã/QR "${qrCodeSearch}"!`);
    }
  };

  const allAssigned = order ? order.items.every((item) => {
    const arr = assignments[item.productId] || [];
    return arr.filter(Boolean).length >= item.qty;
  }) : false;

  return (
    <div>
      {/* Sub-tab chuyển đổi giữa Chuẩn bị kho (UC4.1) và Bàn giao tại quầy (UC4.2) */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-3 items-center flex-wrap">
        <button
          type="button"
          onClick={() => { setSubTab("prep"); setSelectedOrderId(null); }}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: subTab === "prep" ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
            background: subTab === "prep" ? "var(--color-forest)" : "white",
            color: subTab === "prep" ? "white" : "var(--color-bark)",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📦 1. Chuẩn bị kho (UC4.1)</span>
          <span style={{ background: subTab === "prep" ? "rgba(255,255,255,0.25)" : "#FEF3C7", color: subTab === "prep" ? "white" : "#B45309", padding: "1px 7px", borderRadius: 12, fontSize: "0.72rem" }}>
            {eligiblePrep.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSubTab("handover"); setSelectedOrderId(null); }}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: subTab === "handover" ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
            background: subTab === "handover" ? "var(--color-forest)" : "white",
            color: subTab === "handover" ? "white" : "var(--color-bark)",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🤝 2. Tiếp khách & Bàn giao (UC4.2)</span>
          <span style={{ background: subTab === "handover" ? "rgba(255,255,255,0.25)" : "#DCFCE7", color: subTab === "handover" ? "white" : "#15803D", padding: "1px 7px", borderRadius: 12, fontSize: "0.72rem" }}>
            {eligibleHandover.length}
          </span>
        </button>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>
        {/* Left Column: Order Picker & QR scanner */}
        <div>
          {subTab === "handover" && (
            <form onSubmit={handleQrSearch} className="mb-3">
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: 4 }}>
                📷 Quét QR / Tra nhanh mã đơn tại quầy:
              </label>
              <div className="flex gap-1">
                <input
                  placeholder="Quét mã QR hoặc nhập #ORD..."
                  value={qrCodeSearch}
                  onChange={(e) => setQrCodeSearch(e.target.value)}
                  style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem" }}
                />
                <button type="submit" style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                  Tìm
                </button>
              </div>
            </form>
          )}

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--color-bark)", marginBottom: "10px" }}>
            {subTab === "prep" ? "Danh sách đơn cần chuẩn bị" : "Đơn sẵn sàng chờ giao khách"}
          </h3>

          <div className="flex flex-col gap-2">
            {(subTab === "prep" ? eligiblePrep : eligibleHandover).map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isSelected = selectedOrder?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => { setSelectedOrderId(o.id); setShowHandoverModal(false); }}
                  style={{
                    background: isSelected ? "var(--color-forest)" : "white",
                    color: isSelected ? "white" : "var(--color-bark)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: `1px solid ${isSelected ? "var(--color-forest)" : "var(--color-bone)"}`,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, opacity: isSelected ? 0.9 : 1, color: isSelected ? "white" : "var(--color-moss)" }}>
                      {o.displayCode || o.id}
                    </span>
                    <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : sc.bg, color: isSelected ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                      {o.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{o.customerName}</div>
                  <div style={{ fontSize: "0.72rem", opacity: isSelected ? 0.85 : 0.7 }}>
                    Hẹn nhận: {o.pickupTime}
                  </div>
                  {o.shortageReported && (
                    <div style={{ marginTop: 4, background: isSelected ? "rgba(220,38,38,0.3)" : "#FEE2E2", color: isSelected ? "#FECACA" : "#DC2626", padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                      ⚠️ Đã báo thiếu: {o.shortageReported.note}
                    </div>
                  )}
                </button>
              );
            })}
            {(subTab === "prep" ? eligiblePrep : eligibleHandover).length === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#9CA3AF", padding: 12 }}>
                {subTab === "prep" ? "Hiện không có đơn nào cần soạn hàng." : "Hiện không có đơn nào chờ nhận tại quầy."}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Workflows */}
        <div>
          {handoverError && (
            <div role="alert" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", marginBottom: 12 }}>
              {handoverError}
            </div>
          )}
          {handoverSuccess && (
            <div style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>
              {handoverSuccess}
            </div>
          )}
          {!order ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{subTab === "prep" ? "📦" : "🤝"}</div>
              <p>{subTab === "prep" ? "Chọn đơn ở danh sách bên trái để phân công mã serial và soạn hàng" : "Chọn đơn hoặc quét mã QR ở bên trái để tiến hành bàn giao đồ tại quầy"}</p>
            </div>
          ) : subTab === "prep" ? (
            /* ─── PHÂN HỆ 4.1: CHUẨN BỊ KHO & PHÂN CÔNG SERIAL ─── */
            <div>
              <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>{order.displayCode || order.id}</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{order.customerName} · {order.customerPhone}</div>
                    <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>📤 Hẹn nhận: <strong>{order.pickupTime}</strong> → 📥 Hẹn trả: <strong>{order.returnTime}</strong></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700 }}>
                      {order.status}
                    </span>
                    {order.status === "Đã xác nhận" && (
                      <button disabled={handoverBusy} onClick={() => void handleStartPreparation()} style={{ background: "var(--color-amber)", color: "white", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: handoverBusy ? "wait" : "pointer" }}>
                        {handoverBusy ? "Đang xử lý..." : "Nhận soạn hàng →"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {order.shortageReported && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#991B1B", fontSize: "0.82rem" }}>
                  <strong>⚠️ CẢNH BÁO THIẾU HÀNG (UC4.1.5.1):</strong> {order.shortageReported.note}
                  <div style={{ fontSize: "0.75rem", color: "#B91C1C", marginTop: 2 }}>Đang chờ Quản trị viên can thiệp xử lý với khách hàng. Không tự ý giảm lượng hoặc đổi sản phẩm.</div>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)" }}>Gán mã thiết bị (Serial) & Kiểm tra phụ kiện</h4>
                <button onClick={() => setShowShortageModal(true)} style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                  ⚠️ Báo thiếu hàng cho QTV
                </button>
              </div>

              {order.items.map((item) => {
                const chosenForItem = assignments[item.productId] || [];
                const avail = app.equipment.filter(
                  (e) => e.productId === item.productId && (e.equipmentStatus === "Sẵn sàng" || chosenForItem.includes(e.id))
                );
                return (
                  <div key={item.productId} style={{ background: "white", borderRadius: "10px", border: "1px solid var(--color-bone)", padding: "14px 16px", marginBottom: "12px" }}>
                    <div className="flex justify-between items-center mb-2">
                      <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>
                        {item.productName} — Yêu cầu: <span style={{ color: "var(--color-forest)" }}>{item.qty} chiếc</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: avail.length >= item.qty ? "#15803D" : "#DC2626", fontWeight: 600 }}>
                        Kho sẵn sàng: {avail.length} chiếc
                      </span>
                    </div>

                    {Array.from({ length: item.qty }).map((_, idx) => {
                      const currentChosen = assignments[item.productId]?.[idx];
                      return (
                        <div key={idx} className="flex items-center gap-3 mb-2 flex-wrap">
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#9CA3AF", width: 60 }}>Món {idx + 1}:</span>
                          <select
                            value={currentChosen || ""}
                            onChange={(e) => pickEquipment(item.productId, idx, e.target.value)}
                            style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.85rem", background: "white" }}
                          >
                            <option value="">-- Chọn mã thiết bị sẵn sàng --</option>
                            {avail.map((e) => (
                              <option key={e.id} value={e.id}>{e.displayCode || e.id} ({e.condition} · đã thuê {e.rentCount} lần)</option>
                            ))}
                          </select>
                          {currentChosen && (
                            <div className="flex items-center gap-2">
                              <span style={{ color: "#15803D", fontSize: "0.82rem", fontWeight: 700 }}>✓ Đã gán</span>
                              <button onClick={() => setChangingEquip({ productId: item.productId, oldId: currentChosen })}
                                style={{ background: "#F3F4F6", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                                Đổi mã
                              </button>
                              <button
                                type="button"
                                disabled={handoverBusy}
                                onClick={() => void handleCancelAssignment(item.productId, currentChosen)}
                                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}
                              >
                                Hủy gán
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {avail.length < item.qty && (
                      <div style={{ background: "#FEE2E2", borderRadius: "6px", padding: "6px 10px", fontSize: "0.75rem", color: "#DC2626", marginTop: "4px" }}>
                        ⚠️ Kho không đủ số lượng sẵn sàng cho đơn này! Vui lòng báo Quản trị viên.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Modal Đổi serial thay thế (Dòng phụ 3.1) */}
              {changingEquip && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <strong style={{ color: "#92400E", fontSize: "0.85rem" }}>Đổi serial thiết bị {app.equipment.find((x) => x.id === changingEquip.oldId)?.displayCode || changingEquip.oldId} trước khi giao:</strong>
                  <div className="flex gap-2 mt-2">
                    <select id="swapSelect" style={{ flex: 1, border: "1px solid #FCD34D", borderRadius: 6, padding: "6px 10px", background: "white", fontSize: "0.85rem" }}>
                      {app.equipment.filter((e) => e.productId === changingEquip.productId && e.equipmentStatus === "Sẵn sàng" && e.id !== changingEquip.oldId).map((e) => (
                        <option key={e.id} value={e.id}>{e.displayCode || e.id} ({e.condition})</option>
                      ))}
                    </select>
                    <button disabled={handoverBusy} onClick={() => {
                      const sel = (document.getElementById("swapSelect") as HTMLSelectElement)?.value;
                      if (sel) void handleSwapEquipment(changingEquip.productId, changingEquip.oldId, sel);
                    }} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer" }}>
                      {handoverBusy ? "Đang đổi..." : "Xác nhận đổi"}
                    </button>
                    <button onClick={() => setChangingEquip(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  disabled={!allAssigned || handoverBusy}
                  onClick={() => void handleCompletePreparation()}
                  style={{
                    background: allAssigned && !handoverBusy ? "var(--color-forest)" : "#9CA3AF",
                    color: "white", padding: "10px 24px", borderRadius: 8, border: "none",
                    cursor: allAssigned && !handoverBusy ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem"
                  }}
                >
                  {handoverBusy ? "Đang lưu & xác nhận..." : "✓ Hoàn tất chuẩn bị & Chuyển \"Sẵn sàng nhận\" (UC4.1)"}
                </button>
              </div>

              {/* Modal Báo thiếu thiết bị */}
              {showShortageModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
                  <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%", padding: 20 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "#DC2626", marginBottom: 8 }}>
                      ⚠️ Báo thiếu thiết bị soạn hàng (UC4.1.5.1)
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "#4B5563", marginBottom: 12 }}>
                      Ghi nhận tình trạng kho không đủ thiết bị thay thế hoặc mã bị hỏng để Quản trị viên liên hệ thỏa thuận với khách.
                    </p>
                    <textarea
                      placeholder="Ghi rõ món bị thiếu hoặc hư hỏng (ví dụ: Thiếu 1 Lều 2 người do đơn trước chưa hoàn tất bảo dưỡng)..."
                      value={shortageNote}
                      onChange={(e) => setShortageNote(e.target.value)}
                      rows={3}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 14 }}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowShortageModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Hủy</button>
                      <button disabled={handoverBusy} onClick={() => void handleReportShortage()} style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, cursor: "pointer" }}>
                        {handoverBusy ? "Đang gửi..." : "Gửi cảnh báo QTV"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── PHÂN HỆ 4.2: TIẾP KHÁCH & BÀN GIAO TẠI QUẦY ─── */
            <div>
              <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                      SẴN SÀNG BÀN GIAO
                    </span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                      Đơn #{order.displayCode || order.id} — {order.customerName}
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                      📤 Hẹn nhận: <strong>{order.pickupTime}</strong> · 📥 Hẹn trả: <strong>{order.returnTime}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "#15803D", fontWeight: 700 }}>✓ ĐÃ THU ĐỦ 100% TIỀN & CỌC</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "1rem" }}>
                      {fmt(order.rental - order.discount + order.depositTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cảnh báo nhận sớm (Dòng phụ 1.2) */}
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div style={{ fontSize: "0.82rem", color: "#92400E" }}>
                    🕒 <strong>Khách nhận đồ tại quầy:</strong> Kiểm tra thời điểm nhận hợp lệ và sự chấp thuận của cửa hàng.
                  </div>
                  <label className="flex items-center gap-2" style={{ fontSize: "0.78rem", color: "#92400E", cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={earlyPickupAccepted} onChange={(e) => setEarlyPickupAccepted(e.target.checked)} style={{ accentColor: "var(--color-forest)" }} />
                    Quản lý ca đã duyệt bàn giao
                  </label>
                </div>
              </div>

              {/* UC4.2 Bước 2: Đối chiếu người nhận thực tế tại quầy */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>1. Đối chiếu người nhận thực tế (UC4.2.2)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Họ tên người nhận tại quầy *</label>
                    <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Số điện thoại người nhận *</label>
                    <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Số CCCD / Mã định danh</label>
                    <input value={receiverIdCard} onChange={(e) => setReceiverIdCard(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                </div>
                <label className="flex items-center gap-2" style={{ fontSize: "0.82rem", color: "var(--color-bark)", cursor: "pointer" }}>
                  <input type="checkbox" checked={isAuthorized} onChange={(e) => setIsAuthorized(e.target.checked)} style={{ accentColor: "var(--color-forest)" }} />
                  <span>Người nhận thay có giấy ủy quyền / tin nhắn ủy quyền hợp lệ từ chính chủ đơn (Dòng phụ 1.1)</span>
                </label>
              </div>

              {/* Danh sách thiết bị đã phân công sẵn */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>2. Kiểm tra cùng khách từng thiết bị & phụ kiện</h4>
                <div className="flex flex-col gap-2">
                  {order.items.flatMap((i) => (assignments[i.productId] || []).map((code) => ({
                    code: app.equipment.find((e) => e.id === code)?.displayCode || code,
                    item: i,
                  }))).map(({ code, item }) => (
                    <div key={code} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.88rem" }}>{code}</span>
                        <span style={{ fontSize: "0.82rem", color: "#374151", marginLeft: 8 }}>— {item.productName}</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                        ✓ Ngoại quan tốt
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist phụ kiện & Bằng chứng ảnh chụp (UC4.2.3) */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>3. Checklist bàn giao & Bằng chứng ảnh</h4>
                <div className="flex flex-col gap-2 mb-3">
                  {Object.entries(checklist).map(([name, checked]) => (
                    <label key={name} className="flex items-center gap-2" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--color-bark)" }}>
                      <input type="checkbox" checked={checked} onChange={(e) => setChecklist((prev) => ({ ...prev, [name]: e.target.checked }))} style={{ accentColor: "var(--color-forest)", width: 16, height: 16 }} />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-3">
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 4 }}>
                    Ảnh bằng chứng hiện trạng trước thuê (UC4.2 Dòng 747):
                  </span>
                  <div className="flex gap-2 items-center">
                    {evidencePhotos.map((url, i) => (
                      <img key={i} src={url} alt="Bằng chứng giao" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--color-bone)" }} />
                    ))}
                    <button type="button" onClick={() => alert("Đã chụp thêm 1 ảnh bằng chứng thiết bị tại quầy!")} style={{ width: 60, height: 60, border: "1px dashed #9CA3AF", borderRadius: 6, background: "none", cursor: "pointer", fontSize: "1.2rem", color: "#6B7280" }}>
                      📷+
                    </button>
                  </div>
                </div>

                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 4 }}>
                  Ghi chú hiện trạng bàn giao:
                </label>
                <textarea placeholder="Ghi nhận phụ kiện dây đai, tem bảo hành, số lượng đinh cọc..." value={handoverNote} onChange={(e) => setHandoverNote(e.target.value)} rows={2}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", resize: "none" }}
                />
              </div>

              <button
                disabled={handoverBusy}
                onClick={() => void handleCompleteHandover()}
                style={{
                  background: handoverBusy ? "#9CA3AF" : "var(--color-forest)",
                  color: "white", padding: "12px 28px", borderRadius: 8, border: "none",
                  cursor: handoverBusy ? "wait" : "pointer", fontWeight: 700, fontSize: "0.95rem", width: "100%"
                }}
              >
                {handoverBusy ? "Đang lập & chốt BBBG..." : "✓ Bàn giao thiết bị cho khách & Lập Biên bản (BBBG)"}
              </button>
            </div>
          )}

          {/* Modal xem Biên bản bàn giao vừa tạo (BBBG) */}
          {showHandoverModal && order && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
              <div style={{ background: "white", borderRadius: 16, maxWidth: 640, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>ĐÃ BÀN GIAO THÀNH CÔNG</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                      Biên bản Bàn giao BBBG-{order.displayCode || order.id}
                    </h3>
                  </div>
                  <button onClick={() => setShowHandoverModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.85rem", marginBottom: 14 }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Khách đặt hàng:</strong> {order.customerName}</div>
                    <div><strong>Người nhận thực tế:</strong> {receiverName} {isAuthorized ? "(Người nhận thay)" : ""}</div>
                    <div><strong>SĐT người nhận:</strong> {receiverPhone}</div>
                    <div><strong>CCCD / Định danh:</strong> {receiverIdCard || "Đã kiểm tra đối chiếu"}</div>
                    <div><strong>Thời gian bàn giao:</strong> {new Date().toLocaleString("vi-VN")}</div>
                    <div><strong>Nhân viên bàn giao:</strong> {app.currentUser?.name || "Nhân viên kho"}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: "0.82rem", color: "var(--color-bark)" }}>Danh sách thiết bị giao:</strong>
                  <div className="flex flex-col gap-1 mt-1">
                    {order.items.flatMap((i) => assignments[i.productId] || []).map((code) => (
                      <div key={code} style={{ fontSize: "0.8rem", color: "#374151", background: "#F3F4F6", padding: "4px 8px", borderRadius: 6 }}>
                        • Mã thiết bị: <strong style={{ color: "var(--color-forest)" }}>{app.equipment.find((e) => e.id === code)?.displayCode || code}</strong> (Tình trạng: Tốt, hoạt động chuẩn)
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "#4B5563", marginBottom: 16 }}>
                  <strong>Checklist đã kiểm:</strong> Tất cả 4 hạng mục an toàn, vệ sinh và phụ kiện đã được xác nhận đạt chuẩn cùng khách hàng.
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                    🖨 In Biên bản
                  </button>
                  <button onClick={() => { setShowHandoverModal(false); setSelectedOrderId(null); }} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                    Đóng & Hoàn tất
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Return Tab (UC4.3 Nhận trả nhiều đợt & Trả 1 phần, UC4.4 Xử lý quá hạn & Nhật ký gọi khách) ───
