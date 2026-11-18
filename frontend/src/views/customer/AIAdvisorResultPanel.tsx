import { useApp } from "../../App";
import { fmt } from "../../store";
import Icon from "../../components/Icon";
import { type TuVanBoDoBackend } from "../../services/api";
import { type SuggestedItem } from "./aiAdvisorPresets";

interface AIAdvisorResultPanelProps {
  app: ReturnType<typeof useApp>;
  sent: boolean;
  setSent: (v: boolean) => void;
  advisorMode: "ai" | "presets";
  destination: string;
  people: string;
  numNights: number;
  targetBudget: number;
  customItems: SuggestedItem[];
  setCustomItems: (v: SuggestedItem[]) => void;
  generateAISuggestion: () => SuggestedItem[];
  handleUpdateQty: (productId: string, delta: number) => void;
  handleRemoveItem: (productId: string) => void;
  handleAddExtraProduct: (prodId: string) => void;
  showAddMoreModal: boolean;
  setShowAddMoreModal: (v: boolean) => void;
  totalRental: number;
  totalDeposit: number;
  totalInitial: number;
  aiResponse: TuVanBoDoBackend | null;
  advisorError: string;
  addedAllNotice: boolean;
  addingToCart: boolean;
  scheduleConflict: { message: string; gioNhan: string; gioTra: string } | null;
  setScheduleConflict: (v: { message: string; gioNhan: string; gioTra: string } | null) => void;
  handleAddAllToCart: (conflictResolution?: "ThayThe" | "GiuHienTai") => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
}

export function AIAdvisorResultPanel(props: AIAdvisorResultPanelProps) {
  const {
    app,
    sent,
    setSent,
    advisorMode,
    destination,
    people,
    numNights,
    targetBudget,
    customItems,
    setCustomItems,
    generateAISuggestion,
    handleUpdateQty,
    handleRemoveItem,
    handleAddExtraProduct,
    showAddMoreModal,
    setShowAddMoreModal,
    totalRental,
    totalDeposit,
    totalInitial,
    aiResponse,
    advisorError,
    addedAllNotice,
    addingToCart,
    scheduleConflict,
    setScheduleConflict,
    handleAddAllToCart,
    showAuthModal,
    setShowAuthModal,
  } = props;
  return (
    <>
      {/* ─── KẾT QUẢ ĐỀ XUẤT (CÓ THỂ CHỈNH SỬA TRỰC TIẾP - UC2.4 BƯỚC 5) ─── */}
      {sent && (
        <div className="card-panel cp-card cp-card--lg cp-card--elevated">
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
                  {app.products
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

          {/* Cảnh báo ngân sách (nếu vượt) hoặc thông báo tiết kiệm */}
          {totalRental > targetBudget ? (
            <div className="policy-banner mb-4 cp-ai-budget-over">
              ⚠ Tổng tiền thuê dự kiến vượt ngân sách khoảng <strong>{fmt(totalRental - targetBudget)}</strong>. Bạn có thể bấm nút giảm số lượng hoặc xóa bớt thiết bị phụ.
            </div>
          ) : (
            <div className="cp-alert-success">
              ✓ Chi phí thuê nằm trọn vẹn trong ngân sách dự kiến (Tiết kiệm được {fmt(targetBudget - totalRental)}).
            </div>
          )}

          {/* Bảng tổng hợp chi phí dự kiến */}
          <div className="card-panel-muted cp-ai-totals-card">
            <div className="flex justify-between items-center font-bold text-sm mb-2">
              <span className="cp-ai-totals-label">Tổng tiền thuê dự kiến ({numNights} ngày · {customItems.reduce((s, i) => s + i.qty, 0)} món)</span>
              <span className="cp-ai-totals-rental">{fmt(totalRental)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
              <span>Tiền cọc bảo đảm (Hoàn lại 100% khi trả đồ)</span>
              <span className="cp-ai-totals-deposit">{fmt(totalDeposit)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-sm cp-ai-totals-divider">
              <span className="cp-ai-totals-label">Tổng chi phí ban đầu cần chuẩn bị</span>
              <span className="cp-ai-totals-grand">{fmt(totalInitial)}</span>
            </div>
            <div className="cp-ai-totals-note">
              📌 <em>Lưu ý: Báo giá tham khảo; tồn kho thực tế sẽ được xác nhận và giữ chỗ chính xác khi chuyển vào Giỏ thuê và chọn khung giờ nhận/trả.</em>
            </div>
          </div>

          {aiResponse?.nguonGoiY === "ComboMacDinh" && (
            <div className="cp-alert-info">
              Đang hiển thị bộ combo chuẩn đề xuất tự động từ kho GearGo (UC2.4.1 Fallback).
            </div>
          )}

          {aiResponse?.thongBaoPhanThieu && (
            <div className="cp-alert-warning--amber">
              Lưu ý tồn kho từ hệ thống: {aiResponse.thongBaoPhanThieu}
            </div>
          )}

          {advisorError && (
            <div role="alert" className="cp-alert-error cp-alert-error--panel">
              {advisorError}
            </div>
          )}

          {scheduleConflict && (
            <div className="cp-alert-warning--conflict">
              <div className="font-bold mb-1">Xung đột khung giờ với giỏ thuê hiện tại</div>
              <p className="mb-3">{scheduleConflict.message}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={addingToCart}
                  onClick={() => void handleAddAllToCart("ThayThe")}
                  className="btn btn-primary btn-sm"
                >
                  Thay thế lịch giỏ bằng lịch combo
                </button>
                <button
                  type="button"
                  disabled={addingToCart}
                  onClick={() => void handleAddAllToCart("GiuHienTai")}
                  className="btn btn-secondary btn-sm"
                >
                  Giữ nguyên lịch giỏ hiện tại
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleConflict(null)}
                  className="btn btn-ghost btn-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Banner thông báo thêm thành công */}
          {addedAllNotice && (
            <div className="badge badge-success p-3 rounded-lg text-center w-full mb-4 cp-ai-added-notice">
              ✓ Đã thêm toàn bộ {customItems.length} thiết bị vào giỏ thuê thành công!
            </div>
          )}

          {/* Nhóm nút hành động */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => void handleAddAllToCart()}
              disabled={customItems.length === 0 || addingToCart}
              className="btn btn-accent btn-md cp-ai-add-all-btn"
            >
              {addingToCart ? "Đang đưa vào giỏ..." : `+ Thêm toàn bộ vào giỏ thuê (${customItems.reduce((s, i) => s + i.qty, 0)} món)`}
            </button>
            <button
              type="button"
              onClick={() => app.setPage("cart")}
              className="btn btn-primary btn-md cp-ai-goto-cart-btn"
            >
              Xem giỏ thuê →
            </button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn btn-secondary btn-md cp-ai-reset-btn"
            >
              ← Nhập lại nhu cầu
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL YÊU CẦU ĐĂNG NHẬP ĐỐI VỚI KHÁCH VÃNG LAI (UC2.4.2) ─── */}
      {showAuthModal && (
        <div className="cp-modal-overlay">
          <div className="cp-modal-box cp-modal-box--460-lg">
            <div className="cp-modal-auth-icon cp-modal-auth-icon--lg">
              <Icon name="user" size={26} />
            </div>
            <h3 className="cp-modal-auth-title cp-modal-auth-title--lg">
              Yêu cầu đăng nhập tài khoản
            </h3>
            <p className="cp-modal-auth-desc cp-modal-auth-desc--lg">
              Theo quy định <strong>UC2.4.2</strong>, khách vãng lai cần đăng nhập để lưu danh mục thiết bị gợi ý vào giỏ thuê cá nhân và đồng bộ lịch trình.
            </p>

            <div className="cp-modal-auth-tip">
              💡 <em>Đăng nhập chỉ mất 10 giây. Toàn bộ {customItems.length} món bạn đã tùy chỉnh sẽ được lưu giữ nguyên vẹn.</em>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  app.setPage("login");
                }}
                className="btn btn-primary cp-modal-btn-primary cp-modal-btn-primary--lg"
              >
                Đăng nhập / Đăng ký ngay →
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn btn-secondary cp-modal-btn-secondary cp-modal-btn-secondary--lg"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
