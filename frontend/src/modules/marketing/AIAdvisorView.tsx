import Icon from "../../components/Icon";
import { AIAdvisorResultPanel } from "./AIAdvisorResultPanel";
import { useAIAdvisor } from "./ai/useAIAdvisor";
import { AIAdvisorForm } from "./ai/AIAdvisorForm";
import { AIAdvisorPresets } from "./ai/AIAdvisorPresets";

/**
 * Trang Trợ lý AI tư vấn bộ đồ cắm trại & Combo mẫu (UC2.4, UC2.4.1, UC2.4.2).
 */
export function AIAdvisorView() {
  const vm = useAIAdvisor();

  return (
    <div className="customer-container cp-container cp-container--980">
      {/* Hero Header */}
      <div className="advisor-hero cp-ai-hero">
        <div className="flex items-center gap-3 mb-2">
          <div className="cp-ai-hero-icon">
            <Icon name="tent" size={26} />
          </div>
          <div>
            <div className="cp-ai-hero-eyebrow">
              GearGo Smart Gear Planner · UC2.4 & UC2.4.1
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl cp-ai-hero-title">
              Trợ lý AI tư vấn bộ đồ cắm trại & Combo mẫu
            </h1>
          </div>
        </div>
        <p className="cp-ai-hero-desc">
          Đề xuất danh mục thiết bị tối ưu theo điểm đến, quy mô đoàn và ngân sách dự kiến của bạn. Bạn hoàn toàn có thể tùy chỉnh thêm bớt từng món trước khi đưa vào giỏ thuê.
        </p>

        {/* Tab chuyển đổi chế độ tư vấn (AI vs Presets - UC2.4.1) */}
        <div className="flex gap-2 mt-5 cp-ai-tabs">
          <button
            type="button"
            onClick={() => { vm.setAdvisorMode("ai"); vm.setSent(false); vm.setAdvisorError(""); }}
            className={`cp-ai-tab ${vm.advisorMode === "ai" ? "is-active" : ""}`}
          >
            🤖 AI tư vấn thông minh
          </button>
          <button
            type="button"
            onClick={() => { vm.setAdvisorMode("presets"); vm.setSent(false); vm.setAdvisorError(""); }}
            className={`cp-ai-tab ${vm.advisorMode === "presets" ? "is-active" : ""}`}
          >
            📦 Bộ combo mẫu có sẵn (UC2.4.1)
          </button>
        </div>
      </div>

      {/* ─── CHẾ ĐỘ 1: AI TƯ VẤN THÔNG MINH ─── */}
      {vm.advisorMode === "ai" && !vm.sent && (
        <AIAdvisorForm
          tripTerrain={vm.tripTerrain}
          setTripTerrain={vm.setTripTerrain}
          destination={vm.destination}
          setDestination={vm.setDestination}
          people={vm.people}
          setPeople={vm.setPeople}
          nights={vm.nights}
          setNights={vm.setNights}
          budget={vm.budget}
          setBudget={vm.setBudget}
          numPeople={vm.numPeople}
          advisorError={vm.advisorError}
          isAnalyzing={vm.isAnalyzing}
          analysisStep={vm.analysisStep}
          onStartAnalysis={vm.handleStartAIAnalysis}
        />
      )}

      {/* ─── CHẾ ĐỘ 2: BỘ COMBO MẪU CÓ SẴN (PRESET COMBOS - FALLBACK UC2.4.1) ─── */}
      {vm.advisorMode === "presets" && !vm.sent && (
        <AIAdvisorPresets onSelectPreset={vm.handleSelectPreset} />
      )}

      <AIAdvisorResultPanel
        app={vm.app}
        sent={vm.sent}
        setSent={vm.setSent}
        advisorMode={vm.advisorMode}
        destination={vm.destination}
        people={vm.people}
        numNights={vm.numNights}
        targetBudget={vm.targetBudget}
        customItems={vm.customItems}
        setCustomItems={vm.setCustomItems}
        generateAISuggestion={vm.generateAISuggestion}
        handleUpdateQty={vm.handleUpdateQty}
        handleRemoveItem={vm.handleRemoveItem}
        handleAddExtraProduct={vm.handleAddExtraProduct}
        showAddMoreModal={vm.showAddMoreModal}
        setShowAddMoreModal={vm.setShowAddMoreModal}
        totalRental={vm.totalRental}
        totalDeposit={vm.totalDeposit}
        totalInitial={vm.totalInitial}
        aiResponse={vm.aiResponse}
        advisorError={vm.advisorError}
        addedAllNotice={vm.addedAllNotice}
        addingToCart={vm.addingToCart}
        scheduleConflict={vm.scheduleConflict}
        setScheduleConflict={vm.setScheduleConflict}
        handleAddAllToCart={vm.handleAddAllToCart}
        showAuthModal={vm.showAuthModal}
        setShowAuthModal={vm.setShowAuthModal}
      />
    </div>
  );
}
