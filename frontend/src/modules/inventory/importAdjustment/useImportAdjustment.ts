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
  const [previousValue, setPreviousValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [createdBy, setCreatedBy] = useState(app.currentUser?.name || "NV Kho Mai");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!previousValue.trim() || !newValue.trim()) {
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
      setSubmitting(true);
      try {
        // [PN-10] Map loại điều chỉnh theo type + hướng (chỉ khi là "Số lượng").
        // "Thông tin chứng từ" không đụng kho/giá → dùng SaiGiaNhap làm nhóm nhật ký (giữ nguyên hành vi cũ).
        const loaiDieuChinh =
          type === "Số lượng"
            ? quantityDirection === "LoaiThua"
              ? "KhaiBaoTrungSaiThietBi"
              : "KhaiBaoThieuThietBi"
            : "SaiGiaNhap";
        const maChiTietPhieuNhap =
          selectedLineId && Number.isFinite(Number(selectedLineId)) ? Number(selectedLineId) : undefined;
        const parsedNewPrice = Number(newValue.replace(/[^\d.-]/g, ""));
        const giaTriDeNghiSau =
          loaiDieuChinh === "SaiGiaNhap" && Number.isFinite(parsedNewPrice) && parsedNewPrice >= 0
            ? {
                donGiaHieuLuc: parsedNewPrice,
                donGiaNhap: parsedNewPrice,
                loai: type,
                truoc: previousValue.trim(),
                sau: newValue.trim(),
              }
            : { loai: type, truoc: previousValue.trim(), sau: newValue.trim() };

        const created = await inventoryApi.lapPhieu({
          loaiDieuChinh,
          maPhieuNhapLienQuan: phieuNhapId,
          lyDo: reason.trim(),
          bangChung: evidence.trim() ? [evidence.trim()] : undefined,
          chiTiet: [
            {
              maChiTietPhieuNhap,
              giaTriDeNghiSau,
              ghiChu: `${type}: ${previousValue.trim()} -> ${newValue.trim()}`,
            },
          ],
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
    previousValue, setPreviousValue,
    newValue, setNewValue,
    reason, setReason,
    evidence, setEvidence,
    createdBy, setCreatedBy,
    submitting, submitError,
    handleSubmit,
  };
}
