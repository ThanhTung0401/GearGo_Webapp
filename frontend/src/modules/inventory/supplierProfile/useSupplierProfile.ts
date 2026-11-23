import React, { useEffect, useMemo, useState } from "react";
import type { useApp } from "../../../App";
import { supplierApi, type LichSuNhapBackend } from "../../../services/api";
import type { Supplier } from "../../../store";

export interface ImportedProductSummary {
  productId: string;
  name: string;
  totalQty: number;
  lastUnitPrice: number;
  lastDate: string;
}

/**
 * Custom hook trung gian cho Hồ sơ nhà cung cấp (UC7.3 & UC7.4):
 * Quản lý fetch lịch sử nhập từ Backend, tổng hợp thống kê và đổi trạng thái hợp tác.
 */
export function useSupplierProfile(supplier: Supplier, app: ReturnType<typeof useApp>) {
  const [activeTab, setActiveTab] = useState<"products" | "receipts">("products");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<"active" | "inactive">(
    supplier.cooperationStatus === "active" ? "inactive" : "active"
  );
  const [statusReason, setStatusReason] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [historyBackend, setHistoryBackend] = useState<LichSuNhapBackend | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!app.realApi) return;
    const nccId = Number(supplier.id);
    if (!Number.isFinite(nccId)) return;

    let cancelled = false;
    setLoadingHistory(true);
    void supplierApi
      .layLichSuNhap(nccId, { trang: 1, soMoiTrang: 50 })
      .then((res) => {
        if (!cancelled) setHistoryBackend(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app.realApi, supplier.id]);

  const supplierReceipts = useMemo(
    () =>
      app.importReceipts.filter(
        (r) => r.supplierId === supplier.id || r.supplierId === supplier.displayCode
      ),
    [app.importReceipts, supplier.id, supplier.displayCode]
  );

  const confirmedReceipts = useMemo(
    () => supplierReceipts.filter((r) => r.status === "Đã nhập kho"),
    [supplierReceipts]
  );

  const totalImportValue = useMemo(() => {
    if (app.realApi && historyBackend) return Number(historyBackend.tongGiaTriNhap ?? 0);
    return confirmedReceipts.reduce(
      (sum, r) => sum + r.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0),
      0
    );
  }, [app.realApi, historyBackend, confirmedReceipts]);

  const totalEquipmentAccepted = useMemo(() => {
    if (app.realApi && historyBackend) return Number(historyBackend.tongSoLuongThietBi ?? 0);
    return confirmedReceipts.reduce(
      (sum, r) =>
        sum + r.lines.reduce((ls, l) => ls + (l.acceptedQty !== undefined ? l.acceptedQty : l.quantity), 0),
      0
    );
  }, [app.realApi, historyBackend, confirmedReceipts]);

  // Tổng hợp sản phẩm từng nhập từ NCC (ưu tiên dữ liệu thật từ Backend khi bật realApi)
  const importedProducts = useMemo<ImportedProductSummary[]>(() => {
    const map = new Map<string, ImportedProductSummary>();

    if (app.realApi && historyBackend) {
      (historyBackend.phieuNhaps?.items ?? []).forEach((pn) => {
        pn.chiTietSanPham.forEach((ct) => {
          const key = String(ct.maSanPham);
          const existing = map.get(key);
          const dateStr = pn.ngayXacNhan || pn.ngayNhapThucTe || pn.ngayLap;
          if (existing) {
            existing.totalQty += Number(ct.soLuong ?? 0);
            // Chỉ cập nhật đơn giá & ngày gần nhất nếu phiếu hiện tại mới hơn (backend trả DESC)
            if (dateStr && (!existing.lastDate || dateStr > existing.lastDate)) {
              existing.lastUnitPrice = Number(ct.donGiaNhap ?? 0);
              existing.lastDate = dateStr;
            }
          } else {
            map.set(key, {
              productId: key,
              name: ct.tenSanPham,
              totalQty: Number(ct.soLuong ?? 0),
              lastUnitPrice: Number(ct.donGiaNhap ?? 0),
              lastDate: dateStr,
            });
          }
        });
      });
    } else {
      confirmedReceipts.forEach((r) => {
        r.lines.forEach((l) => {
          const prod = app.products.find((p) => p.id === l.productId);
          const existing = map.get(l.productId);
          const qty = l.acceptedQty !== undefined ? l.acceptedQty : l.quantity;
          if (existing) {
            existing.totalQty += qty;
            existing.lastUnitPrice = l.unitPrice;
            existing.lastDate = r.confirmedAt || r.createdAt;
          } else {
            map.set(l.productId, {
              productId: l.productId,
              name: prod?.name || l.productNameSnapshot || l.productId,
              totalQty: qty,
              lastUnitPrice: l.unitPrice,
              lastDate: r.confirmedAt || r.createdAt,
            });
          }
        });
      });
    }

    return Array.from(map.values());
  }, [app.realApi, app.products, historyBackend, confirmedReceipts]);

  const openStatusModal = () => {
    setNewStatus(supplier.cooperationStatus === "active" ? "inactive" : "active");
    setShowStatusModal(true);
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    setStatusSuccess(null);
    if (!statusReason.trim()) {
      setStatusError("Vui lòng nhập lý do thay đổi trạng thái hợp tác.");
      return;
    }

    const label = newStatus === "active" ? "Đang hợp tác" : "Ngừng hợp tác";

    if (app.realApi) {
      const nccId = Number(supplier.id);
      if (!Number.isFinite(nccId)) return;
      setStatusBusy(true);
      try {
        await supplierApi.doiTrangThaiHopTac(
          nccId,
          newStatus === "active" ? "DangHopTac" : "NgungHopTac",
          statusReason.trim()
        );
        await app.refreshSuppliers?.();
        setStatusSuccess(`Đã chuyển trạng thái nhà cung cấp thành: ${label}.`);
        setShowStatusModal(false);
        setStatusReason("");
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái hợp tác.");
      } finally {
        setStatusBusy(false);
      }
      return;
    }

    const res = app.toggleSupplierStatus(supplier.id, newStatus, statusReason.trim());
    if (res.ok) {
      setStatusSuccess(`Đã chuyển trạng thái nhà cung cấp thành: ${label}.`);
      setShowStatusModal(false);
      setStatusReason("");
    } else {
      setStatusError(res.message);
    }
  };

  return {
    activeTab,
    setActiveTab,
    showStatusModal,
    setShowStatusModal,
    newStatus,
    setNewStatus,
    statusReason,
    setStatusReason,
    statusBusy,
    statusError,
    statusSuccess,
    loadingHistory,
    supplierReceipts,
    confirmedReceipts,
    totalImportValue,
    totalEquipmentAccepted,
    importedProducts,
    openStatusModal,
    handleStatusChange,
  };
}
