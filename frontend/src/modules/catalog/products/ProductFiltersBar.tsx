import Icon from "../../../components/Icon";

interface ProductFiltersBarProps {
  pickupDate: string;
  pickupHour: string;
  returnDate: string;
  returnHour: string;
  setPickupDate: (v: string) => void;
  setPickupHour: (v: string) => void;
  setReturnDate: (v: string) => void;
  setReturnHour: (v: string) => void;
  days: number;
  datesSelected: boolean;
  hasBothDates: boolean;
  search: string;
  setSearch: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  brands: string[];
  sort: string;
  setSort: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categories: string[];
  onResetFilters: () => void;
}

const FILTER_HOURS = ["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

/**
 * Thanh lọc lịch thuê, tìm kiếm từ khóa, thương hiệu, sắp xếp và danh mục sản phẩm (UC2.1).
 */
export function ProductFiltersBar({
  pickupDate,
  pickupHour,
  returnDate,
  returnHour,
  setPickupDate,
  setPickupHour,
  setReturnDate,
  setReturnHour,
  days,
  datesSelected,
  hasBothDates,
  search,
  setSearch,
  brand,
  setBrand,
  brands,
  sort,
  setSort,
  category,
  setCategory,
  categories,
  onResetFilters,
}: ProductFiltersBarProps) {
  return (
    <>
      <div className="lp-filter-card">
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="lp-filter-date-group">
            <label className="lp-filter-label">Ngày nhận</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="lp-filter-date"
              />
              <select
                value={pickupHour || "09:00"}
                onChange={(e) => setPickupHour(e.target.value)}
                aria-label="Giờ nhận"
                className="lp-filter-hour"
              >
                {FILTER_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="lp-filter-arrow">→</span>
          <div className="lp-filter-date-group">
            <label className="lp-filter-label">Ngày trả</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="lp-filter-date"
              />
              <select
                value={returnHour || "09:00"}
                onChange={(e) => setReturnHour(e.target.value)}
                aria-label="Giờ trả"
                className="lp-filter-hour"
              >
                {FILTER_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="lp-filter-days-pill">
            {datesSelected ? `${days} ngày (Block 24h)` : "Chưa hợp lệ"}
          </span>
          <span className="lp-filter-search-wrap">
            <span className="lp-filter-search-icon"><Icon name="search" size={17} /></span>
            <input
              placeholder="Tìm tên, thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lp-filter-search-input"
            />
          </span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Lọc theo thương hiệu"
            className="lp-filter-select"
          >
            {brands.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sắp xếp sản phẩm"
            className="lp-filter-select"
          >
            <option value="popular">Phổ biến nhất</option>
            <option value="rating">Đánh giá cao</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`lp-cat-pill${category === c ? " is-active" : ""}`}
            >
              {c}
            </button>
          ))}
          {(search || category !== "Tất cả" || brand !== "Tất cả") && (
            <button
              onClick={onResetFilters}
              className="lp-filter-reset"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {!datesSelected && (
        <div className="lp-date-warning">
          ⚠ {hasBothDates ? "Khoảng thời gian không hợp lệ — ngày trả phải sau ngày nhận." : <>Chưa chọn ngày — hiển thị <strong>giá tham khảo</strong>, chưa xác nhận khả dụng thực tế.</>}
        </div>
      )}
    </>
  );
}
