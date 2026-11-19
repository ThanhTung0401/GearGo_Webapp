import Icon from "../../../components/Icon";

interface CartAuthModalProps {
  onLogin: () => void;
  onClose: () => void;
}

/**
 * Modal yêu cầu đăng nhập đối với khách vãng lai trước khi đặt thuê hoặc áp mã ưu đãi.
 */
export function CartAuthModal({ onLogin, onClose }: CartAuthModalProps) {
  return (
    <div className="cp-modal-overlay">
      <div className="cp-modal-box cp-modal-box--sm">
        <div className="cp-modal-auth-icon">
          <Icon name="user" size={24} />
        </div>
        <h3 className="cp-modal-auth-title">
          Đăng nhập để đặt thuê thiết bị
        </h3>
        <p className="cp-modal-auth-desc">
          Để lưu đơn thuê, giữ chỗ thiết bị 15 phút và bảo đảm quyền lợi hoàn cọc, quý khách vui lòng đăng nhập hoặc tạo tài khoản GearGo.
        </p>
        {/* Cho phép các nút modal xuống dòng trên viewport hẹp 390px */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={onLogin}
            className="btn btn-primary cp-modal-btn-primary"
          >
            Đăng nhập / Đăng ký ngay →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary cp-modal-btn-secondary"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
