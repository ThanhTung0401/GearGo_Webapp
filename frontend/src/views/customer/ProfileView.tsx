import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../App";
import { fmt, statusColors } from "../../store";
import Icon from "../../components/Icon";
import { ApiError } from "../../services/apiClient";
import {
  rentalCartApi,
  orderApi,
  paymentApi,
  surchargeApi,
  aiAdvisorApi,
  profileApi,
  authApi,
  reviewApi,
  type GioThueBackend,
  type DonChiTietBackend,
  type PhieuBanGiaoKhachBackend,
  type XemTruocHuyBackend,
  type TuVanBoDoBackend,
  type SanPhamDuDieuKienDanhGiaBackend,
  type BaoGiaThayDoiDetail,
} from "../../services/api";
import { mapDonChiTietToOrder, mapDanhGiaToReview } from "../../services/mappers";
import { toIsoDateTime } from "./customerUtils";
export function ProfileView() {
  const app = useApp();
  const [section, setSection] = useState<"profile" | "security" | "reviews">(() => {
    const pref = sessionStorage.getItem("geargo_profile_section");
    if (pref === "reviews" || pref === "security" || pref === "profile") {
      sessionStorage.removeItem("geargo_profile_section");
      return pref as "profile" | "security" | "reviews";
    }
    return "profile";
  });

  const emptyProfile = {
    name: app.currentUser?.name || "",
    phone: app.currentUser?.phone || "",
    email: app.currentUser?.email || "",
    address: app.currentUser?.address || "",
    birthDate: "",
    avatarUrl: "",
  };

  const defaultProfile = app.realApi
    ? emptyProfile
    : {
        name: "Nguyễn Văn An",
        phone: "0901 234 567",
        email: "an.nguyen@example.com",
        address: "142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        birthDate: "1995-08-15",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      };

  const [savedProfile, setSavedProfile] = useState(() => {
    if (app.realApi) return defaultProfile;
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved ? (JSON.parse(saved) as typeof defaultProfile) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [profile, setProfile] = useState(savedProfile);
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  // OTP xác minh khi thay đổi Email hoặc Số điện thoại (UC1.6)
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpInfo, setOtpInfo] = useState("");

  // Đổi mật khẩu state (UC1.12)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Đánh giá từ API thật (UC9.1)
  const [eligibleReviewItems, setEligibleReviewItems] = useState<SanPhamDuDieuKienDanhGiaBackend[]>([]);
  const [myRealReviews, setMyRealReviews] = useState<import("../../store").Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewingTarget, setReviewingTarget] = useState<{
    orderId: string;
    productId: string;
    productName: string;
    maChiTietDonThue?: number;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImageInput, setReviewImageInput] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const completedOrders = app.orders.filter((order) => order.status === "Hoàn tất");

  // Nạp hồ sơ thật & danh sách sản phẩm đủ điều kiện đánh giá từ backend
  useEffect(() => {
    if (!app.realApi || !app.currentUser) return;
    setProfileLoading(true);
    void profileApi
      .layHoSoToi()
      .then((dto) => {
        const next = {
          name: dto.hoTen || app.currentUser?.name || "",
          phone: dto.soDienThoai || app.currentUser?.phone || "",
          email: dto.email || app.currentUser?.email || "",
          address: dto.diaChi || "",
          birthDate: dto.ngaySinh ? dto.ngaySinh.slice(0, 10) : "",
          avatarUrl: dto.anhDaiDien || "",
        };
        setSavedProfile(next);
        setProfile(next);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));

    setReviewsLoading(true);
    void Promise.all([reviewApi.laySanPhamDuDieuKien(), reviewApi.layDanhGiaCuaToi()])
      .then(([eligible, myRevs]) => {
        setEligibleReviewItems(eligible);
        setMyRealReviews((myRevs.items ?? []).map(mapDanhGiaToReview));
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [app.realApi, app.currentUser?.id]);

  const contactChanged =
    profile.email.trim() !== (savedProfile.email || "").trim() ||
    profile.phone.trim() !== (savedProfile.phone || "").trim();

  const handleSendContactOtp = async () => {
    setProfileError("");
    setOtpInfo("");
    setOtpSending(true);
    try {
      const res = await profileApi.guiOtpDoiLienHe({
        emailMoi: profile.email.trim() !== (savedProfile.email || "").trim() ? profile.email.trim() : null,
        soDienThoaiMoi: profile.phone.trim() !== (savedProfile.phone || "").trim() ? profile.phone.trim() : null,
      });
      setOtpInfo(res.thongDiep || "Đã gửi mã OTP xác minh. Vui lòng kiểm tra email/điện thoại.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Không thể gửi mã OTP xác minh.");
    } finally {
      setOtpSending(false);
    }
  };

  const saveProfile = async () => {
    setProfileError("");
    setSaved(false);
    if (app.realApi) {
      if (contactChanged && !otpCode.trim()) {
        setProfileError("Bạn đã thay đổi Email hoặc Số điện thoại. Vui lòng gửi và nhập mã OTP xác minh.");
        return;
      }
      setProfileSaving(true);
      try {
        const dto = await profileApi.capNhatHoSoToi({
          hoTen: profile.name.trim(),
          email: profile.email.trim(),
          soDienThoai: profile.phone.trim(),
          diaChi: profile.address.trim() || null,
          ngaySinh: profile.birthDate || null,
          anhDaiDien: profile.avatarUrl.trim() || null,
          maOtp: contactChanged ? otpCode.trim() : null,
        });
        const next = {
          name: dto.hoTen || profile.name,
          phone: dto.soDienThoai || profile.phone,
          email: dto.email || profile.email,
          address: dto.diaChi || "",
          birthDate: dto.ngaySinh ? dto.ngaySinh.slice(0, 10) : "",
          avatarUrl: dto.anhDaiDien || "",
        };
        setSavedProfile(next);
        setProfile(next);
        setOtpCode("");
        setOtpInfo("");
        setSaved(true);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ cá nhân.");
      } finally {
        setProfileSaving(false);
      }
      return;
    }

    localStorage.setItem("geargo-demo-customer-profile", JSON.stringify(profile));
    setSavedProfile(profile);
    setSaved(true);
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Cập nhật hồ sơ (UC1.6)", targetEntity: "CustomerProfile", targetId: profile.phone, detail: "Cập nhật thông tin liên hệ và hồ sơ cá nhân" });
  };

  const handleCancelProfileChanges = () => {
    setProfile(savedProfile);
    setSaved(false);
    setProfileError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (!oldPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    const minLen = app.realApi ? 8 : 6;
    if (newPassword.length < minLen) {
      setPasswordError(`Mật khẩu mới phải có tối thiểu ${minLen} ký tự`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    if (app.realApi) {
      setPasswordSaving(true);
      try {
        await authApi.doiMatKhau({
          matKhauHienTai: oldPassword,
          matKhauMoi: newPassword,
          xacNhanMatKhauMoi: confirmPassword,
        });
        setPasswordMsg("✓ Đổi mật khẩu thành công! Hệ thống sẽ đăng xuất để bạn đăng nhập lại bằng mật khẩu mới.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // UC1.12: Bắt buộc đăng xuất sau khi đổi mật khẩu thành công
        window.setTimeout(() => {
          void app.logout();
        }, 1200);
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
      } finally {
        setPasswordSaving(false);
      }
      return;
    }

    setPasswordMsg("✓ Đổi mật khẩu thành công! Vui lòng dùng mật khẩu mới cho các lần đăng nhập sau.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Đổi mật khẩu (UC1.12)", targetEntity: "CustomerAccount", targetId: profile.email, detail: "Người dùng đổi mật khẩu bảo mật cá nhân" });
  };

  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingTarget) return;

    if (app.realApi) {
      if (!reviewingTarget.maChiTietDonThue) {
        setReviewError("Không xác định được dòng đơn thuê đủ điều kiện đánh giá.");
        return;
      }
      setReviewSubmitting(true);
      setReviewError("");
      try {
        await reviewApi.taoDanhGia({
          maChiTietDonThue: reviewingTarget.maChiTietDonThue,
          soSao: rating,
          noiDung: comment.trim() || undefined,
          danhSachAnh: reviewImages.length > 0 ? reviewImages.slice(0, 5) : undefined,
        });
        const [eligible, myRevs] = await Promise.all([
          reviewApi.laySanPhamDuDieuKien(),
          reviewApi.layDanhGiaCuaToi(),
        ]);
        setEligibleReviewItems(eligible);
        setMyRealReviews((myRevs.items ?? []).map(mapDanhGiaToReview));
        void app.refreshReviews?.();
        setReviewingTarget(null);
        setComment("");
        setRating(5);
        setReviewImages([]);
        setReviewImageInput("");
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : "Không thể gửi đánh giá sản phẩm.");
      } finally {
        setReviewSubmitting(false);
      }
      return;
    }

    const res = app.addReview({
      orderId: reviewingTarget.orderId,
      productId: reviewingTarget.productId,
      rating,
      comment,
      images: reviewImages.length > 0 ? reviewImages.slice(0, 5) : undefined,
    });
    if (res.ok) {
      setReviewingTarget(null);
      setComment("");
      setRating(5);
      setReviewImages([]);
      setReviewImageInput("");
      setReviewError("");
    } else {
      setReviewError(res.message);
    }
  };

  return (
    <div className="customer-container max-w-4xl">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="customer-page-title">Tài khoản cá nhân</h1>
          <p className="text-sm text-gray-500">Quản lý hồ sơ, đổi mật khẩu và đánh giá sản phẩm sau chuyến đi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSection("profile")}
            className={`btn btn-sm ${section === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ cá nhân (UC1.6)
          </button>
          <button
            onClick={() => setSection("security")}
            className={`btn btn-sm ${section === "security" ? "btn-primary" : "btn-secondary"}`}
          >
            Đổi mật khẩu (UC1.12)
          </button>
          <button
            onClick={() => setSection("reviews")}
            className={`btn btn-sm ${section === "reviews" ? "btn-primary" : "btn-secondary"}`}
          >
            Đánh giá sản phẩm ({app.realApi ? eligibleReviewItems.length : completedOrders.length})
          </button>
        </div>
      </div>

      {section === "profile" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
          className="card-panel"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-display font-bold text-lg text-bark">Hồ sơ cá nhân & Thông tin liên hệ (UC1.6)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {profileLoading ? "Đang tải hồ sơ cá nhân..." : "* GearGo nhận và trả thiết bị trực tiếp tại cửa hàng (128 Nguyễn Đình Chiểu, Q.3)."}
              </p>
            </div>
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-forest)" }}
              />
            )}
          </div>
          {profileError && (
            <div role="alert" className="form-error-msg mb-3">
              {profileError}
            </div>
          )}
          <div className="form-grid-2">
            {[
              { key: "name" as const, label: "Họ và tên", type: "text" },
              { key: "phone" as const, label: "Số điện thoại", type: "tel" },
              { key: "email" as const, label: "Email", type: "email" },
              { key: "birthDate" as const, label: "Ngày sinh", type: "date" },
              { key: "address" as const, label: "Địa chỉ thường trú / liên hệ", type: "text" },
              { key: "avatarUrl" as const, label: "Ảnh đại diện (URL)", type: "url" },
            ].map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  type={field.type}
                  value={profile[field.key] ?? ""}
                  onChange={(e) => {
                    setProfile({ ...profile, [field.key]: e.target.value });
                    setSaved(false);
                  }}
                  className="form-input"
                />
              </div>
            ))}
          </div>

          {/* UC1.6: Khối xác minh OTP khi thay đổi Email hoặc Số điện thoại */}
          {app.realApi && contactChanged && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "#FFFBEB", border: "1px solid #FCD34D" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                🔐 Xác minh OTP khi thay đổi Email / Số điện thoại (UC1.6)
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  disabled={otpSending}
                  onClick={() => void handleSendContactOtp()}
                  className="btn btn-secondary btn-sm"
                >
                  {otpSending ? "Đang gửi OTP..." : "Gửi mã OTP xác minh"}
                </button>
                <input
                  type="text"
                  placeholder="Nhập mã OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: 180, fontSize: "0.84rem" }}
                />
              </div>
              {otpInfo && (
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#065F46", fontWeight: 600 }}>
                  {otpInfo}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button type="submit" disabled={profileSaving || profileLoading} className="btn btn-primary btn-md">
              {profileSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={handleCancelProfileChanges}
              className="btn btn-secondary btn-md"
            >
              Hủy thay đổi
            </button>
            {saved && (
              <span className="badge badge-success">✓ Đã lưu hồ sơ thành công</span>
            )}
          </div>
        </form>
      ) : section === "security" ? (
        <form onSubmit={(e) => void handleChangePassword(e)} className="card-panel max-w-lg">
          <h2 className="font-display font-bold text-lg text-bark mb-2">Đổi mật khẩu tài khoản</h2>
          <p className="text-xs text-gray-500 mb-4">Mật khẩu mới cần dài tối thiểu 6 ký tự để bảo mật tài khoản thuê thiết bị.</p>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu hiện tại *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Xác nhận mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
          </div>

          {passwordError && (
            <div className="form-error-msg mb-3">{passwordError}</div>
          )}

          {passwordMsg && (
            <div className="badge badge-success p-2.5 rounded-lg mb-3 block text-center font-bold">
              {passwordMsg}
            </div>
          )}

          <button type="submit" disabled={passwordSaving} className="btn btn-primary btn-md">
            {passwordSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu mới"}
          </button>
        </form>
      ) : (
        <div className="card-panel">
          <h2 className="font-display font-bold text-lg text-bark mb-1">
            Đánh giá sản phẩm theo đơn đã hoàn tất
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Lưu ý: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần duy nhất.
          </p>

          {app.realApi ? (
            reviewsLoading ? (
              <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
                Đang tải danh sách sản phẩm đủ điều kiện đánh giá...
              </div>
            ) : eligibleReviewItems.length === 0 && myRealReviews.length === 0 ? (
              <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
                Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {eligibleReviewItems.map((el) => {
                  const existing = myRealReviews.find(
                    (r) => r.orderId === String(el.maDonThue) && r.productId === String(el.maSanPham)
                  );
                  const isCurrentReviewing =
                    reviewingTarget?.orderId === String(el.maDonThue) &&
                    reviewingTarget?.productId === String(el.maSanPham);

                  return (
                    <div key={el.maChiTietDonThue} className="border border-bone rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-bone">
                        <div>
                          <strong className="font-mono text-forest">{el.maDonHienThi || el.maDonThue}</strong>
                          <span className="text-xs text-gray-400 ml-3">
                            Hoàn tất: {el.thoiDiemHoanTat ? new Date(el.thoiDiemHoanTat).toLocaleDateString("vi-VN") : "-"}
                          </span>
                        </div>
                        <span className="badge badge-success">Đã hoàn tất</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-bark text-sm">{el.tenSanPham}</div>
                        </div>
                        {el.daDanhGia || existing ? (
                          <div className="text-right">
                            {existing && (
                              <span className="text-amber font-bold text-sm">
                                {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                              </span>
                            )}
                            <div className="text-xs text-emerald-600 font-semibold">✓ Đã đánh giá</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReviewingTarget({
                                orderId: String(el.maDonThue),
                                productId: String(el.maSanPham),
                                productName: el.tenSanPham,
                                maChiTietDonThue: el.maChiTietDonThue,
                              });
                              setReviewError("");
                              setRating(5);
                              setComment("");
                              setReviewImages([]);
                              setReviewImageInput("");
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Viết đánh giá
                          </button>
                        )}
                      </div>

                      {existing && (
                        <div className="mt-2.5 flex flex-col gap-2">
                          <div className="bg-white p-2.5 rounded-lg border border-bone text-xs text-gray-700 italic">
                            "{existing.comment}"
                          </div>
                          {existing.images && existing.images.length > 0 && (
                            <div className="flex gap-2 items-center flex-wrap">
                              {existing.images.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Ảnh đánh giá"
                                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1" }}
                                />
                              ))}
                            </div>
                          )}
                          {(existing.storeResponse || existing.response) && (
                            <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 6px 6px 0", padding: "8px 12px" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
                                <span>Phản hồi từ GearGo ({existing.storeResponse?.respondedBy || "Cửa hàng"})</span>
                                <span style={{ fontWeight: 400, color: "#64748B" }}>{existing.storeResponse?.respondedAt}</span>
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "#14532D", marginTop: 4 }}>
                                {existing.storeResponse?.response || existing.response}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isCurrentReviewing && (
                        <form onSubmit={(e) => void handleSendReview(e)} className="mt-3 bg-white p-4 rounded-lg border border-bone shadow-sm">
                          <div className="flex justify-between items-center mb-3 border-b border-bone pb-2">
                            <h4 className="font-bold text-sm text-bark">Đánh giá trải nghiệm: {reviewingTarget.productName}</h4>
                            <span className="badge badge-neutral text-xs">Mã đơn #{el.maDonHienThi || reviewingTarget.orderId}</span>
                          </div>
                          <div className="mb-3">
                            <label className="form-label mb-1">Mức độ hài lòng của bạn</label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setRating(s)}
                                  style={{
                                    background: rating >= s ? "#FEF3C7" : "#F3F4F6",
                                    border: `1px solid ${rating >= s ? "#F59E0B" : "#E5E7EB"}`,
                                    color: rating >= s ? "#D97706" : "#9CA3AF",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  ★ {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="form-group mb-3">
                            <label className="form-label">Nhận xét chi tiết chuyến đi</label>
                            <textarea
                              required
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                              placeholder="Chia sẻ trải nghiệm thực tế: độ bền, độ sạch sẽ..."
                              className="form-textarea"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label mb-1">Ảnh thực tế (tối đa 5 ảnh - UC9.1.2)</label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                              <input
                                type="url"
                                placeholder="Dán URL ảnh dã ngoại (https://...)"
                                value={reviewImageInput}
                                onChange={(e) => setReviewImageInput(e.target.value)}
                                className="form-input flex-1"
                                style={{ fontSize: "0.82rem", minWidth: 200 }}
                              />
                              <button
                                type="button"
                                disabled={!reviewImageInput.trim() || reviewImages.length >= 5}
                                onClick={() => {
                                  const url = reviewImageInput.trim();
                                  if (url && reviewImages.length < 5 && !reviewImages.includes(url)) {
                                    setReviewImages((prev) => [...prev, url]);
                                    setReviewImageInput("");
                                  }
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                + Thêm URL ({reviewImages.length}/5)
                              </button>
                              <label className="btn btn-secondary btn-sm" style={{ cursor: reviewImages.length >= 5 ? "not-allowed" : "pointer" }}>
                                📷 Tải ảnh lên
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={reviewImages.length >= 5}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []).slice(0, 5 - reviewImages.length);
                                    files.forEach((file) => {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        if (typeof reader.result === "string") {
                                          setReviewImages((prev) => (prev.length < 5 ? [...prev, reader.result as string] : prev));
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            {reviewImages.length > 0 && (
                              <div className="flex gap-2 flex-wrap mt-2">
                                {reviewImages.map((img, idx) => (
                                  <div key={idx} style={{ position: "relative" }}>
                                    <img
                                      src={img}
                                      alt={`Ảnh đánh giá ${idx + 1}`}
                                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1" }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                                      style={{
                                        position: "absolute",
                                        top: -6,
                                        right: -6,
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        background: "#EF4444",
                                        color: "white",
                                        border: "none",
                                        fontSize: "0.65rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {reviewError && <div className="form-error-msg mb-2">{reviewError}</div>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={reviewSubmitting} className="btn btn-primary btn-sm">
                              {reviewSubmitting ? "Đang gửi..." : "✓ Gửi đánh giá ngay"}
                            </button>
                            <button type="button" onClick={() => setReviewingTarget(null)} className="btn btn-secondary btn-sm">
                              Hủy bỏ
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : completedOrders.length === 0 ? (
            <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
              Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {completedOrders.map((order) => (
                <div key={order.id} className="border border-bone rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-bone">
                    <div>
                      <strong className="font-mono text-forest">{order.id}</strong>
                      <span className="text-xs text-gray-400 ml-3">
                        Hoàn tất: {order.reconciledAt || order.createdAt}
                      </span>
                    </div>
                    <span className="badge badge-success">Đã hoàn tất</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.items.map((item) => {
                      const existing = app.reviews.find(
                        (r) => r.orderId === order.id && r.productId === item.productId
                      );
                      const isCurrentReviewing =
                        reviewingTarget?.orderId === order.id &&
                        reviewingTarget?.productId === item.productId;

                      return (
                        <div key={item.productId} className="card-panel-muted p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-bark text-sm">{item.productName}</div>
                              <div className="text-xs text-gray-500">
                                Thuê: {item.qty} chiếc · {item.days} ngày
                              </div>
                            </div>
                            {existing ? (
                              <div className="text-right">
                                <span className="text-amber font-bold text-sm">
                                  {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
                                </span>
                                <div className="text-xs text-emerald-600 font-semibold">
                                  ✓ Đã đánh giá
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReviewingTarget({
                                    orderId: order.id,
                                    productId: item.productId,
                                    productName: item.productName,
                                  });
                                  setReviewError("");
                                  setRating(5);
                                  setComment("");
                                  setReviewImages([]);
                                  setReviewImageInput("");
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Viết đánh giá
                              </button>
                            )}
                          </div>

                          {existing && (
                            <div className="mt-2.5 flex flex-col gap-2">
                              <div className="bg-white p-2.5 rounded-lg border border-bone text-xs text-gray-700 italic">
                                "{existing.comment}"
                              </div>
                              {/* Hiển thị ảnh đính kèm thực tế UC9.1.2 */}
                              {existing.images && existing.images.length > 0 && (
                                <div className="flex gap-2 items-center flex-wrap">
                                  <span className="text-xs text-gray-500 font-medium">Ảnh thực tế:</span>
                                  {existing.images.map((img: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Ảnh dã ngoại thực tế"
                                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1", cursor: "pointer" }}
                                      onClick={() => window.open(img, "_blank")}
                                      title="Xem ảnh gốc"
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Phản hồi chính thức từ GearGo (UC9.2) */}
                              {(existing.storeResponse || existing.response) && (
                                <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 6px 6px 0", padding: "8px 12px" }}>
                                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
                                    <span>💬 Phản hồi từ GearGo ({existing.storeResponse?.respondedBy || "Cửa hàng"})</span>
                                    <span style={{ fontWeight: 400, color: "#64748B" }}>{existing.storeResponse?.respondedAt}</span>
                                  </div>
                                  <div style={{ fontSize: "0.78rem", color: "#14532D", marginTop: 4, lineHeight: 1.45 }}>
                                    {existing.storeResponse?.response || existing.response}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isCurrentReviewing && (
                            <form onSubmit={handleSendReview} className="mt-3 bg-white p-4 rounded-lg border border-bone shadow-sm">
                              <div className="flex justify-between items-center mb-3 border-b border-bone pb-2">
                                <h4 className="font-bold text-sm text-bark">Đánh giá trải nghiệm: {reviewingTarget.productName}</h4>
                                <span className="badge badge-neutral text-xs">Mã đơn #{reviewingTarget.orderId}</span>
                              </div>

                              {/* Bộ chọn sao tương tác */}
                              <div className="mb-3">
                                <label className="form-label mb-1">Mức độ hài lòng của bạn</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setRating(s)}
                                      style={{
                                        background: rating >= s ? "#FEF3C7" : "#F3F4F6",
                                        border: `1px solid ${rating >= s ? "#F59E0B" : "#E5E7EB"}`,
                                        color: rating >= s ? "#D97706" : "#9CA3AF",
                                        borderRadius: 8,
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        transition: "all 0.15s ease"
                                      }}
                                    >
                                      <span>★</span> {s} {s === 5 ? "Rất tốt" : s === 4 ? "Tốt" : s === 3 ? "Bình thường" : s === 2 ? "Chưa tốt" : "Tệ"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="form-group mb-3">
                                <label className="form-label">Nhận xét chi tiết chuyến đi</label>
                                <textarea
                                  required
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  rows={3}
                                  placeholder="Chia sẻ trải nghiệm thực tế: độ bền, độ sạch sẽ, khả năng chống mưa nắng của thiết bị..."
                                  className="form-textarea"
                                />
                              </div>

                              {/* Đính kèm tối đa 5 ảnh dã ngoại (UC9.1.2) */}
                              <div className="mb-3">
                                <label className="form-label mb-1">Ảnh thực tế từ chuyến dã ngoại (tối đa 5 ảnh - UC9.1.2)</label>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                  <input
                                    type="url"
                                    placeholder="Dán URL ảnh dã ngoại (https://...)"
                                    value={reviewImageInput}
                                    onChange={(e) => setReviewImageInput(e.target.value)}
                                    className="form-input flex-1"
                                    style={{ fontSize: "0.82rem", minWidth: 200 }}
                                  />
                                  <button
                                    type="button"
                                    disabled={!reviewImageInput.trim() || reviewImages.length >= 5}
                                    onClick={() => {
                                      const url = reviewImageInput.trim();
                                      if (url && reviewImages.length < 5 && !reviewImages.includes(url)) {
                                        setReviewImages((prev) => [...prev, url]);
                                        setReviewImageInput("");
                                      }
                                    }}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    + Thêm ({reviewImages.length}/5)
                                  </button>
                                </div>

                                {/* Gợi ý chọn nhanh ảnh mẫu */}
                                <div className="text-xs text-gray-500 mb-1.5">Gợi ý chọn nhanh ảnh dã ngoại mẫu:</div>
                                <div className="flex gap-2 flex-wrap">
                                  {[
                                    { label: "🏕️ Cắm trại bờ hồ", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop" },
                                    { label: "🌄 Lều hoàng hôn", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&auto=format&fit=crop" },
                                    { label: "☕ Bếp dã ngoại", url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&auto=format&fit=crop" },
                                  ].map((sample, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={reviewImages.length >= 5}
                                      onClick={() =>
                                        setReviewImages((prev) =>
                                          prev.length < 5 && !prev.includes(sample.url) ? [...prev, sample.url] : prev
                                        )
                                      }
                                      className="btn btn-ghost btn-sm"
                                      style={{ fontSize: "0.72rem", border: "1px dashed #CBD5E1", padding: "3px 8px" }}
                                    >
                                      {sample.label}
                                    </button>
                                  ))}
                                </div>

                                {reviewImages.length > 0 && (
                                  <div className="mt-2 flex gap-2 flex-wrap">
                                    {reviewImages.map((img, idx) => (
                                      <div key={idx} style={{ position: "relative" }}>
                                        <img
                                          src={img}
                                          alt={`Xem trước ảnh ${idx + 1}`}
                                          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1" }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                                          style={{
                                            position: "absolute",
                                            top: -6,
                                            right: -6,
                                            width: 18,
                                            height: 18,
                                            borderRadius: "50%",
                                            background: "#EF4444",
                                            color: "white",
                                            border: "none",
                                            fontSize: "0.65rem",
                                            cursor: "pointer",
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {reviewError && (
                                <div className="form-error-msg mb-2">{reviewError}</div>
                              )}
                              <div className="flex gap-2">
                                <button type="submit" className="btn btn-primary btn-sm">
                                  ✓ Gửi đánh giá ngay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewingTarget(null)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Hủy bỏ
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
