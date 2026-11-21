using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhaCungCap;
using GearGo.Models.Entities;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

/// <summary>
/// Dịch vụ quản lý nhà cung cấp và lịch sử nhập hàng.
/// </summary>
public partial class NhaCungCapService : INhaCungCapService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NhaCungCapService> _logger;

    public NhaCungCapService(ApplicationDbContext context, ILogger<NhaCungCapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResult<NhaCungCapResponse>> TimKiemAsync(
        string? tuKhoa, string? trangThaiHopTac, int trang = 1, int soMoiTrang = 20, CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.NhaCungCaps.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(trangThaiHopTac))
            query = query.Where(x => x.TrangThaiHopTac == trangThaiHopTac.Trim());

        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var keyword = tuKhoa.Trim();
            query = query.Where(x =>
                x.MaNhaCungCapHienThi.Contains(keyword) ||
                x.TenNhaCungCap.Contains(keyword) ||
                (x.SoDienThoai != null && x.SoDienThoai.Contains(keyword)) ||
                (x.Email != null && x.Email.Contains(keyword)) ||
                (x.NguoiLienHe != null && x.NguoiLienHe.Contains(keyword)));
        }

        var totalItems = await query.CountAsync(ct);
        var items = await query.OrderBy(x => x.TenNhaCungCap).ThenBy(x => x.MaNhaCungCap)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang)
            .Select(x => MapToResponse(x, null))
            .ToListAsync(ct);

        return new PagedResult<NhaCungCapResponse>
        {
            Items = items, TotalItems = totalItems, CurrentPage = trang, PageSize = soMoiTrang
        };
    }

    public async Task<NhaCungCapResponse> LayChiTietAsync(long id, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.AsNoTracking().FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");
        return MapToResponse(ncc, null);
    }

    public async Task<NhaCungCapResponse> TaoAsync(TaoNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var (sdt, email) = KiemTraLienHe(request.SoDienThoai, request.Email);
        var maHienThiChuan = request.MaHienThi.Trim().ToUpper();
        if (await _context.NhaCungCaps.AnyAsync(x => x.MaNhaCungCapHienThi.ToUpper() == maHienThiChuan, ct))
            throw new XungDotDuLieuException("MA_NCC_TRUNG", $"Mã nhà cung cấp '{request.MaHienThi}' đã tồn tại trong hệ thống.");

        string? canhBaoTrung = null;
        if (!string.IsNullOrWhiteSpace(sdt) && await _context.NhaCungCaps.AnyAsync(x => x.SoDienThoai == sdt, ct))
            canhBaoTrung = $"Cảnh báo: Số điện thoại {sdt} đã tồn tại ở nhà cung cấp khác.";
        else if (!string.IsNullOrWhiteSpace(email) && await _context.NhaCungCaps.AnyAsync(x => x.Email == email, ct))
            canhBaoTrung = $"Cảnh báo: Email {email} đã tồn tại ở nhà cung cấp khác.";

        var ncc = new NhaCungCap
        {
            MaNhaCungCapHienThi = maHienThiChuan, TenNhaCungCap = request.Ten.Trim(),
            NguoiLienHe = request.NguoiLienHe?.Trim(), SoDienThoai = sdt, Email = email,
            DiaChi = request.DiaChi?.Trim(), MaSoThue = request.MaSoThue?.Trim(),
            GhiChu = request.GhiChu?.Trim(), TrangThaiHopTac = "DangHopTac"
        };
        _context.NhaCungCaps.Add(ncc);
        // Lưu trước để lấy MaNhaCungCap tự tăng thật rồi mới ghi nhật ký (tránh MaDoiTuong = "0" — UC7.1)
        await _context.SaveChangesAsync(ct);

        GhiNhatKyNcc(maTaiKhoan, "TAO_NHA_CUNG_CAP", ncc.MaNhaCungCap.ToString(),
            $"Tạo nhà cung cấp '{ncc.TenNhaCungCap}' (Mã: {ncc.MaNhaCungCapHienThi})");

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Đã tạo mới nhà cung cấp {MaHienThi} bởi tài khoản #{MaTaiKhoan}", ncc.MaNhaCungCapHienThi, maTaiKhoan);
        return MapToResponse(ncc, canhBaoTrung);
    }

    public async Task<NhaCungCapResponse> CapNhatAsync(long id, CapNhatNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");
        var (sdt, email) = KiemTraLienHe(request.SoDienThoai, request.Email);

        // Không sửa MaNhaCungCapHienThi để giữ nguyên tham chiếu chứng từ cũ.
        ncc.TenNhaCungCap = request.Ten.Trim();
        ncc.NguoiLienHe = request.NguoiLienHe?.Trim();
        ncc.SoDienThoai = sdt;
        ncc.Email = email;
        ncc.DiaChi = request.DiaChi?.Trim();
        ncc.MaSoThue = request.MaSoThue?.Trim();
        ncc.GhiChu = request.GhiChu?.Trim();

        GhiNhatKyNcc(maTaiKhoan, "CAP_NHAT_NHA_CUNG_CAP", id.ToString(),
            $"Cập nhật nhà cung cấp #{id}. Lý do: {request.LyDoThayDoi ?? "Không có"}");

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Cập nhật thành công nhà cung cấp #{Id} bởi tài khoản #{MaTaiKhoan}", id, maTaiKhoan);
        return MapToResponse(ncc, null);
    }

    public async Task<NhaCungCapResponse> DoiTrangThaiHopTacAsync(long id, DoiHopTacRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        var trangThaiMoi = request.TrangThaiHopTac.Trim();
        if (ncc.TrangThaiHopTac == trangThaiMoi) return MapToResponse(ncc, null);

        var trangThaiCu = ncc.TrangThaiHopTac;
        ncc.TrangThaiHopTac = trangThaiMoi;
        GhiNhatKyNcc(maTaiKhoan, "DOI_TRANG_THAI_HOP_TAC_NCC", id.ToString(),
            $"Đổi trạng thái NCC #{id} từ '{trangThaiCu}' sang '{trangThaiMoi}'. Lý do: {request.LyDo}");

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Nhà cung cấp #{Id} đổi trạng thái hợp tác sang {TrangThaiMoi}", id, trangThaiMoi);
        return MapToResponse(ncc, null);
    }

    private static (string? Sdt, string? Email) KiemTraLienHe(string? soDienThoai, string? email)
    {
        var sdt = soDienThoai?.Trim();
        var mail = email?.Trim();
        if (string.IsNullOrWhiteSpace(sdt) && string.IsNullOrWhiteSpace(mail))
            throw new DuLieuKhongHopLeException("THIEU_LIEN_HE",
                "Nhà cung cấp bắt buộc phải có ít nhất một thông tin liên hệ (số điện thoại hoặc email).");
        return (sdt, mail);
    }

    private void GhiNhatKyNcc(long maTaiKhoan, string hanhDong, string maDoiTuong, string lyDo) =>
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan, HanhDong = hanhDong,
            LoaiDoiTuong = nameof(NhaCungCap), MaDoiTuong = maDoiTuong,
            LyDo = lyDo, ThoiDiem = DateTime.UtcNow
        });

    private static NhaCungCapResponse MapToResponse(NhaCungCap x, string? canhBaoTrung) => new()
    {
        MaNhaCungCap = x.MaNhaCungCap, MaNhaCungCapHienThi = x.MaNhaCungCapHienThi,
        TenNhaCungCap = x.TenNhaCungCap, NguoiLienHe = x.NguoiLienHe,
        SoDienThoai = x.SoDienThoai, Email = x.Email, DiaChi = x.DiaChi,
        MaSoThue = x.MaSoThue, GhiChu = x.GhiChu,
        TrangThaiHopTac = x.TrangThaiHopTac, CanhBaoTrung = canhBaoTrung
    };
}
