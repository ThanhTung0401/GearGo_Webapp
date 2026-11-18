import { useState } from "react";
import { useApp } from "../../App";
import Icon from "../../components/Icon";
import { ApiError } from "../../services/apiClient";
import { aiAdvisorApi, type TuVanBoDoBackend } from "../../services/api";
import { toIsoDateTime } from "./customerUtils";
import { AIAdvisorResultPanel } from "./AIAdvisorResultPanel";
import { PRESET_COMBOS, type SuggestedItem } from "./aiAdvisorPresets";

export function AIAdvisorView() {
  const app = useApp();
  const [advisorMode, setAdvisorMode] = useState<"ai" | "presets">("ai");
  const [sent, setSent] = useState(false);
  const [destination, setDestination] = useState("Đà Lạt (Thời tiết lạnh, nhiều sương mù)");
  const [tripTerrain, setTripTerrain] = useState<"lake" | "mountain" | "glamping">("lake");
  const [people, setPeople] = useState("4");
  const [nights, setNights] = useState("2");
  const [budget, setBudget] = useState("1500000");

  // State điều khiển phân tích AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [advisorError, setAdvisorError] = useState("");
  const [aiResponse, setAiResponse] = useState<TuVanBoDoBackend | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState<{ message: string; gioNhan: string; gioTra: string } | null>(null);

  // State danh sách các món trong combo hiện tại (người dùng có thể chỉnh sửa số lượng / xóa bớt món theo UC2.4 bước 5)
  const [customItems, setCustomItems] = useState<SuggestedItem[]>([]);
  const [addedAllNotice, setAddedAllNotice] = useState(false);

  // State modal yêu cầu đăng nhập đối với Khách vãng lai (UC2.4.2)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);

  const numPeople = Math.max(1, parseInt(people) || 2);
  const numNights = Math.max(1, parseInt(nights) || 1);
  const targetBudget = Math.max(100000, parseInt(budget) || 1000000);

  // Helper tìm sản phẩm trong kho GearGo
  const getProduct = (categoryName: string, capacityMatch?: string) => {
    return (
      app.products.find(
        (p) =>
          p.category === categoryName &&
          p.status === "active" &&
          (capacityMatch ? p.capacity.includes(capacityMatch) : true)
      ) || app.products.find((p) => p.category === categoryName && p.status === "active")
    );
  };

  // 1. Tạo danh sách combo gợi ý từ AI thông minh
  const generateAISuggestion = (): SuggestedItem[] => {
    const tentProd =
      numPeople <= 2
        ? getProduct("Lều trại", "2") || getProduct("Lều trại")
        : getProduct("Lều trại", "4") || getProduct("Lều trại");
    const sleepProd = getProduct("Ngủ");
    const lightProd = getProduct("Đèn");
    const cookProd = getProduct("Nấu ăn");
    const tableProd = getProduct("Bàn ghế");

    const list: SuggestedItem[] = [];

    if (tentProd) {
      list.push({
        productId: tentProd.id,
        name: tentProd.name,
        category: tentProd.category,
        image: tentProd.image,
        qty: Math.max(1, Math.ceil(numPeople / (tentProd.capacity.includes("2") ? 2 : 4))),
        reason: `Lều vòm chống mưa PU 3000mm, sức chứa phù hợp đoàn ${numPeople} người tại ${destination.split(" ")[0]}.`,
        pricePerDay: tentProd.pricePerDay,
        deposit: tentProd.deposit,
      });
    }

    if (sleepProd) {
      list.push({
        productId: sleepProd.id,
        name: sleepProd.name,
        category: sleepProd.category,
        image: sleepProd.image,
        qty: numPeople,
        reason: `Túi ngủ / đệm cá nhân giữ ấm thân nhiệt ban đêm (${numPeople} người).`,
        pricePerDay: sleepProd.pricePerDay,
        deposit: sleepProd.deposit,
      });
    }

    if (lightProd) {
      list.push({
        productId: lightProd.id,
        name: lightProd.name,
        category: lightProd.category,
        image: lightProd.image,
        qty: Math.max(1, Math.ceil(numPeople / 2)),
        reason: `Đèn bão chiếu sáng sinh hoạt khu trại và đi lại ban đêm an toàn.`,
        pricePerDay: lightProd.pricePerDay,
        deposit: lightProd.deposit,
      });
    }

    if (cookProd) {
      list.push({
        productId: cookProd.id,
        name: cookProd.name,
        category: cookProd.category,
        image: cookProd.image,
        qty: 1,
        reason: `Bếp và bộ nồi nấu ăn dã ngoại đun nước, pha cà phê ngắm bình minh.`,
        pricePerDay: cookProd.pricePerDay,
        deposit: cookProd.deposit,
      });
    }

    if (tableProd && (tripTerrain === "lake" || tripTerrain === "glamping")) {
      list.push({
        productId: tableProd.id,
        name: tableProd.name,
        category: tableProd.category,
        image: tableProd.image,
        qty: 1,
        reason: `Bàn ghế gấp gọn thư giãn ngắm cảnh bên bờ hồ / bãi trại.`,
        pricePerDay: tableProd.pricePerDay,
        deposit: tableProd.deposit,
      });
    }

    return list;
  };

  // Tính khoảng thời gian gợi ý theo ngày nhận + số ngày thuê
  const getSuggestedRange = () => {
    const gioNhan = aiResponse?.gioNhan || toIsoDateTime(app.pickupDate, app.pickupHour);
    if (aiResponse?.gioTra) {
      return { gioNhan, gioTra: aiResponse.gioTra };
    }
    const startMs = new Date(gioNhan).getTime();
    const gioTra = new Date(startMs + numNights * 24 * 60 * 60 * 1000).toISOString();
    return { gioNhan, gioTra };
  };

  // Kích hoạt phân tích AI qua Backend ASP.NET Core (hoặc mô phỏng khi không bật realApi)
  const handleStartAIAnalysis = async () => {
    setAdvisorError("");
    setScheduleConflict(null);
    if (app.realApi) {
      setIsAnalyzing(true);
      setAnalysisStep(1);
      try {
        const startIso = toIsoDateTime(app.pickupDate, app.pickupHour);
        const endIso = new Date(new Date(startIso).getTime() + numNights * 24 * 60 * 60 * 1000).toISOString();
        const res = await aiAdvisorApi.tuVanBoDo({
          diemDen: destination,
          soNguoi: numPeople,
          gioNhan: startIso,
          gioTra: endIso,
          nganSach: targetBudget,
          loaiNganSach: "TongBanDau",
        });
        setAiResponse(res);
        const mapped: SuggestedItem[] = res.cacDong.map((line) => {
          const prod = app.products.find((p) => p.id === String(line.maSanPham));
          return {
            productId: String(line.maSanPham),
            name: line.tenSanPham || prod?.name || `Sản phẩm #${line.maSanPham}`,
            category: prod?.category || "Thiết bị dã ngoại",
            image: prod?.image,
            qty: line.soLuong,
            reason: line.lyDo || "Đề xuất phù hợp theo quy mô và ngân sách chuyến đi.",
            pricePerDay: Number(line.donGiaThueMoiNgay ?? prod?.pricePerDay ?? 0),
            deposit: Number(line.mucCocMoiThietBi ?? prod?.deposit ?? 0),
          };
        });
        setCustomItems(mapped);
        setSent(true);
      } catch (err) {
        setAdvisorError(err instanceof Error ? err.message : "Không thể nhận gợi ý bộ đồ từ máy chủ.");
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setTimeout(() => setAnalysisStep(1), 400);
    setTimeout(() => setAnalysisStep(2), 850);
    setTimeout(() => {
      const generated = generateAISuggestion();
      setCustomItems(generated);
      setIsAnalyzing(false);
      setSent(true);
    }, 1300);
  };

  // Chọn bộ combo mẫu có sẵn (UC2.4.1)
  const handleSelectPreset = (preset: (typeof PRESET_COMBOS)[0]) => {
    setAiResponse(null);
    setAdvisorError("");
    const list: SuggestedItem[] = [];
    preset.items.forEach((item) => {
      const p = getProduct(item.cat);
      if (p) {
        list.push({
          productId: p.id,
          name: p.name,
          category: p.category,
          image: p.image,
          qty: item.qty,
          reason: item.reason,
          pricePerDay: p.pricePerDay,
          deposit: p.deposit,
        });
      }
    });

    setCustomItems(list);
    setSent(true);
  };

  // Kiểm tra lại bộ đồ với backend khi người dùng chỉnh số lượng hoặc bỏ món (UC2.4)
  const recheckKitWithBackend = (nextItems: typeof customItems) => {
    if (!app.realApi || nextItems.length === 0) return;
    const { gioNhan, gioTra } = getSuggestedRange();
    void aiAdvisorApi
      .kiemTraBoDo({
        diemDen: destination,
        soNguoi: numPeople,
        gioNhan,
        gioTra,
        nganSach: targetBudget,
        loaiNganSach: "TongBanDau",
      })
      .then((res) => {
        setAiResponse(res);
      })
      .catch(() => {});
  };

  // Tăng giảm số lượng sản phẩm trong bộ gợi ý (UC2.4 bước 5)
  const handleUpdateQty = (productId: string, delta: number) => {
    setCustomItems((prev) => {
      const next = prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      });
      recheckKitWithBackend(next);
      return next;
    });
  };

  // Xóa bỏ một món không cần thiết khỏi bộ gợi ý (UC2.4 bước 5)
  const handleRemoveItem = (productId: string) => {
    setCustomItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      recheckKitWithBackend(next);
      return next;
    });
  };

  // Thêm một thiết bị bất kỳ từ kho vào bộ gợi ý
  const handleAddExtraProduct = (prodId: string) => {
    const p = app.products.find((prod) => prod.id === prodId);
    if (!p) return;
    const existing = customItems.find((item) => item.productId === prodId);
    if (existing) {
      handleUpdateQty(prodId, 1);
    } else {
      setCustomItems((prev) => {
        const next = [
          ...prev,
          {
            productId: p.id,
            name: p.name,
            category: p.category,
            image: p.image,
            qty: 1,
            reason: "Thiết bị bổ sung thêm theo nhu cầu riêng của quý khách.",
            pricePerDay: p.pricePerDay,
            deposit: p.deposit,
          },
        ];
        recheckKitWithBackend(next);
        return next;
      });
    }
    setShowAddMoreModal(false);
  };

  // Tính toán tài chính thời gian thực theo số lượng đã chỉnh sửa
  const totalRental = customItems.reduce((sum, item) => sum + item.pricePerDay * item.qty * numNights, 0);
  const totalDeposit = customItems.reduce((sum, item) => sum + item.deposit * item.qty, 0);
  const totalInitial = totalRental + totalDeposit;

  // Xử lý đưa vào giỏ thuê (UC2.4.2 - Bắt buộc kiểm tra đăng nhập đối với Khách vãng lai)
  const handleAddAllToCart = async (conflictResolution?: "ThayThe" | "GiuHienTai") => {
    if (!app.currentUser) {
      // Khách vãng lai chưa đăng nhập -> mở modal yêu cầu đăng nhập theo UC2.4.2
      setShowAuthModal(true);
      return;
    }

    if (customItems.length === 0) return;

    if (app.realApi) {
      setAddingToCart(true);
      setAdvisorError("");
      const { gioNhan, gioTra } = getSuggestedRange();
      try {
        await aiAdvisorApi.themBoDoVaoGio({
          gioNhan,
          gioTra,
          cacDong: customItems.map((i) => ({ maSanPham: Number(i.productId), soLuong: i.qty })),
          xuLyXungDotLich: conflictResolution,
        });
        setScheduleConflict(null);
        await app.refreshCart?.();
        setAddedAllNotice(true);
        setTimeout(() => setAddedAllNotice(false), 3500);
      } catch (err) {
        if (err instanceof ApiError && (err.code === "NGAY_GIO_KHAC_GIO_HIEN_TAI" || err.status === 409) && !conflictResolution) {
          setScheduleConflict({
            message: err.message || "Giỏ thuê hiện tại đang chọn khung giờ khác với bộ đồ gợi ý.",
            gioNhan,
            gioTra,
          });
        } else {
          setAdvisorError(err instanceof Error ? err.message : "Không thể đưa bộ đồ vào giỏ thuê.");
        }
      } finally {
        setAddingToCart(false);
      }
      return;
    }

    // Đưa từng món với số lượng đã chỉnh sửa vào giỏ thuê (Mock)
    customItems.forEach((item) => {
      app.addToCart(item.productId, item.qty);
    });

    setAddedAllNotice(true);
    setTimeout(() => setAddedAllNotice(false), 3500);
  };

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
            onClick={() => { setAdvisorMode("ai"); setSent(false); }}
            className={`cp-ai-tab ${advisorMode === "ai" ? "is-active" : ""}`}
          >
            🤖 AI tư vấn thông minh
          </button>
          <button
            type="button"
            onClick={() => { setAdvisorMode("presets"); setSent(false); }}
            className={`cp-ai-tab ${advisorMode === "presets" ? "is-active" : ""}`}
          >
            📦 Bộ combo mẫu có sẵn (UC2.4.1)
          </button>
        </div>
      </div>

      {/* ─── CHẾ ĐỘ 1: AI TƯ VẤN THÔNG MINH ─── */}
      {advisorMode === "ai" && !sent && (
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
              {[
                { id: "lake" as const, title: "🌊 Ven hồ / Bãi sông chill", desc: "Thư giãn, thoáng mát, cần bàn ghế và đèn bão ngắm hoàng hôn." },
                { id: "mountain" as const, title: "⛰️ Rừng núi / Trekking leo đồi", desc: "Gọn nhẹ, chống gió lạnh, cần túi ngủ ấm và đèn đeo trán." },
                { id: "glamping" as const, title: "🏕️ Khu sinh thái / Family Glamping", desc: "Đầy đủ tiện nghi, đệm êm, bếp BBQ gia đình thoải mái." },
              ].map((t) => (
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
                {["Đà Lạt", "Hồ Trị An", "Núi Bà Đen", "Mộc Châu", "Tà Năng"].map((place) => (
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

          {advisorError && !sent && (
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
                onClick={() => void handleStartAIAnalysis()}
                className="btn btn-primary cp-ai-analyze-btn"
              >
                🤖 Phân tích & Tạo gợi ý combo tối ưu →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── CHẾ ĐỘ 2: BỘ COMBO MẪU CÓ SẴN (PRESET COMBOS - FALLBACK UC2.4.1) ─── */}
      {advisorMode === "presets" && !sent && (
        <div className="card-panel cp-card cp-card--lg">
          <div className="mb-5 pb-3 border-b border-gray-100">
            <h3 className="font-display font-bold text-lg text-bark cp-card-title">
              Bộ combo mẫu tuyển chọn sẵn (Preset Combos)
            </h3>
            <p className="cp-ai-presets-desc">
              Giải pháp đóng gói sẵn theo các kịch bản dã ngoại thực tế, không cần chờ AI suy nghĩ. Quý khách có thể chọn và chỉnh sửa số lượng tùy ý.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {PRESET_COMBOS.map((preset) => (
              <div
                key={preset.id}
                className="cp-ai-preset-card"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="cp-ai-preset-tag">
                        {preset.tag}
                      </span>
                      <span className="cp-ai-preset-for">
                        {preset.suitableFor}
                      </span>
                    </div>
                    <h4 className="cp-ai-preset-name">
                      {preset.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="btn btn-primary btn-sm cp-ai-preset-btn"
                  >
                    Chọn bộ này & Chỉnh sửa →
                  </button>
                </div>

                <p className="cp-ai-preset-desc">
                  {preset.description}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {preset.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="cp-ai-preset-chip"
                    >
                      ✓ {it.cat}: <strong>{it.qty} chiếc</strong> ({it.reason})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIAdvisorResultPanel
        app={app}
        sent={sent}
        setSent={setSent}
        advisorMode={advisorMode}
        destination={destination}
        people={people}
        numNights={numNights}
        targetBudget={targetBudget}
        customItems={customItems}
        setCustomItems={setCustomItems}
        generateAISuggestion={generateAISuggestion}
        handleUpdateQty={handleUpdateQty}
        handleRemoveItem={handleRemoveItem}
        handleAddExtraProduct={handleAddExtraProduct}
        showAddMoreModal={showAddMoreModal}
        setShowAddMoreModal={setShowAddMoreModal}
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
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
      />
    </div>
  );
}

// ─── Hồ sơ cá nhân & Đổi mật khẩu & Đánh giá (ProfileView - UC1.5, UC1.6, UC1.12, UC9.1) ─
