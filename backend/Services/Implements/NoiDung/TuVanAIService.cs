using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Integrations.AI;
using GearGo.Models.DTOs.TuVan;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public partial class TuVanAIService : ITuVanAIService
{
    private readonly ApplicationDbContext _context;
    private readonly IAIProvider _aiProvider;
    private readonly IGoiYBoDoService _goiYBoDoService;
    private readonly IKhaDungService _khaDungService;
    private readonly ILogger<TuVanAIService> _logger;

    public TuVanAIService(
        ApplicationDbContext context, IAIProvider aiProvider, IGoiYBoDoService goiYBoDoService,
        IKhaDungService khaDungService, ILogger<TuVanAIService> logger)
    {
        _context = context; _aiProvider = aiProvider; _goiYBoDoService = goiYBoDoService;
        _khaDungService = khaDungService; _logger = logger;
    }

    public async Task<TuVanBoDoResponse> TuVanAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default)
    {
        ValidateInput(request);

        var coNgayThue = request.GioNhan.HasValue && request.GioTra.HasValue;
        int thoiGianThueNgay = coNgayThue
            ? CalculationHelpers.TinhSoNgayThue(request.GioNhan!.Value, request.GioTra!.Value)
            : 1;

        var candidates = await LayDanhSachUngVienAsync(request, cancellationToken);
        if (!candidates.Any())
            return new TuVanBoDoResponse
            {
                NguonGoiY = "QuyTac", TrangThai = "KhongTimThayPhuongAn",
                ThoiDiemKiemTra = DateTime.UtcNow, ThongBaoPhanThieu = "Hiện không có sản phẩm nào khả dụng để gợi ý."
            };

        var aiResult = await GoiAiAnToanAsync(request, candidates, cancellationToken);
        if (!aiResult.ThanhCong || !aiResult.Selections.Any())
        {
            _logger.LogInformation("Sử dụng gợi ý theo quy tắc dự phòng do AI không thành công: {Loi}", aiResult.Loi);
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        var validSelections = LocKetQuaAI(aiResult.Selections, candidates, thoiGianThueNgay);
        if (!validSelections.Any())
        {
            _logger.LogWarning("AI trả toàn bộ sản phẩm không hợp lệ, chuyển sang quy tắc dự phòng");
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        var tongSucChuaLeu = validSelections
            .Where(s => s.TenSanPham.Contains("Lều", StringComparison.OrdinalIgnoreCase) && s.SucChua.HasValue)
            .Sum(s => s.SucChua!.Value * s.SoLuong);
        if (tongSucChuaLeu < request.SoNguoi)
        {
            _logger.LogWarning("AI gợi ý lều sức chứa {SucChua} < {SoNguoi} người, fallback quy tắc", tongSucChuaLeu, request.SoNguoi);
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        return KiemTraNganSachVaDongGoi(request, aiResult, validSelections, candidates, coNgayThue, thoiGianThueNgay);
    }

    private async Task<AiProviderResult> GoiAiAnToanAsync(
        TuVanBoDoRequest request, List<AiCandidate> candidates, CancellationToken ct)
    {
        try { return await _aiProvider.GoiAsync(request, candidates, ct); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gọi AI thất bại, chuyển sang phương án dự phòng theo quy tắc");
            return new AiProviderResult { ThanhCong = false, Loi = ex.Message, ProviderUsed = "Fallback" };
        }
    }

    private List<DongGoiYResponse> LocKetQuaAI(
        IEnumerable<AiSelection> selections, List<AiCandidate> candidates, int thoiGianThueNgay)
    {
        var candidateDict = candidates.ToDictionary(c => c.MaSanPham);
        var validSelections = new List<DongGoiYResponse>();
        foreach (var sel in selections)
        {
            if (!candidateDict.TryGetValue(sel.MaSanPham, out var cand) || sel.SoLuong <= 0)
            {
                _logger.LogWarning("Bỏ qua sản phẩm AI đề xuất: {Ma}, SL={Qty}", sel.MaSanPham, sel.SoLuong);
                continue;
            }
            validSelections.Add(new DongGoiYResponse
            {
                MaSanPham = cand.MaSanPham, MaSanPhamHienThi = cand.MaSanPhamHienThi, TenSanPham = cand.TenSanPham,
                SoLuong = sel.SoLuong, SucChua = cand.SucChua, DonGiaThueMoiNgay = cand.GiaThueMoiNgay,
                MucCocMoiThietBi = cand.MucCocMoiThietBi,
                TienThue = cand.GiaThueMoiNgay * sel.SoLuong * thoiGianThueNgay,
                TienCoc = cand.MucCocMoiThietBi * sel.SoLuong, SoLuongKhaDung = cand.SoLuongKhaDung,
                LyDo = string.IsNullOrWhiteSpace(sel.LyDo) ? "AI đề xuất phù hợp" : sel.LyDo
            });
        }
        return validSelections;
    }

    private TuVanBoDoResponse KiemTraNganSachVaDongGoi(
        TuVanBoDoRequest request, AiProviderResult aiResult, List<DongGoiYResponse> validSelections,
        List<AiCandidate> candidates, bool coNgayThue, int thoiGianThueNgay)
    {
        var tongTienThue = validSelections.Sum(s => s.TienThue);
        var tongTienCoc = validSelections.Sum(s => s.TienCoc);
        var tongBanDau = tongTienThue + tongTienCoc;

        if (request.NganSach is > 0)
        {
            var isTongBanDau = string.Equals(request.LoaiNganSach, "TongBanDau", StringComparison.OrdinalIgnoreCase);
            var chiPhiSoSanh = isTongBanDau ? tongBanDau : tongTienThue;
            if (chiPhiSoSanh > request.NganSach.Value)
            {
                var fallback = _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
                if (fallback.TrangThai == "ThanhCong") return fallback;

                return new TuVanBoDoResponse
                {
                    NguonGoiY = aiResult.ProviderUsed, TrangThai = "KhongTimThayPhuongAn",
                    GioNhan = request.GioNhan, GioTra = request.GioTra,
                    ThoiGianThueNgay = coNgayThue ? thoiGianThueNgay : null, ThoiDiemKiemTra = DateTime.UtcNow,
                    TongTienThue = coNgayThue ? tongTienThue : null, TongTienCoc = tongTienCoc,
                    TongBanDau = coNgayThue ? tongBanDau : null,
                    ThongBaoPhanThieu = $"Ngân sách {request.NganSach:N0} đ không đủ cho bộ đồ ({chiPhiSoSanh:N0} đ). Vui lòng tăng ngân sách hoặc điều chỉnh ngày thuê.",
                    CacDong = validSelections
                };
            }
        }

        return new TuVanBoDoResponse
        {
            NguonGoiY = string.Equals(aiResult.ProviderUsed, "Mock", StringComparison.OrdinalIgnoreCase) ? "Mock" : "AI",
            TrangThai = coNgayThue ? "ThanhCong" : "CanBoSungThongTin",
            GioNhan = request.GioNhan, GioTra = request.GioTra,
            ThoiGianThueNgay = coNgayThue ? thoiGianThueNgay : null, ThoiDiemKiemTra = DateTime.UtcNow,
            TongTienThue = coNgayThue ? tongTienThue : null, TongTienCoc = tongTienCoc,
            TongBanDau = coNgayThue ? tongBanDau : null,
            ThongBaoPhanThieu = coNgayThue ? null : "Chưa có ngày thuê, giá hiển thị là tham khảo theo ngày và cọc theo số lượng.",
            CacDong = validSelections
        };
    }

    public async Task<TuVanBoDoResponse> KiemTraVaTinhLaiBoDoAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default)
    {
        // Nếu khách truyền bộ đồ đã chỉnh sửa thì kiểm tra khả dụng & tính lại giá trực tiếp, không gọi lại AI (UC2.4 bước 5)
        if (request.CacDongHienTai == null || request.CacDongHienTai.Count == 0)
            return await TuVanAsync(request, cancellationToken);

        ValidateInput(request);
        var coNgayThue = request.GioNhan.HasValue && request.GioTra.HasValue;
        int thoiGianThueNgay = coNgayThue
            ? CalculationHelpers.TinhSoNgayThue(request.GioNhan!.Value, request.GioTra!.Value)
            : 1;

        var productIds = request.CacDongHienTai.Select(d => d.MaSanPham).Distinct().ToList();
        var products = await _context.SanPhams.AsNoTracking()
            .Where(s => productIds.Contains(s.MaSanPham) && s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh)
            .ToDictionaryAsync(s => s.MaSanPham, cancellationToken);

        var availability = coNgayThue
            ? await _khaDungService.LayKhaDungNhieuAsync(productIds, request.GioNhan!.Value, request.GioTra!.Value)
            : new Dictionary<long, int>();

        var validSelections = new List<DongGoiYResponse>();
        var thieuThongBao = new List<string>();
        decimal tongTienThue = 0, tongTienCoc = 0;

        foreach (var item in request.CacDongHienTai)
        {
            if (item.SoLuong <= 0 || !products.TryGetValue(item.MaSanPham, out var sp))
            {
                thieuThongBao.Add($"Sản phẩm #{item.MaSanPham} không còn kinh doanh hoặc số lượng không hợp lệ.");
                continue;
            }
            var khaDung = coNgayThue ? (availability.TryGetValue(sp.MaSanPham, out var av) ? av : 0) : 99;
            if (coNgayThue && khaDung < item.SoLuong)
                thieuThongBao.Add($"{sp.TenSanPham} chỉ còn {khaDung} chiếc (yêu cầu {item.SoLuong}).");

            var tienThue = sp.GiaThueMoiNgay * item.SoLuong * thoiGianThueNgay;
            var tienCoc = sp.MucCocMoiThietBi * item.SoLuong;
            tongTienThue += tienThue;
            tongTienCoc += tienCoc;

            validSelections.Add(new DongGoiYResponse
            {
                MaSanPham = sp.MaSanPham,
                MaSanPhamHienThi = sp.MaSanPhamHienThi,
                TenSanPham = sp.TenSanPham,
                SoLuong = item.SoLuong,
                SucChua = sp.SucChua,
                DonGiaThueMoiNgay = sp.GiaThueMoiNgay,
                MucCocMoiThietBi = sp.MucCocMoiThietBi,
                TienThue = tienThue,
                TienCoc = tienCoc,
                SoLuongKhaDung = khaDung,
                LyDo = "Theo lựa chọn đã chỉnh sửa"
            });
        }

        return new TuVanBoDoResponse
        {
            NguonGoiY = "KiemTraLai",
            TrangThai = !coNgayThue ? "CanBoSungThongTin" : (thieuThongBao.Count > 0 ? "KhongDuKhaDung" : "ThanhCong"),
            GioNhan = request.GioNhan,
            GioTra = request.GioTra,
            ThoiGianThueNgay = coNgayThue ? thoiGianThueNgay : null,
            ThoiDiemKiemTra = DateTime.UtcNow,
            TongTienThue = coNgayThue ? tongTienThue : null,
            TongTienCoc = tongTienCoc,
            TongBanDau = coNgayThue ? tongTienThue + tongTienCoc : null,
            ThongBaoPhanThieu = thieuThongBao.Count > 0
                ? string.Join(" ", thieuThongBao)
                : (coNgayThue ? null : "Chưa có ngày thuê, giá hiển thị chỉ mang tính tham khảo."),
            CacDong = validSelections
        };
    }

    private static void ValidateInput(TuVanBoDoRequest request)
    {
        if (request.SoNguoi <= 0 || request.SoNguoi > 100)
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Số người phải lớn hơn 0 và tối đa 100 người.");
        if (request.NganSach.HasValue && request.NganSach.Value < 0)
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Ngân sách không được là số âm.");
        if (request.GioNhan.HasValue && request.GioTra.HasValue && request.GioTra.Value <= request.GioNhan.Value)
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Giờ trả phải sau giờ nhận.");
    }

    private async Task<List<AiCandidate>> LayDanhSachUngVienAsync(TuVanBoDoRequest request, CancellationToken ct)
    {
        var products = await _context.SanPhams.Include(s => s.DanhMuc)
            .Where(s => s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh).ToListAsync(ct);

        Dictionary<long, int> availability = new();
        if (request.GioNhan.HasValue && request.GioTra.HasValue)
            availability = await _khaDungService.LayKhaDungNhieuAsync(
                products.Select(p => p.MaSanPham).ToList(), request.GioNhan.Value, request.GioTra.Value);

        var candidates = products.Select(p => new AiCandidate
        {
            MaSanPham = p.MaSanPham, MaSanPhamHienThi = p.MaSanPhamHienThi, TenSanPham = p.TenSanPham,
            TenDanhMuc = p.DanhMuc?.TenDanhMuc ?? string.Empty, SucChua = p.SucChua,
            GiaThueMoiNgay = p.GiaThueMoiNgay, MucCocMoiThietBi = p.MucCocMoiThietBi,
            SoLuongKhaDung = availability.TryGetValue(p.MaSanPham, out var avail) ? avail : 99, MoTa = p.MoTa
        }).ToList();

        return request.GioNhan.HasValue && request.GioTra.HasValue
            ? candidates.Where(c => c.SoLuongKhaDung > 0).ToList()
            : candidates;
    }
}
