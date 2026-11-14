import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../App";
import { fmt, statusColors } from "../../store";
import Icon from "../../components/Icon";
import { ApiError } from "../../services/apiClient";
import {
  rentalCartApi,
  orderApi,
  paymentApi,
  surchargeApi,
  aiAdvisorApi,
  profileApi,
  authApi,
  reviewApi,
  type GioThueBackend,
  type DonChiTietBackend,
  type PhieuBanGiaoKhachBackend,
  type XemTruocHuyBackend,
  type TuVanBoDoBackend,
  type SanPhamDuDieuKienDanhGiaBackend,
  type BaoGiaThayDoiDetail,
} from "../../services/api";
import { mapDonChiTietToOrder, mapDanhGiaToReview } from "../../services/mappers";
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
    <div className="customer-container" style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}>
      {/* Hero Header */}
      <div className="advisor-hero" style={{ background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A43 100%)", color: "white", padding: "32px 28px", borderRadius: 20, marginBottom: 28, boxShadow: "0 10px 25px rgba(27,63,47,0.18)" }}>
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center" }}>
            <Icon name="tent" size={26} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A7F3D0", fontWeight: 700 }}>
              GearGo Smart Gear Planner · UC2.4 & UC2.4.1
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl" style={{ margin: 0, color: "white" }}>
              Trợ lý AI tư vấn bộ đồ cắm trại & Combo mẫu
            </h1>
          </div>
        </div>
        <p style={{ margin: "8px 0 0", color: "#E2E8F0", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: 680 }}>
          Đề xuất danh mục thiết bị tối ưu theo điểm đến, quy mô đoàn và ngân sách dự kiến của bạn. Bạn hoàn toàn có thể tùy chỉnh thêm bớt từng món trước khi đưa vào giỏ thuê.
        </p>

        {/* Tab chuyển đổi chế độ tư vấn (AI vs Presets - UC2.4.1) */}
        <div className="flex gap-2 mt-5" style={{ background: "rgba(0,0,0,0.22)", padding: 4, borderRadius: 12, width: "fit-content" }}>
          <button
            type="button"
            onClick={() => { setAdvisorMode("ai"); setSent(false); }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: advisorMode === "ai" ? "white" : "transparent",
              color: advisorMode === "ai" ? "var(--color-forest)" : "#D1D5DB",
            }}
          >
            🤖 AI tư vấn thông minh
          </button>
          <button
            type="button"
            onClick={() => { setAdvisorMode("presets"); setSent(false); }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: advisorMode === "presets" ? "white" : "transparent",
              color: advisorMode === "presets" ? "var(--color-forest)" : "#D1D5DB",
            }}
          >
            📦 Bộ combo mẫu có sẵn (UC2.4.1)
          </button>
        </div>
      </div>

      {/* ─── CHẾ ĐỘ 1: AI TƯ VẤN THÔNG MINH ─── */}
      {advisorMode === "ai" && !sent && (
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-display font-bold text-lg text-bark" style={{ margin: 0 }}>
                Nhập thông tin chuyến đi của bạn
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#6B7280" }}>
                AI sẽ căn cứ vào địa hình, số lượng người và số ngày để lọc thiết bị tối ưu.
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 99, background: "#ECFDF5", color: "#065F46", fontWeight: 700 }}>
              Kho đồ thật 100%
            </span>
          </div>

          {/* Chọn phong cách / Địa hình chuyến đi */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 8, display: "block" }}>
              Phong cách cắm trại & địa hình:
            </label>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { id: "lake" as const, title: "🌊 Ven hồ / Bãi sông chill", desc: "Thư giãn, thoáng mát, cần bàn ghế và đèn bão ngắm hoàng hôn." },
                { id: "mountain" as const, title: "⛰️ Rừng núi / Trekking leo đồi", desc: "Gọn nhẹ, chống gió lạnh, cần túi ngủ ấm và đèn đeo trán." },
                { id: "glamping" as const, title: "🏕️ Khu sinh thái / Family Glamping", desc: "Đầy đủ tiện nghi, đệm êm, bếp BBQ gia đình thoải mái." },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTripTerrain(t.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: tripTerrain === t.id ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                    background: tripTerrain === t.id ? "#F0FDF4" : "var(--color-parchment)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)", marginBottom: 4 }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#6B7280", lineHeight: 1.4 }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Điểm đến dự kiến</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="VD: Đà Lạt, Hồ Trị An, Mộc Châu, Ba Vì..."
                className="form-input"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
              />
              <div className="flex gap-1 mt-2 flex-wrap">
                {["Đà Lạt", "Hồ Trị An", "Núi Bà Đen", "Mộc Châu", "Tà Năng"].map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => setDestination(place)}
                    style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", cursor: "pointer", color: "#4B5563" }}
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Số lượng thành viên</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
                <span style={{ fontSize: "0.82rem", color: "#6B7280", whiteSpace: "nowrap" }}>người</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Thời gian thuê (Tính theo block 24h)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
                <span style={{ fontSize: "0.82rem", color: "#6B7280", whiteSpace: "nowrap" }}>ngày (24h/ngày)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Ngân sách dự kiến (đ)</label>
              <input
                type="number"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="form-input"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
              />
              <span style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4, display: "block" }}>
                Tương đương: {parseInt(budget || "0").toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {advisorError && !sent && (
            <div role="alert" style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", fontSize: "0.82rem" }}>
              {advisorError}
            </div>
          )}

          {/* Nút kích hoạt AI với trạng thái Loading */}
          <div style={{ marginTop: 24, textAlign: "right" }}>
            {isAnalyzing ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "16px 20px", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 24, height: 24, border: "3px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#166534" }}>
                    {analysisStep === 0 && "🤖 Đang khởi tạo mô hình tư vấn AI..."}
                    {analysisStep === 1 && `🌤️ Phân tích thời tiết & địa hình tại ${destination}...`}
                    {analysisStep === 2 && "🎒 Chọn lọc danh mục thiết bị phù hợp trong kho GearGo..."}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                    Tự động tối ưu chi phí và sức chứa theo đoàn {numPeople} người.
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleStartAIAnalysis()}
                className="btn btn-primary"
                style={{ padding: "14px 28px", fontSize: "0.95rem", fontWeight: 700, borderRadius: 10 }}
              >
                🤖 Phân tích & Tạo gợi ý combo tối ưu →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── CHẾ ĐỘ 2: BỘ COMBO MẪU CÓ SẴN (PRESET COMBOS - FALLBACK UC2.4.1) ─── */}
      {advisorMode === "presets" && !sent && (
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)" }}>
          <div className="mb-5 pb-3 border-b border-gray-100">
            <h3 className="font-display font-bold text-lg text-bark" style={{ margin: 0 }}>
              Bộ combo mẫu tuyển chọn sẵn (Preset Combos)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#6B7280" }}>
              Giải pháp đóng gói sẵn theo các kịch bản dã ngoại thực tế, không cần chờ AI suy nghĩ. Quý khách có thể chọn và chỉnh sửa số lượng tùy ý.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {PRESET_COMBOS.map((preset) => (
              <div
                key={preset.id}
                style={{
                  border: "1px solid var(--color-bone)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  background: "var(--color-parchment)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: "var(--color-forest)", color: "white", fontWeight: 700 }}>
                        {preset.tag}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>
                        {preset.suitableFor}
                      </span>
                    </div>
                    <h4 style={{ margin: "6px 0 0", fontSize: "1.1rem", color: "var(--color-bark)", fontWeight: 700 }}>
                      {preset.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem" }}
                  >
                    Chọn bộ này & Chỉnh sửa →
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: "0.84rem", color: "#4B5563", lineHeight: 1.5 }}>
                  {preset.description}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {preset.items.map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: "white",
                        border: "1px solid var(--color-bone)",
                        color: "var(--color-bark)",
                      }}
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
