import { useApp } from "../../../context/AppContext";
import { useNotificationsTab } from "./notifications/useNotificationsTab";
import { NotificationBroadcastForm } from "./notifications/NotificationBroadcastForm";
import { NotificationHistoryPanel } from "./notifications/NotificationHistoryPanel";
import { NotificationFailedQueue } from "./notifications/NotificationFailedQueue";

/**
 * Tab quản trị Thông báo & Hàng chờ gửi lỗi (UC9.4, UC9.5).
 */
export function NotificationsTab({ app }: { app: ReturnType<typeof useApp> }) {
  const vm = useNotificationsTab(app);

  return (
    <div className="flex flex-col gap-6">
      <div className="adm-notif-layout">
        {/* Form soạn tin & Live Preview */}
        <NotificationBroadcastForm
          realApi={vm.realApi}
          title={vm.title}
          setTitle={vm.setTitle}
          message={vm.message}
          setMessage={vm.setMessage}
          targetRole={vm.targetRole}
          setTargetRole={vm.setTargetRole}
          targetAccountId={vm.targetAccountId}
          setTargetAccountId={vm.setTargetAccountId}
          type={vm.type}
          setType={vm.setType}
          category={vm.category}
          setCategory={vm.setCategory}
          hasActionLink={vm.hasActionLink}
          setHasActionLink={vm.setHasActionLink}
          actionType={vm.actionType}
          setActionType={vm.setActionType}
          actionTargetId={vm.actionTargetId}
          setActionTargetId={vm.setActionTargetId}
          actionLabel={vm.actionLabel}
          setActionLabel={vm.setActionLabel}
          sentSuccess={vm.sentSuccess}
          sendLoading={vm.sendLoading}
          sendError={vm.sendError}
          onSubmit={vm.handleSend}
        />

        {/* Danh sách đã phát & Bộ lọc */}
        <NotificationHistoryPanel
          filteredHistory={vm.filteredHistory}
          filterRole={vm.filterRole}
          setFilterRole={vm.setFilterRole}
          filterCategory={vm.filterCategory}
          setFilterCategory={vm.setFilterCategory}
        />
      </div>

      {/* Hàng chờ gửi lỗi & Thử lại thủ công (UC9.5) */}
      <NotificationFailedQueue
        realApi={vm.realApi}
        failedItems={vm.failedItems}
        failedTotal={vm.failedTotal}
        failedPage={vm.failedPage}
        failedLoading={vm.failedLoading}
        failedError={vm.failedError}
        failedSuccess={vm.failedSuccess}
        retryTarget={vm.retryTarget}
        setRetryTarget={vm.setRetryTarget}
        retryReason={vm.retryReason}
        setRetryReason={vm.setRetryReason}
        retryingId={vm.retryingId}
        onLoadFailedQueue={(page) => void vm.loadFailedQueue(page)}
        onConfirmRetry={() => void vm.handleConfirmRetry()}
      />
    </div>
  );
}
