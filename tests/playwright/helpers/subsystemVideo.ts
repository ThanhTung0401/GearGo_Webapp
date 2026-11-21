import fs from "node:fs";
import path from "node:path";
import { test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

const playwrightRoot = path.resolve(import.meta.dirname, "..");
const videosAllDir = path.join(playwrightRoot, "videos", "all");
const videosFailedDir = path.join(playwrightRoot, "videos", "failed");
const tempVideoRoot = path.join(playwrightRoot, "test-results", ".tmp-videos");

/**
 * Tạo thư mục nếu chưa tồn tại.
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Khởi tạo 1 BrowserContext + 1 Page dùng chung cho toàn bộ các test() trong một phân hệ (test.describe.serial).
 * Đảm bảo mỗi phân hệ xuất ra ĐÚNG 1 video liền mạch từ đầu tới hết:
 * - Lưu toàn bộ 10 video vào `tests/playwright/videos/all/<subsystemName>.webm`.
 * - Nếu bất kỳ bước nào trong phân hệ bị lỗi, lưu thêm video và ảnh chụp màn hình lỗi vào `tests/playwright/videos/failed/`.
 */
export function useSubsystemPage(subsystemName: string): () => Page {
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let hasFailed = false;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const tempDir = path.join(tempVideoRoot, subsystemName);
    ensureDir(tempDir);
    ensureDir(videosAllDir);
    ensureDir(videosFailedDir);

    // Xóa file kết quả cũ của riêng phân hệ này nếu có trước khi quay lượt mới
    const oldAll = path.join(videosAllDir, `${subsystemName}.webm`);
    const oldFailVideo = path.join(videosFailedDir, `${subsystemName}.webm`);
    const oldFailImg = path.join(videosFailedDir, `${subsystemName}-error.png`);
    for (const file of [oldAll, oldFailVideo, oldFailImg]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }

    context = await browser.newContext({
      baseURL: process.env.APP_URL || "http://localhost:8443",
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: tempDir,
        size: { width: 1440, height: 900 },
      },
    });
    page = await context.newPage();
  });

  test.afterEach(async ({}, testInfo) => {
    // Phát hiện lỗi ở bất kỳ UC/test nào thuộc phân hệ để gắn cờ phân loại vào folder failed/
    if (testInfo.status !== testInfo.expectedStatus) {
      hasFailed = true;
      if (page && !page.isClosed()) {
        const failShot = path.join(videosFailedDir, `${subsystemName}-error.png`);
        await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
      }
    }
  });

  test.afterAll(async () => {
    if (!hasFailed && page && !page.isClosed() && !process.env.CI) {
      // Dừng nhẹ cuối phân hệ để người xem nhìn trọn vẹn trạng thái cuối trước khi kết thúc video
      await page.waitForTimeout(1200).catch(() => {});
    }
    const video = page?.video();
    // Bắt buộc đóng context trước khi đọc file video để Playwright hoàn tất ghi luồng .webm xuống đĩa
    await context?.close();

    if (video) {
      const srcPath = await video.path().catch(() => "");
      if (srcPath && fs.existsSync(srcPath)) {
        const destAll = path.join(videosAllDir, `${subsystemName}.webm`);
        fs.copyFileSync(srcPath, destAll);

        if (hasFailed) {
          const destFailed = path.join(videosFailedDir, `${subsystemName}.webm`);
          fs.copyFileSync(srcPath, destFailed);
        }
      }
    }
  });

  return () => {
    if (!page) {
      throw new Error(`Page cho phân hệ ${subsystemName} chưa được khởi tạo.`);
    }
    return page;
  };
}

/**
 * Tạm dừng nhẹ (mặc định 900ms) sau khi mở tab hoặc trang quan trọng để người xem video kịp quan sát.
 * Chỉ áp dụng khi chạy ở Local (!process.env.CI) để không làm chậm pipeline CI.
 */
export async function pauseForViewer(page: Page, ms = 900): Promise<void> {
  if (!process.env.CI) {
    await page.waitForTimeout(ms);
  }
}

/**
 * Chờ phần tử thực sự hiển thị tối đa `timeout` ms (tránh isVisible() 0ms bỏ qua bước quay video khi API đang tải).
 */
export async function waitVisible(locator: Locator, timeout = 3000): Promise<boolean> {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Đóng modal đang mở một cách an toàn (chỉ tìm nút đóng bên trong dialog trên cùng, tránh bấm nhầm nút nền).
 */
export async function closeActiveDialog(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"], .modal-overlay, .adm-modal-overlay').last();
  if (!(await dialog.isVisible().catch(() => false))) return;
  const closeBtn = dialog.getByRole("button", { name: /^(×|✕|Đóng|Hủy)$/i }).first();
  if (await waitVisible(closeBtn, 1500)) {
    await closeBtn.click();
    return;
  }
  const byAria = dialog.locator('button[aria-label="Đóng"], button[aria-label="Close"]').first();
  if (await waitVisible(byAria, 1000)) {
    await byAria.click();
    return;
  }
  await page.keyboard.press("Escape");
}
