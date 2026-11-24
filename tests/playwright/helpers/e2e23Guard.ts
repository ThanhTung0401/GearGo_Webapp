import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const playwrightRoot = path.resolve(import.meta.dirname, "..");
const evidenceDir = path.join(playwrightRoot, "Document", "evidence_23_tabs");

export interface GuardReport {
  pageErrors: string[];
  consoleErrors: string[];
  httpFailures: Array<{ status: number; method: string; url: string; body: string }>;
}

/**
 * Lưu ảnh chụp màn hình minh chứng vào `tests/playwright/Document/evidence_23_tabs/`.
 */
export async function saveEvidence(page: Page, fileName: string): Promise<string> {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const normalized = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  const target = path.join(evidenceDir, normalized);
  await page.screenshot({ path: target, fullPage: false });
  return target;
}

/**
 * Gắn bộ theo dõi lỗi runtime (pageerror, console.error, HTTP >= 400) cho một tab test.
 * Cho phép truyền `ignoreUrls` hoặc `allowStatuses` nếu đang kiểm thử negative validation có chủ đích.
 */
export function attachTabGuard(
  page: Page,
  options?: { allowStatuses?: number[]; ignoreUrlPatterns?: RegExp[] }
): {
  report: GuardReport;
  reset: () => void;
  assertClean: (contextLabel: string) => void;
} {
  const report: GuardReport = {
    pageErrors: [],
    consoleErrors: [],
    httpFailures: [],
  };
  const allowSet = new Set(options?.allowStatuses ?? []);
  const ignorePatterns = options?.ignoreUrlPatterns ?? [/favicon/i];

  page.on("pageerror", (err) => {
    report.pageErrors.push(String(err));
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      // Bỏ qua log resource 404/400 nếu đang nằm trong allowStatuses
      if (allowSet.size > 0 && /status of (400|403|404|409)/i.test(txt)) return;
      report.consoleErrors.push(txt);
    }
  });

  page.on("response", async (res) => {
    const status = res.status();
    const url = res.url();
    if (status < 400) return;
    if (ignorePatterns.some((re) => re.test(url))) return;
    if (allowSet.has(status)) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 240);
    } catch {
      body = "";
    }
    report.httpFailures.push({
      status,
      method: res.request().method(),
      url,
      body,
    });
  });

  return {
    report,
    reset: () => {
      report.pageErrors.length = 0;
      report.consoleErrors.length = 0;
      report.httpFailures.length = 0;
    },
    assertClean: (contextLabel: string) => {
      expect(
        report.pageErrors,
        `[${contextLabel}] Phát hiện pageerror: ${report.pageErrors.join(" | ")}`
      ).toEqual([]);
      expect(
        report.httpFailures,
        `[${contextLabel}] Phát hiện lỗi HTTP >= 400: ${JSON.stringify(report.httpFailures)}`
      ).toEqual([]);
      expect(
        report.consoleErrors,
        `[${contextLabel}] Phát hiện console.error: ${report.consoleErrors.join(" | ")}`
      ).toEqual([]);
    },
  };
}

/**
 * Kiểm tra chuẩn UI trên từng màn hình quản trị:
 * - Không tràn ngang viewport
 * - Không cắt nút Topbar (Đăng xuất, Trang khách)
 * - Không chứa NaN, Invalid Date, undefined, [object Object]
 * - Không chứa chuỗi ISO thô YYYY-MM-DDTHH:mm...Z ngoài khối <pre> JSON
 */
export async function assertCleanTabUi(page: Page, tabLabel: string): Promise<void> {
  const check = await page.evaluate(() => {
    const vw = window.innerWidth;
    const docOverflow = document.documentElement.scrollWidth > vw + 2;

    const clippedHeader: string[] = [];
    document.querySelectorAll("header button, header a").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.right > vw + 2) {
        clippedHeader.push((el.textContent || "").trim());
      }
    });

    // Loại bỏ <pre> (nơi hiển thị JSON diff trong modal Audit chi tiết)
    const mainClone = document.querySelector("main")?.cloneNode(true) as HTMLElement | null;
    if (mainClone) {
      mainClone.querySelectorAll("pre, code").forEach((n) => n.remove());
    }
    const text = mainClone?.innerText || "";

    const isoDates = [...new Set(text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[^\s]*/g) || [])];
    const badTokens: string[] = [];
    if (/\bNaN\b/.test(text)) badTokens.push("NaN");
    if (/\bInvalid Date\b/i.test(text)) badTokens.push("Invalid Date");
    if (/\bundefined\b/.test(text)) badTokens.push("undefined");
    if (/\[object Object\]/.test(text)) badTokens.push("[object Object]");

    return {
      docOverflow,
      scrollWidth: document.documentElement.scrollWidth,
      vw,
      clippedHeader,
      isoDates,
      badTokens,
    };
  });

  expect(
    check.docOverflow,
    `[${tabLabel}] Tràn ngang: scrollWidth=${check.scrollWidth} > vw=${check.vw}`
  ).toBe(false);
  expect(
    check.clippedHeader,
    `[${tabLabel}] Nút Topbar bị cắt: ${check.clippedHeader.join(", ")}`
  ).toEqual([]);
  expect(
    check.badTokens,
    `[${tabLabel}] Lỗi hiển thị token: ${check.badTokens.join(", ")}`
  ).toEqual([]);
  expect(
    check.isoDates,
    `[${tabLabel}] Còn ngày giờ ISO thô: ${check.isoDates.join(", ")}`
  ).toEqual([]);
}

/**
 * Điều hướng tới một tab trong Workspace bằng sidebar (ưu tiên click SPA mượt để quay video đẹp).
 */
export async function navigateStaffTab(page: Page, tabKey: string): Promise<void> {
  const sidebarBtn = page.locator(`aside [data-tab="${tabKey}"]`).first();
  if (await sidebarBtn.isVisible().catch(() => false)) {
    await sidebarBtn.click();
  } else {
    await page.goto(`/staff/${tabKey}`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(700);
}
