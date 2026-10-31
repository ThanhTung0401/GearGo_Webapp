// ─── Review Types ─────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  productName?: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
  status: "active" | "hidden";
  hiddenReason?: string;
  hiddenBy?: string;
  response?: string; // Alias tương thích review.response
  storeResponse?: {
    response: string;
    respondedAt: string;
    respondedBy: string;
  };
  verifiedRental?: boolean;
}
