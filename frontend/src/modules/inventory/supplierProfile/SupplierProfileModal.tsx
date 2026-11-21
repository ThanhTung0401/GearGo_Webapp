import type { useApp } from "../../../App";
import { fmt, type Supplier } from "../../../store";
import { useSupplierProfile } from "./useSupplierProfile";
import SupplierTabsSection from "./SupplierTabsSection";
import SupplierStatusSubModal from "./SupplierStatusSubModal";

interface Props {
  supplier: Supplier;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onOpenReceipt?: (receiptId: string) => void;
}

/**
 * UC7.3 & UC7.4: Hồ sơ chi tiết nhà cung cấp & Thay đổi tình trạng hợp tác.
 */
export default function SupplierProfileModal({ supplier, app, onClose, onOpenReceipt }: Props) {
  const vm = useSupplierProfile(supplier, app);
  const isActive = supplier.cooperationStatus === "active";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-[850px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="m-0 text-xl font-bold text-[var(--color-bark,#1F2937)] font-[family-name:var(--font-display)]">
                  {supplier.name}
                </h3>
                <span className="font-mono text-sm text-gray-500">({supplier.displayCode})</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {isActive ? "Đang hợp tác" : "Ngừng hợp tác"}
                </span>
              </div>
              <p className="mt-0.5 mb-0 text-xs text-gray-500">
                Hồ sơ đối tác cung ứng, sản phẩm từng nhập và lịch sử chứng từ (UC7.3 & UC7.4)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="bg-transparent border-0 text-2xl cursor-pointer text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto grid gap-4">
          {vm.statusError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">
              {vm.statusError}
            </div>
          )}
          {vm.statusSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-xs font-semibold">
              {vm.statusSuccess}
            </div>
          )}
          {vm.loadingHistory && (
            <div className="text-xs text-gray-500">Đang tải lịch sử nhập kho thực tế của nhà cung cấp...</div>
          )}

          {/* Thông tin đối tác */}
          <div className="border border-[var(--color-bone,#E5E7EB)] rounded-xl p-4 bg-white">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-bold text-[var(--color-bark,#1F2937)] m-0">
                📋 Thông tin liên hệ & Pháp lý
              </h4>
              <button
                type="button"
                onClick={vm.openStatusModal}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border ${
                  isActive
                    ? "bg-red-50 border-red-300 text-red-600"
                    : "bg-green-50 border-green-300 text-green-700"
                }`}
              >
                🔄 {isActive ? "Ngừng hợp tác (UC7.4)" : "Kích hoạt lại hợp tác"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-gray-500 block">Người liên hệ:</span><strong>{supplier.contactPerson}</strong></div>
              <div><span className="text-gray-500 block">Điện thoại:</span><strong>{supplier.phone}</strong></div>
              <div><span className="text-gray-500 block">Email:</span><strong>{supplier.email || "—"}</strong></div>
              <div><span className="text-gray-500 block">Mã số thuế:</span><strong className="font-mono">{supplier.taxCode || "—"}</strong></div>
              <div className="col-span-2"><span className="text-gray-500 block">Địa chỉ:</span><span>{supplier.address || "—"}</span></div>
              <div className="col-span-2"><span className="text-gray-500 block">Ghi chú đối tác:</span><span className="italic">{supplier.note || "—"}</span></div>
            </div>

            {supplier.statusReason && (
              <div className="mt-2.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs text-red-800">
                <strong>Lý do trạng thái:</strong> {supplier.statusReason}
              </div>
            )}
          </div>

          {/* Thống kê lũy kế */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[var(--color-parchment,#F5F1E9)] rounded-xl px-4 py-3 border border-[var(--color-bone,#E5E7EB)]">
              <span className="text-xs text-gray-500 block">Tổng giá trị nhập chốt</span>
              <strong className="text-lg text-[var(--color-forest,#15803D)]">{fmt(vm.totalImportValue)}</strong>
              <div className="text-[0.68rem] text-gray-400 mt-0.5">* Chỉ tính phiếu Đã nhập kho</div>
            </div>
            <div className="bg-[var(--color-parchment,#F5F1E9)] rounded-xl px-4 py-3 border border-[var(--color-bone,#E5E7EB)]">
              <span className="text-xs text-gray-500 block">Thiết bị chấp nhận nhập</span>
              <strong className="text-lg text-[var(--color-bark,#1F2937)]">{vm.totalEquipmentAccepted} thiết bị</strong>
              <div className="text-[0.68rem] text-gray-400 mt-0.5">Đã gắn mã barcode / serial</div>
            </div>
            <div className="bg-[var(--color-parchment,#F5F1E9)] rounded-xl px-4 py-3 border border-[var(--color-bone,#E5E7EB)]">
              <span className="text-xs text-gray-500 block">Tổng số phiếu nhập</span>
              <strong className="text-lg text-[var(--color-amber,#D97706)]">
                {vm.confirmedReceipts.length} đã chốt / {vm.supplierReceipts.length} tổng
              </strong>
              <div className="text-[0.68rem] text-gray-400 mt-0.5">Không cộng nháp/hủy vào công nợ</div>
            </div>
          </div>

          <SupplierTabsSection
            activeTab={vm.activeTab}
            onChangeTab={vm.setActiveTab}
            importedProducts={vm.importedProducts}
            supplierReceipts={vm.supplierReceipts}
            onOpenReceipt={onOpenReceipt}
            onClose={onClose}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--color-bone,#E5E7EB)] flex justify-end bg-[var(--color-cream,#FAFAF9)]">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[var(--color-bone,#E5E7EB)] px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer"
          >
            Đóng hồ sơ
          </button>
        </div>

        {vm.showStatusModal && (
          <SupplierStatusSubModal
            newStatus={vm.newStatus}
            statusReason={vm.statusReason}
            busy={vm.statusBusy}
            onChangeStatus={vm.setNewStatus}
            onChangeReason={vm.setStatusReason}
            onCancel={() => vm.setShowStatusModal(false)}
            onSubmit={vm.handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}
