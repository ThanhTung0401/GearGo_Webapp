import type { AppState } from "../../context/AppContext";
import type { TuVanBoDoBackend } from "../../services/api";
import type { SuggestedItem } from "./aiAdvisorPresets";
import { AIAdvisorItemsList } from "./ai/AIAdvisorItemsList";
import { AIAdvisorSummaryActions } from "./ai/AIAdvisorSummaryActions";
import { AIAdvisorAuthModal } from "./ai/AIAdvisorAuthModal";

export interface AIAdvisorResultPanelProps {
  app: AppState;
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

/**
 * Panel hiển thị kết quả đề xuất combo AI / Preset kèm modal yêu cầu đăng nhập (UC2.4 & UC2.4.2).
 */
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
          <AIAdvisorItemsList
            advisorMode={advisorMode}
            destination={destination}
            people={people}
            numNights={numNights}
            customItems={customItems}
            setCustomItems={setCustomItems}
            generateAISuggestion={generateAISuggestion}
            handleUpdateQty={handleUpdateQty}
            handleRemoveItem={handleRemoveItem}
            handleAddExtraProduct={handleAddExtraProduct}
            showAddMoreModal={showAddMoreModal}
            setShowAddMoreModal={setShowAddMoreModal}
            products={app.products}
          />

          <AIAdvisorSummaryActions
            numNights={numNights}
            targetBudget={targetBudget}
            customItems={customItems}
            totalRental={totalRental}
            totalDeposit={totalDeposit}
            totalInitial={totalInitial}
            aiResponse={aiResponse}
            advisorError={advisorError}
            addedAllNotice={addedAllNotice}
            addingToCart={addingToCart}
            scheduleConflict={scheduleConflict}
            setScheduleConflict={setScheduleConflict}
            handleAddAllToCart={handleAddAllToCart}
            onGoToCart={() => app.setPage("cart")}
            onResetInput={() => setSent(false)}
          />
        </div>
      )}

      {/* ─── MODAL YÊU CẦU ĐĂNG NHẬP ĐỐI VỚI KHÁCH VÃNG LAI (UC2.4.2) ─── */}
      {showAuthModal && (
        <AIAdvisorAuthModal
          itemCount={customItems.length}
          onLogin={() => {
            setShowAuthModal(false);
            app.setPage("login");
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}
