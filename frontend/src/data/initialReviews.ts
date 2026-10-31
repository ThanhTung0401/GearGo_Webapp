import type { Review } from "../types";

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "REV-001",
    orderId: "DT-DEMO-001",
    productId: "P001",
    productName: "Lều 4 người – Tiêu chuẩn",
    customerId: "KH002",
    customerName: "Nguyễn Văn An",
    rating: 5,
    comment: "Lều rất chắc chắn, chống mưa tốt trong chuyến đi Ba Vì. Đầy đủ cọc và dây chằng phụ kiện, khung nhôm nhẹ dễ dựng.",
    images: [
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=500&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=500&auto=format&fit=crop"
    ],
    createdAt: "20/11/2024 16:30",
    status: "active",
    verifiedRental: true,
    storeResponse: {
      response: "Cảm ơn quý khách đã tin tưởng dịch vụ của GearGo! Chúc bạn luôn có những chuyến camping tuyệt vời.",
      respondedAt: "21/11/2024 09:15",
      respondedBy: "CSKH Mai"
    }
  },
  {
    id: "REV-002",
    orderId: "DT-DEMO-001",
    productId: "P003",
    productName: "Đèn cắm trại LED siêu sáng",
    customerId: "KH002",
    customerName: "Nguyễn Văn An",
    rating: 4,
    comment: "Đèn sáng tốt, pin dùng cả đêm, cầm vừa tay và móc treo tiện lợi trên nóc lều.",
    images: [
      "https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=500&auto=format&fit=crop"
    ],
    createdAt: "20/11/2024 16:35",
    status: "active",
    verifiedRental: true,
  },
  {
    id: "REV-003",
    orderId: "DT-20241210-042",
    productId: "P001",
    productName: "Lều 4 người – Tiêu chuẩn",
    customerId: "KH003",
    customerName: "Lê Thị Bích Ngọc",
    rating: 1,
    comment: "Sản phẩm bị bẩn bên trong và nhân viên giao hàng trễ 15 phút.",
    createdAt: "12/12/2024 10:15",
    status: "active",
    verifiedRental: true,
    storeResponse: {
      response: "GearGo thành thật xin lỗi chị Ngọc về sự cố vệ sinh. Chúng tôi đã tiến hành bảo dưỡng khử khuẩn lại toàn bộ lô lều và gửi tặng chị mã giảm 20% cho chuyến đi tới.",
      respondedAt: "12/12/2024 11:00",
      respondedBy: "Quản trị viên"
    }
  }
];
