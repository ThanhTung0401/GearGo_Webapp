// ─── Product & Category Types ────────────────────────────────────────────────

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  displayOrder: number;
  status: "active" | "inactive";
}

export interface Product {
  id: string;
  displayCode?: string;
  categoryId?: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  capacity: string;
  dimensions?: string;
  specifications?: Record<string, string>;
  pricePerDay: number;
  deposit: number;
  compensation: number;
  image: string;
  images?: string[];
  status: "active" | "inactive";
  rating: number;
  reviews: number;
}

export interface CartItem {
  productId: string;
  qty: number;
}
