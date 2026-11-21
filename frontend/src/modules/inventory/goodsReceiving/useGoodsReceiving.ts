import React, { useMemo, useState } from "react";
import type { useApp } from "../../../App";
import { importReceiptApi } from "../../../services/api";
import type { ImportReceipt } from "../../../store";

export interface LineInspectionState {
  acceptedQty: number;
  acceptedCodes: string[];
  damagedQty: number;
  damagedCodes: string[];
  damageNotes: string;
  rejectedQty: number;
  rejectionReason: string;
}

/**
 * Custom hook trung gian cho Biên bản kiểm nhận nhập kho (UC7.7 & UC7.7.2):
 * Quản lý state từng dòng sản phẩm, tự sinh mã serial, kiểm tra hợp lệ và gọi API xác nhận.
 */
export function useGoodsReceiving(
  receipt: ImportReceipt,
  app: ReturnType<typeof useApp>,
  onClose: () => void,
  onSuccess?: () => void
) {
  const [inspectedBy, setInspectedBy] = useState(app.currentUser?.name || "NV Kho Mai");
  const [receivingCondition, setReceivingCondition] = useState("Nguyên thùng, bao bì đầy đủ");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [lineStates, setLineStates] = useState<Record<number, LineInspectionState>>(() => {
    const initial: Record<number, LineInspectionState> = {};
    receipt.lines.forEach((line, index) => {
      initial[index] = {
        acceptedQty: line.quantity,
        acceptedCodes:
          line.equipmentCodes?.length === line.quantity
            ? [...line.equipmentCodes]
            : Array.from({ length: line.quantity }, () => ""),
        damagedQty: 0,
        damagedCodes: [],
        damageNotes: "",
        rejectedQty: 0,
        rejectionReason: "",
      };
    });
    return initial;
  });

  const updateLineState = (index: number, update: Partial<LineInspectionState>) => {
    setLineStates((prev) => ({
      ...prev,
      [index]: { ...prev[index], ...update },
    }));
  };

  // Sinh mã serial không trùng với kho hiện có và các dòng đang nhập
  const autoGenerateCodes = (index: number, type: "accepted" | "damaged") => {
    const line = receipt.lines[index];
    const prefix = line.productId.replace("P", "").padStart(2, "0");
    const st = lineStates[index];
    const targetQty = type === "accepted" ? st.acceptedQty : st.damagedQty;

    const currentAllCodes = new Set([
      ...app.equipment.map((e) => e.id),
      ...Object.values(lineStates)
        .flatMap((ls) => [...ls.acceptedCodes, ...ls.damagedCodes])
        .filter(Boolean),
    ]);

    const generated: string[] = [];
    let counter = 1;
    while (generated.length < targetQty) {
      const code = `EQ-${prefix}${counter.toString().padStart(3, "0")}`;
      if (!currentAllCodes.has(code)) {
        generated.push(code);
        currentAllCodes.add(code);
      }
      counter++;
    }

    updateLineState(index, type === "accepted" ? { acceptedCodes: generated } : { damagedCodes: generated });
  };

  const actualTotalAmount = useMemo(
    () =>
      receipt.lines.reduce((sum, line, index) => {
        const st = lineStates[index];
        const acceptedCount = (st?.acceptedQty || 0) + (st?.damagedQty || 0);
        return sum + acceptedCount * line.unitPrice;
      }, 0),
    [receipt.lines, lineStates]
  );

  const validateLines = (): string | null => {
    for (let i = 0; i < receipt.lines.length; i++) {
      const line = receipt.lines[i];
      const prod = app.products.find((p) => p.id === line.productId);
      const label = prod?.name || line.productId;
      const st = lineStates[i];
      const sum = st.acceptedQty + st.damagedQty + st.rejectedQty;

      if (sum !== line.quantity) {
        return `Dòng "${label}": Tổng lượng kiểm nhận (${st.acceptedQty} đạt + ${st.damagedQty} lỗi + ${st.rejectedQty} từ chối = ${sum}) không khớp số lượng dự kiến (${line.quantity}).`;
      }
      if (!app.realApi) {
        if (st.acceptedQty > 0 && (st.acceptedCodes.length !== st.acceptedQty || st.acceptedCodes.some((c) => !c.trim()))) {
          return `Dòng "${label}": Vui lòng nhập đủ ${st.acceptedQty} mã thiết bị đạt chuẩn.`;
        }
        if (st.damagedQty > 0 && (st.damagedCodes.length !== st.damagedQty || st.damagedCodes.some((c) => !c.trim()))) {
          return `Dòng "${label}": Vui lòng nhập đủ ${st.damagedQty} mã thiết bị lỗi nhận bảo hành.`;
        }
      }
      if (st.damagedQty > 0 && !st.damageNotes.trim()) {
        return `Dòng "${label}": Vui lòng ghi rõ mô tả lỗi hư hỏng theo quy định UC7.7.2.`;
      }
      if (st.rejectedQty > 0 && !st.rejectionReason.trim()) {
        return `Dòng "${label}": Vui lòng ghi rõ lý do từ chối trả lại NCC cho ${st.rejectedQty} món.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErr = validateLines();
    if (validationErr) {
      setSubmitError(validationErr);
      return;
    }

    if (app.realApi) {
      const phieuId = Number(receipt.id);
      if (!Number.isFinite(phieuId)) return;
      setSubmitting(true);
      try {
        // Đóng gói đúng schema XacNhanNhapKhoRequest.DanhSachDong.ThietBi của Backend
        const danhSachDong = receipt.lines
          .map((line, index) => {
            const chiTietId = Number(line.id);
            if (!Number.isFinite(chiTietId)) return null;
            const st = lineStates[index];
            const acceptedDevices = st.acceptedCodes.slice(0, st.acceptedQty).map((sn, i) => ({
              maHienThi: sn.trim() || `TB-${chiTietId}-OK-${i + 1}`,
              tinhTrang: "Moi",
              canBaoTri: false,
              ghiChu: line.note || "Đạt chuẩn kiểm nhận",
            }));
            const damagedDevices = st.damagedCodes.slice(0, st.damagedQty).map((sn, i) => ({
              maHienThi: sn.trim() || `TB-${chiTietId}-ERR-${i + 1}`,
              tinhTrang: "CanBaoTri",
              canBaoTri: true,
              moTaLoi: st.damageNotes.trim() || "Hàng nhập có lỗi cần bảo trì kỹ thuật",
              ghiChu: st.damageNotes.trim() || "Cần bảo trì trước khi cho thuê",
            }));
            return { maChiTietPhieuNhap: chiTietId, thietBi: [...acceptedDevices, ...damagedDevices] };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        await importReceiptApi.xacNhanNhapKho(phieuId, {
          ngayNhapThucTe: new Date().toISOString(),
          soChungTuNhaCungCap: receipt.supplierDocumentNumber,
          ghiChuXacNhan: `${receivingCondition} (Kiểm nhận: ${inspectedBy.trim()})`,
          danhSachDong,
        });
        await Promise.all([
          app.refreshImportReceipts?.(),
          app.refreshEquipment?.(),
          app.refreshCatalog?.(),
        ]);
        onSuccess?.();
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Không thể chốt kiểm nhận nhập kho trên máy chủ.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Kiểm tra trùng lặp mã thiết bị ở chế độ Mock
    const allCodes = Object.values(lineStates).flatMap((ls) =>
      [...ls.acceptedCodes, ...ls.damagedCodes].map((c) => c.trim().toUpperCase())
    );
    if (new Set(allCodes).size !== allCodes.length) {
      setSubmitError("Phát hiện mã thiết bị bị trùng lặp trong biên bản kiểm nhận.");
      return;
    }
    const duplicateWithWarehouse = allCodes.find((c) => app.equipment.some((e) => e.id.toUpperCase() === c));
    if (duplicateWithWarehouse) {
      setSubmitError(`Mã thiết bị "${duplicateWithWarehouse}" đã tồn tại trong kho GearGo.`);
      return;
    }

    const inspectionLines = receipt.lines.map((line, index) => {
      const st = lineStates[index];
      return {
        productId: line.productId,
        acceptedCodes: st.acceptedCodes.map((c) => c.trim().toUpperCase()),
        damagedCodes: st.damagedCodes.map((c) => c.trim().toUpperCase()),
        damageNotes: st.damageNotes.trim(),
        rejectedQty: st.rejectedQty,
        rejectionReason: st.rejectionReason.trim(),
      };
    });

    const err = app.confirmImportReceipt(receipt.id, {
      inspectedBy: inspectedBy.trim(),
      lines: inspectionLines,
    });
    if (err) {
      setSubmitError(err);
    } else {
      onSuccess?.();
      onClose();
    }
  };

  return {
    inspectedBy,
    setInspectedBy,
    receivingCondition,
    setReceivingCondition,
    submitting,
    submitError,
    lineStates,
    updateLineState,
    autoGenerateCodes,
    actualTotalAmount,
    handleSubmit,
  };
}
