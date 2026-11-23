import type { Dispatch, SetStateAction } from "react";
import type {
  ActionResult,
  ContactLog,
  Equipment,
  MaintenanceReceipt,
  Order,
  OrderStatus,
  ReturnReceipt,
  ReturnReceiptItem,
  Surcharge,
} from "../../store";

interface Params {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
}

/**
 * Nghiệp vụ Nhận trả nhiều đợt, Duyệt mất thiết bị, Xử lý quá hạn & Nhật ký liên hệ (UC4.3, UC4.4).
 */
export function useReturnOverdueActions({ orders, setOrders, equipment, setEquipment, setMaintenanceReceipts }: Params) {
  const addContactLog = (orderId: string, log: Omit<ContactLog, "id" | "contactedAt">): ActionResult<ContactLog> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");
    const newLog: ContactLog = { id: `CLOG-${Date.now()}`, contactedAt: now, ...log };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              contactLogs: [newLog, ...(o.contactLogs || [])],
              statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${log.staffName}: Liên hệ khách (${log.outcome}) - ${log.note}` }],
            }
          : o
      )
    );

    return { ok: true, data: newLog };
  };

  const getOverdueConflicts = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return [];
    const overdueDebts = order.assignedEquipment.filter((ae) => !ae.returnedAt).map((ae) => ae.equipmentId);
    if (overdueDebts.length === 0) return [];

    const conflicts: Array<{
      equipmentId: string;
      nextOrderId: string;
      nextCustomerName: string;
      nextPickupTime: string;
      availableSubstitutes: string[];
    }> = [];

    const upcomingOrders = orders.filter(
      (o) => o.id !== orderId && ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)
    );

    for (const uo of upcomingOrders) {
      for (const ae of uo.assignedEquipment) {
        if (overdueDebts.includes(ae.equipmentId)) {
          const substitutes = equipment
            .filter((e) => e.productId === ae.productId && e.equipmentStatus === "Sẵn sàng" && e.id !== ae.equipmentId)
            .map((e) => e.id);

          conflicts.push({
            equipmentId: ae.equipmentId,
            nextOrderId: uo.id,
            nextCustomerName: uo.customerName,
            nextPickupTime: uo.pickupTime,
            availableSubstitutes: substitutes,
          });
        }
      }
    }

    return conflicts;
  };

  const approveLostEquipment = (orderId: string, equipmentId: string, staffName = "Quản trị viên"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    const updatedReceipts = order.returnReceipts?.map((rc) => ({
      ...rc,
      items: rc.items.map((it) => (it.equipmentId === equipmentId ? { ...it, lostApproved: true } : it)),
    }));

    setEquipment((prev) => prev.map((e) => (e.id === equipmentId ? { ...e, equipmentStatus: "Thất lạc" } : e)));
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              returnReceipts: updatedReceipts,
              surcharges: o.surcharges.map((s) => (s.equipmentId === equipmentId ? { ...s, status: "Đã duyệt" } : s)),
              statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Duyệt kết luận mất thiết bị ${equipmentId}` }],
            }
          : o
      )
    );

    return { ok: true, data: undefined };
  };

  const createReturnReceipt = (
    orderId: string,
    input: { returnItems: ReturnReceiptItem[]; staffName: string; note?: string; photoUrls?: string[] }
  ): ActionResult<ReturnReceipt> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (!input.returnItems.length) return { ok: false, message: "Vui lòng chọn ít nhất một thiết bị nhận trả đợt này." };

    const now = new Date().toLocaleString("vi-VN");
    const returnRound = (order.returnReceipts?.length || 0) + 1;
    const receiptId = `PNT-${order.id}-${returnRound}`;

    const updatedAssigned = order.assignedEquipment.map((ae) => {
      const ri = input.returnItems.find((item) => item.equipmentId === ae.equipmentId);
      return ri ? { ...ae, returnedAt: now, returnCondition: ri.condition, returnNote: ri.note || "" } : ae;
    });

    const isFinalReturn = updatedAssigned.filter((ae) => !ae.returnedAt).length === 0;
    const newMaintenance: MaintenanceReceipt[] = [];
    const newSurcharges: Surcharge[] = [];

    input.returnItems.forEach((ri) => {
      if (["Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện"].includes(ri.condition)) {
        const pbtId = `PBT-${Date.now()}-${ri.equipmentId}`;
        ri.maintenanceReceiptId = pbtId;
        newMaintenance.push({
          id: pbtId,
          equipmentId: ri.equipmentId,
          productId: ri.productId,
          orderId: order.id,
          issueDescription: `${ri.condition}: ${ri.note || "Cần bảo dưỡng sau khi khách trả đồ"}`,
          status: "Chờ xử lý",
          createdAt: now,
          estimatedCost: ri.surchargeAmount || 0,
          note: `Tự động tạo từ phiếu nhận trả ${receiptId}`,
        });
      }

      if (ri.surchargeAmount > 0) {
        newSurcharges.push({
          id: `PC-${Date.now()}-${ri.equipmentId}`,
          type: ri.condition,
          equipmentId: ri.equipmentId,
          amount: ri.surchargeAmount,
          reason: `${ri.condition} (${receiptId}) — ${ri.note || "Phụ phí khắc phục/bồi thường"}`,
          status: "Chờ duyệt",
          createdBy: input.staffName || "Nhân viên nhận trả",
        });
      }
    });

    if (newMaintenance.length) setMaintenanceReceipts((prev) => [...newMaintenance, ...prev]);

    setEquipment((prev) =>
      prev.map((e) => {
        const ri = input.returnItems.find((item) => item.equipmentId === e.id);
        if (!ri) return e;
        let nextStatus: Equipment["equipmentStatus"] = "Sẵn sàng";
        if (ri.condition === "Mất thiết bị") nextStatus = "Thất lạc";
        else if (["Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện"].includes(ri.condition)) nextStatus = "Đang bảo trì";
        return { ...e, equipmentStatus: nextStatus, rentCount: ri.condition === "Mất thiết bị" ? e.rentCount : e.rentCount + 1 };
      })
    );

    const newReceipt: ReturnReceipt = {
      id: receiptId,
      orderId: order.id,
      returnRound,
      returnedAt: now,
      staffName: input.staffName || "Nhân viên kho",
      items: input.returnItems,
      isFinalReturn,
      note: input.note || "",
      photoUrls: input.photoUrls || [],
    };

    const newStatus: OrderStatus = isFinalReturn ? "Đã nhận trả" : "Đang thuê";
    const history = isFinalReturn
      ? [...order.statusHistory, { status: "Đã nhận trả" as OrderStatus, at: now, by: input.staffName || "Nhân viên" }]
      : order.statusHistory;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedEquipment: updatedAssigned,
              status: newStatus,
              returnedAt: isFinalReturn ? now : o.returnedAt,
              returnReceipts: [...(o.returnReceipts || []), newReceipt],
              surcharges: [...o.surcharges, ...newSurcharges],
              statusHistory: history,
            }
          : o
      )
    );

    return { ok: true, data: newReceipt };
  };

  const checkOrderOverdue = (order: Order) => {
    // [OV-03] Chỉ tính quá hạn trả cho đơn thực sự đang thuê hoặc đã quá hạn.
    // Các trạng thái trước bàn giao (Chờ thanh toán, Đã xác nhận, Đang chuẩn bị, Sẵn sàng nhận)
    // không được tính là "Quá hạn hẹn trả" dù returnTime đã qua thời điểm hiện tại.
    if (order.status !== "Đang thuê" && order.status !== "Quá hạn") {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }
    if (!order.returnTime) {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }
    const parsedDeadline = new Date(
      order.returnTime.replace(" ", "T") + (order.returnTime.includes(":") && order.returnTime.split(":").length === 2 ? ":00" : "")
    ).getTime();
    const now = Date.now();
    if (isNaN(parsedDeadline) || now <= parsedDeadline) {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }
    const hasDebt = order.assignedEquipment.length === 0 || order.assignedEquipment.some((ae) => !ae.returnedAt);
    if (!hasDebt) return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };

    const diffHours = (now - parsedDeadline) / 3600000;
    const overdueDays = Math.max(1, Math.ceil(diffHours / 24));
    let dailyRentalTotal = order.items.reduce((sum, item) => sum + item.pricePerDay * item.qty, 0);
    // [OV-03] Fallback khi order.items chưa hydrate: tính theo tổng tiền thuê chia số ngày.
    if (dailyRentalTotal === 0) {
      const pickupMs = order.pickupTime ? new Date(order.pickupTime.replace(" ", "T")).getTime() : NaN;
      const returnMs = parsedDeadline;
      const rentalBase = Math.max(0, (order.rental || 0) - (order.discount || 0));
      const rentDays = Number.isFinite(pickupMs) && Number.isFinite(returnMs)
        ? Math.max(1, Math.ceil((returnMs - pickupMs) / 86400000))
        : 1;
      dailyRentalTotal = rentalBase / rentDays;
    }
    return { isOverdue: true, overdueHours: Math.round(diffHours), overdueDays, surcharge: Math.round(overdueDays * dailyRentalTotal * 1.5) };
  };

  const markEquipmentReturned = (orderId: string, equipmentId: string, condition: string, note: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const assigned = o.assignedEquipment.map((a) =>
          a.equipmentId === equipmentId ? { ...a, returnedAt: new Date().toLocaleString("vi-VN"), returnCondition: condition, returnNote: note } : a
        );
        const allReturned = assigned.every((a) => a.returnedAt);
        const now = new Date().toLocaleString("vi-VN");
        return {
          ...o,
          assignedEquipment: assigned,
          status: allReturned ? "Đã nhận trả" : o.status,
          statusHistory: allReturned ? [...o.statusHistory, { status: "Đã nhận trả", at: now, by: "Nhân viên" }] : o.statusHistory,
        };
      })
    );
    const statusAfter: Equipment["equipmentStatus"] =
      condition === "Bình thường" || condition === "Cần vệ sinh" ? "Sẵn sàng" : "Đang bảo trì";
    setEquipment((prev) => prev.map((e) => (e.id === equipmentId ? { ...e, equipmentStatus: statusAfter, rentCount: e.rentCount + 1 } : e)));
  };

  return { addContactLog, getOverdueConflicts, approveLostEquipment, createReturnReceipt, checkOrderOverdue, markEquipmentReturned };
}
