import { useApp } from "../../context/AppContext";
import { fmt } from "../../store";
import { calculateReceiptTotal, useInventoryTab } from "./inventory/useInventoryTab";
import { InventoryToolbar } from "./inventory/InventoryToolbar";
import { InventoryReceiptDetail } from "./inventory/InventoryReceiptDetail";
import { InventoryActionModals } from "./inventory/InventoryActionModals";
import Pagination from "../../components/ui/Pagination";
import { usePagination } from "../../hooks/usePagination";

/**
 * Tab quản lý Phiếu nhập hàng (UC7.6 - UC7.10).
 */
export function InventoryTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useInventoryTab(app);
  const paging = usePagination(vm.filteredReceipts, 6);

  return (
    <div>
      <InventoryToolbar
        message={vm.message}
        searchQuery={vm.searchQuery}
        setSearchQuery={vm.setSearchQuery}
        supplierFilter={vm.supplierFilter}
        setSupplierFilter={vm.setSupplierFilter}
        statusFilter={vm.statusFilter}
        setStatusFilter={vm.setStatusFilter}
        fromDate={vm.fromDate}
        setFromDate={vm.setFromDate}
        toDate={vm.toDate}
        setToDate={vm.setToDate}
        supplierOptions={vm.supplierOptions}
        statusOptions={vm.statusOptions}
        onCreateNew={() => vm.setEditing("new")}
        onClearFilters={vm.clearFilters}
      />

      <div className="responsive-two-column adm-inventory-grid">
        <div className="flex flex-col gap-3">
          {paging.pagedItems.map((receipt) => {
            const quantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
            const pillClass = receipt.status === "Đã nhập kho" ? "is-success" : receipt.status === "Đã hủy" ? "is-neutral" : "is-warning";
            return (
              <button
                key={receipt.id}
                onClick={() => { vm.setSelectedId(receipt.id); vm.setMessage(null); }}
                className={`adm-receipt-card ${vm.selectedId === receipt.id ? "is-selected" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="adm-cell-code">{receipt.displayCode ?? receipt.id}</span>
                  <span className={`adm-pill adm-pill--round adm-pill--xs ${pillClass}`}>
                    {receipt.status}
                  </span>
                  {receipt.adjustments && receipt.adjustments.length > 0 && (
                    <span className="adm-pill is-warning adm-pill--xs">
                      ⚡ {receipt.adjustments.filter((a) => a.status === "Chờ duyệt").length > 0 ? "Chờ duyệt điều chỉnh" : "Đã có điều chỉnh"}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-[0.86rem]">{receipt.supplierName}</div>
                <div className="adm-hint-text mt-1">{receipt.lines.length} loại · {quantity} thiết bị · {receipt.createdBy}</div>
                <div className="font-bold mt-2">{fmt(calculateReceiptTotal(receipt))}</div>
              </button>
            );
          })}
          {vm.filteredReceipts.length === 0 && (
            <div className="adm-empty-box p-6">
              Không tìm thấy phiếu nhập nào phù hợp tiêu chí lọc.
            </div>
          )}
          <Pagination
            page={paging.page}
            totalPages={paging.totalPages}
            totalItems={paging.totalItems}
            startIndex={paging.startIndex}
            endIndex={paging.endIndex}
            onPageChange={paging.setPage}
            itemLabel="phiếu nhập"
          />
        </div>

        {vm.selected && (
          <InventoryReceiptDetail
            selected={vm.selected}
            products={app.products}
            isRealApi={vm.isRealApi}
            serverAdjustments={vm.serverAdjustments}
            adjLoadingId={vm.adjLoadingId}
            onEditDraft={(r) => vm.setEditing(r)}
            onCancelDraft={(r) => {
              vm.setCancellingReceipt(r);
              vm.setCancelReason("");
              vm.setCancelError("");
            }}
            onInspectReceipt={(r) => vm.setInspectingReceipt(r)}
            onOpenAdjustmentModal={(r) => vm.setAdjustingReceipt(r)}
            onApproveAdjustment={(receiptId, adj) => void vm.handleApproveAdjustment(receiptId, adj)}
            onRejectAdjustment={(receiptId, adjId) => {
              vm.setRejectingAdj({ receiptId, adjId });
              vm.setRejectAdjReason("");
            }}
          />
        )}
      </div>

      <InventoryActionModals
        app={app}
        editing={vm.editing}
        setEditing={vm.setEditing}
        cancellingReceipt={vm.cancellingReceipt}
        setCancellingReceipt={vm.setCancellingReceipt}
        cancelReason={vm.cancelReason}
        setCancelReason={vm.setCancelReason}
        cancelError={vm.cancelError}
        cancelLoading={vm.cancelLoading}
        onCancelSubmit={(e) => void vm.handleCancelSubmit(e)}
        rejectingAdj={vm.rejectingAdj}
        setRejectingAdj={vm.setRejectingAdj}
        rejectAdjReason={vm.rejectAdjReason}
        setRejectAdjReason={vm.setRejectAdjReason}
        adjLoadingId={vm.adjLoadingId}
        onRejectAdjSubmit={(e) => void vm.handleRejectAdjSubmit(e)}
        inspectingReceipt={vm.inspectingReceipt}
        setInspectingReceipt={vm.setInspectingReceipt}
        adjustingReceipt={vm.adjustingReceipt}
        setAdjustingReceipt={vm.setAdjustingReceipt}
        onInspectSuccess={() => {
          vm.setInspectingReceipt(null);
          vm.setMessage({ type: "success", text: "Đã hoàn tất kiểm nhận hàng và nhập kho thành công (UC7.7)!" });
        }}
        onAdjustSuccess={(receiptId) => {
          vm.setAdjustingReceipt(null);
          void vm.loadServerReceiptAdjustments(receiptId);
          vm.setMessage({ type: "success", text: "Đã gửi đề nghị điều chỉnh phiếu nhập sau chốt thành công. Đang ở trạng thái Chờ duyệt (UC7.10)." });
        }}
      />
    </div>
  );
}
