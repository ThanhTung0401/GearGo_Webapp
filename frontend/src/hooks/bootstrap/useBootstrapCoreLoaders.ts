import { useCallback } from "react";
import { getAuthToken, setAuthToken } from "../../services/apiClient";
import { authApi, catalogApi, orderApi, profileApi, rentalCartApi } from "../../services/api";
import {
  flattenDanhMucTree,
  mapDonChiTietToOrder,
  mapDonTomTatToOrder,
  mapDonVanHanhChiTietToOrder,
  mapDonVanHanhTomTatToOrder,
  mapSanPhamToProduct,
} from "../../services/mappers";
import type { CartItem, Order } from "../../store";
import { mapBackendRoleToFrontend, PREFS_STORAGE_KEY, REAL_MODE } from "../appStateStorage";
import type { UseBootstrapDataParams } from "./types";

/**
 * Nhóm loader lõi: Danh mục/Sản phẩm, Giỏ hàng, Đơn thuê và Khôi phục phiên JWT.
 */
export function useBootstrapCoreLoaders(params: UseBootstrapDataParams) {
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
  } = params;

  const refreshCatalog = useCallback(
    async (range?: { gioNhan?: string; gioTra?: string; tuKhoa?: string; maDanhMuc?: number }) => {
      if (!REAL_MODE) return;
      // [BOOT-01] / [PN-01]: dùng Boolean(getAuthToken()) thay cho closure `role !== "customer"`.
      // Lúc F5 tại /staff/*, setRole() là bất đồng bộ; nếu dựa vào closure cũ (role === "customer"),
      // adminLayDanhSachDanhMuc/adminLayDanhSachSanPham bị bỏ qua, khiến danh mục/sản phẩm quản trị
      // (bao gồm dòng Tạm ngưng/Ngừng kinh doanh) không bao giờ được nạp cho tới khi F5 lần hai.
      const laStaffHoacAdmin = Boolean(getAuthToken());
      try {
        const [tree, adminCats, publicItems, adminItems] = await Promise.all([
          catalogApi.layCayDanhMuc().catch(() => []),
          laStaffHoacAdmin ? catalogApi.adminLayDanhSachDanhMuc().catch(() => []) : Promise.resolve([]),
          catalogApi
            .layDanhSachSanPham({
              gioNhan: range?.gioNhan,
              gioTra: range?.gioTra,
              tuKhoa: range?.tuKhoa,
              maDanhMuc: range?.maDanhMuc,
              soMoiTrang: 100,
            })
            .catch(async () => {
              if (range?.gioNhan || range?.gioTra) {
                return catalogApi
                  .layDanhSachSanPham({ tuKhoa: range?.tuKhoa, maDanhMuc: range?.maDanhMuc, soMoiTrang: 100 })
                  .catch(() => []);
              }
              return [];
            }),
          laStaffHoacAdmin && !range?.gioNhan
            ? catalogApi.adminLayDanhSachSanPham({ soMoiTrang: 100 }).then((r) => r.items).catch(() => [])
            : Promise.resolve([]),
        ]);

        const catSource = adminCats.length > 0 ? adminCats : tree;
        const flatCategories = flattenDanhMucTree(catSource);
        if (flatCategories.length > 0) setCategories(flatCategories);

        const catsForLookup = flatCategories.length > 0 ? flatCategories : categoriesRef.current;
        const mergedMap = new Map<number, (typeof publicItems)[number]>();
        for (const item of adminItems) mergedMap.set(item.maSanPham, item);
        for (const item of publicItems) mergedMap.set(item.maSanPham, { ...mergedMap.get(item.maSanPham), ...item });

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
      // Gộp giỏ tạm của khách vãng lai (thêm trước khi đăng nhập) lên tài khoản backend
      try {
        const prefsRaw = localStorage.getItem(PREFS_STORAGE_KEY);
        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw) as { cart?: CartItem[]; [k: string]: unknown };
          if (Array.isArray(prefs.cart) && prefs.cart.length > 0) {
            const guestItems = [...prefs.cart];
            delete prefs.cart;
            localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
            for (const item of guestItems) {
              const maSanPham = Number(item.productId);
              if (Number.isFinite(maSanPham) && maSanPham > 0 && item.qty > 0) {
                try {
                  await rentalCartApi.themVaoGio(maSanPham, item.qty);
                } catch {
                  // Bỏ qua món không đủ tồn kho nhưng vẫn giữ các món hợp lệ khác
                }
              }
            }
          }
        }
      } catch {
        // Bỏ qua nếu localStorage không hợp lệ
      }

      const gio = await rentalCartApi.layGio();
      setCart((gio.chiTiet ?? []).map((ct) => ({ productId: String(ct.maSanPham), qty: ct.soLuong })));
      setAppliedPromoCode(gio.maKhuyenMaiApDung ?? "");
      if (gio.gioNhanDuKien && gio.gioTraDuKien) {
        const pDate = gio.gioNhanDuKien.slice(0, 10);
        const rDate = gio.gioTraDuKien.slice(0, 10);
        if (pDate && rDate) {
          // Luôn đồng bộ ngày thuê từ backend để phản ánh đúng thay đổi lịch khi AI thay thế lịch giỏ
          setPickupDate(pDate);
          setReturnDate(rDate);
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
        const details = await Promise.allSettled(paged.items.slice(0, 20).map((o) => orderApi.layChiTietVanHanh(o.maDonThue)));
        const detailMap = new Map<number, Order>();
        details.forEach((r) => {
          if (r.status === "fulfilled") detailMap.set(r.value.don.maDonThue, mapDonVanHanhChiTietToOrder(r.value));
        });
        setOrders(paged.items.map((o) => detailMap.get(o.maDonThue) ?? mapDonVanHanhTomTatToOrder(o)));
      } else {
        const paged = await orderApi.layDonCuaToi({ soMoiTrang: 50 });
        const details = await Promise.allSettled(paged.items.slice(0, 20).map((o) => orderApi.layChiTietDon(o.maDonThue)));
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
            (o) => detailMap.get(o.maDonThue) ?? mapDonTomTatToOrder(o, currentUser?.name ?? "Khách hàng", currentUser?.id ?? "")
          )
        );
      }
    } catch (err) {
      console.warn("Không thể tải danh sách đơn thuê:", err);
    }
  }, [role, currentUser?.id, currentUser?.name, setOrders]);

  const upsertOrder = useCallback(
    (updated: Order) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === updated.id);
        return exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : [updated, ...prev];
      });
    },
    [setOrders]
  );

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
        // Nếu người dùng đã đăng xuất trong lúc các request hydrate đang bay, tuyệt đối không khôi phục lại phiên
        if (!getAuthToken()) return;
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
          avatarUrl: profile?.anhDaiDien ?? undefined,
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

  return { refreshCatalog, refreshCart, refreshOrders, upsertOrder, hydrateSession };
}
