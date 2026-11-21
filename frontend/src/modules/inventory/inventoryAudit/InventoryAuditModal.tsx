import type { useApp } from "../../../App";
import { formatDateTimeVi } from "../../../utils";
import { useInventoryAudit } from "./useInventoryAudit";
import AuditRentedTab from "./AuditRentedTab";
import AuditWarehouseTab from "./AuditWarehouseTab";

interface Props {
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onAuditSubmitted?: (receiptId: string) => void;
}

/**
 * UC6.10: Kiểm kê kho & lập đề nghị điều chỉnh (Chờ duyệt).
 */
export default function InventoryAuditModal({ app, onClose, onAuditSubmitted }: Props) {
  const vm = useInventoryAudit(app, onClose, onAuditSubmitted);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-[900px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="m-0 text-lg font-bold text-[var(--color-bark,#1F2937)] font-[family-name:var(--font-display)]">
                Kiểm kê kho & Đối chiếu tài sản (UC6.10)
              </h3>
            </div>
            <p className="mt-0.5 mb-0 text-xs text-gray-500">
              Tách biệt đồ đang cho khách thuê (hợp lệ) và kiểm đếm đồ tại kho thực tế. Đề nghị điều chỉnh sẽ được tạo ở trạng thái <strong>Chờ duyệt</strong>.
            </p>
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

        {/* Tab switcher */}
        <div className="flex gap-2 px-6 pt-2.5 border-b border-[var(--color-bone,#E5E7EB)] bg-white">
          <button
            type="button"
            onClick={() => vm.setActiveTab("warehouse")}
            className={`px-4 py-2 bg-transparent border-0 border-b-2 cursor-pointer text-sm ${
              vm.activeTab === "warehouse"
                ? "border-[var(--color-forest,#15803D)] font-bold text-[var(--color-forest,#15803D)]"
                : "border-transparent font-medium text-gray-500"
            }`}
          >
            🏢 Đồ cần có mặt tại kho ({vm.warehouseEquipments.length} thiết bị)
          </button>
          <button
            type="button"
            onClick={() => vm.setActiveTab("rented")}
            className={`px-4 py-2 bg-transparent border-0 border-b-2 cursor-pointer text-sm ${
              vm.activeTab === "rented"
                ? "border-blue-600 font-bold text-blue-600"
                : "border-transparent font-medium text-gray-500"
            }`}
          >
            🚚 Đang cho khách thuê (Hợp lệ vắng kho - {vm.rentedEquipments.length} thiết bị)
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {vm.useRealBackend && vm.tongQuan && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 mb-3 text-xs flex gap-3 flex-wrap items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <span>Tổng hồ sơ: <strong>{vm.tongQuan.tongHoSoThietBi}</strong></span>
                <span className="text-green-700">Sẵn sàng tại kho: <strong>{vm.tongQuan.sanSangTaiKho}</strong></span>
                <span className="text-blue-700">Đang thuê: <strong>{vm.tongQuan.dangChoThue}</strong></span>
                <span className="text-amber-700">Bảo trì: <strong>{vm.tongQuan.dangBaoTri}</strong></span>
                <span className="text-red-600">Thất lạc: <strong>{vm.tongQuan.thatLac}</strong></span>
              </div>
              <button
                type="button"
                disabled={vm.reconciling || vm.loadingKho}
                onClick={() => void vm.handleDoiChieuServer()}
                className="bg-teal-700 text-white border-0 rounded-md px-2.5 py-1 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {vm.reconciling ? "Đang đối chiếu..." : "🔍 Đối chiếu với máy chủ"}
              </button>
            </div>
          )}

          {vm.reconcileResult && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 mb-3 text-xs">
              <strong>Kết quả đối chiếu ({formatDateTimeVi(vm.reconcileResult.thoiDiemDoiChieu)}):</strong>{" "}
              Kỳ vọng tại kho: <strong>{vm.reconcileResult.tongSoKyVongTaiKho}</strong> · Quét thực tế:{" "}
              <strong>{vm.reconcileResult.tongSoQuetThucTe}</strong> · Khớp:{" "}
              <strong>{vm.reconcileResult.danhSachKhop.length}</strong> · Thiếu:{" "}
              <strong className="text-red-600">{vm.reconcileResult.danhSachThieu.length}</strong> · Ngoài kho hợp lệ:{" "}
              <strong>{vm.reconcileResult.danhSachDangLuuHanhNgoaiKho.length}</strong>
            </div>
          )}

          {vm.submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3.5 py-2.5 mb-3 text-xs font-semibold">
              {vm.submitError}
            </div>
          )}

          {vm.activeTab === "rented" ? (
            <AuditRentedTab
              rentedEquipments={vm.rentedEquipments}
              products={app.products}
              orders={app.orders}
            />
          ) : (
            <AuditWarehouseTab
              searchTerm={vm.searchTerm}
              onSearchChange={vm.setSearchTerm}
              totalCount={vm.warehouseEquipments.length}
              discrepancyCount={vm.discrepancies.length}
              filteredWarehouse={vm.filteredWarehouse}
              products={app.products}
              auditStates={vm.auditStates}
              onUpdateItem={vm.updateItemAudit}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Người kiểm kê:</span>
            <input
              type="text"
              value={vm.auditStaff}
              onChange={(e) => vm.setAuditStaff(e.target.value)}
              className="border border-[var(--color-bone,#E5E7EB)] rounded-md px-2 py-1 text-xs w-36 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-[var(--color-bone,#E5E7EB)] px-3.5 py-1.5 rounded-lg text-xs cursor-pointer"
            >
              Hủy
            </button>
            {vm.discrepancies.length > 0 ? (
              <button
                type="button"
                disabled={vm.submitting}
                onClick={vm.handleSubmitAudit}
                className="bg-[var(--color-amber,#D97706)] text-white border-0 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {vm.submitting
                  ? "Đang gửi..."
                  : `📤 Gửi Đề nghị điều chỉnh kho (${vm.discrepancies.length} thiết bị - Chờ duyệt)`}
              </button>
            ) : (
              <button
                type="button"
                disabled={vm.submitting}
                onClick={vm.handleSubmitAudit}
                className="bg-[var(--color-forest,#15803D)] text-white border-0 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                ✓ Xác nhận kho khớp 100% (Hoàn tất kiểm kê)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
