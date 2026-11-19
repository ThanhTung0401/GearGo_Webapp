import { fmt, type ImportReceipt, type Product } from "../../../store";
import { calculateReceiptTotal, type ServerReceiptAdjustment } from "./useInventoryTab";

interface InventoryReceiptDetailProps {
  selected: ImportReceipt;
  products: Product[];
  isRealApi: boolean;
  serverAdjustments: ServerReceiptAdjustment[];
  adjLoadingId: string | null;
  onEditDraft: (receipt: ImportReceipt) => void;
  onCancelDraft: (receipt: ImportReceipt) => void;
  onInspectReceipt: (receipt: ImportReceipt) => void;
  onOpenAdjustmentModal: (receipt: ImportReceipt) => void;
  onApproveAdjustment: (receiptId: string, adj: { id: string; rawStatus?: string }) => void;
  onRejectAdjustment: (receiptId: string, adjId: string) => void;
}

/**
 * Cột chi tiết phiếu nhập hàng đang chọn: bảng dòng vật tư, tổng tiền,
 * các nút nghiệp vụ theo trạng thái và lịch sử điều chỉnh sau chốt (UC7.10).
 */
export function InventoryReceiptDetail({
  selected,
  products,
  isRealApi,
  serverAdjustments,
  adjLoadingId,
  onEditDraft,
  onCancelDraft,
  onInspectReceipt,
  onOpenAdjustmentModal,
  onApproveAdjustment,
  onRejectAdjustment,
}: InventoryReceiptDetailProps) {
  const adjustmentsList = isRealApi ? serverAdjustments : (selected.adjustments ?? []);

  return (
    <div className="adm-card self-start">
      <div className="adm-card-header flex justify-between items-start gap-2">
        <div>
          <div className="adm-cell-code text-sm">{selected.displayCode ?? selected.id}</div>
          <div className="font-bold">{selected.supplierName}</div>
          <div className="adm-hint-text font-normal">Lập lúc {selected.createdAt} · {selected.createdBy}</div>
          {selected.supplierDocumentNumber && (
            <div className="text-[0.72rem] text-[#4B5563] font-normal">Số chứng từ NCC: <strong>{selected.supplierDocumentNumber}</strong></div>
          )}
        </div>
        <span className={`adm-pill adm-pill--round ${selected.status === "Đã nhập kho" ? "is-success" : selected.status === "Đã hủy" ? "is-neutral" : "is-warning"}`}>
          {selected.status}
        </span>
      </div>
      <div className="responsive-table">
        <table className="adm-table adm-table--min adm-table--md">
          <thead><tr>
            {["Sản phẩm", "Số lượng", "Đơn giá", "Kiểm nhận / Phân loại", "Thành tiền"].map((heading) => (
              <th key={heading} className={heading === "Sản phẩm" || heading === "Kiểm nhận / Phân loại" ? "" : "adm-cell-right"}>{heading}</th>
            ))}
          </tr></thead>
          <tbody>{selected.lines.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            const isZeroPrice = line.unitPrice === 0;
            const hasInspection = line.acceptedQty !== undefined || line.damagedQty !== undefined || line.rejectedQty !== undefined;
            const acceptedCount = line.acceptedQty ?? line.quantity;
            const damagedCount = line.damagedQty ?? 0;
            const rejectedCount = line.rejectedQty ?? 0;
            const billedCount = (line.acceptedQty !== undefined || line.damagedQty !== undefined) ? (acceptedCount + damagedCount) : line.quantity;

            return (
              <tr key={line.productId}>
                <td>
                  <div className="font-semibold">{product?.name}</div>
                  {isZeroPrice && (
                    <div className="adm-pill is-warning adm-pill--xs mt-0.5 font-normal">
                      🎁 Hàng tặng/KM: {line.priceZeroReason || "Quà tặng kèm đơn"}
                    </div>
                  )}
                </td>
                <td className="adm-cell-right">{line.quantity}</td>
                <td className="adm-cell-right">{isZeroPrice ? "0 đ (Tặng)" : fmt(line.unitPrice)}</td>
                <td className="text-[0.72rem]">
                  {hasInspection ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[#15803D] font-semibold">✓ Đạt: {acceptedCount} thiết bị {line.acceptedCodes && line.acceptedCodes.length > 0 ? `(${line.acceptedCodes.join(", ")})` : ""}</span>
                      {damagedCount > 0 && (
                        <span className="text-[#B45309] font-semibold">⚠️ Lỗi nhận sửa: {damagedCount} ({line.damageNotes || "Chờ bảo trì"})</span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="text-[#DC2626] font-semibold">✕ Từ chối trả NCC: {rejectedCount} ({line.rejectionReason || "Không đạt"})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#6B7280]">Mã dự kiến: {line.equipmentCodes.join(", ") || "Chưa tạo mã"}</span>
                  )}
                </td>
                <td className="adm-cell-right font-bold">
                  {fmt(billedCount * line.unitPrice)}
                  {rejectedCount > 0 && (
                    <div className="text-[0.68rem] text-[#DC2626] font-normal">- Đã trừ {rejectedCount} cái từ chối</div>
                  )}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="adm-receipt-footer">
        <div className="adm-receipt-total">
          <span>Tổng tiền thanh toán</span>
          <span className="text-[var(--color-forest)]">{fmt(calculateReceiptTotal(selected))}</span>
        </div>

        {selected.status === "Nháp" ? (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onEditDraft(selected)} className="adm-btn-forest-outline flex-1 min-w-[100px] py-2.5">
              ✏️ Sửa nháp (UC7.6)
            </button>
            <button onClick={() => onCancelDraft(selected)} className="adm-btn-danger-outline px-4 py-2.5 font-bold">
              ✕ Hủy nháp (UC7.9)
            </button>
            <button onClick={() => onInspectReceipt(selected)} className="adm-btn-primary flex-[1.6] min-w-[200px] py-2.5 font-bold shadow-sm">
              📦 Kiểm nhận & Chốt kho (UC7.7)
            </button>
          </div>
        ) : selected.status === "Đã hủy" ? (
          <div className="adm-pill is-neutral w-full justify-center py-2.5 text-[0.8rem] whitespace-normal text-center">
            Phiếu đã hủy lúc {selected.cancelledAt ?? "trước đó"}. Lý do: {selected.cancelReason ?? "Không có"}. Tồn kho không thay đổi.
          </div>
        ) : (
          <div>
            <div className="adm-alert is-success mb-3 font-semibold">
              ✓ Đã nhập kho lúc {selected.confirmedAt}. Người kiểm: {selected.inspectedBy ?? selected.createdBy}. Phiếu gốc đã được khóa chỉnh sửa.
            </div>

            {/* UC7.10: Xử lý sai lệch sau chốt */}
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2 border-t border-dashed border-[var(--color-bone)] pt-3">
              <div>
                <span className="text-[0.82rem] font-bold text-[var(--color-bark)]">Xử lý sai lệch phiếu nhập sau chốt (UC7.10)</span>
                <p className="adm-hint-text m-0">Ghi nhận sai sót số lượng, mã thiết bị hoặc giá vốn. Quản trị viên duyệt an toàn lịch thuê.</p>
              </div>
              <button
                onClick={() => onOpenAdjustmentModal(selected)}
                className="adm-btn-amber-sm px-3.5 py-2"
              >
                ⚡ Đề nghị điều chỉnh
              </button>
            </div>

            {adjustmentsList.length > 0 && (
              <div className="adm-adj-box">
                <div className="text-[0.75rem] font-bold mb-1.5 text-[#374151]">Lịch sử đề nghị điều chỉnh ({adjustmentsList.length}):</div>
                <div className="flex flex-col gap-2">
                  {adjustmentsList.map((adj) => (
                    <div key={adj.id} className="adm-adj-item">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[var(--color-forest)]">{adj.type}</span>
                        <span className={`adm-pill adm-pill--xs ${adj.status === "Đã duyệt" ? "is-success" : adj.status === "Từ chối" ? "is-danger" : "is-warning"}`}>
                          {adj.status}
                        </span>
                      </div>
                      <div className="text-[#374151]">
                        Giá trị: <span className="line-through text-[#9CA3AF]">{adj.previousValue}</span> → <strong>{adj.newValue}</strong>
                      </div>
                      <div className="text-[#6B7280] mt-0.5">
                        Lý do: <em>{adj.reason}</em> (Người lập: {adj.createdBy} lúc {adj.createdAt})
                      </div>
                      {adj.evidence && (
                        <div className="text-[#6B7280] text-[0.7rem] mt-0.5">Chứng từ kèm: {adj.evidence}</div>
                      )}

                      {adj.status === "Chờ duyệt" && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-dashed border-[var(--color-bone)]">
                          <button
                            disabled={adjLoadingId === adj.id}
                            onClick={() => onApproveAdjustment(selected.id, adj as { id: string; rawStatus?: string })}
                            className="adm-btn-forest-solid adm-btn-xs"
                          >
                            {adjLoadingId === adj.id ? "Đang duyệt..." : "✓ Duyệt (UC7.10)"}
                          </button>
                          <button
                            disabled={adjLoadingId === adj.id}
                            onClick={() => onRejectAdjustment(selected.id, adj.id)}
                            className="adm-btn-danger-outline adm-btn-xs"
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      )}
                      {adj.status === "Đã duyệt" && (
                        <div className="text-[0.7rem] text-[#15803D] mt-1 font-semibold">
                          ✓ Đã duyệt bởi {adj.reviewedBy} lúc {adj.reviewedAt}
                        </div>
                      )}
                      {adj.status === "Từ chối" && (
                        <div className="text-[0.7rem] text-[#DC2626] mt-1 font-semibold">
                          ✕ Từ chối bởi {adj.reviewedBy}: {adj.reviewNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
