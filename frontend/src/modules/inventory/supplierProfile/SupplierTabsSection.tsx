import { fmt, type ImportReceipt } from "../../../store";
import type { ImportedProductSummary } from "./useSupplierProfile";

interface Props {
  activeTab: "products" | "receipts";
  onChangeTab: (tab: "products" | "receipts") => void;
  importedProducts: ImportedProductSummary[];
  supplierReceipts: ImportReceipt[];
  onOpenReceipt?: (receiptId: string) => void;
  onClose: () => void;
}

export default function SupplierTabsSection({
  activeTab,
  onChangeTab,
  importedProducts,
  supplierReceipts,
  onOpenReceipt,
  onClose,
}: Props) {
  return (
    <div>
      <div className="flex gap-2 border-b border-[var(--color-bone,#E5E7EB)] pb-2 mb-3">
        <button
          type="button"
          onClick={() => onChangeTab("products")}
          className={`border border-[var(--color-bone,#E5E7EB)] rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
            activeTab === "products" ? "bg-[var(--color-forest,#15803D)] text-white" : "bg-white text-gray-500"
          }`}
        >
          📦 Sản phẩm từng nhập ({importedProducts.length})
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("receipts")}
          className={`border border-[var(--color-bone,#E5E7EB)] rounded-md px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
            activeTab === "receipts" ? "bg-[var(--color-forest,#15803D)] text-white" : "bg-white text-gray-500"
          }`}
        >
          📋 Lịch sử phiếu nhập ({supplierReceipts.length})
        </button>
      </div>

      {activeTab === "products" ? (
        importedProducts.length === 0 ? (
          <div className="text-center p-5 text-gray-500 text-xs">
            Chưa có sản phẩm nào được nhập kho chính thức từ nhà cung cấp này.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--color-bone,#E5E7EB)] rounded-lg">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--color-parchment,#F5F1E9)] font-semibold">
                  <th className="px-3 py-2 text-left">Mã SP</th>
                  <th className="px-3 py-2 text-left">Tên sản phẩm</th>
                  <th className="px-3 py-2 text-right">Tổng lượng đã nhận</th>
                  <th className="px-3 py-2 text-right">Đơn giá nhập gần nhất</th>
                  <th className="px-3 py-2 text-right">Thời điểm gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {importedProducts.map((p) => (
                  <tr key={p.productId} className="border-t border-[var(--color-bone,#E5E7EB)]">
                    <td className="px-3 py-2 font-mono font-bold">{p.productId}</td>
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2 text-right font-bold text-[var(--color-forest,#15803D)]">
                      {p.totalQty} chiếc
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(p.lastUnitPrice)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{p.lastDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : supplierReceipts.length === 0 ? (
        <div className="text-center p-5 text-gray-500 text-xs">
          Chưa có phiếu nhập nào được ghi nhận cho nhà cung cấp này.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--color-bone,#E5E7EB)] rounded-lg">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-parchment,#F5F1E9)] font-semibold">
                <th className="px-3 py-2 text-left">Mã phiếu</th>
                <th className="px-3 py-2 text-left">Ngày tạo</th>
                <th className="px-3 py-2 text-left">Người lập</th>
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2 text-right">Tổng giá trị</th>
                <th className="px-3 py-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {supplierReceipts.map((r) => {
                const total = r.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                return (
                  <tr key={r.id} className="border-t border-[var(--color-bone,#E5E7EB)]">
                    <td className="px-3 py-2 font-mono font-bold text-[var(--color-forest,#15803D)]">
                      {r.displayCode || r.id}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.createdAt}</td>
                    <td className="px-3 py-2">{r.createdBy}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[0.72rem] font-semibold ${
                          r.status === "Đã nhập kho"
                            ? "bg-green-100 text-green-700"
                            : r.status === "Nháp"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{fmt(total)}</td>
                    <td className="px-3 py-2 text-center">
                      {onOpenReceipt && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenReceipt(r.id);
                            onClose();
                          }}
                          className="bg-white border border-[var(--color-bone,#E5E7EB)] rounded-md px-2 py-0.5 text-[0.72rem] cursor-pointer"
                        >
                          Mở phiếu
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
