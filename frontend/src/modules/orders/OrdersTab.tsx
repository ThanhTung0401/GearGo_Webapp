import { useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { type StaffTab } from "./returnMapping";
import { useOrdersTab } from "./staffOrders/useOrdersTab";
import { OrdersTable } from "./staffOrders/OrdersTable";
import { OrderDetailModal } from "./staffOrders/OrderDetailModal";
import { OrderNoShowModal } from "./staffOrders/OrderNoShowModal";

// Tab Quản lý danh sách đơn thuê trong ca trực (UC4.5)
export function OrdersTab({
  app,
  selectedOrderId,
  setSelectedOrderId,
  openOrder,
  hydrateOperationalOrder,
}: {
  app: ReturnType<typeof useApp>;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  openOrder: (id: string, tab: StaffTab) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const state = useOrdersTab(app, hydrateOperationalOrder);

  // Tự động mở modal chi tiết khi điều hướng từ Báo cáo / Nhật ký kèm selectedOrderId
  useEffect(() => {
    if (!selectedOrderId) return;
    state.setViewingDetailOrderId(selectedOrderId);
    void hydrateOperationalOrder(selectedOrderId);
  }, [selectedOrderId]);

  const handleCloseDetail = () => {
    state.setViewingDetailOrderId(null);
    if (selectedOrderId) setSelectedOrderId(null);
  };

  return (
    <div>
      <OrdersTable
        app={app}
        search={state.search}
        setSearch={state.setSearch}
        filter={state.filter}
        setFilter={state.setFilter}
        quickFilter={state.quickFilter}
        setQuickFilter={state.setQuickFilter}
        deliveryTodayCount={state.deliveryTodayCount}
        pickupTodayCount={state.pickupTodayCount}
        overdueCount={state.overdueCount}
        partialCount={state.partialCount}
        filtered={state.filtered}
        openOrder={openOrder}
        handleOpenDetail={state.handleOpenDetail}
        handleOpenNoShow={state.handleOpenNoShow}
      />

      {state.viewingDetailOrder && (
        <OrderDetailModal
          order={state.viewingDetailOrder}
          onClose={handleCloseDetail}
          openOrder={openOrder}
        />
      )}

      {state.noShowTarget && (
        <OrderNoShowModal
          order={state.noShowTarget}
          noShowPreview={state.noShowPreview}
          noShowNote={state.noShowNote}
          setNoShowNote={state.setNoShowNote}
          noShowError={state.noShowError}
          noShowSubmitting={state.noShowSubmitting}
          onClose={() => state.setNoShowTarget(null)}
          onSubmit={state.handleSubmitNoShow}
        />
      )}
    </div>
  );
}
