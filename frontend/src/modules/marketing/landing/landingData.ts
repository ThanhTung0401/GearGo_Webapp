import type { IconName } from "../../../components/Icon";

export const LANDING_CATEGORIES: { icon: IconName; name: string; count: number; color: string }[] = [
  { icon: "tent", name: "Lều trại", count: 2, color: "#244C3A" },
  { icon: "package", name: "Ngủ", count: 3, color: "#2D6A4F" },
  { icon: "sparkles", name: "Đèn", count: 4, color: "#3F6C87" },
  { icon: "package", name: "Nấu ăn", count: 2, color: "#D98550" },
  { icon: "package", name: "Balo", count: 2, color: "#172E23" },
];

export const LANDING_STEPS: { num: string; icon: IconName; title: string; desc: string }[] = [
  { num: "01", icon: "calendar", title: "Chọn ngày & sản phẩm", desc: "Chọn ngày nhận/trả, duyệt sản phẩm và kiểm tra số lượng còn nhận đặt." },
  { num: "02", icon: "cart", title: "Đặt và thanh toán", desc: "Thêm vào giỏ, xem báo giá tạm tính và thanh toán tiền thuê + cọc bảo đảm." },
  { num: "03", icon: "package", title: "Đến nhận đồ", desc: "Nhân viên chuẩn bị sẵn thiết bị. Đến cửa hàng ký xác nhận và nhận đồ." },
  { num: "04", icon: "check", title: "Trả đồ & hoàn cọc", desc: "Trả đồ đúng hạn, nhân viên kiểm tra và hoàn lại tiền cọc trong ngày." },
];

export const LANDING_POLICIES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "calendar", title: "Giữ chỗ 15 phút", desc: "Sau khi đặt đơn, hệ thống giữ số lượng 15 phút để bạn thanh toán." },
  { icon: "wallet", title: "Cọc hoàn minh bạch", desc: "Trả đồ đạt yêu cầu — hoàn cọc ngay sau khi đối soát hoàn tất." },
  { icon: "shield", title: "Bảo quản chuẩn chỉ", desc: "Vệ sinh, phơi sấy và kiểm định độ bền sau mỗi lượt khách." },
  { icon: "user", title: "Hỗ trợ 7 ngày/tuần", desc: "Đội ngũ chuyên viên cắm trại sẵn sàng tư vấn lịch trình và thiết bị." },
];

export const LANDING_FAQS = [
  {
    q: "Tiền cọc được hoàn khi nào?",
    a: "Sau khi kiểm tra thiết bị đạt yêu cầu, cửa hàng hoàn cọc trong vòng 24 giờ. Nếu có phụ phí được duyệt, cọc được trừ đi phần đó.",
  },
  {
    q: "Tôi có thể hủy đơn không?",
    a: "Hủy trước 48h hoàn 100% tiền thuê. Hủy trong 24–48h khấu trừ 30%. Hủy dưới 24h giữ lại 50%. Cọc bảo đảm hoàn toàn bộ khi chưa bàn giao.",
  },
  {
    q: "Nếu đồ bị hỏng trong quá trình thuê?",
    a: "Nhân viên sẽ đánh giá mức độ hư hỏng và lập phụ phí theo bảng tỷ lệ bồi thường đã công bố. Hao mòn thông thường không tính phí.",
  },
  {
    q: "Có giao hàng tận nơi không?",
    a: "Hiện tại GearGo chưa có dịch vụ giao hàng. Khách vui lòng đến nhận và trả trực tiếp tại cửa hàng.",
  },
];

export const LANDING_BOOKING_HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];
