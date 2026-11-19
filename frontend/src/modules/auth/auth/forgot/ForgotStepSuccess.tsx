import Icon from "../../../../components/Icon";

interface ForgotStepSuccessProps {
  contact: string;
  onGoToLogin: () => void;
}

/**
 * Bước 4 khôi phục mật khẩu: thông báo đổi mật khẩu thành công và điều hướng đăng nhập lại.
 */
export function ForgotStepSuccess({ contact, onGoToLogin }: ForgotStepSuccessProps) {
  return (
    <div className="auth-page">
      <div className="auth-wrapper text-center">
        <div className="auth-card text-center">
          <div className="auth-icon-badge">
            <Icon name="check" size={26} />
          </div>
          <h2 className="auth-title">Đổi mật khẩu thành công!</h2>
          <p className="auth-subtitle mb-6">
            Mật khẩu tài khoản <strong>{contact}</strong> đã được cập nhật thành công. Vui lòng đăng nhập lại.
          </p>
          <button
            onClick={onGoToLogin}
            className="btn btn-primary btn-lg btn-full"
          >
            Đăng nhập ngay →
          </button>
        </div>
      </div>
    </div>
  );
}
