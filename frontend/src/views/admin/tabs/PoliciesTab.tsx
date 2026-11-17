import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../App";
import { isRealApiEnabled } from "../../../services/apiClient";

import { policyApi, type KiemTraChinhSachBackend } from "../../../services/api/policyApi";

import { buildTaoChinhSachRequestFromConfig } from "../../../services/mappers/policyPromoMapper";
import { fmt, type RentalPolicyConfig, type PolicyVersion } from "../../../store";
import Icon from "../../../components/Icon";
function formatLocalDatetimeMinutes(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PoliciesTab({ app }: { app: ReturnType<typeof useApp> }) {
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

  // Tìm danh sách các trường thay đổi so với bản hiện hành
  const getChangedFields = () => {
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
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

  const handleOpenReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const diffs = getChangedFields();
    if (diffs.length === 0) {
      setMessage({ type: "error", text: "Bạn chưa thay đổi thông số nào so với chính sách hiện hành." });
      return;
    }
    // Validation sơ bộ dòng phụ 2.1
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
        const req = buildTaoChinhSachRequestFromConfig(
          changeReason.trim(),
          parsed.toISOString(),
          form
        );
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
      setMessage({ type: "success", text: `Đã ban hành phiên bản chính sách mới thành công! Đơn cũ giữ nguyên chính sách đã chốt (UC8.1).` });
    } else {
      setModalError(res.message);
    }
  };

  const updateAccessoryFee = (index: number, newFee: number) => {
    const nextSchedule = [...(form.accessoryLossFeeSchedule || [])];
    if (nextSchedule[index]) {
      nextSchedule[index] = { ...nextSchedule[index], defaultFee: newFee };
      setForm({ ...form, accessoryLossFeeSchedule: nextSchedule });
    }
  };

  const currentVer = app.policies.version || "v1.2";

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header & SubTabs */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)" }}>
              Cấu hình chính sách thuê & hủy (UC8.1)
            </h2>
            <span style={{ background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {currentVer}
            </span>
          </div>
          <p style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 2 }}>
            Thiết lập quy tắc kinh doanh có phiên bản. Thay đổi chỉ áp dụng cho đơn mới, giữ nguyên chính sách trên các đơn cũ (không tính hồi tố).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab("current")}
            style={{
              background: subTab === "current" ? "var(--color-forest)" : "white",
              color: subTab === "current" ? "white" : "var(--color-bark)",
              border: "1px solid var(--color-bone)",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            ⚙️ Cấu hình hiện hành
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            style={{
              background: subTab === "history" ? "var(--color-forest)" : "white",
              color: subTab === "history" ? "white" : "var(--color-bark)",
              border: "1px solid var(--color-bone)",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            📜 Lịch sử phiên bản ({app.policyVersions.length})
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.type === "success" ? "#DCFCE7" : "#FEE2E2",
          color: message.type === "success" ? "#15803D" : "#B91C1C",
          border: `1px solid ${message.type === "success" ? "#A7F3D0" : "#FECACA"}`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", fontWeight: 600
        }}>
          {message.text}
        </div>
      )}

      {/* SUBTAB 1: CẤU HÌNH HIỆN HÀNH */}
      {subTab === "current" && (
        <form onSubmit={handleOpenReview} className="flex flex-col gap-5">
          {/* Nhóm 1: Thời gian & Giữ chỗ */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⏱</span> 1. Thời gian & Quy định giữ chỗ
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Kiểm soát vòng đời đơn Chờ thanh toán và khung giờ tiếp đón khách giao nhận thiết bị tại cửa hàng.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Hạn giữ chỗ thanh toán (phút)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.holdMinutes}
                  onChange={(e) => setForm({ ...form, holdMinutes: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Đơn Chờ thanh toán tự động hủy khi hết hạn.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Giờ nhận máy tiêu chuẩn
                </label>
                <input
                  type="time"
                  value={form.standardPickupTime || "08:00"}
                  onChange={(e) => setForm({ ...form, standardPickupTime: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Giờ mở cửa phục vụ giao máy sớm nhất.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Giờ trả máy tiêu chuẩn
                </label>
                <input
                  type="time"
                  value={form.standardReturnTime || "20:00"}
                  onChange={(e) => setForm({ ...form, standardReturnTime: e.target.value })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Giờ đóng cửa tiếp nhận trả máy trong ngày.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ đặt cọc tối thiểu (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.minDepositPercentage ?? 100}
                  onChange={(e) => setForm({ ...form, minDepositPercentage: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Mặc định 100% giá trị cọc quy định.</span>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Mốc hủy đơn & Phạt hoàn tiền (UC8.1) */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🚫</span> 2. Mốc hủy đơn & Tỷ lệ phạt hoàn cọc (UC8.1)
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Quy tắc tính phí phạt hủy khi khách chủ động hủy đơn trước giờ nhận máy. Chặn mâu thuẫn mốc thời gian (Dòng phụ 2.1).
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#15803D", marginBottom: 4 }}>
                  Mốc 1: Hủy trước &gt; {form.cancellationFreeHours ?? 48} giờ
                </div>
                <div style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                  Phí phạt hủy: <strong>0%</strong> (Hoàn 100% tiền cọc và tiền thuê).
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ phạt hủy trước 24h - 48h (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.cancellationTier1FeePercent}
                  onChange={(e) => setForm({ ...form, cancellationTier1FeePercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Áp dụng khi khách hủy đơn trong khoảng 24h đến 48h trước giờ nhận.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ phạt hủy sát giờ &lt; 24h (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.cancellationTier2FeePercent}
                  onChange={(e) => setForm({ ...form, cancellationTier2FeePercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Hủy sát giờ (&lt;24h) không được hoàn tiền thuê theo quy định.</span>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Phạt trễ hạn & Biểu phí bồi thường hư hỏng / phụ kiện */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️</span> 3. Phạt trễ hạn & Biểu phí bồi thường hư hại / phụ kiện
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Cơ sở để nhân viên kho tính phụ phí quá hạn và bồi thường khi khách làm hỏng máy hoặc thất lạc phụ kiện.
            </p>
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Hệ số phạt trễ hạn (lần/ngày)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={form.overdueMultiplier}
                  onChange={(e) => setForm({ ...form, overdueMultiplier: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Ví dụ: 1.5 tương ứng 150% đơn giá ngày cho mỗi ngày quá hạn.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Tỷ lệ đền bù hư hỏng cơ bản (% giá trị thiết bị)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={form.damageCompensationPercent ?? 50}
                  onChange={(e) => setForm({ ...form, damageCompensationPercent: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Mức phạt gợi ý khi thiết bị trầy xước nặng hoặc hỏng linh kiện.</span>
              </div>
            </div>

            {/* Biểu phí phụ kiện lẻ */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                Biểu phí bồi thường mất phụ kiện lẻ kèm theo:
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                {(form.accessoryLossFeeSchedule || []).map((item, idx) => (
                  <div key={item.accessoryName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{item.accessoryName}</span>
                    <input
                      type="number"
                      step="10000"
                      min="0"
                      value={item.defaultFee}
                      onChange={(e) => updateAccessoryFee(idx, Number(e.target.value))}
                      style={{ width: 110, textAlign: "right", border: "1px solid var(--color-bone)", borderRadius: 4, padding: "4px 6px", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nhóm 4: Ngưỡng duyệt phí quản trị & Lịch nhắc khách */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", padding: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-forest)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛡</span> 4. Ngưỡng duyệt phụ phí & Lịch nhắc khách tự động
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 14 }}>
              Cấu hình bảo vệ kiểm soát nội bộ và tự động hóa trải nghiệm khách hàng trước các mốc nhận/trả.
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Ngưỡng phụ phí Admin duyệt (VNĐ)
                </label>
                <input
                  type="number"
                  step="100000"
                  min="0"
                  value={form.adminApprovalFeeThreshold ?? 1000000}
                  onChange={(e) => setForm({ ...form, adminApprovalFeeThreshold: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Phụ phí vượt mức này nhân viên không được tự quyết, cần Admin duyệt.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Nhắc nhận máy trước (giờ)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.reminderPickupHoursBefore ?? 4}
                  onChange={(e) => setForm({ ...form, reminderPickupHoursBefore: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Hệ thống gửi thông báo nhắc khách đến nhận máy.</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Nhắc trả máy trước (giờ)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.reminderReturnHoursBefore ?? 2}
                  onChange={(e) => setForm({ ...form, reminderReturnHoursBefore: Number(e.target.value) })}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Gửi cảnh báo trước giờ hẹn trả để tránh phát sinh phụ phí trễ.</span>
              </div>
            </div>
          </div>

          {/* Banner thông tin phiên bản & Nút lưu */}
          <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-bark)", fontWeight: 700 }}>
                Chính sách đang áp dụng: <span style={{ color: "var(--color-forest)" }}>{currentVer}</span> (Hiệu lực từ {app.policies.effectiveDate || "01/12/2024"})
              </div>
              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 2 }}>
                Ban hành bởi <strong>{app.policies.updatedBy}</strong> lúc {app.policies.updatedAt}
              </div>
            </div>
            <button
              type="submit"
              style={{
                background: "var(--color-forest)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)"
              }}
            >
              Xem lại tác động & Ban hành phiên bản mới (UC8.1.1) →
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: LỊCH SỬ PHIÊN BẢN (UC8.1.1) */}
      {subTab === "history" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-bone)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-bark)" }}>
              Lịch sử các phiên bản chính sách đã ban hành ({app.policyVersions.length})
            </h3>
            <p style={{ fontSize: "0.75rem", color: "#6B7280", margin: 0 }}>
              Mỗi phiên bản lưu giữ toàn bộ snapshot quy tắc kinh doanh tại thời điểm ban hành. Đơn thuê phát sinh thời điểm nào giữ nguyên căn cứ tính của phiên bản đó.
            </p>
          </div>
          <div className="responsive-table">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)" }}>
                  {["Phiên bản", "Ngày hiệu lực", "Ngày cập nhật", "Người ban hành", "Lý do ban hành / Nội dung thay đổi", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.policyVersions.map((v, i) => (
                  <tr key={v.version} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)", fontSize: "0.8rem" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>
                      {v.version}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{v.effectiveDate}</td>
                    <td style={{ padding: "12px 14px", color: "#6B7280", fontSize: "0.75rem" }}>{v.updatedAt}</td>
                    <td style={{ padding: "12px 14px" }}>{v.updatedBy}</td>
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{v.changeReason}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedSnapshot(v)}
                        style={{ background: "white", color: "var(--color-forest)", border: "1px solid var(--color-forest)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                      >
                        👁 Xem snapshot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL SO SÁNH ĐỐI CHIẾU CŨ VS MỚI (UC8.1.1) */}
      {showConfirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC8.1.1: ĐỐI CHIẾU PHIÊN BẢN MỚI
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Xác nhận ban hành chính sách mới
                </h3>
              </div>
              <button type="button" onClick={() => setShowConfirmModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ fontSize: "0.78rem", color: "#4B5563", marginBottom: 12 }}>
              Hệ thống đã phát hiện <strong>{getChangedFields().length} thông số</strong> có sự thay đổi so với phiên bản hiện tại:
            </p>

            {/* Bảng diff Cũ vs Mới */}
            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 10, marginBottom: 16, border: "1px solid var(--color-bone)", maxHeight: 180, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ color: "#6B7280", textAlign: "left" }}>
                    <th style={{ padding: "4px 8px" }}>Thông số</th>
                    <th style={{ padding: "4px 8px" }}>Giá trị cũ</th>
                    <th style={{ padding: "4px 8px" }}>Giá trị mới</th>
                  </tr>
                </thead>
                <tbody>
                  {getChangedFields().map((d) => (
                    <tr key={d.field} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{d.field}</td>
                      <td style={{ padding: "6px 8px", color: "#9CA3AF", textDecoration: "line-through" }}>{d.oldVal}</td>
                      <td style={{ padding: "6px 8px", color: "var(--color-forest)", fontWeight: 700 }}>{d.newVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Lý do điều chỉnh chính sách * (Bắt buộc theo UC8.1)
              </label>
              <textarea
                placeholder="VD: Cập nhật biểu phí bồi thường phụ kiện và nâng tỷ lệ phạt hủy mùa cao điểm..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                rows={2}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem", resize: "none" }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Thời điểm bắt đầu có hiệu lực
              </label>
              <input
                type="datetime-local"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem" }}
              />
              <span style={{ fontSize: "0.7rem", color: "#6B7280" }}>Chính sách mới sẽ chỉ áp dụng cho các đơn đặt thuê phát sinh từ mốc thời gian này (không hồi tố).</span>
            </div>

            {checkingPolicy && (
              <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 10 }}>
                Đang kiểm tra hợp lệ phiên bản chính sách với máy chủ...
              </div>
            )}

            {previewCheck && (previewCheck.canhBao?.length ?? 0) > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", marginBottom: 10 }}>
                <strong>Cảnh báo từ hệ thống:</strong> {previewCheck.canhBao.join(" | ")}
              </div>
            )}

            {modalError && (
              <div
                role="alert"
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: "0.78rem",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="alert-circle" size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={policySaving}
                onClick={() => {
                  setShowConfirmModal(false);
                  setModalError("");
                }}
                style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={policySaving}
                onClick={() => void handleConfirmSave()}
                style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                {policySaving ? "Đang ban hành..." : "✓ Ban hành & Lưu phiên bản mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT SNAPSHOT PHIÊN BẢN CŨ */}
      {selectedSnapshot && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "var(--color-parchment)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  SNAPSHOT {selectedSnapshot.version}
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Chính sách có hiệu lực từ {selectedSnapshot.effectiveDate}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedSnapshot(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 12 }}>
              Lý do ban hành: <strong>{selectedSnapshot.changeReason}</strong> (Cập nhật bởi {selectedSnapshot.updatedBy} lúc {selectedSnapshot.updatedAt})
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12, fontSize: "0.78rem", display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              <div className="flex justify-between"><span>Thời gian giữ chỗ:</span><strong>{selectedSnapshot.configSnapshot.holdMinutes} phút</strong></div>
              <div className="flex justify-between"><span>Giờ nhận / trả chuẩn:</span><strong>{selectedSnapshot.configSnapshot.standardPickupTime || "08:00"} - {selectedSnapshot.configSnapshot.standardReturnTime || "20:00"}</strong></div>
              <div className="flex justify-between"><span>Phí phạt hủy 24-48h:</span><strong>{selectedSnapshot.configSnapshot.cancellationTier1FeePercent}%</strong></div>
              <div className="flex justify-between"><span>Phí phạt hủy &lt;24h:</span><strong>{selectedSnapshot.configSnapshot.cancellationTier2FeePercent}%</strong></div>
              <div className="flex justify-between"><span>Hệ số phạt trễ hạn:</span><strong>{selectedSnapshot.configSnapshot.overdueMultiplier}x/ngày</strong></div>
              <div className="flex justify-between"><span>Tỷ lệ bồi thường hỏng:</span><strong>{selectedSnapshot.configSnapshot.damageCompensationPercent}%</strong></div>
              <div className="flex justify-between"><span>Ngưỡng duyệt phụ phí:</span><strong>{fmt(selectedSnapshot.configSnapshot.adminApprovalFeeThreshold)}</strong></div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. Soạn & Gửi Thông Báo Hệ Thống (UC9.4 & UC9.5) ──────────────────────────
