import { useApp } from "../../context/AppContext";
import { useCustomersTab } from "./customers/useCustomersTab";
import { CustomersTable } from "./customers/CustomersTable";
import { CustomerModals } from "./customers/CustomerModals";

/**
 * Tab Quản lý tài khoản khách hàng (UC1.13).
 */
export function CustomersTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useCustomersTab(app);

  return (
    <div>
      <CustomersTable
        totalCount={vm.totalCount}
        apiError={vm.apiError}
        searchQuery={vm.searchQuery}
        setSearchQuery={vm.setSearchQuery}
        statusFilter={vm.statusFilter}
        setStatusFilter={vm.setStatusFilter}
        loading={vm.loading}
        filtered={vm.filtered}
        onViewOrders={vm.setSelectedCustomer}
        onRequestLock={(c) => {
          vm.setLockModalCustomer(c);
          vm.setLockReason("");
        }}
        onUnlock={(c) => void vm.handleUnlockCustomer(c)}
      />

      <CustomerModals
        selectedCustomer={vm.selectedCustomer}
        customerOrders={vm.customerOrders}
        onCloseOrders={() => vm.setSelectedCustomer(null)}
        lockModalCustomer={vm.lockModalCustomer}
        lockReason={vm.lockReason}
        setLockReason={vm.setLockReason}
        lockError={vm.lockError}
        actionLoading={vm.actionLoading}
        onCloseLock={() => {
          vm.setLockModalCustomer(null);
          vm.setLockError("");
        }}
        onConfirmLock={() => void vm.handleConfirmLock()}
      />
    </div>
  );
}
