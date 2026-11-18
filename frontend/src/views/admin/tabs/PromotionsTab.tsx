import { useApp } from "../../../context/AppContext";
import { usePromotionsTab } from "./promotions/usePromotionsTab";
import { PromotionsList } from "./promotions/PromotionsList";
import { PromotionModals } from "./promotions/PromotionModals";

/**
 * Tab Quản lý chính sách khuyến mãi (UC8.2 - UC8.5).
 */
export function PromotionsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = usePromotionsTab(app);

  return (
    <div>
      <PromotionsList
        totalPromotions={app.promotions.length}
        promoActionError={vm.promoActionError}
        promoSearch={vm.promoSearch}
        setPromoSearch={vm.setPromoSearch}
        statusFilter={vm.statusFilter}
        setStatusFilter={vm.setStatusFilter}
        typeFilter={vm.typeFilter}
        setTypeFilter={vm.setTypeFilter}
        filteredPromotions={vm.filteredPromotions}
        now={vm.now}
        togglingPromoId={vm.togglingPromoId}
        onCreateNew={() => vm.setAction("new")}
        onViewDetail={vm.setSelectedPromoDetail}
        onEdit={(p) => vm.setAction(p)}
        onToggleStatus={(p) => void vm.handleToggleStatus(p)}
      />

      <PromotionModals
        app={app}
        action={vm.action}
        setAction={vm.setAction}
        selectedPromoDetail={vm.selectedPromoDetail}
        setSelectedPromoDetail={vm.setSelectedPromoDetail}
        stoppingPromo={vm.stoppingPromo}
        setStoppingPromo={vm.setStoppingPromo}
        stopReason={vm.stopReason}
        setStopReason={vm.setStopReason}
        stopError={vm.stopError}
        stopLoading={vm.stopLoading}
        onPauseSubmit={(e) => void vm.handlePauseSubmit(e)}
        onToggleStatus={(p) => void vm.handleToggleStatus(p)}
      />
    </div>
  );
}
