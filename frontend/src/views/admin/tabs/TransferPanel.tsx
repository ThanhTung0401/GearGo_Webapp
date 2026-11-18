import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { equipmentApi } from "../../../services/api/equipmentApi";

import { fmt } from "../../../store";

export function TransferPanel({ app }: { app: ReturnType<typeof useApp> }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [equipId, setEquipId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [resultNote, setResultNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [impactPreview, setImpactPreview] = useState<Awaited<ReturnType<typeof equipmentApi.xemAnhHuongThayDoi>> | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const eq = app.equipment.find((e) => e.id === equipId);
  const currentProduct = eq ? app.products.find((p) => p.id === eq.productId) : null;
  const origProduct = eq ? app.products.find((p) => p.id === eq.originalProductId) : null;
  const targetProduct = app.products.find((p) => p.id === targetProductId);

  const canTransfer = Boolean(
    eq &&
      eq.equipmentStatus === "Sẵn sàng" &&
      targetProductId &&
      targetProductId !== eq.productId &&
      reason.trim().length > 0 &&
      (!isRealApi || !impactPreview || impactPreview.coTheApDungHienTai)
  );

  // Kiểm tra ảnh hưởng lịch đặt & xung đột trước khi chuyển loại thiết bị trên Real API
  useEffect(() => {
    if (!isRealApi || !eq || !targetProductId || targetProductId === eq.productId) {
      setImpactPreview(null);
      return;
    }
    const idNum = Number(eq.id);
    const targetNum = Number(targetProductId);
    if (Number.isNaN(idNum) || Number.isNaN(targetNum)) {
      setImpactPreview(null);
      return;
    }
    let active = true;
    setLoadingImpact(true);
    const isDowngrade = (targetProduct?.pricePerDay ?? 0) < (currentProduct?.pricePerDay ?? 0);
    equipmentApi
      .xemAnhHuongThayDoi(idNum, {
        loaiThayDoi: isDowngrade ? "GiangCapThietBi" : "DieuChuyenSanPham",
        maSanPhamDich: targetNum,
      })
      .then((res) => {
        if (active) setImpactPreview(res);
      })
      .catch(() => {
        if (active) setImpactPreview(null);
      })
      .finally(() => {
        if (active) setLoadingImpact(false);
      });
    return () => {
      active = false;
    };
  }, [isRealApi, eq?.id, targetProductId, targetProduct?.pricePerDay, currentProduct?.pricePerDay]);

  const handleTransfer = async () => {
    if (!canTransfer || !eq) return;
    setError("");

    if (isRealApi) {
      const idNum = Number(eq.id);
      const targetNum = Number(targetProductId);
      if (Number.isNaN(idNum) || Number.isNaN(targetNum)) {
        return setError("Mã thiết bị hoặc sản phẩm đích không hợp lệ.");
      }
      setSubmitting(true);
      try {
        const isDowngrade = (targetProduct?.pricePerDay ?? 0) < (currentProduct?.pricePerDay ?? 0);
        const res = (isDowngrade
          ? await equipmentApi.deNghiGiangCap(idNum, { maSanPhamDich: targetNum, lyDo: reason.trim() })
          : await equipmentApi.deNghiDieuChuyenSanPham(idNum, { maSanPhamDich: targetNum, lyDo: reason.trim() })) as Record<string, any>;
        const maPhieu = res?.maPhieuDieuChinh ?? res?.duLieu?.maPhieuDieuChinh;
        if (typeof maPhieu === "number") {
          await equipmentApi.duyetDeNghiVongDoi(maPhieu);
          setResultNote("Đề nghị đã được duyệt và áp dụng ngay lập tức.");
        } else {
          setResultNote("Đề nghị chuyển loại đã được ghi nhận vào hệ thống.");
        }
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể thực hiện chuyển loại thiết bị.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const result = app.transferEquipment(eq.id, targetProductId);
    if (!result.ok) return setError(result.message);
    setResultNote("Khả dụng của hai sản phẩm đã được cập nhật.");
    setError("");
    setDone(true);
  };

  return (
    <div className="adm-transfer-wrap">
      <h2 className="adm-page-title mb-2">Chuyển loại sản phẩm cho thuê của thiết bị</h2>
      <p className="adm-page-subtitle mb-5">
        Cho phép chuyển thiết bị đã cũ sang sản phẩm cho thuê rẻ hơn (VD: Tiêu chuẩn → Tiết kiệm). Lịch sử nhập kho gốc được giữ nguyên.
      </p>

      {done ? (
        <div className="adm-transfer-done">
          <div className="text-5xl mb-2">✅</div>
          <h3 className="adm-card-title text-[var(--color-forest)] mb-2">Đã chuyển thành công!</h3>
          <p className="text-[0.88rem] text-[#15803D] mb-1">Thiết bị <strong>{eq?.displayCode ?? equipId}</strong> nay thuộc <strong>{targetProduct?.name}</strong>.</p>
          <p className="text-[0.78rem] text-[#15803D]">{resultNote || "Khả dụng của hai sản phẩm đã được cập nhật."}</p>
          <button
            onClick={() => { setDone(false); setEquipId(""); setTargetProductId(""); setReason(""); setResultNote(""); setImpactPreview(null); }}
            className="adm-btn-primary mt-3.5 px-5 py-2.5"
          >
            Chuyển thiết bị khác
          </button>
        </div>
      ) : (
        <div className="adm-card adm-card--padded">
          <div className="flex flex-col gap-4">
            <div>
              <label className="adm-label--sub">1. Chọn mã thiết bị</label>
              <select value={equipId} onChange={(e) => { setEquipId(e.target.value); setDone(false); }} className="adm-field adm-field--compact">
                <option value="">-- Chọn thiết bị sẵn sàng --</option>
                {app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").map((e) => {
                  const pname = app.products.find((p) => p.id === e.productId)?.name || e.productId;
                  return <option key={e.id} value={e.id}>{e.displayCode ?? e.id} — {pname} — {e.condition}</option>;
                })}
              </select>
            </div>

            {eq && (
              <div className="adm-card--parchment text-[0.82rem]">
                <div className="flex justify-between mb-1">
                  <span className="adm-muted-note">Sản phẩm hiện tại</span>
                  <span className="font-semibold">{currentProduct?.name}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="adm-muted-note">Nguồn nhập ban đầu</span>
                  <span className="adm-cell-mono text-xs">{origProduct?.name} · {eq.importReceiptId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="adm-muted-note">Điều kiện</span>
                  <span>{eq.condition} · {eq.rentCount} lần thuê</span>
                </div>
              </div>
            )}

            <div>
              <label className="adm-label--sub">2. Chọn sản phẩm mới</label>
              <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)} className="adm-field adm-field--compact" disabled={!eq}>
                <option value="">-- Chọn sản phẩm đích --</option>
                {app.products.filter((p) => p.id !== eq?.productId && p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {fmt(p.pricePerDay)}/ngày</option>
                ))}
              </select>
            </div>

            {eq && targetProduct && targetProduct.pricePerDay > (currentProduct?.pricePerDay || 0) && (
              <div className="adm-alert is-error adm-alert--block mb-0 text-[0.8rem]">
                ⚠ Sản phẩm đích có giá cao hơn sản phẩm hiện tại. Thường chỉ chuyển từ tiêu chuẩn xuống tiết kiệm.
              </div>
            )}

            <div>
              <label className="adm-label--sub">3. Lý do chuyển loại</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="VD: Thiết bị đã qua 20+ lần thuê, độ mòn đáng kể, chuyển về sản phẩm Tiết kiệm"
                className="adm-field adm-field--compact adm-field--no-resize"
              />
            </div>

            {/* Impact preview */}
            {eq && targetProduct && (
              /* Đổi màu hộp phân tích ảnh hưởng nếu bị chặn lịch đặt */
              <div className={`adm-impact-box ${impactPreview && !impactPreview.coTheApDungHienTai ? "is-blocked" : ""}`}>
                <strong>Ảnh hưởng {loadingImpact ? "(Đang kiểm tra lịch đặt...)" : ""}:</strong>
                <div className="flex flex-col gap-1 mt-1">
                  <div>· Sản phẩm <strong>{currentProduct?.name}</strong>: khả dụng {app.getAvailable(eq.productId)} → {Math.max(0, app.getAvailable(eq.productId) - 1)} chiếc</div>
                  <div>· Sản phẩm <strong>{targetProduct.name}</strong>: khả dụng {app.getAvailable(targetProductId)} → {app.getAvailable(targetProductId) + 1} chiếc</div>
                  <div>· Lịch sử nhập kho ({eq.importReceiptId}) được giữ nguyên</div>
                  {impactPreview?.vuongMac?.map((vm, i) => (
                    <div key={`vm-${i}`} className="text-[#B91C1C] font-semibold">⚠ {vm}</div>
                  ))}
                  {impactPreview?.thieuSoLuongTheoLich?.map((ts, i) => (
                    <div key={`ts-${i}`} className="text-[#B45309]">• {ts}</div>
                  ))}
                </div>
              </div>
            )}

            {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
            <button
              disabled={!canTransfer || submitting}
              onClick={handleTransfer}
              className="btn btn-primary btn-md w-full font-bold disabled:bg-[#9CA3AF] disabled:border-[#9CA3AF]"
            >
              {submitting ? "Đang gửi yêu cầu..." : "✓ Xác nhận chuyển loại thiết bị"}
            </button>
            {!canTransfer && equipId && <p className="adm-muted-note">Thiếu sản phẩm đích, lý do, hoặc đang có vướng mắc lịch đặt. Chỉ chuyển được thiết bị đang Sẵn sàng.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Tab (UC7.8: Bộ lọc NCC, Trạng thái & Khoảng ngày) ───────────
