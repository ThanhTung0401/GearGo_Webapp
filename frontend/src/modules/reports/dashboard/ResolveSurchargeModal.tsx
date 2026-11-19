import { fmt, type Order, type Surcharge } from "../../../store";

interface ResolveSurchargeModalProps {
  resolvingSurcharge: { order: Order; surcharge: Surcharge };
  resolutionType: "approved" | "rejected" | "adjusted";
  onResolutionTypeChange: (type: "approved" | "rejected" | "adjusted") => void;
  adjustedAmount: number;
  onAdjustedAmountChange: (amount: number) => void;
  resolutionReason: string;
  onResolutionReasonChange: (reason: string) => void;
  resolvingLoading: boolean;
  resolveError: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Modal đối chiếu chứng cứ 2 chiều (BBBG vs PNT) và kết luận tranh chấp / duyệt phụ phí (UC5.3).
 */
export function ResolveSurchargeModal({
  resolvingSurcharge,
  resolutionType,
  onResolutionTypeChange,
  adjustedAmount,
  onAdjustedAmountChange,
  resolutionReason,
  onResolutionReasonChange,
  resolvingLoading,
  resolveError,
  onSubmit,
  onClose,
}: ResolveSurchargeModalProps) {
  const { order, surcharge } = resolvingSurcharge;
  // Truy xuất tình trạng thiết bị ở biên bản bàn giao và phiếu nhận trả để đối chiếu
  const beforeCondition =
    order.handoverRecord?.items.find((i) => i.equipmentId === surcharge.equipmentId)?.condition ||
    "Tốt, hoạt động bình thường";
  const afterCondition =
    order.returnReceipts?.flatMap((r) => r.items).find((i) => i.equipmentId === surcharge.equipmentId)?.condition ||
    surcharge.type;

  return (
    <div role="dialog" aria-modal="true" className="adm-modal-overlay">
      <div className="adm-modal-dialog is-lg p-6 overflow-y-auto">
        <div className="modal-header flex justify-between items-center mb-4 pb-3 border-b border-bone p-0">
          <div>
            <span className="adm-pill is-warning">
              UC5.3: DUYỆT & XỬ LÝ TRANH CHẤP PHỤ PHÍ
            </span>
            <h3 className="modal-title font-bold text-lg text-bark mt-1">
              Hồ sơ xử lý phụ phí: {surcharge.type}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm text-xl">
            ×
          </button>
        </div>

        {/* Thông tin căn cứ đề xuất & Đơn hàng */}
        <div className="adm-card--parchment mb-4 text-[0.82rem]">
          <div className="adm-grid-2 gap-2 mb-2">
            <div>Đơn hàng: <strong>{order.id}</strong></div>
            <div>Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})</div>
            <div>Thiết bị liên quan: <strong className="font-mono text-forest">{surcharge.equipmentId}</strong></div>
            <div>Người lập đề xuất: <strong>{surcharge.createdBy}</strong></div>
          </div>
          <div className="pt-2 border-t border-dashed border-[var(--color-bone)]">
            Lý do lập phí ban đầu: <em className="text-gray-700">"{surcharge.reason}"</em>
          </div>
        </div>

        {/* Đối chiếu chứng cứ 2 chiều (Dòng chính 2 UC5.3) */}
        <div className="mb-4">
          <div className="adm-label--block mb-2">
            🔍 Đối chiếu chứng cứ trước và sau thuê (Dòng 2 UC5.3):
          </div>
          <div className="adm-grid-2">
            {/* Cột 1: Trước thuê (BBBG - UC4.2) */}
            <div className="adm-evidence-box is-before">
              <div className="font-bold text-[#1D4ED8] mb-1">
                📋 Lúc bàn giao (BBBG - UC4.2)
              </div>
              <div>Thời gian: {order.handoverRecord?.handoverAt || order.pickupTime}</div>
              <div>Nhân viên giao: {order.handoverRecord?.staffName || "Cửa hàng"}</div>
              <div>Tình trạng: {beforeCondition}</div>
              <div className="mt-1 text-[#4B5563]">
                Ghi chú giao: {order.handoverRecord?.initialNotes || "Không có ghi nhận lỗi"}
              </div>
            </div>

            {/* Cột 2: Sau thuê (PNT - UC4.3) */}
            <div className="adm-evidence-box is-after">
              <div className="font-bold text-[#DC2626] mb-1">
                📦 Lúc nhận trả (PNT - UC4.3)
              </div>
              <div>Thời gian: {order.returnedAt || "Đã nhận trả"}</div>
              <div>Tình trạng: {afterCondition}</div>
              <div className="mt-1 text-[#991B1B]">
                Tổn thất ghi nhận: {surcharge.reason}
              </div>
            </div>
          </div>
        </div>

        {/* Xem phản hồi khiếu nại của khách (Dòng chính 3 UC5.3) */}
        <div className="mb-4">
          <div className="adm-label--block mb-1.5">
            🗣️ Phản hồi khiếu nại của khách hàng (Dòng 3 UC5.3):
          </div>
          {surcharge.customerResponse ? (
            <div className="adm-alert is-warning adm-alert--block mb-0">
              <strong>Khách hàng phản hồi:</strong> "{surcharge.customerResponse}"
            </div>
          ) : (
            <div className="adm-card--soft p-2.5 text-[0.78rem] text-[#6B7280]">
              ℹ️ Khách hàng chưa có khiếu nại (Khoản phí đang ở trạng thái chờ duyệt thông thường).
            </div>
          )}
        </div>

        {/* Form kết luận & quyết định của Quản trị viên (Dòng chính 4 & 5 UC5.3) */}
        <form onSubmit={onSubmit} className="adm-dispute-form-box">
          <div className="adm-label--block text-[0.85rem] mb-2.5">
            ⚖️ Quyết định xử lý & Mức phí phê duyệt vào đối soát:
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-[0.82rem]">
              <input
                type="radio"
                name="resolution"
                checked={resolutionType === "approved"}
                onChange={() => onResolutionTypeChange("approved")}
              />
              <span>
                <strong>1. Chấp thuận mức đề xuất:</strong> Giữ nguyên {fmt(surcharge.amount)}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[0.82rem]">
              <input
                type="radio"
                name="resolution"
                checked={resolutionType === "adjusted"}
                onChange={() => {
                  onResolutionTypeChange("adjusted");
                  if (adjustedAmount === 0) onAdjustedAmountChange(Math.round(surcharge.amount / 2));
                }}
              />
              <span>
                <strong>2. Thỏa thuận giảm phí (Điều chỉnh có căn cứ):</strong>
              </span>
            </label>

            {resolutionType === "adjusted" && (
              <div className="ml-6 mt-1">
                <label className="adm-label--xs">
                  Số tiền sau điều chỉnh thỏa thuận (đ):
                </label>
                <input
                  type="number"
                  min={0}
                  max={surcharge.amount}
                  value={adjustedAmount}
                  onChange={(e) => onAdjustedAmountChange(Number(e.target.value))}
                  className="form-input adm-field--narrow"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-[0.82rem]">
              <input
                type="radio"
                name="resolution"
                checked={resolutionType === "rejected"}
                onChange={() => onResolutionTypeChange("rejected")}
              />
              <span>
                <strong>3. Bác bỏ phụ phí (Quy về 0đ - Dòng phụ 4.1):</strong> Không có căn cứ thu hoặc thuộc hao mòn cho phép
              </span>
            </label>
          </div>

          <div className="form-group mb-3">
            <label className="form-label text-[0.8rem] font-semibold">
              Ghi chú kết luận & Căn cứ xử lý (Lưu vết kiểm toán):
            </label>
            <textarea
              rows={2}
              value={resolutionReason}
              onChange={(e) => onResolutionReasonChange(e.target.value)}
              placeholder="Ghi nhận thỏa thuận qua điện thoại với khách, trích xuất hình ảnh kiểm tra..."
              className="form-textarea adm-field adm-field--compact"
            />
          </div>

          {resolveError && (
            <div role="alert" className="adm-alert is-error-solid adm-alert--compact mb-2.5">
              {resolveError}
            </div>
          )}

          {/* Cho phép nút hành động tự xuống dòng trên mobile 390px để tránh đẩy nút Đóng ra ngoài modal */}
          <div className="flex justify-end gap-2 flex-wrap">
            <button type="button" disabled={resolvingLoading} onClick={onClose} className="btn btn-secondary btn-sm">
              Đóng
            </button>
            <button type="submit" disabled={resolvingLoading} className="btn btn-primary btn-sm font-bold">
              {resolvingLoading ? "Đang xử lý..." : "✓ Xác nhận kết luận & Cập nhật đưa vào đối soát"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
