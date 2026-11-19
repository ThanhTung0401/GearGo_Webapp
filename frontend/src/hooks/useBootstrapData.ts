import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Page } from "../context";
import { getAuthToken, setAuthToken } from "../services/apiClient";
import {
  auditApi,
  authApi,
  catalogApi,
  equipmentApi,
  importReceiptApi,
  inventoryApi,
  notificationApi,
  orderApi,
  paymentApi,
  policyApi,
  profileApi,
  promotionApi,
  rentalCartApi,
  reviewApi,
  staffApi,
  supplierApi,
} from "../services/api";
import {
  flattenDanhMucTree,
  mapBaoTriToReceipt,
  mapChinhSachToPolicyVersion,
  mapChinhSachToRentalConfig,
  mapDanhGiaToReview,
  mapDieuChinhKhoToReceipt,
  mapDonChiTietToOrder,
  mapDonTomTatToOrder,
  mapDonVanHanhChiTietToOrder,
  mapDonVanHanhTomTatToOrder,
  mapKhuyenMaiToPromotion,
  mapNhaCungCapToSupplier,
  mapNhatKyToAuditLog,
  mapPhieuNhapToImportReceipt,
  mapSanPhamToProduct,
  mapThietBiToEquipment,
  mapThongBaoToNotification,
} from "../services/mappers";
import type {
  AppNotification,
  AuditLogEntry,
  CartItem,
  Category,
  CustomerAccount,
  Equipment,
  FinancialAdjustment,
  ImportReceipt,
  MaintenanceReceipt,
  Order,
  PolicyVersion,
  Product,
  Promotion,
  RentalPolicyConfig,
  Review,
  Role,
  StaffAccount,
  StockAdjustmentReceipt,
  Supplier,
} from "../store";
import { mapBackendRoleToFrontend, NEUTRAL_POLICY_CONFIG, REAL_MODE } from "./appStateStorage";

interface UseBootstrapDataParams {
  role: Role;
  currentUser: { id?: string; name: string } | null;
  pageRef: MutableRefObject<Page>;
  categoriesRef: MutableRefObject<Category[]>;
  setRole: Dispatch<SetStateAction<Role>>;
  setPage: Dispatch<SetStateAction<Page>>;
  setCurrentUser: Dispatch<
    SetStateAction<{
      id?: string;
      username?: string;
      name: string;
      email: string;
      phone: string;
      role: Role;
      permissions?: string[];
      address?: string;
    } | null>
  >;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setPermissionNotice: Dispatch<SetStateAction<string | null>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setAppliedPromoCode: Dispatch<SetStateAction<string>>;
  setPickupDate: Dispatch<SetStateAction<string>>;
  setReturnDate: Dispatch<SetStateAction<string>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setPolicyVersions: Dispatch<SetStateAction<PolicyVersion[]>>;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
}

/**
 * Hook đồng bộ dữ liệu thật từ ASP.NET Core Backend và khôi phục phiên đăng nhập.
 */
export function useBootstrapData(params: UseBootstrapDataParams) {
  const {
    role,
    currentUser,
    pageRef,
    categoriesRef,
    setRole,
    setPage,
    setCurrentUser,
    setAuthLoading,
    setPermissionNotice,
    setCategories,
    setProducts,
    setCart,
    setAppliedPromoCode,
    setPickupDate,
    setReturnDate,
    setOrders,
    setEquipment,
    setMaintenanceReceipts,
    setStockAdjustments,
    setSuppliers,
    setImportReceipts,
    setPromotions,
    setPolicyVersions,
    setPolicies,
    setReviews,
    setNotifications,
    setUnreadNotificationCount,
    setAuditLogs,
    setStaffAccounts,
    setCustomers,
    setFinancialAdjustments,
  } = params;

  const refreshCatalog = useCallback(
    async (range?: { gioNhan?: string; gioTra?: string; tuKhoa?: string; maDanhMuc?: number }) => {
      if (!REAL_MODE) return;
      try {
        const [tree, adminCats, publicItems, adminItems] = await Promise.all([
          catalogApi.layCayDanhMuc().catch(() => []),
          role !== "customer" ? catalogApi.adminLayDanhSachDanhMuc().catch(() => []) : Promise.resolve([]),
          catalogApi
            .layDanhSachSanPham({
              gioNhan: range?.gioNhan,
              gioTra: range?.gioTra,
              tuKhoa: range?.tuKhoa,
              maDanhMuc: range?.maDanhMuc,
              soMoiTrang: 100,
            })
            .catch(async () => {
              // Nếu lọc theo khoảng ngày bị từ chối (vd: ngày quá khứ -> 400), tải lại danh sách không kèm ngày để không trắng trang
              if (range?.gioNhan || range?.gioTra) {
                return catalogApi
                  .layDanhSachSanPham({
                    tuKhoa: range?.tuKhoa,
                    maDanhMuc: range?.maDanhMuc,
                    soMoiTrang: 100,
                  })
                  .catch(() => []);
              }
              return [];
            }),
          role !== "customer" && !range?.gioNhan
            ? catalogApi
                .adminLayDanhSachSanPham({ soMoiTrang: 100 })
                .then((r) => r.items)
                .catch(() => [])
            : Promise.resolve([]),
        ]);
        const catSource = adminCats.length > 0 ? adminCats : tree;
        const flatCategories = flattenDanhMucTree(catSource);
        if (flatCategories.length > 0) {
          setCategories(flatCategories);
        }
        const catsForLookup = flatCategories.length > 0 ? flatCategories : categoriesRef.current;
        // Gộp danh sách sản phẩm công khai (có soLuongKhaDung) và danh sách quản trị nếu là admin
        const mergedMap = new Map<number, (typeof publicItems)[number]>();
        for (const item of adminItems) mergedMap.set(item.maSanPham, item);
        for (const item of publicItems) {
          const prev = mergedMap.get(item.maSanPham);
          mergedMap.set(item.maSanPham, { ...prev, ...item });
        }
        const sourceItems = mergedMap.size > 0 ? Array.from(mergedMap.values()) : publicItems;
        setProducts(sourceItems.map((sp) => mapSanPhamToProduct(sp, catsForLookup)));
      } catch (err) {
        console.warn("Không thể tải danh mục/sản phẩm:", err);
      }
    },
    [role, categoriesRef, setCategories, setProducts]
  );

  const refreshCart = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      const gio = await rentalCartApi.layGio();
      setCart(
        (gio.chiTiet ?? []).map((ct) => ({
          productId: String(ct.maSanPham),
          qty: ct.soLuong,
        }))
      );
      setAppliedPromoCode(gio.maKhuyenMaiApDung ?? "");
      if (gio.gioNhanDuKien && gio.gioTraDuKien) {
        const pDate = gio.gioNhanDuKien.slice(0, 10);
        const rDate = gio.gioTraDuKien.slice(0, 10);
        if (pDate && rDate) {
          setPickupDate((prev) => prev || pDate);
          setReturnDate((prev) => prev || rDate);
        }
      }
    } catch {
      // Giữ trạng thái hiện tại nếu chưa có giỏ thuê
    }
  }, [setCart, setAppliedPromoCode, setPickupDate, setReturnDate]);

  const refreshOrders = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      if (role === "staff" || role === "admin") {
        const paged = await orderApi.timDonVanHanh({ soMoiTrang: 50 });
        const details = await Promise.allSettled(
          paged.items.slice(0, 20).map((o) => orderApi.layChiTietVanHanh(o.maDonThue))
        );
        const detailMap = new Map<number, Order>();
        details.forEach((r) => {
          if (r.status === "fulfilled") {
            detailMap.set(r.value.don.maDonThue, mapDonVanHanhChiTietToOrder(r.value));
          }
        });
        setOrders(paged.items.map((o) => detailMap.get(o.maDonThue) ?? mapDonVanHanhTomTatToOrder(o)));
      } else {
        const paged = await orderApi.layDonCuaToi({ soMoiTrang: 50 });
        const details = await Promise.allSettled(
          paged.items.slice(0, 20).map((o) => orderApi.layChiTietDon(o.maDonThue))
        );
        const detailMap = new Map<number, Order>();
        details.forEach((r) => {
          if (r.status === "fulfilled") {
            detailMap.set(
              r.value.maDonThue,
              mapDonChiTietToOrder(r.value, { customerId: currentUser?.id, customerName: currentUser?.name })
            );
          }
        });
        setOrders(
          paged.items.map(
            (o) =>
              detailMap.get(o.maDonThue) ??
              mapDonTomTatToOrder(o, currentUser?.name ?? "Khách hàng", currentUser?.id ?? "")
          )
        );
      }
    } catch (err) {
      console.warn("Không thể tải danh sách đơn thuê:", err);
    }
  }, [role, currentUser?.id, currentUser?.name, setOrders]);

  const refreshEquipment = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const [eqRes, btRes, adjRes] = await Promise.all([
        equipmentApi.timKiemThietBi({ soMoiTrang: 100 }).catch(() => ({ items: [] })),
        equipmentApi.timKiemBaoTri({ soMoiTrang: 50 }).catch(() => ({ items: [] })),
        inventoryApi.timPhieu({ soMoiTrang: 50 }).catch(() => ({ items: [] })),
      ]);
      setEquipment((eqRes.items ?? []).map(mapThietBiToEquipment));
      setMaintenanceReceipts((btRes.items ?? []).map(mapBaoTriToReceipt));
      setStockAdjustments((adjRes.items ?? []).map(mapDieuChinhKhoToReceipt));
    } catch (err) {
      console.warn("Không thể tải dữ liệu thiết bị/kho:", err);
    }
  }, [role, setEquipment, setMaintenanceReceipts, setStockAdjustments]);

  const refreshSuppliers = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await supplierApi.timKiem({ soMoiTrang: 50 });
      setSuppliers((res.items ?? []).map(mapNhaCungCapToSupplier));
    } catch (err) {
      console.warn("Không thể tải nhà cung cấp:", err);
    }
  }, [role, setSuppliers]);

  const refreshImportReceipts = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await importReceiptApi.timKiem({ soMoiTrang: 50 });
      setImportReceipts((res.items ?? []).map(mapPhieuNhapToImportReceipt));
    } catch (err) {
      console.warn("Không thể tải phiếu nhập:", err);
    }
  }, [role, setImportReceipts]);

  const refreshPromotions = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || role === "customer") return;
    try {
      const res = await promotionApi.timKiem({ soMoiTrang: 50 });
      setPromotions((res.items ?? []).map(mapKhuyenMaiToPromotion));
    } catch (err) {
      console.warn("Không thể tải khuyến mãi:", err);
    }
  }, [role, setPromotions]);

  const refreshPolicies = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || role === "customer") return;
    try {
      const res = await policyApi.layDanhSach({ kichThuoc: 20 });
      const versions = (res.items ?? []).map((cs) => mapChinhSachToPolicyVersion(cs, NEUTRAL_POLICY_CONFIG));
      setPolicyVersions(versions);
      const active = (res.items ?? []).find((cs) => cs.hieuLuc === "HienHanh") ?? (res.items ?? [])[0];
      if (active) {
        setPolicies(mapChinhSachToRentalConfig(active, NEUTRAL_POLICY_CONFIG));
      }
    } catch (err) {
      console.warn("Không thể tải chính sách:", err);
    }
  }, [role, setPolicyVersions, setPolicies]);

  const refreshReviews = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      if (role === "admin" || role === "staff") {
        const res = await reviewApi.adminTimKiem({ soMoiTrang: 50 });
        setReviews((res.items ?? []).map(mapDanhGiaToReview));
      } else {
        const res = await reviewApi.layDanhGiaCuaToi({ soMoiTrang: 50 });
        setReviews((res.items ?? []).map(mapDanhGiaToReview));
      }
    } catch {
      // Bỏ qua nếu vai trò hiện tại chưa có đánh giá
    }
  }, [role, setReviews]);

  const refreshNotifications = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      const res = await notificationApi.layCuaToi({ soMoiTrang: 30 });
      setNotifications((res.items ?? []).map((tb) => mapThongBaoToNotification(tb, role)));
      setUnreadNotificationCount(Number(res.soChuaDoc ?? 0));
    } catch {
      // Không chặn giao diện nếu endpoint thông báo tạm lỗi
    }
  }, [role, setNotifications, setUnreadNotificationCount]);

  const refreshAuditLogs = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await auditApi.traCuu({ soMoiTrang: 50 });
      setAuditLogs((res.items ?? []).map(mapNhatKyToAuditLog));
    } catch (err) {
      console.warn("Không thể tải nhật ký thao tác:", err);
    }
  }, [role, setAuditLogs]);

  const upsertOrder = useCallback(
    (updated: Order) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === updated.id);
        return exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : [updated, ...prev];
      });
    },
    [setOrders]
  );

  // Tải danh mục/sản phẩm công khai và khôi phục phiên đăng nhập từ JWT khi khởi động
  const hydrateSession = useCallback(
    async (fromPermissionChange = false) => {
      if (!REAL_MODE) return;
      const token = getAuthToken();
      if (!token) {
        setCurrentUser(null);
        setRole("customer");
        setAuthLoading(false);
        return;
      }
      try {
        const [meRes, profileRes, permsRes] = await Promise.allSettled([
          authApi.layThongTinToi(),
          profileApi.layHoSoToi(),
          authApi.layQuyenCuaToi(),
        ]);
        if (meRes.status !== "fulfilled") {
          setAuthToken(null);
          setCurrentUser(null);
          setRole("customer");
          if (fromPermissionChange) {
            setPermissionNotice("Phiên đăng nhập đã hết hiệu lực do thay đổi quyền hạn. Vui lòng đăng nhập lại.");
            setPage("login");
          }
          return;
        }
        const me = meRes.value;
        const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
        const perms = permsRes.status === "fulfilled" ? permsRes.value : null;
        const nextRole = mapBackendRoleToFrontend(perms?.vaiTro ?? me.vaiTro);
        setRole(nextRole);
        setCurrentUser({
          id: String(me.maTaiKhoan),
          name: profile?.hoTen || me.hoTen || me.email || "Thành viên GearGo",
          email: profile?.email || me.email || "",
          phone: profile?.soDienThoai || "",
          address: profile?.diaChi ?? undefined,
          role: nextRole,
          permissions: perms?.cacQuyen ?? [],
        });
        if (fromPermissionChange) {
          setPermissionNotice("Quyền hoặc vai trò tài khoản vừa được quản trị viên cập nhật. Hệ thống đã đồng bộ lại quyền hiện tại.");
          const currentPage = pageRef.current;
          if ((currentPage === "workspace" || currentPage === "admin" || currentPage === "staff") && nextRole === "customer") {
            setPage("landing");
          }
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [pageRef, setAuthLoading, setCurrentUser, setPage, setPermissionNotice, setRole]
  );

  useEffect(() => {
    if (!REAL_MODE) return;
    void refreshCatalog();
    void hydrateSession(false);

    const onPermissionChanged = () => {
      void hydrateSession(true);
    };
    window.addEventListener("geargo:permissions-changed", onPermissionChanged);
    return () => window.removeEventListener("geargo:permissions-changed", onPermissionChanged);
  }, [hydrateSession, refreshCatalog]);

  // Đồng bộ dữ liệu theo vai trò sau khi đăng nhập thành công
  useEffect(() => {
    if (!REAL_MODE || !currentUser || !getAuthToken()) return;
    void refreshNotifications();
    void refreshCatalog();
    void refreshOrders();
    void refreshReviews();
    if (role === "customer") {
      void refreshCart();
    }
    if (role !== "customer") {
      void refreshEquipment();
      void refreshSuppliers();
      void refreshImportReceipts();
      void refreshAuditLogs();
      void refreshPromotions();
      void refreshPolicies();
      void staffApi
        .timNhanVien({ soMoiTrang: 50 })
        .then((res) => {
          setStaffAccounts(
            (res.items ?? []).map((nv) => ({
              id: String(nv.maNhanVien),
              username: nv.email || `NV-${nv.maNhanVien}`,
              name: nv.hoTen || nv.email || `Nhân viên #${nv.maNhanVien}`,
              role: nv.vaiTro === "QuanTriVien" ? "Quản trị viên" : "Nhân viên kho",
              phone: nv.soDienThoai ?? "",
              email: nv.email ?? "",
              status: nv.trangThaiTaiKhoan === "BiKhoa" ? "locked" : "active",
              createdAt: nv.ngayVaoLam ?? "",
            }))
          );
        })
        .catch(() => {});
      void staffApi
        .timTaiKhoan({ vaiTro: "KhachHang", soMoiTrang: 50 })
        .then((res) => {
          setCustomers(
            (res.items ?? []).map((tk) => ({
              id: String(tk.maKhachHang ?? tk.maTaiKhoan),
              name: tk.hoTen || tk.email || `KH#${tk.maTaiKhoan}`,
              phone: tk.soDienThoai ?? "",
              email: tk.email ?? "",
              address: "",
              status: tk.trangThai === "BiKhoa" ? "locked" : "active",
              lockedReason: tk.lyDoKhoa ?? undefined,
              createdAt: tk.ngayTao,
              totalOrders: 0,
              totalSpent: 0,
              currentDeposit: 0,
            }))
          );
        })
        .catch(() => {});
      void paymentApi
        .layDanhSachCanDoiChieu()
        .then((items) => {
          setFinancialAdjustments(
            (items ?? []).map((g) => ({
              id: String(g.maThanhToan),
              orderId: String(g.maDonThue),
              type: "Thu bù",
              amount: Number(g.tongSoTien ?? 0),
              reason: g.lyDoCanDoiChieu || `Mã GD ${g.maYeuCau} (${g.phuongThuc})`,
              status: g.trangThaiDoiChieu === "DaDoiChieu" ? "Đã duyệt" : "Chờ duyệt",
              createdBy: "Cổng thanh toán",
              createdAt: g.thoiDiemTao,
            }))
          );
        })
        .catch(() => {});
    }
  }, [
    currentUser?.id,
    role,
    refreshCatalog,
    refreshNotifications,
    refreshOrders,
    refreshReviews,
    refreshCart,
    refreshEquipment,
    refreshSuppliers,
    refreshImportReceipts,
    refreshAuditLogs,
    refreshPromotions,
    refreshPolicies,
    setStaffAccounts,
    setCustomers,
    setFinancialAdjustments,
  ]);

  return {
    refreshCatalog,
    refreshCart,
    refreshOrders,
    refreshEquipment,
    refreshSuppliers,
    refreshImportReceipts,
    refreshPromotions,
    refreshPolicies,
    refreshReviews,
    refreshNotifications,
    refreshAuditLogs,
    upsertOrder,
    hydrateSession,
  };
}
