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
export const fakeApi = {
  auth: {
    async login(request: LoginRequest): Promise<ApiResponse<FakeUser>> {
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

    async me(user: FakeUser | null): Promise<ApiResponse<FakeUser | null>> {
      await wait();
      return { data: clone(user), status: 200 };
    },
  },

  catalog: {
    async getCategories(): Promise<ApiResponse<Category[]>> {
      await wait();
      return { data: clone(INITIAL_CATEGORIES), status: 200 };
    },

    async getProducts(query?: { categoryId?: string; search?: string }): Promise<ApiResponse<Product[]>> {
      await wait();
      const search = query?.search?.trim().toLowerCase();
      const products = INITIAL_PRODUCTS.filter((product) =>
        (!query?.categoryId || product.categoryId === query.categoryId || product.category === query.categoryId) &&
        (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search))
      );
      return { data: clone(products), status: 200 };
    },

    async getProduct(id: string): Promise<ApiResponse<Product>> {
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
      await wait();
      return { data: clone(INITIAL_NOTIFICATIONS), status: 200 };
    },
  },
} as const;
