import type { Dispatch, SetStateAction } from "react";
import type {
  ActionResult,
  Equipment,
  ImportReceipt,
  MaintenanceReceipt,
  Product,
  Supplier,
} from "../../store";
import { makeId, normalizeCode } from "../appStateStorage";

export interface InventoryAuditLogger {
  (entry: {
    actor: string;
    role: string;
    action: string;
    targetEntity: string;
    targetId: string;
    detail: string;
  }): void;
}

interface Params {
  products: Product[];
  suppliers: Supplier[];
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  importReceipts: ImportReceipt[];
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  addAuditLog: InventoryAuditLogger;
}

/**
 * Nghiệp vụ lập, hủy và xác nhận kiểm nhận phiếu nhập kho (UC7.5, UC7.7, UC7.7.2).
 */
export function useImportReceiptActions(params: Params) {
  const {
    products,
    suppliers,
    equipment,
    setEquipment,
    importReceipts,
    setImportReceipts,
    setMaintenanceReceipts,
    addAuditLog,
  } = params;

  const saveImportReceipt = (input: ImportReceipt): ActionResult<ImportReceipt> => {
    const displayCode = normalizeCode(input.displayCode || input.id);
    if (!displayCode) return { ok: false, message: "Vui lòng nhập mã phiếu nhập." };
    if (importReceipts.some((receipt) => receipt.id !== input.id && normalizeCode(receipt.displayCode || receipt.id) === displayCode)) {
      return { ok: false, message: "Mã phiếu nhập đã tồn tại." };
    }
    if (!suppliers.some((supplier) => supplier.id === input.supplierId && supplier.cooperationStatus === "active")) {
      return { ok: false, message: "Vui lòng chọn nhà cung cấp đang hợp tác (UC7.5)." };
    }
    if (input.lines.length === 0) return { ok: false, message: "Phiếu nhập cần ít nhất một dòng sản phẩm." };

    for (const line of input.lines) {
      if (line.quantity <= 0 || !Number.isInteger(line.quantity)) return { ok: false, message: "Số lượng từng dòng phải là số nguyên dương." };
      if (line.unitPrice < 0) return { ok: false, message: "Đơn giá nhập không được âm." };
      if (line.unitPrice === 0 && !line.priceZeroReason?.trim() && !line.note?.trim()) {
        return { ok: false, message: "Sản phẩm với đơn giá 0 ₫ bắt buộc phải nhập lý do (hàng khuyến mãi/tài trợ/bảo hành) theo UC7.5.1!" };
      }
      if (!products.some((product) => product.id === line.productId)) return { ok: false, message: "Sản phẩm không tồn tại trong danh mục." };
    }

    const receipt: ImportReceipt = { ...input, id: input.id || makeId("RECEIPT"), displayCode };
    const exists = importReceipts.some((item) => item.id === receipt.id);
    setImportReceipts((current) => (exists ? current.map((item) => (item.id === receipt.id ? receipt : item)) : [receipt, ...current]));
    return { ok: true, data: receipt };
  };

  const cancelImportReceipt = (receiptId: string, reason: string): ActionResult => {
    const receipt = importReceipts.find((item) => item.id === receiptId);
    if (!receipt || receipt.status !== "Nháp") return { ok: false, message: "Chỉ phiếu nháp mới có thể hủy." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do hủy." };
    setImportReceipts((current) =>
      current.map((item) => (item.id === receiptId ? { ...item, status: "Đã hủy", note: reason.trim() } : item))
    );
    return { ok: true, data: undefined };
  };

  const confirmImportReceipt = (
    receiptId: string,
    inspection?: {
      inspectedBy: string;
      lines: {
        productId: string;
        acceptedCodes: string[];
        damagedCodes?: string[];
        damageNotes?: string;
        rejectedQty?: number;
        rejectionReason?: string;
      }[];
    }
  ): string | null => {
    const receipt = importReceipts.find((item) => item.id === receiptId);
    if (!receipt || receipt.status !== "Nháp") return "Phiếu không tồn tại hoặc đã được xử lý.";
    const supplier = suppliers.find((item) => item.id === receipt.supplierId);
    if (!supplier || supplier.cooperationStatus !== "active") return "Nhà cung cấp không tồn tại hoặc đã ngừng hợp tác.";
    if (
      receipt.lines.some(
        (line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || line.unitPrice < 0 || !products.some((product) => product.id === line.productId)
      )
    ) {
      return "Chi tiết phiếu nhập có sản phẩm, số lượng hoặc đơn giá không hợp lệ.";
    }

    const now = new Date().toLocaleString("vi-VN");
    const nowDateOnly = new Date().toISOString().slice(0, 10);
    let newEquipment: Equipment[] = [];
    let updatedReceiptLines = receipt.lines;

    if (inspection && inspection.lines) {
      const newMaintReceipts: MaintenanceReceipt[] = [];

      for (const inspLine of inspection.lines) {
        const line = receipt.lines.find((l) => l.productId === inspLine.productId);
        const unitPrice = line?.unitPrice || 0;

        inspLine.acceptedCodes.forEach((code) => {
          newEquipment.push({
            id: code,
            displayCode: code,
            importReceiptLineId: line?.id,
            productId: inspLine.productId,
            originalProductId: inspLine.productId,
            importReceiptId: receipt.id,
            importDate: nowDateOnly,
            importPrice: unitPrice,
            condition: "Mới 100%",
            includedAccessories: [],
            note: "Kiểm nhận đạt chuẩn nhập kho",
            equipmentStatus: "Sẵn sàng",
            rentCount: 0,
          });
        });

        inspLine.damagedCodes?.forEach((code) => {
          newEquipment.push({
            id: code,
            displayCode: code,
            importReceiptLineId: line?.id,
            productId: inspLine.productId,
            originalProductId: inspLine.productId,
            importReceiptId: receipt.id,
            importDate: nowDateOnly,
            importPrice: unitPrice,
            condition: "Lỗi khi nhập kho (chờ xử lý)",
            includedAccessories: [],
            note: inspLine.damageNotes || "Hàng lỗi khi nhập kho (UC7.7.2)",
            equipmentStatus: "Đang bảo trì",
            rentCount: 0,
          });

          newMaintReceipts.push({
            id: `PBTI-${Date.now().toString().slice(-4)}-${code}`,
            equipmentId: code,
            issueDescription: `Hàng lỗi khi giao nhận từ NCC ${supplier.name}: ${inspLine.damageNotes || "Lỗi kỹ thuật xuất xưởng"} (UC7.7.2)`,
            estimatedCost: 0,
            status: "Đang sửa chữa",
            createdAt: now,
          });
        });
      }

      if (newMaintReceipts.length > 0) setMaintenanceReceipts((prev) => [...newMaintReceipts, ...prev]);

      updatedReceiptLines = receipt.lines.map((line) => {
        const insp = inspection.lines.find((il) => il.productId === line.productId);
        if (!insp) return line;
        return {
          ...line,
          acceptedQty: insp.acceptedCodes.length,
          acceptedCodes: insp.acceptedCodes,
          damagedQty: insp.damagedCodes?.length || 0,
          damagedCodes: insp.damagedCodes,
          damageNotes: insp.damageNotes,
          rejectedQty: insp.rejectedQty || 0,
          rejectionReason: insp.rejectionReason,
          equipmentCodes: [...insp.acceptedCodes, ...(insp.damagedCodes || [])],
        };
      });
    } else {
      const codes = receipt.lines.flatMap((line) => line.equipmentCodes.map((code) => code.trim()));
      const expected = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
      if (codes.length !== expected || codes.some((code) => !code)) return "Số mã thiết bị không khớp số lượng thực nhận.";
      if (new Set(codes).size !== codes.length || codes.some((code) => equipment.some((item) => item.id === code))) {
        return "Mã thiết bị bị trùng trong phiếu hoặc đã tồn tại trong kho.";
      }
      newEquipment = receipt.lines.flatMap((line) =>
        line.equipmentCodes.map((code) => ({
          id: code,
          displayCode: code,
          importReceiptLineId: line.id,
          productId: line.productId,
          originalProductId: line.productId,
          importReceiptId: receipt.id,
          importDate: nowDateOnly,
          importPrice: line.unitPrice,
          condition: line.receivingCondition || "Mới",
          includedAccessories: [],
          note: line.note || "",
          equipmentStatus: "Sẵn sàng",
          rentCount: 0,
        }))
      );
    }

    setEquipment((prev) => [...prev, ...newEquipment]);
    setImportReceipts((prev) =>
      prev.map((item) =>
        item.id === receiptId
          ? {
              ...item,
              supplierName: supplier.name,
              lines: updatedReceiptLines.map((line) => ({
                ...line,
                productNameSnapshot: products.find((product) => product.id === line.productId)?.name ?? "",
              })),
              status: "Đã nhập kho",
              confirmedAt: now,
              receivedAt: nowDateOnly,
              inspectedBy: inspection?.inspectedBy || "Quản trị viên",
            }
          : item
      )
    );

    addAuditLog({
      actor: inspection?.inspectedBy || "Quản trị viên",
      role: "admin",
      action: "Xác nhận nhập kho (UC7.7)",
      targetEntity: "ImportReceipt",
      targetId: receiptId,
      detail: `Đã kích hoạt ${newEquipment.length} thiết bị mới vào kho từ NCC ${supplier.name}`,
    });

    return null;
  };

  return { saveImportReceipt, cancelImportReceipt, confirmImportReceipt };
}
