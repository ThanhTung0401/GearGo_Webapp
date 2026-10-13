using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhaCungCap;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý Nhà cung cấp (W3-T3 - Kiện Minh)
/// </summary>
public class NhaCungCapService : INhaCungCapService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NhaCungCapService> _logger;

    public NhaCungCapService(ApplicationDbContext context, ILogger<NhaCungCapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Tìm kiếm và phân trang nhà cung cấp theo từ khóa và trạng thái hợp tác
    /// </summary>
    public async Task<PagedResult<NhaCungCapResponse>> TimKiemAsync(
        string? tuKhoa, 
        string? trangThaiHopTac, 
        int trang = 1, 
        int soMoiTrang = 20, 
        CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.NhaCungCaps.AsNoTracking().AsQueryable();

        // 1. Lọc theo trạng thái hợp tác nếu có
        if (!string.IsNullOrWhiteSpace(trangThaiHopTac))
        {
            query = query.Where(x => x.TrangThaiHopTac == trangThaiHopTac.Trim());
        }

        // 2. Tìm kiếm theo từ khóa (Mã hiển thị, Tên, Số điện thoại, Email)
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

        var items = await query
            .OrderBy(x => x.TenNhaCungCap)
            .ThenBy(x => x.MaNhaCungCap)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(x => MapToResponse(x, null))
            .ToListAsync(ct);

        return new PagedResult<NhaCungCapResponse>
        {
            Items = items,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        };
    }

    /// <summary>
    /// Lấy thông tin chi tiết một nhà cung cấp
    /// </summary>
    public async Task<NhaCungCapResponse> LayChiTietAsync(long id, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct);

        if (ncc == null)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        return MapToResponse(ncc, null);
    }

    /// <summary>
    /// Tạo mới một nhà cung cấp (chỉ Quản trị viên)
    /// </summary>
    public async Task<NhaCungCapResponse> TaoAsync(TaoNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        // 1. Kiểm tra điều kiện bắt buộc: phải có tên và ít nhất 1 kênh liên hệ (SĐT hoặc Email)
        var sdt = request.SoDienThoai?.Trim();
        var email = request.Email?.Trim();

        if (string.IsNullOrWhiteSpace(sdt) && string.IsNullOrWhiteSpace(email))
        {
            throw new DuLieuKhongHopLeException("THIEU_LIEN_HE", 
                "Nhà cung cấp bắt buộc phải có ít nhất một thông tin liên hệ (số điện thoại hoặc email).");
        }

        // 2. Chuẩn hóa mã hiển thị và kiểm tra trùng
        var maHienThiChuan = request.MaHienThi.Trim().ToUpper();
        var isDuplicateMa = await _context.NhaCungCaps
            .AnyAsync(x => x.MaNhaCungCapHienThi.ToUpper() == maHienThiChuan, ct);

        if (isDuplicateMa)
        {
            throw new XungDotDuLieuException("MA_NCC_TRUNG", 
                $"Mã nhà cung cấp '{request.MaHienThi}' đã tồn tại trong hệ thống.");
        }

        // 3. Kiểm tra cảnh báo nghi trùng SĐT hoặc Email (không chặn nếu ERD không ép unique, nhưng ghi cảnh báo)
        string? canhBaoTrung = null;
        if (!string.IsNullOrWhiteSpace(sdt) && await _context.NhaCungCaps.AnyAsync(x => x.SoDienThoai == sdt, ct))
        {
            canhBaoTrung = $"Cảnh báo: Số điện thoại {sdt} đã tồn tại ở nhà cung cấp khác.";
        }
        else if (!string.IsNullOrWhiteSpace(email) && await _context.NhaCungCaps.AnyAsync(x => x.Email == email, ct))
        {
            canhBaoTrung = $"Cảnh báo: Email {email} đã tồn tại ở nhà cung cấp khác.";
        }

        // 4. Tạo thực thể Nhà cung cấp mới
        var ncc = new NhaCungCap
        {
            MaNhaCungCapHienThi = maHienThiChuan,
            TenNhaCungCap = request.Ten.Trim(),
            NguoiLienHe = request.NguoiLienHe?.Trim(),
            SoDienThoai = sdt,
            Email = email,
            DiaChi = request.DiaChi?.Trim(),
            MaSoThue = request.MaSoThue?.Trim(),
            GhiChu = request.GhiChu?.Trim(),
            TrangThaiHopTac = "DangHopTac"
        };

        _context.NhaCungCaps.Add(ncc);

        // 5. Ghi nhật ký thao tác kiểm toán (Audit Log)
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "TAO_NHA_CUNG_CAP",
            LoaiDoiTuong = nameof(NhaCungCap),
            MaDoiTuong = ncc.MaNhaCungCap.ToString(),
            LyDo = $"Tạo nhà cung cấp '{ncc.TenNhaCungCap}' (Mã: {ncc.MaNhaCungCapHienThi})",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Đã tạo mới nhà cung cấp {MaHienThi} bởi tài khoản #{MaTaiKhoan}", ncc.MaNhaCungCapHienThi, maTaiKhoan);

        return MapToResponse(ncc, canhBaoTrung);
    }

    /// <summary>
    /// Cập nhật thông tin chi tiết nhà cung cấp (chỉ Quản trị viên)
    /// </summary>
    public async Task<NhaCungCapResponse> CapNhatAsync(long id, CapNhatNhaCungCapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct);
        if (ncc == null)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        // 1. Kiểm tra kênh liên hệ
        var sdt = request.SoDienThoai?.Trim();
        var email = request.Email?.Trim();

        if (string.IsNullOrWhiteSpace(sdt) && string.IsNullOrWhiteSpace(email))
        {
            throw new DuLieuKhongHopLeException("THIEU_LIEN_HE", 
                "Nhà cung cấp bắt buộc phải có ít nhất một thông tin liên hệ (số điện thoại hoặc email).");
        }

        // 2. Cập nhật thông tin (tuyệt đối không sửa MaNhaCungCap, MaNhaCungCapHienThi để giữ vẹn toàn snapshot chứng từ)
        ncc.TenNhaCungCap = request.Ten.Trim();
        ncc.NguoiLienHe = request.NguoiLienHe?.Trim();
        ncc.SoDienThoai = sdt;
        ncc.Email = email;
        ncc.DiaChi = request.DiaChi?.Trim();
        ncc.MaSoThue = request.MaSoThue?.Trim();
        ncc.GhiChu = request.GhiChu?.Trim();

        // 3. Ghi nhật ký thao tác
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "CAP_NHAT_NHA_CUNG_CAP",
            LoaiDoiTuong = nameof(NhaCungCap),
            MaDoiTuong = id.ToString(),
            LyDo = $"Cập nhật nhà cung cấp #{id}. Lý do: {request.LyDoThayDoi ?? "Không có"}",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Cập nhật thành công nhà cung cấp #{Id} bởi tài khoản #{MaTaiKhoan}", id, maTaiKhoan);

        return MapToResponse(ncc, null);
    }

    /// <summary>
    /// Đổi trạng thái hợp tác của Nhà cung cấp (chỉ Quản trị viên)
    /// </summary>
    public async Task<NhaCungCapResponse> DoiTrangThaiHopTacAsync(long id, DoiHopTacRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == id, ct);
        if (ncc == null)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        var trangThaiMoi = request.TrangThaiHopTac.Trim();
        if (ncc.TrangThaiHopTac == trangThaiMoi)
        {
            return MapToResponse(ncc, null);
        }

        var trangThaiCu = ncc.TrangThaiHopTac;
        ncc.TrangThaiHopTac = trangThaiMoi;

        // Ghi nhật ký thao tác
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "DOI_TRANG_THAI_HOP_TAC_NCC",
            LoaiDoiTuong = nameof(NhaCungCap),
            MaDoiTuong = id.ToString(),
            LyDo = $"Đổi trạng thái NCC #{id} từ '{trangThaiCu}' sang '{trangThaiMoi}'. Lý do: {request.LyDo}",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Nhà cung cấp #{Id} đổi trạng thái hợp tác sang {TrangThaiMoi}", id, trangThaiMoi);

        return MapToResponse(ncc, null);
    }

    /// <summary>
    /// Tra cứu lịch sử nhập hàng thực tế của nhà cung cấp (chỉ tính các phiếu DaNhapKho)
    /// </summary>
    public async Task<LichSuNhapResponse> LayLichSuNhapAsync(long id, int trang = 1, int soMoiTrang = 20, CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var exists = await _context.NhaCungCaps.AnyAsync(x => x.MaNhaCungCap == id, ct);
        if (!exists)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        // Chỉ tổng hợp các phiếu đã nhập kho thực tế (DaNhapKho), bỏ qua phiếu nháp và đã hủy
        var queryPhieu = _context.PhieuNhapHangs.AsNoTracking()
            .Where(x => x.MaNhaCungCap == id && x.TrangThai == TrangThaiPhieuNhap.DaNhapKho);

        var tongSoPhieu = await queryPhieu.CountAsync(ct);
        var tongGiaTri = await queryPhieu.SumAsync(x => x.TongTien, ct);

        // Đếm tổng số lượng thiết bị nhập thực tế từ các dòng chi tiết của phiếu đã nhập
        var tongSoLuongThietBi = await _context.ChiTietPhieuNhaps.AsNoTracking()
            .Where(ctPn => queryPhieu.Select(p => p.MaPhieuNhap).Contains(ctPn.MaPhieuNhap))
            .SumAsync(ctPn => ctPn.SoLuong, ct);

        // Lấy danh sách phiếu có phân trang kèm các dòng sản phẩm
        var danhSachPhieu = await queryPhieu
            .OrderByDescending(x => x.NgayNhapThucTe ?? x.NgayLap)
            .ThenByDescending(x => x.MaPhieuNhap)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(p => new LichSuNhapItemResponse
            {
                MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuHienThi = p.MaPhieuHienThi,
                SoChungTuNhaCungCap = p.SoChungTuNhaCungCap,
                NgayLap = p.NgayLap,
                NgayNhapThucTe = p.NgayNhapThucTe,
                NgayXacNhan = p.NgayXacNhan,
                TongTien = p.TongTien,
                TenNguoiLap = p.TenNguoiLapLucNhap ?? p.NguoiLap.HoTen,
                TenNguoiXacNhan = p.TenNguoiXacNhanLucNhap ?? (p.NguoiXacNhan != null ? p.NguoiXacNhan.HoTen : null),
                ChiTietSanPham = p.ChiTietPhieuNhaps.Select(ctPn => new SanPhamNhapItemResponse
                {
                    MaChiTietPhieuNhap = ctPn.MaChiTietPhieuNhap,
                    MaSanPham = ctPn.MaSanPham,
                    TenSanPham = ctPn.SanPham.TenSanPham,
                    SoLuong = ctPn.SoLuong,
                    DonGiaNhap = ctPn.DonGiaNhap,
                    TinhTrangKhiNhap = ctPn.TinhTrangKhiNhap ?? ""
                }).ToList()
            })
            .ToListAsync(ct);

        return new LichSuNhapResponse
        {
            TongSoPhieuDaNhap = tongSoPhieu,
            TongGiaTriNhap = tongGiaTri,
            TongSoLuongThietBi = tongSoLuongThietBi,
            PhieuNhaps = new PagedResult<LichSuNhapItemResponse>
            {
                Items = danhSachPhieu,
                TotalItems = tongSoPhieu,
                CurrentPage = trang,
                PageSize = soMoiTrang
            }
        };
    }

    private static NhaCungCapResponse MapToResponse(NhaCungCap x, string? canhBaoTrung) => new()
    {
        MaNhaCungCap = x.MaNhaCungCap,
        MaNhaCungCapHienThi = x.MaNhaCungCapHienThi,
        TenNhaCungCap = x.TenNhaCungCap,
        NguoiLienHe = x.NguoiLienHe,
        SoDienThoai = x.SoDienThoai,
        Email = x.Email,
        DiaChi = x.DiaChi,
        MaSoThue = x.MaSoThue,
        GhiChu = x.GhiChu,
        TrangThaiHopTac = x.TrangThaiHopTac,
        CanhBaoTrung = canhBaoTrung
    };
}
