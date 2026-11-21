import { addDaysToDateStr, getTodayDateStr, normalizeRentalSchedule } from "../customerUtils";

interface CartScheduleBarProps {
  pickupDate: string;
  pickupHour: string;
  returnDate: string;
  returnHour: string;
  days: number;
  datesValid: boolean;
  cartApiError: string;
  onScheduleChange: (
    nextPickupDate: string,
    nextPickupHour: string,
    nextReturnDate: string,
    nextReturnHour: string
  ) => Promise<void>;
}

const CART_HOURS = ["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

/**
 * Thanh chọn ngày & giờ nhận/trả thiết bị trực tiếp tại Giỏ hàng (UC3.1 Dòng sự kiện 2).
 */
export function CartScheduleBar({
  pickupDate,
  pickupHour,
  returnDate,
  returnHour,
  days,
  datesValid,
  cartApiError,
  onScheduleChange,
}: CartScheduleBarProps) {
  const todayStr = getTodayDateStr();
  const minReturnDate = addDaysToDateStr(pickupDate && pickupDate >= todayStr ? pickupDate : todayStr, 1);

  return (
    <div className="cp-cart-schedule-box">
      <div className="cp-cart-schedule-header">
        <span>📅 Lịch trình thuê đồ (Block 24h làm tròn lên):</span>
        <span className={`cp-cart-duration-pill ${datesValid ? "is-valid" : "is-invalid"}`}>
          {datesValid ? `Tổng thời gian: ${days} ngày` : "Thời gian chưa hợp lệ"}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="cp-cart-date-label">Ngày & Giờ nhận đồ</label>
          <div className="flex gap-1">
            <input
              type="date"
              min={todayStr}
              value={pickupDate}
              onChange={(e) => {
                const next = normalizeRentalSchedule(e.target.value, returnDate, "pickup");
                void onScheduleChange(next.pickupDate, pickupHour || "09:00", next.returnDate, returnHour || "09:00");
              }}
              className="cp-cart-date-input"
            />
            <select
              value={pickupHour || "09:00"}
              onChange={(e) => void onScheduleChange(pickupDate, e.target.value, returnDate, returnHour || "09:00")}
              className="cp-cart-hour-select"
            >
              {CART_HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="cp-cart-arrow">→</span>

        <div>
          <label className="cp-cart-date-label">Ngày & Giờ trả đồ</label>
          <div className="flex gap-1">
            <input
              type="date"
              min={minReturnDate}
              value={returnDate}
              onChange={(e) => {
                const next = normalizeRentalSchedule(pickupDate, e.target.value, "return");
                void onScheduleChange(next.pickupDate, pickupHour || "09:00", next.returnDate, returnHour || "09:00");
              }}
              className="cp-cart-date-input"
            />
            <select
              value={returnHour || "09:00"}
              onChange={(e) => void onScheduleChange(pickupDate, pickupHour || "09:00", returnDate, e.target.value)}
              className="cp-cart-hour-select"
            >
              {CART_HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="cp-cart-schedule-hint">
          💡 <em>Đổi lịch thuê sẽ tự động kiểm tra lại tồn kho khả dụng và tính toán lại toàn bộ báo giá.</em>
        </div>
      </div>
      {cartApiError && (
        <div role="alert" className="cp-alert-error mt-2.5">
          {cartApiError}
        </div>
      )}
    </div>
  );
}
