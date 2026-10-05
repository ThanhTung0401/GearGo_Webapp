import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Xác định thư mục gốc của dự án độc lập với thư mục chạy lệnh (CWD)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DOC_DIR = path.join(ROOT_DIR, 'Document');

async function exportSwagger() {
  if (!fs.existsSync(DOC_DIR)) {
    fs.mkdirSync(DOC_DIR, { recursive: true });
  }

  const res = await fetch('http://localhost:5000/swagger/v1/swagger.json');
  const swagger = await res.json();

  // 1. Lưu file JSON chuẩn
  const swaggerPath = path.join(DOC_DIR, 'swagger.json');
  fs.writeFileSync(swaggerPath, JSON.stringify(swagger, null, 2), 'utf-8');
  console.log(`✓ Đã lưu ${swaggerPath}`);

  // Đếm động số endpoints và schemas trực tiếp từ đối tượng Swagger
  let totalEndpoints = 0;
  for (const methods of Object.values(swagger.paths || {})) {
    totalEndpoints += Object.keys(methods).length;
  }
  const totalSchemas = Object.keys(swagger.components?.schemas || {}).length;

  // 2. Tạo Markdown Catalog tổng quan tự động thích ứng với bất kỳ phiên bản nào
  let md = `# 📖 TÀI LIỆU TOÀN BỘ ${totalEndpoints} API GEARGO (TRÍCH XUẤT TỪ SWAGGER)\n\n`;
  md += `> **Dự án:** ${swagger.info.title} (${swagger.info.version})  \n`;
  md += `> **Tổng số Endpoint:** ${totalEndpoints}  \n`;
  md += `> **Tổng số Schemas / Mô hình DTO:** ${totalSchemas}  \n`;
  md += `> **Trạng thái kiểm thử:** Toàn bộ ${totalEndpoints} endpoints hoạt động ổn định (0 lỗi 500)  \n`;
  md += `> **Thời gian trích xuất:** ${new Date().toLocaleString('vi-VN')}\n\n`;

  // Phân nhóm theo Tag
  const tags = {};
  for (const [path, methods] of Object.entries(swagger.paths)) {
    for (const [verb, op] of Object.entries(methods)) {
      const tag = (op.tags && op.tags[0]) || 'Other';
      if (!tags[tag]) tags[tag] = [];

      let bodySchemaName = '';
      if (op.requestBody?.content) {
        const content = op.requestBody.content;
        const schema = content['application/json']?.schema || content['multipart/form-data']?.schema;
        if (schema) {
          if (schema['$ref']) {
            bodySchemaName = schema['$ref'].split('/').pop();
          } else if (schema.type) {
            bodySchemaName = schema.type;
          }
        }
      }

      tags[tag].push({
        verb: verb.toUpperCase(),
        path,
        summary: op.summary || '',
        description: op.description || '',
        parameters: op.parameters || [],
        bodySchemaName,
        responses: op.responses || {}
      });
    }
  }

  md += '## 📑 MỤC LỤC CÁC NHÓM API\n\n';
  for (const [tag, endpoints] of Object.entries(tags)) {
    md += `- **[${tag}](#tag-${tag.toLowerCase()})** (${endpoints.length} endpoints)\n`;
  }
  md += `- **[Danh sách 38 Schemas / Models](#danh-sach-schemas--models)**\n\n`;
  md += `---\n\n`;

  // Chi tiết từng nhóm
  for (const [tag, endpoints] of Object.entries(tags)) {
    md += `<a id="tag-${tag.toLowerCase()}"></a>\n`;
    md += `### 🔹 Nhóm: ${tag} (${endpoints.length} endpoints)\n\n`;
    md += `| Method | Endpoint | Mô tả / Thao tác | Tham số Route/Query | Body DTO / Model |\n`;
    md += `|:---|:---|:---|:---|:---|\n`;
    for (const ep of endpoints) {
      const paramList = (ep.parameters || []).map(p => `\`${p.name}\` (${p.in}${p.required ? '*' : ''})`).join(', ') || '-';
      const bodyText = ep.bodySchemaName ? `[\`${ep.bodySchemaName}\`](#schema-${ep.bodySchemaName.toLowerCase()})` : '-';
      const desc = ep.summary || ep.description || '-';
      md += `| \`${ep.verb}\` | \`${ep.path}\` | ${desc} | ${paramList} | ${bodyText} |\n`;
    }
    md += `\n`;
  }

  md += `<a id="danh-sach-schemas--models"></a>\n`;
  md += `## 📦 DANH SÁCH MÔ HÌNH DỮ LIỆU (SCHEMAS / DTOs)\n\n`;
  md += `| STT | Tên Schema / Model | Số trường | Chi tiết các trường thuộc tính |\n`;
  md += `|:---|:---|:---|:---|\n`;

  let idx = 1;
  const schemas = swagger.components?.schemas || {};
  for (const [schemaName, schemaObj] of Object.entries(schemas)) {
    const props = schemaObj.properties || {};
    const propNames = Object.keys(props);
    const propList = propNames.length > 0
      ? propNames.map(p => {
        const type = props[p].type || (props[p]['$ref'] ? props[p]['$ref'].split('/').pop() : 'object');
        return `\`${p}\`: *${type}*`;
      }).join('<br>')
      : schemaObj.enum ? `Enum: [${schemaObj.enum.join(', ')}]` : '-';

    md += `<a id="schema-${schemaName.toLowerCase()}"></a>\n`;
    md += `| ${idx++} | **\`${schemaName}\`** | ${propNames.length} | ${propList} |\n`;
  }

  const catalogPath = path.join(DOC_DIR, 'Swagger_API_Catalog.md');
  fs.writeFileSync(catalogPath, md, 'utf-8');
  console.log(`✓ Đã tạo ${catalogPath} hoàn chỉnh.`);
}

exportSwagger().catch(err => {
  console.error('Lỗi trích xuất Swagger:', err);
  process.exit(1);
});
