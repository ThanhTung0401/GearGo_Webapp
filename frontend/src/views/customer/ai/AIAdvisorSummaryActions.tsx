import { fmt } from "../../../store";
import type { TuVanBoDoBackend } from "../../../services/api";
import type { SuggestedItem } from "../aiAdvisorPresets";
import type { ScheduleConflict } from "./useAIAdvisor";

interface AIAdvisorSummaryActionsProps {
  numNights: number;
  targetBudget: number;
  customItems: SuggestedItem[];
  totalRental: number;
  totalDeposit: number;
  totalInitial: number;
  aiResponse: TuVanBoDoBackend | null;
  advisorError: string;
  addedAllNotice: boolean;
  addingToCart: boolean;
  scheduleConflict: ScheduleConflict | null;
  setScheduleConflict: (v: ScheduleConflict | null) => void;
  handleAddAllToCart: (conflictResolution?: "ThayThe" | "GiuHienTai") => Promise<void>;
  onGoToCart: () => void;
  onResetInput: () => void;
}

/**
 * Khối tổng hợp chi phí dự kiến, cảnh báo ngân sách/xung đột lịch và nhóm nút đưa combo vào giỏ thuê.
 */
export function AIAdvisorSummaryActions({
  numNights,
  targetBudget,
  customItems,
  totalRental,
  totalDeposit,
  totalInitial,
  aiResponse,
  advisorError,
  addedAllNotice,
  addingToCart,
  scheduleConflict,
  setScheduleConflict,
  handleAddAllToCart,
  onGoToCart,
  onResetInput,
}: AIAdvisorSummaryActionsProps) {
  const totalQty = customItems.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      {/* Cảnh báo ngân sách (nếu vượt) hoặc thông báo tiết kiệm */}
      {totalRental > targetBudget ? (
        <div className="policy-banner mb-4 cp-ai-budget-over">
          ⚠ Tổng tiền thuê dự kiến vượt ngân sách khoảng <strong>{fmt(totalRental - targetBudget)}</strong>. Bạn có thể bấm nút giảm số lượng hoặc xóa bớt thiết bị phụ.
        </div>
      ) : (
        <div className="cp-alert-success">
          ✓ Chi phí thuê nằm trọn vẹn trong ngân sách dự kiến (Tiết kiệm được {fmt(targetBudget - totalRental)}).
        </div>
      )}

      {/* Bảng tổng hợp chi phí dự kiến */}
      <div className="card-panel-muted cp-ai-totals-card">
        <div className="flex justify-between items-center font-bold text-sm mb-2">
          <span className="cp-ai-totals-label">Tổng tiền thuê dự kiến ({numNights} ngày · {totalQty} món)</span>
          <span className="cp-ai-totals-rental">{fmt(totalRental)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
          <span>Tiền cọc bảo đảm (Hoàn lại 100% khi trả đồ)</span>
          <span className="cp-ai-totals-deposit">{fmt(totalDeposit)}</span>
        </div>
        <div className="flex justify-between items-center font-bold text-sm cp-ai-totals-divider">
          <span className="cp-ai-totals-label">Tổng chi phí ban đầu cần chuẩn bị</span>
          <span className="cp-ai-totals-grand">{fmt(totalInitial)}</span>
        </div>
        <div className="cp-ai-totals-note">
          📌 <em>Lưu ý: Báo giá tham khảo; tồn kho thực tế sẽ được xác nhận và giữ chỗ chính xác khi chuyển vào Giỏ thuê và chọn khung giờ nhận/trả.</em>
        </div>
      </div>

      {aiResponse?.nguonGoiY === "ComboMacDinh" && (
        <div className="cp-alert-info">
          Đang hiển thị bộ combo chuẩn đề xuất tự động từ kho GearGo (UC2.4.1 Fallback).
        </div>
      )}

      {aiResponse?.thongBaoPhanThieu && (
        <div className="cp-alert-warning--amber">
          Lưu ý tồn kho từ hệ thống: {aiResponse.thongBaoPhanThieu}
        </div>
      )}

      {advisorError && (
        <div role="alert" className="cp-alert-error cp-alert-error--panel">
          {advisorError}
        </div>
      )}

      {scheduleConflict && (
        <div className="cp-alert-warning--conflict">
          <div className="font-bold mb-1">Xung đột khung giờ với giỏ thuê hiện tại</div>
          <p className="mb-3">{scheduleConflict.message}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={addingToCart}
              onClick={() => void handleAddAllToCart("ThayThe")}
              className="btn btn-primary btn-sm"
            >
              Thay thế lịch giỏ bằng lịch combo
            </button>
            <button
              type="button"
              disabled={addingToCart}
              onClick={() => void handleAddAllToCart("GiuHienTai")}
              className="btn btn-secondary btn-sm"
            >
              Giữ nguyên lịch giỏ hiện tại
            </button>
            <button
              type="button"
              onClick={() => setScheduleConflict(null)}
              className="btn btn-ghost btn-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Banner thông báo thêm thành công */}
      {addedAllNotice && (
        <div className="badge badge-success p-3 rounded-lg text-center w-full mb-4 cp-ai-added-notice">
          ✓ Đã thêm toàn bộ {customItems.length} thiết bị vào giỏ thuê thành công!
        </div>
      )}

      {/* Nhóm nút hành động */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => void handleAddAllToCart()}
          disabled={customItems.length === 0 || addingToCart}
          className="btn btn-accent btn-md cp-ai-add-all-btn"
        >
          {addingToCart ? "Đang đưa vào giỏ..." : `+ Thêm toàn bộ vào giỏ thuê (${totalQty} món)`}
        </button>
        <button
          type="button"
          onClick={onGoToCart}
          className="btn btn-primary btn-md cp-ai-goto-cart-btn"
        >
          Xem giỏ thuê →
        </button>
        <button
          type="button"
          onClick={onResetInput}
          className="btn btn-secondary btn-md cp-ai-reset-btn"
        >
          ← Nhập lại nhu cầu
        </button>
      </div>
    </>
  );
}
