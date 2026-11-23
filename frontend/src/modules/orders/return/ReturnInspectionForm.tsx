import type React from "react";
import { fmt, Order, ReturnReceiptItem } from "../../../store";
import type { DebtRowItem } from "./returnTypes";

interface ReturnInspectionFormProps {
  order: Order;
  debtRows: DebtRowItem[];
  currentReturnRound: number;
  selectedItemsToReturn: Record<string, boolean>;
  setSelectedItemsToReturn: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  itemConditions: Record<string, ReturnReceiptItem["condition"]>;
  itemNotes: Record<string, string>;
  setItemNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  itemSurcharges: Record<string, number>;
  setItemSurcharges: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  returnStaffNote: string;
  setReturnStaffNote: (v: string) => void;
  returnBusy: boolean;
  onToggleSelect: (rowKey: string, compensation: number, maChiTietBanGiao?: number) => void;
  onConditionChange: (rowKey: string, cond: ReturnReceiptItem["condition"], compensation: number) => void;
  onCreateReceipt: () => Promise<void>;
}

const CONDITION_OPTIONS: ReturnReceiptItem["condition"][] = [
  "Bình thường",
  "Cần vệ sinh",
  "Hỏng nhẹ",
  "Hỏng nặng",
  "Thiếu phụ kiện",
  "Mất thiết bị",
];

// Form kiểm tra tình trạng từng thiết bị còn nợ và lập phiếu nhận trả theo đợt (UC4.3)
export function ReturnInspectionForm({
  order,
  debtRows,
  currentReturnRound,
  selectedItemsToReturn,
  setSelectedItemsToReturn,
  itemConditions,
  itemNotes,
  setItemNotes,
  itemSurcharges,
  setItemSurcharges,
  returnStaffNote,
  setReturnStaffNote,
  returnBusy,
  onToggleSelect,
  onConditionChange,
  onCreateReceipt,
}: ReturnInspectionFormProps) {
  const selCount = debtRows.filter((r) => selectedItemsToReturn[r.key]).length;
  const remainAfter = debtRows.length - selCount;

  return (
    <div className="so-return-form-box">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <span className="so-badge-forest-sm">ĐỢT TRẢ SỐ {currentReturnRound}</span>
          <h4 className="so-return-form-title">
            Lập Phiếu Nhận Trả ({order.displayCode || order.id})
          </h4>
        </div>
        <button
          onClick={() => {
            debtRows.forEach((row) => {
              if (!selectedItemsToReturn[row.key]) {
                onToggleSelect(row.key, row.compensation, row.maChiTietBanGiao);
              }
            });
          }}
          className="so-btn-parchment-sm"
        >
          Chọn tất cả {debtRows.length} món nợ
        </button>
      </div>

      <p className="so-return-form-desc">
        Tick chọn những thiết bị khách mang đến trả lần này. Những món chưa chọn sẽ giữ nguyên trạng thái nợ thiết bị.
      </p>

      <div className="flex flex-col gap-3">
        {debtRows.map((row) => {
          const isSelected = !!selectedItemsToReturn[row.key];
          const cond = itemConditions[row.key] || "Bình thường";
          const fee = itemSurcharges[row.key] || 0;

          return (
            /* Đổi màu viền & nền thẻ thiết bị khi được tick chọn nhận trả */
            <div key={row.key} className={`so-debt-card ${isSelected ? "is-selected" : ""}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(row.key, row.compensation, row.maChiTietBanGiao)}
                  className="so-checkbox-lg"
                />
                <div className="so-flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="so-debt-code">{row.displayCode}</span>
                    <span className="so-debt-name">{row.productName}</span>
                  </div>
                  <div className="so-debt-comp">
                    Giá trị bồi thường tham chiếu: {fmt(row.compensation)}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="so-debt-expand">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="so-cond-label">Tình trạng nhận lại:</span>
                    {CONDITION_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onConditionChange(row.key, c, row.compensation)}
                        className={`so-cond-btn ${cond === c ? "is-active" : ""}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      placeholder="Ghi chú chi tiết lỗi/hư hỏng hoặc tình trạng..."
                      value={itemNotes[row.key] || ""}
                      onChange={(e) => setItemNotes((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      className="so-note-input"
                    />
                    <div className="flex items-center gap-1">
                      <span className="so-fee-label">Phụ phí:</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={fee}
                        onChange={(e) =>
                          setItemSurcharges((prev) => ({
                            ...prev,
                            [row.key]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className={`so-fee-input ${fee > 0 ? "is-nonzero" : ""}`}
                      />
                      <span className="so-fee-unit">đ</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="so-staff-note-wrap">
        <input
          placeholder="Ghi chú chung của nhân viên nhận trả đợt này (tùy chọn)..."
          value={returnStaffNote}
          onChange={(e) => setReturnStaffNote(e.target.value)}
          className="so-staff-note-input"
        />
      </div>

      {/* Phân biệt trạng thái trả một phần vs hoàn tất thu hồi */}
      <div className={`so-return-summary ${remainAfter > 0 ? "is-partial" : "is-final"}`}>
        {remainAfter > 0 ? (
          <>
            <strong>Nhận trả một phần:</strong> Khách trả {selCount} món, còn nợ lại{" "}
            <strong>{remainAfter} món</strong>. Đơn vẫn giữ trạng thái <strong>Đang thuê</strong> cho đến khi thu hồi đủ.
          </>
        ) : (
          <>
            <strong>Hoàn tất nhận trả (Lần trả cuối):</strong> Toàn bộ {debtRows.length} thiết bị còn lại sẽ được thu hồi / xử lý, sẵn sàng bước{" "}
            <strong>Đối soát cọc</strong>.
          </>
        )}
      </div>

      <button
        disabled={returnBusy}
        onClick={() => void onCreateReceipt()}
        className="so-btn-primary-lg"
      >
        {returnBusy ? "Đang xử lý..." : `✓ Xác nhận lập Phiếu Nhận Trả Đợt ${currentReturnRound}`}
      </button>
    </div>
  );
}
