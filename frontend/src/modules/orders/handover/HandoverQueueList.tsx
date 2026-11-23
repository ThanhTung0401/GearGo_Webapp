import type React from "react";
import { formatDateTimeVi, statusColors, Order } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface HandoverQueueListProps {
  subTab: "prep" | "handover";
  eligiblePrep: Order[];
  eligibleHandover: Order[];
  selectedOrder: Order | null;
  qrCodeSearch: string;
  setQrCodeSearch: (v: string) => void;
  handleQrSearch: (e: React.FormEvent) => void;
  onSelectOrder: (orderId: string) => void;
}

// Cột trái: Ô quét QR tại quầy (UC4.2) và danh sách hàng đợi đơn cần soạn / bàn giao
export function HandoverQueueList({
  subTab,
  eligiblePrep,
  eligibleHandover,
  selectedOrder,
  qrCodeSearch,
  setQrCodeSearch,
  handleQrSearch,
  onSelectOrder,
}: HandoverQueueListProps) {
  const activeList = subTab === "prep" ? eligiblePrep : eligibleHandover;
  const paging = usePagination(activeList, 6);

  return (
    <div>
      <form onSubmit={handleQrSearch} className="mb-3">
        <label className="so-qr-label">
          {subTab === "prep"
            ? "🔍 Tra nhanh mã đơn / tên khách cần chuẩn bị:"
            : "📷 Quét QR / Tra nhanh mã đơn tại quầy:"}
        </label>
        <div className="flex gap-1">
          <input
            placeholder="Nhập mã đơn (#ORD/#DT), tên hoặc SĐT..."
            value={qrCodeSearch}
            onChange={(e) => setQrCodeSearch(e.target.value)}
            className="so-qr-input"
          />
          <button type="submit" className="so-qr-btn">
            Tìm
          </button>
        </div>
      </form>

      <h3 className="so-queue-title">
        {subTab === "prep" ? "Danh sách đơn cần chuẩn bị" : "Đơn sẵn sàng chờ giao khách"}
      </h3>

      <div className="flex flex-col gap-2">
        {paging.pagedItems.map((o) => {
          const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
          const isSelected = selectedOrder?.id === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelectOrder(o.id)}
              /* Đánh dấu thẻ đơn hàng đang chọn ở cột trái bằng .is-selected */
              className={`so-queue-card ${isSelected ? "is-selected" : ""}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="so-queue-code">{o.displayCode || o.id}</span>
                {/* Khi chưa chọn, màu badge lấy động từ statusColors; khi đang chọn, CSS .is-selected ghi đè nền trắng mờ */}
                <span
                  className="so-queue-badge"
                  style={isSelected ? undefined : { background: sc.bg, color: sc.text }}
                >
                  {o.status}
                </span>
              </div>
              <div className="so-queue-name">{o.customerName}</div>
              <div className="so-queue-time">Hẹn nhận: {formatDateTimeVi(o.pickupTime)}</div>
              {o.shortageReported && (
                <div className="so-queue-shortage">⚠️ Đã báo thiếu: {o.shortageReported.note}</div>
              )}
            </button>
          );
        })}
        {activeList.length === 0 && (
          <p className="so-queue-empty">
            {subTab === "prep"
              ? "Hiện không có đơn nào cần soạn hàng."
              : "Hiện không có đơn nào chờ nhận tại quầy."}
          </p>
        )}
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="đơn"
      />
    </div>
  );
}
