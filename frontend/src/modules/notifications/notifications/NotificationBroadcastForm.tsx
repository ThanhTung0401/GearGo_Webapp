import Icon from "../../../components/Icon";
import { type AppNotification } from "../../../store";
import { type NotificationActionType, type NotificationCategory } from "./useNotificationsTab";

interface NotificationBroadcastFormProps {
  realApi: boolean;
  title: string;
  setTitle: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  targetRole: AppNotification["targetRole"];
  setTargetRole: (value: AppNotification["targetRole"]) => void;
  targetAccountId: string;
  setTargetAccountId: (value: string) => void;
  type: AppNotification["type"];
  setType: (value: AppNotification["type"]) => void;
  category: NotificationCategory;
  setCategory: (value: NotificationCategory) => void;
  hasActionLink: boolean;
  setHasActionLink: (value: boolean) => void;
  actionType: NotificationActionType;
  setActionType: (value: NotificationActionType) => void;
  actionTargetId: string;
  setActionTargetId: (value: string) => void;
  actionLabel: string;
  setActionLabel: (value: string) => void;
  sentSuccess: boolean;
  sendLoading: boolean;
  sendError: string;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Biểu mẫu soạn thảo, cấu hình deep-link và xem trước trực tiếp (Live Preview)
 * trước khi phát hành thông báo (UC9.4).
 */
export function NotificationBroadcastForm(props: NotificationBroadcastFormProps) {
  const {
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
    onSubmit,
  } = props;

  return (
    <div className="adm-card adm-card--padded">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="adm-page-title adm-page-title--sub">
            Soạn & Phát hành thông báo (UC9.4)
          </h2>
          <p className="adm-page-subtitle adm-page-subtitle--compact">
            Gửi thông báo đẩy tức thời đến khách hàng hoặc nhân viên trực ban kèm Deep Link điều hướng đích (UC9.3.1).
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="adm-label--block">Tiêu đề thông báo</label>
          <input
            required
            placeholder="VD: Cập nhật quy định trả lều trong mùa mưa bão"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="adm-field"
          />
        </div>

        <div className="adm-grid-3">
          <div>
            <label className="adm-label--block">Nhóm nhận tin</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as AppNotification["targetRole"])}
              className="adm-field"
            >
              <option value="all">Toàn bộ người dùng</option>
              <option value="customer">Khách hàng</option>
              <option value="staff">Nhân viên kho & vận hành</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          <div>
            <label className="adm-label--block">Mức độ ưu tiên</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppNotification["type"])}
              className="adm-field"
            >
              <option value="info">Thông tin chung (Xanh dương)</option>
              <option value="success">Thành công (Xanh lá)</option>
              <option value="warning">Cảnh báo (Vàng)</option>
              <option value="alert">Khẩn cấp (Đỏ)</option>
            </select>
          </div>

          <div>
            <label className="adm-label--block">Danh mục nghiệp vụ</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCategory)}
              className="adm-field"
            >
              <option value="system">⚙️ Hệ thống</option>
              <option value="rental">⛺ Đơn thuê</option>
              <option value="order">📦 Đơn hàng</option>
              <option value="finance">💰 Tài chính / Cọc</option>
              <option value="promo">🎁 Khuyến mãi</option>
            </select>
          </div>
        </div>

        <div>
          <label className="adm-label--block">Nội dung chi tiết</label>
          <textarea
            required
            rows={3}
            placeholder="Nhập nội dung thông báo gửi đến người dùng..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="adm-field"
          />
        </div>

        {/* Cấu hình Deep Link điều hướng (UC9.3.1 & UC9.4.1) */}
        <div className="adm-card--slate">
          <label className="adm-checkbox-row adm-checkbox-row--bold">
            <input
              type="checkbox"
              checked={hasActionLink}
              onChange={(e) => setHasActionLink(e.target.checked)}
            />
            🔗 Gắn liên kết hành động điều hướng (Deep-link - UC9.3.1)
          </label>

          {hasActionLink && (
            <div className="adm-grid-2 mt-3">
              <div>
                <label className="adm-label--xs">Trang đích điều hướng</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as NotificationActionType)}
                  className="adm-field adm-field--sm"
                >
                  <option value="order">Chi tiết đơn hàng cụ thể (UC9.3.1)</option>
                  <option value="reviews">Trang đánh giá sản phẩm (UC9.1)</option>
                  <option value="page">Trang danh mục thuê đồ</option>
                </select>
              </div>

              {actionType === "order" ? (
                <div>
                  <label className="adm-label--xs">Mã đơn hàng đích</label>
                  <input
                    type="text"
                    placeholder="VD: ORD-001 hoặc ORD-002"
                    value={actionTargetId}
                    onChange={(e) => setActionTargetId(e.target.value)}
                    className="adm-field adm-field--sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="adm-label--xs">Nhãn nút bấm</label>
                  <input
                    type="text"
                    placeholder={actionType === "reviews" ? "Đánh giá ngay →" : "Xem đồ dã ngoại →"}
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    className="adm-field adm-field--sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* BƯỚC 4 UC9.4: KHUNG LIVE PREVIEW (Xem trước thông báo trước khi phát hành) */}
        <div className="adm-notif-preview-wrap">
          <div className="text-[0.75rem] font-extrabold text-[#475569] uppercase tracking-wider mb-2 flex items-center gap-1.5 flex-wrap">
            <span>👁️ BƯỚC 4 UC9.4: XEM TRƯỚC THÔNG BÁO (LIVE PREVIEW)</span>
            <span className="text-[0.68rem] font-normal text-[#64748B] normal-case tracking-normal">Mô phỏng giao diện người nhận</span>
          </div>

          <div className="adm-notif-preview-card">
            <div className="flex justify-between items-start mb-1.5 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong className="adm-cell-title">
                  {title.trim() || "(Chưa nhập tiêu đề)"}
                </strong>
                <span className={`adm-pill adm-pill--xs ${category === "rental" ? "is-warning" : category === "order" ? "is-info" : category === "finance" ? "is-success" : "is-neutral"}`}>
                  {category.toUpperCase()}
                </span>
              </div>
              <span className={`adm-pill adm-pill--xs ${type === "alert" ? "is-danger" : type === "warning" ? "is-warning" : "is-success"}`}>
                {targetRole === "all" ? "TẤT CẢ" : targetRole.toUpperCase()}
              </span>
            </div>

            <p className="text-[0.78rem] text-[#4B5563] mt-1 mb-2 leading-relaxed">
              {message.trim() || "(Chưa nhập nội dung thông báo...)"}
            </p>

            {/* Cho phép pill liên kết xuống dòng khi actionLabel dài trên mobile 390px */}
            <div className="flex justify-between items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
              <span className="adm-muted-note text-[0.68rem]">Vừa xong</span>
              {hasActionLink && (
                <span className="adm-pill is-info adm-pill--xs">
                  {actionLabel.trim() || (actionType === "order" ? `Xem đơn #${actionTargetId || "ORD-001"} →` : actionType === "reviews" ? "Đánh giá ngay →" : "Xem catalog →")}
                </span>
              )}
            </div>
          </div>
        </div>

        {realApi && (
          <div>
            <label className="adm-label--sub">
              Mã tài khoản nhận cụ thể (tùy chọn)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Để trống để gửi thông báo hệ thống chung"
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="adm-field adm-field--compact"
            />
          </div>
        )}

        {sendError && (
          <div role="alert" className="adm-alert adm-alert--compact is-error mb-0">
            <Icon name="alert-circle" size={16} />
            <span>{sendError}</span>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={sendLoading} className="btn btn-primary btn-md">
            {sendLoading ? "Đang phát hành..." : "✓ Xác nhận & Phát hành thông báo (UC9.4)"}
          </button>
          {sentSuccess && (
            <span className="badge badge-success">✓ Đã phát thông báo thành công đến đối tượng mục tiêu!</span>
          )}
        </div>
      </form>
    </div>
  );
}
