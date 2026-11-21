import { useEffect, useMemo, useState } from "react";
import type { useApp } from "../../../App";
import type { Equipment } from "../../../store";
import { isRealApiEnabled } from "../../../services/apiClient";
import { equipmentApi, type HoSoVongDoiResponse } from "../../../services/api/equipmentApi";
import { getEquipmentStatusStyle, parseNumericId } from "../../../utils";

/**
 * Custom hook trung gian cho Sổ đời thiết bị (UC6.9):
 * Tách riêng toàn bộ logic gọi API, lọc lịch sử đơn thuê / bảo trì và tra cứu nguồn nhập.
 */
export function useEquipmentLifecycle(equipment: Equipment, app: ReturnType<typeof useApp>) {
  const [hoSoApi, setHoSoApi] = useState<HoSoVongDoiResponse | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!isRealApiEnabled()) return;
    const equipIdNum = parseNumericId(equipment.id);
    if (!equipIdNum) return;

    // Cờ hủy tránh cập nhật state sau khi modal đã đóng hoặc đổi thiết bị nhanh
    let cancelled = false;
    setLoadingApi(true);
    setApiError("");

    equipmentApi
      .layHoSoVongDoi(equipIdNum)
      .then((res) => {
        if (!cancelled) setHoSoApi(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Không thể tải sổ đời từ API");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingApi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [equipment.id]);

  const currentProduct = useMemo(
    () => app.products.find((p) => p.id === equipment.productId),
    [app.products, equipment.productId]
  );

  const originalProduct = useMemo(
    () => app.products.find((p) => p.id === equipment.originalProductId),
    [app.products, equipment.originalProductId]
  );

  const importReceipt = useMemo(
    () => app.importReceipts.find((r) => r.id === equipment.importReceiptId),
    [app.importReceipts, equipment.importReceiptId]
  );

  const supplier = useMemo(
    () => (importReceipt ? app.suppliers.find((s) => s.id === importReceipt.supplierId) : null),
    [app.suppliers, importReceipt]
  );

  // Lọc lịch sử các hợp đồng thuê đã từng phân bổ thiết bị này
  const orderHistory = useMemo(
    () =>
      app.orders.filter((o) => {
        const hasAssigned = o.assignedEquipmentIds?.includes(equipment.id);
        const hasItem = o.items.some((it) => it.equipmentId === equipment.id);
        return Boolean(hasAssigned || hasItem);
      }),
    [app.orders, equipment.id]
  );

  // Lọc lịch sử bảo dưỡng & sửa chữa của cá thể
  const maintenanceHistory = useMemo(
    () => app.maintenanceReceipts.filter((m) => m.equipmentId === equipment.id),
    [app.maintenanceReceipts, equipment.id]
  );

  const statusStyle = getEquipmentStatusStyle(equipment.equipmentStatus);

  return {
    hoSoApi,
    loadingApi,
    apiError,
    currentProduct,
    originalProduct,
    supplier,
    orderHistory,
    maintenanceHistory,
    statusStyle,
  };
}
