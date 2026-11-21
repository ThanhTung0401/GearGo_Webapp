import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";
import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import { type StockAdjustmentReceipt, type EquipmentStatus } from "../../../store";

export interface ImpactModalState {
  sa: StockAdjustmentReceipt;
  analysis: PhanTichAnhHuongBackend | null;
  loading: boolean;
  error: string;
}

/**
 * Hook quản lý kiểm kê và điều chỉnh kho (UC6.10, UC6.10.1, UC6.11):
 * lập phiếu thủ công, kiểm tra xung đột đơn tương lai, duyệt nguyên tử và từ chối.
 */
export function useStockAdjustTab(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedEquipId, setSelectedEquipId] = useState("");
  const [newStatus, setNewStatus] = useState<EquipmentStatus>("Thất lạc");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [tabMessage, setTabMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [realAdjustments, setRealAdjustments] = useState<StockAdjustmentReceipt[]>([]);
  const [rawStatuses, setRawStatuses] = useState<Record<string, string>>({});
  const [rawEquipIds, setRawEquipIds] = useState<Record<string, number>>({});
  const [impactModal, setImpactModal] = useState<ImpactModalState | null>(null);

  // Tải danh sách phiếu điều chỉnh kho từ backend và ánh xạ ID thiết bị số gốc
  const loadRealAdjustments = async () => {
    if (!isRealApi) return;
    try {
      const res = await inventoryApi.timPhieu({ trang: 1, soMoiTrang: 50 });
      const rawMap: Record<string, string> = {};
      const equipIdMap: Record<string, number> = {};
      const mapped = (res.items ?? []).map((dc) => {
        rawMap[String(dc.maPhieuDieuChinh)] = dc.trangThai;
        const firstEquipId = dc.chiTiet?.[0]?.maThietBi;
        if (typeof firstEquipId === "number") {
          equipIdMap[String(dc.maPhieuDieuChinh)] = firstEquipId;
        }
        return mapDieuChinhKhoToReceipt(dc);
      });
      setRawStatuses(rawMap);
      setRawEquipIds(equipIdMap);
      setRealAdjustments(mapped);
    } catch (err) {
      setTabMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể tải danh sách điều chỉnh kho." });
    }
  };

  useEffect(() => {
    void loadRealAdjustments();
  }, [isRealApi]);

  const displayedAdjustments = isRealApi ? realAdjustments : app.stockAdjustments;
  const currentEquip = app.equipment.find((e) => e.id === selectedEquipId);

  // Lập và áp dụng phiếu điều chỉnh kho thủ công (UC6.10, UC6.11)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!selectedEquipId) return setModalError("Vui lòng chọn mã thiết bị.");
    if (!reason.trim()) return setModalError("Vui lòng nhập lý do điều chỉnh kho.");

    if (isRealApi) {
      const equipIdNum = Number(selectedEquipId);
      if (Number.isNaN(equipIdNum)) {
        return setModalError("ID thiết bị không hợp lệ.");
      }
      setSubmitting(true);
      try {
        const dto = {
          loaiDieuChinh: newStatus === "Ngừng sử dụng" ? "NgungSuDung" : "KiemKeSaiLech",
          lyDo: reason.trim(),
          chiTiet: [
            {
              maThietBi: equipIdNum,
              giaTriDeNghiSau: {
                trangThaiSuDung: mapEquipmentStatusToBackend(newStatus),
                tinhTrang: notes.trim() || newStatus,
              },
              ghiChu: notes.trim() || reason.trim(),
            },
          ],
        };
        const created = await inventoryApi.lapPhieu(dto);
        // Giữ phiếu ở trạng thái Chờ duyệt để Quản trị viên kiểm tra ảnh hưởng lịch trước khi áp dụng (UC6.10)
        await inventoryApi.guiDuyet(created.maPhieuDieuChinh);
        await Promise.all([loadRealAdjustments(), app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setShowModal(false);
        setSelectedEquipId("");
        setReason("");
        setNotes("");
        setTabMessage({ type: "success", text: `Đã lập và gửi duyệt phiếu điều chỉnh #${created.maPhieuDieuChinh} (Chờ quản trị viên phê duyệt)!` });
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Lỗi lập phiếu điều chỉnh trên máy chủ.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const res = app.createStockAdjustment({
      reason: reason.trim(),
      createdBy: "Quản trị viên",
      lines: [
        {
          equipmentId: selectedEquipId,
          previousStatus: currentEquip?.equipmentStatus || "Sẵn sàng",
          newStatus,
          reason: notes.trim() || reason.trim(),
        },
      ],
      autoApprove: true, // Khi Admin tự lập phiếu thì tự động duyệt
    });

    if (res.ok) {
      setShowModal(false);
      setSelectedEquipId("");
      setReason("");
      setNotes("");
      setTabMessage({ type: "success", text: `Đã lập phiếu điều chỉnh ${res.data.id} và cập nhật trạng thái kho!` });
    } else {
      setModalError(res.message);
    }
  };

  // Phân tích ảnh hưởng điều chỉnh kho lên các đơn đặt trước tương lai (UC6.10.1)
  const handleCheckImpact = async (sa: StockAdjustmentReceipt) => {
    const line = sa.lines[0];
    if (!line) return;
    // Ưu tiên ID số gốc từ API (tránh lỗi NaN khi equipmentId là mã hiển thị như TB-001)
    const matchedEquip = app.equipment.find((e) => e.id === line.equipmentId || e.displayCode === line.equipmentId);
    const equipIdNum = rawEquipIds[sa.id] ?? (matchedEquip ? Number(matchedEquip.id) : Number(line.equipmentId));
    setImpactModal({ sa, analysis: null, loading: true, error: "" });
    if (!equipIdNum || Number.isNaN(equipIdNum)) {
      setImpactModal({ sa, analysis: null, loading: false, error: "ID thiết bị không hợp lệ để kiểm tra ảnh hưởng." });
      return;
    }
    try {
      const loaiThayDoi = line.newStatus === "Ngừng sử dụng" ? "NgungSuDung" : "BaoTri";
      const analysis = await warehouseApi.xemAnhHuongDieuChinh({
        maThietBi: equipIdNum,
        loaiThayDoi,
        lyDo: sa.reason,
      });
      setImpactModal({ sa, analysis, loading: false, error: "" });
    } catch (err) {
      setImpactModal({
        sa,
        analysis: null,
        loading: false,
        error: err instanceof Error ? err.message : "Không thể kiểm tra ảnh hưởng điều chỉnh kho.",
      });
    }
  };

  // Phê duyệt và áp dụng phiếu điều chỉnh kho nguyên tử (UC57, UC58 / UC6.11)
  const handleApprove = async (sa: StockAdjustmentReceipt) => {
    setTabMessage(null);
    if (isRealApi) {
      const idNum = Number(sa.id);
      if (Number.isNaN(idNum)) {
        setTabMessage({ type: "error", text: "ID phiếu điều chỉnh không hợp lệ." });
        return;
      }
      setActionLoadingId(sa.id);
      try {
        if (rawStatuses[sa.id] === "Nhap") {
          await inventoryApi.guiDuyet(idNum);
        }
        await inventoryApi.duyetVaApDung(idNum);
        await Promise.all([loadRealAdjustments(), app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setTabMessage({ type: "success", text: `Đã phê duyệt phiếu điều chỉnh #${sa.id} thành công (UC57, UC58)!` });
      } catch (err) {
        setTabMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi phê duyệt điều chỉnh kho." });
      } finally {
        setActionLoadingId(null);
      }
      return;
    }
    const res = app.approveStockAdjustment(sa.id);
    setTabMessage(
      res.ok
        ? { type: "success", text: "Đã phê duyệt điều chỉnh kho thành công! Kho đã được cập nhật." }
        : { type: "error", text: res.message }
    );
  };

  // Xác nhận từ chối phiếu điều chỉnh kho kèm lý do bắt buộc
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    setRejectError("");
    if (!rejectReasonInput.trim()) return setRejectError("Bắt buộc phải nhập lý do từ chối.");
    if (isRealApi) {
      const idNum = Number(rejectingId);
      if (Number.isNaN(idNum)) return setRejectError("ID phiếu không hợp lệ.");
      setActionLoadingId(rejectingId);
      try {
        await inventoryApi.tuChoi(idNum, rejectReasonInput.trim());
        await loadRealAdjustments();
        setRejectingId(null);
        setTabMessage({ type: "success", text: "Đã từ chối phiếu điều chỉnh kho." });
      } catch (err) {
        setRejectError(err instanceof Error ? err.message : "Lỗi từ chối phiếu điều chỉnh.");
      } finally {
        setActionLoadingId(null);
      }
      return;
    }
    const res = app.rejectStockAdjustment(rejectingId);
    if (!res.ok) return setRejectError(res.message);
    setRejectingId(null);
    setTabMessage({ type: "success", text: "Đã từ chối phiếu điều chỉnh!" });
  };

  return {
    isRealApi,
    showModal,
    setShowModal,
    showAuditModal,
    setShowAuditModal,
    selectedEquipId,
    setSelectedEquipId,
    newStatus,
    setNewStatus,
    reason,
    setReason,
    notes,
    setNotes,
    tabMessage,
    setTabMessage,
    modalError,
    setModalError,
    submitting,
    actionLoadingId,
    rejectingId,
    setRejectingId,
    rejectReasonInput,
    setRejectReasonInput,
    rejectError,
    setRejectError,
    impactModal,
    setImpactModal,
    loadRealAdjustments,
    displayedAdjustments,
    currentEquip,
    handleSubmit,
    handleCheckImpact,
    handleApprove,
    handleRejectSubmit,
  };
}
