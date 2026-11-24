import { useState } from "react";
import type React from "react";
import { useApp } from "../../../context/AppContext";
import { fmt, formatDateTimeVi, Order } from "../../../store";
import { uploadOrReadDataUrl } from "../../../services/api";
import { getErrorMessage, resolveAssetUrl } from "../../../utils";

interface HandoverChecklistPanelProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  assignments: Record<string, string[]>;
  handoverBusy: boolean;
  earlyPickupAccepted: boolean;
  setEarlyPickupAccepted: (v: boolean) => void;
  receiverName: string;
  setReceiverName: (v: string) => void;
  receiverPhone: string;
  setReceiverPhone: (v: string) => void;
  receiverIdCard: string;
  setReceiverIdCard: (v: string) => void;
  isAuthorized: boolean;
  setIsAuthorized: (v: boolean) => void;
  checklist: Record<string, boolean>;
  setChecklist: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  evidencePhotos: string[];
  // [HO-08] Setter để nút 📷+ thực sự thêm ảnh vào state.
  setEvidencePhotos?: React.Dispatch<React.SetStateAction<string[]>>;
  handoverNote: string;
  setHandoverNote: (v: string) => void;
  handleCompleteHandover: () => Promise<void>;
}

// Phân hệ 4.2: Tiếp khách, đối chiếu người nhận, checklist phụ kiện & chốt bàn giao tại quầy
export function HandoverChecklistPanel({
  app,
  order,
  assignments,
  handoverBusy,
  earlyPickupAccepted,
  setEarlyPickupAccepted,
  receiverName,
  setReceiverName,
  receiverPhone,
  setReceiverPhone,
  receiverIdCard,
  setReceiverIdCard,
  isAuthorized,
  setIsAuthorized,
  checklist,
  setChecklist,
  evidencePhotos,
  setEvidencePhotos,
  handoverNote,
  setHandoverNote,
  handleCompleteHandover,
}: HandoverChecklistPanelProps) {
  const [photoNotice, setPhotoNotice] = useState("");
  return (
    <div>
      <div className="so-order-header">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <span className="so-modal-tag is-green">SẴN SÀNG BÀN GIAO</span>
            <h3 className="so-order-title">
              Đơn #{order.displayCode || order.id} — {order.customerName}
            </h3>
            <div className="so-order-meta">
              📤 Hẹn nhận: <strong>{formatDateTimeVi(order.pickupTime)}</strong> · 📥 Hẹn trả: <strong>{formatDateTimeVi(order.returnTime)}</strong>
            </div>
          </div>
          <div className="so-order-stats">
            <div className="so-paid-badge">✓ ĐÃ THU ĐỦ 100% TIỀN & CỌC</div>
            <div className="so-order-total">{fmt(order.rental - order.discount + order.depositTotal)}</div>
          </div>
        </div>
      </div>

      {/* Cảnh báo nhận sớm (Dòng phụ 1.2) */}
      <div className="so-alert-warn">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="so-early-text">
            🕒 <strong>Khách nhận đồ tại quầy:</strong> Kiểm tra thời điểm nhận hợp lệ và sự chấp thuận của cửa hàng.
          </div>
          <label className="flex items-center gap-2 so-early-check">
            <input
              type="checkbox"
              checked={earlyPickupAccepted}
              onChange={(e) => setEarlyPickupAccepted(e.target.checked)}
              className="so-check-box"
            />
            Quản lý ca đã duyệt bàn giao
          </label>
        </div>
      </div>

      {/* UC4.2 Bước 2: Đối chiếu người nhận thực tế tại quầy */}
      <div className="so-card-panel">
        <h4 className="so-sub-heading-md">1. Đối chiếu người nhận thực tế (UC4.2.2)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="so-field-label-muted">Họ tên người nhận tại quầy *</label>
            <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="so-input-sm" />
          </div>
          <div>
            <label className="so-field-label-muted">Số điện thoại người nhận *</label>
            <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} className="so-input-sm" />
          </div>
          <div>
            <label className="so-field-label-muted">Số CCCD / Mã định danh</label>
            <input value={receiverIdCard} onChange={(e) => setReceiverIdCard(e.target.value)} className="so-input-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 so-check-label">
          <input
            type="checkbox"
            checked={isAuthorized}
            onChange={(e) => setIsAuthorized(e.target.checked)}
            className="so-check-box"
          />
          <span>Người nhận thay có giấy ủy quyền / tin nhắn ủy quyền hợp lệ từ chính chủ đơn (Dòng phụ 1.1)</span>
        </label>
      </div>

      {/* Danh sách thiết bị đã phân công sẵn */}
      <div className="so-card-panel">
        <h4 className="so-sub-heading-md">2. Kiểm tra cùng khách từng thiết bị & phụ kiện</h4>
        <div className="flex flex-col gap-2">
          {order.items
            .flatMap((i) =>
              (assignments[i.productId] || []).map((code) => ({
                code: app.equipment.find((e) => e.id === code)?.displayCode || code,
                item: i,
              }))
            )
            .map(({ code, item }) => (
              <div key={code} className="so-assigned-row">
                <div>
                  <span className="so-assigned-code">{code}</span>
                  <span className="so-assigned-name">— {item.productName}</span>
                </div>
                <span className="so-assigned-cond">✓ Ngoại quan tốt</span>
              </div>
            ))}
        </div>
      </div>

      {/* Checklist phụ kiện & Bằng chứng ảnh chụp (UC4.2.3) */}
      <div className="so-card-panel">
        <h4 className="so-sub-heading-md">3. Checklist bàn giao & Bằng chứng ảnh</h4>
        <div className="flex flex-col gap-2 mb-3">
          {Object.entries(checklist).map(([name, checked]) => (
            <label key={name} className="flex items-center gap-2 so-check-label-lg">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [name]: e.target.checked }))}
                className="so-check-box-md"
              />
              <span>{name}</span>
            </label>
          ))}
        </div>

        <div className="mb-3">
          <span className="so-photo-label">Ảnh bằng chứng hiện trạng trước thuê (UC4.2 Dòng 747):</span>
          <div className="flex gap-2 items-center flex-wrap">
            {evidencePhotos.map((url, i) => (
              <div key={i} className="relative inline-block">
                <img src={resolveAssetUrl(url)} alt="Bằng chứng giao" className="so-photo-thumb" />
                {setEvidencePhotos && (
                  <button
                    type="button"
                    aria-label="Xóa ảnh bằng chứng"
                    onClick={() => setEvidencePhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <label
              className="so-photo-add-btn cursor-pointer inline-flex items-center justify-center"
              aria-label="Chọn ảnh bằng chứng thiết bị từ máy"
              title="Tải ảnh bằng chứng từ máy"
            >
              📷+
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  try {
                    const urls: string[] = [];
                    for (const file of files) {
                      const uploaded = await uploadOrReadDataUrl(file, Boolean(app.realApi), "evidence");
                      if (uploaded) urls.push(uploaded);
                    }
                    if (urls.length > 0 && setEvidencePhotos) {
                      setEvidencePhotos((prev) => [...prev, ...urls]);
                      setPhotoNotice(`Đã thêm ${urls.length} ảnh bằng chứng (hiện có ${evidencePhotos.length + urls.length} ảnh).`);
                    }
                  } catch (err) {
                    setPhotoNotice(getErrorMessage(err, "Không thể tải tệp ảnh đã chọn."));
                  } finally {
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
          {photoNotice && (
            <div role="status" className="mt-1.5 text-xs text-[var(--color-success-text)]">
              {photoNotice}
            </div>
          )}
        </div>

        <label className="so-field-label-note">Ghi chú hiện trạng bàn giao:</label>
        <textarea
          placeholder="Ghi nhận phụ kiện dây đai, tem bảo hành, số lượng đinh cọc..."
          value={handoverNote}
          onChange={(e) => setHandoverNote(e.target.value)}
          rows={2}
          className="so-textarea-static"
        />
      </div>

      <button
        disabled={handoverBusy}
        onClick={() => void handleCompleteHandover()}
        className="so-btn-submit-full"
      >
        {handoverBusy ? "Đang lập & chốt BBBG..." : "✓ Bàn giao thiết bị cho khách & Lập Biên bản (BBBG)"}
      </button>
    </div>
  );
}
