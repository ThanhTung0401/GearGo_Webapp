import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type Equipment,
  type MaintenanceReceipt,
  type Order,
  type Product,
  type StockAdjustmentLine,
  type StockAdjustmentReceipt,
} from "../../store";
import type { InventoryAuditLogger } from "./useImportReceiptActions";

interface Params {
  products: Product[];
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  orders: Order[];
  maintenanceReceipts: MaintenanceReceipt[];
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  stockAdjustments: StockAdjustmentReceipt[];
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  addAuditLog: InventoryAuditLogger;
}

/**
 * Nghiệp vụ bảo trì thiết bị, chuyển loại sản phẩm và điều chỉnh kiểm kê kho (UC6.10–UC6.15).
 */
export function useMaintenanceAndStockActions(params: Params) {
  const {
    products,
    equipment,
    setEquipment,
    orders,
    maintenanceReceipts,
    setMaintenanceReceipts,
    stockAdjustments,
    setStockAdjustments,
    addAuditLog,
  } = params;

  const saveMaintenanceReceipt = (receipt: MaintenanceReceipt): ActionResult<MaintenanceReceipt> => {
    setMaintenanceReceipts((prev) => {
      const idx = prev.findIndex((m) => m.id === receipt.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = receipt;
        return copy;
      }
      return [receipt, ...prev];
    });
    setEquipment((prev) => prev.map((e) => (e.id === receipt.equipmentId ? { ...e, equipmentStatus: "Đang bảo trì" } : e)));
    addAuditLog({
      actor: "NV Kho Mai",
      role: "staff",
      action: "Tạo phiếu bảo trì (UC6.12)",
      targetEntity: "MaintenanceReceipt",
      targetId: receipt.id,
      detail: `Thiết bị: ${receipt.equipmentId} - Lỗi: ${receipt.issueDescription} - Dự tính: ${fmt(receipt.estimatedCost)}`,
    });
    return { ok: true, data: receipt };
  };

  const updateMaintenanceStatus = (
    id: string,
    status: MaintenanceReceipt["status"],
    actualCost?: number,
    note?: string
  ): ActionResult => {
    const m = maintenanceReceipts.find((item) => item.id === id);
    if (!m) return { ok: false, message: "Không tìm thấy phiếu bảo trì." };
    const now = new Date().toLocaleString("vi-VN");

    setMaintenanceReceipts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              actualCost: actualCost !== undefined ? actualCost : item.actualCost,
              completedAt: status === "Hoàn tất" ? now : item.completedAt,
              note: note || item.note,
            }
          : item
      )
    );

    if (status === "Hoàn tất") {
      setEquipment((prev) => prev.map((e) => (e.id === m.equipmentId ? { ...e, equipmentStatus: "Sẵn sàng" } : e)));
    } else if (status === "Không thể sửa") {
      setEquipment((prev) => prev.map((e) => (e.id === m.equipmentId ? { ...e, equipmentStatus: "Ngừng sử dụng" } : e)));
    }

    addAuditLog({
      actor: "NV Kho Mai",
      role: "staff",
      action: "Nghiệm thu bảo trì (UC6.13)",
      targetEntity: "MaintenanceReceipt",
      targetId: id,
      detail: `Trạng thái: ${status}${actualCost !== undefined ? ` - Chi phí thực tế: ${fmt(actualCost)}` : ""}${note ? ` (${note})` : ""}`,
    });

    return { ok: true, data: undefined };
  };

  const transferEquipment = (equipmentId: string, newProductId: string): ActionResult<Equipment> => {
    const item = equipment.find((entry) => entry.id === equipmentId);
    if (!item) return { ok: false, message: "Không tìm thấy thiết bị." };
    if (item.equipmentStatus !== "Sẵn sàng") return { ok: false, message: "Chỉ thiết bị Sẵn sàng mới được chuyển loại." };
    const target = products.find((product) => product.id === newProductId && product.status === "active");
    if (!target) return { ok: false, message: "Sản phẩm đích không tồn tại hoặc đã tạm dừng." };
    const assigned = orders.some(
      (order) =>
        !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(order.status) &&
        order.assignedEquipment.some((entry) => entry.equipmentId === equipmentId && !entry.returnedAt)
    );
    if (assigned) return { ok: false, message: "Thiết bị đang được phân công cho một đơn chưa kết thúc." };
    const updated = { ...item, productId: newProductId };
    setEquipment((current) => current.map((entry) => (entry.id === equipmentId ? updated : entry)));
    return { ok: true, data: updated };
  };

  const createStockAdjustment = (input: {
    reason: string;
    createdBy: string;
    lines: StockAdjustmentLine[];
    autoApprove?: boolean;
  }): ActionResult<StockAdjustmentReceipt> => {
    if (!input.lines.length) return { ok: false, message: "Phiếu điều chỉnh phải có ít nhất 1 dòng thiết bị." };
    const now = new Date().toLocaleString("vi-VN");
    const autoApprove = input.autoApprove ?? false;
    const newReceipt: StockAdjustmentReceipt = {
      id: `PDCK-${Date.now()}`,
      createdAt: now,
      createdBy: input.createdBy || "Nhân viên kho",
      reason: input.reason || "Kiểm kê định kỳ kho",
      status: autoApprove ? "Đã duyệt" : "Chờ duyệt",
      approvedBy: autoApprove ? input.createdBy : undefined,
      approvedAt: autoApprove ? now : undefined,
      lines: input.lines,
    };

    if (autoApprove) {
      setEquipment((prev) =>
        prev.map((e) => {
          const line = input.lines.find((l) => l.equipmentId === e.id);
          if (!line) return e;
          return {
            ...e,
            equipmentStatus: line.newStatus,
            condition: line.newStatus === "Ngừng sử dụng" ? "Hỏng hoàn toàn (Sau kiểm kê)" : e.condition,
          };
        })
      );
    }

    setStockAdjustments((prev) => [newReceipt, ...prev]);
    return { ok: true, data: newReceipt };
  };

  const approveStockAdjustment = (id: string, note?: string): ActionResult => {
    const receipt = stockAdjustments.find((r) => r.id === id);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu điều chỉnh kho." };
    if (receipt.status === "Đã duyệt") return { ok: false, message: "Phiếu này đã được phê duyệt trước đó." };

    for (const line of receipt.lines) {
      if (line.newStatus === "Thất lạc" || line.newStatus === "Ngừng sử dụng") {
        const activeRented = orders.find(
          (o) => o.status === "Đang thuê" && o.assignedEquipment.some((ae) => ae.equipmentId === line.equipmentId && !ae.returnedAt)
        );
        if (activeRented) {
          return {
            ok: false,
            message: `Thiết bị ${line.equipmentId} đang ở khách thuê (Đơn ${activeRented.id}). Cần thu hồi hoặc giải quyết bồi hoàn trước khi điều chỉnh mất/ngừng dùng! (UC6.11 Dòng 2.1)`,
          };
        }
        const upcomingOrder = orders.find(
          (o) => ["Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && o.assignedEquipment.some((ae) => ae.equipmentId === line.equipmentId)
        );
        if (upcomingOrder) {
          return {
            ok: false,
            message: `Thiết bị ${line.equipmentId} đã được gán cho Đơn ${upcomingOrder.id} (${upcomingOrder.status}). Vui lòng điều phối thiết bị thay thế trước khi duyệt giảm kho! (UC6.11.1)`,
          };
        }
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    setEquipment((prev) =>
      prev.map((e) => {
        const line = receipt.lines.find((l) => l.equipmentId === e.id);
        if (!line) return e;
        return {
          ...e,
          equipmentStatus: line.newStatus,
          condition: line.newStatus === "Ngừng sử dụng" ? "Hỏng hoàn toàn (Sau kiểm kê)" : e.condition,
        };
      })
    );

    setStockAdjustments((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "Đã duyệt", approvedBy: "Quản trị viên", approvedAt: now, note: note || r.note } : r
      )
    );
    return { ok: true, data: undefined };
  };

  const rejectStockAdjustment = (id: string, note?: string): ActionResult => {
    const receipt = stockAdjustments.find((r) => r.id === id);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu điều chỉnh kho." };
    const now = new Date().toLocaleString("vi-VN");
    setStockAdjustments((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "Từ chối", approvedBy: "Quản trị viên", approvedAt: now, note: note || "Từ chối điều chỉnh (Dữ liệu kho giữ nguyên)" }
          : r
      )
    );
    return { ok: true, data: undefined };
  };

  return {
    saveMaintenanceReceipt,
    updateMaintenanceStatus,
    transferEquipment,
    createStockAdjustment,
    approveStockAdjustment,
    rejectStockAdjustment,
  };
}
