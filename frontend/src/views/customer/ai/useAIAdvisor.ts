import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { ApiError } from "../../../services/apiClient";
import { aiAdvisorApi, type TuVanBoDoBackend } from "../../../services/api";
import { toIsoDateTime } from "../customerUtils";
import type { PresetCombo, SuggestedItem } from "../aiAdvisorPresets";
import { buildLocalAISuggestion, buildPresetItems, type TripTerrain } from "./aiSuggestionHelpers";

export type { TripTerrain };
export type AdvisorMode = "ai" | "presets";

export interface ScheduleConflict {
  message: string;
  gioNhan: string;
  gioTra: string;
}

/**
 * Hook quản lý toàn bộ trạng thái và luồng tư vấn bộ đồ AI / Combo mẫu (UC2.4, UC2.4.1, UC2.4.2).
 */
export function useAIAdvisor() {
  const app = useApp();
  const [advisorMode, setAdvisorMode] = useState<AdvisorMode>("ai");
  const [sent, setSent] = useState(false);
  const [destination, setDestination] = useState("Đà Lạt (Thời tiết lạnh, nhiều sương mù)");
  const [tripTerrain, setTripTerrain] = useState<TripTerrain>("lake");
  const [people, setPeople] = useState("4");
  const [nights, setNights] = useState("2");
  const [budget, setBudget] = useState("1500000");

  // State điều khiển phân tích AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [advisorError, setAdvisorError] = useState("");
  const [aiResponse, setAiResponse] = useState<TuVanBoDoBackend | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState<ScheduleConflict | null>(null);

  // State danh sách các món trong combo hiện tại (người dùng có thể chỉnh sửa số lượng / xóa bớt món theo UC2.4 bước 5)
  const [customItems, setCustomItems] = useState<SuggestedItem[]>([]);
  const [addedAllNotice, setAddedAllNotice] = useState(false);

  // State modal yêu cầu đăng nhập đối với Khách vãng lai (UC2.4.2) và ngăn kéo thêm thiết bị
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);

  const numPeople = Math.max(1, parseInt(people) || 2);
  const numNights = Math.max(1, parseInt(nights) || 1);
  const targetBudget = Math.max(100000, parseInt(budget) || 1000000);

  const generateAISuggestion = (): SuggestedItem[] =>
    buildLocalAISuggestion(app.products, numPeople, destination, tripTerrain);

  // Tính khoảng thời gian gợi ý theo ngày nhận hiện tại + số ngày thuê
  const getSuggestedRange = () => {
    const gioNhan = aiResponse?.gioNhan || toIsoDateTime(app.pickupDate, app.pickupHour);
    if (aiResponse?.gioTra) {
      return { gioNhan, gioTra: aiResponse.gioTra };
    }
    const startMs = new Date(gioNhan).getTime();
    const gioTra = new Date(startMs + numNights * 24 * 60 * 60 * 1000).toISOString();
    return { gioNhan, gioTra };
  };

  // Kích hoạt phân tích AI qua Backend ASP.NET Core (hoặc mô phỏng tiến trình từng bước ở chế độ mock)
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
      setCustomItems(generateAISuggestion());
      setIsAnalyzing(false);
      setSent(true);
    }, 1300);
  };

  // Chọn bộ combo mẫu có sẵn (UC2.4.1)
  const handleSelectPreset = (preset: PresetCombo) => {
    setAiResponse(null);
    setAdvisorError("");
    setCustomItems(buildPresetItems(app.products, preset));
    setSent(true);
  };

  // Kiểm tra lại bộ đồ với backend khi người dùng chỉnh số lượng hoặc xóa/thêm món (UC2.4)
  const recheckKitWithBackend = (nextItems: SuggestedItem[]) => {
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
      .then((res) => setAiResponse(res))
      .catch(() => {});
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCustomItems((prev) => {
      const next = prev.map((item) =>
        item.productId === productId ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      );
      recheckKitWithBackend(next);
      return next;
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCustomItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      recheckKitWithBackend(next);
      return next;
    });
  };

  const handleAddExtraProduct = (prodId: string) => {
    const p = app.products.find((prod) => prod.id === prodId);
    if (!p) return;
    if (customItems.some((item) => item.productId === prodId)) {
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

  // Xử lý đưa toàn bộ combo vào giỏ thuê, kiểm tra đăng nhập (UC2.4.2) và xử lý xung đột lịch (409)
  const handleAddAllToCart = async (conflictResolution?: "ThayThe" | "GiuHienTai") => {
    if (!app.currentUser) {
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

    customItems.forEach((item) => app.addToCart(item.productId, item.qty));
    setAddedAllNotice(true);
    setTimeout(() => setAddedAllNotice(false), 3500);
  };

  return {
    app,
    advisorMode,
    setAdvisorMode,
    sent,
    setSent,
    destination,
    setDestination,
    tripTerrain,
    setTripTerrain,
    people,
    setPeople,
    nights,
    setNights,
    budget,
    setBudget,
    numPeople,
    numNights,
    targetBudget,
    isAnalyzing,
    analysisStep,
    advisorError,
    aiResponse,
    addingToCart,
    scheduleConflict,
    setScheduleConflict,
    customItems,
    setCustomItems,
    addedAllNotice,
    showAuthModal,
    setShowAuthModal,
    showAddMoreModal,
    setShowAddMoreModal,
    totalRental,
    totalDeposit,
    totalInitial,
    generateAISuggestion,
    handleStartAIAnalysis,
    handleSelectPreset,
    handleUpdateQty,
    handleRemoveItem,
    handleAddExtraProduct,
    handleAddAllToCart,
  };
}
