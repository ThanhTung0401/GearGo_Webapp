import type { Dispatch, SetStateAction } from "react";
import type {
  Equipment,
  ImportReceipt,
  MaintenanceReceipt,
  Order,
  Product,
  StockAdjustmentReceipt,
  Supplier,
} from "../store";
import { useImportReceiptActions, type InventoryAuditLogger } from "./inventory/useImportReceiptActions";
import { useImportAdjustmentActions } from "./inventory/useImportAdjustmentActions";
import { useMaintenanceAndStockActions } from "./inventory/useMaintenanceAndStockActions";

interface UseInventoryActionsParams {
  products: Product[];
  suppliers: Supplier[];
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  orders: Order[];
  importReceipts: ImportReceipt[];
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  maintenanceReceipts: MaintenanceReceipt[];
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  stockAdjustments: StockAdjustmentReceipt[];
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  addAuditLog: InventoryAuditLogger;
}

/**
 * Facade ghép 3 sub-hooks kho: Phiếu nhập, Điều chỉnh phiếu nhập và Bảo trì/Kiểm kê.
 */
export function useInventoryActions(params: UseInventoryActionsParams) {
  const importReceipt = useImportReceiptActions(params);
  const importAdjustment = useImportAdjustmentActions(params);
  const maintenanceStock = useMaintenanceAndStockActions(params);

  return { ...importReceipt, ...importAdjustment, ...maintenanceStock };
}
