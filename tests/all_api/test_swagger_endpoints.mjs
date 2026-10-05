/**
 * Script tự động quét và kiểm thử toàn bộ 80 endpoints từ Swagger JSON của GearGo Backend
 * Nguồn: http://localhost:5000/swagger/v1/swagger.json
 * Chạy: node tests/all_api/test_swagger_endpoints.mjs
 */

import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const JWT_SECRET = 'GearGoSecretKey2026_ThisKeyMustBeAtLeast32Chars!';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function generateToken(role, maTaiKhoan = 1, email = 'admin@geargo.vn') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    'MaTaiKhoan': maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': maTaiKhoan.toString(),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': email,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
    'exp': now + 7 * 24 * 3600
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const adminToken = generateToken('QuanTriVien', 1, 'admin@geargo.vn');

async function testAllSwaggerEndpoints() {
  console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}    QUÉT & KIỂM THỬ TRỰC TIẾP TỪ SWAGGER JSON (80 ENDPOINTS)    ${colors.reset}`);
  console.log(`${colors.cyan}    Mục tiêu: ${BASE_URL}/swagger/v1/swagger.json${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

  let swaggerDoc;
  try {
    const res = await fetch(`${BASE_URL}/swagger/v1/swagger.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    swaggerDoc = await res.json();
  } catch (err) {
    console.error(`${colors.red}✖ Không thể tải swagger.json: ${err.message}${colors.reset}`);
    process.exit(1);
  }

  const paths = Object.keys(swaggerDoc.paths || {});
  let totalEndpoints = 0;
  let passed = 0;
  let failed = 0;

  for (const p of paths) {
    for (const m of Object.keys(swaggerDoc.paths[p])) {
      totalEndpoints++;
      const method = m.toUpperCase();
      // Thay thế param {id}, {donId}... bằng 1 để test probe
      const resolvedPath = p.replace(/\{[^}]+\}/g, '1');
      const url = `${BASE_URL}${resolvedPath}`;

      try {
        const headers = {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        };
        const options = { method, headers };
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          options.body = JSON.stringify({});
        }

        const res = await fetch(url, options);
        // Không bị 500 (Internal Server Error) là đạt (các mã 200, 201, 204, 400, 403, 404, 409 đều là handled responses)
        const isHealthy = res.status !== 500 && res.status !== 502 && res.status !== 503;

        if (isHealthy) {
          console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${method.padEnd(6)} ${p} -> Status: ${res.status}`);
          passed++;
        } else {
          console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${method.padEnd(6)} ${p} -> Status: ${res.status} (Internal Server Error)`);
          failed++;
        }
      } catch (err) {
        console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${method.padEnd(6)} ${p} -> Error: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n${colors.cyan}${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.bold}TỔNG KẾT SWAGGER:${colors.reset} ${passed}/${totalEndpoints} endpoints hoạt động ổn định (${failed} lỗi 500).`);
  console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testAllSwaggerEndpoints();
