import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../../context";
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EQUIPMENT,
  INITIAL_FINANCIAL_ADJUSTMENTS,
  INITIAL_IMPORT_RECEIPTS,
  INITIAL_MAINTENANCE_RECEIPTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_POLICIES,
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_REVIEWS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_SUPPLIERS,
  type AppNotification,
  type AuditLogEntry,
  type CartItem,
  type Category,
  type CustomerAccount,
  type Equipment,
  type FinancialAdjustment,
  type ImportReceipt,
  type MaintenanceReceipt,
  type Order,
  type Product,
  type Promotion,
  type PromotionUsage,
  type RentalPolicyConfig,
  type Review,
  type Role,
  type StaffAccount,
  type StockAdjustmentReceipt,
  type Supplier,
} from "../../store";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "../appStateStorage";

export interface ResetDemoParams {
  setRole: Dispatch<SetStateAction<Role>>;
  setPage: Dispatch<SetStateAction<Page>>;
  setCurrentUser: Dispatch<SetStateAction<any>>;
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setPickupDate: Dispatch<SetStateAction<string>>;
  setReturnDate: Dispatch<SetStateAction<string>>;
  setNewOrderId: Dispatch<SetStateAction<string | null>>;
  setAppliedPromoCode: Dispatch<SetStateAction<string>>;
}

/**
 * Khôi phục toàn bộ dữ liệu demo cục bộ về trạng thái ban đầu.
 */
export function useResetDemoAction(p: ResetDemoParams) {
  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    p.setCategories(INITIAL_CATEGORIES);
    p.setProducts(
      INITIAL_PRODUCTS.map((product) => ({
        ...product,
        displayCode: product.id,
        categoryId: INITIAL_CATEGORIES.find((category) => category.name === product.category)?.id,
        dimensions: "",
        specifications: {},
        images: [product.image].filter(Boolean),
      }))
    );
    p.setSuppliers(INITIAL_SUPPLIERS);
    p.setPromotions(INITIAL_PROMOTIONS);
    p.setPromotionUsages([]);
    p.setEquipment(
      INITIAL_EQUIPMENT.map((item) => {
        const receipt = INITIAL_IMPORT_RECEIPTS.find((entry) => entry.id === item.importReceiptId);
        const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
        return {
          ...item,
          displayCode: item.id,
          importReceiptLineId: index >= 0 ? `${receipt?.id}-LINE-${index + 1}` : undefined,
          includedAccessories: [],
          note: "",
        };
      })
    );
    p.setOrders(INITIAL_ORDERS);
    p.setMaintenanceReceipts(INITIAL_MAINTENANCE_RECEIPTS);
    p.setStaffAccounts(INITIAL_STAFF_ACCOUNTS);
    p.setStockAdjustments(INITIAL_STOCK_ADJUSTMENTS);
    p.setCustomers(INITIAL_CUSTOMERS);
    p.setNotifications(INITIAL_NOTIFICATIONS);
    p.setPolicies(INITIAL_POLICIES);
    p.setAuditLogs(INITIAL_AUDIT_LOGS);
    p.setFinancialAdjustments(INITIAL_FINANCIAL_ADJUSTMENTS);
    p.setCurrentUser({ name: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0901 234 567", role: "customer" });
    p.setCart([]);
    p.setImportReceipts(
      INITIAL_IMPORT_RECEIPTS.map((receipt) => ({
        ...receipt,
        displayCode: receipt.id,
        supplierId: INITIAL_SUPPLIERS.find((supplier) => supplier.displayCode === receipt.supplierId)?.id ?? receipt.supplierId,
        lines: receipt.lines.map((line, index) => ({
          ...line,
          id: `${receipt.id}-LINE-${index + 1}`,
          receivingCondition: "Mới",
          note: "",
        })),
      }))
    );
    p.setReviews(INITIAL_REVIEWS);
    p.setPickupDate("");
    p.setReturnDate("");
    p.setNewOrderId(null);
    p.setAppliedPromoCode("");
    p.setPage("landing");
    p.setRole("customer");
  };

  return { resetDemo };
}
