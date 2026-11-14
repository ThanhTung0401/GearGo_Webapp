import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type Equipment,
  type ImportReceipt,
  type ImportReceiptAdjustment,
  type MaintenanceReceipt,
  type Order,
  type Product,
  type StockAdjustmentLine,
  type StockAdjustmentReceipt,
  type Supplier,
} from "../store";
import { makeId, normalizeCode } from "./appStateStorage";

interface UseInventoryActionsParams {
  products: Product[];
  suppliers: Supplier[];
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  orders: Order[];
  importReceipts: ImportReceipt[];
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  maintenanceReceipts: MaintenanceReceipt[];
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  stockAdjustments: StockAdjustmentReceipt[];
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  addAuditLog: (entry: {
    actor: string;
    role: string;
    action: string;
    targetEntity: string;
    targetId: string;
    detail: string;
  }) => void;
}

/**
 * Hook nghiệp vụ nhập kho, điều chỉnh phiếu nhập, kiểm kê, điều chuyển và bảo trì thiết bị.
 */
export function useInventoryActions(params: UseInventoryActionsParams) {
  const {
    products,
    suppliers,
    equipment,
    setEquipment,
    orders,
    importReceipts,
    setImportReceipts,
    maintenanceReceipts,
    setMaintenanceReceipts,
    stockAdjustments,
    setStockAdjustments,
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
    setImportReceipts((current) => (exists ? current.map((item) => (item.id === receipt.id ? receipt : item)) : [...current, receipt]));
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

      if (newMaintReceipts.length > 0) {
        setMaintenanceReceipts((prev) => [...newMaintReceipts, ...prev]);
      }

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

  const createImportAdjustment = (input: Omit<ImportReceiptAdjustment, "id" | "createdAt" | "status">): ActionResult<ImportReceiptAdjustment> => {
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
                a.id === adjustmentId ? { ...a, status: "Từ chối" as const, approvedBy: "Quản trị viên", approvedAt: now, reviewNote: reason } : a
              ),
            }
          : r
      )
    );
    return { ok: true, data: undefined };
  };

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
          ? {
              ...r,
              status: "Từ chối",
              approvedBy: "Quản trị viên",
              approvedAt: now,
              note: note || "Từ chối điều chỉnh (Dữ liệu kho giữ nguyên)",
            }
          : r
      )
    );
    return { ok: true, data: undefined };
  };

  return {
    saveImportReceipt,
    cancelImportReceipt,
    confirmImportReceipt,
    createImportAdjustment,
    approveImportAdjustment,
    rejectImportAdjustment,
    saveMaintenanceReceipt,
    updateMaintenanceStatus,
    transferEquipment,
    createStockAdjustment,
    approveStockAdjustment,
    rejectStockAdjustment,
  };
}
