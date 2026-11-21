import type { Dispatch, SetStateAction } from "react";
import type { Order, Surcharge } from "../../store";

/**
 * Nghiệp vụ Phụ phí & Tranh chấp phụ phí trên đơn thuê (UC5.1).
 */
export function useSurchargeActions(setOrders: Dispatch<SetStateAction<Order[]>>) {
  const addSurcharge = (orderId: string, surcharge: Surcharge) =>
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, surcharges: [...o.surcharges, surcharge] } : o)));

  const approveSurcharge = (orderId: string, surchargeId: string) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) =>
                s.id === surchargeId
                  ? { ...s, status: "Đã duyệt" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") }
                  : s
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
                s.id === surchargeId
                  ? { ...s, status: "Từ chối" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") }
                  : s
              ),
            }
          : o
      )
    );

  const disputeSurcharge = (orderId: string, surchargeId: string, customerResponse: string) =>
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

  return { addSurcharge, approveSurcharge, rejectSurcharge, disputeSurcharge, resolveDisputedSurcharge };
}
