import type { useApp } from "../../../App";
import { fmt, type ImportReceipt } from "../../../store";
import { useGoodsReceiving } from "./useGoodsReceiving";
import GoodsReceivingLineCard from "./GoodsReceivingLineCard";

interface Props {
  receipt: ImportReceipt;
  app: ReturnType<typeof useApp>;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * UC7.7 & UC7.7.2: Biên bản kiểm nhận hàng thực tế & Xử lý hàng lỗi.
 */
export default function GoodsReceivingModal({ receipt, app, onClose, onSuccess }: Props) {
  const {
    inspectedBy,
    setInspectedBy,
    receivingCondition,
    setReceivingCondition,
    submitting,
    submitError,
    lineStates,
    updateLineState,
    autoGenerateCodes,
    actualTotalAmount,
    handleSubmit,
  } = useGoodsReceiving(receipt, app, onClose, onSuccess);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-[920px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <h3 className="m-0 text-lg font-bold text-[var(--color-bark,#1F2937)] font-[family-name:var(--font-display)]">
                Biên bản kiểm nhận & Nghiệm thu nhập kho (UC7.7 & UC7.7.2)
              </h3>
            </div>
            <p className="mt-0.5 mb-0 text-xs text-gray-500">
              Phiếu: <strong className="font-mono">{receipt.displayCode || receipt.id}</strong> · Nhà cung cấp:{" "}
              <strong>{receipt.supplierName}</strong>
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

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 grid gap-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3.5 py-2.5 text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Thông tin biên bản */}
          <div className="bg-[var(--color-parchment,#F5F1E9)] rounded-xl px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block">Nhân viên kiểm nhận:</span>
              <input
                type="text"
                value={inspectedBy}
                onChange={(e) => setInspectedBy(e.target.value)}
                className="w-full border border-[var(--color-bone,#E5E7EB)] rounded-md px-2 py-1 mt-0.5 bg-white"
              />
            </div>
            <div>
              <span className="text-gray-500 block">Tình trạng bao bì giao hàng:</span>
              <input
                type="text"
                value={receivingCondition}
                onChange={(e) => setReceivingCondition(e.target.value)}
                className="w-full border border-[var(--color-bone,#E5E7EB)] rounded-md px-2 py-1 mt-0.5 bg-white"
              />
            </div>
            <div>
              <span className="text-gray-500 block">Tổng tiền dự kiến → Thực nhận:</span>
              <div className="font-bold text-base text-[var(--color-forest,#15803D)] mt-1">
                {fmt(actualTotalAmount)}
              </div>
            </div>
          </div>

          {/* Hướng dẫn nghiệp vụ */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 text-xs text-blue-800">
            <strong>💡 Quy tắc nghiệp vụ kiểm định (UC7.7 & UC7.7.2):</strong>
            <ul className="mt-1 mb-0 ml-4 list-disc">
              <li><strong>Hàng đạt:</strong> Nhập mã serial → Kích hoạt trạng thái <code>Sẵn sàng</code> cho thuê.</li>
              <li><strong>Hàng lỗi (UC7.7.2):</strong> Nhập mã serial → Kích hoạt trạng thái <code>Đang bảo trì</code> để xử lý kỹ thuật trước.</li>
              <li><strong>Hàng từ chối:</strong> Ghi rõ lý do trả hàng → KHÔNG sinh mã, KHÔNG tăng kho, tự động trừ tiền thanh toán.</li>
            </ul>
          </div>

          <div className="grid gap-4">
            {receipt.lines.map((line, index) => {
              const prod = app.products.find((p) => p.id === line.productId);
              const st = lineStates[index];
              if (!st) return null;
              return (
                <GoodsReceivingLineCard
                  key={line.id || index}
                  index={index}
                  line={line}
                  productName={prod?.name || line.productId}
                  st={st}
                  onUpdate={updateLineState}
                  onAutoGenerate={autoGenerateCodes}
                />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-bone,#E5E7EB)] flex justify-between items-center bg-[var(--color-cream,#FAFAF9)]">
          <div className="text-sm font-bold">
            Tổng thanh toán thực nhận:{" "}
            <span className="text-[var(--color-forest,#15803D)]">{fmt(actualTotalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-[var(--color-bone,#E5E7EB)] px-4 py-2 rounded-lg text-sm cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="bg-[var(--color-forest,#15803D)] text-white border-0 px-5 py-2 rounded-lg text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              ✓ Chốt kiểm nhận & Xác nhận nhập kho (UC7.7)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
