import { formatDateVi, type Order } from "../../store";
import { useProfileReviews } from "./profile/useProfileReviews";
import { ReviewExistingBlock } from "./profile/ReviewExistingBlock";
import { ReviewComposerForm } from "./profile/ReviewComposerForm";

export interface ProfileReviewsSectionProps {
  completedOrders: Order[];
  onEligibleCountChange?: (count: number) => void;
}

/**
 * Khối đánh giá sản phẩm sau chuyến đi (UC9.1, UC9.1.1, UC9.1.2).
 * Gom luồng API thật và mô phỏng, ủy quyền form soạn và khối đánh giá đã gửi sang sub-component.
 */
export function ProfileReviewsSection({
  completedOrders,
  onEligibleCountChange,
}: ProfileReviewsSectionProps) {
  const vm = useProfileReviews(onEligibleCountChange);
  const { app } = vm;

  const renderComposer = (displayOrderCode: string) => (
    <ReviewComposerForm
      productName={vm.reviewingTarget?.productName || ""}
      displayOrderCode={displayOrderCode}
      rating={vm.rating}
      setRating={vm.setRating}
      comment={vm.comment}
      setComment={vm.setComment}
      reviewImageInput={vm.reviewImageInput}
      setReviewImageInput={vm.setReviewImageInput}
      reviewImages={vm.reviewImages}
      reviewError={vm.reviewError}
      reviewSubmitting={vm.reviewSubmitting}
      reviewUploading={vm.reviewUploading}
      onAddImageUrl={vm.addImageFromInput}
      onUploadFiles={vm.handleUploadReviewFiles}
      onAddSampleImage={vm.addSampleImage}
      onRemoveImageAt={vm.removeImageAt}
      onSubmit={vm.handleSendReview}
      onCancel={() => vm.setReviewingTarget(null)}
    />
  );

  return (
    <div className="card-panel">
      <h2 className="font-display font-bold text-lg text-bark mb-1">
        Đánh giá sản phẩm theo đơn đã hoàn tất
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Lưu ý: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần duy nhất.
      </p>

      {app.realApi ? (
        vm.reviewsLoading ? (
          <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
            Đang tải danh sách sản phẩm đủ điều kiện đánh giá...
          </div>
        ) : vm.eligibleReviewItems.length === 0 && vm.myRealReviews.length === 0 ? (
          <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
            Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {vm.eligibleReviewItems.map((el) => {
              const chiTietId = el.maChiTietDon ?? el.maChiTietDonThue ?? 0;
              const existing = vm.myRealReviews.find(
                (r) =>
                  (r.orderId === String(el.maDonThue) || (chiTietId > 0 && r.orderId === String(chiTietId))) &&
                  r.productId === String(el.maSanPham)
              );
              const isCurrentReviewing =
                vm.reviewingTarget?.orderId === String(el.maDonThue) &&
                vm.reviewingTarget?.productId === String(el.maSanPham);

              const completedDate = el.thoiDiemHoanTat ?? el.ngayHoanTat;
              return (
                <div
                  key={chiTietId || `${el.maDonThue}-${el.maSanPham}`}
                  id={`review-order-${el.maDonThue}`}
                  className="border border-bone rounded-xl p-4"
                >
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-bone flex-wrap gap-2">
                    <div>
                      <strong className="font-mono text-forest">{el.maDonHienThi || el.maDonThue}</strong>
                      <span className="text-xs text-gray-400 ml-3">
                        Hoàn tất: {formatDateVi(completedDate, "-")}
                      </span>
                    </div>
                    <span className="badge badge-success">Đã hoàn tất</span>
                  </div>

                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="font-bold text-bark text-sm">{el.tenSanPham}</div>
                    {el.daDanhGia || existing ? (
                      <div className="text-right">
                        {existing && (
                          <span className="text-amber font-bold text-sm">
                            {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                          </span>
                        )}
                        <div className="text-xs text-emerald-600 font-semibold">✓ Đã đánh giá</div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          vm.openComposer({
                            orderId: String(el.maDonThue),
                            productId: String(el.maSanPham),
                            productName: el.tenSanPham,
                            maChiTietDonThue: chiTietId,
                          })
                        }
                        className="btn btn-secondary btn-sm"
                      >
                        Viết đánh giá
                      </button>
                    )}
                  </div>

                  {existing && <ReviewExistingBlock existing={existing} />}
                  {isCurrentReviewing && renderComposer(el.maDonHienThi || vm.reviewingTarget?.orderId || "")}
                </div>
              );
            })}
          </div>
        )
      ) : completedOrders.length === 0 ? (
        <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
          Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {completedOrders.map((order) => (
            <div key={order.id} className="border border-bone rounded-xl p-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-bone flex-wrap gap-2">
                <div>
                  <strong className="font-mono text-forest">{order.id}</strong>
                  <span className="text-xs text-gray-400 ml-3">
                    Hoàn tất: {formatDateVi(order.reconciledAt || order.createdAt)}
                  </span>
                </div>
                <span className="badge badge-success">Đã hoàn tất</span>
              </div>

              <div className="flex flex-col gap-3">
                {order.items.map((item) => {
                  const existing = app.reviews.find(
                    (r) => r.orderId === order.id && r.productId === item.productId
                  );
                  const isCurrentReviewing =
                    vm.reviewingTarget?.orderId === order.id &&
                    vm.reviewingTarget?.productId === item.productId;

                  return (
                    <div key={item.productId} className="p-3 bg-parchment rounded-lg">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <div className="font-bold text-bark text-sm">{item.productName}</div>
                          <div className="text-xs text-gray-500">Số lượng thuê: {item.qty}</div>
                        </div>
                        {existing ? (
                          <div className="text-right">
                            <span className="text-amber font-bold text-sm">
                              {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                            </span>
                            <div className="text-xs text-emerald-600 font-semibold">✓ Đã đánh giá</div>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              vm.openComposer({
                                orderId: order.id,
                                productId: item.productId,
                                productName: item.productName,
                              })
                            }
                            className="btn btn-secondary btn-sm"
                          >
                            Viết đánh giá
                          </button>
                        )}
                      </div>

                      {existing && <ReviewExistingBlock existing={existing} />}
                      {isCurrentReviewing && renderComposer(vm.reviewingTarget?.orderId || "")}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
