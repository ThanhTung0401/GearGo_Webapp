using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuanTriTaiKhoan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class NhanVienService : INhanVienService
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

        // Danh sách không kèm việc cần bàn giao để tránh N+1; chi tiết/nghỉ việc mới trả.
        var items = rows.Select(n => Map(n, Array.Empty<CongViecCanBanGiaoResponse>())).ToList();
        return Result<PhanTrangResponse<NhanVienResponse>>.Ok(new(items, tongSo, trang, soMoiTrang));
    }

    public async Task<Result<NhanVienResponse>> LayNhanVienAsync(long maNhanVien, long actorId, CancellationToken ct = default)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, actorId, ct);
        var nv = await _context.NhanViens.AsNoTracking().Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();
        return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));
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
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole,
                "Vai trò chỉ được là NhanVien hoặc QuanTriVien.");
        if ((request.MatKhauKhoiTao?.Length ?? 0) < 8 || request.MatKhauKhoiTao!.Length > 100)
            loi["matKhauKhoiTao"] = "Mật khẩu khởi tạo từ 8 đến 100 ký tự.";
        if (loi.Count > 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Hồ sơ nhân viên không hợp lệ.", loi);

        var lienHe = Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists,
            "Email hoặc số điện thoại đã thuộc tài khoản khác.");

        await using var tx = await _context.Database.BeginTransactionAsync(ct);

        if (await _context.TaiKhoans.AnyAsync(t => t.Email == email || t.SoDienThoai == sdt, ct)) return lienHe;

        var now = DateTime.UtcNow;
        var tk = new TaiKhoan
        {
            Email = email,
            SoDienThoai = sdt,
            MatKhauBam = BCrypt.Net.BCrypt.HashPassword(request.MatKhauKhoiTao, workFactor: 12),
            VaiTro = vaiTro,
            TrangThai = DomainConstants.AccountStatus.Active,
            NgayTao = now,
            NgayCapNhat = now
        };
        var nv = new NhanVien
        {
            TaiKhoan = tk,
            HoTen = hoTen,
            DiaChi = diaChi,
            NgayVaoLam = ngayVaoLam,
            TrangThaiLamViec = DomainConstants.StaffStatus.Working
        };
        _context.NhanViens.Add(nv); // thêm cả tài khoản qua navigation, cùng một SaveChanges.

        try
        {
            await _context.SaveChangesAsync(ct);

            // Nhật ký cần mã nhân viên nên ghi sau khi có khóa; không chứa mật khẩu.
            _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(
                actorId, "TAO_NHAN_VIEN", "NHAN_VIEN", nv.MaNhanVien.ToString(), null,
                new { nv.MaNhanVien, tk.MaTaiKhoan, nv.HoTen, tk.Email, tk.SoDienThoai, tk.VaiTro, nv.NgayVaoLam }, null));
            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (QuanTriNhanSuHelper.LaViPhamUnique(ex))
        {
            // Unique index là chốt cuối khi hai yêu cầu tạo đồng thời; transaction rollback, không còn TAI_KHOAN mồ côi.
            return lienHe;
        }

        return Result<NhanVienResponse>.Ok(Map(nv, Array.Empty<CongViecCanBanGiaoResponse>()));
    }

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
        var nv = await _context.NhanViens.Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();

        if (request.NgayVaoLam.HasValue && nv.NgayNghiViec.HasValue && nv.NgayNghiViec.Value < request.NgayVaoLam.Value)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData,
                "Ngày vào làm không được sau ngày nghỉ việc.");

        if (await _context.TaiKhoans.AnyAsync(t =>
                t.MaTaiKhoan != nv.MaTaiKhoan && (t.Email == email || t.SoDienThoai == sdt), ct))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists,
                "Email hoặc số điện thoại đã thuộc tài khoản khác.");

        var truoc = new { nv.HoTen, nv.TaiKhoan.Email, nv.TaiKhoan.SoDienThoai, nv.DiaChi, nv.NgayVaoLam };

        // Chỉ sửa hồ sơ hiện tại; tên đã lưu trên phiếu bàn giao/nhận trả/đối soát (snapshot) giữ nguyên.
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
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.ContactExists,
                "Email hoặc số điện thoại đã thuộc tài khoản khác.");
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
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole,
                "Vai trò chỉ được là NhanVien hoặc QuanTriVien.");
        if (lyDo.Length == 0 || lyDo.Length > 1000)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData, "Lý do bắt buộc, tối đa 1000 ký tự.");

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        await QuanTriNhanSuHelper.KhoaNhomQuanTriAsync(_context, ct);

        var nv = await _context.NhanViens.Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();

        // Không biến khách thành nhân sự: tài khoản phải đã là NhanVien/QuanTriVien có hồ sơ.
        if (!QuanTriNhanSuHelper.VaiTroNhanSu.Contains(nv.TaiKhoan.VaiTro))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidRole,
                "Tài khoản không thuộc nhóm nhân sự.");
        if (nv.TrangThaiLamViec == DomainConstants.StaffStatus.Resigned)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.StaffResigned, "Nhân viên đã nghỉ việc.");

        if (nv.TaiKhoan.VaiTro == vaiTroMoi) // retry: kết quả cũ
            return Result<NhanVienResponse>.Ok(Map(nv, await CongViecMoAsync(nv.MaNhanVien, ct)));

        if (QuanTriNhanSuHelper.LaQuanTriHoatDong(nv.TaiKhoan, nv) && vaiTroMoi != "QuanTriVien"
            && await QuanTriNhanSuHelper.DemQuanTriHoatDongKhacAsync(_context, nv.MaTaiKhoan, ct) == 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.LastActiveAdmin,
                "Không thể hạ quyền quản trị viên hoạt động cuối cùng.");

        var truoc = nv.TaiKhoan.VaiTro;
        nv.TaiKhoan.VaiTro = vaiTroMoi;
        nv.TaiKhoan.NgayCapNhat = DateTime.UtcNow;
        // Quyền được đọc từ database ở mỗi request (xem JwtBearer OnTokenValidated) nên không có cache cần vô hiệu.

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

        var nv = await _context.NhanViens.Include(n => n.TaiKhoan)
            .FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien, ct);
        if (nv == null) return KhongThay();

        if (nv.TrangThaiLamViec == DomainConstants.StaffStatus.Resigned)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.StaffResigned, "Nhân viên đã nghỉ việc.");

        var homNay = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1); // dung sai múi giờ Việt Nam
        if (request.NgayNghiViec > homNay || (nv.NgayVaoLam.HasValue && request.NgayNghiViec < nv.NgayVaoLam.Value))
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.InvalidData,
                "Ngày nghỉ việc phải từ ngày vào làm và không ở tương lai.");

        if (QuanTriNhanSuHelper.LaQuanTriHoatDong(nv.TaiKhoan, nv)
            && await QuanTriNhanSuHelper.DemQuanTriHoatDongKhacAsync(_context, nv.MaTaiKhoan, ct) == 0)
            return Result<NhanVienResponse>.Loi(DomainConstants.Errors.LastActiveAdmin,
                "Không thể cho nghỉ việc quản trị viên hoạt động cuối cùng.");

        var truoc = new { nv.TrangThaiLamViec, nv.NgayNghiViec, TrangThaiTaiKhoan = nv.TaiKhoan.TrangThai };

        // Cùng transaction: ghi nghỉ + ngừng quyền truy cập. Hồ sơ và chứng từ giữ nguyên; phiếu bảo trì không bị đụng tới.
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
