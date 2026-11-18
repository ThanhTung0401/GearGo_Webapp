import { fmt, type CartItem, type Product } from "../../../store";
import Icon from "../../../components/Icon";

interface CheckoutReceiverSectionProps {
  receiverName: string;
  setReceiverName: (v: string) => void;
  receiverPhone: string;
  setReceiverPhone: (v: string) => void;
  receiverEmail: string;
  setReceiverEmail: (v: string) => void;
  orderNote: string;
  setOrderNote: (v: string) => void;
  pickupDate: string;
  pickupHour: string;
  returnDate: string;
  returnHour: string;
  cart: CartItem[];
  products: Product[];
  days: number;
}

/**
 * Cột trái trang Checkout: thông tin người nhận thiết bị, danh sách thiết bị chốt đặt và cam kết hoàn cọc BR22.
 */
export function CheckoutReceiverSection({
  receiverName,
  setReceiverName,
  receiverPhone,
  setReceiverPhone,
  receiverEmail,
  setReceiverEmail,
  orderNote,
  setOrderNote,
  pickupDate,
  pickupHour,
  returnDate,
  returnHour,
  cart,
  products,
  days,
}: CheckoutReceiverSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Thông tin người nhận thiết bị */}
      <div className="card-panel cp-card">
        <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
          <Icon name="user" size={18} /> Thông tin người nhận thiết bị (Tự động cập nhật)
        </h4>
        <div className="form-grid-2 cp-checkout-form-grid">
          <div className="form-group">
            <label className="form-label cp-checkout-label">Họ và tên người nhận *</label>
            <input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="form-input cp-checkout-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label cp-checkout-label">Số điện thoại liên hệ *</label>
            <input
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              className="form-input cp-checkout-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label cp-checkout-label">Email nhận biên lai điện tử</label>
            <input
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              className="form-input cp-checkout-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label cp-checkout-label">Địa điểm nhận & nghiệm thu đồ</label>
            <div className="cp-checkout-location-pill">
              📍 128 Nguyễn Đình Chiểu, P. Võ Thị Sáu, Q.3, TP.HCM
            </div>
          </div>
        </div>

        <div className="cp-checkout-schedule-summary">
          <span>🕒 <strong>Nhận đồ:</strong> {pickupDate} ({pickupHour || "09:00"})</span>
          <span>→</span>
          <span>🕒 <strong>Trả đồ:</strong> {returnDate} ({returnHour || "09:00"})</span>
        </div>

        <div className="form-group mt-3">
          <label className="form-label cp-checkout-label--sm">Ghi chú cho cửa hàng (tùy chọn)</label>
          <input
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="VD: Nhận sớm hơn 15 phút, cần hỗ trợ kiểm tra gậy lều..."
            className="form-input cp-checkout-input--note"
          />
        </div>
      </div>

      {/* Danh sách thiết bị thuê */}
      <div className="card-panel cp-card">
        <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
          <Icon name="tent" size={18} /> Danh sách thiết bị chốt đặt ({cart.length} món · {days} ngày)
        </h4>
        <div className="flex flex-col gap-2">
          {cart.map((c) => {
            const p = products.find((prod) => prod.id === c.productId);
            if (!p) return null;
            return (
              <div
                key={c.productId}
                className="flex justify-between items-center py-2.5 border-b border-dashed border-bone text-sm"
              >
                <div>
                  <span className="font-semibold text-bark">{p.name}</span>
                  <strong className="text-forest ml-2">× {c.qty}</strong>
                  <div className="text-xs text-gray-500">
                    Thuê: {fmt(p.pricePerDay)}/ngày · Cọc: {fmt(p.deposit * c.qty)} (hoàn trả)
                  </div>
                </div>
                <span className="font-mono font-bold text-forest">
                  {fmt(p.pricePerDay * c.qty * days)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chính sách hủy & bảo đảm cọc */}
      <div className="policy-banner cp-checkout-policy-banner">
        <strong>🛡️ Cam kết hoàn cọc & Quy định hủy đơn (BR22):</strong>
        <ul className="cp-checkout-policy-list">
          <li><strong>Hoàn cọc 100%:</strong> Tự động chuyển khoản hoàn cọc trong 5–15 phút sau khi nghiệm thu đồ nguyên vẹn.</li>
          <li><strong>Hủy đơn trước 48 giờ:</strong> Hoàn 100% tiền thuê và 100% tiền cọc.</li>
          <li><strong>Hủy đơn trong 24–48 giờ:</strong> Giữ 30% tiền thuê làm phí hủy, hoàn 70% tiền thuê + 100% tiền cọc.</li>
          <li><strong>Hủy đơn dưới 24 giờ:</strong> Giữ 100% tiền thuê, hoàn lại 100% tiền cọc bảo đảm.</li>
        </ul>
      </div>
    </div>
  );
}
