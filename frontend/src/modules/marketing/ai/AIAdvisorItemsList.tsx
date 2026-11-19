import { fmt, type Product } from "../../../store";
import type { SuggestedItem } from "../aiAdvisorPresets";

interface AIAdvisorItemsListProps {
  advisorMode: "ai" | "presets";
  destination: string;
  people: string;
  numNights: number;
  customItems: SuggestedItem[];
  setCustomItems: (v: SuggestedItem[]) => void;
  generateAISuggestion: () => SuggestedItem[];
  handleUpdateQty: (productId: string, delta: number) => void;
  handleRemoveItem: (productId: string) => void;
  handleAddExtraProduct: (prodId: string) => void;
  showAddMoreModal: boolean;
  setShowAddMoreModal: (v: boolean) => void;
  products: Product[];
}

/**
 * Hiển thị đầu mục kết quả, danh sách thiết bị gợi ý có stepper chỉnh số lượng/xóa món và ngăn kéo thêm thiết bị ngoài (UC2.4 bước 5).
 */
export function AIAdvisorItemsList({
  advisorMode,
  destination,
  people,
  numNights,
  customItems,
  setCustomItems,
  generateAISuggestion,
  handleUpdateQty,
  handleRemoveItem,
  handleAddExtraProduct,
  showAddMoreModal,
  setShowAddMoreModal,
  products,
}: AIAdvisorItemsListProps) {
  return (
    <>
      {/* Header kết quả */}
      <div className="card-panel-muted cp-ai-result-header">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="cp-ai-result-heading">
            <strong>
              {advisorMode === "ai" ? "🤖 Gợi ý từ trợ lý AI GearGo" : "📦 Combo mẫu đã chọn"}
            </strong>
            : Chuyến đi <strong>{destination}</strong> ({people} người, {numNights} ngày thuê).
          </div>
          <span className="cp-ai-result-badge">
            ✓ Đã đối chiếu kho đồ sẵn có
          </span>
        </div>
        <div className="cp-ai-result-tip">
          💡 <em>Quý khách có thể tăng/giảm số lượng hoặc xóa món không cần thiết ở danh sách bên dưới.</em>
        </div>
      </div>

      {/* Danh sách các món trong combo (Interactive Stepper & Remove - UC2.4 bước 5) */}
      <div className="flex flex-col gap-3 mb-5">
        {customItems.length === 0 ? (
          <div className="cp-ai-empty-kit">
            <p className="cp-ai-empty-kit-text">Quý khách đã xóa hết thiết bị khỏi bộ gợi ý.</p>
            <button
              type="button"
              onClick={() => setCustomItems(generateAISuggestion())}
              className="btn btn-secondary btn-sm"
            >
              ↺ Khôi phục combo gợi ý ban đầu
            </button>
          </div>
        ) : (
          customItems.map((item) => {
            const itemRental = item.pricePerDay * item.qty * numNights;
            const itemDeposit = item.deposit * item.qty;

            return (
              <div
                key={item.productId}
                className="cart-item-card cp-ai-item-card"
              >
                {/* Thông tin món & Lý do chọn */}
                <div className="cp-ai-item-info">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="cp-ai-item-cat">
                      {item.category}
                    </span>
                    <div className="cp-ai-item-name">
                      {item.name}
                    </div>
                  </div>
                  <div className="cp-ai-item-reason">
                    ✨ {item.reason}
                  </div>
                  <div className="cp-ai-item-rate">
                    Đơn giá: {fmt(item.pricePerDay)}/ngày · Cọc: {fmt(item.deposit)}/chiếc
                  </div>
                </div>

                {/* Bộ chỉnh số lượng (+ / −) & Thành tiền */}
                <div className="flex items-center gap-5">
                  <div className="cp-ai-item-price-col">
                    <div className="cp-ai-item-rental">
                      Thuê: {fmt(itemRental)}
                    </div>
                    <div className="cp-ai-item-deposit">
                      Cọc: {fmt(itemDeposit)}
                    </div>
                  </div>

                  {/* Stepper (+ / −) */}
                  <div className="flex items-center gap-1 cp-ai-stepper">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, -1)}
                      disabled={item.qty <= 1}
                      className="cp-ai-qty-btn"
                    >
                      −
                    </button>
                    <span className="cp-ai-qty-val">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, 1)}
                      className="cp-ai-qty-btn"
                    >
                      +
                    </button>
                  </div>

                  {/* Nút xóa khỏi combo */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.productId)}
                    title="Xóa món này khỏi combo"
                    className="cp-ai-remove-btn"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Nút bổ sung thêm thiết bị ngoài vào combo */}
      <div className="cp-ai-add-extra-wrap">
        <button
          type="button"
          onClick={() => setShowAddMoreModal(!showAddMoreModal)}
          className="cp-ai-add-extra-toggle"
        >
          ➕ Thêm thiết bị khác từ kho GearGo vào combo này
        </button>

        {/* Menu phụ thêm đồ */}
        {showAddMoreModal && (
          <div className="cp-ai-extra-drawer">
            <div className="cp-ai-extra-drawer-title">
              Chọn thiết bị sẵn có trong kho:
            </div>
            <div className="flex gap-2 flex-wrap">
              {products
                .filter((p) => !customItems.some((ci) => ci.productId === p.id) && p.status === "active")
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddExtraProduct(p.id)}
                    className="cp-ai-extra-chip"
                  >
                    + {p.name} ({fmt(p.pricePerDay)}/ngày)
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
