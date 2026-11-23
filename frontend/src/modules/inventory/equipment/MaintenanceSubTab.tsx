import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { fmt, formatDateTimeVi, MaintenanceReceipt } from "../../../store";
import Pagination from "../../../components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";

interface MaintenanceSubTabProps {
  app: ReturnType<typeof useApp>;
  equipBusy: boolean;
  onOpenCreateModal: () => void;
  onOpenAssignModal: (m: MaintenanceReceipt) => void;
  onOpenProgressModal: (m: MaintenanceReceipt) => void;
  onSendCheck: (m: MaintenanceReceipt) => Promise<void>;
  onOpenAcceptModal: (m: MaintenanceReceipt) => void;
}

// Sub-tab Quản lý phiếu bảo trì, phân công kỹ thuật và nghiệm thu (UC6.12 & UC6.13)
export function MaintenanceSubTab({
  app,
  equipBusy,
  onOpenCreateModal,
  onOpenAssignModal,
  onOpenProgressModal,
  onSendCheck,
  onOpenAcceptModal,
}: MaintenanceSubTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  const filtered = app.maintenanceReceipts.filter((m) => {
    const matchStatus = statusFilter === "Tất cả" || m.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchedEquip = app.equipment.find((eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId);
    const equipDisplay = (matchedEquip?.displayCode || m.equipmentId || "").toLowerCase();
    const matchSearch =
      !q ||
      m.id.toLowerCase().includes(q) ||
      equipDisplay.includes(q) ||
      (m.issueDescription || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
  const paging = usePagination(filtered, 8);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="so-section-title">
            Hồ sơ bảo trì & sửa chữa thiết bị
          </h3>
          <p className="so-section-sub">
            Ghi nhận các thiết bị hư hỏng, ước tính kinh phí và nghiệm thu đưa về kho Sẵn sàng.
          </p>
        </div>
        <button type="button" onClick={onOpenCreateModal} className="so-btn-primary">
          + Tạo phiếu bảo trì (UC6.12)
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Tìm mã phiếu, mã thiết bị, mô tả lỗi..."
          aria-label="Tìm phiếu bảo trì"
          className="form-input flex-1 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc trạng thái bảo trì"
          className="so-select"
        >
          {["Tất cả", "Chờ xử lý", "Đang sửa chữa", "Đang bảo dưỡng", "Đã nghiệm thu", "Hoàn tất", "Không thể sửa"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="responsive-table so-table-card">
        <table className="so-table so-zebra-table">
          <thead>
            <tr>
              {["Mã phiếu", "Mã thiết bị", "Mô tả lỗi / Hư hỏng", "Đơn liên quan", "Ngày tạo", "Dự tính", "Thực tế", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paging.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-sm text-gray-500">
                  Không có phiếu bảo trì nào phù hợp.
                </td>
              </tr>
            ) : (
              paging.pagedItems.map((m) => {
                const matchedEquip = app.equipment.find(
                  (eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId
                );
                const equipDisplay = matchedEquip?.displayCode || m.equipmentId;
                const isFinalized =
                  m.status === "Hoàn tất" || m.status === "Đã nghiệm thu" || m.status === "Không thể sửa";
                /* Ánh xạ trạng thái phiếu bảo trì sang modifier CSS hữu hạn */
                const maintStatusMod =
                  m.status === "Hoàn tất" || m.status === "Đã nghiệm thu"
                    ? "is-done"
                    : m.status === "Đang bảo dưỡng" || m.status === "Đang sửa chữa"
                    ? "is-progress"
                    : m.status === "Không thể sửa"
                    ? "is-unfixable"
                    : "is-pending";
                return (
                  <tr key={m.id}>
                    <td className="so-td-mono-md">{m.id}</td>
                    <td className="so-td-mono-dark">{equipDisplay}</td>
                    <td>
                      <div>{m.issueDescription}</div>
                      {m.note && <div className="so-maint-note">{m.note}</div>}
                    </td>
                    <td className="so-td-mono-gray">{m.orderId || "—"}</td>
                    <td className="so-td-muted-sm">{formatDateTimeVi(m.createdAt)}</td>
                    <td className="so-td-cost">{fmt(m.estimatedCost)}</td>
                    <td className={`so-td-actual-cost ${m.actualCost ? "has-cost" : ""}`}>
                      {m.actualCost !== undefined ? fmt(m.actualCost) : "—"}
                    </td>
                    <td>
                      <span className={`so-status-badge ${maintStatusMod}`}>{m.status}</span>
                    </td>
                    <td>
                      {!isFinalized ? (
                        <div className="flex gap-1 flex-wrap">
                          {(app.realApi || isRealApiEnabled()) && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenAssignModal(m)}
                                className="so-btn-info-pad"
                              >
                                Phân công
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenProgressModal(m)}
                                className="so-btn-amber-pill"
                              >
                                Tiến độ
                              </button>
                              <button
                                type="button"
                                disabled={equipBusy}
                                onClick={() => void onSendCheck(m)}
                                className="so-btn-purple-sm"
                              >
                                Gửi KT
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenAcceptModal(m)}
                            className="so-btn-primary-sm"
                          >
                            Nghiệm thu →
                          </button>
                        </div>
                      ) : (
                        <span className="so-muted-sm">Đã chốt</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={paging.page}
        totalPages={paging.totalPages}
        totalItems={paging.totalItems}
        startIndex={paging.startIndex}
        endIndex={paging.endIndex}
        onPageChange={paging.setPage}
        itemLabel="phiếu bảo trì"
      />
    </div>
  );
}
