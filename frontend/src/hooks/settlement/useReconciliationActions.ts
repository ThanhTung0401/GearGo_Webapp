import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type MoneyTransaction,
  type Order,
  type OrderStatus,
  type ReconciliationStatement,
  type Role,
} from "../../store";

interface Params {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  currentUser: { name: string; role: Role } | null;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/** Tính toán số liệu đối soát chung cho một đơn hàng */
function computeReconciliationNumbers(order: Order) {
  const approved = order.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);
  const priorRefund = (order.transactions || [])
    .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorCollect = (order.transactions || [])
    .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
    .reduce((s, t) => s + t.amount, 0);
  const priorSettled = priorCollect - priorRefund;
  const netDifference = order.depositTotal - approved - priorSettled;
  return { approved, priorSettled, netDifference };
}

/**
 * Nghiệp vụ xác nhận đối soát, chốt đơn không phát sinh chênh lệch và quyết toán thu/hoàn (UC5.4–UC5.6).
 */
export function useReconciliationActions({ orders, setOrders, currentUser, addAuditLog }: Params) {
  const confirmReconciliation = (orderId: string, note?: string): ActionResult<ReconciliationStatement> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng cần đối soát." };

    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) {
      return { ok: false, message: `Còn ${debt.length} thiết bị chưa nhận trả/chưa kết luận mất. Vui lòng giải quyết trước khi đối soát!` };
    }
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) {
      return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí đang chờ duyệt. Vui lòng phê duyệt hoặc từ chối trước!` };
    }
    const disputedSurcharges = order.surcharges.filter((s) => s.status === "Tranh chấp");
    if (disputedSurcharges.length > 0) {
      return { ok: false, message: `Có ${disputedSurcharges.length} phụ phí đang tranh chấp. Cần thỏa thuận xong với khách trước!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const { approved, priorSettled, netDifference } = computeReconciliationNumbers(order);

    const statement: ReconciliationStatement = {
      confirmedAt: now,
      confirmedBy: currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference,
      settlementType: netDifference === 0 ? "balanced" : netDifference > 0 ? "refund" : "collect",
      status: "confirmed",
      note: note || "Đã xác nhận căn cứ bảng đối soát cọc",
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, reconciliation: statement } : o)));
    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Xác nhận bảng đối soát (UC5.4 Bước 4)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Căn cứ: Cọc ${fmt(order.depositTotal)}, Phí duyệt: ${fmt(approved)}, Đã xử lý trước: ${fmt(priorSettled)}, Chênh lệch: ${fmt(Math.abs(netDifference))} (${netDifference > 0 ? "Phải hoàn" : netDifference < 0 ? "Phải thu" : "Cân bằng 0đ"})`,
    });

    return { ok: true, data: statement };
  };

  const finalizeOrderWithoutPayment = (orderId: string, note?: string): ActionResult => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (order.status !== "Chờ đối soát") return { ok: false, message: "Đơn hàng phải ở trạng thái Chờ đối soát." };
    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) return { ok: false, message: `Còn ${debt.length} thiết bị chưa trả` };
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí chưa duyệt` };

    const { approved, priorSettled, netDifference } = computeReconciliationNumbers(order);
    if (netDifference !== 0) {
      return { ok: false, message: `Số tiền chênh lệch là ${fmt(Math.abs(netDifference))}, không thể chốt theo luồng chênh lệch 0 đ (Dòng 5.1)!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const statement: ReconciliationStatement = {
      confirmedAt: order.reconciliation?.confirmedAt || now,
      confirmedBy: order.reconciliation?.confirmedBy || currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference: 0,
      settlementType: "balanced",
      status: "locked",
      lockedAt: now,
      lockedBy: currentUser?.name || "Nhân viên",
      note: note || "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)",
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Hoàn tất",
              reconciledAt: now,
              reconciliation: statement,
              statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
            }
          : o
      )
    );
    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Khóa đối soát & Hoàn tất đơn (UC5.4 Bước 5.1/6/7)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Khóa đối soát chênh lệch 0 đ - Chuyển Hoàn tất đơn ${orderId}`,
    });

    return { ok: true, data: undefined };
  };

  const settleOrder = (orderId: string, succeed = true, details?: { method?: string; note?: string; amount?: number }) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId || o.status !== "Chờ đối soát") return o;
        const { approved, priorSettled, netDifference: difference } = computeReconciliationNumbers(o);
        const amount = details?.amount ?? Math.abs(difference);
        const defaultNote = succeed ? (difference >= 0 ? "Hoàn cọc thành công" : "Thu thêm thành công") : "Giao dịch đối soát thất bại";
        const fullNote = details?.note || (details?.method ? `${defaultNote} qua ${details.method}` : defaultNote);
        const transaction: MoneyTransaction = {
          id: `GD-${Date.now()}`,
          type: difference >= 0 ? "Hoàn cọc" : "Thu thêm",
          amount,
          status: succeed ? "Thành công" : "Thất bại",
          createdAt: now,
          completedAt: now,
          note: fullNote,
        };

        if (succeed) {
          addAuditLog({
            actor: currentUser?.name || "Nhân viên",
            role: currentUser?.role || "staff",
            action: difference >= 0 ? "Hoàn cọc đối soát (UC5.6)" : "Thu thêm đối soát (UC5.5)",
            targetEntity: "Order",
            targetId: orderId,
            detail: `${fullNote} - Số tiền: ${fmt(amount)}`,
          });
        }

        const updatedStatement: ReconciliationStatement = {
          ...(o.reconciliation || {
            confirmedAt: now,
            confirmedBy: currentUser?.name || "Nhân viên",
            depositCollected: o.depositTotal,
            totalApprovedSurcharges: approved,
            totalPriorSettlements: priorSettled,
            netDifference: difference,
            settlementType: difference >= 0 ? "refund" : "collect",
          }),
          status: succeed ? "locked" : o.reconciliation?.status || "confirmed",
          lockedAt: succeed ? now : undefined,
          lockedBy: succeed ? currentUser?.name || "Nhân viên" : undefined,
        };

        return succeed
          ? {
              ...o,
              status: "Hoàn tất",
              reconciledAt: now,
              reconciliation: updatedStatement,
              transactions: [...(o.transactions ?? []), transaction],
              statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
            }
          : { ...o, reconciliation: updatedStatement, transactions: [...(o.transactions ?? []), transaction] };
      })
    );
  };

  return { confirmReconciliation, finalizeOrderWithoutPayment, settleOrder };
}
