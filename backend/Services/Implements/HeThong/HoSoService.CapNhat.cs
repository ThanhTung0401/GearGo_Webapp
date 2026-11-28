using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.HoSo;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GearGo.Services.Implements.HeThong;

public partial class HoSoService
{
    public async Task<HoSoResponse> CapNhatHoSoCuaToiAsync(CapNhatHoSoRequest request, long maTaiKhoan)
    {
        var tk = await ActorGuard.LayTaiKhoanHoatDongAsync(_context, maTaiKhoan);

        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var sdt = request.SoDienThoai?.Trim() ?? "";
        var hoTen = request.HoTen?.Trim() ?? "";
        var diaChi = string.IsNullOrWhiteSpace(request.DiaChi) ? null : request.DiaChi.Trim();
        var anh = string.IsNullOrWhiteSpace(request.AnhDaiDien) ? null : request.AnhDaiDien.Trim();
        Validate(hoTen, email, sdt, request.NgaySinh, anh);

        XacMinhOtpNeuDoiLienHe(tk, maTaiKhoan, email, sdt, request.MaOtp);

        await using var tx = await _context.Database.BeginTransactionAsync();
        if (await _context.TaiKhoans.AnyAsync(t => t.MaTaiKhoan != maTaiKhoan && (t.Email == email || t.SoDienThoai == sdt)))
            throw new LienHeDaTonTaiException("Email hoặc số điện thoại đã thuộc tài khoản khác.");

        HoSoResponse ketQua = tk.VaiTro == "KhachHang"
            ? await CapNhatKhachHangAsync(maTaiKhoan, hoTen, email, sdt, diaChi, request.NgaySinh, anh)
            : await CapNhatNhanVienAsync(maTaiKhoan, hoTen, email, sdt);

        try
        {
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex) when (LaViPhamUnique(ex))
        {
            throw new LienHeDaTonTaiException("Email hoặc số điện thoại đã thuộc tài khoản khác.");
        }

        return ketQua;
    }

    private void XacMinhOtpNeuDoiLienHe(TaiKhoan tk, long maTaiKhoan, string email, string sdt, string? rawOtp)
    {
        var emailThayDoi = !string.Equals(email, tk.Email, StringComparison.OrdinalIgnoreCase);
        var sdtThayDoi = !string.Equals(sdt, tk.SoDienThoai, StringComparison.Ordinal);
        if (!emailThayDoi && !sdtThayDoi) return;

        var maOtp = rawOtp?.Trim();
        if (string.IsNullOrWhiteSpace(maOtp))
            throw new DuLieuKhongHopLeException("CAN_OTP_XAC_MINH", "Thay đổi Email hoặc Số điện thoại yêu cầu mã xác minh OTP.");

        if (_cache == null) return;
        if (!_cache.TryGetValue<PendingContactOtp>(OtpCacheKey(maTaiKhoan), out var pending) || pending == null)
            throw new DuLieuKhongHopLeException("OTP_HET_HAN", "Mã OTP chưa được yêu cầu hoặc đã hết hạn. Vui lòng gửi lại mã OTP.");

        if (!string.Equals(pending.Otp, maOtp, StringComparison.Ordinal)
            || (emailThayDoi && !string.Equals(pending.EmailMoi, email, StringComparison.OrdinalIgnoreCase))
            || (sdtThayDoi && !string.Equals(pending.SoDienThoaiMoi, sdt, StringComparison.Ordinal)))
        {
            throw new DuLieuKhongHopLeException("OTP_KHONG_HOP_LE", "Mã OTP không chính xác hoặc không khớp với Email/Số điện thoại mới.");
        }
        _cache.Remove(OtpCacheKey(maTaiKhoan));
    }

    private async Task<HoSoResponse> CapNhatKhachHangAsync(
        long maTaiKhoan, string hoTen, string email, string sdt, string? diaChi, DateOnly? ngaySinh, string? anh)
    {
        await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        var kh = await _context.KhachHangs.Include(k => k.TaiKhoan).FirstAsync(k => k.MaTaiKhoan == maTaiKhoan);
        var truoc = new { kh.HoTen, kh.TaiKhoan.Email, kh.TaiKhoan.SoDienThoai, kh.DiaChi, kh.NgaySinh, kh.AnhDaiDien };

        kh.TaiKhoan.Email = email;
        kh.TaiKhoan.SoDienThoai = sdt;
        kh.TaiKhoan.NgayCapNhat = DateTime.UtcNow;
        kh.CapNhatHoSo(hoTen, diaChi, ngaySinh, anh);

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            maTaiKhoan, "CAP_NHAT_HO_SO", "KHACH_HANG", kh.MaKhachHang.ToString(),
            truoc, new { kh.HoTen, Email = email, SoDienThoai = sdt, kh.DiaChi, kh.NgaySinh, kh.AnhDaiDien }, null));
        return Map(kh);
    }

    private async Task<HoSoResponse> CapNhatNhanVienAsync(long maTaiKhoan, string hoTen, string email, string sdt)
    {
        var nv = await _context.NhanViens.Include(n => n.TaiKhoan).FirstOrDefaultAsync(n => n.MaTaiKhoan == maTaiKhoan)
            ?? throw new KhongCoQuyenException("Không tìm thấy hồ sơ nhân viên.");

        var truoc = new { nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai };
        nv.TaiKhoan.Email = email;
        nv.TaiKhoan.SoDienThoai = sdt;
        nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;
        nv.HoTen = hoTen;

        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
            maTaiKhoan, "CAP_NHAT_HO_SO", "NHAN_VIEN", nv.MaNhanVien.ToString(),
            truoc, new { nv.HoTen, Email = email, SoDienThoai = sdt }, null));
        return new HoSoResponse(nv.MaNhanVien, nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai, null, null, null);
    }

    private static bool LaViPhamUnique(DbUpdateException ex)
        => ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true
           || ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;
}
