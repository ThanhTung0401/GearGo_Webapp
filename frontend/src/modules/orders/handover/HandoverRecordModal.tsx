import { useApp } from "../../../context/AppContext";
import { formatDateTimeVi, Order } from "../../../store";

interface HandoverRecordModalProps {
  app: ReturnType<typeof useApp>;
  order: Order;
  assignments: Record<string, string[]>;
  receiverName: string;
  receiverPhone: string;
  receiverIdCard: string;
  isAuthorized: boolean;
  onCloseOnly: () => void;
  onCompleteClose: () => void;
}

// Modal hiển thị Biên bản Bàn giao (BBBG) sau khi chốt bàn giao thành công (UC4.2)
export function HandoverRecordModal({
  app,
  order,
  assignments,
  receiverName,
  receiverPhone,
  receiverIdCard,
  isAuthorized,
  onCloseOnly,
  onCompleteClose,
}: HandoverRecordModalProps) {
  return (
    <div className="so-modal-overlay">
      <div className="so-modal-card-bbbg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="so-modal-tag is-pill is-green">ĐÃ BÀN GIAO THÀNH CÔNG</span>
            <h3 className="so-modal-title">
              Biên bản Bàn giao BBBG-{order.displayCode || order.id}
            </h3>
          </div>
          <button onClick={onCloseOnly} className="so-modal-close-sm">✕</button>
        </div>

        <div className="so-info-box-lg">
          <div className="so-bbbg-grid">
            <div><strong>Khách đặt hàng:</strong> {order.customerName}</div>
            <div>
              <strong>Người nhận thực tế:</strong> {receiverName} {isAuthorized ? "(Người nhận thay)" : ""}
            </div>
            <div><strong>SĐT người nhận:</strong> {receiverPhone}</div>
            <div><strong>CCCD / Định danh:</strong> {receiverIdCard || "Đã kiểm tra đối chiếu"}</div>
            <div><strong>Thời gian bàn giao:</strong> {formatDateTimeVi(new Date())}</div>
            <div><strong>Nhân viên bàn giao:</strong> {app.currentUser?.name || "Nhân viên kho"}</div>
          </div>
        </div>

        <div className="so-field-group-md">
          <strong className="so-bbbg-heading">Danh sách thiết bị giao:</strong>
          <div className="flex flex-col gap-1 mt-1">
            {order.items
              .flatMap((i) => assignments[i.productId] || [])
              .map((code) => (
                <div key={code} className="so-bbbg-equip-item">
                  • Mã thiết bị:{" "}
                  <strong className="so-bbbg-equip-code">
                    {app.equipment.find((e) => e.id === code)?.displayCode || code}
                  </strong>{" "}
                  (Tình trạng: Tốt, hoạt động chuẩn)
                </div>
              ))}
          </div>
        </div>

        <div className="so-bbbg-checklist-note">
          <strong>Checklist đã kiểm:</strong> Tất cả 4 hạng mục an toàn, vệ sinh và phụ kiện đã được xác nhận đạt chuẩn cùng khách hàng.
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => window.print()} className="so-btn-outline-print">
            🖨 In Biên bản
          </button>
          <button onClick={onCompleteClose} className="so-btn-primary-md">
            Đóng & Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
