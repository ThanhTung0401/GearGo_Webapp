import { expect, type APIRequestContext } from "@playwright/test";
import { authHeaders } from "./auth.js";
import { API_URL, TEST_ACCOUNTS, uniqueSuffix } from "./testData.js";

/**
 * Đăng nhập API trực tiếp vào Backend (API_URL = http://localhost:5000),
 * tránh bị lỗi 404 khi test chạy trong project=frontend (baseURL 8443).
 */
async function loginBackendApi(
  request: APIRequestContext,
  role: keyof typeof TEST_ACCOUNTS
): Promise<{ token: string; user: Record<string, unknown> }> {
  const acc = TEST_ACCOUNTS[role];
  const res = await request.post(`${API_URL}/api/auth/dang-nhap`, {
    data: { taiKhoan: acc.email, matKhau: acc.password },
  });
  expect(res.ok(), `Đăng nhập API thất bại cho ${acc.email}: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as Record<string, unknown>;
  const nested = body.duLieu as Record<string, unknown> | undefined;
  const token = String(body.token ?? body.accessToken ?? nested?.token ?? "");
  expect(token, "Token JWT trả về không được rỗng").toBeTruthy();
  return { token, user: nested ?? body };
}

export interface SeededOrderResult {
  orderId: number;
  displayCode: string;
  productId: number;
  productName: string;
  totalAmount: number;
}

export interface HandoveredOrderResult {
  assignedSerial: string;
  maThietBi: number;
}

/**
 * Unwrap dữ liệu trả về từ backend (có thể bọc trong { duLieu } hoặc trả trực tiếp).
 */
function unwrapData<T>(json: unknown): T {
  if (json && typeof json === "object" && "duLieu" in json && (json as Record<string, unknown>).duLieu !== undefined) {
    return (json as Record<string, unknown>).duLieu as T;
  }
  return json as T;
}

/**
 * Tìm sản phẩm đang kinh doanh và thực sự có thiết bị sẵn sàng trong kho,
 * tạo đơn thuê mới qua API khách hàng và xác nhận thanh toán VietQR -> "Đã xác nhận".
 */
export async function seedPaidOrderApi(request: APIRequestContext): Promise<SeededOrderResult> {
  const [{ token: custToken, user: custUser }, { token: adminToken }] = await Promise.all([
    loginBackendApi(request, "customer"),
    loginBackendApi(request, "admin"),
  ]);

  const customerName = String(custUser.hoTen ?? custUser.ten ?? "Nguyễn Văn Khách");
  const customerPhone = String(custUser.soDienThoai ?? "0901234567");

  // Đặt khung giờ cách hiện tại tối thiểu 4 giờ và thêm offset ngày ngẫu nhiên để tránh đụng lịch các lượt test trước
  const baseStart = Date.now() + 4 * 60 * 60 * 1000;

  // 1. Lấy danh sách sản phẩm công khai đang mở cho thuê
  const spRes = await request.get(`${API_URL}/api/san-pham?soMoiTrang=50`);
  expect(spRes.ok(), `GET /api/san-pham thất bại: ${spRes.status()}`).toBeTruthy();
  const spData = unwrapData<{ items?: Array<Record<string, unknown>> }>(await spRes.json());
  const products = spData.items ?? (Array.isArray(spData) ? (spData as Array<Record<string, unknown>>) : []);
  expect(products.length, "Phải có ít nhất 1 sản phẩm đang mở thuê để seed đơn").toBeGreaterThan(0);

  // 2. Lấy thiết bị đang Sẵn sàng và ưu tiên sản phẩm có nhiều thiết bị Sẵn sàng nhất (và chưa bị đặt lịch)
  const tbRes = await request.get(`${API_URL}/api/thiet-bi?trangThaiSuDung=SanSang&soMoiTrang=200`, {
    headers: authHeaders(adminToken),
  });
  expect(tbRes.ok(), `GET /api/thiet-bi thất bại: ${tbRes.status()}`).toBeTruthy();
  const tbData = unwrapData<{ items?: Array<{ maThietBi: number; maSanPham: number }> }>(await tbRes.json());
  const readyEquip = tbData.items ?? [];

  const readyCountByProd = new Map<number, number>();
  for (const eq of readyEquip) {
    const pid = Number(eq.maSanPham);
    readyCountByProd.set(pid, (readyCountByProd.get(pid) ?? 0) + 1);
  }

  const candidateProducts = [...products]
    .filter((p) => (readyCountByProd.get(Number(p.maSanPham)) ?? 0) > 0)
    .sort((a, b) => (readyCountByProd.get(Number(b.maSanPham)) ?? 0) - (readyCountByProd.get(Number(a.maSanPham)) ?? 0));

  const pool = candidateProducts.length > 0 ? candidateProducts : products;

  // 3. Thử tạo đơn thuê qua các ứng viên sản phẩm & khung ngày (+0 ngày cho lần đầu để hiện trong "hôm nay", fallback +15/+30 ngày nếu kẹt)
  const suffix = uniqueSuffix();
  let createRes: Awaited<ReturnType<APIRequestContext["post"]>> | null = null;
  let pickedProduct = pool[0];
  let lastError = "";

  // Thử ưu tiên hôm nay (+0 ngày) qua các sản phẩm nhiều tồn kho, nếu tất cả bận thì tịnh tiến ngày để vẫn tạo được đơn sạch
  const dayOffsets = [0, 3, 7, 14, 30, 45];
  outer: for (const offsetDays of dayOffsets) {
    const pickup = new Date(baseStart + offsetDays * 24 * 60 * 60 * 1000);
    const ret = new Date(pickup.getTime() + 48 * 60 * 60 * 1000);
    const tuNgay = pickup.toISOString();
    const denNgay = ret.toISOString();

    for (const prod of pool) {
      const productId = Number(prod.maSanPham);
      const attempt = await request.post(`${API_URL}/api/don-thue`, {
        headers: authHeaders(custToken),
        data: {
          gioNhanDuKien: tuNgay,
          gioTraDuKien: denNgay,
          tenNguoiNhan: customerName,
          soDienThoaiNguoiNhan: customerPhone,
          emailLienHe: TEST_ACCOUNTS.customer.email,
          ghiChu: `Đơn seed E2E-${suffix}`,
          idempotencyKey: `e2e-${suffix}-${offsetDays}-${productId}-${Math.random().toString(36).slice(2, 6)}`,
          chiTiet: [{ maSanPham: productId, soLuong: 1 }],
        },
      });
      if (attempt.ok()) {
        createRes = attempt;
        pickedProduct = prod;
        break outer;
      }
      lastError = `${attempt.status()} ${await attempt.text()}`;
    }
  }

  expect(createRes && createRes.ok(), `POST /api/don-thue thất bại trên tất cả sản phẩm: ${lastError}`).toBeTruthy();
  const productId = Number(pickedProduct.maSanPham);
  const productName = String(pickedProduct.tenSanPham ?? `SP-${productId}`);

  const created = unwrapData<{
    maDonThue: number;
    maDonHienThi: string;
    tongTienThueTruocGiam: number;
    tongTienCoc: number;
  }>(await createRes.json());
  const orderId = Number(created.maDonThue);
  const displayCode = String(created.maDonHienThi);

  // 4. Đọc lại chi tiết đơn để lấy tổng cần thanh toán chính xác (sau giảm giá nếu có)
  const detailRes = await request.get(`${API_URL}/api/don-thue/${orderId}`, {
    headers: authHeaders(custToken),
  });
  expect(detailRes.ok(), `GET /api/don-thue/${orderId} thất bại: ${detailRes.status()}`).toBeTruthy();
  const detail = unwrapData<{
    tongTienThueSauGiam?: number;
    tongTienThueTruocGiam?: number;
    tongTienCoc?: number;
    tongThanhToan?: number;
  }>(await detailRes.json());

  const totalAmount = Number(
    detail.tongThanhToan ??
      (Number(detail.tongTienThueSauGiam ?? detail.tongTienThueTruocGiam ?? created.tongTienThueTruocGiam ?? 0) +
        Number(detail.tongTienCoc ?? created.tongTienCoc ?? 0))
  );

  // 5. Xác nhận thanh toán -> chuyển đơn sang "Đã xác nhận"
  const payRes = await request.post(`${API_URL}/api/thanh-toan/xac-nhan`, {
    headers: authHeaders(custToken),
    data: {
      maDonThue: orderId,
      phuongThucThanhToan: "VietQR",
      soTienDaTra: totalAmount,
      maGiaoDichDoiTac: `E2E-QR-${suffix}`,
    },
  });
  expect(payRes.ok(), `POST /api/thanh-toan/xac-nhan thất bại (${payRes.status()}): ${await payRes.text()}`).toBeTruthy();

  return { orderId, displayCode, productId, productName, totalAmount };
}

/**
 * Đưa một đơn "Đã xác nhận" qua toàn bộ bước Chuẩn bị -> Gán serial -> Bàn giao BBBG
 * bằng API để chuẩn bị dữ liệu sạch cho kiểm thử Nhận trả & Phụ phí (CN 05).
 */
export async function prepareAndHandoverOrderApi(
  request: APIRequestContext,
  orderId: number
): Promise<HandoveredOrderResult> {
  const { token: adminToken } = await loginBackendApi(request, "admin");
  const headers = authHeaders(adminToken);

  // 1. Bắt đầu chuẩn bị
  const startRes = await request.post(`${API_URL}/api/chuan-bi-don/${orderId}/bat-dau`, { headers });
  expect(startRes.ok(), `bat-dau thất bại: ${startRes.status()} ${await startRes.text()}`).toBeTruthy();
  const prep = unwrapData<{
    danhSachDong: Array<{
      maChiTietDon: number;
      maSanPham: number;
      danhSachPhanCong: Array<{ maPhanCong: number; maThietBi: number; maThietBiHienThi: string }>;
    }>;
  }>(await startRes.json());

  const line = prep.danhSachDong[0];
  expect(line, "Đơn phải có ít nhất 1 dòng chi tiết").toBeTruthy();

  // 2. Thử lần lượt các thiết bị Sẵn sàng của sản phẩm để tránh 409 nếu có chiếc đang giữ lịch
  const tbRes = await request.get(`${API_URL}/api/thiet-bi?maSanPham=${line.maSanPham}&trangThaiSuDung=SanSang&soMoiTrang=50`, {
    headers,
  });
  expect(tbRes.ok(), `Lấy thiết bị sẵn sàng thất bại: ${tbRes.status()}`).toBeTruthy();
  const tbData = unwrapData<{ items: Array<{ maThietBi: number; maThietBiHienThi: string }> }>(await tbRes.json());
  expect(tbData.items.length, `Không còn thiết bị Sẵn sàng cho sản phẩm #${line.maSanPham}`).toBeGreaterThan(0);

  let chosenEquip: { maThietBi: number; maThietBiHienThi: string } | null = null;
  let assignedData: typeof prep | null = null;
  let lastAssignError = "";

  for (const eq of tbData.items) {
    const assignRes = await request.post(`${API_URL}/api/chuan-bi-don/${orderId}/phan-cong`, {
      headers,
      data: {
        dongDonId: line.maChiTietDon,
        thietBiIds: [eq.maThietBi],
      },
    });
    if (assignRes.ok()) {
      chosenEquip = eq;
      assignedData = unwrapData<typeof prep>(await assignRes.json());
      break;
    }
    lastAssignError = `${assignRes.status()} ${await assignRes.text()}`;
  }

  expect(chosenEquip && assignedData, `Không gán được thiết bị nào cho đơn #${orderId}: ${lastAssignError}`).toBeTruthy();
  const phanCong = assignedData!.danhSachDong[0].danhSachPhanCong[0];

  // 3. Xác nhận Sẵn sàng nhận
  const readyRes = await request.post(`${API_URL}/api/chuan-bi-don/${orderId}/san-sang`, {
    headers,
    data: { ghiChu: "Chuẩn bị qua API seed cho CN05" },
  });
  expect(readyRes.ok(), `san-sang thất bại: ${readyRes.status()} ${await readyRes.text()}`).toBeTruthy();

  // 4. Tạo nháp BBBG -> Cập nhật checklist & ảnh -> Chốt bàn giao (Đang thuê)
  const draftRes = await request.post(`${API_URL}/api/ban-giao/nhap/${orderId}`, { headers });
  expect(draftRes.ok(), `taoHoacLayNhap thất bại: ${draftRes.status()} ${await draftRes.text()}`).toBeTruthy();
  const draft = unwrapData<{ maPhieuBanGiao: number }>(await draftRes.json());

  const updRes = await request.put(`${API_URL}/api/ban-giao/nhap/${draft.maPhieuBanGiao}`, {
    headers,
    data: {
      tenNguoiNhanThucTe: "Nguyễn Văn Khách",
      thoiDiemKhachXacNhan: new Date().toISOString(),
      bangChungXacNhan: "Khách đã ký xác nhận nhận đủ thiết bị tại quầy (E2E CN05)",
      ghiChu: "Bàn giao tự động cho E2E CN05",
      chiTiet: [
        {
          maPhanCong: phanCong.maPhanCong,
          tinhTrangTruocThue: "Tot",
          phuKienThucGiao: "Đủ phụ kiện tiêu chuẩn",
          danhSachAnh: JSON.stringify([
            "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=200&auto=format&fit=crop&q=60",
          ]),
        },
      ],
    },
  });
  expect(updRes.ok(), `capNhatNhap thất bại: ${updRes.status()} ${await updRes.text()}`).toBeTruthy();

  const closeRes = await request.post(`${API_URL}/api/ban-giao/${draft.maPhieuBanGiao}/chot`, {
    headers,
    data: { tenNguoiNhanThucTe: "Nguyễn Văn Khách" },
  });
  expect(closeRes.ok(), `chotBanGiao thất bại: ${closeRes.status()} ${await closeRes.text()}`).toBeTruthy();

  return {
    assignedSerial: phanCong.maThietBiHienThi || chosenEquip!.maThietBiHienThi,
    maThietBi: chosenEquip!.maThietBi,
  };
}
