using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Models.DTOs.ThongBao;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.HeThong;

public partial class NhanVienService
{
    public async Task<Result<NhanVienResponse>> CapNhatNhanVienAsync(
        long maNhanVien, CapNhatNhanVienRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var hoTen = request.HoTen?.Trim() ?? "";
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var sdt = request.SoDienThoai?.Trim() ?? "";
        var diaChi = string.IsNullOrWhiteSpace(request.DiaChi) ? null : request.DiaChi.Trim();
        var loi = QuanTriNhanSuHelper.KiemTraHoSo(hoTen, email, sdt, diaChi, request.NgayVaoLam);
        if (loi.Count > 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Hồ sơ nhân viên không hợp lệ.", loi);

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        var nv = await _context.NhanViens.Include(n => n.TaiKhoan).FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();

        if (request.NgayVaoLam.HasValue && nv.NgayNghiViec.HasValue && nv.NgayNghiViec.Value < request.NgayVaoLam.Value)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Ngày vào làm không được sau ngày nghỉ việc.");

        if (await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != nv.MaTaiKhoan && (t.Email == email || t.SoDienThoai == sdt), ct))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists, "Email hoặc số điện thoại đã thuộc tài khoản khác.");

        var truoc = new { nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai, nv.DiaChi, nv.NgayVaoLam };
        nv.HoTen = hoTen;
        nv.DiaChi = diaChi;
        if (request.NgayVaoLam.HasValue) nv.NgayVaoLam = request.NgayVaoLam;
        nv.TaiKhoan.Email = email;
        nv.TaiKhoan.SoDienThoai = sdt;
        nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            actorId, "CAP_NHAT_NHAN_VIEN", "NHAN_VIEN", nv.MaNhanVien.ToString(), truoc,
            new { nv.HoTen, Email = email, SoDienThoai = sdt, nv.DiaChi, nv.NgayVaoLam }, null));

        try
        {
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (QuanTriNhanSuHelper.LaViPhamUnique(ex))
        {
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists, "Email hoặc số điện thoại đã thuộc tài khoản khác.");
        }

        return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));
    }

    public async Task<Result<NhanVienResponse>> DoiVaiTroAsync(
        long maNhanVien, DoiVaiTroRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var vaiTroMoi = request.VaiTroMoi?.Trim() ?? "";
        var lyDo = request.LyDo?.Trim() ?? "";
        if (!QuanTriNhanSuHelper.VaiTroNhanSu.Contains(vaiTroMoi))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole, "Vai trò chỉ được là NhanVien hoặc QuanTriVien.");
        if (lyDo.Length == 0 || lyDo.Length > 1000)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Lý do bắt buộc, tối đa 1000 ký tự.");

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await QuanTriNhanSuHelper.KhoaNhomQuanTriAsync(_context, ct);

        var nv = await _context.NhanViens.Include(n => n.TaiKhoan).FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();

        if (!QuanTriNhanSuHelper.VaiTroNhanSu.Contains(nv.TaiKhoan.VaiTro))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole, "Tài khoản không thuộc nhóm nhân sự.");
        if (nv.TrangThaiLamViec == DomainConstants.StaffStatus.Resigned)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.StaffResigned, "Nhân viên đã nghỉ việc.");
        if (nv.TaiKhoan.VaiTro == vaiTroMoi)
            return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));

        if (QuanTriNhanSuHelper.LaQuanTriHoatDong(nv.TaiKhoan, nv) && vaiTroMoi != "QuanTriVien"
            && await QuanTriNhanSuHelper.DemQuanTriHoatDongKhacAsync(_context, nv.MaTaiKhoan, ct) == 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.LastActiveAdmin, "Không thể hạ quyền quản trị viên hoạt động cuối cùng.");

        var truoc = nv.TaiKhoan.VaiTro;
        nv.TaiKhoan.VaiTro = vaiTroMoi;
        nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;

        // STF-04: Khi đổi vai trò tài khoản, xóa toàn bộ phân quyền override cũ của người này
        // để Quản trị viên mới KHÔNG bị kẹt bộ quyền nghèo nàn của Nhân viên trước đó
        // (gây lỗi 403 oan trên UI quản trị). Cũng áp dụng khi hạ cấp để Nhân viên trở lại
        // kế thừa quyền mặc định của vai trò thay vì mắc kẹt với override Admin cũ.
        var overrideTypes = new[]
        {
            $"user_perm_override:{nv.MaTaiKhoan}",
            $"user_perm:{nv.MaTaiKhoan}",
        };
        var overrideClaims = _context.RoleClaims.Where(c => overrideTypes.Contains(c.ClaimType));
        _context.RoleClaims.RemoveRange(overrideClaims);
        nv.TaiKhoan.PermissionVersion += 1;

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            actorId, "DOI_VAI_TRO", "TAI_KHOAN", nv.MaTaiKhoan.ToString(),
            new { VaiTro = truoc }, new { VaiTro = vaiTroMoi }, lyDo));

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));
    }

    public async Task<Result<NhanVienResponse>> GhiNhanNghiViecAsync(
        long maNhanVien, NghiViecRequest request, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);

        var lyDo = request.LyDo?.Trim() ?? "";
        if (lyDo.Length == 0 || lyDo.Length > 1000)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Lý do bắt buộc, tối đa 1000 ký tự.");

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await QuanTriNhanSuHelper.KhoaNhomQuanTriAsync(_context, ct);

        var nv = await _context.NhanViens.Include(n => n.TaiKhoan).FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();
        if (nv.TrangThaiLamViec == DomainConstants.StaffStatus.Resigned)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.StaffResigned, "Nhân viên đã nghỉ việc.");

        var homNay = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
        if (request.NgayNghiViec > homNay || (nv.NgayVaoLam.HasValue && request.NgayNghiViec < nv.NgayVaoLam.Value))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Ngày nghỉ việc phải từ ngày vào làm và không ở tương lai.");

        if (QuanTriNhanSuHelper.LaQuanTriHoatDong(nv.TaiKhoan, nv)
            && await QuanTriNhanSuHelper.DemQuanTriHoatDongKhacAsync(_context, nv.MaTaiKhoan, ct) == 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.LastActiveAdmin, "Không thể cho nghỉ việc quản trị viên hoạt động cuối cùng.");

        var truoc = new { nv.TrangThaiLamViec, nv.NgayNghiViec, TrangThaiTaiKhoan = nv.TaiKhoan.TrangThai };
        nv.TrangThaiLamViec = DomainConstants.StaffStatus.Resigned;
        nv.NgayNghiViec = request.NgayNghiViec;
        nv.TaiKhoan.TrangThai = DomainConstants.AccountStatus.Locked;
        nv.TaiKhoan.LyDoKhoa = $"Nghỉ việc: {lyDo}";
        nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            actorId, "GHI_NHAN_NGHI_VIEC", "NHAN_VIEN", nv.MaNhanVien.ToString(), truoc,
            new { nv.TrangThaiLamViec, nv.NgayNghiViec, TrangThaiTaiKhoan = nv.TaiKhoan.TrangThai }, lyDo));

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));
    }
}
