import React, { useEffect, useMemo, useState } from "react";
import type { useApp } from "../../../App";
import type { EquipmentStatus, StockAdjustmentLine } from "../../../store";
import { isRealApiEnabled } from "../../../services/apiClient";
import { inventoryApi } from "../../../services/api/inventoryApi";
import {
  warehouseApi,
  type DoiChieuKiemKeBackend,
  type KhoTongQuanBackend,
  type ThietBiKhoItemBackend,
} from "../../../services/api/warehouseApi";
import { formatDateVi, parseNumericId } from "../../../utils";

export type AuditItemState = {
  checkResult: "Khớp" | "Đang bảo trì" | "Thất lạc" | "Ngừng sử dụng";
  note: string;
};

export interface AuditEquipmentView {
  id: string;
  displayCode: string;
  productId: string;
  productName: string;
  equipmentStatus: string;
}

/**
 * Custom hook trung gian cho Kiểm kê kho & Đối chiếu tài sản (UC6.10 & UC6.10.1):
 * Tải tổng quan kho, tách đồ đang thuê (vắng hợp lệ), đối chiếu server và lập phiếu điều chỉnh.
 */
export function useInventoryAudit(
  app: ReturnType<typeof useApp>,
  onClose: () => void,
  onAuditSubmitted?: (receiptId: string) => void
) {
  const [activeTab, setActiveTab] = useState<"warehouse" | "rented">("warehouse");
  const [searchTerm, setSearchTerm] = useState("");
  const [auditReason, setAuditReason] = useState(`Kiểm kê kho định kỳ ${formatDateVi(new Date())}`);
  const [auditStaff, setAuditStaff] = useState("NV Kho Mai");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const useRealBackend = app.realApi || isRealApiEnabled();
  const [tongQuan, setTongQuan] = useState<KhoTongQuanBackend | null>(null);
  const [khoItems, setKhoItems] = useState<ThietBiKhoItemBackend[]>([]);
  const [loadingKho, setLoadingKho] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<DoiChieuKiemKeBackend | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [auditStates, setAuditStates] = useState<Record<string, AuditItemState>>({});

  useEffect(() => {
    if (!useRealBackend) return;
    let cancelled = false;
    setLoadingKho(true);

    Promise.all([
      warehouseApi.layTongQuan(),
      warehouseApi.timThietBi({ trang: 1, soMoiTrang: 100 }),
    ])
      .then(async ([tq, firstPage]) => {
        if (cancelled) return;
        setTongQuan(tq);
        let allItems = firstPage.items || [];
        // Backend giới hạn MaxPageSize = 100 và unwrapPaged chỉ trả totalItems/pageSize nên tự tính totalPages
        const totalPages = Math.max(1, Math.ceil((firstPage.totalItems || 0) / Math.max(1, firstPage.pageSize || 100)));
        if (totalPages > 1) {
          const restPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              warehouseApi.timThietBi({ trang: i + 2, soMoiTrang: 100 })
            )
          );
          if (cancelled) return;
          allItems = [...allItems, ...restPages.flatMap((p) => p.items || [])];
        }
        setKhoItems(allItems);
      })
      .catch((err) => {
        if (!cancelled) {
          setSubmitError(err instanceof Error ? err.message : "Không tải được dữ liệu tổng quan kho từ máy chủ.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingKho(false);
      });

    return () => {
      cancelled = true;
    };
  }, [useRealBackend]);

  // Chuẩn hóa nguồn dữ liệu từ backend kho hoặc mock store
  const sourceEquipments = useMemo<AuditEquipmentView[]>(() => {
    if (useRealBackend) {
      return khoItems.map((k) => ({
        id: String(k.maThietBi),
        displayCode: k.maThietBiHienThi,
        productId: String(k.maSanPhamHienTai),
        productName: k.tenSanPhamHienTai,
        equipmentStatus:
          k.trangThaiSuDung === "DangThue"
            ? "Đang thuê"
            : k.trangThaiSuDung === "DangBaoTri"
            ? "Đang bảo trì"
            : k.trangThaiSuDung === "ThatLac"
            ? "Thất lạc"
            : k.trangThaiSuDung === "NgungSuDung"
            ? "Ngừng sử dụng"
            : "Sẵn sàng",
      }));
    }
    return app.equipment.map((e) => ({
      id: e.id,
      displayCode: e.displayCode || e.id,
      productId: e.productId,
      productName: app.products.find((p) => p.id === e.productId)?.name || "",
      equipmentStatus: e.equipmentStatus,
    }));
  }, [useRealBackend, khoItems, app.equipment, app.products]);

  const rentedEquipments = useMemo(
    () => sourceEquipments.filter((e) => e.equipmentStatus === "Đang thuê"),
    [sourceEquipments]
  );

  const warehouseEquipments = useMemo(
    () => sourceEquipments.filter((e) => e.equipmentStatus !== "Đang thuê"),
    [sourceEquipments]
  );

  const filteredWarehouse = useMemo(() => {
    const kw = searchTerm.toLowerCase();
    return warehouseEquipments.filter((e) => {
      const prod = app.products.find((p) => p.id === e.productId);
      const text = `${e.displayCode || e.id} ${e.id} ${e.productName || prod?.name || ""}`.toLowerCase();
      return text.includes(kw);
    });
  }, [warehouseEquipments, app.products, searchTerm]);

  const discrepancies = useMemo(
    () =>
      warehouseEquipments.filter((e) => {
        const st = auditStates[e.id];
        return st && st.checkResult !== "Khớp";
      }),
    [warehouseEquipments, auditStates]
  );

  const updateItemAudit = (id: string, update: Partial<AuditItemState>) => {
    setAuditStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { checkResult: "Khớp", note: "" }), ...update },
    }));
  };

  const handleDoiChieuServer = async () => {
    if (!useRealBackend) return;
    setReconciling(true);
    setSubmitError(null);
    try {
      const danhSachMaQuet = warehouseEquipments
        .filter((e) => (auditStates[e.id]?.checkResult || "Khớp") !== "Thất lạc")
        .map((e) => e.displayCode || e.id);
      const res = await warehouseApi.doiChieuKiemKe({
        danhSachMaQuet,
        ghiChu: auditReason.trim() || "Kiểm kê đối chiếu kho",
      });
      setReconcileResult(res);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không thể đối chiếu kiểm kê với máy chủ.");
    } finally {
      setReconciling(false);
    }
  };

  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (discrepancies.length === 0) {
      onClose();
      return;
    }

    if (useRealBackend) {
      setSubmitting(true);
      try {
        const dto = {
          loaiDieuChinh: "KiemKeSaiLech",
          lyDo: auditReason.trim() || "Kiểm kê kho định kỳ",
          chiTiet: discrepancies.map((eq) => {
            const st = auditStates[eq.id];
            const targetStatus =
              st?.checkResult === "Đang bảo trì"
                ? "DangBaoTri"
                : st?.checkResult === "Thất lạc"
                ? "ThatLac"
                : st?.checkResult === "Ngừng sử dụng"
                ? "NgungSuDung"
                : "SanSang";
            return {
              maThietBi: parseNumericId(eq.id) ?? 0,
              giaTriDeNghiSau: {
                trangThaiSuDung: targetStatus,
                tinhTrang: st?.note || st?.checkResult,
              },
              ghiChu: st?.note || `Kiểm kê lệch: ${st?.checkResult}`,
            };
          }),
        };

        const createdPhieu = await inventoryApi.lapPhieu(dto);
        await inventoryApi.guiDuyet(createdPhieu.maPhieuDieuChinh);
        await app.refreshEquipment?.();
        onAuditSubmitted?.(String(createdPhieu.maPhieuDieuChinh));
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Lỗi lưu phiếu kiểm kê lên máy chủ.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const lines: StockAdjustmentLine[] = discrepancies.map((eq) => {
      const st = auditStates[eq.id];
      return {
        equipmentId: eq.id,
        previousStatus: eq.equipmentStatus as EquipmentStatus,
        newStatus: st.checkResult as EquipmentStatus,
        reason: st.note.trim() || `Phát hiện sai lệch lúc kiểm kê (${st.checkResult})`,
      };
    });

    const res = app.createStockAdjustment({
      reason: auditReason.trim(),
      createdBy: auditStaff.trim(),
      lines,
      autoApprove: false,
    });
    if (res.ok) {
      onAuditSubmitted?.(res.data.id);
      onClose();
    } else {
      setSubmitError(res.message);
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    auditReason,
    setAuditReason,
    auditStaff,
    setAuditStaff,
    submitting,
    submitError,
    useRealBackend,
    tongQuan,
    loadingKho,
    reconcileResult,
    reconciling,
    auditStates,
    rentedEquipments,
    warehouseEquipments,
    filteredWarehouse,
    discrepancies,
    updateItemAudit,
    handleDoiChieuServer,
    handleSubmitAudit,
  };
}
