import Icon from "../components/Icon";
import { ProductDetailView } from "./products/ProductDetailView";
import { useProductsCatalog } from "./products/useProductsCatalog";
import { ProductFiltersBar } from "./products/ProductFiltersBar";
import { ProductCard } from "./products/ProductCard";

/**
 * Trang Danh mục sản phẩm thuê đồ & điều hướng sang trang Chi tiết sản phẩm (UC2.1, UC2.2, UC2.3).
 */
export default function ProductsView() {
  const vm = useProductsCatalog();
  const { app } = vm;

  if (app.page === "product-detail" && app.selectedProductId) {
    const p = app.products.find((prod) => prod.id === app.selectedProductId);
    if (!p) return null;
    return (
      <ProductDetailView
        app={app}
        product={p}
        detailAvail={vm.detailAvail}
        detailSummary={vm.detailSummary}
        detailReviews={vm.detailReviews}
        reviewsLoading={vm.reviewsLoading}
        datesSelected={vm.datesSelected}
        hasBothDates={vm.hasBothDates}
        detailTab={vm.detailTab}
        setDetailTab={vm.setDetailTab}
        cartSyncMsg={vm.cartSyncMsg}
        qty={vm.qty}
        setQty={vm.setQty}
        handleAddToCartRealAware={vm.handleAddToCartRealAware}
      />
    );
  }

  return (
    <div className="lp-catalog-container">
      <div className="lp-breadcrumb">Trang chủ / <strong>Thuê đồ</strong></div>
      <div className="mobile-stack flex justify-between items-end gap-4 mb-5">
        <div>
          <h1 className="lp-catalog-title">Tìm đồ cho chuyến đi</h1>
          <p className="lp-catalog-subtitle">Chọn thời gian để xem số lượng có thể đặt chính xác (Tính theo block 24h làm tròn lên).</p>
        </div>
        <div className="lp-catalog-count"><strong>{vm.filtered.length}</strong> sản phẩm phù hợp</div>
      </div>

      {/* Filter bar */}
      <ProductFiltersBar
        pickupDate={app.pickupDate}
        pickupHour={app.pickupHour}
        returnDate={app.returnDate}
        returnHour={app.returnHour}
        setPickupDate={app.setPickupDate}
        setPickupHour={app.setPickupHour}
        setReturnDate={app.setReturnDate}
        setReturnHour={app.setReturnHour}
        days={app.getDays()}
        datesSelected={vm.datesSelected}
        hasBothDates={vm.hasBothDates}
        search={vm.search}
        setSearch={vm.setSearch}
        brand={vm.brand}
        setBrand={vm.setBrand}
        brands={vm.brands}
        sort={vm.sort}
        setSort={vm.setSort}
        category={vm.category}
        setCategory={vm.setCategory}
        categories={vm.categories}
        onResetFilters={vm.resetFilters}
      />

      {vm.filtered.length === 0 && (
        <div className="lp-empty-card">
          <div className="lp-empty-icon"><Icon name="search" size={24} /></div>
          <h2 className="lp-empty-title">Không tìm thấy sản phẩm phù hợp</h2>
          <p className="lp-empty-desc">Thử đổi từ khóa, thương hiệu hoặc danh mục.</p>
          <button
            onClick={vm.resetFilters}
            className="lp-empty-btn"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      <div className="grid gap-6 lp-catalog-grid">
        {vm.filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            avail={app.getAvailable(p.id)}
            inCart={app.cart.find((c) => c.productId === p.id)}
            days={app.getDays()}
            datesSelected={vm.datesSelected}
            onSelect={app.setSelectedProduct}
            onQuickRent={(id) => { void vm.handleAddToCartRealAware(id, 1, false); }}
          />
        ))}
      </div>
    </div>
  );
}
