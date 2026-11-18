import { useApp } from "../../../context/AppContext";
import { useReviewsTab } from "./reviews/useReviewsTab";
import { ReviewsFilterAndList } from "./reviews/ReviewsFilterAndList";
import { ReviewModerationModals } from "./reviews/ReviewModerationModals";

/**
 * Tab Kiểm duyệt đánh giá sản phẩm (UC9.2 & UC9.2.1).
 */
export function ReviewsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useReviewsTab(app);

  return (
    <div>
      <ReviewsFilterAndList
        realApi={vm.realApi}
        totalCount={vm.sourceReviews.length}
        reviewLoading={vm.reviewLoading}
        actionBusy={vm.actionBusy}
        reviewError={vm.reviewError}
        reviewSuccess={vm.reviewSuccess}
        search={vm.search}
        setSearch={vm.setSearch}
        ratingFilter={vm.ratingFilter}
        setRatingFilter={vm.setRatingFilter}
        statusFilter={vm.statusFilter}
        setStatusFilter={vm.setStatusFilter}
        filtered={vm.filtered}
        onRefresh={() => void vm.loadReviews()}
        onOpenOrderBasis={vm.setOrderBasisReview}
        onOpenReply={(rev) => {
          vm.setReplyModalReview(rev);
          vm.setReplyText(rev.storeResponse?.response || rev.response || "");
          vm.setReplyError("");
        }}
        onOpenHide={(rev) => {
          vm.setHideModalReview(rev);
          vm.setHideReason("Vi phạm ngôn từ / Thô tục");
          vm.setHideError("");
        }}
        onRestore={(rev) => void vm.handleRestoreReview(rev)}
      />

      <ReviewModerationModals
        orderBasisReview={vm.orderBasisReview}
        orderBasisDetail={vm.orderBasisDetail}
        onCloseOrderBasis={() => vm.setOrderBasisReview(null)}
        replyModalReview={vm.replyModalReview}
        replyText={vm.replyText}
        setReplyText={vm.setReplyText}
        replyError={vm.replyError}
        onCloseReply={() => {
          vm.setReplyModalReview(null);
          vm.setReplyError("");
        }}
        onConfirmReply={() => void vm.handleConfirmReply()}
        hideModalReview={vm.hideModalReview}
        hideReason={vm.hideReason}
        setHideReason={vm.setHideReason}
        hideError={vm.hideError}
        onCloseHide={() => {
          vm.setHideModalReview(null);
          vm.setHideError("");
        }}
        onConfirmHide={() => void vm.handleConfirmHide()}
        actionBusy={vm.actionBusy}
      />
    </div>
  );
}
