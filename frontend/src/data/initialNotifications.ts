import type { AppNotification } from "../types";

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "NOTIF-001",
    title: "Đơn thuê đã được xác nhận!",
    message: "Đơn hàng DT-20241210-042 của quý khách đã được xác nhận. Vui lòng nhận thiết bị đúng giờ vào 15/12/2024.",
    type: "success",
    targetRole: "customer",
    category: "order",
    actionLink: {
      type: "order",
      targetId: "DT-20241210-042",
      label: "Xem đơn hàng"
    },
    createdAt: "10/12/2024 14:45",
    isRead: false,
  },
  {
    id: "NOTIF-002",
    title: "Cảnh báo bảo dưỡng thiết bị",
    message: "Lều L004 đang bảo trì quá 7 ngày chưa hoàn tất nghiệm thu.",
    type: "warning",
    targetRole: "staff",
    category: "rental",
    actionLink: {
      type: "page",
      targetId: "equipment",
      label: "Kiểm tra kho"
    },
    createdAt: "11/12/2024 08:30",
    isRead: false,
  },
  {
    id: "NOTIF-003",
    title: "Thông báo cập nhật chính sách cọc (v1.2)",
    message: "Hệ thống GearGo cập nhật chính sách hoàn cọc tự động và biểu phí phụ kiện mới.",
    type: "info",
    targetRole: "all",
    category: "system",
    actionLink: {
      type: "page",
      targetId: "policies",
      label: "Xem chính sách"
    },
    createdAt: "01/12/2024 09:00",
    isRead: true,
  },
  {
    id: "NOTIF-004",
    title: "Mời bạn đánh giá chuyến đi cùng GearGo!",
    message: "Đơn thuê DT-DEMO-001 đã hoàn tất đối soát và hoàn cọc. Chia sẻ cảm nhận và ảnh dã ngoại để nhận voucher 10% nhé!",
    type: "info",
    targetRole: "customer",
    category: "order",
    actionLink: {
      type: "reviews",
      targetId: "DT-DEMO-001",
      label: "Viết đánh giá ngay"
    },
    createdAt: "20/11/2024 17:00",
    isRead: false,
  }
];
