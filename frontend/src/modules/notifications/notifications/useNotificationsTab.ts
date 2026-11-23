import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { notificationApi, type ThongBaoGuiLoiBackend } from "../../../services/api/notificationApi";
import { type AppNotification } from "../../../store";

export type NotificationCategory = "order" | "rental" | "finance" | "promo" | "system";
export type NotificationActionType = "order" | "page" | "reviews";

/**
 * Hook quản lý toàn bộ trạng thái và nghiệp vụ phát hành thông báo (UC9.4)
 * cùng hàng chờ gửi lỗi & thử lại thủ công (UC9.5).
 */
export function useNotificationsTab(app: ReturnType<typeof useApp>) {
  const realApi = app.realApi || isRealApiEnabled();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<AppNotification["targetRole"]>("all");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [type, setType] = useState<AppNotification["type"]>("info");
  const [category, setCategory] = useState<NotificationCategory>("system");
  const [hasActionLink, setHasActionLink] = useState(false);
  const [actionType, setActionType] = useState<NotificationActionType>("order");
  const [actionTargetId, setActionTargetId] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  // Bộ lọc danh sách đã phát
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // State UC95: Hàng chờ gửi lỗi & Thử lại (/api/thong-bao/gui-loi & thu-lai)
  const [failedItems, setFailedItems] = useState<ThongBaoGuiLoiBackend[]>([]);
  const [failedTotal, setFailedTotal] = useState(0);
  const [failedPage, setFailedPage] = useState(1);
  const [failedLoading, setFailedLoading] = useState(false);
  const [failedError, setFailedError] = useState("");
  const [failedSuccess, setFailedSuccess] = useState("");
  const [retryTarget, setRetryTarget] = useState<ThongBaoGuiLoiBackend | null>(null);
  const [retryReason, setRetryReason] = useState("Thử gửi lại thông báo qua hàng chờ thủ công");
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Tải danh sách thông báo gửi lỗi theo trang từ máy chủ
  const loadFailedQueue = useCallback(
    async (page = 1) => {
      if (!realApi) return;
      setFailedLoading(true);
      setFailedError("");
      try {
        const res = await notificationApi.adminLayGuiLoi({ trang: page, soMoiTrang: 10 });
        const total = Number(res.totalItems ?? (res.items ?? []).length);
        // Nếu xóa/thử lại hết bản ghi ở trang cuối khiến trang hiện tại rỗng -> lùi về trang trước
        if ((res.items ?? []).length === 0 && page > 1 && total > 0) {
          const prevRes = await notificationApi.adminLayGuiLoi({ trang: page - 1, soMoiTrang: 10 });
          setFailedItems(prevRes.items ?? []);
          setFailedTotal(Number(prevRes.totalItems ?? (prevRes.items ?? []).length));
          setFailedPage(prevRes.currentPage || page - 1);
          return;
        }
        setFailedItems(res.items ?? []);
        setFailedTotal(total);
        setFailedPage(res.currentPage || page);
      } catch (err) {
        setFailedError(err instanceof Error ? err.message : "Không thể tải danh sách thông báo gửi lỗi.");
      } finally {
        setFailedLoading(false);
      }
    },
    [realApi]
  );

  useEffect(() => {
    void loadFailedQueue(1);
  }, [loadFailedQueue]);

  // Xử lý phát hành thông báo thủ công (API thật hoặc store cục bộ)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (realApi) {
      setSendError("");
      let maTaiKhoanNhan: number | null = null;
      if (targetAccountId.trim()) {
        const parsedTk = Number(targetAccountId.trim());
        if (!Number.isInteger(parsedTk) || parsedTk <= 0) {
          setSendError("Mã tài khoản nhận phải là số nguyên dương hoặc để trống để gửi toàn hệ thống.");
          return;
        }
        maTaiKhoanNhan = parsedTk;
      }

      // Quy đổi mã đơn thuê hiển thị sang backendId số nếu có gắn deep-link đơn hàng
      let maDonThue: number | null = null;
      if (hasActionLink && actionType === "order" && actionTargetId.trim()) {
        const rawOrder = actionTargetId.trim();
        const matched = app.orders.find((o) => o.id === rawOrder || o.displayCode === rawOrder);
        if (matched?.backendId) {
          maDonThue = matched.backendId;
        } else {
          const digits = Number(rawOrder.replace(/\D/g, ""));
          if (Number.isInteger(digits) && digits > 0) {
            maDonThue = digits;
          }
        }
      }

      const loaiSuKienMap: Record<NotificationCategory, string> = {
        order: "DonThue",
        rental: "NhacLichThue",
        finance: "ThanhToan",
        promo: "KhuyenMai",
        system: type === "warning" || type === "alert" ? "CanhBaoHeThong" : "HeThong",
      };

      const vaiTroNhanMap: Record<AppNotification["targetRole"], string | null> = {
        all: null,
        customer: "KhachHang",
        staff: "NhanVien",
        admin: "QuanTriVien",
      };

      setSendLoading(true);
      try {
        await notificationApi.adminGuiThuCong({
          tieuDe: title.trim(),
          noiDung: message.trim(),
          maTaiKhoanNhan,
          vaiTroNhan: maTaiKhoanNhan ? null : vaiTroNhanMap[targetRole],
          maDonThue,
          loaiSuKien: loaiSuKienMap[category],
        });
        await Promise.all([app.refreshNotifications?.(), loadFailedQueue(failedPage)]);
        setTitle("");
        setMessage("");
        setTargetAccountId("");
        setHasActionLink(false);
        setActionTargetId("");
        setActionLabel("");
        setSentSuccess(true);
        setTimeout(() => setSentSuccess(false), 3500);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Không thể phát hành thông báo qua máy chủ.");
      } finally {
        setSendLoading(false);
      }
      return;
    }

    app.sendNotification({
      title: title.trim(),
      message: message.trim(),
      targetRole,
      type,
      category,
      actionLink: hasActionLink
        ? {
            type: actionType,
            targetId: actionType === "order" ? actionTargetId.trim() || "ORD-001" : undefined,
            label:
              actionLabel.trim() ||
              (actionType === "order"
                ? "Xem chi tiết đơn →"
                : actionType === "reviews"
                  ? "Đánh giá chuyến đi →"
                  : "Khám phá catalog →"),
          }
        : undefined,
    });

    setTitle("");
    setMessage("");
    setHasActionLink(false);
    setActionTargetId("");
    setActionLabel("");
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3500);
  };

  // Xác nhận kích hoạt gửi lại thông báo trong hàng chờ lỗi (UC9.5)
  const handleConfirmRetry = async () => {
    if (!retryTarget) return;
    setRetryingId(retryTarget.maThongBao);
    setFailedError("");
    setFailedSuccess("");
    try {
      await notificationApi.adminThuLai(retryTarget.maThongBao, retryReason.trim() || undefined);
      setFailedSuccess(`Đã kích hoạt thử lại gửi thông báo #${retryTarget.maThongBao} ("${retryTarget.tieuDe}").`);
      setRetryTarget(null);
      await Promise.all([loadFailedQueue(failedPage), app.refreshNotifications?.()]);
    } catch (err) {
      setFailedError(err instanceof Error ? err.message : `Không thể thử lại gửi thông báo #${retryTarget.maThongBao}.`);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredHistory = app.notifications.filter((n) => {
    const matchRole = filterRole === "all" || n.targetRole === filterRole || n.targetRole === "all";
    const matchCat = filterCategory === "all" || n.category === filterCategory;
    return matchRole && matchCat;
  });

  return {
    realApi,
    title,
    setTitle,
    message,
    setMessage,
    targetRole,
    setTargetRole,
    targetAccountId,
    setTargetAccountId,
    type,
    setType,
    category,
    setCategory,
    hasActionLink,
    setHasActionLink,
    actionType,
    setActionType,
    actionTargetId,
    setActionTargetId,
    actionLabel,
    setActionLabel,
    sentSuccess,
    sendLoading,
    sendError,
    filterRole,
    setFilterRole,
    filterCategory,
    setFilterCategory,
    failedItems,
    failedTotal,
    failedPage,
    failedLoading,
    failedError,
    failedSuccess,
    retryTarget,
    setRetryTarget,
    retryReason,
    setRetryReason,
    retryingId,
    loadFailedQueue,
    handleSend,
    handleConfirmRetry,
    filteredHistory,
  };
}
