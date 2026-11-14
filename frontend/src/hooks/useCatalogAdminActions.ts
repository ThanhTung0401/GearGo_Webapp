import type { Dispatch, SetStateAction } from "react";
import {
  fmt,
  type ActionResult,
  type Category,
  type Equipment,
  type Order,
  type Product,
  type Promotion,
  type Supplier,
} from "../store";
import { makeId, normalizeCode } from "./appStateStorage";

interface UseCatalogAdminActionsParams {
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  equipment: Equipment[];
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  orders: Order[];
  suppliers: Supplier[];
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  promotions: Promotion[];
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  addAuditLog: (entry: {
    actor: string;
    role: string;
    action: string;
    targetEntity: string;
    targetId: string;
    detail: string;
  }) => void;
}

/**
 * Hook quản lý danh mục, sản phẩm, thiết bị, nhà cung cấp và khuyến mãi (CRUD & kiểm tra ràng buộc).
 */
export function useCatalogAdminActions(params: UseCatalogAdminActionsParams) {
  const {
    categories,
    setCategories,
    products,
    setProducts,
    equipment,
    setEquipment,
    orders,
    suppliers,
    setSuppliers,
    promotions,
    setPromotions,
    addAuditLog,
  } = params;

  const saveCategory = (input: Category): ActionResult<Category> => {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Vui lòng nhập tên danh mục.", fieldErrors: { name: "Tên danh mục là bắt buộc." } };
    let parentCursor = input.parentId;
    while (parentCursor) {
      if (parentCursor === input.id && input.id) {
        return { ok: false, message: "Danh mục cha tạo thành quan hệ vòng lặp.", fieldErrors: { parentId: "Quan hệ danh mục cha không hợp lệ." } };
      }
      parentCursor = categories.find((category) => category.id === parentCursor)?.parentId ?? null;
    }
    const duplicate = categories.some(
      (category) =>
        category.id !== input.id &&
        category.parentId === (input.parentId || null) &&
        category.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")
    );
    if (duplicate) return { ok: false, message: "Tên danh mục đã tồn tại trong cùng cấp.", fieldErrors: { name: "Tên danh mục bị trùng." } };
    const category: Category = {
      ...input,
      id: input.id || makeId("CAT"),
      name,
      parentId: input.parentId || null,
      displayOrder: Math.max(0, Number(input.displayOrder) || 0),
    };
    const previous = categories.find((item) => item.id === category.id);
    setCategories((current) => (previous ? current.map((item) => (item.id === category.id ? category : item)) : [...current, category]));
    if (previous && previous.name !== category.name) {
      setProducts((current) => current.map((product) => (product.categoryId === category.id ? { ...product, category: category.name } : product)));
    }
    return { ok: true, data: category };
  };

  const setCategoryStatus = (id: string, status: Category["status"]): ActionResult => {
    const category = categories.find((item) => item.id === id);
    if (!category) return { ok: false, message: "Không tìm thấy danh mục." };
    if (status === "inactive" && products.some((product) => product.categoryId === id && product.status === "active")) {
      return { ok: false, message: "Hãy tạm dừng các sản phẩm đang kinh doanh trong danh mục trước." };
    }
    setCategories((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    return { ok: true, data: undefined };
  };

  const validateProduct = (input: Product): ActionResult<Product> | null => {
    const errors: Record<string, string> = {};
    const code = normalizeCode(input.displayCode || input.id);
    if (!code) errors.displayCode = "Mã sản phẩm là bắt buộc.";
    if (products.some((product) => product.id !== input.id && normalizeCode(product.displayCode || product.id) === code)) {
      errors.displayCode = "Mã sản phẩm đã tồn tại.";
    }
    if (!input.name.trim()) errors.name = "Tên sản phẩm là bắt buộc.";
    const category = categories.find((item) => item.id === input.categoryId);
    if (!category) errors.categoryId = "Vui lòng chọn danh mục.";
    if (input.status === "active" && category?.status !== "active") {
      errors.categoryId = "Sản phẩm đang kinh doanh phải thuộc danh mục hoạt động.";
    }
    if (!Number.isFinite(input.pricePerDay) || input.pricePerDay < 0) errors.pricePerDay = "Giá thuê phải từ 0 trở lên.";
    if (!Number.isFinite(input.deposit) || input.deposit < 0) errors.deposit = "Mức cọc phải từ 0 trở lên.";
    if (!Number.isFinite(input.compensation) || input.compensation < 0) errors.compensation = "Giá trị bồi thường phải từ 0 trở lên.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra lại thông tin sản phẩm.", fieldErrors: errors };
    return null;
  };

  const saveProduct = (input: Product): ActionResult<Product> => {
    const error = validateProduct(input);
    if (error) return error;
    const category = categories.find((item) => item.id === input.categoryId)!;
    const product: Product = {
      ...input,
      id: input.id || makeId("PROD"),
      displayCode: normalizeCode(input.displayCode || input.id),
      category: category.name,
      name: input.name.trim(),
      brand: input.brand.trim(),
      description: input.description.trim(),
      dimensions: input.dimensions?.trim() ?? "",
      specifications: input.specifications ?? {},
      images: input.images?.length ? input.images : [input.image].filter(Boolean),
      image: input.images?.[0] || input.image,
      rating: input.rating ?? 0,
      reviews: input.reviews ?? 0,
    };
    const exists = products.some((item) => item.id === product.id);
    setProducts((current) => (exists ? current.map((item) => (item.id === product.id ? product : item)) : [...current, product]));
    return { ok: true, data: product };
  };

  const saveEquipment = (input: Equipment): ActionResult<Equipment> => {
    if (!equipment.some((item) => item.id === input.id)) return { ok: false, message: "Không tìm thấy thiết bị." };
    if (!input.condition.trim()) return { ok: false, message: "Vui lòng nhập tình trạng thiết bị.", fieldErrors: { condition: "Tình trạng là bắt buộc." } };

    // UC6.14 Dòng phụ 3.1: Chặn chuyển sang "Ngừng sử dụng" khi thiết bị đang cho thuê
    if (input.equipmentStatus === "Ngừng sử dụng") {
      const activeRented = orders.find(
        (o) => o.status === "Đang thuê" && o.assignedEquipment.some((ae) => ae.equipmentId === input.id && !ae.returnedAt)
      );
      if (activeRented) {
        return {
          ok: false,
          message: `Thiết bị ${input.id} đang được khách thuê trong đơn ${activeRented.id}. Không thể ngừng sử dụng khi chưa thu hồi hoặc giải quyết bồi hoàn! (UC6.14 Dòng 3.1)`,
        };
      }
    }

    const equipmentItem = {
      ...input,
      displayCode: normalizeCode(input.displayCode || input.id),
      includedAccessories: input.includedAccessories ?? [],
      note: input.note ?? "",
    };
    setEquipment((current) => current.map((item) => (item.id === equipmentItem.id ? equipmentItem : item)));
    return { ok: true, data: equipmentItem };
  };

  const saveSupplier = (input: Supplier): ActionResult<Supplier> => {
    const code = normalizeCode(input.displayCode);
    const errors: Record<string, string> = {};
    if (!code) errors.displayCode = "Mã nhà cung cấp là bắt buộc.";
    if (suppliers.some((supplier) => supplier.id !== input.id && normalizeCode(supplier.displayCode) === code)) {
      errors.displayCode = "Mã nhà cung cấp đã tồn tại.";
    }
    if (!input.name.trim()) errors.name = "Tên nhà cung cấp là bắt buộc.";
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "Email không hợp lệ.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra thông tin nhà cung cấp.", fieldErrors: errors };
    const supplier = { ...input, id: input.id || makeId("SUP"), displayCode: code, name: input.name.trim() };
    const exists = suppliers.some((item) => item.id === supplier.id);
    setSuppliers((current) => (exists ? current.map((item) => (item.id === supplier.id ? supplier : item)) : [...current, supplier]));
    return { ok: true, data: supplier };
  };

  // UC7.4: Thay đổi tình trạng hợp tác nhà cung cấp kèm lý do
  const toggleSupplierStatus = (supplierId: string, status: "active" | "inactive", reason: string): ActionResult => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return { ok: false, message: "Không tìm thấy nhà cung cấp." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do thay đổi trạng thái hợp tác (theo UC7.4)." };

    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, cooperationStatus: status, statusReason: reason.trim() } : s))
    );

    addAuditLog({
      actor: "Quản trị viên",
      role: "admin",
      action: `Đổi trạng thái NCC (${status === "active" ? "Đang hợp tác" : "Ngừng hợp tác"})`,
      targetEntity: "Supplier",
      targetId: supplierId,
      detail: `Lý do: ${reason.trim()}`,
    });

    return { ok: true, data: undefined };
  };

  const savePromotion = (input: Promotion): ActionResult<Promotion> => {
    const code = normalizeCode(input.code);
    const errors: Record<string, string> = {};
    if (!code) errors.code = "Mã giảm giá là bắt buộc.";
    if (promotions.some((promotion) => promotion.id !== input.id && normalizeCode(promotion.code) === code)) {
      errors.code = "Mã giảm giá đã tồn tại.";
    }
    const existingPromotion = promotions.find((promotion) => promotion.id === input.id);
    if (existingPromotion && existingPromotion.usedCount > 0 && normalizeCode(existingPromotion.code) !== code) {
      errors.code = "Không thể đổi mã đã có lượt sử dụng.";
    }
    if (!input.name.trim()) errors.name = "Tên chương trình là bắt buộc.";
    if (input.discountValue <= 0 || (input.discountType === "percentage" && input.discountValue > 100)) {
      errors.discountValue = "Giá trị giảm không hợp lệ.";
    }
    if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) {
      errors.endsAt = "Thời gian kết thúc phải sau bắt đầu.";
    }
    if (input.scope === "products" && input.productIds.length === 0) errors.scope = "Chọn ít nhất một sản phẩm.";
    if (input.scope === "categories" && input.categoryIds.length === 0) errors.scope = "Chọn ít nhất một danh mục.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra thông tin khuyến mãi.", fieldErrors: errors };
    const promotion = { ...input, id: input.id || makeId("PROMO"), code, name: input.name.trim() };
    const exists = promotions.some((item) => item.id === promotion.id);
    setPromotions((current) => (exists ? current.map((item) => (item.id === promotion.id ? promotion : item)) : [...current, promotion]));
    return { ok: true, data: promotion };
  };

  const evaluatePromotion = (
    rawCode: string,
    rental: number,
    items: { productId: string; rental: number }[]
  ): ActionResult<{ promotion: Promotion; discount: number }> => {
    const promotion = promotions.find((item) => normalizeCode(item.code) === normalizeCode(rawCode));
    if (!promotion) return { ok: false, message: "Mã giảm giá không tồn tại." };
    const now = Date.now();
    if (promotion.status !== "active" || now < new Date(promotion.startsAt).getTime() || now > new Date(promotion.endsAt).getTime()) {
      return { ok: false, message: "Mã giảm giá chưa hoạt động hoặc đã hết hạn." };
    }
    if (promotion.totalUsageLimit !== null && promotion.usedCount >= promotion.totalUsageLimit) {
      return { ok: false, message: "Mã giảm giá đã hết lượt sử dụng." };
    }
    if (rental < promotion.minimumRental) {
      return { ok: false, message: `Tiền thuê tối thiểu để áp dụng là ${fmt(promotion.minimumRental)}.` };
    }
    const eligibleRental = items
      .filter(
        (item) =>
          promotion.scope === "all" ||
          (promotion.scope === "products" && promotion.productIds.includes(item.productId)) ||
          (promotion.scope === "categories" &&
            promotion.categoryIds.includes(products.find((product) => product.id === item.productId)?.categoryId ?? ""))
      )
      .reduce((sum, item) => sum + item.rental, 0);
    if (eligibleRental <= 0) return { ok: false, message: "Giỏ thuê không có sản phẩm thuộc phạm vi khuyến mãi." };
    const rawDiscount = promotion.discountType === "percentage" ? Math.round((eligibleRental * promotion.discountValue) / 100) : promotion.discountValue;
    const discount = Math.min(eligibleRental, promotion.maxDiscount === null ? rawDiscount : Math.min(rawDiscount, promotion.maxDiscount));
    return { ok: true, data: { promotion, discount } };
  };

  return {
    saveCategory,
    setCategoryStatus,
    saveProduct,
    saveEquipment,
    saveSupplier,
    toggleSupplierStatus,
    savePromotion,
    evaluatePromotion,
  };
}
