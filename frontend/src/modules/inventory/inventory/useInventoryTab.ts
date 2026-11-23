import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { inventoryApi } from "../../../services/api/inventoryApi";
import { importReceiptApi } from "../../../services/api/importReceiptApi";
import { type ImportReceipt } from "../../../store";

export interface ServerReceiptAdjustment {
  id: string;
  rawStatus: string;
  type: string;
  status: "Chờ duyệt" | "Đã duyệt" | "Từ chối";
  previousValue: string;
  newValue: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  evidence?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

/**
 * Tính tổng tiền thanh toán của phiếu nhập:
 * Nếu đã kiểm nhận, chỉ tính tiền cho hàng được chấp nhận (đạt + lỗi nhận sửa).
 */
export function calculateReceiptTotal(receipt: ImportReceipt): number {
  return receipt.lines.reduce((sum, line) => {
    const billedQty =
      line.acceptedQty !== undefined || line.damagedQty !== undefined
        ? (line.acceptedQty ?? 0) + (line.damagedQty ?? 0)
        : line.quantity;
    return sum + billedQty * line.unitPrice;
  }, 0);
}

/**
 * Hook quản lý danh sách phiếu nhập hàng (UC7.6 - UC7.10), bộ lọc đa chiều
 * và xử lý duyệt/từ chối sai lệch phiếu nhập sau chốt kho.
 */
export function useInventoryTab(app: ReturnType<typeof useApp>) {
  const isRealApi = app.realApi || isRealApiEnabled();
  const [selectedId, setSelectedId] = useState<string | null>(app.importReceipts[0]?.id ?? null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<ImportReceipt | "new" | null>(null);
  const [inspectingReceipt, setInspectingReceipt] = useState<ImportReceipt | null>(null);
  const [adjustingReceipt, setAdjustingReceipt] = useState<ImportReceipt | null>(null);
  const [cancellingReceipt, setCancellingReceipt] = useState<ImportReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Điều chỉnh phiếu nhập (UC7.10) từ API Backend
  const [serverAdjustments, setServerAdjustments] = useState<ServerReceiptAdjustment[]>([]);
  const [rejectingAdj, setRejectingAdj] = useState<{ receiptId: string; adjId: string } | null>(null);
  const [rejectAdjReason, setRejectAdjReason] = useState("");
  const [adjLoadingId, setAdjLoadingId] = useState<string | null>(null);

  // State UC7.8: Lọc Nhà cung cấp, Trạng thái, Khoảng ngày
  const [supplierFilter, setSupplierFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const supplierOptions = ["Tất cả", ...Array.from(new Set(app.suppliers.map((s) => s.name)))];
  const statusOptions = ["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"];

  const filteredReceipts = app.importReceipts
    .slice()
    .reverse()
    .filter((receipt) => {
      const matchSupplier = supplierFilter === "Tất cả" || receipt.supplierName === supplierFilter;
      const matchStatus = statusFilter === "Tất cả" || receipt.status === statusFilter;
      const matchSearch =
        (receipt.displayCode ?? receipt.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

      // Chuẩn hóa phần ngày YYYY-MM-DD để tránh so sánh sai giữa ISO "T" và dấu cách
      let matchDate = true;
      const createdDateOnly = (receipt.createdAt || "").slice(0, 10);
      if (fromDate && createdDateOnly && createdDateOnly < fromDate) matchDate = false;
      if (toDate && createdDateOnly && createdDateOnly > toDate) matchDate = false;

      return matchSupplier && matchStatus && matchSearch && matchDate;
    });

  // Tự động chọn phiếu đầu tiên sau khi dữ liệu async tải xong
  useEffect(() => {
    if (!selectedId && app.importReceipts.length > 0) {
      setSelectedId(app.importReceipts[app.importReceipts.length - 1].id);
    }
  }, [selectedId, app.importReceipts]);

  const selected = app.importReceipts.find((receipt) => receipt.id === selectedId);

  // Tải lịch sử đề nghị điều chỉnh phiếu nhập sau chốt từ backend (UC7.10)
  const loadServerReceiptAdjustments = async (receiptIdStr?: string) => {
    if (!isRealApi || !receiptIdStr) {
      setServerAdjustments([]);
      return;
    }
    const receiptIdNum = Number(receiptIdStr);
    if (Number.isNaN(receiptIdNum)) {
      setServerAdjustments([]);
      return;
    }
    try {
      // [PN-11] Truyền maPhieuNhapLienQuan trực tiếp để BE lọc server-side, tránh miss
      // do BE clamp soMoiTrang tối đa 100.
      const res = await inventoryApi.timPhieu({ trang: 1, soMoiTrang: 100, maPhieuNhapLienQuan: receiptIdNum });
      const matching = (res.items ?? []).filter((dc) => dc.maPhieuNhapLienQuan === receiptIdNum);
      setServerAdjustments(
        matching.map((dc) => {
          const st: "Chờ duyệt" | "Đã duyệt" | "Từ chối" =
            dc.trangThai === "DaApDung" || dc.trangThai === "DaDuyet" ? "Đã duyệt" : dc.trangThai === "TuChoi" ? "Từ chối" : "Chờ duyệt";
          const firstLine = dc.chiTiet?.[0];
          return {
            id: String(dc.maPhieuDieuChinh),
            rawStatus: dc.trangThai,
            type: dc.loaiDieuChinh ?? "Điều chỉnh nhập",
            status: st,
            previousValue: firstLine?.giaTriTruoc ?? "—",
            newValue: firstLine?.giaTriSau ?? "—",
            reason: dc.lyDo ?? "",
            createdBy: dc.tenNguoiLapLucLap ?? `NV#${dc.maNguoiLap}`,
            createdAt: dc.thoiDiemLap ? new Date(dc.thoiDiemLap).toLocaleString("vi-VN") : "",
            evidence: dc.bangChung?.join(", "),
            reviewedBy: dc.tenNguoiDuyetLucDuyet,
            reviewedAt: dc.thoiDiemDuyet ? new Date(dc.thoiDiemDuyet).toLocaleString("vi-VN") : undefined,
          };
        })
      );
    } catch {
      setServerAdjustments([]);
    }
  };

  useEffect(() => {
    if (selected && selected.status === "Đã nhập kho") {
      void loadServerReceiptAdjustments(selected.id);
    } else {
      setServerAdjustments([]);
    }
  }, [isRealApi, selected?.id, selected?.status]);

  // Duyệt và áp dụng đề nghị điều chỉnh phiếu nhập sau chốt (UC7.10)
  const handleApproveAdjustment = async (receiptId: string, adj: { id: string; rawStatus?: string }) => {
    if (isRealApi) {
      const adjIdNum = Number(adj.id);
      if (Number.isNaN(adjIdNum)) return setMessage({ type: "error", text: "ID đề nghị không hợp lệ." });
      setAdjLoadingId(adj.id);
      try {
        if (adj.rawStatus === "Nhap") {
          await inventoryApi.guiDuyet(adjIdNum);
        }
        await inventoryApi.duyetVaApDung(adjIdNum);
        await Promise.all([
          app.refreshImportReceipts?.(),
          app.refreshEquipment?.(),
          loadServerReceiptAdjustments(receiptId),
        ]);
        setMessage({ type: "success", text: "Đã duyệt và áp dụng điều chỉnh phiếu nhập thành công (UC7.10)!" });
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi duyệt điều chỉnh phiếu nhập." });
      } finally {
        setAdjLoadingId(null);
      }
      return;
    }
    const res = app.approveImportAdjustment(receiptId, adj.id, "Quản trị viên");
    setMessage(
      res.ok
        ? { type: "success", text: "Đã duyệt và áp dụng điều chỉnh phiếu nhập thành công (UC7.10)!" }
        : { type: "error", text: res.message }
    );
  };

  // Xử lý hủy phiếu nhập nháp kèm lý do bắt buộc (UC7.9)
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingReceipt) return;
    if (!cancelReason.trim()) {
      return setCancelError("Vui lòng nhập lý do hủy phiếu nhập.");
    }
    if (isRealApi) {
      const idNum = Number(cancellingReceipt.id);
      if (Number.isNaN(idNum)) return setCancelError("ID phiếu nhập không hợp lệ.");
      setCancelLoading(true);
      try {
        await importReceiptApi.huyPhieu(idNum, cancelReason.trim());
        await app.refreshImportReceipts?.();
        setCancellingReceipt(null);
        setMessage({ type: "success", text: "Đã hủy phiếu nháp thành công. Kho không thay đổi." });
      } catch (err) {
        setCancelError(err instanceof Error ? err.message : "Không thể hủy phiếu nhập trên máy chủ.");
      } finally {
        setCancelLoading(false);
      }
      return;
    }
    const result = app.cancelImportReceipt(cancellingReceipt.id, cancelReason.trim());
    if (!result.ok) return setCancelError(result.message);
    setCancellingReceipt(null);
    setMessage({ type: "success", text: "Đã hủy phiếu nháp thành công. Kho không thay đổi." });
  };

  // Xử lý từ chối đề nghị điều chỉnh phiếu nhập sau chốt (UC7.10)
  const handleRejectAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAdj) return;
    const lyDo = rejectAdjReason.trim() || "Không đủ căn cứ chứng từ";
    if (isRealApi) {
      const adjIdNum = Number(rejectingAdj.adjId);
      if (Number.isNaN(adjIdNum)) return;
      setAdjLoadingId(rejectingAdj.adjId);
      try {
        await inventoryApi.tuChoi(adjIdNum, lyDo);
        await Promise.all([
          app.refreshImportReceipts?.(),
          loadServerReceiptAdjustments(rejectingAdj.receiptId),
        ]);
        setRejectingAdj(null);
        setMessage({ type: "success", text: "Đã từ chối đề nghị điều chỉnh phiếu nhập." });
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Lỗi từ chối đề nghị điều chỉnh." });
      } finally {
        setAdjLoadingId(null);
      }
      return;
    }
    const res = app.rejectImportAdjustment(rejectingAdj.receiptId, rejectingAdj.adjId, lyDo);
    setMessage(res.ok ? { type: "success", text: "Đã từ chối đề nghị điều chỉnh." } : { type: "error", text: res.message });
    setRejectingAdj(null);
  };

  const clearFilters = () => {
    setSupplierFilter("Tất cả");
    setStatusFilter("Tất cả");
    setFromDate("");
    setToDate("");
    setSearchQuery("");
  };

  return {
    isRealApi,
    selectedId,
    setSelectedId,
    message,
    setMessage,
    editing,
    setEditing,
    inspectingReceipt,
    setInspectingReceipt,
    adjustingReceipt,
    setAdjustingReceipt,
    cancellingReceipt,
    setCancellingReceipt,
    cancelReason,
    setCancelReason,
    cancelError,
    setCancelError,
    cancelLoading,
    serverAdjustments,
    rejectingAdj,
    setRejectingAdj,
    rejectAdjReason,
    setRejectAdjReason,
    adjLoadingId,
    supplierFilter,
    setSupplierFilter,
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    searchQuery,
    setSearchQuery,
    supplierOptions,
    statusOptions,
    filteredReceipts,
    selected,
    loadServerReceiptAdjustments,
    handleApproveAdjustment,
    handleCancelSubmit,
    handleRejectAdjSubmit,
    clearFilters,
  };
}
