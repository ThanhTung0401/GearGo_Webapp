import type { Dispatch, SetStateAction } from "react";
import type { Order, Product, PromotionUsage, Review, Role } from "../store";
import { useReconciliationActions } from "./settlement/useReconciliationActions";
import { useCancelAndReviewActions } from "./settlement/useCancelAndReviewActions";

interface UseOrderSettlementActionsParams {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  reviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  currentUser: { name: string; role: Role } | null;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
}

/**
 * Facade ghép nghiệp vụ đối soát quyết toán và hủy đơn / đánh giá sản phẩm.
 */
export function useOrderSettlementActions(params: UseOrderSettlementActionsParams) {
  const reconciliation = useReconciliationActions(params);
  const cancelAndReview = useCancelAndReviewActions(params);

  return { ...reconciliation, ...cancelAndReview };
}
