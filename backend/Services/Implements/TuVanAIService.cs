using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Integrations.AI;
using GearGo.Models.DTOs.TuVan;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

public class TuVanAIService : ITuVanAIService
{
    private readonly ApplicationDbContext _context;
    private readonly IAIProvider _aiProvider;
    private readonly IGoiYBoDoService _goiYBoDoService;
    private readonly IKhaDungService _khaDungService;
    private readonly ILogger<TuVanAIService> _logger;

    public TuVanAIService(
        ApplicationDbContext context,
        IAIProvider aiProvider,
        IGoiYBoDoService goiYBoDoService,
        IKhaDungService khaDungService,
        ILogger<TuVanAIService> logger)
    {
        _context = context;
        _aiProvider = aiProvider;
        _goiYBoDoService = goiYBoDoService;
        _khaDungService = khaDungService;
        _logger = logger;
    }

    public async Task<TuVanBoDoResponse> TuVanAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default)
    {
        // 1. Kiểm tra tính hợp lệ của đầu vào
        ValidateInput(request);

        var coNgayThue = request.GioNhan.HasValue && request.GioTra.HasValue;
        int thoiGianThueNgay = 1;
        if (coNgayThue)
        {
            thoiGianThueNgay = (int)Math.Ceiling((request.GioTra!.Value - request.GioNhan!.Value).TotalDays);
            if (thoiGianThueNgay <= 0) thoiGianThueNgay = 1;
        }

        // 2. Lấy danh sách sản phẩm ứng viên đang kinh doanh từ database
        var candidates = await LayDanhSachUngVienAsync(request, cancellationToken);
        if (!candidates.Any())
        {
            return new TuVanBoDoResponse
            {
                NguonGoiY = "QuyTac",
                TrangThai = "KhongTimThayPhuongAn",
                ThoiDiemKiemTra = DateTime.UtcNow,
                ThongBaoPhanThieu = "Hiện không có sản phẩm nào khả dụng để gợi ý."
            };
        }

        // 3. Gọi adapter AI
        AiProviderResult aiResult;
        try
        {
            aiResult = await _aiProvider.GoiAsync(request, candidates, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gọi AI thất bại, chuyển sang phương án dự phòng theo quy tắc");
            aiResult = new AiProviderResult { ThanhCong = false, Loi = ex.Message, ProviderUsed = "Fallback" };
        }

        // 4. Nếu AI lỗi hoặc không có gợi ý -> Fallback sang quy tắc
        if (!aiResult.ThanhCong || !aiResult.Selections.Any())
        {
            _logger.LogInformation("Sử dụng gợi ý theo quy tắc dự phòng do AI không thành công: {Loi}", aiResult.Loi);
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        // 5. Server xác minh toàn diện kết quả do AI trả về
        var candidateDict = candidates.ToDictionary(c => c.MaSanPham);
        var validSelections = new List<DongGoiYResponse>();

        foreach (var sel in aiResult.Selections)
        {
            // Ca W5-T7-A02: Chặn mã lạ ngoài candidate hoặc số lượng không hợp lệ
            if (!candidateDict.TryGetValue(sel.MaSanPham, out var cand))
            {
                _logger.LogWarning("Bỏ qua mã sản phẩm {Ma} do không có trong danh sách ứng viên", sel.MaSanPham);
                continue;
            }

            if (sel.SoLuong <= 0)
            {
                _logger.LogWarning("Bỏ qua sản phẩm {Ma} vì số lượng <= 0 ({Qty})", sel.MaSanPham, sel.SoLuong);
                continue;
            }

            validSelections.Add(new DongGoiYResponse
            {
                MaSanPham = cand.MaSanPham,
                MaSanPhamHienThi = cand.MaSanPhamHienThi,
                TenSanPham = cand.TenSanPham,
                SoLuong = sel.SoLuong,
                SucChua = cand.SucChua,
                DonGiaThueMoiNgay = cand.GiaThueMoiNgay,
                MucCocMoiThietBi = cand.MucCocMoiThietBi,
                TienThue = cand.GiaThueMoiNgay * sel.SoLuong * thoiGianThueNgay,
                TienCoc = cand.MucCocMoiThietBi * sel.SoLuong,
                SoLuongKhaDung = cand.SoLuongKhaDung,
                LyDo = string.IsNullOrWhiteSpace(sel.LyDo) ? "AI đề xuất phù hợp" : sel.LyDo
            });
        }

        // Nếu sau khi lọc không còn sản phẩm hợp lệ nào -> Fallback
        if (!validSelections.Any())
        {
            _logger.LogWarning("AI trả toàn bộ sản phẩm không hợp lệ, chuyển sang quy tắc dự phòng");
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        // 6. Kiểm tra sức chứa thực tế của lều (Ca W5-T7-A01)
        var tongSucChuaLeu = validSelections
            .Where(s => s.TenSanPham.Contains("Lều", StringComparison.OrdinalIgnoreCase) && s.SucChua.HasValue)
            .Sum(s => s.SucChua!.Value * s.SoLuong);

        if (tongSucChuaLeu < request.SoNguoi)
        {
            _logger.LogWarning("AI gợi ý lều có tổng sức chứa {SucChua} < {SoNguoi} người, chuyển sang quy tắc dự phòng để bảo đảm đủ chỗ", tongSucChuaLeu, request.SoNguoi);
            // Fallback sang quy tắc để bảo đảm tính đủ chỗ cho khách
            return _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
        }

        // 7. Kiểm tra ngân sách (Ca W5-T7-A03 & W5-T7-A04)
        var tongTienThue = validSelections.Sum(s => s.TienThue);
        var tongTienCoc = validSelections.Sum(s => s.TienCoc);
        var tongBanDau = tongTienThue + tongTienCoc;

        if (request.NganSach.HasValue && request.NganSach.Value > 0)
        {
            var isTongBanDau = string.Equals(request.LoaiNganSach, "TongBanDau", StringComparison.OrdinalIgnoreCase);
            var chiPhiSoSanh = isTongBanDau ? tongBanDau : tongTienThue;

            if (chiPhiSoSanh > request.NganSach.Value)
            {
                _logger.LogWarning("Gợi ý của AI vượt ngân sách ({ChiPhi} > {NganSach}), chuyển sang quy tắc dự phòng tối ưu ngân sách", chiPhiSoSanh, request.NganSach.Value);
                var fallbackResponse = _goiYBoDoService.GoiYTheoQuyTac(request, candidates, thoiGianThueNgay);
                if (fallbackResponse.TrangThai == "ThanhCong")
                {
                    return fallbackResponse;
                }

                // Nếu cả fallback cũng vượt ngân sách
                return new TuVanBoDoResponse
                {
                    NguonGoiY = aiResult.ProviderUsed,
                    TrangThai = "KhongTimThayPhuongAn",
                    GioNhan = request.GioNhan,
                    GioTra = request.GioTra,
                    ThoiGianThueNgay = coNgayThue ? thoiGianThueNgay : null,
                    ThoiDiemKiemTra = DateTime.UtcNow,
                    TongTienThue = coNgayThue ? tongTienThue : null,
                    TongTienCoc = tongTienCoc,
                    TongBanDau = coNgayThue ? tongBanDau : null,
                    ThongBaoPhanThieu = $"Ngân sách {request.NganSach:N0} đ không đủ cho bộ đồ ({chiPhiSoSanh:N0} đ). Vui lòng tăng ngân sách hoặc điều chỉnh ngày thuê.",
                    CacDong = validSelections
                };
            }
        }

        // 8. Đóng gói kết quả thành công
        var response = new TuVanBoDoResponse
        {
            NguonGoiY = string.Equals(aiResult.ProviderUsed, "Mock", StringComparison.OrdinalIgnoreCase) ? "Mock" : "AI",
            TrangThai = coNgayThue ? "ThanhCong" : "CanBoSungThongTin",
            GioNhan = request.GioNhan,
            GioTra = request.GioTra,
            ThoiGianThueNgay = coNgayThue ? thoiGianThueNgay : null,
            ThoiDiemKiemTra = DateTime.UtcNow,
            TongTienThue = coNgayThue ? tongTienThue : null,
            TongTienCoc = tongTienCoc,
            TongBanDau = coNgayThue ? tongBanDau : null,
            ThongBaoPhanThieu = coNgayThue ? null : "Chưa có ngày thuê, giá hiển thị là tham khảo theo ngày và cọc theo số lượng.",
            CacDong = validSelections
        };

        return response;
    }

    public async Task<TuVanBoDoResponse> KiemTraVaTinhLaiBoDoAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default)
    {
        return await TuVanAsync(request, cancellationToken);
    }

    public async Task<bool> ThemBoDoVaoGioAsync(long maKhachHang, ThemBoDoRequest request, CancellationToken cancellationToken = default)
    {
        if (request.CacDong == null || !request.CacDong.Any())
        {
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Danh sách sản phẩm thêm vào giỏ không được rỗng.");
        }

        // 1. Tìm hoặc tạo giỏ hàng cho khách hàng
        var trueKhId = await ResolveMaKhachHangAsync(maKhachHang);
        var gio = await _context.GioThues
            .Include(g => g.ChiTietGioThues)
            .FirstOrDefaultAsync(g => g.MaKhachHang == trueKhId, cancellationToken);

        if (gio == null)
        {
            gio = new GioThue
            {
                MaKhachHang = trueKhId,
                NgayCapNhat = DateTime.UtcNow,
                GioNhanDuKien = request.GioNhan,
                GioTraDuKien = request.GioTra
            };
            _context.GioThues.Add(gio);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            // 2. Kiểm tra xung đột lịch thuê (Ca W5-T7-A08)
            if (request.GioNhan.HasValue && request.GioTra.HasValue)
            {
                if (gio.GioNhanDuKien.HasValue && gio.GioTraDuKien.HasValue)
                {
                    var isDifferent = gio.GioNhanDuKien.Value != request.GioNhan.Value ||
                                      gio.GioTraDuKien.Value != request.GioTra.Value;

                    if (isDifferent)
                    {
                        if (!string.Equals(request.XuLyXungDotLich, "ThayThe", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new XungDotDuLieuException("NGAY_GIO_KHAC_GIO_HIEN_TAI",
                                "Thời gian thuê của bộ đồ khác với thời gian hiện tại trong giỏ hàng. Vui lòng xác nhận lựa chọn lịch chung.");
                        }

                        // Nếu khách chọn "ThayThe" -> cập nhật lại ngày giỏ hàng
                        gio.GioNhanDuKien = request.GioNhan;
                        gio.GioTraDuKien = request.GioTra;
                        gio.NgayCapNhat = DateTime.UtcNow;
                    }
                }
                else
                {
                    gio.GioNhanDuKien = request.GioNhan;
                    gio.GioTraDuKien = request.GioTra;
                    gio.NgayCapNhat = DateTime.UtcNow;
                }
            }
        }

        // 3. Kiểm tra khả dụng cho TẤT CẢ các sản phẩm trong bộ đồ (Ca W5-T7-A07)
        if (gio.GioNhanDuKien.HasValue && gio.GioTraDuKien.HasValue)
        {
            var productIds = request.CacDong.Select(d => d.MaSanPham).Distinct().ToList();
            var availability = await _khaDungService.LayKhaDungNhieuAsync(productIds, gio.GioNhanDuKien.Value, gio.GioTraDuKien.Value);

            foreach (var dong in request.CacDong)
            {
                var available = availability.TryGetValue(dong.MaSanPham, out var soLuong) ? soLuong : 0;
                
                // Tính cả số lượng đã có sẵn trong giỏ
                var existingItem = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == dong.MaSanPham);
                var tongCan = dong.SoLuong + (existingItem?.SoLuong ?? 0);

                if (available < tongCan)
                {
                    throw new XungDotDuLieuException("BO_DO_KHONG_CON_PHU_HOP",
                        $"Sản phẩm mã {dong.MaSanPham} không còn đủ số lượng khả dụng (chỉ còn {available}, yêu cầu {tongCan}). Không thể thêm dở dang.");
                }
            }
        }

        // 4. Thêm nguyên tử toàn bộ sản phẩm vào giỏ hàng (không tạo GIU_CHO hay DON_THUE - Ca W5-T7-A09)
        foreach (var dong in request.CacDong)
        {
            var item = gio.ChiTietGioThues.FirstOrDefault(c => c.MaSanPham == dong.MaSanPham);
            if (item != null)
            {
                item.SoLuong += dong.SoLuong;
            }
            else
            {
                gio.ChiTietGioThues.Add(new ChiTietGioThue
                {
                    MaGioThue = gio.MaGioThue,
                    MaSanPham = dong.MaSanPham,
                    SoLuong = dong.SoLuong
                });
            }
        }

        gio.NgayCapNhat = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ValidateInput(TuVanBoDoRequest request)
    {
        if (request.SoNguoi <= 0 || request.SoNguoi > 100)
        {
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Số người phải lớn hơn 0 và tối đa 100 người.");
        }

        if (request.NganSach.HasValue && request.NganSach.Value < 0)
        {
            throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Ngân sách không được là số âm.");
        }

        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            if (request.GioTra.Value <= request.GioNhan.Value)
            {
                throw new DuLieuKhongHopLeException("DAU_VAO_TU_VAN_KHONG_HOP_LE", "Giờ trả phải sau giờ nhận.");
            }
        }
    }

    private async Task<List<AiCandidate>> LayDanhSachUngVienAsync(TuVanBoDoRequest request, CancellationToken cancellationToken)
    {
        var query = _context.SanPhams
            .Include(s => s.DanhMuc)
            .Where(s => s.TrangThaiKinhDoanh == TrangThaiKinhDoanh.DangKinhDoanh);

        var products = await query.ToListAsync(cancellationToken);

        Dictionary<long, int> availability = new();
        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            var ids = products.Select(p => p.MaSanPham).ToList();
            availability = await _khaDungService.LayKhaDungNhieuAsync(ids, request.GioNhan.Value, request.GioTra.Value);
        }

        var candidates = products.Select(p => new AiCandidate
        {
            MaSanPham = p.MaSanPham,
            MaSanPhamHienThi = p.MaSanPhamHienThi,
            TenSanPham = p.TenSanPham,
            TenDanhMuc = p.DanhMuc?.TenDanhMuc ?? string.Empty,
            SucChua = p.SucChua,
            GiaThueMoiNgay = p.GiaThueMoiNgay,
            MucCocMoiThietBi = p.MucCocMoiThietBi,
            SoLuongKhaDung = availability.TryGetValue(p.MaSanPham, out var avail) ? avail : 99,
            MoTa = p.MoTa
        }).ToList();

        // Lọc bỏ sản phẩm hết hàng nếu có ngày cụ thể
        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            candidates = candidates.Where(c => c.SoLuongKhaDung > 0).ToList();
        }

        return candidates;
    }

    private async Task<long> ResolveMaKhachHangAsync(long actorId)
    {
        var khByMa = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaKhachHang == actorId);
        if (khByMa != null) return khByMa.MaKhachHang;

        var khByTk = await _context.KhachHangs.FirstOrDefaultAsync(k => k.MaTaiKhoan == actorId);
        if (khByTk != null) return khByTk.MaKhachHang;

        var tk = await _context.TaiKhoans.FirstOrDefaultAsync(t => t.MaTaiKhoan == actorId);
        if (tk != null)
        {
            var newKh = new KhachHang
            {
                MaTaiKhoan = tk.MaTaiKhoan,
                HoTen = tk.Email?.Split('@')[0] ?? "KhachHang"
            };
            _context.KhachHangs.Add(newKh);
            await _context.SaveChangesAsync();
            return newKh.MaKhachHang;
        }

        return actorId;
    }
}
