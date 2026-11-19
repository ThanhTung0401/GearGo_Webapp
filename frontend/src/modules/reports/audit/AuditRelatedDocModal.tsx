import Icon from "../../../components/Icon";
import { fmt } from "../../../store";
import { type InspectDocState } from "./useAuditLogTab";

interface AuditRelatedDocModalProps {
  inspectDoc: InspectDocState;
  docLoading: boolean;
  docError: string;
  onClose: () => void;
}

/**
 * Modal tra cứu chứng từ gốc liên quan từ nhật ký ở chế độ chỉ đọc (UC10.4.2).
 * Hỗ trợ hiển thị đơn thuê, phiếu nhập kho, thiết bị và chứng từ JSON từ máy chủ.
 */
export function AuditRelatedDocModal({
  inspectDoc,
  docLoading,
  docError,
  onClose,
}: AuditRelatedDocModalProps) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-dialog is-xl">
        <div className="adm-modal-header-clean">
          <div>
            <h3 className="adm-card-title">
              {inspectDoc.title}
            </h3>
            <div className="text-[0.75rem] text-[var(--color-forest)] font-semibold">Chế độ tra cứu chứng từ gốc (Read-only — UC10.4.2)</div>
          </div>
          <button type="button" onClick={onClose} className="adm-btn-ghost">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="adm-modal-body-scroll text-[0.82rem]">
          {inspectDoc.type === "order" && (
            <div>
              <div className="adm-grid-3 mb-4">
                <div className="adm-card--parchment p-2.5">
                  <div className="adm-hint-text">Khách hàng</div>
                  <strong>{inspectDoc.data.customerName}</strong>
                  <div className="text-[#6B7280]">{inspectDoc.data.customerPhone}</div>
                </div>
                <div className="adm-card--parchment p-2.5">
                  <div className="adm-hint-text">Trạng thái</div>
                  <span className="text-[0.75rem] font-bold text-[var(--color-forest)]">{inspectDoc.data.status}</span>
                  <div className="text-[#6B7280]">Tạo lúc: {inspectDoc.data.createdAt}</div>
                </div>
                <div className="adm-card--parchment p-2.5">
                  <div className="adm-hint-text">Tổng tiền thanh toán</div>
                  <strong className="adm-cell-mono text-[var(--color-forest)] text-[1.1rem]">{fmt(inspectDoc.data.rental - inspectDoc.data.discount + inspectDoc.data.depositTotal)}</strong>
                  <div className="text-[#6B7280]">Cọc: {fmt(inspectDoc.data.depositTotal)}</div>
                </div>
              </div>

              <h4 className="font-bold mb-2">Danh sách thiết bị thuê:</h4>
              <div className="adm-table-scroll mb-4">
                <table className="adm-table adm-table--sm">
                  <thead>
                    <tr>
                      <th>Tên sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Số ngày</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectDoc.data.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-semibold">{it.productName}</td>
                        <td>{it.qty}</td>
                        <td>{it.days} ngày</td>
                        <td className="adm-cell-mono">{fmt(it.pricePerDay)}</td>
                        <td className="adm-cell-mono font-bold">{fmt(it.pricePerDay * it.qty * it.days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inspectDoc.type === "import" && (
            <div>
              <div className="adm-grid-2 mb-4">
                <div className="adm-card--parchment p-2.5">
                  <div className="adm-hint-text">Nhà cung cấp</div>
                  <strong>{inspectDoc.data.supplierName} ({inspectDoc.data.supplierId})</strong>
                </div>
                <div className="adm-card--parchment p-2.5">
                  <div className="adm-hint-text">Trạng thái & Ngày xác nhận</div>
                  <strong className="text-[var(--color-forest)]">{inspectDoc.data.status}</strong> — {inspectDoc.data.confirmedAt || inspectDoc.data.createdAt}
                </div>
              </div>

              <h4 className="font-bold mb-2">Vật phẩm nhập kho:</h4>
              <div className="adm-table-scroll">
                <table className="adm-table adm-table--sm">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                      <th>Mã sinh ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectDoc.data.lines.map((l: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-semibold">{l.productNameSnapshot || l.productId}</td>
                        <td>{l.quantity}</td>
                        <td className="adm-cell-mono">{fmt(l.unitPrice)}</td>
                        <td className="adm-cell-mono font-bold">{fmt(l.quantity * l.unitPrice)}</td>
                        <td className="adm-cell-mono text-[var(--color-amber)]">{l.equipmentCodes.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inspectDoc.type === "equipment" && (
            <div className="adm-card--parchment p-3.5">
              <div className="adm-hint-text text-[0.75rem]">Mã định danh thiết bị:</div>
              <strong className="adm-cell-mono text-[1.2rem] text-[var(--color-forest)]">{inspectDoc.data.id}</strong>
              <div className="mt-2">Tình trạng hiện tại: <strong>{inspectDoc.data.condition}</strong> · Trạng thái kho: <strong>{inspectDoc.data.equipmentStatus}</strong></div>
              <div className="mt-1">Số lượt cho thuê lũy kế: <strong>{inspectDoc.data.rentCount} lượt</strong> · Ngày nhập kho: {inspectDoc.data.importDate}</div>
            </div>
          )}

          {inspectDoc.type === "generic" && (
            <div className="adm-card--parchment p-3.5">
              <div>Chứng từ tham chiếu: <strong>{inspectDoc.data.entity}</strong></div>
              <div>Mã định danh: <strong className="adm-cell-mono">{inspectDoc.data.id}</strong></div>
              {inspectDoc.data.thamChieuUrl && (
                <div className="adm-hint-text text-[0.75rem] mt-1">
                  Đường dẫn máy chủ: <code className="adm-cell-mono">{inspectDoc.data.thamChieuUrl}</code>
                </div>
              )}
              {docLoading && (
                <div className="mt-2.5 text-[#6B7280]">Đang tải dữ liệu chứng từ gốc từ máy chủ...</div>
              )}
              {docError && (
                <div role="alert" className="mt-2.5 text-[#B91C1C]">{docError}</div>
              )}
              {inspectDoc.data.serverDoc ? (
                <pre className="adm-audit-pre-box">
                  {JSON.stringify(inspectDoc.data.serverDoc, null, 2)}
                </pre>
              ) : (
                !docLoading && (
                  <div className="mt-2 text-[#6B7280]">Dữ liệu gốc được lưu trữ trong cơ sở dữ liệu hệ thống.</div>
                )
              )}
            </div>
          )}
        </div>

        <div className="adm-modal-footer-clean">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
}
