import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.APP_URL || 'http://localhost:8443';
const OUT_DIR = path.resolve('Document/screenshots_uc');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest_71_ucs.json');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Lưu toàn bộ kết quả chụp ảnh & danh sách thành phần thực tế đã gắn số cho 71 UC
const manifest = {};

function ensureUc(ucId) {
  if (!manifest[ucId]) {
    manifest[ucId] = { images: [], components: [] };
  }
  return manifest[ucId];
}

// Xóa toàn bộ nhãn số & highlight trên trang
async function clearAnnotations(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-ooad-badge="1"]').forEach((el) => el.remove());
    document.querySelectorAll('[data-hl="1"]').forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute('data-hl');
    });
  }).catch(() => {});
}

// Vẽ các badge số 1, 2, 3... tại tọa độ thực của phần tử trên viewport (tự né chồng lấn)
async function drawBadges(page, entries) {
  await page.evaluate((items) => {
    document.querySelectorAll('[data-ooad-badge="1"]').forEach((el) => el.remove());
    const placed = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const item of items) {
      const { num, box, pos } = item;
      let cx = pos === 'left' ? box.x - 10 : box.x + box.width - 6;
      let cy = pos === 'left' ? box.y + box.height / 2 - 12 : box.y - 10;

      // Kẹp tọa độ nằm gọn trong viewport
      cx = Math.max(6, Math.min(vw - 30, cx));
      cy = Math.max(6, Math.min(vh - 30, cy));

      // Chống chồng lấn với các badge đã đặt trước đó
      for (let tries = 0; tries < 8; tries++) {
        const clash = placed.some((p) => Math.hypot(p.x - cx, p.y - cy) < 25);
        if (!clash) break;
        cx = Math.max(6, Math.min(vw - 30, cx + 26));
        if (cx >= vw - 32) {
          cx = Math.max(6, box.x + 6);
          cy = Math.max(6, Math.min(vh - 30, cy + 26));
        }
      }
      placed.push({ x: cx, y: cy });

      const badge = document.createElement('div');
      badge.setAttribute('data-ooad-badge', '1');
      badge.textContent = String(num);
      Object.assign(badge.style, {
        position: 'fixed',
        left: `${Math.round(cx)}px`,
        top: `${Math.round(cy)}px`,
        minWidth: '24px',
        height: '24px',
        padding: '0 5px',
        borderRadius: '999px',
        backgroundColor: '#dc2626',
        color: '#ffffff',
        border: '2px solid #ffffff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontWeight: '700',
        lineHeight: '20px',
        textAlign: 'center',
        zIndex: '2147483647',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      });
      document.body.appendChild(badge);
    }
  }, entries);
}

// Chụp ảnh kèm gắn số theo danh sách locator chỉ định sẵn (Curated)
async function annotateCurated(page, ucId, imgName, caption, specs, startIndex = 1) {
  await clearAnnotations(page);
  await page.waitForTimeout(350);

  const uc = ensureUc(ucId);
  const entries = [];
  let idx = startIndex;

  for (const sp of specs) {
    try {
      const loc = typeof sp.loc === 'function' ? sp.loc(page) : sp.loc;
      const visible = await loc.isVisible().catch(() => false);
      if (!visible) continue;
      const box = await loc.boundingBox().catch(() => null);
      if (!box || box.width < 4 || box.height < 4) continue;
      if (box.y + box.height < 0 || box.y > 900 || box.x + box.width < 0 || box.x > 1440) continue;

      entries.push({ num: idx, box, pos: sp.pos || 'right' });
      uc.components.push({
        stt: String(idx),
        name: sp.name,
        type: sp.type,
        meaning: sp.meaning,
        domain: sp.domain || 'Null',
        defaultVal: sp.defaultVal || 'Không',
        note: sp.note || '',
      });
      idx++;
    } catch {}
  }

  if (entries.length > 0) {
    await drawBadges(page, entries);
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, `${imgName}.png`), fullPage: false });
  await clearAnnotations(page);

  uc.images.push({ file: `${imgName}.png`, caption });
  console.log(`[${ucId}] ${imgName}.png -> ${entries.length} badges (STT ${startIndex}..${idx - 1})`);
  return idx;
}

// Quét tự động các thành phần giao diện thật đang hiển thị trong một vùng (Modal hoặc Nội dung chính)
// và chuyển đổi 100% sang văn phong tiếng Việt tự nhiên, không chứa từ khóa code
async function annotateAuto(page, ucId, imgName, caption, scopeSelectors, opts = {}) {
  await clearAnnotations(page);
  await page.waitForTimeout(350);

  const startIndex = opts.startIndex || 1;
  const maxItems = opts.maxItems || 10;
  const tableName = opts.tableName || 'Bảng danh sách dữ liệu';
  const extraSpecs = opts.extraSpecs || [];

  // Tìm scope đang hiển thị đầu tiên trong danh sách scopeSelectors
  const scanned = await page.evaluate(
    ({ selectors, maxN, tblName }) => {
      let root = null;
      for (const sel of selectors) {
        const candidates = Array.from(document.querySelectorAll(sel));
        for (let i = candidates.length - 1; i >= 0; i--) {
          const el = candidates[i];
          const r = el.getBoundingClientRect();
          if (r.width > 80 && r.height > 60 && getComputedStyle(el).visibility !== 'hidden') {
            root = el;
            break;
          }
        }
        if (root) break;
      }
      if (!root) root = document.querySelector('.internal-content') || document.body;

      const cleanLabel = (s) =>
        (s || '')
          .replace(/[\uFE0F\u200D]/g, '')
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}✓✔✕✖×→←↑↓⚠+]/gu, ' ')
          .replace(/\s*\(UC[\d.]+\)/gi, '')
          .replace(/\s*\(\d+(?:\s+(?:thiết bị|phiếu|đơn|mục|sản phẩm))?\)/gi, '')
          .replace(/^\d+\.\s+/, '')
          .replace(/\s+\d+$/, '')
          .replace(/\s*\*\s*$/g, '')
          .replace(/[:…]+$/, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^VD:\s*CAMPGO10$/i, 'Nhập mã khuyến mãi');

      const getLabelForControl = (el) => {
        if (el.id) {
          const lbl = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl && lbl.innerText.trim()) return cleanLabel(lbl.innerText);
        }
        const parentLbl = el.closest('label');
        if (parentLbl) {
          const clone = parentLbl.cloneNode(true);
          clone.querySelectorAll('input,select,textarea,button').forEach((n) => n.remove());
          const t = cleanLabel(clone.textContent);
          if (t) return t;
        }
        // Tìm label ngay cùng khối cha trực tiếp
        let p = el.parentElement;
        for (let depth = 0; depth < 3 && p && p !== root; depth++) {
          const lbl = p.querySelector(':scope > label, :scope > .form-label, :scope > span.label');
          if (lbl && lbl.innerText.trim()) return cleanLabel(lbl.innerText);
          p = p.parentElement;
        }
        if (el.getAttribute('aria-label')) return cleanLabel(el.getAttribute('aria-label'));
        if (el.placeholder) return cleanLabel(el.placeholder);
        return '';
      };

      const isVisibleBox = (el) => {
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 14 || r.height < 14) return null;
        if (r.bottom < 4 || r.top > window.innerHeight - 4 || r.right < 4 || r.left > window.innerWidth - 4) return null;
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      };

      const raw = [];
      const seenNames = new Set();

      // 1. Quét inputs, selects, textareas
      root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
        if (el.closest('table')) return; // tránh quét hàng loạt checkbox bên trong từng dòng bảng
        const box = isVisibleBox(el);
        if (!box) return;
        const tag = el.tagName.toLowerCase();
        const tp = (el.getAttribute('type') || 'text').toLowerCase();
        let label = getLabelForControl(el);
        if (!label) {
          if (tp === 'date') label = 'Chọn ngày';
          else if (tp === 'search') label = 'Ô tìm kiếm';
          else if (tag === 'select') label = 'Bộ lọc lựa chọn';
          else if (tag === 'textarea') label = 'Ghi chú / Mô tả';
          else label = 'Ô nhập liệu';
        }
        if (label.length > 48) label = label.slice(0, 48).trim();

        let uiType = 'Text box';
        let domain = 'String';
        let defVal = 'Rỗng';
        let meaning = `Nhập ${label.toLowerCase()}`;

        if (tag === 'select') {
          uiType = 'Combobox';
          domain = 'Danh sách chọn';
          const optTxt = el.options && el.selectedIndex >= 0 ? cleanLabel(el.options[el.selectedIndex].text) : '';
          defVal = optTxt || 'Mặc định';
          meaning = `Chọn ${label.toLowerCase()} từ danh sách`;
        } else if (tag === 'textarea') {
          uiType = 'Textarea';
          meaning = `Nhập nội dung ${label.toLowerCase()}`;
        } else if (tp === 'password') {
          uiType = 'Password box';
          meaning = `Nhập ${label.toLowerCase()}`;
        } else if (tp === 'number') {
          uiType = 'Number box';
          domain = 'Số (>= 0)';
          defVal = el.value ? String(el.value) : '0';
          meaning = `Nhập giá trị ${label.toLowerCase()}`;
        } else if (tp === 'date' || tp === 'datetime-local') {
          uiType = 'Date picker';
          domain = 'Ngày/Tháng/Năm';
          defVal = el.value || 'Chưa chọn';
          meaning = `Chọn ${label.toLowerCase()}`;
        } else if (tp === 'checkbox') {
          uiType = 'Checkbox';
          domain = 'Đúng / Sai';
          defVal = el.checked ? 'Đã chọn' : 'Chưa chọn';
          meaning = `Bật hoặc tắt lựa chọn ${label.toLowerCase()}`;
        } else if (tp === 'radio') {
          uiType = 'Radio button';
          domain = 'Lựa chọn đơn';
          defVal = el.checked ? 'Đã chọn' : 'Chưa chọn';
          meaning = `Chọn tùy chọn ${label.toLowerCase()}`;
        } else if (tp === 'email') {
          domain = 'Email';
        }

        const isReq = el.required || (el.parentElement && /\*/.test(el.parentElement.innerText || ''));
        const isDis = el.disabled || el.readOnly;
        let note = isDis ? 'Chỉ đọc' : isReq ? 'Bắt buộc nhập' : '';

        const key = `${uiType}::${label.toLowerCase()}`;
        if (seenNames.has(key)) return;
        seenNames.add(key);
        raw.push({ priority: 1, box, name: label, type: uiType, meaning, domain, defaultVal: defVal, note });
      });

      // 2. Quét bảng dữ liệu (table) nếu có
      const tbl = root.querySelector('table');
      if (tbl) {
        const box = isVisibleBox(tbl);
        if (box) {
          raw.push({
            priority: 2,
            box: { x: box.x, y: box.y, width: Math.min(box.width, 320), height: Math.min(box.height, 44) },
            name: tblName,
            type: 'Table',
            meaning: `Hiển thị ${tblName.toLowerCase()} theo tiêu chí tìm kiếm và lọc`,
            domain: 'Danh sách bản ghi',
            defaultVal: 'Tải từ hệ thống',
            note: 'Hỗ trợ xem và thao tác trên từng dòng',
          });
        }
      }

      // 3. Quét các nút bấm chính (bỏ nút lặp trong từng dòng bảng trừ dòng đầu tiên, bỏ nút đóng X nhỏ)
      const seenBtns = new Set();
      root.querySelectorAll('button').forEach((btn) => {
        const box = isVisibleBox(btn);
        if (!box) return;
        const txt = cleanLabel(btn.innerText);
        if (!txt || txt.length < 2 || txt.length > 46) return;
        if (/^(x|×|✕)$/i.test(txt)) return;
        // Nếu nằm trong bảng, chỉ lấy nút ở dòng đầu tiên để minh họa
        const tr = btn.closest('tbody tr');
        if (tr && tr.previousElementSibling) return;

        const key = txt.toLowerCase();
        if (seenBtns.has(key)) return;
        seenBtns.add(key);

        const meaning = `Thực hiện thao tác "${txt}"`;
        const note = btn.disabled ? 'Tạm khóa khi chưa đủ điều kiện' : '';
        raw.push({
          priority: 3,
          box,
          name: txt,
          type: 'Button',
          meaning,
          domain: 'Null',
          defaultVal: btn.disabled ? 'Vô hiệu hóa' : 'Kích hoạt',
          note,
        });
      });

      // Giới hạn số lượng hiển thị hợp lý: giữ tối đa maxN, ưu tiên inputs + table + buttons chính
      raw.sort((a, b) => a.priority - b.priority || Math.round(a.box.y / 20) - Math.round(b.box.y / 20) || a.box.x - b.box.x);
      const selected = raw.slice(0, maxN);
      // Sắp xếp lại theo thứ tự đọc từ trên xuống dưới, từ trái sang phải
      selected.sort((a, b) => Math.round(a.box.y / 24) - Math.round(b.box.y / 24) || a.box.x - b.box.x);
      return selected;
    },
    { selectors: scopeSelectors, maxN: maxItems, tblName: tableName }
  );

  const uc = ensureUc(ucId);
  const entries = [];
  let idx = startIndex;

  // Thêm extraSpecs nếu có
  for (const sp of extraSpecs) {
    try {
      const loc = typeof sp.loc === 'function' ? sp.loc(page) : sp.loc;
      if (await loc.isVisible().catch(() => false)) {
        const box = await loc.boundingBox().catch(() => null);
        if (box && box.width > 4 && box.height > 4) {
          entries.push({ num: idx, box, pos: sp.pos || 'right' });
          uc.components.push({
            stt: String(idx),
            name: sp.name,
            type: sp.type,
            meaning: sp.meaning,
            domain: sp.domain || 'Null',
            defaultVal: sp.defaultVal || 'Không',
            note: sp.note || '',
          });
          idx++;
        }
      }
    } catch {}
  }

  for (const item of scanned) {
    entries.push({ num: idx, box: item.box, pos: 'right' });
    uc.components.push({
      stt: String(idx),
      name: item.name,
      type: item.type,
      meaning: item.meaning,
      domain: item.domain,
      defaultVal: item.defaultVal,
      note: item.note,
    });
    idx++;
  }

  if (entries.length > 0) {
    await drawBadges(page, entries);
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, `${imgName}.png`), fullPage: false });
  await clearAnnotations(page);

  uc.images.push({ file: `${imgName}.png`, caption });
  console.log(`[${ucId}] ${imgName}.png (auto) -> ${entries.length} badges (STT ${startIndex}..${idx - 1})`);
  return idx;
}

async function loginForm(page, email, password, isAdmin = false) {
  const loginPath = isAdmin ? '/staff/login' : '/login';
  await page.goto(`${BASE_URL}${loginPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
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

const MODAL_SCOPES = [
  '[role="dialog"]',
  '.modal-content',
  '.so-modal',
  '.recon-modal',
  '.modal-card',
  '[class*="modal-box"]',
  '[class*="modal-body"]',
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ================= 1. GUEST / PUBLIC =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // UC1.1: Đăng ký tài khoản
    await page.getByRole('button', { name: 'Đăng ký' }).first().click();
    await page.getByRole('heading', { name: /Tạo tài khoản GearGo/i }).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await annotateAuto(page, 'UC1.1', 'UC1_1', 'Giao diện Đăng ký tài khoản (SCR-1.1)', ['.auth-card', 'form.auth-form'], { maxItems: 10 });

    // UC1.2: Đăng nhập (3 hình: Hình a cổng Khách /login, Hình b cổng Nhân viên /staff/login, Hình c cảnh báo TK bị khóa)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('form.auth-form').waitFor({ state: 'visible' });
    let next12 = await annotateCurated(
      page,
      'UC1.2',
      'UC1_2_a',
      'Giao diện Đăng nhập Khách hàng tại /login (SCR-1.2)',
      [
        { loc: (p) => p.locator('form.auth-form input').nth(0), name: 'Email hoặc Số điện thoại', type: 'Text box', meaning: 'Nhập email hoặc số điện thoại của tài khoản khách hàng', domain: 'String', defaultVal: 'Rỗng', note: 'Bắt buộc nhập' },
        { loc: (p) => p.locator('form.auth-form input').nth(1), name: 'Mật khẩu', type: 'Password box', meaning: 'Nhập mật khẩu của tài khoản', domain: 'String (>= 6 ký tự)', defaultVal: 'Rỗng', note: 'Bắt buộc nhập' },
        { loc: (p) => p.locator('form.auth-form').getByRole('button', { name: /Hiện|Ẩn/i }).first(), name: 'Hiện / Ẩn mật khẩu', type: 'Button', meaning: 'Bật hoặc tắt hiển thị ký tự mật khẩu', domain: 'Null', defaultVal: 'Ẩn', note: '' },
        { loc: (p) => p.getByRole('button', { name: /Quên mật khẩu/i }).first(), name: 'Quên mật khẩu?', type: 'Button', meaning: 'Chuyển sang giao diện khôi phục mật khẩu (/forgot-password)', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('form.auth-form button[type="submit"]').first(), name: 'Đăng nhập hệ thống', type: 'Button', meaning: 'Gửi thông tin xác thực để đăng nhập tài khoản khách hàng', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.getByRole('button', { name: /Đăng ký ngay/i }).first(), name: 'Đăng ký ngay', type: 'Button', meaning: 'Chuyển sang giao diện đăng ký tài khoản mới (/register)', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('.auth-quick-login-grid').first(), name: 'Nhóm nút chọn nhanh tài khoản khách hàng', type: 'Group Button', meaning: 'Điền nhanh thông tin Khách hàng 1 và Khách hàng 2 để kiểm thử', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Hỗ trợ kiểm thử nhanh' },
      ],
      1
    );

    // Chụp thêm Hình 1.2b: Cổng đăng nhập nội bộ Nhân viên (/staff/login)
    await page.goto(`${BASE_URL}/staff/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('form.auth-form').waitFor({ state: 'visible' });
    next12 = await annotateCurated(
      page,
      'UC1.2',
      'UC1_2_b',
      'Giao diện Đăng nhập Nhân viên (Staff Portal) tại /staff/login (SCR-1.2)',
      [
        { loc: (p) => p.locator('form.auth-form button[type="submit"]').first(), name: 'Đăng nhập cổng Staff', type: 'Button', meaning: 'Gửi thông tin xác thực cho tài khoản Quản trị viên hoặc Nhân viên tại /staff/login', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Chặn đăng nhập tài khoản khách hàng' },
        { loc: (p) => p.locator('.auth-quick-login-grid').first(), name: 'Nhóm nút chọn nhanh tài khoản nội bộ', type: 'Group Button', meaning: 'Điền nhanh tài khoản Quản trị viên, Nhân viên 1 và Nhân viên 2', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Hỗ trợ kiểm thử nhanh cổng Staff' },
      ],
      next12
    );

    // Kích hoạt cảnh báo tài khoản bị khóa thật từ DB (locked.kh@geargo.vn) tại /login để chụp Hình 1.2c
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('form.auth-form').waitFor({ state: 'visible' });
    await page.locator('form.auth-form input').nth(0).fill('locked.kh@geargo.vn');
    await page.locator('form.auth-form input').nth(1).fill('GearGo@2026');
    await page.locator('form.auth-form button[type="submit"]').click();
    await page.waitForTimeout(1000);
    const alertBox = page.locator('.auth-locked-alert, [role="alert"], .auth-error').first();
    if (await alertBox.isVisible().catch(() => false)) {
      await annotateCurated(
        page,
        'UC1.2',
        'UC1_2_c',
        'Giao diện Đăng nhập – Cảnh báo tài khoản bị khóa (SCR-1.2)',
        [
          { loc: (p) => p.locator('.auth-locked-alert, [role="alert"], .auth-error').first(), name: 'Hộp cảnh báo tài khoản bị khóa', type: 'Alert box', meaning: 'Hiển thị thông báo trạng thái tài khoản bị khóa kèm lý do và thông tin liên hệ hỗ trợ', domain: 'Null', defaultVal: 'Hiển thị khi đăng nhập tài khoản bị khóa', note: '' },
        ],
        next12
      );
    }

    // UC1.4: Khôi phục mật khẩu (chụp bước 1, thử kích hoạt bước 2 OTP nếu có)
    await page.getByRole('button', { name: /Quên mật khẩu/i }).first().click();
    await page.getByRole('heading', { name: /Khôi phục mật khẩu/i }).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const next14 = await annotateAuto(page, 'UC1.4', 'UC1_4_a', 'Giao diện Khôi phục mật khẩu – Nhập thông tin liên hệ (SCR-1.4)', ['.auth-card', 'form'], { maxItems: 6 });

    const contactInput = page.locator('.auth-card input').first();
    if (await contactInput.isVisible().catch(() => false)) {
      await contactInput.fill('customer@geargo.vn');
      const sendOtpBtn = page.locator('.auth-card button[type="submit"]').first();
      if (await sendOtpBtn.isVisible().catch(() => false)) {
        await sendOtpBtn.click();
        await page.waitForTimeout(800);
        const otpInput = page.locator('.auth-card input').first();
        const headingTxt = await page.locator('.auth-card').innerText().catch(() => '');
        if (/OTP|mã xác/i.test(headingTxt) && (await otpInput.isVisible().catch(() => false))) {
          await annotateAuto(page, 'UC1.4', 'UC1_4_b', 'Giao diện Khôi phục mật khẩu – Xác thực mã OTP (SCR-1.4)', ['.auth-card', 'form'], { startIndex: next14, maxItems: 6 });
        }
      }
    }

    // UC2.2: Xem chi tiết sản phẩm
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Thuê đồ' }).first().click().catch(() => {});
    await page.waitForTimeout(600);

    await page.locator('.lp-catalog-grid img').first().click({ timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: /Quay lại danh sách/i }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    await annotateCurated(
      page,
      'UC2.2',
      'UC2_2',
      'Giao diện Xem chi tiết sản phẩm (SCR-2.2)',
      [
        { loc: (p) => p.getByRole('button', { name: /Quay lại danh sách/i }).first(), name: 'Quay lại danh sách', type: 'Button', meaning: 'Quay trở về trang danh sách sản phẩm', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('.lp-detail-main-img, .lp-detail-gallery img').first(), name: 'Ảnh chính sản phẩm', type: 'Image', meaning: 'Hiển thị hình ảnh lớn của thiết bị đang xem', domain: 'Null', defaultVal: 'Ảnh đại diện', note: '' },
        { loc: (p) => p.locator('.lp-detail-thumbs, .lp-detail-gallery button').first(), name: 'Ảnh thu nhỏ sản phẩm', type: 'Image list', meaning: 'Chọn nhanh các góc chụp khác của thiết bị', domain: 'Null', defaultVal: 'Ảnh đầu tiên', note: '' },
        { loc: (p) => p.locator('input[type="date"]').nth(0), name: 'Ngày nhận thiết bị', type: 'Date picker', meaning: 'Chọn ngày bắt đầu thuê thiết bị', domain: 'Ngày/Tháng/Năm', defaultVal: 'Chưa chọn', note: '' },
        { loc: (p) => p.locator('input[type="date"]').nth(1), name: 'Ngày trả thiết bị', type: 'Date picker', meaning: 'Chọn ngày kết thúc thuê thiết bị', domain: 'Ngày/Tháng/Năm', defaultVal: 'Chưa chọn', note: '' },
        { loc: (p) => p.getByRole('button', { name: /Thêm vào giỏ thuê|\+ Thuê ngay/i }).first(), name: 'Thêm vào giỏ thuê', type: 'Button', meaning: 'Đưa thiết bị với lịch thuê và số lượng đã chọn vào giỏ thuê', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );
    await page.getByRole('button', { name: /Quay lại danh sách/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);

    // UC2.1: Tìm kiếm và lọc sản phẩm
    const dateInputs = page.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(0).fill('2026-11-30');
      await dateInputs.nth(1).fill('2026-12-02');
      await page.waitForTimeout(600);
    }
    const searchProd = page.getByPlaceholder('Tìm tên, thương hiệu...').first();
    if (await searchProd.isVisible().catch(() => false)) {
      await searchProd.fill('Lều');
      await page.waitForTimeout(700);
    }
    await annotateCurated(
      page,
      'UC2.1',
      'UC2_1',
      'Giao diện Tìm kiếm và lọc sản phẩm (SCR-2.1)',
      [
        { loc: (p) => p.getByPlaceholder('Tìm tên, thương hiệu...').first(), name: 'Ô tìm kiếm sản phẩm', type: 'Text box', meaning: 'Nhập tên thiết bị hoặc thương hiệu cần tìm kiếm', domain: 'String', defaultVal: 'Rỗng', note: '' },
        { loc: (p) => p.locator('input[type="date"]').nth(0), name: 'Ngày nhận dự kiến', type: 'Date picker', meaning: 'Lọc các thiết bị còn trống từ ngày nhận', domain: 'Ngày/Tháng/Năm', defaultVal: 'Chưa chọn', note: '' },
        { loc: (p) => p.locator('input[type="date"]').nth(1), name: 'Ngày trả dự kiến', type: 'Date picker', meaning: 'Lọc các thiết bị còn trống đến ngày trả', domain: 'Ngày/Tháng/Năm', defaultVal: 'Chưa chọn', note: '' },
        { loc: (p) => p.locator('.lp-filter-bar select, .lp-catalog-controls select').first(), name: 'Bộ lọc danh mục / sắp xếp', type: 'Combobox', meaning: 'Lọc theo nhóm sản phẩm hoặc sắp xếp theo giá thuê', domain: 'Danh sách chọn', defaultVal: 'Tất cả', note: '' },
        { loc: (p) => p.locator('.lp-catalog-grid > *').first(), name: 'Thẻ sản phẩm kết quả', type: 'Card', meaning: 'Hiển thị ảnh, tên, giá thuê, tiền cọc và tình trạng còn hàng của từng thiết bị', domain: 'Danh sách sản phẩm', defaultVal: 'Tải từ hệ thống', note: 'Nhấn vào để xem chi tiết' },
      ],
      1
    );

    // UC2.3: Kiểm tra khả dụng
    await page.locator('.lp-catalog-grid img').first().click({ timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: /Quay lại danh sách/i }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    await annotateCurated(
      page,
      'UC2.3',
      'UC2_3',
      'Giao diện Kiểm tra khả dụng (SCR-2.3)',
      [
        { loc: (p) => p.locator('input[type="date"]').nth(0), name: 'Ngày nhận đồ', type: 'Date picker', meaning: 'Chọn ngày bắt đầu kiểm tra tồn kho khả dụng', domain: 'Ngày/Tháng/Năm', defaultVal: 'Theo lịch đã chọn', note: '' },
        { loc: (p) => p.locator('input[type="date"]').nth(1), name: 'Ngày trả đồ', type: 'Date picker', meaning: 'Chọn ngày kết thúc kiểm tra tồn kho khả dụng', domain: 'Ngày/Tháng/Năm', defaultVal: 'Theo lịch đã chọn', note: '' },
        { loc: (p) => p.locator('.lp-detail-avail-banner').first(), name: 'Thông báo số lượng khả dụng', type: 'Alert box', meaning: 'Hiển thị số lượng thiết bị còn trống trong khoảng ngày đã chọn', domain: 'Null', defaultVal: 'Cập nhật tự động', note: '' },
        { loc: (p) => p.getByRole('button', { name: /Thêm vào giỏ thuê/i }).first(), name: 'Thêm vào giỏ thuê', type: 'Button', meaning: 'Đưa sản phẩm vào giỏ thuê sau khi xác nhận còn đủ hàng', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );

    // UC2.4: Nhận tư vấn bộ dụng cụ bằng AI
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const aiBtn = page.getByRole('button', { name: /Tư vấn AI|Gợi ý AI|Trợ lý AI|Tư vấn/i }).first();
    if (await aiBtn.isVisible().catch(() => false)) {
      await aiBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
    }
    await annotateAuto(page, 'UC2.4', 'UC2_4', 'Giao diện Nhận tư vấn bộ dụng cụ bằng AI (SCR-2.4)', [...MODAL_SCOPES, '.ai-panel', 'main'], { maxItems: 8 });
    await ctx.close();
  }

  // ================= 2. KHÁCH HÀNG =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginForm(page, 'customer@geargo.vn', 'GearGo@2026', false);

    // UC1.3: Đăng xuất (chụp thanh điều hướng & hộp thoại xác nhận đăng xuất)
    await page.getByRole('button', { name: 'Thoát' }).first().click().catch(() => {});
    await page.waitForTimeout(350);
    await annotateCurated(
      page,
      'UC1.3',
      'UC1_3',
      'Giao diện Đăng xuất kèm hộp thoại xác nhận (SCR-1.3)',
      [
        { loc: (p) => p.getByRole('button', { name: 'Thoát' }).first(), name: 'Thoát', type: 'Button', meaning: 'Mở hộp thoại xác nhận thoát khỏi tài khoản hiện tại', domain: 'Null', defaultVal: 'Hiển thị khi đã đăng nhập', note: 'Nằm trên thanh điều hướng góc trên bên phải' },
        { loc: (p) => p.getByRole('dialog').getByRole('button', { name: 'Đăng xuất' }).first(), name: 'Xác nhận đăng xuất', type: 'Button', meaning: 'Xác nhận kết thúc phiên đăng nhập hiện tại', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Trong hộp thoại xác nhận' },
      ],
      1
    );
    await page.getByRole('dialog').getByRole('button', { name: /Ở lại|Hủy bỏ/i }).first().click().catch(() => {});

    // UC1.5: Xem thông tin cá nhân
    await page.getByRole('button', { name: 'Tài khoản' }).first().click();
    await page.getByText(/Đang tải hồ sơ cá nhân/i).waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await annotateAuto(page, 'UC1.5', 'UC1_5', 'Giao diện Xem thông tin cá nhân (SCR-1.5)', ['main', '.profile-page', 'body'], { maxItems: 8 });

    // UC1.6: Cập nhật thông tin cá nhân (bao gồm nút Tải ảnh lên avatar)
    await annotateCurated(
      page,
      'UC1.6',
      'UC1_6',
      'Giao diện Cập nhật thông tin cá nhân (SCR-1.6)',
      [
        { loc: (p) => p.locator('main input').nth(0), name: 'Họ và tên', type: 'Text box', meaning: 'Chỉnh sửa họ và tên của khách hàng', domain: 'String', defaultVal: 'Theo hồ sơ hiện tại', note: 'Bắt buộc nhập' },
        { loc: (p) => p.locator('main input').nth(1), name: 'Số điện thoại', type: 'Text box', meaning: 'Chỉnh sửa số điện thoại liên hệ', domain: 'String (10 chữ số)', defaultVal: 'Theo hồ sơ hiện tại', note: '' },
        { loc: (p) => p.locator('main input').nth(2), name: 'Địa chỉ', type: 'Text box', meaning: 'Cập nhật địa chỉ liên hệ', domain: 'String', defaultVal: 'Theo hồ sơ hiện tại', note: '' },
        { loc: (p) => p.locator('main label:has-text("Tải ảnh lên")').first(), name: 'Tải ảnh lên', type: 'Button / File upload', meaning: 'Tải lên ảnh đại diện mới từ thiết bị cá nhân', domain: 'Image (JPG/PNG/WEBP)', defaultVal: 'Không', note: '' },
        { loc: (p) => p.locator('main input[placeholder*="URL ảnh" i]').first(), name: 'URL ảnh đại diện', type: 'Text box', meaning: 'Hoặc dán trực tiếp đường dẫn ảnh đại diện', domain: 'URL String', defaultVal: 'Theo hồ sơ hiện tại', note: '' },
        { loc: (p) => p.getByRole('button', { name: 'Lưu thay đổi' }).first(), name: 'Lưu thay đổi', type: 'Button', meaning: 'Lưu các thông tin cá nhân vừa cập nhật', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );

    // UC9.1: Gửi đánh giá sản phẩm
    const profileReviewTab = page.getByRole('button', { name: /Đánh giá sản phẩm/i }).first();
    if (await profileReviewTab.isVisible().catch(() => false)) {
      await profileReviewTab.click().catch(() => {});
      await page.waitForTimeout(500);
      const writeReviewBtn = page.getByRole('button', { name: /Viết đánh giá|Đánh giá ngay/i }).first();
      if (await writeReviewBtn.isVisible().catch(() => false)) {
        await writeReviewBtn.click().catch(() => {});
        await page.waitForTimeout(450);
      }
      await annotateAuto(page, 'UC9.1', 'UC9_1', 'Giao diện Gửi đánh giá sản phẩm (SCR-9.1)', [...MODAL_SCOPES, 'main'], { maxItems: 8 });
      await page.keyboard.press('Escape').catch(() => {});
    }

    // UC1.12: Đổi mật khẩu
    await page.getByRole('button', { name: /Đổi mật khẩu|Bảo mật/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC1.12', 'UC1_12', 'Giao diện Đổi mật khẩu (SCR-1.12)', ['main form', 'main'], { maxItems: 6 });

    // UC3.1: Quản lý giỏ thuê và báo giá
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
    await annotateAuto(page, 'UC3.1', 'UC3_1', 'Giao diện Quản lý giỏ thuê và báo giá (SCR-3.1)', ['main', 'body'], { maxItems: 8 });

    // UC3.2: Tạo đơn thuê và giữ chỗ
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
    await annotateAuto(page, 'UC3.2', 'UC3_2', 'Giao diện Tạo đơn thuê và giữ chỗ (SCR-3.2)', ['main', 'body'], { maxItems: 9 });

    // UC5.1: Thanh toán và xác nhận đơn (chụp màn hình chờ thanh toán VietQR với đồng hồ 15p còn hiệu lực)
    const confirmBookingBtn = page.getByRole('button', { name: /Xác nhận đặt thuê|Tạo đơn|Thanh toán/i }).first();
    if (await confirmBookingBtn.isVisible().catch(() => false)) {
      await confirmBookingBtn.click().catch(() => {});
      await page.waitForSelector('text=/Thời hạn giữ chỗ còn lại|Xác nhận đã thanh toán VietQR/i', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.evaluate(() => window.scrollTo(0, 380));
    await page.waitForTimeout(300);
    await annotateAuto(page, 'UC5.1', 'UC5_1', 'Giao diện Thanh toán và xác nhận đơn (SCR-5.1)', ['main', 'body'], { maxItems: 7 });
    const payVietQrBtn = page.getByRole('button', { name: /Xác nhận đã thanh toán VietQR/i }).first();
    if (await payVietQrBtn.isVisible().catch(() => false)) {
      await payVietQrBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // UC3.3: Theo dõi đơn thuê — ưu tiên lọc tab "Chờ thanh toán" để hiển thị rõ nút "Tiếp tục thanh toán"
    await page.getByRole('button', { name: 'Đơn thuê' }).first().click().catch(() => {});
    await page.waitForTimeout(700);
    const pendingPayTab = page.locator('main button').filter({ hasText: /Chờ thanh toán \([1-9]/i }).first();
    if (await pendingPayTab.isVisible().catch(() => false)) {
      await pendingPayTab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await annotateCurated(
      page,
      'UC3.3',
      'UC3_3',
      'Giao diện Theo dõi đơn thuê (SCR-3.3)',
      [
        { loc: (p) => p.locator('main button').filter({ hasText: /^Tất cả/i }).first(), name: 'Bộ lọc Tất cả', type: 'Tab / Button', meaning: 'Hiển thị toàn bộ danh sách đơn thuê của khách hàng', domain: 'Null', defaultVal: 'Đang chọn', note: '' },
        { loc: (p) => p.locator('main button').filter({ hasText: /^Chờ thanh toán/i }).first(), name: 'Bộ lọc Chờ thanh toán', type: 'Tab / Button', meaning: 'Lọc các đơn đang giữ chỗ 15 phút chờ thanh toán', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('main button').filter({ hasText: /^Đã xác nhận/i }).first(), name: 'Bộ lọc Đã xác nhận', type: 'Tab / Button', meaning: 'Lọc các đơn đã thanh toán thành công', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('main button').filter({ hasText: /^Đang thuê/i }).first(), name: 'Bộ lọc Đang thuê', type: 'Tab / Button', meaning: 'Lọc các đơn đang trong thời gian thuê thiết bị', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        { loc: (p) => p.locator('main .cp-order-pay-now-btn, main button:has-text("Tiếp tục thanh toán")').first(), name: 'Tiếp tục thanh toán (15p)', type: 'Button', meaning: 'Mở lại màn hình thanh toán VietQR cho đơn đang giữ chỗ', domain: 'Null', defaultVal: 'Hiện với đơn Chờ thanh toán', note: '' },
        { loc: (p) => p.locator('main [class*="cursor-pointer"]').first(), name: 'Thẻ chi tiết đơn thuê', type: 'Card / Row', meaning: 'Nhấn vào để xem tiến độ đơn, BBBG, PNT và bảng đối soát cọc', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );
    // Trả về tab Tất cả trước khi sang UC3.4
    await page.locator('main button').filter({ hasText: /^Tất cả/i }).first().click().catch(() => {});
    await page.waitForTimeout(400);

    // UC3.4: Hủy đơn thuê (2 hình: Hình a chi tiết đơn có nút Yêu cầu hủy, Hình b hộp thoại xác nhận hủy)
    const confirmedTab = page.getByRole('button', { name: /Đã xác nhận/i }).first();
    if (await confirmedTab.isVisible().catch(() => false)) {
      await confirmedTab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const specificOrder = page.getByText('ORD-202611-110').first();
    if (await specificOrder.isVisible().catch(() => false)) {
      await specificOrder.click().catch(() => {});
    } else {
      await page.locator('main button:has-text("DH"), main button:has-text("ORD-"), main [class*="cursor-pointer"]').first().click().catch(() => {});
    }
    await page.waitForTimeout(600);
    const next34 = await annotateCurated(
      page,
      'UC3.4',
      'UC3_4_a',
      'Giao diện Hủy đơn thuê – Chi tiết đơn thuê có nút yêu cầu hủy (SCR-3.4)',
      [
        { loc: (p) => p.getByRole('button', { name: /Yêu cầu hủy đơn thuê/i }).first(), name: 'Yêu cầu hủy đơn thuê', type: 'Button', meaning: 'Mở hộp thoại xác nhận hủy đơn thuê hiện tại', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Chỉ hiển thị với đơn chưa bàn giao' },
      ],
      1
    );
    const cancelBtn = page.getByRole('button', { name: /Yêu cầu hủy đơn thuê/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      await annotateAuto(page, 'UC3.4', 'UC3_4_b', 'Giao diện Hủy đơn thuê – Hộp thoại xác nhận và nhập lý do hủy (SCR-3.4)', MODAL_SCOPES, { startIndex: next34, maxItems: 6 });
    }
    await page.keyboard.press('Escape').catch(() => {});
    const closeCancel = page.locator('[role="dialog"] button:has-text("✕"), [role="dialog"] button:has-text("Đóng")').first();
    if (await closeCancel.isVisible().catch(() => false)) await closeCancel.click().catch(() => {});

    // UC9.3: Xem thông báo (nhắm đúng khung danh sách thông báo trên header thay vì main)
    await page.getByRole('button', { name: 'Thông báo' }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    await annotateAuto(page, 'UC9.3', 'UC9_3', 'Giao diện Xem thông báo (SCR-9.3)', ['header', 'body'], { maxItems: 6 });

    await ctx.close();
  }

  // ================= 3. ADMIN WORKSPACE =================
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginForm(page, 'admin@geargo.vn', 'GearGo@2026', true);
    const content = page.locator('.internal-content');

    const closeModal = async () => {
      await clearAnnotations(page);
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
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(700);
        return true;
      }
      const tabLoose = page.getByRole('button', { name: exactLabel, exact: false }).first();
      if (await tabLoose.isVisible().catch(() => false)) {
        await tabLoose.scrollIntoViewIfNeeded();
        await tabLoose.click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(700);
        return true;
      }
      return false;
    };

    // --- PH1 ---
    await page.getByRole('button', { name: 'Nhân viên', exact: true }).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await clickTab('Nhân viên');
    const searchStaff = page.getByPlaceholder('Tìm theo tên, mã NV, username...').first();
    await searchStaff.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await searchStaff.isVisible().catch(() => false)) {
      await searchStaff.fill('Mai');
      await page.waitForTimeout(600);
      await annotateAuto(page, 'UC1.9', 'UC1_9', 'Giao diện Tra cứu nhân viên (SCR-1.9)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách nhân viên' });
      await searchStaff.fill('');
      await page.waitForTimeout(600);
    } else {
      await annotateAuto(page, 'UC1.9', 'UC1_9', 'Giao diện Tra cứu nhân viên (SCR-1.9)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách nhân viên' });
    }

    // UC1.11: Khóa và mở khóa tài khoản (2 hình: Hình a nút Khóa trên bảng, Hình b hộp thoại xác nhận khóa nếu mở được)
    const lockBtn = content.locator('button:has-text("Khóa"), button:has-text("Mở khóa")').first();
    const next111 = await annotateCurated(
      page,
      'UC1.11',
      'UC1_11_a',
      'Giao diện Khóa và mở khóa tài khoản – Danh sách nhân viên (SCR-1.11)',
      [
        { loc: () => lockBtn, name: 'Khóa / Mở khóa tài khoản', type: 'Button', meaning: 'Mở hộp thoại xác nhận khóa hoặc mở khóa tài khoản nhân viên tương ứng', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );
    if (await lockBtn.isVisible().catch(() => false)) {
      await lockBtn.click().catch(() => {});
      await page.waitForTimeout(450);
      const modalVisible = await page.locator(MODAL_SCOPES.join(',')).first().isVisible().catch(() => false);
      if (modalVisible) {
        await annotateAuto(page, 'UC1.11', 'UC1_11_b', 'Giao diện Khóa và mở khóa tài khoản – Hộp thoại xác nhận (SCR-1.11)', MODAL_SCOPES, { startIndex: next111, maxItems: 6 });
        await closeModal();
      }
    }

    // UC1.8: Cập nhật thông tin nhân viên
    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC1.8', 'UC1_8', 'Giao diện Cập nhật thông tin nhân viên (SCR-1.8)', MODAL_SCOPES, { maxItems: 10 });
    await closeModal();

    // UC1.7: Tạo tài khoản nhân viên
    await content.getByRole('button', { name: /\+ Thêm nhân viên mới/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC1.7', 'UC1_7', 'Giao diện Tạo tài khoản nhân viên (SCR-1.7)', MODAL_SCOPES, { maxItems: 10 });
    await closeModal();

    // UC1.10: Phân quyền nhân viên (chọn nhân viên không phải Admin để hiển thị đầy đủ ma trận checkbox quyền)
    const permBtns = content.getByRole('button', { name: /Phân quyền/i });
    const permBtn = (await permBtns.count()) > 1 ? permBtns.nth(1) : permBtns.first();
    if (await permBtn.isVisible().catch(() => false)) {
      await permBtn.click().catch(() => {});
      await page.waitForTimeout(550);
      await annotateAuto(page, 'UC1.10', 'UC1_10', 'Giao diện Phân quyền nhân viên (SCR-1.10)', MODAL_SCOPES, { maxItems: 8 });
      await closeModal();
    } else {
      await clickTab('Phân quyền');
      await page.waitForTimeout(800);
      await annotateAuto(page, 'UC1.10', 'UC1_10', 'Giao diện Phân quyền nhân viên (SCR-1.10)', ['.internal-content', 'main'], { maxItems: 8, tableName: 'Bảng ma trận phân quyền' });
    }

    // UC1.13: Tra cứu tài khoản khách hàng
    await clickTab('Khách hàng');
    await annotateAuto(page, 'UC1.13', 'UC1_13', 'Giao diện Tra cứu tài khoản khách hàng (SCR-1.13)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách khách hàng' });

    // --- PH4 & PH5 ---
    await clickTab('Đơn thuê');
    await annotateAuto(page, 'UC4.5', 'UC4_5', 'Giao diện Tra cứu đơn thuê cho vận hành (SCR-4.5)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng danh sách đơn thuê' });

    // UC5.4: Đối soát cọc và hoàn tất đơn — ưu tiên đơn mẫu ORD-202611-109, fallback lọc theo trạng thái Chờ đối soát
    const orderSearchInput = content.getByPlaceholder(/Tìm mã đơn/i).first();
    const orderStatusSelect = content.locator('select').first();
    if (await orderSearchInput.isVisible().catch(() => false)) {
      await orderSearchInput.fill('ORD-202611-109');
      await page.waitForTimeout(350);
    }
    let reconBtnLoc = content.locator('tr:has-text("ORD-202611-109")').getByRole('button', { name: 'Đối soát', exact: true }).first();
    if (!(await reconBtnLoc.isVisible().catch(() => false))) {
      // Nếu không tìm thấy mã mẫu (DB đã chạy test nhiều), xóa ô tìm và lọc theo trạng thái Chờ đối soát
      if (await orderSearchInput.isVisible().catch(() => false)) {
        await orderSearchInput.fill('');
        await page.waitForTimeout(300);
      }
      if (await orderStatusSelect.isVisible().catch(() => false)) {
        await orderStatusSelect.selectOption({ label: 'Chờ đối soát' }).catch(async () => {
          await orderStatusSelect.selectOption({ label: 'Hoàn tất' }).catch(() => {});
        });
        await page.waitForTimeout(400);
      }
      reconBtnLoc = content.getByRole('button', { name: /^(Đối soát|Xem đối soát)$/i }).first();
      if (!(await reconBtnLoc.isVisible().catch(() => false)) && (await orderStatusSelect.isVisible().catch(() => false))) {
        await orderStatusSelect.selectOption({ index: 0 }).catch(() => {});
        await page.waitForTimeout(400);
        reconBtnLoc = content.getByRole('button', { name: /^(Đối soát|Xem đối soát|Hồ sơ)$/i }).first();
      }
    }
    const next54 = await annotateCurated(
      page,
      'UC5.4',
      'UC5_4_a',
      'Giao diện Đối soát cọc và hoàn tất đơn – Chọn đơn cần đối soát (SCR-5.4)',
      [
        { loc: () => reconBtnLoc, name: 'Đối soát', type: 'Button', meaning: 'Mở bảng tổng hợp đối soát tiền cọc và phụ phí cho đơn thuê', domain: 'Null', defaultVal: 'Hiện khi đơn chờ đối soát', note: '' },
      ],
      1
    );
    await reconBtnLoc.click().catch(() => {});
    await page.waitForTimeout(700);
    await annotateAuto(page, 'UC5.4', 'UC5_4_b', 'Giao diện Đối soát cọc và hoàn tất đơn – Chi tiết đối soát và chốt đơn (SCR-5.4)', [...MODAL_SCOPES, '.internal-content'], { startIndex: next54, maxItems: 8 });
    if (await orderSearchInput.isVisible().catch(() => false)) {
      await orderSearchInput.fill('');
      await page.waitForTimeout(300);
    }
    if (await orderStatusSelect.isVisible().catch(() => false)) {
      await orderStatusSelect.selectOption({ index: 0 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    // UC5.6: Thực hiện hoàn tiền
    const refundOpenBtn = page.getByRole('button', { name: /Lập & xử lý hoàn tiền cọc|Hoàn tiền|Hoàn cọc/i }).first();
    if (await refundOpenBtn.isVisible().catch(() => false)) {
      await refundOpenBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await annotateAuto(page, 'UC5.6', 'UC5_6', 'Giao diện Thực hiện hoàn tiền (SCR-5.6)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    // UC5.5: Thu tiền bổ sung — chuyển sang Nhận trả & Phụ phí để chọn đúng đơn ORD-202611-108 (cần thu thêm 400k)
    await clickTab('Nhận trả & Phụ phí');
    const btn108 = content.locator('button:has-text("ORD-202611-108")').first();
    if (await btn108.isVisible().catch(() => false)) {
      await btn108.click().catch(() => {});
      await page.waitForTimeout(700);
    }
    const collectOpenBtn = page.getByRole('button', { name: /Thu thêm bổ sung|Thu thêm/i }).first();
    if (await collectOpenBtn.isVisible().catch(() => false)) {
      await collectOpenBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await annotateAuto(page, 'UC5.5', 'UC5_5', 'Giao diện Thu tiền bổ sung (SCR-5.5)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    // UC4.1: Chuẩn bị và phân công thiết bị — ưu tiên ORD-202611-102, fallback thẻ đơn đầu tiên
    await clickTab('Chuẩn bị & Bàn giao');
    let prepItem = content.locator('button:has-text("ORD-202611-102")').first();
    if (!(await prepItem.isVisible().catch(() => false))) {
      prepItem = content.locator('button').filter({ hasText: /DH|ORD-|DT-|Đã xác nhận|Đang chuẩn bị/i }).first();
    }
    if (await prepItem.isVisible().catch(() => false)) {
      await prepItem.click().catch(() => {});
      await page.waitForTimeout(700);
    }
    await annotateAuto(page, 'UC4.1', 'UC4_1', 'Giao diện Chuẩn bị và phân công thiết bị (SCR-4.1)', ['.internal-content'], { maxItems: 8 });

    // UC4.2: Bàn giao thiết bị — ưu tiên ORD-202611-107, fallback thẻ đơn Sẵn sàng đầu tiên
    const handoverTabBtn = content.getByRole('button', { name: /2\. Tiếp khách & Bàn giao/i }).first();
    if (await handoverTabBtn.isVisible().catch(() => false)) {
      await handoverTabBtn.click().catch(() => {});
      await page.waitForTimeout(600);
      let readyOrder = content.locator('button:has-text("ORD-202611-107")').first();
      if (!(await readyOrder.isVisible().catch(() => false))) {
        readyOrder = content.locator('button').filter({ hasText: /DH|ORD-|DT-|Sẵn sàng/i }).first();
      }
      if (await readyOrder.isVisible().catch(() => false)) {
        await readyOrder.click().catch(() => {});
        await page.waitForTimeout(700);
      }
    }
    await annotateAuto(page, 'UC4.2', 'UC4_2', 'Giao diện Bàn giao thiết bị (SCR-4.2)', ['.internal-content'], { maxItems: 8 });

    // UC4.3: Nhận trả và kiểm tra thiết bị — ưu tiên ORD-202610-001 (đơn quá hạn trả đợt 2), fallback thẻ đầu tiên
    await clickTab('Nhận trả & Phụ phí');
    let retItem = content.locator('button:has-text("ORD-202610-001"), button:has-text("ORD-202611-111")').first();
    if (!(await retItem.isVisible().catch(() => false))) {
      retItem = content.locator('button').filter({ hasText: /DH|ORD-|DT-|Đang thuê|Chờ đối soát/i }).first();
    }
    if (await retItem.isVisible().catch(() => false)) {
      await retItem.click().catch(() => {});
      await page.waitForTimeout(700);
    }
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
    await annotateAuto(page, 'UC4.3', 'UC4_3', 'Giao diện Nhận trả và kiểm tra thiết bị (SCR-4.3)', ['.internal-content'], { maxItems: 8 });

    // UC5.2: Lập phụ phí
    await page.evaluate(() => window.scrollBy(0, 260));
    await page.waitForTimeout(350);
    await annotateAuto(page, 'UC5.2', 'UC5_2', 'Giao diện Lập phụ phí (SCR-5.2)', ['.internal-content'], { maxItems: 8 });

    // UC4.4: Xử lý đơn quá hạn
    await page.evaluate(() => window.scrollTo(0, 0));
    const overdueItem = content.locator('button:has-text("Quá hạn")').first();
    if (await overdueItem.isVisible().catch(() => false)) {
      await overdueItem.click().catch(() => {});
      await page.waitForTimeout(500);
      const next44 = await annotateCurated(
        page,
        'UC4.4',
        'UC4_4_a',
        'Giao diện Xử lý đơn quá hạn – Cảnh báo quá hạn và nút thao tác (SCR-4.4)',
        [
          { loc: (p) => p.locator('.internal-content').getByRole('button', { name: /Nhật ký gọi/i }).first(), name: 'Nhật ký gọi', type: 'Button', meaning: 'Mở hộp thoại ghi nhận và xem lịch sử gọi nhắc khách trả thiết bị', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
          { loc: (p) => p.locator('.internal-content').getByRole('button', { name: /Lập phụ phí trễ/i }).first(), name: 'Lập phụ phí trễ', type: 'Button', meaning: 'Tự động tính và lập khoản phụ phí trễ hạn theo chính sách', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        ],
        1
      );
      const contactLogBtn = content.getByRole('button', { name: /Nhật ký gọi/i }).first();
      if (await contactLogBtn.isVisible().catch(() => false)) {
        await contactLogBtn.click().catch(() => {});
        await page.waitForTimeout(450);
        await annotateAuto(page, 'UC4.4', 'UC4_4_b', 'Giao diện Xử lý đơn quá hạn – Hộp thoại Nhật ký gọi khách hàng (SCR-4.4)', MODAL_SCOPES, { startIndex: next44, maxItems: 6 });
      }
    } else {
      await annotateAuto(page, 'UC4.4', 'UC4_4', 'Giao diện Xử lý đơn quá hạn (SCR-4.4)', ['.internal-content'], { maxItems: 7 });
    }
    await closeModal();

    // UC5.3: Duyệt và xử lý tranh chấp phụ phí (2 hình: Hình a danh sách tranh chấp, Hình b hộp thoại Xem chứng cứ & Kết luận)
    await clickTab('Tổng quan hệ thống');
    const resolveDisputeBtn = content.getByRole('button', { name: /Xem chứng cứ & Kết luận|Giải quyết|Xử lý/i }).first();
    const next53 = await annotateCurated(
      page,
      'UC5.3',
      'UC5_3_a',
      'Giao diện Duyệt và xử lý tranh chấp phụ phí – Trung tâm xử lý tranh chấp (SCR-5.3)',
      [
        { loc: () => resolveDisputeBtn, name: 'Xem chứng cứ & Kết luận', type: 'Button', meaning: 'Mở hộp thoại đối chiếu bằng chứng và ra quyết định xử lý tranh chấp phụ phí', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );
    if (await resolveDisputeBtn.isVisible().catch(() => false)) {
      await resolveDisputeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      await annotateAuto(page, 'UC5.3', 'UC5_3_b', 'Giao diện Duyệt và xử lý tranh chấp phụ phí – Hộp thoại xem chứng cứ và kết luận (SCR-5.3)', MODAL_SCOPES, { startIndex: next53, maxItems: 7 });
    }
    await closeModal();

    // UC5.7: Điều chỉnh tài chính sau chốt
    await clickTab('Bù trừ tài chính');
    const adjBtn = content.getByRole('button', { name: /Điều chỉnh|Tạo|Bù trừ/i }).first();
    if (await adjBtn.isVisible().catch(() => false)) {
      await adjBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await annotateAuto(page, 'UC5.7', 'UC5_7', 'Giao diện Điều chỉnh tài chính sau chốt (SCR-5.7)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    // --- PH6: Danh mục, Sản phẩm, Vòng đời thiết bị, Điều chỉnh kho, Kho & Bảo trì ---
    await clickTab('Danh mục');
    const searchCat = content.locator('input[placeholder*="Tìm" i]').first();
    if (await searchCat.isVisible().catch(() => false)) {
      await searchCat.fill('Lều');
      await page.waitForTimeout(400);
      await annotateAuto(page, 'UC6.3', 'UC6_3', 'Giao diện Tra cứu danh mục sản phẩm (SCR-6.3)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh mục sản phẩm' });
      await searchCat.fill('');
      await page.waitForTimeout(300);
    } else {
      await annotateAuto(page, 'UC6.3', 'UC6_3', 'Giao diện Tra cứu danh mục sản phẩm (SCR-6.3)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh mục sản phẩm' });
    }

    await annotateCurated(
      page,
      'UC6.4',
      'UC6_4',
      'Giao diện Thay đổi trạng thái danh mục (SCR-6.4)',
      [
        { loc: () => content.getByRole('button', { name: 'Ẩn', exact: true }).first(), name: 'Ẩn / Hiện danh mục', type: 'Button', meaning: 'Chuyển đổi trạng thái hiển thị của danh mục sản phẩm trên trang khách hàng', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );

    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC6.2', 'UC6_2', 'Giao diện Cập nhật danh mục sản phẩm (SCR-6.2)', MODAL_SCOPES, { maxItems: 8 });
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm danh mục/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC6.1', 'UC6_1', 'Giao diện Thêm danh mục sản phẩm (SCR-6.1)', MODAL_SCOPES, { maxItems: 8 });
    await closeModal();

    await clickTab('Sản phẩm');
    const searchSp = content.getByPlaceholder(/Tìm tên sản phẩm/i).first();
    if (await searchSp.isVisible().catch(() => false)) {
      await searchSp.fill('Lều');
      await page.waitForTimeout(400);
      await annotateAuto(page, 'UC6.7', 'UC6_7', 'Giao diện Tra cứu sản phẩm (SCR-6.7)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách sản phẩm' });
      await searchSp.fill('');
      await page.waitForTimeout(300);
    } else {
      await annotateAuto(page, 'UC6.7', 'UC6_7', 'Giao diện Tra cứu sản phẩm (SCR-6.7)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách sản phẩm' });
    }

    await content.locator('table tbody tr').first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateCurated(
      page,
      'UC6.8',
      'UC6_8',
      'Giao diện Thay đổi trạng thái kinh doanh sản phẩm (SCR-6.8)',
      [
        { loc: () => content.locator('table tbody tr').first(), name: 'Dòng sản phẩm được chọn', type: 'Table row', meaning: 'Chọn sản phẩm để mở khung chi tiết và thay đổi trạng thái kinh doanh', domain: 'Null', defaultVal: 'Đang chọn', note: '' },
        { loc: () => content.locator('.adm-detail-panel select').first(), name: 'Trạng thái kinh doanh', type: 'Combobox', meaning: 'Chọn trạng thái kinh doanh của sản phẩm (Đang kinh doanh, Tạm ngừng, Ngừng kinh doanh)', domain: 'Danh sách chọn', defaultVal: 'Đang kinh doanh', note: '' },
      ],
      1
    );

    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC6.6', 'UC6_6', 'Giao diện Cập nhật sản phẩm (SCR-6.6)', MODAL_SCOPES, { maxItems: 10 });
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm sản phẩm/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC6.5', 'UC6_5', 'Giao diện Thêm sản phẩm (SCR-6.5)', MODAL_SCOPES, { maxItems: 10 });
    await closeModal();

    await clickTab('Vòng đời thiết bị');
    await annotateAuto(page, 'UC6.9', 'UC6_9', 'Giao diện Tra cứu thiết bị và lịch sử sử dụng (SCR-6.9)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách thiết bị vật lý' });
    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC6.14', 'UC6_14', 'Giao diện Ngừng sử dụng thiết bị (SCR-6.14)', MODAL_SCOPES, { maxItems: 8 });
    await closeModal();

    await clickTab('Điều chỉnh kho');
    const checkImpactBtn = content.getByRole('button', { name: /Kiểm tra|Duyệt/i }).first();
    if (await checkImpactBtn.isVisible().catch(() => false)) {
      await checkImpactBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC6.11', 'UC6_11', 'Giao diện Duyệt điều chỉnh kho (SCR-6.11)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    const createAdjBtn = content.getByRole('button', { name: /Kiểm kê|Đề nghị|Tạo/i }).first();
    if (await createAdjBtn.isVisible().catch(() => false)) {
      await createAdjBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC6.10', 'UC6_10', 'Giao diện Kiểm kê và đề nghị điều chỉnh kho (SCR-6.10)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    await clickTab('Kho & Bảo trì');
    const transferBtn = content.getByRole('button', { name: /Điều chuyển/i }).first();
    if (await transferBtn.isVisible().catch(() => false)) {
      await transferBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC6.15', 'UC6_15', 'Giao diện Điều chuyển thiết bị sang sản phẩm khác (SCR-6.15)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
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
    await annotateAuto(page, 'UC6.13', 'UC6_13', 'Giao diện Nghiệm thu bảo trì (SCR-6.13)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    const createMaintBtn = content.getByRole('button', { name: /Tạo phiếu bảo trì/i }).first();
    if (await createMaintBtn.isVisible().catch(() => false)) {
      await createMaintBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC6.12', 'UC6_12', 'Giao diện Lập và theo dõi bảo trì (SCR-6.12)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    // --- PH7: Nhà cung cấp & Phiếu nhập ---
    await clickTab('Nhà cung cấp');
    const searchNcc = page.getByPlaceholder(/Tìm theo mã NCC/i).first();
    if (await searchNcc.isVisible().catch(() => false)) {
      await searchNcc.fill('Naturehike');
      await page.waitForTimeout(400);
      await annotateAuto(page, 'UC7.3', 'UC7_3', 'Giao diện Tra cứu nhà cung cấp (SCR-7.3)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách nhà cung cấp' });
      await searchNcc.fill('');
      await page.waitForTimeout(300);
    } else {
      await annotateAuto(page, 'UC7.3', 'UC7_3', 'Giao diện Tra cứu nhà cung cấp (SCR-7.3)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách nhà cung cấp' });
    }

    // UC7.4: Mở Hồ sơ NCC để hiển thị nút Ngừng hợp tác / Kích hoạt lại hợp tác
    const profileNccBtn = content.getByRole('button', { name: /Hồ sơ NCC/i }).first();
    if (await profileNccBtn.isVisible().catch(() => false)) {
      await profileNccBtn.click().catch(() => {});
      await page.waitForTimeout(550);
      await annotateCurated(
        page,
        'UC7.4',
        'UC7_4',
        'Giao diện Thay đổi tình trạng hợp tác (SCR-7.4)',
        [
          { loc: (p) => p.getByRole('button', { name: /Ngừng hợp tác|Kích hoạt lại hợp tác/i }).first(), name: 'Ngừng hợp tác / Kích hoạt lại hợp tác', type: 'Button', meaning: 'Thay đổi tình trạng hợp tác với nhà cung cấp tương ứng', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
        ],
        1
      );
      await closeModal();
    } else {
      await annotateAuto(page, 'UC7.4', 'UC7_4', 'Giao diện Thay đổi tình trạng hợp tác (SCR-7.4)', ['.internal-content'], { maxItems: 6 });
    }

    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC7.2', 'UC7_2', 'Giao diện Cập nhật nhà cung cấp (SCR-7.2)', MODAL_SCOPES, { maxItems: 9 });
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm NCC mới/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC7.1', 'UC7_1', 'Giao diện Thêm nhà cung cấp (SCR-7.1)', MODAL_SCOPES, { maxItems: 9 });
    await closeModal();

    await clickTab('Phiếu nhập');
    const draftPn = content.getByText('PN-2026-005').first();
    if (await draftPn.isVisible().catch(() => false)) {
      await draftPn.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await annotateAuto(page, 'UC7.8', 'UC7_8', 'Giao diện Tra cứu phiếu nhập (SCR-7.8)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng chi tiết phiếu nhập' });

    const editDraftBtn = content.getByRole('button', { name: /Sửa nháp/i }).first();
    if (await editDraftBtn.isVisible().catch(() => false)) {
      await editDraftBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC7.6', 'UC7_6', 'Giao diện Sửa phiếu nhập nháp (SCR-7.6)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    const inspectBtn = content.getByRole('button', { name: /Kiểm nhận & Chốt kho/i }).first();
    if (await inspectBtn.isVisible().catch(() => false)) {
      await inspectBtn.click().catch(() => {});
      await page.waitForTimeout(450);
    }
    await annotateAuto(page, 'UC7.7', 'UC7_7', 'Giao diện Kiểm tra và xác nhận nhập kho (SCR-7.7)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    // UC7.9: Chọn lại phiếu Nháp (PN-...) trước khi chụp để hiển thị nút Hủy nháp
    const draftPnForCancel = content.locator('button:has-text("PN-")').filter({ hasText: 'Nháp' }).first();
    if (await draftPnForCancel.isVisible().catch(() => false)) {
      await draftPnForCancel.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await annotateCurated(
      page,
      'UC7.9',
      'UC7_9',
      'Giao diện Hủy phiếu nhập nháp (SCR-7.9)',
      [
        { loc: () => content.getByRole('button', { name: /Hủy nháp/i }).first(), name: 'Hủy nháp', type: 'Button', meaning: 'Hủy bỏ phiếu nhập đang ở trạng thái nháp', domain: 'Null', defaultVal: 'Kích hoạt', note: 'Chỉ áp dụng cho phiếu nhập nháp' },
      ],
      1
    );

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
    await annotateAuto(page, 'UC7.10', 'UC7_10', 'Giao diện Xử lý sai lệch phiếu nhập (SCR-7.10)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 8 });
    await closeModal();

    await content.getByRole('button', { name: /Tạo phiếu nháp|\+ Tạo phiếu nhập|\+ Lập phiếu/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC7.5', 'UC7_5', 'Giao diện Lập phiếu nhập nháp (SCR-7.5)', [...MODAL_SCOPES, '.internal-content'], { maxItems: 9 });
    await closeModal();

    // --- PH8 ---
    await clickTab('Chính sách thuê');
    await annotateAuto(page, 'UC8.1', 'UC8_1', 'Giao diện Cấu hình chính sách (SCR-8.1)', ['.internal-content'], { maxItems: 9 });

    await clickTab('Khuyến mãi');
    const searchKm = page.getByPlaceholder(/Tìm kiếm theo mã code/i).first();
    if (await searchKm.isVisible().catch(() => false)) {
      await searchKm.fill('GEAR');
      await page.waitForTimeout(400);
      await annotateAuto(page, 'UC8.4', 'UC8_4', 'Giao diện Tra cứu khuyến mãi (SCR-8.4)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng chương trình khuyến mãi' });
      await searchKm.fill('');
      await page.waitForTimeout(300);
    } else {
      await annotateAuto(page, 'UC8.4', 'UC8_4', 'Giao diện Tra cứu khuyến mãi (SCR-8.4)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng chương trình khuyến mãi' });
    }

    await annotateCurated(
      page,
      'UC8.5',
      'UC8_5',
      'Giao diện Ngừng chương trình khuyến mãi (SCR-8.5)',
      [
        { loc: () => content.locator('button:has-text("Ngừng"), button:has-text("Tạm dừng")').first(), name: 'Ngừng / Tạm dừng khuyến mãi', type: 'Button', meaning: 'Ngừng hiệu lực áp dụng của chương trình khuyến mãi đang hoạt động', domain: 'Null', defaultVal: 'Kích hoạt', note: '' },
      ],
      1
    );

    await content.getByRole('button', { name: /Sửa|Chỉnh sửa/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC8.3', 'UC8_3', 'Giao diện Cập nhật khuyến mãi (SCR-8.3)', MODAL_SCOPES, { maxItems: 9 });
    await closeModal();

    await content.getByRole('button', { name: /\+ Thêm|\+ Tạo/i }).first().click().catch(() => {});
    await page.waitForTimeout(450);
    await annotateAuto(page, 'UC8.2', 'UC8_2', 'Giao diện Thêm khuyến mãi (SCR-8.2)', MODAL_SCOPES, { maxItems: 9 });
    await closeModal();

    // --- PH9 & PH10 ---
    await clickTab('Đánh giá');
    await annotateAuto(page, 'UC9.2', 'UC9_2', 'Giao diện Kiểm duyệt đánh giá (SCR-9.2)', ['.internal-content'], { maxItems: 7, tableName: 'Bảng danh sách đánh giá' });

    await clickTab('Thông báo HT');
    await annotateAuto(page, 'UC9.4', 'UC9_4', 'Giao diện Quản lý nội dung và gửi thông báo (SCR-9.4)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng lịch sử thông báo' });

    await clickTab('Báo cáo ca & Nhật ký');
    await annotateAuto(page, 'UC10.1', 'UC10_1', 'Giao diện Xem báo cáo vận hành (SCR-10.1)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng tổng hợp báo cáo vận hành' });

    await clickTab('Báo cáo Kho & TC');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // UC10.2: Báo cáo doanh thu thuần (Hình a) & Dòng tiền thực tế (Hình b)
    const revTab = content.getByRole('button', { name: /2\. Doanh thu thuần/i }).first();
    if (await revTab.isVisible().catch(() => false)) {
      await revTab.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    const next102 = await annotateAuto(page, 'UC10.2', 'UC10_2_a', 'Giao diện Xem báo cáo doanh thu và dòng tiền – Doanh thu thuần (SCR-10.2)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng thống kê doanh thu thuần' });

    const cashTab = content.getByRole('button', { name: /3\. Dòng tiền thực tế/i }).first();
    if (await cashTab.isVisible().catch(() => false)) {
      await cashTab.click().catch(() => {});
      await page.waitForTimeout(600);
      await annotateAuto(page, 'UC10.2', 'UC10_2_b', 'Giao diện Xem báo cáo doanh thu và dòng tiền – Dòng tiền thực tế (SCR-10.2)', ['.internal-content'], { startIndex: next102, maxItems: 7, tableName: 'Bảng thống kê dòng tiền thực tế' });
    }

    // UC10.3: Báo cáo nhập kho & tài sản
    const invRepTab = content.getByRole('button', { name: /4\. Nhập kho & Tài sản/i }).first();
    if (await invRepTab.isVisible().catch(() => false)) {
      await invRepTab.click().catch(() => {});
      await page.waitForTimeout(600);
    }
    await annotateAuto(page, 'UC10.3', 'UC10_3', 'Giao diện Xem báo cáo nhập hàng (SCR-10.3)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng thống kê chứng từ nhập kho' });

    await clickTab('Audit Log');
    await annotateAuto(page, 'UC10.4', 'UC10_4', 'Giao diện Tra cứu nhật ký và lịch sử (SCR-10.4)', ['.internal-content'], { maxItems: 8, tableName: 'Bảng nhật ký hoạt động hệ thống' });

    await ctx.close();
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  await browser.close();
  console.log(`Done! Captured ${Object.keys(manifest).length} UCs and saved manifest to ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
