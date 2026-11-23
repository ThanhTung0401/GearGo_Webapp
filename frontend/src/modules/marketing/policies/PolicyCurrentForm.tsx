import { formatDateTimeVi, formatDateVi, type RentalPolicyConfig } from "../../../store";
import { Can } from "../../../features/permissions/PermissionsContext";
import { Permissions } from "../../../constants/permissions";

interface PolicyCurrentFormProps {
  form: RentalPolicyConfig;
  currentPolicy: RentalPolicyConfig;
  currentVer: string;
  onChangeForm: (next: RentalPolicyConfig) => void;
  onUpdateAccessoryFee: (index: number, newFee: number) => void;
  // [POLICY-02]: cho phép Admin thêm / xóa / đổi tên dòng phụ kiện ngay trong form.
  onAddAccessoryFee?: () => void;
  onRemoveAccessoryFee?: (index: number) => void;
  onUpdateAccessoryName?: (index: number, name: string) => void;
  onSubmitReview: (e: React.FormEvent) => void;
}

/**
 * Biểu mẫu cấu hình 4 nhóm quy tắc kinh doanh hiện hành (UC8.1).
 */
export function PolicyCurrentForm({
  form,
  currentPolicy,
  currentVer,
  onChangeForm,
  onUpdateAccessoryFee,
  onAddAccessoryFee,
  onRemoveAccessoryFee,
  onUpdateAccessoryName,
  onSubmitReview,
}: PolicyCurrentFormProps) {
  return (
    <form onSubmit={onSubmitReview} className="flex flex-col gap-5">
      {/* Nhóm 1: Thời gian & Giữ chỗ */}
      <div className="adm-card adm-card--padded">
        <h3 className="adm-policy-h3">
          <span>⏱</span> 1. Thời gian & Quy định giữ chỗ
        </h3>
        <p className="adm-hint-text mb-3.5">
          Kiểm soát vòng đời đơn Chờ thanh toán và khung giờ tiếp đón khách giao nhận thiết bị tại cửa hàng.
        </p>
        <div className="adm-grid-auto-md">
          <div>
            <label className="adm-label--sub">
              Hạn giữ chỗ thanh toán (phút)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={form.holdMinutes}
              onChange={(e) => onChangeForm({ ...form, holdMinutes: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Đơn Chờ thanh toán tự động hủy khi hết hạn.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Giờ nhận máy tiêu chuẩn
            </label>
            <input
              type="time"
              value={form.standardPickupTime || "08:00"}
              onChange={(e) => onChangeForm({ ...form, standardPickupTime: e.target.value })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Giờ mở cửa phục vụ giao máy sớm nhất.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Giờ trả máy tiêu chuẩn
            </label>
            <input
              type="time"
              value={form.standardReturnTime || "20:00"}
              onChange={(e) => onChangeForm({ ...form, standardReturnTime: e.target.value })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Giờ đóng cửa tiếp nhận trả máy trong ngày.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Tỷ lệ đặt cọc tối thiểu (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.minDepositPercentage ?? 100}
              onChange={(e) => onChangeForm({ ...form, minDepositPercentage: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Mặc định 100% giá trị cọc quy định.</span>
          </div>
        </div>
      </div>

      {/* Nhóm 2: Mốc hủy đơn & Phạt hoàn tiền (UC8.1) */}
      <div className="adm-card adm-card--padded">
        <h3 className="adm-policy-h3">
          <span>🚫</span> 2. Mốc hủy đơn & Tỷ lệ phạt hoàn cọc (UC8.1)
        </h3>
        <p className="adm-hint-text mb-3.5">
          Quy tắc tính phí phạt hủy khi khách chủ động hủy đơn trước giờ nhận máy. Chặn mâu thuẫn mốc thời gian (Dòng phụ 2.1).
        </p>
        <div className="adm-grid-auto-md">
          <div className="adm-policy-free-box">
            <div className="font-bold text-[0.8rem] text-[#15803D] mb-1">
              Mốc 1: Hủy trước &gt; {form.cancellationFreeHours ?? 48} giờ
            </div>
            <div className="text-[0.75rem] text-[#4B5563]">
              Phí phạt hủy: <strong>0%</strong> (Hoàn 100% tiền cọc và tiền thuê).
            </div>
          </div>
          <div>
            <label className="adm-label--sub">
              Tỷ lệ phạt hủy trước 24h - 48h (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.cancellationTier1FeePercent}
              onChange={(e) => onChangeForm({ ...form, cancellationTier1FeePercent: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Áp dụng khi khách hủy đơn trong khoảng 24h đến 48h trước giờ nhận.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Tỷ lệ phạt hủy sát giờ &lt; 24h (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.cancellationTier2FeePercent}
              onChange={(e) => onChangeForm({ ...form, cancellationTier2FeePercent: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Hủy sát giờ (&lt;24h) không được hoàn tiền thuê theo quy định.</span>
          </div>
        </div>
      </div>

      {/* Nhóm 3: Phạt trễ hạn & Biểu phí bồi thường hư hỏng / phụ kiện */}
      <div className="adm-card adm-card--padded">
        <h3 className="adm-policy-h3">
          <span>⚠️</span> 3. Phạt trễ hạn & Biểu phí bồi thường hư hại / phụ kiện
        </h3>
        <p className="adm-hint-text mb-3.5">
          Cơ sở để nhân viên kho tính phụ phí quá hạn và bồi thường khi khách làm hỏng máy hoặc thất lạc phụ kiện.
        </p>
        <div className="adm-grid-2 mb-4 gap-4">
          <div>
            <label className="adm-label--sub">
              Hệ số phạt trễ hạn (lần/ngày)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={form.overdueMultiplier}
              onChange={(e) => onChangeForm({ ...form, overdueMultiplier: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Ví dụ: 1.5 tương ứng 150% đơn giá ngày cho mỗi ngày quá hạn.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Tỷ lệ đền bù hư hỏng cơ bản (% giá trị thiết bị)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={form.damageCompensationPercent ?? 50}
              onChange={(e) => onChangeForm({ ...form, damageCompensationPercent: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Mức phạt gợi ý khi thiết bị trầy xước nặng hoặc hỏng linh kiện.</span>
          </div>
        </div>

        {/* Biểu phí phụ kiện lẻ */}
        <div className="adm-card--parchment">
          <div className="adm-label--sub mb-2">
            Biểu phí bồi thường mất phụ kiện lẻ kèm theo:
          </div>
          <div className="adm-grid-auto-lg">
            {(form.accessoryLossFeeSchedule || []).map((item, idx) => (
              <div key={idx} className="adm-policy-fee-item">
                {onUpdateAccessoryName ? (
                  <input
                    type="text"
                    value={item.accessoryName}
                    onChange={(e) => onUpdateAccessoryName(idx, e.target.value)}
                    className="adm-field adm-field--compact"
                  />
                ) : (
                  <span className="text-[0.75rem] font-semibold">{item.accessoryName}</span>
                )}
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={item.defaultFee}
                  onChange={(e) => onUpdateAccessoryFee(idx, Number(e.target.value))}
                  className="adm-policy-fee-input"
                />
                {onRemoveAccessoryFee && (
                  <button type="button" onClick={() => onRemoveAccessoryFee(idx)} className="adm-btn adm-btn--xs adm-btn--danger" title="Xóa phụ kiện">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {onAddAccessoryFee && (
            <button type="button" onClick={onAddAccessoryFee} className="adm-btn adm-btn--sm adm-btn--secondary mt-2">
              + Thêm phụ kiện
            </button>
          )}
        </div>
      </div>

      {/* Nhóm 4: Ngưỡng duyệt phí quản trị & Lịch nhắc khách */}
      <div className="adm-card adm-card--padded">
        <h3 className="adm-policy-h3">
          <span>🛡</span> 4. Ngưỡng duyệt phụ phí & Lịch nhắc khách tự động
        </h3>
        <p className="adm-hint-text mb-3.5">
          Cấu hình bảo vệ kiểm soát nội bộ và tự động hóa trải nghiệm khách hàng trước các mốc nhận/trả.
        </p>
        <div className="adm-grid-auto-md">
          <div>
            <label className="adm-label--sub">
              Ngưỡng phụ phí Admin duyệt (VNĐ)
            </label>
            <input
              type="number"
              step="100000"
              min="0"
              value={form.adminApprovalFeeThreshold ?? 1000000}
              onChange={(e) => onChangeForm({ ...form, adminApprovalFeeThreshold: Number(e.target.value) })}
              className="adm-field adm-field--compact adm-field--mono"
            />
            <span className="adm-hint-text text-[0.7rem]">Phụ phí vượt mức này nhân viên không được tự quyết, cần Admin duyệt.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Nhắc nhận máy trước (giờ)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={form.reminderPickupHoursBefore ?? 4}
              onChange={(e) => onChangeForm({ ...form, reminderPickupHoursBefore: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Hệ thống gửi thông báo nhắc khách đến nhận máy.</span>
          </div>
          <div>
            <label className="adm-label--sub">
              Nhắc trả máy trước (giờ)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={form.reminderReturnHoursBefore ?? 2}
              onChange={(e) => onChangeForm({ ...form, reminderReturnHoursBefore: Number(e.target.value) })}
              className="adm-field adm-field--compact"
            />
            <span className="adm-hint-text text-[0.7rem]">Gửi cảnh báo trước giờ hẹn trả để tránh phát sinh phụ phí trễ.</span>
          </div>
        </div>
      </div>

      {/* Banner thông tin phiên bản & Nút lưu */}
      <div className="adm-policy-banner">
        <div>
          <div className="text-[0.8rem] text-[var(--color-bark)] font-bold">
            Chính sách đang áp dụng: <span className="text-[var(--color-forest)]">{currentVer}</span> (Hiệu lực từ {formatDateVi(currentPolicy.effectiveDate, "01/12/2024")})
          </div>
          <div className="adm-hint-text mt-0.5">
            Ban hành bởi <strong>{currentPolicy.updatedBy}</strong> lúc {formatDateTimeVi(currentPolicy.updatedAt)}
          </div>
        </div>
        <Can perm={Permissions.ChinhSach_Quan}>
          <button
            type="submit"
            className="adm-btn-primary px-5 py-2.5 font-bold shadow-sm"
          >
            Xem lại tác động & Ban hành phiên bản mới (UC8.1.1) →
          </button>
        </Can>
      </div>
    </form>
  );
}
