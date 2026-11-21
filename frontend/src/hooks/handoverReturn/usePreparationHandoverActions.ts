import type { Dispatch, SetStateAction } from "react";
import type {
  ActionResult,
  AppNotification,
  AssignedEquipment,
  Equipment,
  HandoverRecord,
  Order,
  OrderStatus,
} from "../../store";

export interface HandoverReturnParams {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  sendNotification: (notif: {
    title: string;
    message: string;
    type: AppNotification["type"];
    targetRole: AppNotification["targetRole"];
    category?: AppNotification["category"];
    actionLink?: AppNotification["actionLink"];
  }) => ActionResult<AppNotification>;
}

/**
 * Nghiệp vụ Chuẩn bị đơn, Phân công thiết bị, Báo thiếu, Đổi thiết bị & Bàn giao (UC4.1, UC4.2, UC4.5).
 */
export function usePreparationHandoverActions(params: HandoverReturnParams) {
  const { orders, setOrders, equipment, setEquipment, sendNotification } = params;

  const advanceOrderStatus = (orderId: string, status: OrderStatus, by = "Nhân viên") => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status, statusHistory: [...o.statusHistory, { status, at: now, by }] } : o
      )
    );
  };

  const assignEquipment = (orderId: string, assigned: AssignedEquipment[]) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, assignedEquipment: assigned } : o)));
    const ids = assigned.map((a) => a.equipmentId);
    setEquipment((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, equipmentStatus: "Đang thuê" } : e)));
  };

  const completePreparation = (
    orderId: string,
    assignedEquipmentIds: { productId: string; equipmentId: string }[],
    staffName = "Nhân viên kho"
  ): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (!["Đã xác nhận", "Đang chuẩn bị"].includes(order.status)) {
      return { ok: false, message: "Chỉ đơn Đã xác nhận hoặc Đang chuẩn bị mới có thể lưu phân công." };
    }

    for (const item of order.items) {
      const count = assignedEquipmentIds.filter((a) => a.productId === item.productId).length;
      if (count < item.qty) {
        return {
          ok: false,
          message: `Chưa phân công đủ số lượng cho sản phẩm: ${item.productName} (Yêu cầu ${item.qty}, mới gán ${count}).`,
        };
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    const assigned: AssignedEquipment[] = assignedEquipmentIds.map((a) => ({
      equipmentId: a.equipmentId,
      productId: a.productId,
      assignedAt: now,
    }));

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedEquipment: assigned,
              status: "Sẵn sàng nhận",
              shortageReported: undefined,
              statusHistory: [
                ...o.statusHistory,
                { status: "Sẵn sàng nhận", at: now, by: `${staffName}: Đã phân công đủ ${assigned.length} thiết bị` },
              ],
            }
          : o
      )
    );

    sendNotification({
      title: "Thiết bị đã sẵn sàng nhận!",
      message: `Đơn hàng #${order.id} của quý khách đã được chuẩn bị đầy đủ thiết bị và sẵn sàng nhận tại cửa hàng.`,
      type: "order",
      targetRole: "customer",
    });

    return { ok: true, data: undefined };
  };

  const reportEquipmentShortage = (orderId: string, note: string, staffName = "Nhân viên kho"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              shortageReported: { reportedAt: now, staffName, note, status: "Chờ xử lý" },
              statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Báo thiếu thiết bị - ${note}` }],
            }
          : o
      )
    );

    sendNotification({
      title: "Cảnh báo thiếu thiết bị soạn hàng",
      message: `Đơn hàng #${order.id} (${order.customerName}) thiếu thiết bị: ${note}. Quản trị viên vui lòng can thiệp xử lý với khách.`,
      type: "system",
      targetRole: "admin",
    });

    return { ok: true, data: undefined };
  };

  const reportCustomerNoShow = (orderId: string, note: string, staffName = "Nhân viên kho"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              noShowReported: { reportedAt: now, staffName, note },
              statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Ghi nhận khách không đến nhận (${note})` }],
            }
          : o
      )
    );

    sendNotification({
      title: "Khách hàng không đến nhận đồ",
      message: `Đơn hàng #${order.id} (${order.customerName}) quá giờ hẹn nhận nhưng khách chưa đến. Ghi chú: ${note}. Quản trị viên vui lòng xử lý theo UC3.4.`,
      type: "order",
      targetRole: "admin",
    });

    return { ok: true, data: undefined };
  };

  const changeAssignedEquipment = (orderId: string, oldEquipmentId: string, newEquipmentId: string): ActionResult => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const newEq = equipment.find((e) => e.id === newEquipmentId);
    if (!newEq || newEq.equipmentStatus !== "Sẵn sàng") {
      return { ok: false, message: "Thiết bị thay thế không sẵn sàng trong kho." };
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              assignedEquipment: o.assignedEquipment.map((a) =>
                a.equipmentId === oldEquipmentId ? { ...a, equipmentId: newEquipmentId } : a
              ),
            }
          : o
      )
    );

    setEquipment((prev) =>
      prev.map((e) => {
        if (e.id === oldEquipmentId) return { ...e, equipmentStatus: "Sẵn sàng" };
        if (e.id === newEquipmentId) return { ...e, equipmentStatus: order.status === "Đang thuê" ? "Đang thuê" : "Sẵn sàng" };
        return e;
      })
    );

    return { ok: true, data: undefined };
  };

  const createHandoverRecord = (
    orderId: string,
    record: Omit<HandoverRecord, "id" | "handoverAt">
  ): ActionResult<HandoverRecord> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");
    const newRecord: HandoverRecord = { ...record, id: `BBBG-${order.id}`, orderId, handoverAt: now };

    const assignedIds = record.items.map((i) => i.equipmentId);
    setEquipment((prev) => prev.map((e) => (assignedIds.includes(e.id) ? { ...e, equipmentStatus: "Đang thuê" } : e)));

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Đang thuê",
              handedOverAt: now,
              handoverRecord: newRecord,
              statusHistory: [...o.statusHistory, { status: "Đang thuê", at: now, by: record.staffName || "Nhân viên kho" }],
            }
          : o
      )
    );

    return { ok: true, data: newRecord };
  };

  return {
    advanceOrderStatus,
    assignEquipment,
    completePreparation,
    reportEquipmentShortage,
    reportCustomerNoShow,
    changeAssignedEquipment,
    createHandoverRecord,
  };
}
