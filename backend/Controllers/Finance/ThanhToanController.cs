using System.Net;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Helpers.Authorization;
using GearGo.Models.DTOs.ThanhToan;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Controllers.Finance;

[ApiController]
[Route("api/thanh-toan")]
public class ThanhToanController : BaseApiController
{
    private readonly IThanhToanService _thanhToanService;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public ThanhToanController(
        IThanhToanService thanhToanService,
        ApplicationDbContext context,
        IConfiguration config)
    {
        _thanhToanService = thanhToanService;
        _context = context;
        _config = config;
    }

    [HttpPost("xac-nhan")]
    [Authorize]
    public async Task<IActionResult> XacNhanThanhToan([FromBody] XacNhanThanhToanRequest request)
    {
        var result = await _thanhToanService.XacNhanThanhToanAsync(request, MaTaiKhoanHienTai);
        return result.ThanhCong
            ? Ok(new { MaThanhToan = result.DuLieu, ThongDiep = "Thanh toán thành công!" })
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    [HttpPost("doi-soat/{doiSoatId:long}/thu-bo-sung")]
    [Authorize]
    public async Task<IActionResult> TaoThuBoSung(long doiSoatId, [FromBody] TaoThuBoSungRequest? request)
    {
        var req = request ?? new TaoThuBoSungRequest();
        req.MaDoiSoat = doiSoatId;
        return HandleResult(await _thanhToanService.TaoThuBoSungAsync(req, MaTaiKhoanHienTai), LayStatusCode);
    }

    [HttpGet("{id}/trang-thai")]
    [Authorize]
    public async Task<IActionResult> LayTrangThaiGiaoDich(string id)
        => HandleResult(await _thanhToanService.LayTrangThaiGiaoDichAsync(id, MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("callback/thu-bo-sung")]
    [AllowAnonymous]
    public async Task<IActionResult> CallbackThuBoSung([FromBody] XuLyCallbackRequest request)
        => HandleResult(await _thanhToanService.XuLyCallbackThuBoSungAsync(request), LayStatusCode);

    [HttpGet("can-doi-chieu")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DoiSoat_Xem)]
    public async Task<IActionResult> LayDanhSachCanDoiChieu()
        => HandleResult(await _thanhToanService.LayDanhSachCanDoiChieuAsync(MaTaiKhoanHienTai), LayStatusCode);

    [HttpPost("{id:long}/doi-chieu")]
    [Authorize]
    [RequirePermission(DomainConstants.Permissions.DoiSoat_Chot)]
    public async Task<IActionResult> DoiChieuGiaoDich(long id, [FromBody] DoiChieuGiaoDichRequest request)
    {
        var result = await _thanhToanService.DoiChieuGiaoDichAsync(id, request, MaTaiKhoanHienTai);
        return result.ThanhCong
            ? Ok(new { ThongDiep = result.DuLieu })
            : StatusCode(LayStatusCode(result.MaLoi), new { result.MaLoi, result.ThongDiep });
    }

    public sealed class TaoVnPayUrlRequest
    {
        public long? MaDonThue { get; set; }
        public long? MaDoiSoat { get; set; }
        public string? BankCode { get; set; }
        public string? FrontendReturnBaseUrl { get; set; }
    }

    /// <summary>
    /// Tạo URL chuyển hướng sang cổng thanh toán VNPay Sandbox cho đơn thuê ban đầu hoặc thu bổ sung đối soát.
    /// </summary>
    [HttpPost("vnpay/tao-url")]
    [Authorize]
    public async Task<IActionResult> TaoVnPayUrl([FromBody] TaoVnPayUrlRequest request)
    {
        var (tmnCode, hashSecret, baseUrl, defaultFeBase) = LayCauHinhVnPay();
        if (string.IsNullOrWhiteSpace(tmnCode) || string.IsNullOrWhiteSpace(hashSecret))
            return BadRequest(new { MaLoi = "VNPAY_CONFIG_MISSING", ThongDiep = "Thiếu cấu hình VNPay Sandbox." });

        var ipAddr = HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1";
        if (ipAddr == "0.0.0.1" || ipAddr == "::1") ipAddr = "127.0.0.1";

        var feBase = !string.IsNullOrWhiteSpace(request.FrontendReturnBaseUrl)
            ? request.FrontendReturnBaseUrl.TrimEnd('/')
            : defaultFeBase;
        var returnUrl = $"{Request.Scheme}://{Request.Host}/api/thanh-toan/vnpay-return?fe={WebUtility.UrlEncode(feBase)}";

        // Luồng 1: Thu tiền bổ sung sau đối soát (UC5.5)
        if (request.MaDoiSoat.HasValue && request.MaDoiSoat.Value > 0)
        {
            var thuRes = await _thanhToanService.TaoThuBoSungAsync(
                new TaoThuBoSungRequest { MaDoiSoat = request.MaDoiSoat.Value, PhuongThucDuocHoTro = "VNPAY" },
                MaTaiKhoanHienTai);
            if (!thuRes.ThanhCong || thuRes.DuLieu == null)
                return StatusCode(LayStatusCode(thuRes.MaLoi), new { thuRes.MaLoi, thuRes.ThongDiep });

            var yeuCau = thuRes.DuLieu;
            // Thêm hậu tố '-timestamp' vào vnp_TxnRef để tránh trùng mã GD trên VNPay Sandbox mà không cắt nhầm dấu '_' trong MaYeuCau
            var txnRefThuBoSung = $"{yeuCau.MaYeuCau}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            var paymentUrl = VnPayLibrary.BuildPaymentUrl(
                baseUrl, tmnCode, hashSecret,
                txnRef: txnRefThuBoSung,
                amountVnd: yeuCau.SoTien,
                orderInfo: $"Thu bo sung doi soat {request.MaDoiSoat.Value} ma {yeuCau.MaYeuCau}",
                returnUrl: returnUrl,
                ipAddr: ipAddr,
                bankCode: request.BankCode);

            return Ok(new { paymentUrl, maYeuCau = yeuCau.MaYeuCau, soTien = yeuCau.SoTien });
        }

        // Luồng 2: Thanh toán đơn thuê ban đầu (UC5.1)
        if (!request.MaDonThue.HasValue || request.MaDonThue.Value <= 0)
            return BadRequest(new { MaLoi = "INVALID_DATA", ThongDiep = "Cần cung cấp MaDonThue hoặc MaDoiSoat." });

        var don = await _context.DonThues.AsNoTracking()
            .Include(d => d.ChiTietDonThues)
            .FirstOrDefaultAsync(d => d.MaDonThue == request.MaDonThue.Value);
        if (don == null)
            return NotFound(new { MaLoi = "DON_THUE_NOT_FOUND", ThongDiep = "Không tìm thấy đơn thuê." });

        var tongCanThu = don.ChiTietDonThues.Any()
            ? don.ChiTietDonThues.Sum(c => (c.DonGiaThueMoiNgay * c.SoNgayTinhTien + c.MucCocMoiThietBi) * c.SoLuong - c.TienGiam)
            : (don.TongTienThueTruocGiam - don.TongTienGiam + don.TongTienCoc);
        if (tongCanThu <= 0)
            return BadRequest(new { MaLoi = "INVALID_AMOUNT", ThongDiep = "Tổng tiền cần thanh toán không hợp lệ." });

        var txnRef = $"DH_{don.MaDonThue}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        var orderPayUrl = VnPayLibrary.BuildPaymentUrl(
            baseUrl, tmnCode, hashSecret,
            txnRef: txnRef,
            amountVnd: tongCanThu,
            orderInfo: $"Thanh toan don thue {don.MaDonHienThi ?? don.MaDonThue.ToString()}",
            returnUrl: returnUrl,
            ipAddr: ipAddr,
            bankCode: request.BankCode);

        return Ok(new { paymentUrl = orderPayUrl, maYeuCau = txnRef, soTien = tongCanThu });
    }

    /// <summary>
    /// Return URL khi khách hàng thanh toán xong trên VNPay Sandbox và được chuyển hướng về hệ thống.
    /// </summary>
    [HttpGet("vnpay-return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn([FromQuery] string? fe)
    {
        var (_, hashSecret, _, defaultFeBase) = LayCauHinhVnPay();
        var feBase = !string.IsNullOrWhiteSpace(fe) ? fe.TrimEnd('/') : defaultFeBase;

        var validSig = VnPayLibrary.ValidateSignature(Request.Query, hashSecret);
        var txnRef = Request.Query["vnp_TxnRef"].ToString();
        var rspCode = Request.Query["vnp_ResponseCode"].ToString();
        var txStatus = Request.Query["vnp_TransactionStatus"].ToString();
        var transNo = Request.Query["vnp_TransactionNo"].ToString();
        decimal.TryParse(Request.Query["vnp_Amount"].ToString(), out var rawAmount);
        var amountVnd = rawAmount / 100m;

        var isOrderFlow = txnRef.StartsWith("DH_", StringComparison.OrdinalIgnoreCase);
        long parsedOrderId = 0;
        if (isOrderFlow)
        {
            var parts = txnRef.Split('_');
            if (parts.Length >= 2) long.TryParse(parts[1], out parsedOrderId);
        }

        if (!validSig)
        {
            var errMsg = WebUtility.UrlEncode("Chữ ký VNPay không hợp lệ (Checksum failed).");
            return Redirect(isOrderFlow
                ? $"{feBase}/order-confirmed?vnpay=failed&orderId={parsedOrderId}&code=97&msg={errMsg}"
                : $"{feBase}/staff/return?vnpay=failed&maYeuCau={WebUtility.UrlEncode(txnRef)}&code=97&msg={errMsg}");
        }

        var isSuccess = rspCode == "00" && (string.IsNullOrEmpty(txStatus) || txStatus == "00");
        var msg = VnPayLibrary.GetResponseMessage(rspCode);

        if (isSuccess)
        {
            if (isOrderFlow && parsedOrderId > 0)
            {
                var confirmRes = await _thanhToanService.XacNhanThanhToanAsync(new XacNhanThanhToanRequest(
                    parsedOrderId,
                    "VNPAY",
                    amountVnd,
                    string.IsNullOrWhiteSpace(transNo) ? txnRef : $"VNP_{transNo}"));
                if (!confirmRes.ThanhCong)
                {
                    isSuccess = false;
                    msg = confirmRes.ThongDiep ?? "Không thể xác nhận thanh toán đơn thuê.";
                }
            }
            else if (!string.IsNullOrWhiteSpace(txnRef))
            {
                var maYeuCauGoc = txnRef.Contains('-') ? txnRef.Split('-')[0] : txnRef;
                var cbRes = await _thanhToanService.XuLyCallbackThuBoSungAsync(new XuLyCallbackRequest
                {
                    MaYeuCau = maYeuCauGoc,
                    MaGiaoDichCong = string.IsNullOrWhiteSpace(transNo) ? $"VNP_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" : $"VNP_{transNo}",
                    SoTien = amountVnd,
                    TrangThai = "ThanhCong"
                });
                if (!cbRes.ThanhCong)
                {
                    isSuccess = false;
                    msg = cbRes.ThongDiep ?? "Không thể cập nhật kết quả thu bổ sung.";
                }
            }
        }

        var statusParam = isSuccess ? "success" : "failed";
        var encodedMsg = WebUtility.UrlEncode(msg);
        if (isOrderFlow)
            return Redirect($"{feBase}/order-confirmed?vnpay={statusParam}&orderId={parsedOrderId}&code={rspCode}&msg={encodedMsg}");

        return Redirect($"{feBase}/staff/return?vnpay={statusParam}&maYeuCau={WebUtility.UrlEncode(txnRef)}&code={rspCode}&msg={encodedMsg}");
    }

    /// <summary>
    /// IPN URL (Server-to-Server) chuẩn VNPay: xác thực checksum, cập nhật DB và trả RspCode JSON.
    /// </summary>
    [HttpGet("vnpay-ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn()
    {
        var (_, hashSecret, _, _) = LayCauHinhVnPay();
        if (!VnPayLibrary.ValidateSignature(Request.Query, hashSecret))
            return Ok(new { RspCode = "97", Message = "Invalid signature" });

        var txnRef = Request.Query["vnp_TxnRef"].ToString();
        var rspCode = Request.Query["vnp_ResponseCode"].ToString();
        var txStatus = Request.Query["vnp_TransactionStatus"].ToString();
        var transNo = Request.Query["vnp_TransactionNo"].ToString();
        decimal.TryParse(Request.Query["vnp_Amount"].ToString(), out var rawAmount);
        var amountVnd = rawAmount / 100m;

        var isSuccess = rspCode == "00" && (string.IsNullOrEmpty(txStatus) || txStatus == "00");
        if (!isSuccess)
            return Ok(new { RspCode = "00", Message = "Confirm Failed Transaction" });

        if (txnRef.StartsWith("DH_", StringComparison.OrdinalIgnoreCase))
        {
            var parts = txnRef.Split('_');
            if (parts.Length < 2 || !long.TryParse(parts[1], out var donId))
                return Ok(new { RspCode = "01", Message = "Order not found" });

            var res = await _thanhToanService.XacNhanThanhToanAsync(new XacNhanThanhToanRequest(
                donId,
                "VNPAY",
                amountVnd,
                string.IsNullOrWhiteSpace(transNo) ? txnRef : $"VNP_{transNo}"));
            return Ok(res.ThanhCong
                ? new { RspCode = "00", Message = "Confirm Success" }
                : new { RspCode = "02", Message = res.ThongDiep ?? "Order already confirmed" });
        }

        var maYeuCauIpn = txnRef.Contains('-') ? txnRef.Split('-')[0] : txnRef;
        var cbRes = await _thanhToanService.XuLyCallbackThuBoSungAsync(new XuLyCallbackRequest
        {
            MaYeuCau = maYeuCauIpn,
            MaGiaoDichCong = string.IsNullOrWhiteSpace(transNo) ? $"VNP_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" : $"VNP_{transNo}",
            SoTien = amountVnd,
            TrangThai = "ThanhCong"
        });
        return Ok(cbRes.ThanhCong
            ? new { RspCode = "00", Message = "Confirm Success" }
            : new { RspCode = "01", Message = cbRes.ThongDiep ?? "Transaction not found" });
    }

    private (string TmnCode, string HashSecret, string BaseUrl, string FrontendReturnBaseUrl) LayCauHinhVnPay()
    {
        var tmn = Environment.GetEnvironmentVariable("VNP_TMN_CODE") ?? _config["VnPay:TmnCode"] ?? "";
        var secret = Environment.GetEnvironmentVariable("VNP_HASH_SECRET") ?? _config["VnPay:HashSecret"] ?? "";
        var url = Environment.GetEnvironmentVariable("VNP_URL") ?? _config["VnPay:BaseUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        var fe = Environment.GetEnvironmentVariable("VNP_FRONTEND_URL") ?? _config["VnPay:FrontendReturnBaseUrl"] ?? "http://localhost:8443";
        return (tmn, secret, url, fe);
    }

    private static int LayStatusCode(string? maLoi) => maLoi switch
    {
        "DON_THUE_NOT_FOUND" or "DOI_SOAT_NOT_FOUND" or "GIAO_DICH_NOT_FOUND" => 404,
        "KHONG_CO_QUYEN" => 403,
        "KHONG_CO_NGHIA_VU_THU_THEM" or "THU_THEM_DANG_CHO" or "SO_TIEN_GATEWAY_KHONG_KHOP" or "TIEN_VE_SAU_HUY" => 409,
        _ => 400
    };
}

