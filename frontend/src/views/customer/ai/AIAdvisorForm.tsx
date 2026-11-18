import type { TripTerrain } from "./useAIAdvisor";

interface AIAdvisorFormProps {
  tripTerrain: TripTerrain;
  setTripTerrain: (v: TripTerrain) => void;
  destination: string;
  setDestination: (v: string) => void;
  people: string;
  setPeople: (v: string) => void;
  nights: string;
  setNights: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  numPeople: number;
  advisorError: string;
  isAnalyzing: boolean;
  analysisStep: number;
  onStartAnalysis: () => Promise<void>;
}

const TERRAIN_OPTIONS: { id: TripTerrain; title: string; desc: string }[] = [
  { id: "lake", title: "🌊 Ven hồ / Bãi sông chill", desc: "Thư giãn, thoáng mát, cần bàn ghế và đèn bão ngắm hoàng hôn." },
  { id: "mountain", title: "⛰️ Rừng núi / Trekking leo đồi", desc: "Gọn nhẹ, chống gió lạnh, cần túi ngủ ấm và đèn đeo trán." },
  { id: "glamping", title: "🏕️ Khu sinh thái / Family Glamping", desc: "Đầy đủ tiện nghi, đệm êm, bếp BBQ gia đình thoải mái." },
];

const QUICK_PLACES = ["Đà Lạt", "Hồ Trị An", "Núi Bà Đen", "Mộc Châu", "Tà Năng"];

/**
 * Form nhập nhu cầu chuyến đi cho chế độ AI tư vấn thông minh (UC2.4).
 */
export function AIAdvisorForm({
  tripTerrain,
  setTripTerrain,
  destination,
  setDestination,
  people,
  setPeople,
  nights,
  setNights,
  budget,
  setBudget,
  numPeople,
  advisorError,
  isAnalyzing,
  analysisStep,
  onStartAnalysis,
}: AIAdvisorFormProps) {
  return (
    <div className="card-panel cp-card cp-card--lg cp-card--soft-shadow">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-bark cp-card-title">
            Nhập thông tin chuyến đi của bạn
          </h3>
          <p className="cp-card-subtitle">
            AI sẽ căn cứ vào địa hình, số lượng người và số ngày để lọc thiết bị tối ưu.
          </p>
        </div>
        <span className="cp-ai-badge-live">
          Kho đồ thật 100%
        </span>
      </div>

      {/* Chọn phong cách / Địa hình chuyến đi */}
      <div className="cp-ai-terrain-section">
        <label className="form-label cp-ai-terrain-label">
          Phong cách cắm trại & địa hình:
        </label>
        <div className="grid gap-3 cp-ai-terrain-grid">
          {TERRAIN_OPTIONS.map((t) => (
            <div
              key={t.id}
              onClick={() => setTripTerrain(t.id)}
              className={`cp-ai-terrain-card ${tripTerrain === t.id ? "is-selected" : ""}`}
            >
              <div className="cp-ai-terrain-title">
                {t.title}
              </div>
              <div className="cp-ai-terrain-desc">
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-grid-2 cp-ai-form-grid">
        <div className="form-group">
          <label className="form-label cp-ai-field-label">Điểm đến dự kiến</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="VD: Đà Lạt, Hồ Trị An, Mộc Châu, Ba Vì..."
            className="form-input cp-ai-input"
          />
          <div className="flex gap-1 mt-2 flex-wrap">
            {QUICK_PLACES.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => setDestination(place)}
                className="cp-ai-place-chip"
              >
                {place}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label cp-ai-field-label">Số lượng thành viên</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="30"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              className="form-input cp-ai-input"
            />
            <span className="cp-ai-unit-suffix">người</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label cp-ai-field-label">Thời gian thuê (Tính theo block 24h)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="14"
              value={nights}
              onChange={(e) => setNights(e.target.value)}
              className="form-input cp-ai-input"
            />
            <span className="cp-ai-unit-suffix">ngày (24h/ngày)</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label cp-ai-field-label">Ngân sách dự kiến (đ)</label>
          <input
            type="number"
            step="50000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="form-input cp-ai-input"
          />
          <span className="cp-ai-budget-hint">
            Tương đương: {parseInt(budget || "0").toLocaleString("vi-VN")} đ
          </span>
        </div>
      </div>

      {advisorError && (
        <div role="alert" className="cp-alert-error cp-alert-error--md">
          {advisorError}
        </div>
      )}

      {/* Nút kích hoạt AI với trạng thái Loading */}
      <div className="cp-ai-submit-wrap">
        {isAnalyzing ? (
          <div className="cp-ai-analyzing-box">
            <div className="cp-ai-spinner" />
            <div className="cp-ai-analyzing-text">
              <div className="cp-ai-analyzing-step">
                {analysisStep === 0 && "🤖 Đang khởi tạo mô hình tư vấn AI..."}
                {analysisStep === 1 && `🌤️ Phân tích thời tiết & địa hình tại ${destination}...`}
                {analysisStep === 2 && "🎒 Chọn lọc danh mục thiết bị phù hợp trong kho GearGo..."}
              </div>
              <div className="cp-ai-analyzing-sub">
                Tự động tối ưu chi phí và sức chứa theo đoàn {numPeople} người.
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void onStartAnalysis()}
            className="btn btn-primary cp-ai-analyze-btn"
          >
            🤖 Phân tích & Tạo gợi ý combo tối ưu →
          </button>
        )}
      </div>
    </div>
  );
}
