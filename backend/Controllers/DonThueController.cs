using System.Text.Json;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GearGo.Models.DTOs.HuyDon;

namespace GearGo.Controllers;

[ApiController]
[Route("api/v1/don-thue")]
[Authorize]
public class DonThueController : ControllerBase
{
    private readonly IDonThueService _donThueService;
    private readonly ITruyVanDonThueService _truyVanService;
    private readonly IHuyDonService _huyDonService;
    private readonly ApplicationDbContext _context;

    public DonThueController(
        IDonThueService donThueService,
        ITruyVanDonThueService truyVanService,
        IHuyDonService huyDonService,
        ApplicationDbContext context)
    {
        _donThueService = donThueService;
        _truyVanService = truyVanService;
        _huyDonService = huyDonService;
        _context = context;
    }

    // ── W3-T1: truy vấn đơn của khách (mã khách lấy từ JWT, không nhận từ request) ──

    [HttpGet]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayDonCuaToi([FromQuery] TimDonRequest filter)
        => Ok(await _truyVanService.LayDonCuaToiAsync(filter, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayChiTiet(long id)
        => Ok(await _truyVanService.LayChiTietDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/lich-su")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayLichSu(long id)
        => Ok(await _truyVanService.LayLichSuDonCuaToiAsync(id, User.LayMaTaiKhoan()));

    [HttpGet("{id:long}/ban-giao")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> LayBienBanBanGiao(long id)
        => Ok(await _truyVanService.LayBienBanBanGiaoCuaKhachAsync(id, User.LayMaTaiKhoan()));

    // ── W2-UC05: Tạo đơn an toàn, chống IDOR ──

    [HttpPost]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> TaoDonThue([FromBody] TaoDonThueRequest request)
    {
        // 🔒 BẢO MẬT: Bắt buộc lấy MaKhachHang từ JWT, ghi đè toàn bộ dữ liệu giả mạo từ body
        long maTaiKhoan = User.LayMaTaiKhoan();
        long maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        request.MaKhachHang = maKhachHang;

        var result = await _donThueService.TaoDonThueAsync(request);
        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(result.DuLieu);
    }

    // ── W4-T7: hủy đơn của khách (chủ đơn lấy từ JWT) ──

    [HttpGet("{id:long}/huy/xem-truoc")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> XemTruocHuy(long id, CancellationToken ct)
        => Ok(await _huyDonService.XemTruocHuyAsync(id, User.LayMaTaiKhoan(), LoaiHuyDon.KhachHuy, ct));

    [HttpPost("{id:long}/huy")]
    [Authorize(Policy = "CustomerOnly")]
    public async Task<IActionResult> HuyDon(long id, [FromBody] HuyDonRequest request, CancellationToken ct)
        => Ok(await _huyDonService.KhachHuyAsync(id, request, User.LayMaTaiKhoan(), ct));

    /// <summary>
    /// Endpoint PUT hủy đơn (hỗ trợ tương thích ngược Tuần 2 & 3).
    /// Nhận lý do hủy từ JSON object { lyDo: "..." } hoặc raw string.
    /// Nếu đơn chưa thanh toán (ChoThanhToan) hoặc đã hủy: xử lý qua DonThueService (giải phóng giữ chỗ, kiểm tra IDOR).
    /// Nếu đơn đã thanh toán: đi qua HuyDonService theo chính sách hủy Week 4 (yêu cầu xem trước bảng phí).
    /// </summary>
    [HttpPut("{id:long}/huy")]
    [Authorize]
    public async Task<IActionResult> HuyDonThue(long id, [FromBody] JsonElement body, CancellationToken ct)
    {
        string lyDo = "Khách hàng hủy đơn";
        if (body.ValueKind == JsonValueKind.String)
        {
            lyDo = body.GetString() ?? lyDo;
        }
        else if (body.ValueKind == JsonValueKind.Object)
        {
            if (body.TryGetProperty("lyDo", out var prop) || body.TryGetProperty("LyDo", out prop))
            {
                lyDo = prop.GetString() ?? lyDo;
            }
        }

        long maTaiKhoan = User.LayMaTaiKhoan();

        // Kiểm tra sự tồn tại của đơn trước
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == id, ct);
        if (don == null)
        {
            return NotFound(new { maLoi = "NOT_FOUND", thongDiep = "Không tìm thấy đơn thuê." });
        }

        // Đơn đã thanh toán: chuyển sang HuyDonService theo quy trình Week 4
        if (don.TrangThai == TrangThaiDonThue.DaXacNhan || don.TrangThai == TrangThaiDonThue.DangThue)
        {
            return Ok(await _huyDonService.KhachHuyAsync(id, new HuyDonRequest(lyDo), maTaiKhoan, ct));
        }

        // Đơn chưa thanh toán hoặc đang ở trạng thái khác: xử lý qua DonThueService
        var result = await _donThueService.HuyDonAsync(id, lyDo, maTaiKhoan);
        if (!result.ThanhCong)
        {
            return BadRequest(new { result.MaLoi, result.ThongDiep });
        }

        return Ok(new { message = "Đã hủy đơn thành công!", result.DuLieu });
    }
}
