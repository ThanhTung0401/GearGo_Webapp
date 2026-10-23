using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý kho, kiểm kê và khả dụng (W5-T4 - Minh Tú)
/// </summary>
public class KhoService : IKhoService
{
    private readonly ApplicationDbContext _context;
    private readonly IKhaDungService? _khaDungService;
    private readonly ILogger<KhoService>? _logger;

    public KhoService(
        ApplicationDbContext context,
        IKhaDungService? khaDungService = null,
        ILogger<KhoService>? logger = null)
    {
        _context = context;
        _khaDungService = khaDungService;
        _logger = logger;
    }

    /// <summary>
    /// Thống kê tổng quan số lượng thiết bị theo trạng thái và sản phẩm hiện tại
    /// </summary>
    public async Task<Result<KhoTongQuanResponse>> LayTongQuanKhoAsync(LocKhoRequest request, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<KhoTongQuanResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        // Kiểm tra khoảng thời gian thuê nếu có truyền vào
        if (request.GioNhan.HasValue || request.GioTra.HasValue)
        {
            if (!request.GioNhan.HasValue || !request.GioTra.HasValue || request.GioTra <= request.GioNhan)
            {
                return Result<KhoTongQuanResponse>.Loi(
                    DomainConstants.Errors.InvalidRentalPeriod,
                    "Khoảng thời gian thuê không hợp lệ. Giờ trả phải sau giờ nhận.");
            }
        }

        var query = _context.ThietBis
            .AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .AsQueryable();

        if (request.MaSanPhamHienTai.HasValue)
        {
            query = query.Where(tb => tb.MaSanPhamHienTai == request.MaSanPhamHienTai.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            string tk = request.TuKhoa.Trim();
            query = query.Where(tb => tb.MaThietBiHienThi.Contains(tk) || (tb.SanPhamHienTai != null && tb.SanPhamHienTai.TenSanPham.Contains(tk)));
        }

        var danhSach = await query.ToListAsync();

        var res = new KhoTongQuanResponse
        {
            TongHoSoThietBi = danhSach.Count,
            SanSangTaiKho = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
            DangChoThue = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangThue),
            DangBaoTri = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
            NgungSuDung = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung),
            ThatLac = danhSach.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.ThatLac)
        };

        // Chỉ Admin mới được xem tổng giá trị tiền nhập (W5-T4 bảo mật chi phí)
        if (laAdmin)
        {
            res.TongGiaTriNhap = danhSach.Sum(t => t.GiaNhap);
        }

        // Tính toán chi tiết theo từng sản phẩm hiện tại
        var nhomSanPham = danhSach.GroupBy(t => t.MaSanPhamHienTai).ToList();
        var spIds = nhomSanPham.Select(g => g.Key).ToList();

        Dictionary<long, int>? khaDungMap = null;
        if (request.GioNhan.HasValue && request.GioTra.HasValue && spIds.Count > 0)
        {
            khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(spIds, request.GioNhan.Value, request.GioTra.Value);
            res.KhaDungTheoLich = khaDungMap.Values.Sum();
        }

        foreach (var grp in nhomSanPham)
        {
            var sp = grp.First().SanPhamHienTai;
            int? khaDungSp = null;
            if (khaDungMap != null && khaDungMap.TryGetValue(grp.Key, out int kdVal))
            {
                khaDungSp = kdVal;
            }

            res.ChiTietSanPham.Add(new ThongKeSanPhamKhoDto
            {
                MaSanPham = grp.Key,
                TenSanPham = sp?.TenSanPham ?? $"Sản phẩm #{grp.Key}",
                TongSo = grp.Count(),
                SanSang = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.SanSang),
                DangThue = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangThue),
                BaoTri = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri),
                NgungSuDung = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung),
                ThatLac = grp.Count(t => t.TrangThaiSuDung == TrangThaiThietBi.ThatLac),
                KhaDungTheoLich = khaDungSp
            });
        }

        return Result<KhoTongQuanResponse>.Ok(res);
    }

    /// <summary>
    /// Tìm kiếm và lọc danh sách thiết bị kho phân trang
    /// </summary>
    public async Task<Result<PagedResult<ThietBiKhoItemDto>>> TimThietBiAsync(LocKhoRequest request, long actorId, bool laAdmin)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<PagedResult<ThietBiKhoItemDto>>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var query = _context.ThietBis
            .AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .Include(tb => tb.ChiTietPhieuNhap)
                .ThenInclude(ct => ct.SanPham)
            .Include(tb => tb.ChiTietPhieuNhap)
                .ThenInclude(ct => ct.PhieuNhapHang)
            .AsQueryable();

        if (request.MaSanPhamHienTai.HasValue)
        {
            query = query.Where(tb => tb.MaSanPhamHienTai == request.MaSanPhamHienTai.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.TrangThai) && Enum.TryParse<TrangThaiThietBi>(request.TrangThai, true, out var ttEnum))
        {
            query = query.Where(tb => tb.TrangThaiSuDung == ttEnum);
        }

        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            string tk = request.TuKhoa.Trim();
            query = query.Where(tb => tb.MaThietBiHienThi.Contains(tk) || (tb.SanPhamHienTai != null && tb.SanPhamHienTai.TenSanPham.Contains(tk)));
        }

        int tongSo = await query.CountAsync();
        int trang = Math.Max(1, request.Trang);
        int soMoiTrang = Math.Clamp(request.SoMoiTrang, 1, DomainConstants.Policies.MaxPageSize);

        var itemsRaw = await query
            .OrderBy(tb => tb.MaThietBi)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync();

        var tbIds = itemsRaw.Select(t => t.MaThietBi).ToList();

        // Kiểm tra xem các thiết bị này có đơn thuê nào đã gán trong tương lai không
        var scheduledTbIds = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon)
                .ThenInclude(ct => ct.DonThue)
            .Where(pc => tbIds.Contains(pc.MaThietBi) &&
                         pc.TrangThai == DomainConstants.Status.Assigned &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.MaThietBi)
            .Distinct()
            .ToListAsync();

        var scheduledSet = new HashSet<long>(scheduledTbIds);

        var dtos = itemsRaw.Select(tb => new ThietBiKhoItemDto
        {
            MaThietBi = tb.MaThietBi,
            MaThietBiHienThi = tb.MaThietBiHienThi,
            MaSanPhamHienTai = tb.MaSanPhamHienTai,
            TenSanPhamHienTai = tb.SanPhamHienTai?.TenSanPham ?? "",
            MaSanPhamGoc = tb.ChiTietPhieuNhap.MaSanPham,
            TenSanPhamGoc = tb.ChiTietPhieuNhap.SanPham?.TenSanPham ?? "",
            MaChiTietPhieuNhap = tb.MaChiTietPhieuNhap,
            TrangThaiSuDung = tb.TrangThaiSuDung.ToString(),
            TinhTrang = tb.TinhTrang,
            GiaNhap = laAdmin ? tb.GiaNhap : null, // Che giá nhập nếu không phải Admin
            NgayNhap = tb.ChiTietPhieuNhap.PhieuNhapHang?.NgayNhapThucTe ?? tb.ChiTietPhieuNhap.PhieuNhapHang?.NgayLap ?? DateTime.MinValue,
            CoLichHenSapToi = scheduledSet.Contains(tb.MaThietBi)
        }).ToList();

        return Result<PagedResult<ThietBiKhoItemDto>>.Ok(new PagedResult<ThietBiKhoItemDto>
        {
            Items = dtos,
            TotalItems = tongSo,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    /// <summary>
    /// Đối chiếu dữ liệu quét mã vạch kiểm kê thực tế tại kho so với kỳ vọng hệ thống (Không ghi DB)
    /// </summary>
    public async Task<Result<DoiChieuKiemKeResponse>> LayDoiChieuKiemKeAsync(DoiChieuKiemKeRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DoiChieuKiemKeResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        if (request.DanhSachMaQuet == null)
            return Result<DoiChieuKiemKeResponse>.Loi(DomainConstants.Errors.InvalidData, "Danh sách mã quét không được null.");

        // Query các thiết bị trong phạm vi kiểm kê
        var baseQuery = _context.ThietBis
            .AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .AsQueryable();

        if (request.PhamViMaSanPham != null && request.PhamViMaSanPham.Count > 0)
        {
            baseQuery = baseQuery.Where(tb => request.PhamViMaSanPham.Contains(tb.MaSanPhamHienTai));
        }

        var allScopedDevices = await baseQuery.ToListAsync();

        // 1. Tập kỳ vọng thực tế tại kho: CHỈ tính các thiết bị có trạng thái Sẵn Sàng (SanSang)
        var expectedInWarehouse = allScopedDevices
            .Where(tb => tb.TrangThaiSuDung == TrangThaiThietBi.SanSang)
            .ToList();

        var expectedMap = expectedInWarehouse
            .ToDictionary(tb => tb.MaThietBiHienThi.Trim(), tb => tb, StringComparer.OrdinalIgnoreCase);

        // 2. Các thiết bị lưu hành ngoài kho (đang thuê, đang bảo trì): không tính là thiếu tại kho (W5-T4-A02)
        var outsideDevices = allScopedDevices
            .Where(tb => tb.TrangThaiSuDung == TrangThaiThietBi.DangThue || tb.TrangThaiSuDung == TrangThaiThietBi.DangBaoTri)
            .Select(tb => new ThietBiNgoaiKhoDto
            {
                MaThietBi = tb.MaThietBi,
                MaThietBiHienThi = tb.MaThietBiHienThi,
                TenSanPham = tb.SanPhamHienTai?.TenSanPham ?? "",
                LyDoNgoaiKho = tb.TrangThaiSuDung.ToString()
            })
            .ToList();

        // 3. Xử lý danh sách quét thực tế
        var rawScans = request.DanhSachMaQuet
            .Select(m => (m ?? "").Trim())
            .Where(m => !string.IsNullOrEmpty(m))
            .ToList();

        // Phát hiện mã quét trùng lặp trong đợt kiểm kê (W5-T4-A03)
        var duplicateScans = rawScans
            .GroupBy(m => m, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => $"{g.Key} (quét {g.Count()} lần)")
            .ToList();

        var distinctScans = new HashSet<string>(rawScans, StringComparer.OrdinalIgnoreCase);

        // Danh sách mã khớp
        var matchedCodes = new List<string>();
        foreach (var code in distinctScans)
        {
            if (expectedMap.ContainsKey(code))
            {
                matchedCodes.Add(code);
            }
        }

        // Danh sách thiếu trong phạm vi (có kỳ vọng nhưng không thấy quét)
        var missingItems = expectedInWarehouse
            .Where(tb => !distinctScans.Contains(tb.MaThietBiHienThi.Trim()))
            .Select(tb => new ThietBiThieuDto
            {
                MaThietBi = tb.MaThietBi,
                MaThietBiHienThi = tb.MaThietBiHienThi,
                TenSanPham = tb.SanPhamHienTai?.TenSanPham ?? "",
                TinhTrang = tb.TinhTrang
            })
            .ToList();

        // Danh sách mã lạ (hoàn toàn không tồn tại trong hệ thống)
        var allSystemCodes = await _context.ThietBis
            .AsNoTracking()
            .Select(tb => tb.MaThietBiHienThi)
            .ToListAsync();
        var systemCodeSet = new HashSet<string>(allSystemCodes.Select(c => c.Trim()), StringComparer.OrdinalIgnoreCase);

        var unknownCodes = distinctScans
            .Where(code => !systemCodeSet.Contains(code))
            .ToList();

        var res = new DoiChieuKiemKeResponse
        {
            ThoiDiemDoiChieu = request.ThoiDiemKiemKe,
            TongSoKyVongTaiKho = expectedInWarehouse.Count,
            TongSoQuetThucTe = distinctScans.Count,
            DanhSachKhop = matchedCodes,
            DanhSachThieu = missingItems,
            DanhSachQuetTrung = duplicateScans,
            DanhSachMaLa = unknownCodes,
            DanhSachDangLuuHanhNgoaiKho = outsideDevices
        };

        return Result<DoiChieuKiemKeResponse>.Ok(res);
    }

    /// <summary>
    /// Giả lập và phân tích ảnh hưởng cam kết đơn thuê khi loại trừ thiết bị hoặc giáng cấp
    /// </summary>
    public async Task<Result<PhanTichAnhHuongResponse>> PhanTichAnhHuongAsync(PhanTichAnhHuongRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<PhanTichAnhHuongResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var thietBi = await _context.ThietBis
            .AsNoTracking()
            .Include(tb => tb.SanPhamHienTai)
            .FirstOrDefaultAsync(tb => tb.MaThietBi == request.MaThietBi);

        if (thietBi == null)
            return Result<PhanTichAnhHuongResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");

        var res = new PhanTichAnhHuongResponse
        {
            CoTheApDungHienTai = true
        };

        // 1. Kiểm tra nếu thiết bị đang được khách giữ
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
        {
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add("Thiết bị đang được khách thuê (chưa thu hồi tại kho).");
        }

        // 2. Nếu ngừng sử dụng, kiểm tra phiếu bảo trì mở
        if (request.LoaiThayDoi == DomainConstants.Lifecycle.Decommission)
        {
            bool coBaoTriMo = await _context.PhieuBaoTris.AnyAsync(p =>
                p.MaThietBi == thietBi.MaThietBi &&
                (p.TrangThai == DomainConstants.Status.PendingProcessing ||
                 p.TrangThai == DomainConstants.Status.InProgress ||
                 p.TrangThai == DomainConstants.Status.PendingInspection));

            if (coBaoTriMo)
            {
                res.CoTheApDungHienTai = false;
                res.VuongMac.Add("Thiết bị đang có phiếu bảo trì mở chưa hoàn thành; phải kết thúc phiếu bảo trì trước khi ngừng sử dụng.");
            }
        }

        // 3. Kiểm tra các đơn đã phân công đích danh thiết bị này
        var camKetCuThe = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon)
                .ThenInclude(ct => ct.DonThue)
            .Where(pc => pc.MaThietBi == thietBi.MaThietBi &&
                         pc.TrangThai == DomainConstants.Status.Assigned &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.ChiTietDon.DonThue.MaDonHienThi ?? pc.ChiTietDon.MaDonThue.ToString())
            .Distinct()
            .ToListAsync();

        if (camKetCuThe.Count > 0)
        {
            res.CamKetCuThe.AddRange(camKetCuThe);
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add($"Thiết bị đã được phân công đích danh cho các đơn: {string.Join(", ", camKetCuThe)}.");
        }

        // 4. Kiểm tra cam kết theo số lượng sản phẩm nguồn cho các đơn tương lai (W5-T3-A03)
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.SanSang)
        {
            var donTuongLai = await _context.ChiTietDonThues
                .Include(ct => ct.DonThue)
                .Where(ct => ct.MaSanPham == thietBi.MaSanPhamHienTai &&
                             (ct.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                              ct.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
                .Select(ct => new
                {
                    ct.MaDonThue,
                    MaDonHienThi = ct.DonThue.MaDonHienThi ?? ct.MaDonThue.ToString(),
                    ct.DonThue.GioNhanDuKien,
                    ct.DonThue.GioTraDuKien
                })
                .Distinct()
                .ToListAsync();

            foreach (var don in donTuongLai)
            {
                var khaDungMap = await _khaDungService.LayKhaDungNhieuAsync(
                    new List<long> { thietBi.MaSanPhamHienTai },
                    don.GioNhanDuKien,
                    don.GioTraDuKien);

                int khaDungConLai = khaDungMap.TryGetValue(thietBi.MaSanPhamHienTai, out int sl) ? sl : 0;
                // Nếu giảm 1 thiết bị mà khả dụng < 1 (tức hiện tại còn 0 chiếc dư) thì sẽ làm thiếu cam kết
                if (khaDungConLai < 1)
                {
                    res.CoTheApDungHienTai = false;
                    res.ThieuSoLuongTheoLich.Add(
                        $"Đơn {don.MaDonHienThi} ({don.GioNhanDuKien:yyyy-MM-dd} -> {don.GioTraDuKien:yyyy-MM-dd}) sẽ bị thiếu hàng nếu giảm nguồn sản phẩm #{thietBi.MaSanPhamHienTai}.");
                }
            }
        }

        return Result<PhanTichAnhHuongResponse>.Ok(res);
    }
}
