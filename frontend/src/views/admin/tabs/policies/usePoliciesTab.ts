import { useState, useEffect } from "react";
import type { useApp } from "../../../../context/AppContext";
import { isRealApiEnabled } from "../../../../services/apiClient";
import { policyApi, type KiemTraChinhSachBackend } from "../../../../services/api/policyApi";
import { buildTaoChinhSachRequestFromConfig } from "../../../../services/mappers/policyPromoMapper";
import { fmt, type RentalPolicyConfig, type PolicyVersion } from "../../../../store";

export interface PolicyFieldDiff {
  field: string;
  oldVal: string;
  newVal: string;
}

function formatLocalDatetimeMinutes(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Hook quản lý cấu hình chính sách thuê & hủy có phiên bản (UC8.1 & UC8.1.1),
 * so sánh diff cũ/mới, kiểm tra hợp lệ với máy chủ và ban hành phiên bản mới.
 */
export function usePoliciesTab(app: ReturnType<typeof useApp>) {
  const realApi = app.realApi || isRealApiEnabled();
  const [subTab, setSubTab] = useState<"current" | "history">("current");
  const [form, setForm] = useState<RentalPolicyConfig>({ ...app.policies });
  const [changeReason, setChangeReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => formatLocalDatetimeMinutes(new Date(Date.now() + 5 * 60_000)));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PolicyVersion | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalError, setModalError] = useState("");
  const [policySaving, setPolicySaving] = useState(false);
  const [checkingPolicy, setCheckingPolicy] = useState(false);
  const [previewCheck, setPreviewCheck] = useState<KiemTraChinhSachBackend | null>(null);

  useEffect(() => {
    if (realApi) {
      void app.refreshPolicies?.();
    }
  }, [realApi]);

  // Đồng bộ form khi app.policies thay đổi
  useEffect(() => {
    setForm({ ...app.policies });
  }, [app.policies]);

  // Tìm danh sách các trường thay đổi so với bản hiện hành để hiển thị bảng diff
  const getChangedFields = (): PolicyFieldDiff[] => {
    const diffs: PolicyFieldDiff[] = [];
    if (form.holdMinutes !== app.policies.holdMinutes) {
      diffs.push({ field: "Thời gian giữ chỗ", oldVal: `${app.policies.holdMinutes} phút`, newVal: `${form.holdMinutes} phút` });
    }
    if (form.standardPickupTime !== app.policies.standardPickupTime) {
      diffs.push({ field: "Giờ nhận tiêu chuẩn", oldVal: app.policies.standardPickupTime, newVal: form.standardPickupTime });
    }
    if (form.standardReturnTime !== app.policies.standardReturnTime) {
      diffs.push({ field: "Giờ trả tiêu chuẩn", oldVal: app.policies.standardReturnTime, newVal: form.standardReturnTime });
    }
    if (form.minDepositPercentage !== app.policies.minDepositPercentage) {
      diffs.push({ field: "Tỷ lệ đặt cọc tối thiểu", oldVal: `${app.policies.minDepositPercentage}%`, newVal: `${form.minDepositPercentage}%` });
    }
    if (form.overdueMultiplier !== app.policies.overdueMultiplier) {
      diffs.push({ field: "Hệ số phạt trễ hạn", oldVal: `${app.policies.overdueMultiplier}x`, newVal: `${form.overdueMultiplier}x` });
    }
    if (form.cancellationTier1FeePercent !== app.policies.cancellationTier1FeePercent) {
      diffs.push({ field: "Phí phạt hủy 24h-48h", oldVal: `${app.policies.cancellationTier1FeePercent}%`, newVal: `${form.cancellationTier1FeePercent}%` });
    }
    if (form.cancellationTier2FeePercent !== app.policies.cancellationTier2FeePercent) {
      diffs.push({ field: "Phí phạt hủy <24h", oldVal: `${app.policies.cancellationTier2FeePercent}%`, newVal: `${form.cancellationTier2FeePercent}%` });
    }
    if (form.damageCompensationPercent !== app.policies.damageCompensationPercent) {
      diffs.push({ field: "Tỷ lệ bồi thường hư hỏng", oldVal: `${app.policies.damageCompensationPercent}%`, newVal: `${form.damageCompensationPercent}%` });
    }
    if (form.adminApprovalFeeThreshold !== app.policies.adminApprovalFeeThreshold) {
      diffs.push({ field: "Ngưỡng duyệt phụ phí của Admin", oldVal: fmt(app.policies.adminApprovalFeeThreshold), newVal: fmt(form.adminApprovalFeeThreshold) });
    }
    if (form.reminderPickupHoursBefore !== app.policies.reminderPickupHoursBefore) {
      diffs.push({ field: "Nhắc nhận máy trước", oldVal: `${app.policies.reminderPickupHoursBefore}h`, newVal: `${form.reminderPickupHoursBefore}h` });
    }
    if (form.reminderReturnHoursBefore !== app.policies.reminderReturnHoursBefore) {
      diffs.push({ field: "Nhắc trả máy trước", oldVal: `${app.policies.reminderReturnHoursBefore}h`, newVal: `${form.reminderReturnHoursBefore}h` });
    }
    return diffs;
  };

  // Kiểm tra sơ bộ dòng phụ 2.1, mở modal đối chiếu và gọi API kiểm tra trước (nếu realApi)
  const handleOpenReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const diffs = getChangedFields();
    if (diffs.length === 0) {
      setMessage({ type: "error", text: "Bạn chưa thay đổi thông số nào so với chính sách hiện hành." });
      return;
    }
    if (form.holdMinutes <= 0) return setMessage({ type: "error", text: "Thời gian giữ chỗ phải lớn hơn 0 phút." });
    if (form.overdueMultiplier <= 0) return setMessage({ type: "error", text: "Hệ số phạt trễ phải lớn hơn 0." });
    if (form.cancellationTier1FeePercent > form.cancellationTier2FeePercent) {
      return setMessage({ type: "error", text: "Mâu thuẫn mốc hủy: Phạt hủy 24-48h không được cao hơn phạt hủy sát giờ (<24h)." });
    }
    setMessage(null);
    setModalError("");
    setPreviewCheck(null);

    const parsedEff = new Date(effectiveDate);
    const nextEff =
      !isNaN(parsedEff.getTime()) && parsedEff.getTime() > Date.now()
        ? effectiveDate
        : formatLocalDatetimeMinutes(new Date(Date.now() + 5 * 60_000));
    if (nextEff !== effectiveDate) {
      setEffectiveDate(nextEff);
    }

    setShowConfirmModal(true);

    if (realApi) {
      setCheckingPolicy(true);
      try {
        const req = buildTaoChinhSachRequestFromConfig(
          changeReason.trim() || `Cập nhật chính sách từ ${nextEff.slice(0, 10)}`,
          new Date(nextEff).toISOString(),
          form
        );
        const check = await policyApi.kiemTra(req);
        setPreviewCheck(check);
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể kiểm tra hợp lệ chính sách với máy chủ.");
      } finally {
        setCheckingPolicy(false);
      }
    }
  };

  // Ban hành phiên bản chính sách mới lên máy chủ hoặc cập nhật store mẫu
  const handleConfirmSave = async () => {
    if (!changeReason.trim()) {
      setModalError("Vui lòng ghi rõ lý do ban hành chính sách mới (bắt buộc theo UC8.1).");
      return;
    }

    if (realApi) {
      const parsed = new Date(effectiveDate);
      if (isNaN(parsed.getTime())) {
        setModalError("Thời điểm bắt đầu có hiệu lực không hợp lệ.");
        return;
      }
      setPolicySaving(true);
      setModalError("");
      try {
        const req = buildTaoChinhSachRequestFromConfig(changeReason.trim(), parsed.toISOString(), form);
        const check = await policyApi.kiemTra(req);
        setPreviewCheck(check);
        if (!check.hopLe) {
          const detail = (check.loiTheoDuongDan ?? [])
            .map((l) => (l.duongDan ? `${l.duongDan}: ${l.thongDiep}` : l.thongDiep))
            .join(" | ");
          setModalError(detail || "Nội dung chính sách chưa hợp lệ theo kiểm tra máy chủ.");
          return;
        }
        await policyApi.taoPhienBan(req);
        await app.refreshPolicies?.();
        setShowConfirmModal(false);
        setChangeReason("");
        setPreviewCheck(null);
        setMessage({
          type: "success",
          text: "Đã ban hành phiên bản chính sách mới lên máy chủ! Đơn cũ giữ nguyên chính sách đã chốt (UC8.1).",
        });
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Không thể ban hành phiên bản chính sách mới.");
      } finally {
        setPolicySaving(false);
      }
      return;
    }

    const res = app.updatePolicy(form, changeReason.trim(), effectiveDate.trim() || undefined);
    if (res.ok) {
      setShowConfirmModal(false);
      setChangeReason("");
      setMessage({
        type: "success",
        text: `Đã ban hành phiên bản chính sách mới thành công! Đơn cũ giữ nguyên chính sách đã chốt (UC8.1).`,
      });
    } else {
      setModalError(res.message);
    }
  };

  // Cập nhật đơn giá bồi thường của từng phụ kiện lẻ theo vị trí trong danh sách
  const updateAccessoryFee = (index: number, newFee: number) => {
    const nextSchedule = [...(form.accessoryLossFeeSchedule || [])];
    if (nextSchedule[index]) {
      nextSchedule[index] = { ...nextSchedule[index], defaultFee: newFee };
      setForm({ ...form, accessoryLossFeeSchedule: nextSchedule });
    }
  };

  const currentVer = app.policies.version || "v1.2";

  return {
    subTab, setSubTab, form, setForm, changeReason, setChangeReason,
    effectiveDate, setEffectiveDate, showConfirmModal, setShowConfirmModal,
    selectedSnapshot, setSelectedSnapshot, message, modalError, setModalError,
    policySaving, checkingPolicy, previewCheck, currentVer,
    getChangedFields, handleOpenReview, handleConfirmSave, updateAccessoryFee,
  };
}
