import Icon from "../../../components/Icon";

interface OrderConfirmedQrBoxProps {
  mm: string;
  ss: string;
}

/**
 * Khối đồng hồ đếm ngược 15 phút giữ chỗ (UC3.2).
 */
export function OrderConfirmedQrBox({
  mm,
  ss,
}: OrderConfirmedQrBoxProps) {
  return (
    <div className="text-center my-4">
      <div className="timer-pill cp-timer-pill">
        <Icon name="clock" size={18} /> Thời hạn giữ chỗ còn lại: <span className="cp-timer-pill-value">{mm}:{ss}</span>
      </div>
    </div>
  );
}
