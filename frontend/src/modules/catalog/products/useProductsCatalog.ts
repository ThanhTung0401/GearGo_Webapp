import { useEffect, useRef, useState } from "react";
import { useApp } from "../../../context/AppContext";
import type { Review } from "../../../types";
import { getAuthToken } from "../../../services/apiClient";
import { catalogApi, rentalCartApi, reviewApi, type TongHopDiemBackend } from "../../../services/api";
import { mapDanhGiaToReview } from "../../../services/mappers";

function toIsoRange(pickupDate: string, pickupHour: string, returnDate: string, returnHour: string) {
  const start = new Date(`${pickupDate}T${pickupHour || "09:00"}:00`);
  const end = new Date(`${returnDate}T${returnHour || "09:00"}:00`);
  return {
    gioNhan: Number.isFinite(start.getTime()) ? start.toISOString() : undefined,
    gioTra: Number.isFinite(end.getTime()) ? end.toISOString() : undefined,
  };
}

/**
 * Hook quản lý danh mục sản phẩm thuê, bộ lọc/tìm kiếm, đồng bộ khả dụng theo khung giờ và chi tiết sản phẩm (UC2.1, UC2.2, UC2.3).
 */
export function useProductsCatalog() {
  const app = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [brand, setBrand] = useState("Tất cả");
  const [sort, setSort] = useState("popular");
  const [qty, setQty] = useState(1);
  const [detailTab, setDetailTab] = useState<"specs" | "accessories" | "policy">("specs");
  const [detailReviews, setDetailReviews] = useState<Review[] | null>(null);
  const [detailSummary, setDetailSummary] = useState<TongHopDiemBackend | null>(null);
  const [detailAvail, setDetailAvail] = useState<number | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [cartSyncMsg, setCartSyncMsg] = useState<string | null>(null);

  const datesSelected = app.hasValidRentalPeriod();
  const hasBothDates = Boolean(app.pickupDate && app.returnDate);
  const categoriesRef = useRef(app.categories);
  categoriesRef.current = app.categories;
  const refreshCatalogRef = useRef(app.refreshCatalog);
  refreshCatalogRef.current = app.refreshCatalog;

  // Đồng bộ số lượng khả dụng thực tế và tìm kiếm/lọc server-side qua catalogApi khi người dùng đổi ngày/từ khóa/danh mục
  // Không đưa app.categories vào dependency để tránh vòng lặp vô hạn khi refreshCatalog cập nhật categories
  useEffect(() => {
    if (!app.realApi) return;
    const matchedCat = category !== "Tất cả" ? categoriesRef.current.find((c) => c.name === category) : undefined;
    const maDanhMuc = matchedCat && /^\d+$/.test(matchedCat.id) ? Number(matchedCat.id) : undefined;
    const tuKhoa = search.trim() || undefined;
    const range = datesSelected
      ? toIsoRange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")
      : { gioNhan: undefined, gioTra: undefined };

    const timer = window.setTimeout(() => {
      void refreshCatalogRef.current?.({
        gioNhan: range.gioNhan,
        gioTra: range.gioTra,
        tuKhoa,
        maDanhMuc,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [app.realApi, datesSelected, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour, search, category]);

  // Tải đánh giá công khai & khả dụng chi tiết của sản phẩm đang xem
  useEffect(() => {
    if (!app.realApi || app.page !== "product-detail" || !app.selectedProductId) {
      setDetailReviews(null);
      setDetailSummary(null);
      setDetailAvail(null);
      return;
    }
    if (!/^\d+$/.test(app.selectedProductId)) return;
    const spId = Number(app.selectedProductId);
    let cancelled = false;
    setReviewsLoading(true);

    const { gioNhan, gioTra } = datesSelected
      ? toIsoRange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")
      : { gioNhan: undefined, gioTra: undefined };

    Promise.allSettled([
      reviewApi.layDanhGiaSanPham(spId, { soMoiTrang: 20 }),
      reviewApi.layTongHopDiem(spId),
      catalogApi.layChiTietSanPham(spId, gioNhan && gioTra ? { gioNhan, gioTra } : undefined),
    ])
      .then(([revRes, sumRes, prodRes]) => {
        if (cancelled) return;
        if (revRes.status === "fulfilled") {
          setDetailReviews((revRes.value.items ?? []).map(mapDanhGiaToReview));
        }
        if (sumRes.status === "fulfilled") {
          setDetailSummary(sumRes.value);
        }
        if (prodRes.status === "fulfilled" && prodRes.value.soLuongKhaDung !== undefined) {
          setDetailAvail(prodRes.value.soLuongKhaDung);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app.realApi, app.page, app.selectedProductId, datesSelected, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour]);

  // Thêm sản phẩm vào giỏ cục bộ và đồng bộ lên backend khi đã đăng nhập ở chế độ API thật
  const handleAddToCartRealAware = async (productId: string, quantity: number, redirectToCart: boolean) => {
    setCartSyncMsg(null);
    app.addToCart(productId, quantity);
    if (app.realApi && app.currentUser && getAuthToken() && /^\d+$/.test(productId)) {
      try {
        if (datesSelected) {
          const { gioNhan, gioTra } = toIsoRange(
            app.pickupDate,
            app.pickupHour || "09:00",
            app.returnDate,
            app.returnHour || "09:00"
          );
          if (gioNhan && gioTra) {
            await rentalCartApi.datThoiGian(gioNhan, gioTra);
          }
        }
        await rentalCartApi.themVaoGio(Number(productId), quantity);
        await app.refreshCart?.();
      } catch (err) {
        setCartSyncMsg(err instanceof Error ? err.message : "Không thể đồng bộ giỏ thuê với máy chủ.");
        return;
      }
    }
    if (redirectToCart) app.setPage("cart");
  };

  // Giữ danh sách thương hiệu đầy đủ từ lần tải chưa lọc để không bị mất option khi lọc danh mục
  const [knownBrands, setKnownBrands] = useState<string[]>([]);
  useEffect(() => {
    const incomingBrands = app.products.map((p) => p.brand).filter(Boolean);
    if (incomingBrands.length === 0) return;
    setKnownBrands((prev) => Array.from(new Set([...prev, ...incomingBrands])));
  }, [app.products]);

  const activeCategoryNames = app.categories
    .filter((c) => c.status === "active")
    .map((c) => c.name);
  const categories = [
    "Tất cả",
    ...Array.from(
      new Set(
        activeCategoryNames.length > 0
          ? activeCategoryNames
          : app.products.map((p) => p.category).filter(Boolean)
      )
    ),
  ];
  const brands = ["Tất cả", ...knownBrands];

  const filtered = app.products
    .filter((p) => {
      const matchCat = category === "Tất cả" || p.category === category;
      const matchBrand = brand === "Tất cả" || p.brand === brand;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchBrand && matchSearch && p.status === "active";
    })
    .sort((a, b) => {
      if (sort === "price-asc") return a.pricePerDay - b.pricePerDay;
      if (sort === "price-desc") return b.pricePerDay - a.pricePerDay;
      if (sort === "rating") return b.rating - a.rating;
      return b.reviews - a.reviews;
    });

  const resetFilters = () => {
    setSearch("");
    setCategory("Tất cả");
    setBrand("Tất cả");
  };

  return {
    app,
    search,
    setSearch,
    category,
    setCategory,
    brand,
    setBrand,
    sort,
    setSort,
    qty,
    setQty,
    detailTab,
    setDetailTab,
    detailReviews,
    detailSummary,
    detailAvail,
    reviewsLoading,
    cartSyncMsg,
    datesSelected,
    hasBothDates,
    categories,
    brands,
    filtered,
    handleAddToCartRealAware,
    resetFilters,
  };
}
