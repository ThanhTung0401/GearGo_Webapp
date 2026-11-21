import type { Dispatch, SetStateAction } from "react";
import type { ActionResult, AppNotification, Equipment, MaintenanceReceipt, Order } from "../store";
import { usePreparationHandoverActions } from "./handoverReturn/usePreparationHandoverActions";
import { useReturnOverdueActions } from "./handoverReturn/useReturnOverdueActions";
import { useSurchargeActions } from "./handoverReturn/useSurchargeActions";

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
 * Facade ghép 3 sub-hooks: Chuẩn bị/Bàn giao, Nhận trả/Quá hạn và Phụ phí.
 */
export function useHandoverReturnActions(params: UseHandoverReturnActionsParams) {
  const prepHandover = usePreparationHandoverActions(params);
  const returnOverdue = useReturnOverdueActions(params);
  const surcharges = useSurchargeActions(params.setOrders);

  return { ...prepHandover, ...returnOverdue, ...surcharges };
}
