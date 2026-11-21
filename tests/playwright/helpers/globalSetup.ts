import { chromium, type FullConfig } from "@playwright/test";
import { APP_URL, API_URL } from "./testData.js";

/**
 * Global Setup: làm nóng Backend API và biên dịch sẵn các module Vite Frontend
 * trước khi bất kỳ test nào bật `recordVideo`, loại bỏ tình trạng đơ vài giây đầu video.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Chỉ làm nóng Frontend khi server 8443 đang chạy
  try {
    const ping = await fetch(APP_URL, { signal: AbortSignal.timeout(2500) });
    if (!ping.ok) return;
  } catch {
    return;
  }

  // Ping nhẹ Backend nếu đang chạy
  await fetch(`${API_URL}/api/test`, { signal: AbortSignal.timeout(2500) }).catch(() => {});

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ baseURL: APP_URL });
    const page = await context.newPage();
    for (const route of ["/", "/login", "/staff/login"]) {
      await page.goto(route, { waitUntil: "networkidle", timeout: 20_000 }).catch(() => {});
      await page.locator("#root > *").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    }
    await context.close();
  } finally {
    await browser.close();
  }
}
