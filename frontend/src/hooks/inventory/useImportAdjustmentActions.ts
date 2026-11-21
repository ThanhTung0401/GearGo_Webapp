import type { Dispatch, SetStateAction } from "react";
import type { ActionResult, Equipment, ImportReceipt, ImportReceiptAdjustment, Order } from "../../store";
import type { InventoryAuditLogger } from "./useImportReceiptActions";

interface Params {
  equipment: Equipment[];
  orders: Order[];
  importReceipts: ImportReceipt[];
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  addAuditLog: InventoryAuditLogger;
}

/**
 * Nghiệp vụ đề nghị, duyệt và từ chối điều chỉnh sai lệch phiếu nhập sau chốt (UC7.10).
 */
export function useImportAdjustmentActions({ equipment, orders, importReceipts, setImportReceipts, addAuditLog }: Params) {
  const createImportAdjustment = (
    input: Omit<ImportReceiptAdjustment, "id" | "createdAt" | "status">
  ): ActionResult<ImportReceiptAdjustment> => {
    const receipt = importReceipts.find((r) => r.id === input.importReceiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập gốc." };
    if (receipt.status !== "Đã nhập kho") return { ok: false, message: "Chỉ phiếu đã nhập kho mới cần xử lý sai lệch." };

    const newAdj: ImportReceiptAdjustment = {
      ...input,
      id: `DCNH-${Date.now().toString().slice(-4)}`,
      status: "Chờ duyệt",
      createdAt: new Date().toLocaleString("vi-VN"),
    };

    setImportReceipts((prev) =>
      prev.map((r) => (r.id === input.importReceiptId ? { ...r, adjustments: [...(r.adjustments || []), newAdj] } : r))
    );

    addAuditLog({
      actor: input.createdBy,
      role: "staff",
      action: "Lập đề nghị điều chỉnh phiếu nhập (UC7.10)",
      targetEntity: "ImportReceipt",
      targetId: input.importReceiptId,
      detail: `Loại: ${input.type} - Lý do: ${input.reason}`,
    });

    return { ok: true, data: newAdj };
  };

  const approveImportAdjustment = (receiptId: string, adjustmentId: string, approvedBy = "Quản trị viên"): ActionResult => {
    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập." };
    const adj = receipt.adjustments?.find((a) => a.id === adjustmentId);
    if (!adj) return { ok: false, message: "Không tìm thấy bản đề nghị điều chỉnh." };

    if (adj.type === "Số lượng") {
      const relatedEquips = equipment.filter((e) => e.importReceiptId === receiptId);
      const inRentOrFuture = relatedEquips.some((e) =>
        orders.some(
          (o) =>
            (o.status === "Đang thuê" || o.status === "Đang chuẩn bị" || o.status === "Sẵn sàng nhận") &&
            (o.assignedEquipmentIds?.includes(e.id) || o.items.some((it) => it.equipmentId === e.id))
        )
      );
      if (inRentOrFuture) {
        return {
          ok: false,
          message:
            "Cảnh báo an toàn (Dòng phụ 4.1): Thiết bị trong lô nhập này đang được khách thuê hoặc đã gán lịch giao sắp tới. Vui lòng xử lý cam kết khách hàng trước khi giảm kho!",
        };
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    setImportReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              adjustments: (r.adjustments || []).map((a) =>
                a.id === adjustmentId ? { ...a, status: "Đã duyệt" as const, approvedBy, approvedAt: now } : a
              ),
            }
          : r
      )
    );

    addAuditLog({
      actor: approvedBy,
      role: "admin",
      action: "Duyệt điều chỉnh phiếu nhập (UC7.10)",
      targetEntity: "ImportReceipt",
      targetId: receiptId,
      detail: `Mã điều chỉnh: ${adjustmentId} - Loại: ${adj.type}`,
    });

    return { ok: true, data: undefined };
  };

  const rejectImportAdjustment = (receiptId: string, adjustmentId: string, reason = ""): ActionResult => {
    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập." };
    const now = new Date().toLocaleString("vi-VN");
    setImportReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              adjustments: (r.adjustments || []).map((a) =>
                a.id === adjustmentId
                  ? { ...a, status: "Từ chối" as const, approvedBy: "Quản trị viên", approvedAt: now, reviewNote: reason }
                  : a
              ),
            }
          : r
      )
    );
    return { ok: true, data: undefined };
  };

  return { createImportAdjustment, approveImportAdjustment, rejectImportAdjustment };
}
