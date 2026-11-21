# Tích hợp n8n + Gemini + Mail cho GearGo

## 1. Khởi chạy n8n self-host
```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_KEY"
docker compose -f integrations/n8n/docker-compose.n8n.yml up -d
```
Mở `http://localhost:5678`, import 2 workflow:
- `workflow_tu_van_thiet_bi_gemini.json` → webhook `POST http://localhost:5678/webhook/geargo-tu-van-thiet-bi`
- `workflow_faq_ngan_gemini.json` → webhook `POST http://localhost:5678/webhook/geargo-faq-ngan`

## 2. Kích hoạt trên Backend
Cấu hình biến môi trường (xem `.env.example`):
- **n8n + Gemini:** `TuVanOptions__Provider=N8n`, `TuVanOptions__N8nWebhookUrl=http://localhost:5678/webhook/geargo-tu-van-thiet-bi`, `TuVanOptions__Model=gemini-2.5-flash`.
- **Mail SendGrid:** `SendGrid__ApiKey=SG.xxx`, `SendGrid__FromEmail=no-reply@geargo.vn`.
- **Hoặc SMTP Gmail:** `EmailSettings__SmtpServer=smtp.gmail.com`, `EmailSettings__Port=587`, `EmailSettings__SenderEmail=...`, `EmailSettings__SenderPassword=...`.
