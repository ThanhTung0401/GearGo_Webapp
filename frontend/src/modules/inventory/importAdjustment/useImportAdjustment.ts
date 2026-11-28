import React, { useState } from "react";
import type { useApp } from "../../../App";
import { inventoryApi } from "../../../services/api";
import type { ImportReceipt, ImportReceiptAdjustment } from "../../../store";

/**
 * Custom hook trung gian cho Đề nghị điều chỉnh sai lệch phiếu nhập sau chốt (UC7.10 & UC7.10.1).
 */
// [PN-10] Hướng điều chỉnh số lượng (thêm thiếu / loại thừa) để map đúng LoaiDieuChinh Backend.
export type QuantityAdjustDirection = "ThemThieu" | "LoaiThua";

export function useImportAdjustment(
  receipt: ImportReceipt,
  app: ReturnType<typeof useApp>,
  onClose: () => void,
  onSuccess?: () => void
) {
  const [type, setType] = useState<ImportReceiptAdjustment["type"]>("Giá vốn");
  // [PN-10] Khi loại là "Số lượng", người dùng phải chọn Thêm thiếu (KhaiBaoThieuThietBi)
  // hay Loại thừa (KhaiBaoTrungSaiThietBi) để tránh gửi mặc định sang "KhaiBaoThieuThietBi"
  // khiến Admin duyệt bị tự động cộng thêm thiết bị vào kho thay vì giảm kho.
  const [quantityDirection, setQuantityDirection] = useState<QuantityAdjustDirection>("ThemThieu");
  const [selectedLineId, setSelectedLineId] = useState<string>(receipt.lines[0]?.id || "");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [previousValue, setPreviousValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [createdBy, setCreatedBy] = useState(app.currentUser?.name || "NV Kho Mai");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedLine = receipt.lines.find((l) => String(l.id || "") === selectedLineId) ?? receipt.lines[0];

  // Danh sách thiết bị thuộc dòng phiếu nhập đang chọn (dùng khi Loại bỏ thiết bị thừa/trùng)
  const lineEquipments = app.equipment.filter((eq) => {
    const matchLine = selectedLineId && eq.importReceiptLineId === selectedLineId;
    const matchProduct = selectedLine && eq.productId === selectedLine.productId;
    return (matchLine || (!eq.importReceiptLineId && matchProduct)) && eq.equipmentStatus !== "Đang thuê";
  });

  const toggleEquipmentId = (eqId: number) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const isRemoveExcess = type === "Số lượng" && quantityDirection === "LoaiThua";
    if (!isRemoveExcess && (!previousValue.trim() || !newValue.trim())) {
      setSubmitError("Vui lòng nhập đầy đủ giá trị trước và sau khi điều chỉnh.");
      return;
    }
    if (!reason.trim()) {
      setSubmitError("Vui lòng ghi rõ lý do và căn cứ điều chỉnh.");
      return;
    }

    if (app.realApi) {
      const phieuNhapId = Number(receipt.id);
      if (!Number.isFinite(phieuNhapId)) return;

      const loaiDieuChinh =
        type === "Số lượng"
          ? quantityDirection === "LoaiThua"
            ? "KhaiBaoTrungSaiThietBi"
            : "KhaiBaoThieuThietBi"
          : "SaiGiaNhap";
      const maChiTietPhieuNhap =
        selectedLineId && Number.isFinite(Number(selectedLineId)) ? Number(selectedLineId) : undefined;

      // Xây dựng danh sách chi tiết đúng theo loại điều chỉnh
      let chiTietPayload: Array<{
        maThietBi?: number;
        maChiTietPhieuNhap?: number;
        giaTriDeNghiSau?: unknown;
        ghiChu?: string;
      }> = [];

      if (loaiDieuChinh === "KhaiBaoThieuThietBi") {
        const prevQty = Number(previousValue.replace(/[^\d.-]/g, ""));
        const newQty = Number(newValue.replace(/[^\d.-]/g, ""));
        const delta = Math.round(newQty - prevQty);
        if (!Number.isFinite(prevQty) || !Number.isFinite(newQty) || delta <= 0) {
          setSubmitError("Số lượng sau điều chỉnh phải lớn hơn số lượng trước điều chỉnh (ít nhất +1 chiếc).");
          return;
        }
        if (delta > 50) {
          setSubmitError("Mỗi lần chỉ được bổ sung tối đa 50 thiết bị.");
          return;
        }
        chiTietPayload = Array.from({ length: delta }, (_, idx) => ({
          maChiTietPhieuNhap,
          giaTriDeNghiSau: { loai: type, truoc: prevQty, sau: newQty, thuTuBoSung: idx + 1 },
          ghiChu: `Bổ sung thiết bị thiếu (${idx + 1}/${delta}): ${prevQty} -> ${newQty}`,
        }));
      } else if (loaiDieuChinh === "KhaiBaoTrungSaiThietBi") {
        if (selectedEquipmentIds.length === 0) {
          setSubmitError("Vui lòng chọn ít nhất 1 thiết bị khai báo thừa/trùng cần loại bỏ.");
          return;
        }
        chiTietPayload = selectedEquipmentIds.map((eqId) => ({
          maThietBi: eqId,
          maChiTietPhieuNhap,
          giaTriDeNghiSau: { trangThai: "NgungSuDung", tinhTrang: "KhaiBaoSai" },
          ghiChu: `Loại bỏ thiết bị khai báo thừa/trùng (#${eqId})`,
        }));
      } else {
        const parsedNewPrice = Number(newValue.replace(/[^\d.-]/g, ""));
        const giaTriDeNghiSau =
          Number.isFinite(parsedNewPrice) && parsedNewPrice >= 0
            ? {
                donGiaHieuLuc: parsedNewPrice,
                donGiaNhap: parsedNewPrice,
                loai: type,
                truoc: previousValue.trim(),
                sau: newValue.trim(),
              }
            : { loai: type, truoc: previousValue.trim(), sau: newValue.trim() };
        chiTietPayload = [
          {
            maChiTietPhieuNhap,
            giaTriDeNghiSau,
            ghiChu: `${type}: ${previousValue.trim()} -> ${newValue.trim()}`,
          },
        ];
      }

      setSubmitting(true);
      try {
        const created = await inventoryApi.lapPhieu({
          loaiDieuChinh,
          maPhieuNhapLienQuan: phieuNhapId,
          lyDo: reason.trim(),
          bangChung: evidence.trim() ? [evidence.trim()] : undefined,
          chiTiet: chiTietPayload,
        });
        await inventoryApi.guiDuyet(created.maPhieuDieuChinh);
        await app.refreshImportReceipts?.();
        onSuccess?.();
        onClose();
      } catch (err) {
        // [PN-11] Hiển thị chi tiết lỗi từ server (LoiTheoDuongDan hoặc thông điệp cụ thể) thay vì generic alert.
        let detail = "Không thể gửi đề nghị điều chỉnh phiếu nhập.";
        if (err instanceof Error && err.message) {
          detail = err.message;
        }
        // apiClient ném Error với message đã chứa thông điệp server. Nếu có cấu trúc JSON lỗi lồng, bóc ra.
        const anyErr = err as { data?: { loiTheoDuongDan?: Array<{ duongDan?: string; thongDiep?: string }>; thongDiep?: string } };
        if (anyErr?.data) {
          const parts: string[] = [];
          if (anyErr.data.thongDiep) parts.push(anyErr.data.thongDiep);
          (anyErr.data.loiTheoDuongDan ?? []).forEach((l) => {
            parts.push(l.duongDan ? `${l.duongDan}: ${l.thongDiep}` : l.thongDiep ?? "");
          });
          if (parts.length > 0) detail = parts.filter(Boolean).join(" | ");
        }
        setSubmitError(detail);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const res = app.createImportAdjustment({
      importReceiptId: receipt.id,
      type,
      previousValue: previousValue.trim(),
      newValue: newValue.trim(),
      reason: reason.trim(),
      evidence: evidence.trim() || undefined,
      createdBy: createdBy.trim(),
    });

    if (res.ok) {
      onSuccess?.();
      onClose();
    } else {
      setSubmitError(res.message);
    }
  };

  return {
    type, setType,
    quantityDirection, setQuantityDirection,
    selectedLineId, setSelectedLineId,
    selectedEquipmentIds, lineEquipments, toggleEquipmentId,
    previousValue, setPreviousValue,
    newValue, setNewValue,
    reason, setReason,
    evidence, setEvidence,
    createdBy, setCreatedBy,
    submitting, submitError,
    handleSubmit,
  };
}
