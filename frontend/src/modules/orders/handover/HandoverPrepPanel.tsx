import { useApp } from "../../../context/AppContext";
import { Order } from "../../../store";

interface HandoverPrepPanelProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  assignments: Record<string, string[]>;
  handoverBusy: boolean;
  allAssigned: boolean;
  changingEquip: { productId: string; oldId: string } | null;
  setChangingEquip: (v: { productId: string; oldId: string } | null) => void;
  showShortageModal: boolean;
  setShowShortageModal: (v: boolean) => void;
  shortageNote: string;
  setShortageNote: (v: string) => void;
  pickEquipment: (productId: string, idx: number, equipId: string) => void;
  handleStartPreparation: () => Promise<void>;
  handleSwapEquipment: (productId: string, oldId: string, newId: string) => Promise<void>;
  handleCancelAssignment: (productId: string, equipId: string) => Promise<void>;
  handleCompletePreparation: () => Promise<void>;
  handleReportShortage: () => Promise<void>;
}

// Phân hệ 4.1: Chuẩn bị kho, gán serial thiết bị, đổi mã thay thế và báo thiếu hàng
export function HandoverPrepPanel({
  app,
  order,
  assignments,
  handoverBusy,
  allAssigned,
  changingEquip,
  setChangingEquip,
  showShortageModal,
  setShowShortageModal,
  shortageNote,
  setShortageNote,
  pickEquipment,
  handleStartPreparation,
  handleSwapEquipment,
  handleCancelAssignment,
  handleCompletePreparation,
  handleReportShortage,
}: HandoverPrepPanelProps) {
  return (
    <div>
      <div className="so-order-header">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <div className="so-order-code">{order.displayCode || order.id}</div>
            <div className="so-order-customer">
              {order.customerName} · {order.customerPhone}
            </div>
            <div className="so-order-meta">
              📤 Hẹn nhận: <strong>{order.pickupTime}</strong> → 📥 Hẹn trả: <strong>{order.returnTime}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="so-badge-forest">{order.status}</span>
            {order.status === "Đã xác nhận" && (
              <button
                disabled={handoverBusy}
                onClick={() => void handleStartPreparation()}
                className="so-btn-amber-sm"
              >
                {handoverBusy ? "Đang xử lý..." : "Nhận soạn hàng →"}
              </button>
            )}
          </div>
        </div>
      </div>

      {order.shortageReported && (
        <div className="so-alert-danger">
          <strong>⚠️ CẢNH BÁO THIẾU HÀNG (UC4.1.5.1):</strong> {order.shortageReported.note}
          <div className="so-alert-danger-note">
            Đang chờ Quản trị viên can thiệp xử lý với khách hàng. Không tự ý giảm lượng hoặc đổi sản phẩm.
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h4 className="so-sub-heading">Gán mã thiết bị (Serial) & Kiểm tra phụ kiện</h4>
        <button onClick={() => setShowShortageModal(true)} className="so-btn-danger-soft">
          ⚠️ Báo thiếu hàng cho QTV
        </button>
      </div>

      {order.items.map((item) => {
        const chosenForItem = assignments[item.productId] || [];
        const avail = app.equipment.filter(
          (e) => e.productId === item.productId && (e.equipmentStatus === "Sẵn sàng" || chosenForItem.includes(e.id))
        );
        return (
          <div key={item.productId} className="so-prep-card">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
              <div className="so-prep-title">
                {item.productName} — Yêu cầu: <span className="so-prep-req">{item.qty} chiếc</span>
              </div>
              <span className={`so-prep-avail ${avail.length >= item.qty ? "is-ok" : ""}`}>
                Kho sẵn sàng: {avail.length} chiếc
              </span>
            </div>

            {Array.from({ length: item.qty }).map((_, idx) => {
              const currentChosen = assignments[item.productId]?.[idx];
              return (
                <div key={idx} className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="so-slot-label">Món {idx + 1}:</span>
                  <select
                    value={currentChosen || ""}
                    onChange={(e) => pickEquipment(item.productId, idx, e.target.value)}
                    className="so-slot-select"
                  >
                    <option value="">-- Chọn mã thiết bị sẵn sàng --</option>
                    {avail.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.displayCode || e.id} ({e.condition} · đã thuê {e.rentCount} lần)
                      </option>
                    ))}
                  </select>
                  {currentChosen && (
                    <div className="flex items-center gap-2">
                      <span className="so-assigned-ok">✓ Đã gán</span>
                      <button
                        onClick={() => setChangingEquip({ productId: item.productId, oldId: currentChosen })}
                        className="so-btn-soft-sm"
                      >
                        Đổi mã
                      </button>
                      <button
                        type="button"
                        disabled={handoverBusy}
                        onClick={() => void handleCancelAssignment(item.productId, currentChosen)}
                        className="so-btn-danger-outline-sm"
                      >
                        Hủy gán
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {avail.length < item.qty && (
              <div className="so-shortage-warn">
                ⚠️ Kho không đủ số lượng sẵn sàng cho đơn này! Vui lòng báo Quản trị viên.
              </div>
            )}
          </div>
        );
      })}

      {/* Hộp đổi serial thay thế (Dòng phụ 3.1) */}
      {changingEquip && (
        <div className="so-swap-box">
          <strong className="so-swap-title">
            Đổi serial thiết bị{" "}
            {app.equipment.find((x) => x.id === changingEquip.oldId)?.displayCode || changingEquip.oldId} trước khi giao:
          </strong>
          <div className="flex gap-2 mt-2 flex-wrap">
            <select id="swapSelect" className="so-swap-select">
              {app.equipment
                .filter(
                  (e) =>
                    e.productId === changingEquip.productId &&
                    e.equipmentStatus === "Sẵn sàng" &&
                    e.id !== changingEquip.oldId
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.displayCode || e.id} ({e.condition})
                  </option>
                ))}
            </select>
            <button
              disabled={handoverBusy}
              onClick={() => {
                const sel = (document.getElementById("swapSelect") as HTMLSelectElement)?.value;
                if (sel) void handleSwapEquipment(changingEquip.productId, changingEquip.oldId, sel);
              }}
              className="so-btn-primary-confirm"
            >
              {handoverBusy ? "Đang đổi..." : "Xác nhận đổi"}
            </button>
            <button onClick={() => setChangingEquip(null)} className="so-btn-cancel">
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          disabled={!allAssigned || handoverBusy}
          onClick={() => void handleCompletePreparation()}
          className="so-btn-submit-lg"
        >
          {handoverBusy ? "Đang lưu & xác nhận..." : '✓ Hoàn tất chuẩn bị & Chuyển "Sẵn sàng nhận" (UC4.1)'}
        </button>
      </div>

      {/* Modal Báo thiếu thiết bị */}
      {showShortageModal && (
        <div className="so-modal-overlay is-dim">
          <div className="so-modal-card-shortage">
            <h3 className="so-modal-title-shortage">⚠️ Báo thiếu thiết bị soạn hàng (UC4.1.5.1)</h3>
            <p className="so-modal-desc-dark">
              Ghi nhận tình trạng kho không đủ thiết bị thay thế hoặc mã bị hỏng để Quản trị viên liên hệ thỏa thuận với khách.
            </p>
            <textarea
              placeholder="Ghi rõ món bị thiếu hoặc hư hỏng (ví dụ: Thiếu 1 Lều 2 người do đơn trước chưa hoàn tất bảo dưỡng)..."
              value={shortageNote}
              onChange={(e) => setShortageNote(e.target.value)}
              rows={3}
              className="so-textarea-shortage"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowShortageModal(false)} className="so-btn-cancel">
                Hủy
              </button>
              <button
                disabled={handoverBusy}
                onClick={() => void handleReportShortage()}
                className="so-btn-danger-modal"
              >
                {handoverBusy ? "Đang gửi..." : "Gửi cảnh báo QTV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
