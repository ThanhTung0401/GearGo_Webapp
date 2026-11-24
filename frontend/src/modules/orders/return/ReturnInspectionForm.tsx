import { useState } from "react";
import type React from "react";
import { fmt, Order, ReturnReceiptItem } from "../../../store";
import { uploadOrReadDataUrl } from "../../../services/api";
import { getErrorMessage, resolveAssetUrl } from "../../../utils";
import type { DebtRowItem } from "./returnTypes";

interface ReturnInspectionFormProps {
  realApi: boolean;
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
  damagePhotos: string[];
  setDamagePhotos: React.Dispatch<React.SetStateAction<string[]>>;
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
  realApi,
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
  damagePhotos,
  setDamagePhotos,
  returnBusy,
  onToggleSelect,
  onConditionChange,
  onCreateReceipt,
}: ReturnInspectionFormProps) {
  const [photoNotice, setPhotoNotice] = useState("");
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
            // FN5-05: bỏ qua thiết bị đã nằm trong phiếu nhận trả nháp
            debtRows.forEach((row) => {
              if (row.maPhieuNhanTraDangGiu) return;
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
          // FN5-05: thiết bị đã nằm trong phiếu nhận trả nháp → khóa checkbox, ngăn tick chọn lại
          const isLocked = Boolean(row.maPhieuNhanTraDangGiu);

          return (
            /* Đổi màu viền & nền thẻ thiết bị khi được tick chọn nhận trả */
            <div key={row.key} className={`so-debt-card ${isSelected ? "is-selected" : ""} ${isLocked ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isLocked}
                  title={isLocked ? `Thiết bị đã nằm trong phiếu nhận trả nháp #${row.maPhieuNhanTraDangGiu}` : undefined}
                  onChange={() => !isLocked && onToggleSelect(row.key, row.compensation, row.maChiTietBanGiao)}
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

      <div className="mb-3">
        <span className="so-photo-label">Ảnh bằng chứng tình trạng / hư hại khi nhận trả (UC4.3):</span>
        <div className="flex gap-2 items-center flex-wrap">
          {damagePhotos.map((url, i) => (
            <div key={i} className="relative inline-block">
              <img src={resolveAssetUrl(url)} alt={`Bằng chứng nhận trả ${i + 1}`} className="so-photo-thumb" />
              <button
                type="button"
                aria-label="Xóa ảnh bằng chứng"
                onClick={() => setDamagePhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
          <label
            className="so-photo-add-btn cursor-pointer inline-flex items-center justify-center"
            aria-label="Tải ảnh bằng chứng nhận trả từ máy"
            title="Tải ảnh bằng chứng từ máy"
          >
            📷+
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                try {
                  const urls: string[] = [];
                  for (const file of files) {
                    const uploaded = await uploadOrReadDataUrl(file, realApi, "evidence");
                    if (uploaded) urls.push(uploaded);
                  }
                  if (urls.length > 0) {
                    setDamagePhotos((prev) => [...prev, ...urls]);
                    setPhotoNotice(`Đã thêm ${urls.length} ảnh bằng chứng nhận trả (hiện có ${damagePhotos.length + urls.length} ảnh).`);
                  }
                } catch (err) {
                  setPhotoNotice(getErrorMessage(err, "Không thể tải ảnh bằng chứng."));
                } finally {
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        {photoNotice && (
          <div role="status" className="mt-1.5 text-xs text-[var(--color-success-text)]">
            {photoNotice}
          </div>
        )}
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
