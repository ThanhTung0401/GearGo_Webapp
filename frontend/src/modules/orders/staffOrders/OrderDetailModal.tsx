import { fmt, formatDateTimeVi, Order } from "../../../store";
import { type StaffTab } from "../returnMapping";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  openOrder: (id: string, tab: StaffTab) => void;
}

// UC4.5 Bước 3: Modal Xem Toàn Diện Hồ Sơ Vận Hành Đơn Hàng
export function OrderDetailModal({ order, onClose, openOrder }: OrderDetailModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-lg">
        <div className="flex justify-between items-start mb-4 border-b border-bone pb-3">
          <div>
            <span className="so-modal-tag is-parchment">
              HỒ SƠ VẬN HÀNH ĐƠN HÀNG (UC4.5)
            </span>
            <h3 className="so-modal-title">
              Chi tiết đơn #{order.displayCode || order.id} — {order.customerName}
            </h3>
            <div className="so-modal-sub">
              SĐT: <strong>{order.customerPhone}</strong> · Trạng thái: <strong>{order.status}</strong>
            </div>
          </div>
          <button onClick={onClose} className="so-modal-close">✕</button>
        </div>

        {/* Thông tin lịch trình & tài chính */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-parchment rounded-lg mb-4 text-xs">
          <div>
            <span className="text-gray-500 block">📤 Hẹn nhận:</span>
            <strong>{formatDateTimeVi(order.pickupTime)}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">📥 Hẹn trả:</span>
            <strong>{formatDateTimeVi(order.returnTime)}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">💰 Tiền thuê & cọc:</span>
            <strong className="text-forest font-mono">
              {fmt(order.rental - order.discount + order.depositTotal)}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 block">📦 Tổng thiết bị:</span>
            <strong>{order.items.reduce((sum, it) => sum + it.qty, 0)} món</strong>
          </div>
        </div>

        {/* Cảnh báo No-Show hoặc Thiếu đồ nếu có */}
        {order.noShowReported && (
          <div className="so-alert-danger-sm">
            <strong>⚠️ BIÊN BẢN KHÁCH VẮNG MẶT (No-Show):</strong> {order.noShowReported.note}
            <div className="so-alert-danger-sm-sub">
              Ghi nhận lúc: {formatDateTimeVi(order.noShowReported.reportedAt)} bởi {order.noShowReported.staffName}
            </div>
          </div>
        )}

        {/* Danh sách thiết bị phân công */}
        <div className="mb-4">
          <h4 className="so-sub-heading-sm">
            1. Thiết bị phân công ({order.assignedEquipment.length} serial):
          </h4>
          <div className="flex flex-col gap-1">
            {order.assignedEquipment.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Chưa phân công serial (Đơn đang chờ soạn hàng).</p>
            ) : (
              order.assignedEquipment.map((ae) => (
                <div key={ae.equipmentId} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs border border-bone">
                  <div>
                    <strong className="font-mono text-forest">{ae.equipmentDisplayCode || ae.equipmentId}</strong>{" "}
                    {ae.assignedAt ? `(Gán lúc: ${formatDateTimeVi(ae.assignedAt)})` : ""}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      ae.returnedAt ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {ae.returnedAt ? `✓ Đã trả (${ae.returnCondition || "Tốt"})` : "Đang thuê"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Biên bản bàn giao nếu có */}
        {order.handoverRecord && (
          <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded-lg text-xs">
            <div className="flex justify-between items-center mb-1">
              <strong className="text-green-800 font-mono">{order.handoverRecord.id}</strong>
              <span className="text-green-700">Đã bàn giao: {formatDateTimeVi(order.handoverRecord.handoverAt)}</span>
            </div>
            <div className="text-gray-600">
              Người nhận: <strong>{order.handoverRecord.receiverName || order.customerName}</strong> (
              {order.handoverRecord.receiverPhone || order.customerPhone}) · CCCD:{" "}
              {order.handoverRecord.receiverIdCard || "Đã đối chiếu"}
            </div>
          </div>
        )}

        {/* Lịch sử các đợt nhận trả PNT */}
        {(order.returnReceipts?.length || 0) > 0 && (
          <div className="mb-4">
            <h4 className="so-sub-heading-sm">
              2. Lịch sử nhận trả ({order.returnReceipts?.length} phiếu):
            </h4>
            <div className="flex flex-col gap-1">
              {order.returnReceipts?.map((rc) => (
                <div key={rc.id} className="flex justify-between items-center bg-amber-50 border border-amber-200 p-2 rounded text-xs">
                  <div>
                    <strong className="font-mono text-amber-900">{rc.id}</strong> — Đợt {rc.returnRound} ({rc.items.length} món)
                    <div className="text-gray-500 text-[11px]">{formatDateTimeVi(rc.returnedAt)} · NV: {rc.staffName}</div>
                  </div>
                  <span className="font-bold text-amber-800">
                    {rc.isFinalReturn ? "Trả đợt cuối" : "Trả một phần"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lịch sử trạng thái */}
        <div className="mb-4">
          <h4 className="so-sub-heading-sm">
            3. Nhật ký chuyển trạng thái (Audit timeline):
          </h4>
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            {order.statusHistory.map((sh, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-400 font-mono">{formatDateTimeVi(sh.at)}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 font-bold">{sh.status}</span>
                <span className="text-gray-500">bởi {sh.by}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cho phép nhóm nút modal chi tiết xuống dòng trên mobile 390px */}
        <div className="flex justify-end gap-2 flex-wrap border-t border-bone pt-3">
          {!["Chờ thanh toán", "Khách hủy", "Cửa hàng hủy", "Hết hạn thanh toán", "Không đến nhận"].includes(order.status) && (
            <button
              onClick={() => {
                const targetTab: StaffTab = ["Đang thuê", "Quá hạn", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(order.status)
                  ? "return"
                  : "handover";
                openOrder(order.id, targetTab);
                onClose();
              }}
              className="btn btn-primary btn-sm"
            >
              Chuyển đến màn hình thao tác →
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
