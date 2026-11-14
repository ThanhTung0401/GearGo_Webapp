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
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          {/* Header kết quả */}
          <div className="card-panel-muted" style={{ padding: "16px 20px", borderRadius: 12, marginBottom: 20, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div style={{ fontSize: "0.88rem", color: "#166534" }}>
                <strong>
                  {advisorMode === "ai" ? "🤖 Gợi ý từ trợ lý AI GearGo" : "📦 Combo mẫu đã chọn"}
                </strong>
                : Chuyến đi <strong>{destination}</strong> ({people} người, {numNights} ngày thuê).
              </div>
              <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>
                ✓ Đã đối chiếu kho đồ sẵn có
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: 4 }}>
              💡 <em>Quý khách có thể tăng/giảm số lượng hoặc xóa món không cần thiết ở danh sách bên dưới.</em>
            </div>
          </div>

          {/* Danh sách các món trong combo (Interactive Stepper & Remove - UC2.4 bước 5) */}
          <div className="flex flex-col gap-3 mb-5">
            {customItems.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", background: "var(--color-parchment)", borderRadius: 12, color: "#6B7280" }}>
                <p style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>Quý khách đã xóa hết thiết bị khỏi bộ gợi ý.</p>
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
                    className="cart-item-card"
                    style={{
                      background: "white",
                      border: "1px solid var(--color-bone)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Thông tin món & Lý do chọn */}
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: "0.7rem", padding: "1px 7px", borderRadius: 4, background: "var(--color-parchment)", color: "var(--color-moss)", fontWeight: 700 }}>
                          {item.category}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-bark)" }}>
                          {item.name}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#4B5563", margin: "4px 0" }}>
                        ✨ {item.reason}
                      </div>
                      <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#6B7280" }}>
                        Đơn giá: {fmt(item.pricePerDay)}/ngày · Cọc: {fmt(item.deposit)}/chiếc
                      </div>
                    </div>

                    {/* Bộ chỉnh số lượng (+ / −) & Thành tiền */}
                    <div className="flex items-center gap-5">
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-forest)", fontFamily: "var(--font-mono)" }}>
                          Thuê: {fmt(itemRental)}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>
                          Cọc: {fmt(itemDeposit)}
                        </div>
                      </div>

                      {/* Stepper (+ / −) */}
                      <div className="flex items-center gap-1" style={{ background: "var(--color-parchment)", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--color-bone)" }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, -1)}
                          disabled={item.qty <= 1}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: "none",
                            background: "white",
                            cursor: item.qty <= 1 ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            color: item.qty <= 1 ? "#D1D5DB" : "var(--color-bark)",
                          }}
                        >
                          −
                        </button>
                        <span style={{ width: 28, textAlign: "center", fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: "none",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 700,
                            color: "var(--color-bark)",
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Nút xóa khỏi combo */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        title="Xóa món này khỏi combo"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#EF4444",
                          padding: "6px",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                        }}
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
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setShowAddMoreModal(!showAddMoreModal)}
              style={{
                background: "none",
                border: "1px dashed var(--color-forest)",
                color: "var(--color-forest)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              ➕ Thêm thiết bị khác từ kho GearGo vào combo này
            </button>

            {/* Menu phụ thêm đồ */}
            {showAddMoreModal && (
              <div style={{ marginTop: 10, padding: 14, background: "var(--color-parchment)", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
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
                        style={{
                          fontSize: "0.78rem",
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "white",
                          border: "1px solid var(--color-bone)",
                          cursor: "pointer",
                        }}
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
            <div className="policy-banner mb-4" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "12px 16px", borderRadius: 10, fontSize: "0.82rem", color: "#92400E" }}>
              ⚠ Tổng tiền thuê dự kiến vượt ngân sách khoảng <strong>{fmt(totalRental - targetBudget)}</strong>. Bạn có thể bấm nút giảm số lượng hoặc xóa bớt thiết bị phụ.
            </div>
          ) : (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", color: "#065F46", marginBottom: 16 }}>
              ✓ Chi phí thuê nằm trọn vẹn trong ngân sách dự kiến (Tiết kiệm được {fmt(targetBudget - totalRental)}).
            </div>
          )}

          {/* Bảng tổng hợp chi phí dự kiến */}
          <div className="card-panel-muted" style={{ padding: "18px 20px", borderRadius: 12, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", marginBottom: 20 }}>
            <div className="flex justify-between items-center font-bold text-sm mb-2">
              <span style={{ color: "var(--color-bark)" }}>Tổng tiền thuê dự kiến ({numNights} ngày · {customItems.reduce((s, i) => s + i.qty, 0)} món)</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "1.1rem" }}>{fmt(totalRental)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
              <span>Tiền cọc bảo đảm (Hoàn lại 100% khi trả đồ)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(totalDeposit)}</span>
            </div>
            <div style={{ borderTop: "1px dashed var(--color-bone)", paddingTop: 8, marginTop: 8 }} className="flex justify-between items-center font-bold text-sm">
              <span style={{ color: "var(--color-bark)" }}>Tổng chi phí ban đầu cần chuẩn bị</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-amber)", fontSize: "1.15rem" }}>{fmt(totalInitial)}</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 8, lineHeight: 1.4 }}>
              📌 <em>Lưu ý: Báo giá tham khảo; tồn kho thực tế sẽ được xác nhận và giữ chỗ chính xác khi chuyển vào Giỏ thuê và chọn khung giờ nhận/trả.</em>
            </div>
          </div>

          {aiResponse?.nguonGoiY === "ComboMacDinh" && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "10px 14px", borderRadius: 10, fontSize: "0.8rem", color: "#1E40AF", marginBottom: 12 }}>
              Đang hiển thị bộ combo chuẩn đề xuất tự động từ kho GearGo (UC2.4.1 Fallback).
            </div>
          )}

          {aiResponse?.thongBaoPhanThieu && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", padding: "10px 14px", borderRadius: 10, fontSize: "0.8rem", color: "#92400E", marginBottom: 12 }}>
              Lưu ý tồn kho từ hệ thống: {aiResponse.thongBaoPhanThieu}
            </div>
          )}

          {advisorError && (
            <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "10px 14px", borderRadius: 10, fontSize: "0.8rem", color: "#B91C1C", marginBottom: 12 }}>
              {advisorError}
            </div>
          )}

          {scheduleConflict && (
            <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", padding: "12px 16px", borderRadius: 12, fontSize: "0.82rem", color: "#92400E", marginBottom: 14 }}>
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
            <div className="badge badge-success p-3 rounded-lg text-center w-full mb-4" style={{ background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", fontWeight: 700 }}>
              ✓ Đã thêm toàn bộ {customItems.length} thiết bị vào giỏ thuê thành công!
            </div>
          )}

          {/* Nhóm nút hành động */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => void handleAddAllToCart()}
              disabled={customItems.length === 0 || addingToCart}
              className="btn btn-accent btn-md"
              style={{
                flex: 1,
                minWidth: 200,
                padding: "13px 20px",
                fontWeight: 700,
                borderRadius: 10,
                background: "var(--color-forest)",
                color: "white",
                border: "none",
                cursor: customItems.length === 0 || addingToCart ? "not-allowed" : "pointer",
              }}
            >
              {addingToCart ? "Đang đưa vào giỏ..." : `+ Thêm toàn bộ vào giỏ thuê (${customItems.reduce((s, i) => s + i.qty, 0)} món)`}
            </button>
            <button
              type="button"
              onClick={() => app.setPage("cart")}
              className="btn btn-primary btn-md"
              style={{ padding: "13px 20px", fontWeight: 700, borderRadius: 10 }}
            >
              Xem giỏ thuê →
            </button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn btn-secondary btn-md"
              style={{ padding: "13px 18px", borderRadius: 10 }}
            >
              ← Nhập lại nhu cầu
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL YÊU CẦU ĐĂNG NHẬP ĐỐI VỚI KHÁCH VÃNG LAI (UC2.4.2) ─── */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              maxWidth: 460,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--color-bone)",
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EFF6FF", color: "#1D4ED8", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Icon name="user" size={26} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", textAlign: "center", margin: "0 0 8px" }}>
              Yêu cầu đăng nhập tài khoản
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", textAlign: "center", lineHeight: 1.5, margin: "0 0 20px" }}>
              Theo quy định <strong>UC2.4.2</strong>, khách vãng lai cần đăng nhập để lưu danh mục thiết bị gợi ý vào giỏ thuê cá nhân và đồng bộ lịch trình.
            </p>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: "0.78rem", color: "#6B7280" }}>
              💡 <em>Đăng nhập chỉ mất 10 giây. Toàn bộ {customItems.length} món bạn đã tùy chỉnh sẽ được lưu giữ nguyên vẹn.</em>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  app.setPage("login");
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: "12px", borderRadius: 10, fontWeight: 700 }}
              >
                Đăng nhập / Đăng ký ngay →
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn btn-secondary"
                style={{ padding: "12px 16px", borderRadius: 10 }}
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
