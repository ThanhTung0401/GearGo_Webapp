import Icon from "../../../components/Icon";

interface AIAdvisorAuthModalProps {
  itemCount: number;
  onLogin: () => void;
  onClose: () => void;
}

/**
 * Modal yêu cầu đăng nhập đối với khách vãng lai khi thêm combo AI vào giỏ (UC2.4.2).
 */
export function AIAdvisorAuthModal({ itemCount, onLogin, onClose }: AIAdvisorAuthModalProps) {
  return (
    <div className="cp-modal-overlay">
      <div className="cp-modal-box cp-modal-box--460-lg">
        <div className="cp-modal-auth-icon cp-modal-auth-icon--lg">
          <Icon name="user" size={26} />
        </div>
        <h3 className="cp-modal-auth-title cp-modal-auth-title--lg">
          Yêu cầu đăng nhập tài khoản
        </h3>
        <p className="cp-modal-auth-desc cp-modal-auth-desc--lg">
          Theo quy định <strong>UC2.4.2</strong>, khách vãng lai cần đăng nhập để lưu danh mục thiết bị gợi ý vào giỏ thuê cá nhân và đồng bộ lịch trình.
        </p>

        <div className="cp-modal-auth-tip">
          💡 <em>Đăng nhập chỉ mất 10 giây. Toàn bộ {itemCount} món bạn đã tùy chỉnh sẽ được lưu giữ nguyên vẹn.</em>
        </div>

        {/* Cho phép các nút modal xuống dòng trên viewport hẹp 390px */}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={onLogin}
            className="btn btn-primary cp-modal-btn-primary cp-modal-btn-primary--lg"
          >
            Đăng nhập / Đăng ký ngay →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary cp-modal-btn-secondary cp-modal-btn-secondary--lg"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
