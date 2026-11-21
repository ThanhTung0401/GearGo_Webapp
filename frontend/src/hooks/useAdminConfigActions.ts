import type { Dispatch, SetStateAction } from "react";
import type {
  AppNotification,
  AuditLogEntry,
  CustomerAccount,
  FinancialAdjustment,
  PolicyVersion,
  Promotion,
  RentalPolicyConfig,
  Role,
  StaffAccount,
} from "../store";
import { useAccountsAndNotifActions } from "./adminConfig/useAccountsAndNotifActions";
import { usePolicyPromoFinanceActions } from "./adminConfig/usePolicyPromoFinanceActions";

interface UseAdminConfigActionsParams {
  role: Role;
  staffAccounts: StaffAccount[];
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  customers: CustomerAccount[];
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  policies: RentalPolicyConfig;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setPolicyVersions: Dispatch<SetStateAction<PolicyVersion[]>>;
  promotions: Promotion[];
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
}

/**
 * Facade ghép nghiệp vụ tài khoản/thông báo và chính sách/khuyến mãi/điều chỉnh tài chính.
 */
export function useAdminConfigActions(params: UseAdminConfigActionsParams) {
  const accountsNotif = useAccountsAndNotifActions(params);
  const policyPromoFinance = usePolicyPromoFinanceActions({
    ...params,
    addAuditLog: accountsNotif.addAuditLog,
  });

  return { ...accountsNotif, ...policyPromoFinance };
}
