import { useApp } from "../../context/AppContext";
import Icon from "../../components/Icon";

export default function PublicFooter() {
  const { setPage } = useApp();

  return (
    <footer className="site-footer bg-[#132A1F] text-white pt-12 pb-8 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-sm">
        {/* Brand Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-amber)] text-white flex items-center justify-center">
              <Icon name="tent" size={18} />
            </div>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl text-white">
              GearGo
            </span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed max-w-xs">
            Dịch vụ thuê thiết bị dã ngoại và cắm trại cao cấp. Trải nghiệm thiên nhiên trọn vẹn, không lo chi phí đầu tư ban đầu.
          </p>
        </div>

        {/* Store Info */}
        <div>
          <h4 className="font-bold text-white text-sm mb-3">Cửa hàng chính</h4>
          <p className="text-gray-300 text-xs leading-relaxed">
            128 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh<br />
            Mở cửa: 08:00 – 20:00 (Hàng ngày)<br />
            Hotline: 0901 234 567
          </p>
        </div>

        {/* Explore Links */}
        <div>
          <h4 className="font-bold text-white text-sm mb-3">Khám phá</h4>
          <ul className="space-y-2 text-xs text-gray-300">
            <li>
              <button onClick={() => setPage("products")} className="hover:text-white hover:underline cursor-pointer">
                Danh mục thiết bị thuê
              </button>
            </li>
            <li>
              <button onClick={() => setPage("ai-advisor")} className="hover:text-white hover:underline cursor-pointer">
                Tư vấn bộ đồ dã ngoại AI
              </button>
            </li>
            <li>
              <button onClick={() => setPage("my-orders")} className="hover:text-white hover:underline cursor-pointer">
                Tra cứu & theo dõi đơn thuê
              </button>
            </li>
          </ul>
        </div>

        {/* Policy Links */}
        <div>
          <h4 className="font-bold text-white text-sm mb-3">Chính sách thuê</h4>
          <ul className="space-y-2 text-xs text-gray-300">
            <li>
              <button onClick={() => setPage("landing")} className="hover:text-white hover:underline cursor-pointer">
                Quy trình & hướng dẫn thuê đồ
              </button>
            </li>
            <li>
              <button onClick={() => setPage("landing")} className="hover:text-white hover:underline cursor-pointer">
                Chính sách cọc & bồi thường
              </button>
            </li>
            <li>
              <button onClick={() => setPage("landing")} className="hover:text-white hover:underline cursor-pointer">
                Quy định hủy đơn & hoàn tiền
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
        <div>© 2026 GearGo Outdoor Equipment. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>Bảo mật</span>
          <span>Điều khoản</span>
          <span>Hỗ trợ</span>
        </div>
      </div>
    </footer>
  );
}
