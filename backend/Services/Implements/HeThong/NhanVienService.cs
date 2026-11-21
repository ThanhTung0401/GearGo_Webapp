using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.HeThong;

public partial class NhanVienService : INhanVienService
{
    private readonly ApplicationDbContext _context;
    private readonly ILichSuNghiepVuService _lichSu;

    public NhanVienService(ApplicationDbContext context, ILichSuNghiepVuService lichSu)
    {
        _context = context;
        _lichSu = lichSu;
    }

    public async Task<Result<PhanTrangResponse<NhanVienResponse>>> TimNhanVienAsync(
        TimNhanVienRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var trang = Math.Max(1, request.Trang);
        var soMoiTrang = request.SoMoiTrang <= 0
            ? DomainConstants.Policies.DefaultPageSize
            : Math.Min(request.SoMoiTrang, DomainConstants.Policies.MaxPageSize);

        var query = _context.NhanViens.AsNoTracking().Include(n => n.TaiKhoan).AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.VaiTro)) query = query.Where(n => n.TaiKhoan.VaiTro == request.VaiTro);
        if (!string.IsNullOrWhiteSpace(request.TrangThaiLamViec))
            query = query.Where(n => n.TrangThaiLamViec == request.TrangThaiLamViec);
        if (!string.IsNullOrWhiteSpace(request.TrangThaiTaiKhoan))
            query = query.Where(n => n.TaiKhoan.TrangThai == request.TrangThaiTaiKhoan);
        if (!string.IsNullOrWhiteSpace(request.TuKhoa))
        {
            var kw = request.TuKhoa.Trim();
            query = query.Where(n =>
                (n.HoTen != null && n.HoTen.Contains(kw)) ||
                (n.TaiKhoan.Email != null && n.TaiKhoan.Email.Contains(kw)) ||
                (n.TaiKhoan.SoDienThoai != null && n.TaiKhoan.SoDienThoai.Contains(kw)));
        }

        var tongSo = await query.CountAsync(ct);
        var rows = await query.OrderBy(n => n.MaNhanVien)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang).ToListAsync(ct);

        var items = rows.Select(n => Map(n, Array.Empty<CongViecCanBanGiaoResponse>())).ToList();
        return Result<PhanTrangResponse<NhanVienResponse>>.Ok(new(items, tongSo, trang, soMoiTrang));
    }

    public async Task<Result<NhanVienResponse>> LayNhanVienAsync(long maNhanVien, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);
        var nv = await _context.NhanViens.AsNoTracking().Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        return nv == null ? KhongThay() : Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));
    }

    public async Task<Result<NhanVienResponse>> TaoNhanVienAsync(TaoNhanVienRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var hoTen = request.HoTen?.Trim() ?? "";
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var sdt = request.SoDienThoai?.Trim() ?? "";
        var diaChi = string.IsNullOrWhiteSpace(request.DiaChi) ? null : request.DiaChi.Trim();
        var vaiTro = request.VaiTro?.Trim() ?? "";
        var ngayVaoLam = request.NgayVaoLam ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var loi = QuanTriNhanSuHelper.KiemTraHoSo(hoTen, email, sdt, diaChi, ngayVaoLam);
        if (!QuanTriNhanSuHelper.VaiTroNhanSu.Contains(vaiTro))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole, "Vai trò chỉ được là NhanVien hoặc QuanTriVien.");
        if ((request.MatKhauKhoiTao?.Length ?? 0) < 8 || request.MatKhauKhoiTao!.Length > 100)
            loi["matKhauKhoiTao"] = "Mật khẩu khởi tạo từ 8 đến 100 ký tự.";
        if (loi.Count > 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Hồ sơ nhân viên không hợp lệ.", loi);

        var lienHe = Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists, "Email hoặc số điện thoại đã thuộc tài khoản khác.");
        await using var tx = await _context.Database.BeginTransactionAsync(ct);

        if (await _context.TaiKhoans.AnyAsync(t => t.Email == email || t.SoDienThoai == sdt, ct)) return lienHe;

        var now = DateTime.UtcNow;
        var tk = new TaiKhoan
        {
            Email = email, SoDienThoai = sdt,
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword(request.MatKhauKhoiTao, workFactor: 12),
            VaiTro = vaiTro, TrangThai = DomainConstants.AccountStatus.Active,
            NgayTao = now, NgayCapNhat = now
        };
        var nv = new NhanVien
        {
            TaiKhoan = tk, HoTen = hoTen, DiaChi = diaChi,
            NgayVaoLam = ngayVaoLam, TrangThaiLamViec = DomainConstants.StaffStatus.Working
        };
        _context.NhanViens.Add(nv);

        try
        {
            await _context.SaveChangesAsync(ct);
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
                actorId, "TAO_NHAN_VIEN", "NHAN_VIEN", nv.MaNhanVien.ToString(), null,
                new { nv.MaNhanVien, tk.MaTaiKhoan, nv.HoTen, tk.Email, tk.SoDienThoai, tk.VaiTro, nv.NgayVaoLam }, null));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (QuanTriNhanSuHelper.LaViPhamUnique(ex))
        {
            return lienHe;
        }

        return Result<NhanVienResponse>.Ok(Map(nv, Array.Empty<CongViecCanBanGiaoResponse>()));
    }

    private async Task<IReadOnlyList<CongViecCanBanGiaoResponse>> CongViecMoAsync(long maNhanVien, CancellationToken ct)
        => await _context.PhieuBaoTris.AsNoTracking()
            .Where(p => p.MaNguoiXuLy == maNhanVien && QuanTriNhanSuHelper.TrangThaiBaoTriMo.Contains(p.TrangThai))
            .OrderBy(p => p.MaPhieuBaoTri)
            .Select(p => new CongViecCanBanGiaoResponse(p.MaPhieuBaoTri, p.MaThietBi, p.TrangThai, p.LoaiXuLy, p.MoTaLoi))
            .ToListAsync(ct);

    private static Result<NhanVienResponse> KhongThay()
        => Result<NhanVienResponse>.Loi(DomainConstants.Errors.StaffNotFound, "Không tìm thấy nhân viên.");

    private static NhanVienResponse Map(NhanVien n, IReadOnlyList<CongViecCanBanGiaoResponse> viec) => new(
        n.MaNhanVien, n.MaTaiKhoan, n.HoTen, n.TaiKhoan.Email, n.TaiKhoan.SoDienThoai, n.DiaChi,
        n.NgayVaoLam, n.NgayNghiViec, n.TaiKhoan.VaiTro, n.TaiKhoan.TrangThai, n.TrangThaiLamViec, viec);
}
