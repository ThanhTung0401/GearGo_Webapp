import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { inventoryApi } from "../../../services/api/inventoryApi";
import { warehouseApi, type PhanTichAnhHuongBackend } from "../../../services/api/warehouseApi";

import { mapDieuChinhKhoToReceipt, mapEquipmentStatusToBackend } from "../../../services/mappers/catalogEquipmentMapper";
import { type StockAdjustmentReceipt, type EquipmentStatus } from "../../../store";

import { FormModal, FormActions } from "../forms/FormModal";

import InventoryAuditModal from "../../../components/InventoryAuditModal";

export function StockAdjustTab({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedEquipId, setSelectedEquipId] = useState("");
  const [newStatus, setNewStatus] = useState<EquipmentStatus>("Thất lạc");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [tabMessage, setTabMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [realAdjustments, setRealAdjustments] = useState<StockAdjustmentReceipt[]>([]);
  const [rawStatuses, setRawStatuses] = useState<Record<string, string>>({});
  const [rawEquipIds, setRawEquipIds] = useState<Record<string, number>>({});
  const [impactModal, setImpactModal] = useState<{
    sa: StockAdjustmentReceipt;
    analysis: PhanTichAnhHuongBackend | null;
    loading: boolean;
    error: string;
  } | null>(null);

  const loadRealAdjustments = async () => {
    if (!isRealApi) return;
    try {
      const res = await inventoryApi.timPhieu({ trang: 1, soMoiTrang: 50 });
      const rawMap: Record<string, string> = {};
      const equipIdMap: Record<string, number> = {};
      const mapped = (res.items ?? []).map((dc) => {
        rawMap[String(dc.maPhieuDieuChinh)] = dc.trangThai;
        const firstEquipId = dc.chiTiet?.[0]?.maThietBi;
        if (typeof firstEquipId === "number") {
          equipIdMap[String(dc.maPhieuDieuChinh)] = firstEquipId;
        }
        return mapDieuChinhKhoToReceipt(dc);
      });
      setRawStatuses(rawMap);
      setRawEquipIds(equipIdMap);
      setRealAdjustments(mapped);
    } catch (err) {
      setTabMessage({ type: "error", text: err instanceof Error ? err.message : "Không thể tải danh sách điều chỉnh kho." });
    }
  };

  useEffect(() => {
    loadRealAdjustments();
  }, [isRealApi]);

  const displayedAdjustments = isRealApi ? realAdjustments : app.stockAdjustments;
  const currentEquip = app.equipment.find((e) => e.id === selectedEquipId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!selectedEquipId) return setModalError("Vui lòng chọn mã thiết bị.");
    if (!reason.trim()) return setModalError("Vui lòng nhập lý do điều chỉnh kho.");

    // UC55, UC57 / UC6.10, UC6.11: Lập và duyệt điều chỉnh kho
    if (isRealApi) {
      const equipIdNum = Number(selectedEquipId);
      if (Number.isNaN(equipIdNum)) {
        return setModalError("ID thiết bị không hợp lệ.");
      }
      setSubmitting(true);
      try {
        const dto = {
          loaiDieuChinh: newStatus === "Ngừng sử dụng" ? "NgungSuDung" : "KiemKeSaiLech",
          lyDo: reason.trim(),
          chiTiet: [
            {
              maThietBi: equipIdNum,
              giaTriDeNghiSau: {
                trangThaiSuDung: mapEquipmentStatusToBackend(newStatus),
                tinhTrang: notes.trim() || newStatus,
              },
              ghiChu: notes.trim() || reason.trim(),
            },
          ],
        };
        const created = await inventoryApi.lapPhieu(dto);
        await inventoryApi.guiDuyet(created.maPhieuDieuChinh);
        await inventoryApi.duyetVaApDung(created.maPhieuDieuChinh);
        await Promise.all([loadRealAdjustments(), app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setShowModal(false);
        setSelectedEquipId("");
        setReason("");
        setNotes("");
        setTabMessage({ type: "success", text: `Đã lập và áp dụng phiếu điều chỉnh #${created.maPhieuDieuChinh} vào kho!` });
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Lỗi lập phiếu điều chỉnh trên máy chủ.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const res = app.createStockAdjustment({
      reason: reason.trim(),
      createdBy: "Quản trị viên",
      lines: [
        {
          equipmentId: selectedEquipId,
          previousStatus: currentEquip?.equipmentStatus || "Sẵn sàng",
          newStatus,
          reason: notes.trim() || reason.trim(),
        },
      ],
      autoApprove: true, // Khi Admin tự lập phiếu thì tự động duyệt
    });

    if (res.ok) {
      setShowModal(false);
      setSelectedEquipId("");
      setReason("");
      setNotes("");
      setTabMessage({ type: "success", text: `Đã lập phiếu điều chỉnh ${res.data.id} và cập nhật trạng thái kho!` });
    } else {
      setModalError(res.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="adm-page-title">
            Kiểm kê & Điều chỉnh kho (UC6.10 & UC6.11)
          </h2>
          <p className="adm-page-subtitle">
            Tách biệt tài sản khách đang thuê, lập phiếu đề nghị điều chỉnh chờ duyệt và kiểm tra xung đột đơn tương lai trước khi duyệt kho.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAuditModal(true)} className="adm-btn-amber font-bold">
            📋 Kiểm kê kho (UC6.10)
          </button>
          <button onClick={() => { setShowModal(true); setModalError(""); }} className="adm-btn-primary font-bold">
            + Lập phiếu thủ công
          </button>
        </div>
      </div>

      {tabMessage && (
        <div role="alert" className={`adm-alert ${tabMessage.type === "error" ? "is-error-solid" : "is-success"}`}>
          {tabMessage.text}
        </div>
      )}

      <div className="adm-table-wrap">
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--zebra adm-table--md">
            <thead>
              <tr>
                {["Mã phiếu", "Ngày lập", "Người lập", "Lý do chung", "Thiết bị điều chỉnh", "Trạng thái cũ → Mới", "Tình trạng", "Phê duyệt", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedAdjustments.map((sa) => (
                <tr key={sa.id}>
                  <td className="adm-cell-code">
                    {sa.id}
                  </td>
                  <td className="adm-cell-muted">{sa.createdAt}</td>
                  <td className="font-semibold text-[0.82rem]">{sa.createdBy}</td>
                  <td className="text-[0.82rem] text-[var(--color-bark)]">{sa.reason}</td>
                  <td>
                    {sa.lines.map((l) => (
                      <div key={l.equipmentId}>
                        <strong className="adm-cell-mono text-[var(--color-forest)]">{l.equipmentId}</strong>
                        {l.reason && <span className="adm-hint-text"> ({l.reason})</span>}
                      </div>
                    ))}
                  </td>
                  <td>
                    {sa.lines.map((l) => (
                      <div key={l.equipmentId} className="flex items-center gap-1">
                        <span className="text-[#6B7280]">{l.previousStatus}</span>
                        <span>→</span>
                        <strong className={l.newStatus === "Ngừng sử dụng" ? "text-[#DC2626]" : l.newStatus === "Thất lạc" ? "text-[#B91C1C]" : "text-[var(--color-forest)]"}>
                          {l.newStatus}
                        </strong>
                      </div>
                    ))}
                  </td>
                  <td>
                    <span className={`adm-pill ${sa.status === "Chờ duyệt" ? "is-warning" : sa.status === "Từ chối" ? "is-danger" : "is-success"}`}>
                      {sa.status || "Đã duyệt"}
                    </span>
                  </td>
                  <td className="text-[0.75rem] text-[#6B7280]">
                    {sa.approvedBy ? `${sa.approvedBy}` : sa.status === "Chờ duyệt" ? "Chưa duyệt" : "Tự động"}
                    {sa.approvedAt && <div className="adm-muted-note text-[0.7rem]">{sa.approvedAt}</div>}
                  </td>
                  <td>
                    {sa.status === "Chờ duyệt" ? (
                      <div className="flex gap-1">
                        {isRealApi && sa.lines[0] && (
                          <button
                            type="button"
                            disabled={actionLoadingId === sa.id}
                            onClick={async () => {
                              const line = sa.lines[0];
                              // Ưu tiên ID số gốc từ API (tránh lỗi NaN khi equipmentId là mã hiển thị như TB-001)
                              const matchedEquip = app.equipment.find((e) => e.id === line.equipmentId || e.displayCode === line.equipmentId);
                              const equipIdNum = rawEquipIds[sa.id] ?? (matchedEquip ? Number(matchedEquip.id) : Number(line.equipmentId));
                              setImpactModal({ sa, analysis: null, loading: true, error: "" });
                              if (!equipIdNum || Number.isNaN(equipIdNum)) {
                                setImpactModal({ sa, analysis: null, loading: false, error: "ID thiết bị không hợp lệ để kiểm tra ảnh hưởng." });
                                return;
                              }
                              try {
                                const loaiThayDoi = line.newStatus === "Ngừng sử dụng" ? "NgungSuDung" : "BaoTri";
                                const analysis = await warehouseApi.xemAnhHuongDieuChinh({
                                  maThietBi: equipIdNum,
                                  loaiThayDoi,
                                  lyDo: sa.reason,
                                });
                                setImpactModal({ sa, analysis, loading: false, error: "" });
                              } catch (err) {
                                setImpactModal({
                                  sa,
                                  analysis: null,
                                  loading: false,
                                  error: err instanceof Error ? err.message : "Không thể kiểm tra ảnh hưởng điều chỉnh kho.",
                                });
                              }
                            }}
                            className="adm-btn-info-soft adm-btn-xs"
                          >
                            🔍 Ảnh hưởng
                          </button>
                        )}
                        <button
                          disabled={actionLoadingId === sa.id}
                          onClick={async () => {
                            setTabMessage(null);
                            // UC57, UC58: Phê duyệt điều chỉnh kho nguyên tử
                            if (isRealApi) {
                              const idNum = Number(sa.id);
                              if (Number.isNaN(idNum)) {
                                setTabMessage({ type: "error", text: "ID phiếu điều chỉnh không hợp lệ." });
                                return;
                              }
                              setActionLoadingId(sa.id);
                              try {
                                if (rawStatuses[sa.id] === "Nhap") {
                                  await inventoryApi.guiDuyet(idNum);
                                }
                                await inventoryApi.duyetVaApDung(idNum);
                                await Promise.all([loadRealAdjustments(), app.refreshEquipment?.(), app.refreshCatalog?.()]);
                                setTabMessage({ type: "success", text: `Đã phê duyệt phiếu điều chỉnh #${sa.id} thành công (UC57, UC58)!` });
                              } catch (err) {
                                setTabMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi phê duyệt điều chỉnh kho." });
                              } finally {
                                setActionLoadingId(null);
                              }
                              return;
                            }
                            const res = app.approveStockAdjustment(sa.id);
                            setTabMessage(res.ok ? { type: "success", text: "Đã phê duyệt điều chỉnh kho thành công! Kho đã được cập nhật." } : { type: "error", text: res.message });
                          }}
                          className="adm-btn-forest-solid adm-btn-xs"
                        >
                          {actionLoadingId === sa.id ? "..." : "✓ Duyệt (UC6.11)"}
                        </button>
                        <button
                          disabled={actionLoadingId === sa.id}
                          onClick={() => {
                            setRejectingId(sa.id);
                            setRejectReasonInput("");
                            setRejectError("");
                          }}
                          className="adm-btn-danger-outline adm-btn-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="adm-muted-note text-[0.75rem]">Đã chốt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <FormModal title="Lập phiếu điều chỉnh kho sau kiểm kê" description="Cập nhật trực tiếp số lượng và trạng thái khả dụng của thiết bị trong kho." onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
            <label className="adm-label">
              Thiết bị cần điều chỉnh:
              <select value={selectedEquipId} onChange={(e) => setSelectedEquipId(e.target.value)} className="adm-field">
                <option value="">-- Chọn thiết bị trong kho --</option>
                {app.equipment.map((e) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.displayCode ?? e.id} — {p?.name} (Hiện tại: {e.equipmentStatus})
                    </option>
                  );
                })}
              </select>
            </label>

            {currentEquip && (
              <div className="adm-card--parchment text-[0.8rem]">
                Trạng thái hiện tại: <strong>{currentEquip.equipmentStatus}</strong> · Tình trạng: <strong>{currentEquip.condition}</strong>
              </div>
            )}

            <label className="adm-label">
              Trạng thái mới sau điều chỉnh:
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)} className="adm-field">
                <option value="Sẵn sàng">Sẵn sàng (Tìm thấy lại sau thất lạc)</option>
                <option value="Đang bảo trì">Đang bảo trì (Phát hiện hư hỏng lúc kiểm kho)</option>
                <option value="Thất lạc">Thất lạc (Mất mát kiểm kê chưa rõ nguyên nhân)</option>
                <option value="Ngừng sử dụng">Ngừng sử dụng (Hỏng hoàn toàn, không thể sửa)</option>
              </select>
            </label>

            <label className="adm-label">
              Lý do kiểm kê / đợt kiểm kê:
              <input placeholder="VD: Kiểm kê kho định kỳ" value={reason} onChange={(e) => setReason(e.target.value)} className="adm-field" />
            </label>

            <label className="adm-label">
              Ghi chú chi tiết nguyên nhân:
              <textarea placeholder="Mô tả nguyên nhân sai lệch..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="adm-field" />
            </label>

            {modalError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{modalError}</div>}
            <FormActions onClose={() => setShowModal(false)} loading={submitting} />
          </form>
        </FormModal>
      )}

      {impactModal && (
        <FormModal
          title={`Phân tích ảnh hưởng điều chỉnh #${impactModal.sa.id} (UC6.10.1)`}
          description="Kiểm tra xung đột lịch đặt trước và đơn thuê tương lai trước khi phê duyệt điều chỉnh kho."
          onClose={() => setImpactModal(null)}
        >
          <div className="grid gap-3 mt-3">
            {impactModal.loading && (
              <div className="adm-loading-text mb-0">Đang phân tích ảnh hưởng lên đơn thuê tương lai...</div>
            )}
            {impactModal.error && (
              <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">
                {impactModal.error}
              </div>
            )}
            {impactModal.analysis && (
              <div className="grid gap-2.5 text-[0.82rem]">
                <div className={`adm-alert adm-alert--block mb-0 font-bold ${impactModal.analysis.coTheApDungHienTai ? "is-success" : "is-error"}`}>
                  {impactModal.analysis.coTheApDungHienTai
                    ? "✓ Có thể áp dụng điều chỉnh hiện tại."
                    : "⚠ Có xung đột / vướng mắc cần xử lý trước khi áp dụng."}
                </div>
                {impactModal.analysis.camKetCuThe.length > 0 && (
                  <div className="adm-card--soft p-2.5">
                    <strong>Cam kết đơn cụ thể:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.camKetCuThe.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {impactModal.analysis.thieuSoLuongTheoLich.length > 0 && (
                  <div className="adm-alert is-warning adm-alert--block mb-0">
                    <strong>Thiếu số lượng theo lịch:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.thieuSoLuongTheoLich.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {impactModal.analysis.vuongMac.length > 0 && (
                  <div className="adm-alert is-error adm-alert--block mb-0">
                    <strong>Vướng mắc:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {impactModal.analysis.vuongMac.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setImpactModal(null)} className="btn btn-secondary btn-md">Đóng</button>
            </div>
          </div>
        </FormModal>
      )}

      {rejectingId && (
        <FormModal title={`Từ chối phiếu điều chỉnh #${rejectingId}`} description="Vui lòng nhập lý do từ chối đề nghị điều chỉnh kho (UC6.11)." onClose={() => setRejectingId(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setRejectError("");
              if (!rejectReasonInput.trim()) return setRejectError("Bắt buộc phải nhập lý do từ chối.");
              if (isRealApi) {
                const idNum = Number(rejectingId);
                if (Number.isNaN(idNum)) return setRejectError("ID phiếu không hợp lệ.");
                setActionLoadingId(rejectingId);
                try {
                  await inventoryApi.tuChoi(idNum, rejectReasonInput.trim());
                  await loadRealAdjustments();
                  setRejectingId(null);
                  setTabMessage({ type: "success", text: "Đã từ chối phiếu điều chỉnh kho." });
                } catch (err) {
                  setRejectError(err instanceof Error ? err.message : "Lỗi từ chối phiếu điều chỉnh.");
                } finally {
                  setActionLoadingId(null);
                }
                return;
              }
              const res = app.rejectStockAdjustment(rejectingId);
              if (!res.ok) return setRejectError(res.message);
              setRejectingId(null);
              setTabMessage({ type: "success", text: "Đã từ chối phiếu điều chỉnh!" });
            }}
            className="grid gap-4 mt-4"
          >
            <label className="adm-label">
              Lý do từ chối
              <textarea rows={3} value={rejectReasonInput} onChange={(e) => setRejectReasonInput(e.target.value)} placeholder="VD: Số liệu kiểm đếm chưa khớp biên bản..." className="adm-field" />
            </label>
            {rejectError && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{rejectError}</div>}
            <FormActions onClose={() => setRejectingId(null)} loading={actionLoadingId === rejectingId} submitLabel="Xác nhận từ chối" />
          </form>
        </FormModal>
      )}

      {showAuditModal && (
        <InventoryAuditModal
          app={app}
          onClose={() => setShowAuditModal(false)}
          onAuditSubmitted={(createdId) => {
            loadRealAdjustments();
            setTabMessage({ type: "success", text: `Đã lập phiếu kiểm kê #${createdId} và gửi duyệt thành công (UC6.10).` });
          }}
        />
      )}
    </div>
  );
}

// ─── Staff Accounts (UC1.7 - UC1.11) ──────────────────────────────────────────
