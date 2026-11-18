import { fmt, type Product } from "../../store";

interface ProductDetailTabsProps {
  product: Product;
  detailTab: "specs" | "accessories" | "policy";
  setDetailTab: (tab: "specs" | "accessories" | "policy") => void;
}

const DETAIL_TABS = [
  { id: "specs" as const, label: "📋 Thông số kỹ thuật chi tiết", badge: "Chuẩn thiết bị" },
  { id: "accessories" as const, label: "🎒 Phụ kiện bàn giao kèm theo", badge: "Checklist tại quầy" },
  { id: "policy" as const, label: "🛡️ Chính sách nhận trả & bảo đảm cọc", badge: "Minh bạch 100%" },
];

/**
 * Khối Tabs chi tiết sản phẩm: Thông số kỹ thuật, Phụ kiện bàn giao kèm theo và Chính sách nhận trả (UC2.2 & UC8.1).
 */
export function ProductDetailTabs({ product: p, detailTab, setDetailTab }: ProductDetailTabsProps) {
  return (
    <div className="lp-tabs-card">
      <div className="flex border-b border-gray-200 lp-tabs-bar">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDetailTab(t.id)}
            className={`lp-tab-btn${detailTab === t.id ? " is-active" : ""}`}
          >
            <span>{t.label}</span>
            <span className="lp-tab-badge">
              {t.badge}
            </span>
          </button>
        ))}
      </div>

      <div className="lp-tabs-body">
        {detailTab === "specs" && (
          <div>
            <h3 className="lp-tab-heading">
              Thông số chi tiết sản phẩm {p.name}
            </h3>
            <div className="grid gap-3 lp-specs-grid">
              {[
                { label: "Kích thước sử dụng", value: p.dimensions || (p.capacity === "4 người" ? "240 × 210 × 140 cm" : "210 × 150 × 115 cm") },
                { label: "Kích thước gấp gọn", value: p.specifications?.["Gấp gọn"] || "58 × 16 × 16 cm (trong túi đựng)" },
                { label: "Trọng lượng trọn bộ", value: p.specifications?.["Trọng lượng"] || (p.category === "Lều trại" ? "3.6 kg" : p.category === "Đèn" ? "280g" : "1.2 kg") },
                { label: "Chất liệu khung & vỏ", value: p.specifications?.["Chất liệu"] || "Vải Polyester 210T tráng bạc chống tia UV50+, khung nhôm 7001" },
                { label: "Chỉ số chống nước", value: p.specifications?.["Chống nước"] || "PU 3000mm (chịu được mưa rào lớn)" },
                { label: "Xuất xứ & Phân phối", value: `Chính hãng ${p.brand} · Nhập khẩu & bảo dưỡng bởi GearGo` },
                { label: "Mức giá trị bồi thường tối đa", value: `${fmt(p.compensation)} (khi làm mất hoặc hỏng hoàn toàn thiết bị)` },
                { label: "Chu kỳ bảo dưỡng kỹ thuật", value: "Kiểm tra khử khuẩn, tra dầu & test khung sau mỗi lần nhận trả đồ" },
              ].map((s, idx) => (
                <div key={idx} className="lp-spec-card">
                  <div className="lp-spec-label">{s.label}</div>
                  <div className="lp-spec-value">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === "accessories" && (
          <div>
            <h3 className="lp-tab-heading lp-tab-heading--sm">
              Danh mục phụ kiện kèm theo khi bàn giao (Checklist nghiệm thu)
            </h3>
            <p className="lp-tab-sub">
              Quý khách và nhân viên sẽ cùng kiểm đếm số lượng các chi tiết này tại quầy theo biên bản BBBG trước khi mang về:
            </p>
            <div className="grid gap-3 lp-specs-grid">
              {[
                { name: "Túi đựng chuyên dụng có quai xách", qty: "1 chiếc", note: "Nguyên vẹn, khóa kéo mượt" },
                { name: p.category === "Lều trại" ? "Thân lều chính & Lớp phủ nóc chống mưa" : "Thân thiết bị chính nguyên bản", qty: "1 bộ", note: "Không rách, sạch sẽ, thơm tho" },
                { name: p.category === "Lều trại" ? "Bộ cọc ghim đất chống lốc gió" : "Dây sạc / Phụ kiện nguồn", qty: p.category === "Lều trại" ? "8 - 12 chiếc" : "1 sợi Type-C", note: "Thép cứng cáp, không cong vênh" },
                { name: p.category === "Lều trại" ? "Khung nhôm hợp kim dựng chính" : "Hộp bảo vệ chống sốc", qty: p.category === "Lều trại" ? "2 - 3 thanh gấp" : "1 chiếc", note: "Khớp nối đàn hồi tốt" },
                { name: "Dây dù phản quang buộc giằng chống gió", qty: "4 - 6 sợi", note: "Kèm khóa tăng giảm độ căng" },
                { name: "Tờ hướng dẫn dựng & gấp gọn đồ dã ngoại", qty: "1 bản", note: "Kèm mã QR xem video hướng dẫn" },
              ].map((acc, idx) => (
                <div key={idx} className="lp-acc-card">
                  <div className="lp-acc-check">
                    ✓
                  </div>
                  <div>
                    <div className="lp-acc-name">{acc.name}</div>
                    <div className="lp-acc-qty">Số lượng: {acc.qty}</div>
                    <div className="lp-acc-note">{acc.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === "policy" && (
          <div className="flex flex-col gap-3">
            <h3 className="lp-tab-heading lp-tab-heading--xs">
              Chính sách nhận trả & Bảo đảm cọc tại GearGo (UC8.1)
            </h3>
            <div className="grid gap-3 lp-policy-cols">
              <div className="lp-policy-box lp-policy-box--green">
                <div className="lp-policy-box-title">
                  🏠 Nhận và hoàn trả trực tiếp tại cửa hàng
                </div>
                <ul className="lp-policy-list">
                  <li><strong>Địa chỉ:</strong> 128 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP.HCM.</li>
                  <li><strong>Giờ làm việc:</strong> 08:00 – 20:00 tất cả các ngày trong tuần (kể cả Lễ, Tết).</li>
                  <li><strong>Nghiệm thu:</strong> Nhân viên hướng dẫn kiểm tra và thử thiết bị trước khi mang đi.</li>
                </ul>
              </div>

              <div className="lp-policy-box lp-policy-box--blue">
                <div className="lp-policy-box-title">
                  💳 Quy chế tiền cọc & Hoàn cọc tự động
                </div>
                <ul className="lp-policy-list">
                  <li><strong>Tiền cọc:</strong> Chỉ thu tạm ứng theo đơn vị chiếc, không tính theo ngày thuê.</li>
                  <li><strong>Hoàn cọc 100%:</strong> Chuyển khoản hoàn lại lập tức trong 5-15 phút sau khi nghiệm thu đồ nguyên vẹn.</li>
                  <li><strong>Biên lai điện tử:</strong> Biên bản nhận trả và phiếu hoàn cọc được gửi qua SMS / Email của quý khách.</li>
                </ul>
              </div>
            </div>

            <div className="lp-policy-warn">
              <strong>🔄 Chính sách hủy đơn & Phạt trễ hạn:</strong> Hủy miễn phí nếu báo trước &gt;48 giờ; hủy trong 24-48 giờ chịu phí 30%; trả đồ trễ hạn tính hệ số phạt 150% đơn giá ngày theo quy chế toàn hệ thống.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
