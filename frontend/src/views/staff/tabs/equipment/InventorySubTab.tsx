import { useApp } from "../../../../context/AppContext";
import { fmt, Equipment } from "../../../../store";
import EquipmentLifecycleModal from "../../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../../components/InventoryAuditModal";
import { EQUIPMENT_STATUS_OPTIONS, EQUIPMENT_STATUS_STYLE } from "./useEquipmentTab";

interface InventorySubTabProps {
  app: ReturnType<typeof useApp>;
  filter: string;
  setFilter: (v: string) => void;
  productFilter: string;
  setProductFilter: (v: string) => void;
  products: string[];
  filtered: Equipment[];
  transferModal: Equipment | null;
  setTransferModal: (v: Equipment | null) => void;
  targetProductId: string;
  setTargetProductId: (v: string) => void;
  viewingLifecycle: Equipment | null;
  setViewingLifecycle: (v: Equipment | null) => void;
  showAuditModal: boolean;
  setShowAuditModal: (v: boolean) => void;
  handleOpenEquipSchedule: (e: Equipment) => Promise<void>;
  handleTransfer: () => Promise<void>;
}

// Sub-tab Danh sách kho thiết bị, kiểm kê kho (UC6.10) và chuyển loại sản phẩm
export function InventorySubTab({
  app,
  filter,
  setFilter,
  productFilter,
  setProductFilter,
  products,
  filtered,
  transferModal,
  setTransferModal,
  targetProductId,
  setTargetProductId,
  viewingLifecycle,
  setViewingLifecycle,
  showAuditModal,
  setShowAuditModal,
  handleOpenEquipSchedule,
  handleTransfer,
}: InventorySubTabProps) {
  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Lọc theo trạng thái thiết bị"
          className="so-select"
        >
          {EQUIPMENT_STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label="Lọc theo sản phẩm"
          className="so-select"
        >
          {products.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-wrap">
          {["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc"].map((s) => {
            const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
            const style = EQUIPMENT_STATUS_STYLE[s];
            /* Màu chip đếm thiết bị lấy động theo bản đồ EQUIPMENT_STATUS_STYLE */
            return (
              <div key={s} className="so-status-chip" style={{ background: style.bg, color: style.text }}>
                {s}: {cnt}
              </div>
            );
          })}
        </div>
        <button onClick={() => setShowAuditModal(true)} className="so-btn-amber-auto">
          📋 Kiểm kê kho (UC6.10)
        </button>
      </div>

      <div className="responsive-table so-table-card">
        <table className="so-table so-zebra-table">
          <thead>
            <tr>
              {["Mã thiết bị", "Sản phẩm hiện tại", "Phiếu nhập", "Ngày nhập", "Tình trạng", "Trạng thái", "Số lần thuê", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const p = app.products.find((pr) => pr.id === e.productId);
              const origP = app.products.find((pr) => pr.id === e.originalProductId);
              const moved = e.productId !== e.originalProductId;
              const st = EQUIPMENT_STATUS_STYLE[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
              return (
                <tr key={e.id}>
                  <td className="so-td-mono-md">{e.displayCode || e.id}</td>
                  <td>
                    <div className="so-td-semibold">{p?.name}</div>
                    {moved && <div className="so-equip-moved">↳ Giáng cấp/chuyển từ {origP?.name}</div>}
                  </td>
                  <td className="so-td-mono-muted">{e.importReceiptId}</td>
                  <td className="so-td-muted-sm">{e.importDate}</td>
                  <td className="so-td-muted">{e.condition}</td>
                  <td>
                    {/* Màu trạng thái thiết bị lấy động từ EQUIPMENT_STATUS_STYLE */}
                    <span className="so-status-pill-md" style={{ background: st.bg, color: st.text }}>
                      {e.equipmentStatus}
                    </span>
                  </td>
                  <td className="so-td-mono-center">{e.rentCount}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setViewingLifecycle(e)} className="so-btn-outline-forest">
                        🔍 Sổ đời
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenEquipSchedule(e)}
                        className="so-btn-info-sm"
                      >
                        📅 Lịch bận
                      </button>
                      {e.equipmentStatus === "Sẵn sàng" && (
                        <button
                          onClick={() => {
                            setTransferModal(e);
                            setTargetProductId("");
                          }}
                          className="so-btn-outline-sm"
                        >
                          Chuyển loại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal chuyển loại thiết bị (giáng cấp cũ sang tiết kiệm) */}
      {transferModal && (
        <div className="so-modal-overlay is-dim">
          <div className="so-modal-card-sm">
            <h3 className="so-modal-title-mb">
              Chuyển loại thiết bị: {transferModal.displayCode || transferModal.id}
            </h3>
            <p className="so-modal-desc">
              Dùng khi thiết bị cũ khấu hao (ví dụ từ Tiêu chuẩn sang Tiết kiệm).
            </p>
            <label className="so-field-label">Sản phẩm đích mới:</label>
            <select
              value={targetProductId}
              onChange={(e) => setTargetProductId(e.target.value)}
              className="so-input-mb14"
            >
              <option value="">-- Chọn sản phẩm đích --</option>
              {app.products
                .filter((p) => p.id !== transferModal.productId && p.status === "active")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({fmt(p.pricePerDay)}/ngày)
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTransferModal(null)} className="so-btn-cancel">Hủy</button>
              <button
                disabled={!targetProductId}
                onClick={() => void handleTransfer()}
                className={`so-btn-confirm ${targetProductId ? "is-ready" : ""}`}
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingLifecycle && (
        <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />
      )}
      {showAuditModal && <InventoryAuditModal app={app} onClose={() => setShowAuditModal(false)} />}
    </div>
  );
}
