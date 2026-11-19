import {
  INITIAL_CATEGORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_SUPPLIERS,
  type Category,
  type Order,
  type Product,
  type Promotion,
  type Supplier,
} from "../store";
import { apiClient, isRealApiEnabled, setAuthToken } from "./apiClient";
import { catalogApi, type DanhMucBackend } from "./api/catalogApi";

type UserRole = "customer" | "staff" | "admin";

export interface FakeUser {
  id: string;
  username?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions?: string[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface CreateOrderRequest {
  productIds: Array<{ productId: string; quantity: number }>;
  pickupAt: string;
  returnAt: string;
  promotionCode?: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const wait = (milliseconds = 180) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

/**
 * Fake API boundary for the frontend contract.
 *
 * The methods intentionally follow the backend resource boundaries documented in
 * Document/Swagger_API_Catalog.md. Replace this object with an HTTP implementation
 * when the frontend starts consuming the ASP.NET API; callers should keep the same
 * method signatures and response shape.
 */
function mapBackendRole(vaiTro?: string): UserRole {
  if (vaiTro === "QuanTriVien") return "admin";
  if (vaiTro === "NhanVien") return "staff";
  return "customer";
}

export const fakeApi = {
  auth: {
    async login(request: LoginRequest): Promise<ApiResponse<FakeUser>> {
      if (isRealApiEnabled()) {
        const res = await apiClient.post<{
          token: string;
          maTaiKhoan: number;
          vaiTro: string;
          hoTen?: string;
          email?: string;
        }>("/api/auth/dang-nhap", {
          taiKhoan: request.identifier,
          matKhau: request.password,
        });
        setAuthToken(res.data.token);
        return {
          status: res.status,
          data: {
            id: String(res.data.maTaiKhoan),
            name: res.data.hoTen ?? res.data.email ?? request.identifier,
            email: res.data.email ?? "",
            phone: "",
            role: mapBackendRole(res.data.vaiTro),
          },
        };
      }
      await wait();
      const users: Array<FakeUser & { password: string }> = [
        { id: "AD001", name: "Quản trị viên", email: "admin@geargo.vn", phone: "0900000000", role: "admin", password: "admin123" },
        { id: "NV001", username: "mai.lt", name: "Lê Thị Mai", email: "mai.lt@geargo.vn", phone: "0900000001", role: "staff", password: "staff123" },
        { id: "KH001", name: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0901234567", role: "customer", password: "123456" },
      ];
      const user = users.find((item) =>
        [item.email, item.phone, item.username].includes(request.identifier)
      );
      if (!user || user.password !== request.password) {
        throw new Error("Thông tin đăng nhập không chính xác.");
      }
      const { password: _password, ...safeUser } = user;
      return { data: clone(safeUser), status: 200 };
    },

    async logout(): Promise<ApiResponse<void>> {
      if (isRealApiEnabled()) {
        try {
          await apiClient.post("/api/auth/dang-xuat");
        } finally {
          setAuthToken(null);
        }
        return { data: undefined, status: 200 };
      }
      await wait();
      return { data: undefined, status: 200 };
    },

    async changePassword(matKhauHienTai: string, matKhauMoi: string): Promise<ApiResponse<void>> {
      if (isRealApiEnabled()) {
        await apiClient.post("/api/auth/doi-mat-khau", {
          matKhauHienTai,
          matKhauMoi,
          xacNhanMatKhau: matKhauMoi,
        });
        setAuthToken(null);
        return { data: undefined, status: 200 };
      }
      await wait();
      return { data: undefined, status: 200 };
    },

    async updateProfile(info: { name: string; email: string; phone: string }): Promise<ApiResponse<unknown>> {
      if (isRealApiEnabled()) {
        return apiClient.put("/api/ho-so/toi", {
          hoTen: info.name,
          email: info.email,
          soDienThoai: info.phone,
        });
      }
      await wait();
      return { data: info, status: 200 };
    },

    async me(user: FakeUser | null): Promise<ApiResponse<FakeUser | null>> {
      if (isRealApiEnabled()) {
        const res = await apiClient.get<{ maTaiKhoan: number; vaiTro: string; hoTen?: string; email?: string }>("/api/auth/toi");
        return {
          status: res.status,
          data: {
            id: String(res.data.maTaiKhoan),
            name: res.data.hoTen ?? res.data.email ?? "",
            email: res.data.email ?? "",
            phone: "",
            role: mapBackendRole(res.data.vaiTro),
          },
        };
      }
      await wait();
      return { data: clone(user), status: 200 };
    },
  },

  catalog: {
    async getCategories(): Promise<ApiResponse<Category[]>> {
      if (isRealApiEnabled()) {
        const tree = await catalogApi.layCayDanhMuc();
        const flat: Category[] = [];
        const traverse = (items: DanhMucBackend[], parentId: string | null) => {
          for (const item of items) {
            flat.push({
              id: String(item.maDanhMuc),
              parentId: parentId,
              name: item.tenDanhMuc,
              description: item.moTa || "",
              displayOrder: item.thuTuHienThi || 0,
              status: item.trangThai === "HienThi" ? "active" : "inactive",
            });
            if (item.danhMucCon && item.danhMucCon.length > 0) {
              traverse(item.danhMucCon, String(item.maDanhMuc));
            }
          }
        };
        traverse(tree, null);
        return { data: flat, status: 200 };
      }
      await wait();
      return { data: clone(INITIAL_CATEGORIES), status: 200 };
    },

    async getProducts(query?: { categoryId?: string; search?: string }): Promise<ApiResponse<Product[]>> {
      if (isRealApiEnabled()) {
        const catId = query?.categoryId && !isNaN(Number(query.categoryId)) ? Number(query.categoryId) : undefined;
        const products = await catalogApi.layDanhSachSanPham({
          maDanhMuc: catId,
          tuKhoa: query?.search,
        });
        const mapped: Product[] = products.map((p) => ({
          id: String(p.maSanPham),
          displayCode: p.maSanPhamHienThi || `SP-${p.maSanPham}`,
          categoryId: String(p.maDanhMuc),
          category: p.tenSanPham,
          name: p.tenSanPham,
          brand: p.thuongHieu || "",
          description: p.moTa || "",
          capacity: p.sucChua ? `${p.sucChua} người` : "",
          dimensions: p.kichThuoc || "",
          specifications: p.thongSo ? (typeof p.thongSo === "string" ? (() => { try { return JSON.parse(p.thongSo); } catch { return {}; } })() : p.thongSo) : {},
          pricePerDay: Number(p.giaThueMoiNgay) || 0,
          deposit: Number(p.mucCocMoiThietBi) || 0,
          compensation: Number(p.giaTriBoiThuong) || 0,
          image: p.hinhAnhChinh || p.hinhAnhs?.[0] || "",
          images: p.hinhAnhs || (p.hinhAnhChinh ? [p.hinhAnhChinh] : []),
          status: p.trangThaiKinhDoanh === "DangKinhDoanh" ? "active" : "inactive",
          rating: p.diemTrungBinh || 5.0,
          reviews: p.soLuongDanhGia || 0,
        }));
        return { data: mapped, status: 200 };
      }
      await wait();
      const search = query?.search?.trim().toLowerCase();
      const products = INITIAL_PRODUCTS.filter((product) =>
        (!query?.categoryId || product.categoryId === query.categoryId || product.category === query.categoryId) &&
        (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search))
      );
      return { data: clone(products), status: 200 };
    },

    async getProduct(id: string): Promise<ApiResponse<Product>> {
      if (isRealApiEnabled() && !isNaN(Number(id))) {
        const p = await catalogApi.layChiTietSanPham(Number(id));
        const mapped: Product = {
          id: String(p.maSanPham),
          displayCode: p.maSanPhamHienThi || `SP-${p.maSanPham}`,
          categoryId: String(p.maDanhMuc),
          category: p.tenSanPham,
          name: p.tenSanPham,
          brand: p.thuongHieu || "",
          description: p.moTa || "",
          capacity: p.sucChua ? `${p.sucChua} người` : "",
          dimensions: p.kichThuoc || "",
          specifications: p.thongSo ? (typeof p.thongSo === "string" ? (() => { try { return JSON.parse(p.thongSo); } catch { return {}; } })() : p.thongSo) : {},
          pricePerDay: Number(p.giaThueMoiNgay) || 0,
          deposit: Number(p.mucCocMoiThietBi) || 0,
          compensation: Number(p.giaTriBoiThuong) || 0,
          image: p.hinhAnhChinh || p.hinhAnhs?.[0] || "",
          images: p.hinhAnhs || (p.hinhAnhChinh ? [p.hinhAnhChinh] : []),
          status: p.trangThaiKinhDoanh === "DangKinhDoanh" ? "active" : "inactive",
          rating: p.diemTrungBinh || 5.0,
          reviews: p.soLuongDanhGia || 0,
        };
        return { data: mapped, status: 200 };
      }
      await wait();
      const product = INITIAL_PRODUCTS.find((item) => item.id === id);
      if (!product) throw new Error("Không tìm thấy sản phẩm.");
      return { data: clone(product), status: 200 };
    },
  },

  rental: {
    async getOrders(): Promise<ApiResponse<Order[]>> {
      await wait();
      return { data: clone(INITIAL_ORDERS), status: 200 };
    },

    async getOrder(id: string): Promise<ApiResponse<Order>> {
      await wait();
      const order = INITIAL_ORDERS.find((item) => item.id === id);
      if (!order) throw new Error("Không tìm thấy đơn thuê.");
      return { data: clone(order), status: 200 };
    },

    async createOrder(request: CreateOrderRequest): Promise<ApiResponse<Order>> {
      await wait();
      const products = request.productIds.map(({ productId, quantity }) => {
        const product = INITIAL_PRODUCTS.find((item) => item.id === productId);
        if (!product || quantity < 1) throw new Error("Sản phẩm hoặc số lượng không hợp lệ.");
        return { product, quantity };
      });
      const days = Math.max(1, Math.ceil(
        (new Date(request.returnAt).getTime() - new Date(request.pickupAt).getTime()) / 86400000
      ));
      const rental = products.reduce((sum, item) => sum + item.product.pricePerDay * item.quantity * days, 0);
      const depositTotal = products.reduce((sum, item) => sum + item.product.deposit * item.quantity, 0);
      const now = new Date().toISOString();
      const order: Order = {
        id: `DT-FAKE-${Date.now()}`,
        customerId: "KH-DEMO",
        customerName: "Khách hàng demo",
        customerPhone: "",
        items: products.map(({ product, quantity }) => ({
          productId: product.id,
          productName: product.name,
          qty: quantity,
          days,
          pricePerDay: product.pricePerDay,
          depositPerUnit: product.deposit,
          compensation: product.compensation,
        })),
        rental,
        discount: 0,
        depositTotal,
        pickupTime: request.pickupAt,
        returnTime: request.returnAt,
        status: "Chờ thanh toán",
        createdAt: now,
        assignedEquipment: [],
        surcharges: [],
        transactions: [],
        statusHistory: [{ status: "Chờ thanh toán", at: now, by: "Fake API" }],
      };
      return { data: clone(order), status: 201 };
    },
  },

  promotions: {
    async getActive(): Promise<ApiResponse<Promotion[]>> {
      await wait();
      return {
        data: clone(INITIAL_PROMOTIONS.filter((promotion) => promotion.status === "active")),
        status: 200,
      };
    },
  },

  suppliers: {
    async getAll(): Promise<ApiResponse<Supplier[]>> {
      await wait();
      return { data: clone(INITIAL_SUPPLIERS), status: 200 };
    },
  },

  notifications: {
    async getMine(): Promise<ApiResponse<typeof INITIAL_NOTIFICATIONS>> {
      if (isRealApiEnabled()) {
        const res = await apiClient.get<{ items: typeof INITIAL_NOTIFICATIONS }>("/api/thong-bao");
        return { data: res.data.items ?? [], status: res.status };
      }
      await wait();
      return { data: clone(INITIAL_NOTIFICATIONS), status: 200 };
    },

    async sendAdmin(payload: { tieuDe: string; noiDung: string; maTaiKhoanNhan?: number }): Promise<ApiResponse<unknown>> {
      if (isRealApiEnabled()) {
        return apiClient.post("/api/thong-bao", payload);
      }
      await wait();
      return { data: payload, status: 201 };
    },
  },

  audit: {
    async getLogs(params?: { tuKhoa?: string; trang?: number; soMoiTrang?: number }): Promise<ApiResponse<unknown>> {
      if (isRealApiEnabled()) {
        const qs = new URLSearchParams();
        if (params?.tuKhoa) qs.set("tuKhoa", params.tuKhoa);
        if (params?.trang) qs.set("trang", String(params.trang));
        if (params?.soMoiTrang) qs.set("soMoiTrang", String(params.soMoiTrang));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return apiClient.get(`/api/nhat-ky${suffix}`);
      }
      await wait();
      return { data: { items: [], totalItems: 0 }, status: 200 };
    },
  },
} as const;
