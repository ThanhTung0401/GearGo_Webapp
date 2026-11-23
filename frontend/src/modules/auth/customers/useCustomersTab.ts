import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import { staffApi } from "../../../services/api/staffApi";
import { type CustomerAccount } from "../../../store";

/**
 * Hook quản lý tài khoản khách hàng (UC1.13):
 * tìm kiếm, lọc trạng thái, thống kê cọc/đơn thuê và khóa/mở khóa tài khoản.
 */
export function useCustomersTab(app: ReturnType<typeof useApp>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [lockModalCustomer, setLockModalCustomer] = useState<CustomerAccount | null>(null);
  const [lockReason, setLockReason] = useState("");

  // State kết nối API thật /api/tai-khoan?vaiTro=KhachHang (UC13 / UC1.13, UC11)
  const realApi = app.realApi || isRealApiEnabled();
  const [apiCustomers, setApiCustomers] = useState<CustomerAccount[]>([]);
  const [customerIdToTaiKhoanId, setCustomerIdToTaiKhoanId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lockError, setLockError] = useState("");

  // Tải danh sách tài khoản khách hàng từ backend và tổng hợp số đơn/tiền cọc đang giữ
  const loadCustomerList = async () => {
    if (!realApi) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await staffApi.timTaiKhoan({
        vaiTro: "KhachHang",
        tuKhoa: searchQuery.trim() || undefined,
        trangThai: statusFilter === "all" ? undefined : statusFilter === "active" ? "HoatDong" : "BiKhoa",
        soMoiTrang: 200,
      });

      const idMap: Record<string, number> = {};
      const cancelledOrUnpaid = ["Chờ thanh toán", "Đã hủy", "Khách hủy", "Cửa hàng hủy", "Hết hạn", "Hết hạn thanh toán", "Không đến nhận"];
      const mapped: CustomerAccount[] = res.items.map((tk) => {
        const rawCustomerId = String(tk.maKhachHang ?? tk.maTaiKhoan);
        const custId = `KH${rawCustomerId.padStart(3, "0")}`;
        idMap[custId] = tk.maTaiKhoan;

        // Tính lịch sử đơn thuê và tiền cọc từ đơn hàng đã đồng bộ của hệ thống
        const matchingOrders = app.orders.filter(
          (o) =>
            o.customerId === custId ||
            o.customerId === rawCustomerId ||
            (tk.soDienThoai && o.customerPhone === tk.soDienThoai)
        );
        const totalOrders = matchingOrders.length;
        const totalSpent = matchingOrders
          .filter((o) => !cancelledOrUnpaid.includes(o.status))
          .reduce((sum, o) => sum + Math.max(0, o.rental - o.discount), 0);
        const currentDeposit = matchingOrders
          .filter((o) => !["Hoàn tất", ...cancelledOrUnpaid].includes(o.status))
          .reduce((sum, o) => sum + o.depositTotal, 0);

        return {
          id: custId,
          name: tk.hoTen || (tk.email ? tk.email.split("@")[0] : "Khách hàng"),
          phone: tk.soDienThoai || "Chưa cập nhật",
          email: tk.email || "",
          address: "Khách hàng GearGo",
          status: tk.trangThai === "HoatDong" ? "active" : "locked",
          lockedReason: tk.lyDoKhoa || undefined,
          createdAt: tk.ngayTao ? new Date(tk.ngayTao).toLocaleDateString("vi-VN") : "01/01/2026",
          totalOrders,
          totalSpent,
          currentDeposit,
        };
      });

      setCustomerIdToTaiKhoanId(idMap);
      setApiCustomers(mapped);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Không thể tải danh sách tài khoản khách hàng từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomerList();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [realApi, searchQuery, statusFilter, app.orders.length]);

  const filtered = realApi
    ? apiCustomers
    : app.customers.filter((c) => {
        const matchQuery =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone.includes(searchQuery) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || c.status === statusFilter;
        return matchQuery && matchStatus;
      });

  // Xác nhận khóa tài khoản khách hàng kèm lý do vi phạm
  const handleConfirmLock = async () => {
    if (!lockModalCustomer) return;
    if (realApi) {
      const maTaiKhoan = customerIdToTaiKhoanId[lockModalCustomer.id] || parseInt(lockModalCustomer.id.replace(/\D/g, ""), 10);
      if (!Number.isFinite(maTaiKhoan) || maTaiKhoan <= 0) {
        setLockError("Không xác định được mã tài khoản để khóa.");
        return;
      }
      setActionLoading(true);
      setLockError("");
      try {
        await staffApi.khoaTaiKhoan(maTaiKhoan, lockReason.trim() || "Khóa tài khoản khách hàng vi phạm quy chế");
        await loadCustomerList();
        setLockModalCustomer(null);
        setLockReason("");
      } catch (err) {
        setLockError(err instanceof Error ? err.message : "Không thể khóa tài khoản khách hàng.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    app.toggleCustomerLock(lockModalCustomer.id, lockReason);
    setLockModalCustomer(null);
    setLockReason("");
  };

  // Mở khóa tài khoản khách hàng đang bị khóa
  const handleUnlockCustomer = async (cust: CustomerAccount) => {
    if (realApi) {
      const maTaiKhoan = customerIdToTaiKhoanId[cust.id] || parseInt(cust.id.replace(/\D/g, ""), 10);
      if (!Number.isFinite(maTaiKhoan) || maTaiKhoan <= 0) {
        setApiError("Không xác định được mã tài khoản để mở khóa.");
        return;
      }
      setActionLoading(true);
      setApiError("");
      try {
        await staffApi.moKhoaTaiKhoan(maTaiKhoan, "Mở khóa tài khoản khách hàng");
        await loadCustomerList();
      } catch (err) {
        setApiError(err instanceof Error ? err.message : "Không thể mở khóa tài khoản khách hàng.");
      } finally {
        setActionLoading(false);
      }
      return;
    }
    app.toggleCustomerLock(cust.id);
  };

  const customerOrders = selectedCustomer
    ? app.orders.filter((o) => {
        const rawNumId = selectedCustomer.id.replace(/^KH0*/, "");
        const validPhone = selectedCustomer.phone && selectedCustomer.phone !== "Chưa cập nhật";
        return (
          o.customerId === selectedCustomer.id ||
          (rawNumId && o.customerId === rawNumId) ||
          (validPhone && o.customerPhone === selectedCustomer.phone)
        );
      })
    : [];

  return {
    realApi,
    totalCount: realApi ? apiCustomers.length : app.customers.length,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedCustomer,
    setSelectedCustomer,
    lockModalCustomer,
    setLockModalCustomer,
    lockReason,
    setLockReason,
    loading,
    actionLoading,
    apiError,
    lockError,
    setLockError,
    filtered,
    handleConfirmLock,
    handleUnlockCustomer,
    customerOrders,
  };
}
