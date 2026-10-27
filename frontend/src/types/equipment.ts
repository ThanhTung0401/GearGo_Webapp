// ─── Equipment Types ─────────────────────────────────────────────────────────

import type { EquipmentStatus } from "./common";

export interface Equipment {
  id: string;
  displayCode?: string;
  importReceiptLineId?: string;
  productId: string; // current product assignment (can be reassigned)
  originalProductId: string; // source from import
  importReceiptId: string;
  importDate: string;
  importPrice: number;
  condition: string;
  includedAccessories?: string[];
  note?: string;
  equipmentStatus: EquipmentStatus;
  rentCount: number;
}
