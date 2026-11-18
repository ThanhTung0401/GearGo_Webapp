import { fmt } from "../../../store";
import Icon from "../../../components/Icon";

interface OrderConfirmedQrBoxProps {
  mm: string;
  ss: string;
  totalAmount: number;
  displayOrderCode: string;
}

/**
 * Khối đồng hồ đếm ngược 15 phút giữ chỗ và mã VietQR chuyển khoản tự động (UC3.2 & UC5.1).
 */
export function OrderConfirmedQrBox({
  mm,
  ss,
  totalAmount,
  displayOrderCode,
}: OrderConfirmedQrBoxProps) {
  return (
    <>
      {/* Đồng hồ đếm ngược 15 phút giữ chỗ */}
      <div className="text-center my-4">
        <div className="timer-pill cp-timer-pill">
          <Icon name="clock" size={18} /> Thời hạn giữ chỗ còn lại: <span className="cp-timer-pill-value">{mm}:{ss}</span>
        </div>
      </div>

      {/* Khung mã VietQR chuyển khoản trực tiếp (UC5.1) */}
      <div className="cp-qr-box">
        <div className="cp-qr-title">
          MÃ QR THANH TOÁN TỰ ĐỘNG 24/7 (VIETQR)
        </div>

        {/* QR Image */}
        <div className="cp-qr-img-frame">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901234567|CONG%20TY%20GEARGO||0|0|${totalAmount}|${encodeURIComponent(displayOrderCode)}|transfer_myqr`}
            alt="Mã QR Chuyển khoản VietQR"
            className="cp-qr-img"
          />
        </div>

        <div className="cp-qr-info-card">
          <div>Ngân hàng: <strong>MB Bank (Quân Đội)</strong></div>
          <div>Số tài khoản: <strong className="cp-qr-mono-forest">0901 234 567</strong></div>
          <div>Chủ tài khoản: <strong>CONG TY TNHH GEARGO OUTDOOR</strong></div>
          <div>Số tiền chuyển: <strong className="cp-qr-mono-forest">{fmt(totalAmount)}</strong></div>
          <div>Nội dung chuyển khoản: <strong className="cp-qr-code-pill">{displayOrderCode}</strong></div>
        </div>

        <div className="cp-qr-hint">
          💡 <em>Hệ thống sẽ tự động kích hoạt trạng thái "Đã xác nhận" ngay khi tiền vào tài khoản.</em>
        </div>
      </div>
    </>
  );
}
