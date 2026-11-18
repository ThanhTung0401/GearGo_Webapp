import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi, type ThietBiBackend, type PhanCongLichThietBiBackend } from "../../../services/api";

import { fmt, MaintenanceReceipt, Equipment, ImportReceipt, Supplier } from "../../../store";

import EquipmentLifecycleModal from "../../../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../../../components/InventoryAuditModal";

import { EquipmentTabModals } from "./EquipmentTabModals";
export function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [subTab, setSubTab] = useState<"inventory" | "maintenance" | "import">("inventory");
  const [filter, setFilter] = useState("Tất cả");
  const [productFilter, setProductFilter] = useState("Tất cả");
  const [transferModal, setTransferModal] = useState<Equipment | null>(null);
  const [targetProductId, setTargetProductId] = useState("");
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // State UC7.3 & UC7.7: Nhập hàng & Kiểm nhận cho nhân viên kho
  const [inspectingImportReceipt, setInspectingImportReceipt] = useState<ImportReceipt | null>(null);
  const [viewingSupplierProfile, setViewingSupplierProfile] = useState<Supplier | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [importStatusFilter, setImportStatusFilter] = useState("Tất cả");

  // State UC6.12: Tạo phiếu bảo trì
  const [showCreateMaintenanceModal, setShowCreateMaintenanceModal] = useState(false);
  const [createMaintEquipId, setCreateMaintEquipId] = useState("");
  const [createMaintIssue, setCreateMaintIssue] = useState("");
  const [createMaintCost, setCreateMaintCost] = useState(150000);
  const [createMaintOrderId, setCreateMaintOrderId] = useState("");
  const [createMaintNote, setCreateMaintNote] = useState("");

  // State UC6.13: Nghiệm thu bảo trì
  const [acceptingMaintenance, setAcceptingMaintenance] = useState<MaintenanceReceipt | null>(null);
  const [actualRepairCost, setActualRepairCost] = useState(0);
  const [repairOutcome, setRepairOutcome] = useState<"Hoàn tất" | "Không thể sửa">("Hoàn tất");
  const [repairOutcomeNote, setRepairOutcomeNote] = useState("");
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equipSuccess, setEquipSuccess] = useState<string | null>(null);

  // State UC6.9: Xem chi tiết & lịch bận thiết bị
  const [viewingEquipDetail, setViewingEquipDetail] = useState<{
    equip: Equipment;
    detail?: ThietBiBackend;
    schedule: PhanCongLichThietBiBackend[];
    loading: boolean;
  } | null>(null);

  // State UC6.12: Phân công xử lý & cập nhật tiến độ bảo trì
  const [assignMaintTarget, setAssignMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [assignHandlerId, setAssignHandlerId] = useState<number>(1);
  const [assignReason, setAssignReason] = useState("");
  const [progressMaintTarget, setProgressMaintTarget] = useState<MaintenanceReceipt | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [progressCost, setProgressCost] = useState<number>(0);

  const handleOpenEquipSchedule = async (e: Equipment) => {
    setViewingEquipDetail({ equip: e, schedule: [], loading: true });
    if (!(app.realApi || isRealApiEnabled())) {
      setViewingEquipDetail({ equip: e, schedule: [], loading: false });
      return;
    }
    try {
      const equipIdNum = Number(e.id) || parseInt(e.id.replace(/\D/g, ""), 10);
      const [detail, schedule] = await Promise.all([
        equipmentApi.layChiTietThietBi(equipIdNum),
        equipmentApi.layLichThietBi(equipIdNum),
      ]);
      setViewingEquipDetail({ equip: e, detail, schedule, loading: false });
    } catch (err) {
      setEquipError(err instanceof Error ? err.message : "Không tải được chi tiết và lịch bận thiết bị.");
      setViewingEquipDetail(null);
    }
  };

  const products = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];
  const statuses = ["Tất cả", "Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"];

  const filtered = app.equipment.filter((e) => {
    const matchStatus = filter === "Tất cả" || e.equipmentStatus === filter;
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    const matchProduct = productFilter === "Tất cả" || pname === productFilter;
    return matchStatus && matchProduct;
  });

  const statusStyle: Record<string, { bg: string; text: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
  };

  const handleTransfer = async () => {
    if (!transferModal || !targetProductId) return;
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const targetProduct = app.products.find((p) => p.id === targetProductId);
        const equipIdNum = Number(transferModal.id) || parseInt(transferModal.id.replace(/\D/g, ""), 10);
        const targetSpIdNum = Number(targetProduct?.id ?? targetProductId) || parseInt(targetProductId.replace(/\D/g, ""), 10);
        if (!equipIdNum || !targetSpIdNum) {
          throw new Error("Không xác định được mã thiết bị hoặc sản phẩm đích hợp lệ.");
        }
        const checkImpact = await equipmentApi.xemAnhHuongThayDoi(equipIdNum, {
          loaiThayDoi: "GiangCap",
          maSanPhamDich: targetSpIdNum,
        });
        if (!checkImpact.coTheApDungHienTai) {
          setEquipError(`Cảnh báo cam kết: Không thể điều chuyển do vướng đơn thuê: ${checkImpact.vuongMac.join("; ")}`);
          return;
        }
        await equipmentApi.deNghiDieuChuyenSanPham(equipIdNum, {
          maSanPhamDich: targetSpIdNum,
          lyDo: "Giáng cấp / điều chuyển thiết bị sang phân khúc sản phẩm đích",
        });
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
        setTransferModal(null);
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi gửi đề nghị điều chuyển thiết bị.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    const res = app.transferEquipment(transferModal.id, targetProductId);
    if (res.ok) {
      setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
      setTransferModal(null);
    } else {
      setEquipError(res.message);
    }
  };

  return (
    <div>
      {equipError && (
        <div className="so-alert-error">
          {equipError}
        </div>
      )}
      {equipSuccess && (
        <div className="so-alert-success">
          {equipSuccess}
        </div>
      )}
      {/* Sub tabs: Kho / Phiếu bảo trì / Nhập hàng */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-2 flex-wrap">
        <button onClick={() => setSubTab("inventory")}
          className={`so-tab-btn ${subTab === "inventory" ? "is-active" : ""}`}>
          📦 Danh sách kho ({app.equipment.length} thiết bị)
        </button>
        <button onClick={() => setSubTab("maintenance")}
          className={`so-tab-btn ${subTab === "maintenance" ? "is-active" : ""}`}>
          🛠 Phiếu bảo trì & sửa chữa ({app.maintenanceReceipts.length} phiếu)
        </button>
        <button onClick={() => setSubTab("import")}
          className={`so-tab-btn ${subTab === "import" ? "is-active" : ""}`}>
          🚚 Nhập hàng & Kiểm nhận ({app.importReceipts.length} phiếu)
        </button>
      </div>

      {subTab === "inventory" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc theo trạng thái thiết bị"
              className="so-select"
            >
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Lọc theo sản phẩm"
              className="so-select"
            >
              {products.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2 flex-wrap">
              {["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc"].map((s) => {
                const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
                const style = statusStyle[s];
                /* Màu chip đếm thiết bị lấy động theo bản đồ statusStyle */
                return <div key={s} className="so-status-chip" style={{ background: style.bg, color: style.text }}>{s}: {cnt}</div>;
              })}
            </div>
            <button onClick={() => setShowAuditModal(true)}
              className="so-btn-amber-auto">
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
                  const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
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
                        {/* Màu trạng thái thiết bị lấy động từ statusStyle */}
                        <span className="so-status-pill-md" style={{ background: st.bg, color: st.text }}>{e.equipmentStatus}</span>
                      </td>
                      <td className="so-td-mono-center">{e.rentCount}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingLifecycle(e)}
                            className="so-btn-outline-forest">
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
                            <button onClick={() => { setTransferModal(e); setTargetProductId(""); }}
                              className="so-btn-outline-sm">
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
                <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}
                  className="so-input-mb14">
                  <option value="">-- Chọn sản phẩm đích --</option>
                  {app.products.filter((p) => p.id !== transferModal.productId && p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({fmt(p.pricePerDay)}/ngày)</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setTransferModal(null)} className="so-btn-cancel">Hủy</button>
                  <button disabled={!targetProductId} onClick={handleTransfer} className={`so-btn-confirm ${targetProductId ? "is-ready" : ""}`}>Xác nhận chuyển</button>
                </div>
              </div>
            </div>
          )}

          {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
          {showAuditModal && <InventoryAuditModal app={app} onClose={() => setShowAuditModal(false)} />}
        </div>
      )}

      {subTab === "maintenance" && (
        /* Tab Phiếu bảo trì (UC6.12 & UC6.13) */
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
            <button
              type="button"
              onClick={() => {
                const firstAvailable = app.equipment.find((e) => e.equipmentStatus !== "Ngừng sử dụng")?.id || "";
                setCreateMaintEquipId(firstAvailable);
                setShowCreateMaintenanceModal(true);
              }}
              className="so-btn-primary"
            >
              + Tạo phiếu bảo trì (UC6.12)
            </button>
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
                {app.maintenanceReceipts.map((m) => {
                  const matchedEquip = app.equipment.find(
                    (eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId
                  );
                  const equipDisplay = matchedEquip?.displayCode || m.equipmentId;
                  /* Ánh xạ trạng thái phiếu bảo trì sang modifier CSS hữu hạn */
                  const maintStatusMod =
                    m.status === "Hoàn tất"
                      ? "is-done"
                      : m.status === "Đang bảo dưỡng"
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
                    <td className="so-td-muted-sm">{m.createdAt}</td>
                    <td className="so-td-cost">{fmt(m.estimatedCost)}</td>
                    <td className={`so-td-actual-cost ${m.actualCost ? "has-cost" : ""}`}>
                      {m.actualCost !== undefined ? fmt(m.actualCost) : "—"}
                    </td>
                    <td>
                      <span className={`so-status-badge ${maintStatusMod}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      {m.status !== "Hoàn tất" && m.status !== "Không thể sửa" ? (
                        <div className="flex gap-1 flex-wrap">
                          {(app.realApi || isRealApiEnabled()) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignMaintTarget(m);
                                  setAssignHandlerId(1);
                                  setAssignReason("");
                                }}
                                className="so-btn-info-pad"
                              >
                                Phân công
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProgressMaintTarget(m);
                                  setProgressNote(m.note || "");
                                  setProgressCost(m.actualCost ?? m.estimatedCost);
                                }}
                                className="so-btn-amber-pill"
                              >
                                Tiến độ
                              </button>
                              <button
                                type="button"
                                disabled={equipBusy}
                                onClick={async () => {
                                  setEquipError(null);
                                  setEquipSuccess(null);
                                  setEquipBusy(true);
                                  try {
                                    const maintIdNum = Number(m.id) || parseInt(m.id.replace(/\D/g, ""), 10);
                                    await equipmentApi.guiKiemTra(maintIdNum);
                                    await app.refreshEquipment?.();
                                    setEquipSuccess(`Đã gửi kiểm tra phiếu bảo trì ${m.id}.`);
                                  } catch (err) {
                                    setEquipError(err instanceof Error ? err.message : "Không thể gửi kiểm tra.");
                                  } finally {
                                    setEquipBusy(false);
                                  }
                                }}
                                className="so-btn-purple-sm"
                              >
                                Gửi KT
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAcceptingMaintenance(m);
                              setActualRepairCost(m.actualCost ?? m.estimatedCost);
                              setRepairOutcome("Hoàn tất");
                              setRepairOutcomeNote(m.note || "Đã kiểm tra kỹ thuật và vệ sinh đạt chuẩn.");
                            }}
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Nhập Hàng & Kiểm Nhận (UC7.3 - UC7.8) */}
      {subTab === "import" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="so-section-title">
                Quản lý nhập hàng & Kiểm nhận thực tế tại kho (UC7.3 - UC7.8)
              </h3>
              <p className="so-section-sub">
                Khi xe hàng tới kho, nhân viên kho mở biên bản kiểm nhận thực tế để đếm số lượng, phân loại đạt/lỗi/từ chối và chốt mã serial.
              </p>
            </div>
          </div>

          {/* Bộ lọc tìm kiếm cho nhân viên kho */}
          <div className="flex gap-3 mb-4 flex-wrap items-center so-filter-bar">
            <input
              type="text"
              placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              className="so-filter-input"
            />
            <select
              value={importStatusFilter}
              onChange={(e) => setImportStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái phiếu"
              className="so-select-sm"
            >
              {["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"].map((s) => (
                <option key={s} value={s}>{s === "Tất cả" ? "Tất cả trạng thái" : s}</option>
              ))}
            </select>
            {(importSearch || importStatusFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={() => { setImportSearch(""); setImportStatusFilter("Tất cả"); }}
                className="so-btn-clear"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>

          <div className="responsive-table so-table-card">
            <table className="so-table so-zebra-table so-table-audit">
              <thead>
                <tr>
                  {["Mã phiếu", "Nhà cung cấp", "Ngày lập / Người lập", "Số lượng mặt hàng", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.importReceipts
                  .slice()
                  .reverse()
                  .filter((r) => {
                    const matchStatus = importStatusFilter === "Tất cả" || r.status === importStatusFilter;
                    const q = importSearch.toLowerCase().trim();
                    const matchQ = !q ||
                      (r.displayCode ?? r.id).toLowerCase().includes(q) ||
                      r.supplierName.toLowerCase().includes(q) ||
                      r.createdBy.toLowerCase().includes(q);
                    return matchStatus && matchQ;
                  })
                  .map((r) => {
                    const totalQty = r.lines.reduce((s, l) => s + l.quantity, 0);
                    const supplier = app.suppliers.find((s) => s.id === r.supplierId || s.displayCode === r.supplierId);
                    /* Ánh xạ trạng thái phiếu nhập sang modifier CSS hữu hạn */
                    const importStatusMod =
                      r.status === "Đã nhập kho"
                        ? "is-done"
                        : r.status === "Đã hủy"
                        ? "is-cancelled"
                        : "is-progress";
                    return (
                      <tr key={r.id}>
                        <td className="so-td-mono-lg">
                          {r.displayCode ?? r.id}
                        </td>
                        <td>
                          <div className="so-supplier-name">{r.supplierName}</div>
                          {supplier && (
                            <button
                              type="button"
                              onClick={() => setViewingSupplierProfile(supplier)}
                              className="so-link-btn-sm"
                            >
                              👁 Xem hồ sơ NCC (UC7.3)
                            </button>
                          )}
                        </td>
                        <td className="so-td-muted-sm">
                          <div>{r.createdAt}</div>
                          <div className="so-import-by">Bởi {r.createdBy}</div>
                        </td>
                        <td>
                          <strong>{r.lines.length}</strong> dòng · <strong>{totalQty}</strong> thiết bị
                        </td>
                        <td>
                          <span className={`so-status-badge is-wide ${importStatusMod}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.status === "Nháp" ? (
                            <button
                              type="button"
                              onClick={() => setInspectingImportReceipt(r)}
                              className="so-btn-receive"
                            >
                              📦 Kiểm nhận thực tế (UC7.7) →
                            </button>
                          ) : (
                            <span className="so-import-done">
                              {r.status === "Đã nhập kho" ? `✓ Đã nhập kho lúc ${r.confirmedAt}` : "Phiếu đã hủy"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EquipmentTabModals
        app={app}
        showCreateMaintenanceModal={showCreateMaintenanceModal}
        setShowCreateMaintenanceModal={setShowCreateMaintenanceModal}
        createMaintEquipId={createMaintEquipId}
        setCreateMaintEquipId={setCreateMaintEquipId}
        createMaintIssue={createMaintIssue}
        setCreateMaintIssue={setCreateMaintIssue}
        createMaintCost={createMaintCost}
        setCreateMaintCost={setCreateMaintCost}
        createMaintOrderId={createMaintOrderId}
        setCreateMaintOrderId={setCreateMaintOrderId}
        createMaintNote={createMaintNote}
        setCreateMaintNote={setCreateMaintNote}
        acceptingMaintenance={acceptingMaintenance}
        setAcceptingMaintenance={setAcceptingMaintenance}
        repairOutcome={repairOutcome}
        setRepairOutcome={setRepairOutcome}
        actualRepairCost={actualRepairCost}
        setActualRepairCost={setActualRepairCost}
        repairOutcomeNote={repairOutcomeNote}
        setRepairOutcomeNote={setRepairOutcomeNote}
        equipBusy={equipBusy}
        setEquipBusy={setEquipBusy}
        setEquipError={setEquipError}
        setEquipSuccess={setEquipSuccess}
        transferModal={transferModal}
        setTransferModal={setTransferModal}
        targetProductId={targetProductId}
        setTargetProductId={setTargetProductId}
        viewingLifecycle={viewingLifecycle}
        setViewingLifecycle={setViewingLifecycle}
        showAuditModal={showAuditModal}
        setShowAuditModal={setShowAuditModal}
        inspectingImportReceipt={inspectingImportReceipt}
        setInspectingImportReceipt={setInspectingImportReceipt}
        viewingSupplierProfile={viewingSupplierProfile}
        setViewingSupplierProfile={setViewingSupplierProfile}
        viewingEquipDetail={viewingEquipDetail}
        setViewingEquipDetail={setViewingEquipDetail}
        assignMaintTarget={assignMaintTarget}
        setAssignMaintTarget={setAssignMaintTarget}
        assignHandlerId={assignHandlerId}
        setAssignHandlerId={setAssignHandlerId}
        assignReason={assignReason}
        setAssignReason={setAssignReason}
        progressMaintTarget={progressMaintTarget}
        setProgressMaintTarget={setProgressMaintTarget}
        progressCost={progressCost}
        setProgressCost={setProgressCost}
        progressNote={progressNote}
        setProgressNote={setProgressNote}
      />
    </div>
  );
}

// ─── Báo cáo ca trực & Nhật ký thao tác nhân viên (UC10.1 & UC10.4 cho Nhân viên) ────
