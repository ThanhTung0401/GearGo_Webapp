# GearGo Design System (DESIGN.md)

Hệ thống thiết kế chuẩn hóa cho nền tảng thuê thiết bị cắm trại và dã ngoại GearGo, tuân theo triết lý Impeccable Craft.

## 1. Brand Identity & Atmosphere
- **Phong cách chủ đạo:** Nature-Tech / Modern Outdoorsman (lấy cảm hứng từ Patagonia, Arc'teryx, Snow Peak kết hợp sự tiện lợi của Airbnb).
- **Cảm xúc mang lại:** Đáng tin cậy, thám hiểm, ấm cúng, tinh tế và cao cấp.
- **Tránh xa:** Màu sắc AI generic (xanh neon, tím gradient vô nghĩa, xám mờ nhạt), các đường viền tab dày ở cạnh trái thẻ (side-tab tell), font chữ Inter đại trà.

## 2. Typography
- **Display / Heading:** `Outfit`, sans-serif (tỉ lệ hình học hiện đại, phóng khoáng, dứt khoát).
- **Body / Interface:** `Be Vietnam Pro`, sans-serif (tối ưu hóa hoàn hảo cho dấu tiếng Việt, độ cao x-height chuẩn, dễ đọc trên mọi kích thước).
- **Mono / Data & Price:** `Outfit` / font số monospace cân đối.

## 3. Color Tokens
- **Primary / Forest Green:** `#183D2D` (Màu xanh rừng bạt ngàn, đại diện cho thiên nhiên và sự vững chãi).
- **Secondary / Moss:** `#2D6A4F` (Xanh rêu điểm xuyết các thành phần tương tác phụ).
- **Accent / Warm Amber:** `#E07A43` (Màu ánh lửa trại buổi tối, dùng cho CTA chính, badge nổi bật).
- **Background / Cream & Sand:**
  - Base: `#F8F6F0` (Nền giấy parchment dịu mắt, tránh màu trắng chói `#FFFFFF` toàn diện).
  - Surface: `#FFFFFF` (Bề mặt thẻ card có bóng mờ tinh tế).
  - Surface Muted: `#F0EBE1` (Khu vực phân vùng thứ cấp).
- **Border / Bone:** `#E2DDD1` (Đường viền mảnh, tiệp màu tự nhiên).
- **Text / Charcoal:** `#14261C` (Màu chữ đen ánh xanh lá sâu, độ tương phản cao đạt chuẩn WCAG AAA).

## 4. Components & Elevation
- **Cards:** Bo góc `16px`, viền `1px solid var(--color-bone)`, hiệu ứng hover nâng nhẹ `translateY(-3px)` với đổ bóng khuếch tán mềm.
- **Booking Bar:** Thanh đặt ngày nổi dạng floating dock bo góc lớn (`20px`), kết hợp hiệu ứng kính mờ `backdrop-filter: blur(12px)`.
- **Badges:** Dạng viên thuốc tròn (pill) nhỏ nhắn, nền màu nhạt pha 15% opacity + chữ đậm tương phản cao.
- **No Side-Tab Anti-Patterns:** Sử dụng card padding và accent icon thay vì viền border-left dày.
