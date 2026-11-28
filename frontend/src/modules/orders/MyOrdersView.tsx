import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { MyOrdersModals } from "./MyOrdersModals";
import { ORDER_STATUS_OPTIONS, useMyOrders } from "./orders/useMyOrders";
import { OrderCardItem } from "./orders/OrderCardItem";
import { OrderDetailPanel } from "./orders/OrderDetailPanel";

/**
 * Trang quản lý Đơn thuê của tôi (UC3.3, UC3.4, UC4.2, UC4.3, UC5.2, UC5.4, UC5.5).
 */
export function MyOrdersView() {
  const vm = useMyOrders();
  const { app, detail } = vm;
  const paging = usePagination(vm.myOrders, 5);
  const holdMinutes = app.policies?.holdMinutes ?? 15;

  return (
    <div className="customer-container cp-container cp-container--1100">
      <div className="customer-page-header cp-page-header">
        <h1 className="customer-page-title">Đơn thuê của tôi (UC3.3)</h1>
        <p className="text-sm text-gray-500">
          Theo dõi tiến độ đơn, thời gian giữ chỗ {holdMinutes} phút, tra cứu biên bản bàn giao BBBG, phiếu nhận trả PNT và bảng đối soát cọc.
        </p>
      </div>

      {/* Tabs lọc trạng thái đơn hàng (UC3.3) */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {ORDER_STATUS_OPTIONS.map((st) => {
          const count = st === "Tất cả"
            ? app.orders.length
            : st === "Hết hạn"
            ? app.orders.filter((o) => o.status === "Hết hạn" || (o.status as string) === "Hết hạn thanh toán").length
            : st === "Đã hủy"
            ? app.orders.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length
            : app.orders.filter((o) => o.status === st).length;
          return (
            <button
              key={st}
              onClick={() => vm.setStatusTab(st)}
              className={`cp-status-tab ${vm.statusTab === st ? "is-active" : ""}`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Thanh tìm kiếm đơn thuê theo mã đơn hoặc tên thiết bị */}
      <div className="mb-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-[460px]">
          <input
            type="search"
            value={vm.searchQuery}
            onChange={(e) => {
              vm.setSearchQuery(e.target.value);
              paging.setPage(1);
            }}
            placeholder="🔍 Tìm theo mã đơn (VD: ORD-202611..., DH...) hoặc tên thiết bị..."
            className="form-input w-full pr-8"
            aria-label="Tìm kiếm đơn thuê"
          />
          {vm.searchQuery && (
            <button
              type="button"
              onClick={() => {
                vm.setSearchQuery("");
                paging.setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bố cục tách 2 cột khi đã chọn 1 đơn để xem chi tiết */}
      <div className={`responsive-detail-grid grid gap-6 cp-orders-grid ${detail ? "has-detail" : ""}`}>
        {/* Cột danh sách các đơn */}
        <div className="flex flex-col gap-3">
          {vm.myOrders.length === 0 ? (
            <div className="card-panel text-center py-12 text-gray-500 text-sm cp-card cp-card--empty">
              {vm.searchQuery.trim()
                ? `Không tìm thấy đơn thuê khớp với "${vm.searchQuery.trim()}".`
                : `Không có đơn thuê nào ở trạng thái "${vm.statusTab}".`}
            </div>
          ) : (
            <>
              {paging.pagedItems.map((o) => (
                <OrderCardItem
                  key={o.id}
                  order={o}
                  isSelected={vm.selected === o.id}
                  onSelect={(id) => void vm.handleSelectOrder(id)}
                  onContinuePayment={(id) => {
                    app.setNewOrderId(id);
                    app.setPage("order-confirmed");
                  }}
                />
              ))}
              <Pagination
                page={paging.page}
                totalPages={paging.totalPages}
                totalItems={paging.totalItems}
                startIndex={paging.startIndex}
                endIndex={paging.endIndex}
                onPageChange={paging.setPage}
                itemLabel="đơn thuê"
              />
            </>
          )}
        </div>

        {/* Panel Chi tiết đơn thuê (UC3.3) */}
        {detail && (
          <OrderDetailPanel
            detail={detail}
            realApi={Boolean(app.realApi)}
            loadingDetail={vm.loadingDetail}
            actionError={vm.actionError}
            showInlineError={!vm.cancelling && !vm.disputeSurchargeTarget}
            rawOrderDetail={vm.rawOrderDetail}
            orderHandovers={vm.orderHandovers}
            orderPolicy={vm.orderPolicy}
            extraPayBusy={vm.extraPayBusy}
            extraPayStatus={vm.extraPayStatus}
            onClose={() => vm.setSelected(null)}
            onStartDispute={(sc) => {
              vm.setDisputeSurchargeTarget(sc);
              vm.setDisputeReason("");
            }}
            onPayNow={(id) => {
              app.setNewOrderId(id);
              app.setPage("order-confirmed");
            }}
            onViewRecord={vm.setViewingRecord}
            onExtraPay={vm.handleExtraPay}
            onCheckExtraPayStatus={vm.handleCheckExtraPayStatus}
            onGoToReviewQuick={() => {
              sessionStorage.setItem("geargo_profile_section", "reviews");
              sessionStorage.setItem("geargo_review_order_id", String(detail.backendId ?? detail.id));
              vm.setSelected(null);
              app.setPage("profile");
            }}
            onGoToProfile={() => {
              sessionStorage.setItem("geargo_profile_section", "reviews");
              sessionStorage.setItem("geargo_review_order_id", String(detail.backendId ?? detail.id));
              vm.setSelected(null);
              app.setPage("profile");
            }}
            onOpenCancel={vm.handleOpenCancel}
          />
        )}
      </div>

      <MyOrdersModals
        app={app}
        detail={detail}
        disputeSurchargeTarget={vm.disputeSurchargeTarget}
        setDisputeSurchargeTarget={vm.setDisputeSurchargeTarget}
        disputeReason={vm.disputeReason}
        setDisputeReason={vm.setDisputeReason}
        disputeSubmitting={vm.disputeSubmitting}
        setDisputeSubmitting={vm.setDisputeSubmitting}
        actionError={vm.actionError}
        setActionError={vm.setActionError}
        refreshOrderById={vm.refreshOrderById}
        viewingRecord={vm.viewingRecord}
        setViewingRecord={vm.setViewingRecord}
        cancelling={vm.cancelling}
        setCancelling={vm.setCancelling}
        cancellingOrder={vm.cancellingOrder}
        cancelPreview={vm.cancelPreview}
        localCancellationQuote={vm.localCancellationQuote}
        cancelPreviewLoading={vm.cancelPreviewLoading}
        cancelReason={vm.cancelReason}
        setCancelReason={vm.setCancelReason}
        cancelSubmitting={vm.cancelSubmitting}
        handleConfirmCancel={vm.handleConfirmCancel}
      />
    </div>
  );
}
