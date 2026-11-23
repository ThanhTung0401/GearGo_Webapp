using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.HeThong;

/// <summary>
/// Hiện thực tra cứu nhật ký thao tác có phân quyền theo vai trò và sinh đường dẫn chứng từ nguồn (UC10.4).
/// </summary>
public class NhatKyService : INhatKyService
{
    private static readonly string[] DoiTuongChiQuanTri =
    {
        "TAI_KHOAN", "NHAN_VIEN", "CHINH_SACH", "QUYEN_VAI_TRO", "ROLE_PERMISSION"
    };

    private readonly ApplicationDbContext _context;

    public NhatKyService(ApplicationDbContext context) => _context = context;

    public async Task<PagedResult<object>> TraCuuAsync(
        long currentTaiKhoanId,
        long? maTaiKhoan,
        string? hanhDong,
        string? loaiDoiTuong,
        string? maDoiTuong,
        DateTime? tuNgay,
        DateTime? denNgay,
        string? tuKhoa,
        int trang = 1,
        int soMoiTrang = 20,
        CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        // Xác thực lại vai trò/trạng thái hiện tại trong DB để chặn nhân viên đã nghỉ việc hoặc bị hạ quyền
        await ActorGuard.EnsureVanHanhAsync(_context, currentTaiKhoanId, ct);
        var vaiTroHienTai = await _context.TaiKhoans.AsNoTracking()
            .Where(t => t.MaTaiKhoan == currentTaiKhoanId)
            .Select(t => t.VaiTro)
            .FirstOrDefaultAsync(ct);
        var laQuanTriVien = string.Equals(vaiTroHienTai, "QuanTriVien", StringComparison.OrdinalIgnoreCase);

        var query = _context.NhatKyThaoTacs
            .AsNoTracking()
            .Include(n => n.TaiKhoan)
            .AsQueryable();

        // Nhân viên chỉ xem thao tác của chính mình hoặc nhật ký vận hành, không xem nhật ký quản trị
        if (!laQuanTriVien)
        {
            query = query.Where(n =>
                n.MaTaiKhoan == currentTaiKhoanId ||
                n.LoaiDoiTuong == null ||
                !DoiTuongChiQuanTri.Contains(n.LoaiDoiTuong.ToUpper()));
        }

        if (maTaiKhoan.HasValue)
            query = query.Where(n => n.MaTaiKhoan == maTaiKhoan.Value);
        if (!string.IsNullOrWhiteSpace(hanhDong))
            query = query.Where(n => n.HanhDong == hanhDong.Trim());
        if (!string.IsNullOrWhiteSpace(loaiDoiTuong))
            query = query.Where(n => n.LoaiDoiTuong == loaiDoiTuong.Trim());
        if (!string.IsNullOrWhiteSpace(maDoiTuong))
            query = query.Where(n => n.MaDoiTuong == maDoiTuong.Trim());
        if (tuNgay.HasValue && denNgay.HasValue && tuNgay.Value > denNgay.Value)
            throw new GearGo.Exceptions.DuLieuKhongHopLeException("KHOANG_THOI_GIAN_KHONG_HOP_LE", "Từ ngày không được lớn hơn đến ngày.");
        if (tuNgay.HasValue)
            query = query.Where(n => n.ThoiDiem >= tuNgay.Value);
        if (denNgay.HasValue)
        {
            // Nếu chỉ truyền ngày (00:00:00), mở rộng hết ngày đó để không bỏ sót nhật ký phát sinh trong ngày
            var denMoc = denNgay.Value.TimeOfDay == TimeSpan.Zero
                ? denNgay.Value.Date.AddDays(1)
                : denNgay.Value.AddTicks(1);
            query = query.Where(n => n.ThoiDiem < denMoc);
        }
        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var kw = tuKhoa.Trim();
            query = query.Where(n =>
                (n.HanhDong != null && n.HanhDong.Contains(kw)) ||
                (n.MaDoiTuong != null && n.MaDoiTuong.Contains(kw)) ||
                (n.LyDo != null && n.LyDo.Contains(kw)) ||
                (n.TaiKhoan != null && n.TaiKhoan.Email != null && n.TaiKhoan.Email.Contains(kw)));
        }

        var total = await query.CountAsync(ct);
        var rawItems = await query
            .OrderByDescending(n => n.ThoiDiem)
            .ThenByDescending(n => n.MaNhatKy)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(n => new
            {
                n.MaNhatKy,
                n.MaTaiKhoan,
                EmailNguoiThucHien = n.TaiKhoan != null ? n.TaiKhoan.Email : null,
                VaiTroNguoiThucHien = n.TaiKhoan != null ? n.TaiKhoan.VaiTro : null,
                n.HanhDong,
                n.LoaiDoiTuong,
                n.MaDoiTuong,
                n.DuLieuTruoc,
                n.DuLieuSau,
                n.ThoiDiem,
                n.LyDo
            })
            .ToListAsync(ct);

        var items = rawItems.Select(n => (object)new
        {
            n.MaNhatKy,
            n.MaTaiKhoan,
            n.EmailNguoiThucHien,
            n.VaiTroNguoiThucHien,
            n.HanhDong,
            n.LoaiDoiTuong,
            n.MaDoiTuong,
            n.DuLieuTruoc,
            n.DuLieuSau,
            n.ThoiDiem,
            n.LyDo,
            // UC10.4.2: Gợi ý đường dẫn API chứng từ nguồn để frontend mở trực tiếp
            ThamChieuUrl = XayDungUrlChungTu(n.LoaiDoiTuong, n.MaDoiTuong, laQuanTriVien)
        }).ToList();

        return new PagedResult<object>
        {
            Items = items,
            TotalItems = total,
            CurrentPage = trang,
            PageSize = soMoiTrang
        };
    }

    private static string? XayDungUrlChungTu(string? loaiDoiTuong, string? maDoiTuong, bool laQuanTriVien)
    {
        if (string.IsNullOrWhiteSpace(loaiDoiTuong) || string.IsNullOrWhiteSpace(maDoiTuong))
            return null;

        return loaiDoiTuong.ToUpperInvariant() switch
        {
            "DON_THUE" => $"/api/don-thue/{maDoiTuong}",
            "PHIEU_NHAP" or "PHIEUNHAPHANG" => $"/api/phieu-nhap/{maDoiTuong}",
            "PHIEU_BAO_TRI" => $"/api/bao-tri/{maDoiTuong}",
            "PHIEU_DIEU_CHINH_KHO" => $"/api/dieu-chinh-kho/{maDoiTuong}",
            "DOI_SOAT" => $"/api/doi-soat/{maDoiTuong}",
            "THIET_BI" => $"/api/thiet-bi/{maDoiTuong}",
            "TAI_KHOAN" => laQuanTriVien ? $"/api/tai-khoan/{maDoiTuong}" : null,
            "NHAN_VIEN" => laQuanTriVien ? $"/api/nhan-vien/{maDoiTuong}" : null,
            _ => null
        };
    }
}
