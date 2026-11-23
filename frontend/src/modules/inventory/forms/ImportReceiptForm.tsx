import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";

import { catalogApi } from "../../../services/api/catalogApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";

import { fmt, type ImportReceipt } from "../../../store";

import { FormModal, FormActions } from "./FormModal";

export function ImportReceiptForm({ app, receipt, onClose }: { app: ReturnType<typeof useApp>; receipt?: ImportReceipt; onClose: () => void }) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const initialSupplier = app.suppliers.find((item) => item.cooperationStatus === "active");
  const [form, setForm] = useState<ImportReceipt>(() =>
    receipt
      ? { ...receipt, expectedAt: receipt.expectedAt ? receipt.expectedAt.slice(0, 10) : "" }
      : {
          id: "",
          displayCode: `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-3)}`,
          supplierId: initialSupplier?.id ?? "",
          supplierName: initialSupplier?.name ?? "",
          supplierDocumentNumber: "",
          expectedAt: "",
          note: "",
          status: "Nháp",
          createdAt: new Date().toLocaleString("vi-VN"),
          createdBy: app.currentUser?.name ?? "Nhân viên kho",
          lines: [{ id: "", productId: app.products[0]?.id ?? "", quantity: 1, unitPrice: 0, equipmentCodes: [""], receivingCondition: "Mới", note: "" }],
        }
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // [PN-01] Trạng thái tự cứu dữ liệu sản phẩm khi app.products rỗng (race condition hydrateSession).
  const [productsLoading, setProductsLoading] = useState(false);
  // [PN-05] Giữ lại ID phiếu nháp đã tạo ở lần Lưu trước nếu có dòng lỗi; lần Lưu kế tiếp vào nhánh cập nhật tránh trùng phiếu mồ côi.
  const [createdDraftId, setCreatedDraftId] = useState<number | null>(null);
  const [createdLineIds, setCreatedLineIds] = useState<Record<number, number>>({});

  // [PN-01] Self-healing: khi modal mở mà app.products rỗng, cố nạp qua cả endpoint quản trị lẫn công khai,
  // rồi đồng bộ vào app.products qua app.refreshCatalog?.() nếu có.
  useEffect(() => {
    if (!isRealApi || app.products.length > 0 || productsLoading) return;
    let cancelled = false;
    setProductsLoading(true);
    (async () => {
      try {
        const [publicList, adminRes] = await Promise.all([
          catalogApi.layDanhSachSanPham({ soMoiTrang: 200 }).catch(() => []),
          catalogApi.adminLayDanhSachSanPham({ soMoiTrang: 200 }).catch(() => ({ total: 0, items: [] })),
        ]);
        const merged = adminRes.items.length > 0 ? adminRes.items : publicList;
        if (!cancelled && merged.length > 0) {
          // Nạp vào store dùng chung để các lần mở form tiếp theo không bị rỗng.
          await app.refreshCatalog?.();
          // Fallback: nếu refreshCatalog vẫn chưa kịp commit, ép gán productId cho dòng đầu bằng mảng vừa fetch.
          const firstId = String(merged[0].maSanPham);
          setForm((current) => ({
            ...current,
            lines: current.lines.map((line) => (!line.productId ? { ...line, productId: firstId } : line)),
          }));
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isRealApi, app.products.length]);

  // [PN-01] Khi danh sách sản phẩm vừa tải xong, tự gán productId cho các dòng đang rỗng.
  useEffect(() => {
    if (app.products.length === 0) return;
    setForm((current) => {
      const needPatch = current.lines.some((line) => !line.productId);
      if (!needPatch) return current;
      const firstId = app.products[0].id;
      return {
        ...current,
        lines: current.lines.map((line) => (!line.productId ? { ...line, productId: firstId } : line)),
      };
    });
  }, [app.products.length]);

  // [PN-05] Gợi ý đơn giá nhập từ phiếu gần nhất cho cùng sản phẩm, hoặc 60% giá bồi thường.
  const suggestUnitPrice = useMemo(() => {
    return (productId: string): number => {
      const product = app.products.find((p) => p.id === productId);
      // Ưu tiên tra giá nhập từ phiếu nhập gần nhất
      for (const r of [...app.importReceipts].reverse()) {
        const matched = r.lines.find((ln) => ln.productId === productId && Number(ln.unitPrice) > 0);
        if (matched) return Number(matched.unitPrice);
      }
      return product ? Math.round(Number(product.compensation ?? 0) * 0.6) : 0;
    };
  }, [app.products, app.importReceipts]);

  const updateLine = (index: number, patch: Partial<ImportReceipt["lines"][number]>) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) }));
  const setQuantity = (index: number, quantity: number) => {
    const line = form.lines[index];
    const codes = Array.from({ length: Math.max(0, quantity) }, (_, codeIndex) => line.equipmentCodes[codeIndex] ?? "");
    updateLine(index, { quantity, equipmentCodes: codes });
  };
  const total = form.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (isRealApi) {
      const supplierIdNum = Number(form.supplierId);
      if (!form.supplierId || Number.isNaN(supplierIdNum)) {
        return setError("Vui lòng chọn nhà cung cấp hợp lệ.");
      }
      if (form.lines.length === 0) {
        return setError("Phiếu nhập phải có ít nhất 1 dòng sản phẩm.");
      }
      for (const line of form.lines) {
        if (!line.productId || Number.isNaN(Number(line.productId))) {
          return setError("Mỗi dòng nhập phải chọn sản phẩm hợp lệ.");
        }
        if (Number(line.quantity) < 1 || Number(line.unitPrice) < 0) {
          return setError("Số lượng phải >= 1 và đơn giá nhập không được âm.");
        }
        // [PN-05] Đơn giá 0đ phải kèm ghi chú lý do (hàng tặng/bảo hành/KM) để tránh lỗi GIA_NHAP_KHONG_HOP_LE phía Backend.
        if (Number(line.unitPrice) === 0 && !line.note?.trim()) {
          return setError("Dòng sản phẩm có đơn giá nhập 0 đ bắt buộc phải ghi rõ lý do (hàng tặng/bảo hành/KM) ở ô Ghi chú dòng.");
        }
      }

      setLoading(true);
      try {
        const expectedIso = form.expectedAt ? new Date(`${form.expectedAt}T00:00:00Z`).toISOString() : undefined;
        // [PN-05] Nếu lần Lưu trước đã tạo phiếu nháp (createdDraftId), đi vào nhánh cập nhật để tránh tạo phiếu mồ côi.
        const existingReceiptId = receipt ? Number(receipt.id) : createdDraftId;
        if (existingReceiptId && !Number.isNaN(existingReceiptId)) {
          const receiptId = existingReceiptId;
          await importReceiptApi.capNhatPhieu(receiptId, {
            maNhaCungCap: supplierIdNum,
            ngayNhapDuKien: expectedIso,
            soChungTuNhaCungCap: form.supplierDocumentNumber?.trim() || undefined,
            ghiChu: form.note?.trim() || undefined,
          });
          // Đồng bộ các dòng chi tiết: xóa dòng bỏ, cập nhật dòng cũ, thêm dòng mới
          // [PN-05] Nếu đi vào nhánh "phiếu mồ côi tái sử dụng", receipt có thể là undefined — chỉ dùng receipt.lines khi tồn tại.
          const existingLineIds = receipt
            ? receipt.lines.map((l) => l.id ?? "").filter((id) => /^\d+$/.test(id))
            : Object.values(createdLineIds).map((n) => String(n));
          const oldIds = new Set(existingLineIds);
          const keptIds = new Set(form.lines.map((l) => l.id ?? "").filter((id) => /^\d+$/.test(id)));
          for (const oldId of oldIds) {
            if (!keptIds.has(oldId)) {
              await importReceiptApi.xoaDong(receiptId, Number(oldId));
            }
          }
          for (let i = 0; i < form.lines.length; i++) {
            const line = form.lines[i];
            const dongReq = {
              maSanPham: Number(line.productId),
              soLuong: Number(line.quantity),
              donGiaNhap: Number(line.unitPrice),
              tinhTrangKhiNhap: line.receivingCondition?.trim() || "Mới",
              ghiChu: line.note?.trim() || undefined,
            };
            const lineIdStr = line.id ?? "";
            if (/^\d+$/.test(lineIdStr)) {
              await importReceiptApi.suaDong(receiptId, Number(lineIdStr), dongReq);
            } else {
              const resp = await importReceiptApi.themDong(receiptId, dongReq);
              // [PN-05] Nắm bắt maChiTietPhieuNhap vừa tạo để lần retry kế tiếp không trùng.
              const newLineId = (resp?.chiTietPhieuNhaps ?? []).slice(-1)[0]?.maChiTietPhieuNhap;
              if (typeof newLineId === "number") {
                setCreatedLineIds((prev) => ({ ...prev, [i]: newLineId }));
                setForm((cur) => ({
                  ...cur,
                  lines: cur.lines.map((ln, idx) => (idx === i ? { ...ln, id: String(newLineId) } : ln)),
                }));
              }
            }
          }
        } else {
          const created = await importReceiptApi.taoPhieu({
            maNhaCungCap: supplierIdNum,
            ngayNhapDuKien: expectedIso,
            soChungTuNhaCungCap: form.supplierDocumentNumber?.trim() || undefined,
            ghiChu: form.note?.trim() || undefined,
          });
          // [PN-05] Ghi nhận ngay ID phiếu nháp để nếu bước themDong fail, lần Lưu lại tái sử dụng (nhánh update).
          setCreatedDraftId(created.maPhieuNhap);
          setForm((cur) => ({ ...cur, id: String(created.maPhieuNhap) }));
          for (let i = 0; i < form.lines.length; i++) {
            const line = form.lines[i];
            const resp = await importReceiptApi.themDong(created.maPhieuNhap, {
              maSanPham: Number(line.productId),
              soLuong: Number(line.quantity),
              donGiaNhap: Number(line.unitPrice),
              tinhTrangKhiNhap: line.receivingCondition?.trim() || "Mới",
              ghiChu: line.note?.trim() || undefined,
            });
            const newLineId = (resp?.chiTietPhieuNhaps ?? []).slice(-1)[0]?.maChiTietPhieuNhap;
            if (typeof newLineId === "number") {
              setCreatedLineIds((prev) => ({ ...prev, [i]: newLineId }));
              setForm((cur) => ({
                ...cur,
                lines: cur.lines.map((ln, idx) => (idx === i ? { ...ln, id: String(newLineId) } : ln)),
              }));
            }
          }
        }
        await app.refreshImportReceipts?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể lưu phiếu nhập lên máy chủ.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const supplier = app.suppliers.find((item) => item.id === form.supplierId);
    const normalized = { ...form, supplierName: supplier?.name ?? "", lines: form.lines.map((line) => ({ ...line, id: line.id || `LINE-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, equipmentCodes: line.equipmentCodes.map((code) => code.trim().toUpperCase()) })) };
    const result = app.saveImportReceipt(normalized);
    if (!result.ok) return setError(result.message);
    onClose();
  };

  return <FormModal title={receipt ? "Sửa phiếu nhập nháp" : "Tạo phiếu nhập nháp"} description="Lưu nháp không tăng kho. Chỉ khi xác nhận hợp lệ, hệ thống mới tạo thiết bị." onClose={onClose}>
    <form onSubmit={handleSubmit} className="grid gap-4 mt-5">
      <div className="responsive-two-column adm-grid-2">
        <label className="adm-label">Mã phiếu nhập<input value={isRealApi && !receipt ? "(Tự sinh khi lưu)" : (form.displayCode ?? form.id)} disabled={isRealApi} onChange={(e) => setForm({ ...form, displayCode: e.target.value })} className={`adm-field ${isRealApi ? "adm-field--readonly" : ""}`} /></label>
        <label className="adm-label">Nhà cung cấp<select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="adm-field"><option value="">Chọn nhà cung cấp</option>{app.suppliers.filter((item) => item.cooperationStatus === "active" || item.id === form.supplierId).map((item) => <option key={item.id} value={item.id}>{item.displayCode} · {item.name}</option>)}</select></label>
        <label className="adm-label">Số chứng từ NCC<input value={form.supplierDocumentNumber ?? ""} onChange={(e) => setForm({ ...form, supplierDocumentNumber: e.target.value })} className="adm-field" /></label>
        <label className="adm-label">Ngày nhập dự kiến<input type="date" value={form.expectedAt ?? ""} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} className="adm-field" /></label>
      </div>
      <label className="adm-label">Ghi chú phiếu<textarea rows={2} value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} className="adm-field" /></label>
      <div className="flex justify-between items-center flex-wrap gap-2"><strong className="adm-cell-title">Chi tiết nhập hàng</strong><div className="flex gap-2 flex-wrap">
        {/* [PN-05] Batch import: thêm nhanh 5/10/20 dòng; đơn giá gợi ý tự động (phiếu gần nhất hoặc ~60% compensation). */}
        {[5, 10, 20].map((n) => (
          <button
            key={`batch-${n}`}
            type="button"
            disabled={app.products.length === 0}
            onClick={() => {
              const firstId = app.products[0]?.id ?? "";
              const suggested = suggestUnitPrice(firstId);
              const extra = Array.from({ length: n }, () => ({
                id: "",
                productId: firstId,
                quantity: 1,
                unitPrice: suggested,
                equipmentCodes: [""],
                receivingCondition: "Mới",
                note: "",
              }));
              setForm((cur) => ({ ...cur, lines: [...cur.lines, ...extra] }));
            }}
            className="adm-btn-outline"
          >+ Thêm nhanh theo lô ({n})</button>
        ))}
        <button type="button" onClick={() => {
          const firstId = app.products[0]?.id ?? "";
          setForm({
            ...form,
            lines: [...form.lines, { id: "", productId: firstId, quantity: 1, unitPrice: suggestUnitPrice(firstId), equipmentCodes: [""], receivingCondition: "Mới", note: "" }],
          });
        }} className="adm-btn-outline">+ Thêm dòng</button>
      </div></div>
      {form.lines.map((line, index) => <div key={line.id || index} className="adm-import-line-box">
        <div className="responsive-two-column adm-grid-2-1-1">
          <label className="adm-label">Sản phẩm<select value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })} className="adm-field">
            {/* [PN-03] Luôn có <option value=""> để dropdown không rỗng, và hiển thị trạng thái đang tải khi app.products==0. */}
            {app.products.length === 0 ? (
              <option value="">{productsLoading ? "Đang tải danh sách sản phẩm..." : "-- Chọn sản phẩm --"}</option>
            ) : (
              <option value="">-- Chọn sản phẩm --</option>
            )}
            {app.products.map((item) => <option key={item.id} value={item.id}>{item.displayCode ?? item.id} · {item.name}</option>)}
          </select></label>
          <label className="adm-label">Số lượng<input type="number" min="1" value={line.quantity} onChange={(e) => setQuantity(index, Number(e.target.value))} className="adm-field" /></label>
          <label className="adm-label">Đơn giá nhập<input type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} className="adm-field" /></label>
        </div>
        {isRealApi ? (
          <div className="adm-hint-text mt-2.5">
            Mã định danh thiết bị sẽ được máy chủ tự động cấp phát cho {line.quantity} đơn vị khi xác nhận nhập kho.
          </div>
        ) : (
          <label className="adm-label mt-2.5">Mã thiết bị ({line.equipmentCodes.length}/{line.quantity})<div className="flex flex-wrap gap-2">{line.equipmentCodes.map((code, codeIndex) => <input key={codeIndex} value={code} onChange={(e) => updateLine(index, { equipmentCodes: line.equipmentCodes.map((item, itemIndex) => itemIndex === codeIndex ? e.target.value : item) })} placeholder={`Mã ${codeIndex + 1}`} className="adm-field adm-field--code" />)}</div></label>
        )}
        <div className="responsive-two-column adm-grid-1-2 mt-3"><label className="adm-label">Tình trạng khi nhập<input value={line.receivingCondition ?? ""} onChange={(e) => updateLine(index, { receivingCondition: e.target.value })} className="adm-field" /></label><label className="adm-label">Ghi chú dòng<input value={line.note ?? ""} onChange={(e) => updateLine(index, { note: e.target.value })} className="adm-field" /></label></div>
        <div className="flex justify-between items-center mt-3"><span className="adm-page-subtitle--sm">Thành tiền: <strong>{fmt(line.quantity * line.unitPrice)}</strong></span>{form.lines.length > 1 && <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })} className="adm-clear-filter-btn">Xóa dòng</button>}</div>
      </div>)}
      <div className="adm-import-total-box"><span>Tổng phiếu nhập</span><span>{fmt(total)}</span></div>
      {error && <div role="alert" className="adm-alert is-error-solid adm-alert--block mb-0">{error}</div>}
      <FormActions onClose={onClose} loading={loading} />
    </form>
  </FormModal>;
}

