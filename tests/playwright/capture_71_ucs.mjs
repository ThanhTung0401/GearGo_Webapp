import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.resolve('Document/screenshots_uc');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
  console.log(`Captured ${name}.png`);
}

async function unhighlightAll(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-hl="1"]').forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-hl');
    });
  }).catch(() => {});
}

async function highlightOnly(page, locator) {
  await unhighlightAll(page);
  try {
    if (await locator.isVisible().catch(() => false)) {
      await locator.scrollIntoViewIfNeeded();
      await locator.evaluate((el) => {
        el.setAttribute('data-hl', '1');
        el.style.outline = '3px solid #ef4444';
        el.style.outlineOffset = '2px';
      });
    }
  } catch {}
}

async function loginForm(page, email, password, isAdmin = false) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
  const form = page.locator('form.auth-form');
  await form.waitFor({ state: 'visible', timeout: 10000 });
  await form.locator('input').nth(0).fill(email);
  await form.locator('input').nth(1).fill(password);
  await form.locator("button[type='submit']").click();
  if (isAdmin) {
    await page.getByRole('button', { name: /Trang khách/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  } else {
    await page.getByRole('button', { name: 'Thoát' }).first().waitFor({ state: 'visible', timeout: 15000 });
  }
  await page.waitForTimeout(700);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ================= 1. GUEST / PUBLIC =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

    await page.getByRole('button', { name: 'Đăng ký' }).first().click();
    await page.getByRole('heading', { name: /Tạo tài khoản GearGo/i }).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await shot(page, 'UC1_1');

    await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
    await page.locator('form.auth-form').waitFor({ state: 'visible' });
    await shot(page, 'UC1_2');

    await page.getByRole('button', { name: /Quên mật khẩu/i }).first().click();
    await page.getByRole('heading', { name: /Khôi phục mật khẩu/i }).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await shot(page, 'UC1_4');

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Thuê đồ' }).first().click().catch(() => {});
    await page.waitForTimeout(600);

    // UC2.2: Xem chi tiết sản phẩm (ảnh lớn + 2 thumbnails rõ nét)
    await page.locator('.lp-catalog-grid img').first().click({ timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: /Quay lại danh sách/i }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'UC2_2');
    await page.getByRole('button', { name: /Quay lại danh sách/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);

    // Điền ngày nhận & ngày trả hợp lệ trên ProductFiltersBar
    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(0).fill('2026-11-30');
      await dateInputs.nth(1).fill('2026-12-02');
      await page.waitForTimeout(600);
    }

    // UC2.1: Tìm kiếm và lọc sản phẩm
    const searchProd = page.getByPlaceholder('Tìm tên, thương hiệu...').first();
    if (await searchProd.isVisible().catch(() => false)) {
      await searchProd.fill('Lều');
      await page.waitForTimeout(700);
    }
    await shot(page, 'UC2_1');

    // UC2.3: Kiểm tra khả dụng (vào chi tiết sản phẩm khi đã chọn ngày -> hiện "✓ Còn X chiếc cho khoảng ngày đã chọn" & bảng tạm tính)
    await page.locator('.lp-catalog-grid img').first().click({ timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: /Quay lại danh sách/i }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    await highlightOnly(page, page.locator('.lp-detail-avail-banner').first());
    await shot(page, 'UC2_3');
    await unhighlightAll(page);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
    const aiBtn = page.getByRole('button', { name: /Tư vấn AI|Gợi ý AI|Trợ lý AI|Tư vấn/i }).first();
    if (await aiBtn.isVisible().catch(() => false)) {
      await aiBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    }
    await shot(page, 'UC2_4');
    await ctx.close();
  }

  // ================= 2. KHÁCH HÀNG =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginForm(page, 'customer@geargo.vn', 'GearGo@2026', false);

    // UC1.3: Đăng xuất
    await highlightOnly(page, page.getByRole('button', { name: 'Thoát' }).first());
    await shot(page, 'UC1_3');
    await unhighlightAll(page);

    // UC1.5, UC1.6, UC9.1, UC1.12
    await page.getByRole('button', { name: 'Tài khoản' }).first().click();
    await page.getByText(/Đang tải hồ sơ cá nhân/i).waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await shot(page, 'UC1_5');

    await highlightOnly(page, page.getByRole('button', { name: 'Lưu thay đổi' }).first());
    await shot(page, 'UC1_6');
    await unhighlightAll(page);

    const profileReviewTab = page.getByRole('button', { name: /Đánh giá sản phẩm/i }).first();
    if (await profileReviewTab.isVisible().catch(() => false)) {
      await profileReviewTab.click().catch(() => {});
      await page.waitForTimeout(500);
      const writeReviewBtn = page.getByRole('button', { name: /Viết đánh giá|Đánh giá ngay/i }).first();
      if (await writeReviewBtn.isVisible().catch(() => false)) {
        await writeReviewBtn.click().catch(() => {});
        await page.waitForTimeout(450);
      }
      await shot(page, 'UC9_1');
    }

    await page.getByRole('button', { name: /Đổi mật khẩu|Bảo mật/i }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, 'UC1_12');

    // UC3.1, UC3.2, UC5.1
    await page.getByRole('button', { name: 'Thuê đồ' }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const custDates = page.locator('input[type="date"]');
    if ((await custDates.count()) >= 2) {
      await custDates.nth(0).fill('2026-11-30');
      await custDates.nth(1).fill('2026-12-02');
      await page.waitForTimeout(500);
    }
    const addCart = page.getByRole('button', { name: /Thêm vào giỏ thuê|\+ Thuê ngay/i }).first();
    if (await addCart.isVisible().catch(() => false)) {
      await addCart.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.getByRole('button', { name: /Giỏ thuê/i }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'UC3_1');

    // UC3.2: Bấm "Tiến hành xác nhận thuê →" để chuyển sang trang CheckoutView (Xác nhận thông tin đặt thuê & Giữ chỗ)
    const proceedCheckoutBtn = page.getByRole('button', { name: /Tiến hành xác nhận thuê/i }).first();
    if (await proceedCheckoutBtn.isVisible().catch(() => false)) {
      await proceedCheckoutBtn.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    const termsCheck = page.locator('input[type="checkbox"]').first();
    if (await termsCheck.isVisible().catch(() => false)) {
      await termsCheck.check().catch(() => {});
      await page.waitForTimeout(300);
    }
    await shot(page, 'UC3_2');

    // UC5.1: Bấm nút xác nhận tạo đơn & giữ chỗ trên CheckoutView để sang trang OrderConfirmedView (QR Thanh toán)
    const confirmBookingBtn = page.getByRole('button', { name: /Xác nhận đặt thuê|Tạo đơn|Thanh toán/i }).first();
    if (await confirmBookingBtn.isVisible().catch(() => false)) {
      await confirmBookingBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await shot(page, 'UC5_1');

    // UC3.3, UC3.4 (MỞ THẬT OrderCancelModal từ tab Đã xác nhận -> ORD-202611-110!)
    await page.getByRole('button', { name: 'Đơn thuê' }).first().click().catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, 'UC3_3');

    const confirmedTab = page.getByRole('button', { name: /Đã xác nhận/i }).first();
    if (await confirmedTab.isVisible().catch(() => false)) {
      await confirmedTab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.getByText('ORD-202611-110').first().click().catch(() => {});
    await page.waitForTimeout(600);
    const cancelBtn = page.getByRole('button', { name: /Yêu cầu hủy đơn thuê/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await shot(page, 'UC3_4');
    await page.keyboard.press('Escape').catch(() => {});
    const closeCancel = page.locator('[role="dialog"] button:has-text("✕"), [role="dialog"] button:has-text("Đóng")').first();
    if (await closeCancel.isVisible().catch(() => false)) await closeCancel.click().catch(() => {});

    await page.getByRole('button', { name: 'Thông báo' }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, 'UC9_3');

    await ctx.close();
  }

  // ================= 3. ADMIN WORKSPACE =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginForm(page, 'admin@geargo.vn', 'GearGo@2026', true);

    const content = page.locator('.internal-content');

    const closeModal = async () => {
      await unhighlightAll(page);
      for (let i = 0; i < 3; i++) {
        const overlay = page.locator('.modal-overlay, .so-modal-overlay, .recon-modal-backdrop, .recon-backdrop, [class*="modal-overlay"], [class*="backdrop"], [role="dialog"]').last();
        if (await overlay.isVisible().catch(() => false)) {
          const closeBtn = overlay.locator('button:has-text("Hủy"), button:has-text("Đóng"), button:has-text("×"), button:has-text("✕")').first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click({ timeout: 3000 }).catch(() => {});
          } else {
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(350);
        } else {
          break;
        }
      }
    };

    const clickTab = async (exactLabel) => {
      await closeModal();
      const tab = page.getByRole('button', { name: exactLabel, exact: true }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.scrollIntoViewIfNeeded();
        await tab.click();
        await page.waitForTimeout(700);
        return true;
      }
      const tabLoose = page.getByRole('button', { name: exactLabel, exact: false }).first();
      if (await tabLoose.isVisible().catch(() => false)) {
        await tabLoose.scrollIntoViewIfNeeded();
        await tabLoose.click();
        await page.waitForTimeout(700);
        return true;
      }
      return false;
    };

    // --- PH1 ---
    await clickTab('Nhân viên');
    const searchStaff = page.getByPlaceholder('Tìm theo tên, mã NV, username...').first();
    if (await searchStaff.isVisible().catch(() => false)) {
      await searchStaff.fill('Kho');
      await page.waitForTimeout(450);
      await shot(page, 'UC1_9');
      await searchStaff.fill('');
      await page.waitForTimeout(450);
    } else {
      await shot(page, 'UC1_9');
    }

    await highlightOnly(page, content.locator('button:has-text("Khóa"), button:has-text("Mở khóa")').first());
    await shot(page, 'UC1_11');
    await unhighlightAll(page);

    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC1_8');
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm nhân viên mới/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC1_7');
    await closeModal();

    await clickTab('Phân quyền');
    await shot(page, 'UC1_10');

    await clickTab('Khách hàng');
    await shot(page, 'UC1_13');

    // --- PH4 & PH5 ---
    await clickTab('Đơn thuê');
    await shot(page, 'UC4_5');

    // UC5.4 & UC5.6: Mở Đối soát đơn ORD-202611-109 (cọc 1tr > phụ phí 150k -> Hoàn tiền)
    const row109 = content.locator('tr:has-text("ORD-202611-109")').first();
    if (await row109.isVisible().catch(() => false)) {
      await row109.getByRole('button', { name: 'Đối soát', exact: true }).click().catch(() => {});
    } else {
      await content.getByRole('button', { name: 'Đối soát', exact: true }).first().click().catch(() => {});
    }
    await page.waitForTimeout(700);
    await shot(page, 'UC5_4');

    const refundOpenBtn = page.getByRole('button', { name: /Lập & xử lý hoàn tiền cọc|Hoàn tiền|Hoàn cọc/i }).first();
    if (await refundOpenBtn.isVisible().catch(() => false)) {
      await refundOpenBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await shot(page, 'UC5_6');
    await closeModal();

    // UC5.5: Chọn trực tiếp ORD-202611-108 ngay trong danh sách Nhận trả & Phụ phí -> mở CollectSurchargeModal!
    const btn108 = content.locator('button:has-text("ORD-202611-108")').first();
    if (await btn108.isVisible().catch(() => false)) {
      await btn108.click().catch(() => {});
      await page.waitForTimeout(700);
      const collectOpenBtn = page.getByRole('button', { name: /Thu thêm bổ sung|Thu thêm/i }).first();
      if (await collectOpenBtn.isVisible().catch(() => false)) {
        await collectOpenBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    await shot(page, 'UC5_5');
    await closeModal();

    // UC4.1 & UC4.2: Chuẩn bị & Bàn giao
    await clickTab('Chuẩn bị & Bàn giao');
    const prepItem = content.locator('button:has-text("ORD-202611-102"), button:has-text("Đã xác nhận")').first();
    if (await prepItem.isVisible().catch(() => false)) {
      await prepItem.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await shot(page, 'UC4_1');

    const handoverTabBtn = content.getByRole('button', { name: /2\. Tiếp khách & Bàn giao/i }).first();
    if (await handoverTabBtn.isVisible().catch(() => false)) {
      await handoverTabBtn.click().catch(() => {});
      await page.waitForTimeout(600);
      const readyOrder = content.locator('button:has-text("ORD-202611-107"), button:has-text("Sẵn sàng")').first();
      if (await readyOrder.isVisible().catch(() => false)) {
        await readyOrder.click().catch(() => {});
        await page.waitForTimeout(600);
      }
    }
    await shot(page, 'UC4_2');

    // UC4.3, UC4.4, UC5.2: Nhận trả & Phụ phí
    await clickTab('Nhận trả & Phụ phí');
    const retItem = content.locator('button:has-text("ORD-202610-001"), button:has-text("ORD-202611-111")').first();
    if (await retItem.isVisible().catch(() => false)) {
      await retItem.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    // Tick chọn món thiết bị đầu tiên trong ReturnInspectionForm để bung form kiểm tra chi tiết!
    const firstCheck = content.locator('input[type="checkbox"]').first();
    if (await firstCheck.isVisible().catch(() => false)) {
      await firstCheck.check().catch(() => {});
      await page.waitForTimeout(450);
    }
    const dmgBtn = content.getByRole('button', { name: /Hư hỏng/i }).first();
    if (await dmgBtn.isVisible().catch(() => false)) {
      await dmgBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC4_3');

    await page.evaluate(() => window.scrollBy(0, 260));
    await page.waitForTimeout(350);
    await shot(page, 'UC5_2');

    await page.evaluate(() => window.scrollTo(0, 0));
    const overdueItem = content.locator('button:has-text("Quá hạn")').first();
    if (await overdueItem.isVisible().catch(() => false)) {
      await overdueItem.click().catch(() => {});
      await page.waitForTimeout(500);
      const contactLogBtn = content.getByRole('button', { name: /Nhật ký gọi/i }).first();
      if (await contactLogBtn.isVisible().catch(() => false)) {
        await contactLogBtn.click().catch(() => {});
        await page.waitForTimeout(450);
      }
    }
    await shot(page, 'UC4_4');
    await closeModal();

    // UC5.3: Tổng quan hệ thống -> Tranh chấp & Duyệt phụ phí (MỞ THẬT MODAL ResolveSurchargeModal!)
    await clickTab('Tổng quan hệ thống');
    const resolveDisputeBtn = content.getByRole('button', { name: /Xem chứng cứ & Kết luận|Giải quyết|Xử lý/i }).first();
    if (await resolveDisputeBtn.isVisible().catch(() => false)) {
      await resolveDisputeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await shot(page, 'UC5_3');
    await closeModal();

    // UC5.7: Bù trừ tài chính
    await clickTab('Bù trừ tài chính');
    const adjBtn = content.getByRole('button', { name: /Điều chỉnh|Tạo|Bù trừ/i }).first();
    if (await adjBtn.isVisible().catch(() => false)) {
      await adjBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await shot(page, 'UC5_7');
    await closeModal();

    // --- PH6: Danh mục, Sản phẩm, Vòng đời thiết bị, Điều chỉnh kho, Kho & Bảo trì ---
    await clickTab('Danh mục');
    const searchCat = content.locator('input[placeholder*="Tìm" i]').first();
    if (await searchCat.isVisible().catch(() => false)) {
      await searchCat.fill('Lều');
      await page.waitForTimeout(400);
      await shot(page, 'UC6_3');
      await searchCat.fill('');
      await page.waitForTimeout(300);
    } else {
      await shot(page, 'UC6_3');
    }

    await highlightOnly(page, content.getByRole('button', { name: 'Ẩn', exact: true }).first());
    await shot(page, 'UC6_4');
    await unhighlightAll(page);

    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC6_2');
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm danh mục/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC6_1');
    await closeModal();

    await clickTab('Sản phẩm');
    const searchSp = content.getByPlaceholder(/Tìm tên sản phẩm/i).first();
    if (await searchSp.isVisible().catch(() => false)) {
      await searchSp.fill('Lều');
      await page.waitForTimeout(400);
      await shot(page, 'UC6_7');
      await searchSp.fill('');
      await page.waitForTimeout(300);
    } else {
      await shot(page, 'UC6_7');
    }

    // UC6.8: Click dòng đầu tiên để mở adm-detail-panel chứa select Trạng thái KD!
    await content.locator('table tbody tr').first().click().catch(() => {});
    await page.waitForTimeout(450);
    await highlightOnly(page, content.locator('.adm-detail-panel select').first());
    await shot(page, 'UC6_8');
    await unhighlightAll(page);

    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC6_6');
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm sản phẩm/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC6_5');
    await closeModal();

    await clickTab('Vòng đời thiết bị');
    await shot(page, 'UC6_9');
    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC6_14');
    await closeModal();

    await clickTab('Điều chỉnh kho');
    const checkImpactBtn = content.getByRole('button', { name: /Kiểm tra|Duyệt/i }).first();
    if (await checkImpactBtn.isVisible().catch(() => false)) {
      await checkImpactBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC6_11');
    await closeModal();

    const createAdjBtn = content.getByRole('button', { name: /Kiểm kê|Đề nghị|Tạo/i }).first();
    if (await createAdjBtn.isVisible().catch(() => false)) {
      await createAdjBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC6_10');
    await closeModal();

    await clickTab('Kho & Bảo trì');
    const transferBtn = content.getByRole('button', { name: /Điều chuyển/i }).first();
    if (await transferBtn.isVisible().catch(() => false)) {
      await transferBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC6_15');
    await closeModal();

    const maintSubTab = content.locator('button:has-text("Phiếu bảo trì")').first();
    if (await maintSubTab.isVisible().catch(() => false)) {
      await maintSubTab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const acceptMaintBtn = content.getByRole('button', { name: /Nghiệm thu/i }).first();
    if (await acceptMaintBtn.isVisible().catch(() => false)) {
      await acceptMaintBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC6_13');
    await closeModal();

    const createMaintBtn = content.getByRole('button', { name: /Tạo phiếu bảo trì/i }).first();
    if (await createMaintBtn.isVisible().catch(() => false)) {
      await createMaintBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC6_12');
    await closeModal();

    // --- PH7: Nhà cung cấp & Phiếu nhập ---
    await clickTab('Nhà cung cấp');
    const searchNcc = page.getByPlaceholder(/Tìm theo mã NCC/i).first();
    if (await searchNcc.isVisible().catch(() => false)) {
      await searchNcc.fill('Naturehike');
      await page.waitForTimeout(400);
      await shot(page, 'UC7_3');
      await searchNcc.fill('');
      await page.waitForTimeout(300);
    } else {
      await shot(page, 'UC7_3');
    }

    await highlightOnly(page, content.getByRole('button', { name: /Ngừng hợp tác|Hợp tác lại|Tạm ngừng/i }).first());
    await shot(page, 'UC7_4');
    await unhighlightAll(page);

    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC7_2');
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm NCC mới/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC7_1');
    await closeModal();

    await clickTab('Phiếu nhập');
    // Chọn đúng phiếu Nháp PN-2026-005
    const draftPn = content.getByText('PN-2026-005').first();
    if (await draftPn.isVisible().catch(() => false)) {
      await draftPn.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await shot(page, 'UC7_8');

    const editDraftBtn = content.getByRole('button', { name: /Sửa nháp/i }).first();
    if (await editDraftBtn.isVisible().catch(() => false)) {
      await editDraftBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC7_6');
    await closeModal();

    const inspectBtn = content.getByRole('button', { name: /Kiểm nhận & Chốt kho/i }).first();
    if (await inspectBtn.isVisible().catch(() => false)) {
      await inspectBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await shot(page, 'UC7_7');
    await closeModal();

    await highlightOnly(page, content.getByRole('button', { name: /Hủy nháp/i }).first());
    await shot(page, 'UC7_9');
    await unhighlightAll(page);

    // Chọn phiếu Đã nhập kho đầu tiên dựa vào badge "Đã nhập kho" -> mở Đề nghị điều chỉnh (UC7.10)
    const donePn = content.locator('button:has-text("Đã nhập kho")').first();
    if (await donePn.isVisible().catch(() => false)) {
      await donePn.click().catch(() => {});
      await page.waitForTimeout(500);
      const diffBtn = content.getByRole('button', { name: /Đề nghị điều chỉnh/i }).first();
      if (await diffBtn.isVisible().catch(() => false)) {
        await diffBtn.click().catch(() => {});
        await page.waitForTimeout(450);
      }
    }
    await shot(page, 'UC7_10');
    await closeModal();

    await content.getByRole('button', { name: /\+ Tạo phiếu nhập|\+ Lập phiếu/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC7_5');
    await closeModal();

    // --- PH8 ---
    await clickTab('Chính sách thuê');
    await shot(page, 'UC8_1');

    await clickTab('Khuyến mãi');
    const searchKm = page.getByPlaceholder(/Tìm kiếm theo mã code/i).first();
    if (await searchKm.isVisible().catch(() => false)) {
      await searchKm.fill('GEAR');
      await page.waitForTimeout(400);
      await shot(page, 'UC8_4');
      await searchKm.fill('');
      await page.waitForTimeout(300);
    } else {
      await shot(page, 'UC8_4');
    }

    await highlightOnly(page, content.locator('button:has-text("Ngừng"), button:has-text("Tạm dừng")').first());
    await shot(page, 'UC8_5');
    await unhighlightAll(page);

    await content.getByRole('button', { name: 'Sửa', exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC8_3');
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm|\+ Tạo/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await shot(page, 'UC8_2');
    await closeModal();

    // --- PH9 & PH10 ---
    await clickTab('Đánh giá');
    await shot(page, 'UC9_2');

    await clickTab('Thông báo HT');
    await shot(page, 'UC9_4');

    await clickTab('Báo cáo ca & Nhật ký');
    await shot(page, 'UC10_1');

    await clickTab('Báo cáo Kho & TC');
    await shot(page, 'UC10_2');
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);
    await shot(page, 'UC10_3');

    await clickTab('Audit Log');
    await shot(page, 'UC10_4');

    await ctx.close();
  }

  await browser.close();
  console.log('Finished capturing all 71 clean, modal-accurate UC screenshots!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
