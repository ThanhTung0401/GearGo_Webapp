import type { Dispatch, SetStateAction } from "react";
import type {
  ActionResult,
  AppNotification,
  AssignedEquipment,
  ContactLog,
  Equipment,
  HandoverRecord,
  MaintenanceReceipt,
  Order,
  OrderStatus,
  ReturnReceipt,
  ReturnReceiptItem,
  Surcharge,
} from "../store";

interface UseHandoverReturnActionsParams {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
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
 * Hook điều phối nghiệp vụ chuẩn bị, bàn giao, nhận trả nhiều đợt, phụ phí & quá hạn.
 */
export function useHandoverReturnActions(params: UseHandoverReturnActionsParams) {
  const { orders, setOrders, equipment, setEquipment, setMaintenanceReceipts, sendNotification } = params;

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

  // UC4.1: Hoàn tất chuẩn bị & Phân công serial
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

  // UC4.1 Dòng phụ 5.1: Cảnh báo không đủ thiết bị soạn hàng
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

  // UC4.4: Thêm nhật ký liên hệ xử lý quá hạn
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

  // UC4.4: Kiểm tra ảnh hưởng lịch thuê kế tiếp
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

  // UC4.5 Dòng phụ 4.2: Ghi nhận khách không đến nhận
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

  // UC4.3 Dòng phụ 3.2: Duyệt kết luận mất thiết bị & dừng tính trễ
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

  // UC10: Đổi thiết bị đã gán trước khi bàn giao nếu phát hiện lỗi
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
              assignedEquipment: o.assignedEquipment.map((a) => (a.equipmentId === oldEquipmentId ? { ...a, equipmentId: newEquipmentId } : a)),
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

  // UC11: Biên bản Bàn giao Thiết bị
  const createHandoverRecord = (orderId: string, record: Omit<HandoverRecord, "id" | "handoverAt">): ActionResult<HandoverRecord> => {
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

  // UC12: Nhận trả nhiều đợt & Trả một phần
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

    if (newMaintenance.length) {
      setMaintenanceReceipts((prev) => [...newMaintenance, ...prev]);
    }

    setEquipment((prev) =>
      prev.map((e) => {
        const ri = input.returnItems.find((item) => item.equipmentId === e.id);
        if (!ri) return e;
        let nextStatus: Equipment["equipmentStatus"] = "Sẵn sàng";
        if (ri.condition === "Mất thiết bị") nextStatus = "Thất lạc";
        else if (["Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện"].includes(ri.condition)) nextStatus = "Đang bảo trì";
        return {
          ...e,
          equipmentStatus: nextStatus,
          rentCount: ri.condition === "Mất thiết bị" ? e.rentCount : e.rentCount + 1,
        };
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

  // UC13: Quản lý Quá hạn & tính phụ phí trễ
  const checkOrderOverdue = (order: Order) => {
    if (["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn", "Đã nhận trả", "Chờ đối soát"].includes(order.status)) {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }
    if (!order.returnTime) return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };

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
    const dailyRentalTotal = order.items.reduce((sum, item) => sum + item.pricePerDay * item.qty, 0);
    const surcharge = Math.round(overdueDays * dailyRentalTotal * 1.5);

    return { isOverdue: true, overdueHours: Math.round(diffHours), overdueDays, surcharge };
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
        const newStatus: OrderStatus = allReturned ? "Đã nhận trả" : o.status;
        const history = allReturned
          ? [...o.statusHistory, { status: "Đã nhận trả" as OrderStatus, at: now, by: "Nhân viên" }]
          : o.statusHistory;
        return { ...o, assignedEquipment: assigned, status: newStatus, statusHistory: history };
      })
    );
    const statusAfter: Equipment["equipmentStatus"] =
      condition === "Bình thường" || condition === "Cần vệ sinh" ? "Sẵn sàng" : "Đang bảo trì";
    setEquipment((prev) => prev.map((e) => (e.id === equipmentId ? { ...e, equipmentStatus: statusAfter, rentCount: e.rentCount + 1 } : e)));
  };

  const addSurcharge = (orderId: string, surcharge: Surcharge) =>
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, surcharges: [...o.surcharges, surcharge] } : o)));

  const approveSurcharge = (orderId: string, surchargeId: string) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) =>
                s.id === surchargeId ? { ...s, status: "Đã duyệt" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") } : s
              ),
            }
          : o
      )
    );

  const rejectSurcharge = (orderId: string, surchargeId: string) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) =>
                s.id === surchargeId ? { ...s, status: "Từ chối" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") } : s
              ),
            }
          : o
      )
    );

  const disputeSurcharge = (orderId: string, surchargeId: string, customerResponse: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) =>
                s.id === surchargeId ? { ...s, status: "Tranh chấp" as const, customerResponse: customerResponse.trim() } : s
              ),
            }
          : o
      )
    );
  };

  const resolveDisputedSurcharge = (
    orderId: string,
    surchargeId: string,
    resolution: "approved" | "rejected" | "adjusted",
    finalAmount: number,
    resolutionNote: string
  ) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) => {
                if (s.id !== surchargeId) return s;
                if (resolution === "rejected") {
                  return { ...s, amount: 0, status: "Từ chối" as const, reviewedBy: "Quản trị viên", reviewedAt: now, resolutionNote };
                }
                return {
                  ...s,
                  originalAmount: s.originalAmount || s.amount,
                  amount: finalAmount,
                  status: "Đã duyệt" as const,
                  reviewedBy: "Quản trị viên",
                  reviewedAt: now,
                  resolutionNote,
                };
              }),
            }
          : o
      )
    );
  };

  return {
    advanceOrderStatus,
    assignEquipment,
    completePreparation,
    reportEquipmentShortage,
    addContactLog,
    getOverdueConflicts,
    reportCustomerNoShow,
    approveLostEquipment,
    changeAssignedEquipment,
    createHandoverRecord,
    createReturnReceipt,
    checkOrderOverdue,
    markEquipmentReturned,
    addSurcharge,
    approveSurcharge,
    rejectSurcharge,
    disputeSurcharge,
    resolveDisputedSurcharge,
  };
}
