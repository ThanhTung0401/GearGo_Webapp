import { useForgotPassword } from "./forgot/useForgotPassword";
import { ForgotStepInput } from "./forgot/ForgotStepInput";
import { ForgotStepOtp } from "./forgot/ForgotStepOtp";
import { ForgotStepReset } from "./forgot/ForgotStepReset";
import { ForgotStepSuccess } from "./forgot/ForgotStepSuccess";

/**
 * Trang Quên mật khẩu & Xác minh OTP 4 bước (UC1.4 / UC15).
 */
export function ForgotPasswordView() {
  const vm = useForgotPassword();

  if (vm.step === "otp") {
    return (
      <ForgotStepOtp
        contact={vm.contact}
        otp={vm.otp}
        setOtp={vm.setOtp}
        err={vm.err}
        notice={vm.notice}
        clearErr={() => vm.setErr("")}
        loading={vm.loading}
        onSubmit={vm.handleVerifyOtp}
        onResendOtp={vm.handleResendOtp}
        onChangeContact={() => vm.setStep("input")}
      />
    );
  }

  if (vm.step === "reset") {
    return (
      <ForgotStepReset
        contact={vm.contact}
        newPass={vm.newPass}
        setNewPass={vm.setNewPass}
        confirm={vm.confirm}
        setConfirm={vm.setConfirm}
        err={vm.err}
        clearErr={() => vm.setErr("")}
        loading={vm.loading}
        onSubmit={vm.handleResetPassword}
      />
    );
  }

  if (vm.step === "success") {
    return <ForgotStepSuccess contact={vm.contact} onGoToLogin={vm.goToLogin} />;
  }

  return (
    <ForgotStepInput
      contact={vm.contact}
      setContact={vm.setContact}
      err={vm.err}
      clearErr={() => vm.setErr("")}
      loading={vm.loading}
      onSubmit={vm.handleSubmitContact}
      onBackToLogin={vm.goToLogin}
    />
  );
}
