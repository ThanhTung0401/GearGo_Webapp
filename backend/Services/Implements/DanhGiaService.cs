using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý và xử lý đánh giá sản phẩm (W5-T6)
/// </summary>
public class DanhGiaService : IDanhGiaService
{
    private readonly ApplicationDbContext _context;

    public DanhGiaService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<SanPhamDuDieuKienDanhGiaResponse>>> LaySanPhamDuDieuKienDanhGiaAsync(long maTaiKhoan)
    {
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);

        // Lấy tất cả chi tiết thuộc các đơn hoàn tất của khách hàng
        var chiTiets = await _context.ChiTietDonThues
            .AsNoTracking()
            .Include(c => c.DonThue)
            .Include(c => c.SanPham)
                .ThenInclude(s => s.HinhAnhs)
            .Include(c => c.DanhGia)
            .Where(c => c.DonThue.MaKhachHang == maKhachHang && c.DonThue.TrangThai == TrangThaiDonThue.HoanTat)
            .OrderByDescending(c => c.DonThue.NgayDat)
            .ToListAsync();

        // Nhóm theo (MaDonThue, MaSanPham) để tuân thủ quy tắc 1 sản phẩm / 1 đơn
        var grouped = chiTiets
            .GroupBy(c => new { c.MaDonThue, c.MaSanPham })
            .Select(g =>
            {
                var daiDien = g.First();
                var daDanhGia = g.Any(x => x.DanhGia != null);

                return new SanPhamDuDieuKienDanhGiaResponse
                {
                    MaChiTietDon = daiDien.MaChiTietDon,
                    MaDonThue = daiDien.MaDonThue,
                    MaDonHienThi = daiDien.DonThue.MaDonHienThi,
                    MaSanPham = daiDien.MaSanPham,
                    TenSanPham = daiDien.SanPham.TenSanPham,
                    HinhAnhChinh = daiDien.SanPham.HinhAnhs.FirstOrDefault(h => h.LaAnhChinh)?.DuongDan
                                   ?? daiDien.SanPham.HinhAnhs.FirstOrDefault()?.DuongDan,
                    NgayHoanTat = daiDien.DonThue.NgayDat,
                    DaDanhGia = daDanhGia
                };

            })
            .ToList();

        return Result<List<SanPhamDuDieuKienDanhGiaResponse>>.Ok(grouped);
    }

    public async Task<Result<DanhGiaResponse>> TaoDanhGiaAsync(TaoDanhGiaRequest request, long maTaiKhoan)
    {
        // 1. Kiểm tra validation số sao
        if (request.SoSao < 1 || request.SoSao > 5)
        {
            return Result<DanhGiaResponse>.Loi("SO_SAO_KHONG_HOP_LE", "Số sao đánh giá phải từ 1 đến 5.");
        }

        // 2. Kiểm tra danh sách ảnh
        if (request.DanhSachAnh != null && request.DanhSachAnh.Count > 5)
        {
            return Result<DanhGiaResponse>.Loi("ANH_VUOT_GIOI_HAN", "Tối đa chỉ được đính kèm 5 ảnh.");
        }

        // 3. Tìm chi tiết đơn thuê kèm đơn thuê và khách hàng
        var chiTiet = await _context.ChiTietDonThues
            .Include(c => c.DonThue)
                .ThenInclude(d => d.KhachHang)
            .Include(c => c.SanPham)
            .FirstOrDefaultAsync(c => c.MaChiTietDon == request.MaChiTietDon);

        if (chiTiet == null)
        {
            return Result<DanhGiaResponse>.Loi("CHI_TIET_DON_NOT_FOUND", "Chi tiết đơn thuê không tồn tại.");
        }

        // 4. Kiểm tra quyền sở hữu đơn
        if (chiTiet.DonThue.KhachHang.MaTaiKhoan != maTaiKhoan)
        {
            return Result<DanhGiaResponse>.Loi("DANH_GIA_KHONG_THUOC_KHACH", "Bạn không có quyền đánh giá đơn thuê này.");
        }

        // 5. Kiểm tra trạng thái đơn: Phải là HoanTat
        if (chiTiet.DonThue.TrangThai != TrangThaiDonThue.HoanTat)
        {
            return Result<DanhGiaResponse>.Loi("DON_CHUA_HOAN_TAT", "Chỉ được đánh giá khi đơn thuê đã hoàn tất (HoanTat).");
        }

        // 6. Kiểm tra quy tắc 1 sản phẩm / 1 đơn hoàn tất (chống spam nhiều dòng cùng 1 sp)
        var cacChiTietCungSanPham = await _context.ChiTietDonThues
            .Where(c => c.MaDonThue == chiTiet.MaDonThue && c.MaSanPham == chiTiet.MaSanPham)
            .Select(c => c.MaChiTietDon)
            .ToListAsync();

        var daCoDanhGia = await _context.DanhGias
            .AnyAsync(d => cacChiTietCungSanPham.Contains(d.MaChiTietDon));

        if (daCoDanhGia)
        {
            return Result<DanhGiaResponse>.Loi("SAN_PHAM_TRONG_DON_DA_DANH_GIA", "Sản phẩm này trong đơn thuê đã được đánh giá.");
        }

        // 7. Tạo bản ghi Đánh giá mới
        string? danhSachAnhJson = null;
        if (request.DanhSachAnh != null && request.DanhSachAnh.Count > 0)
        {
            danhSachAnhJson = JsonSerializer.Serialize(request.DanhSachAnh);
        }

        var danhGia = new DanhGia
        {
            MaChiTietDon = request.MaChiTietDon,
            SoSao = request.SoSao,
            NoiDung = request.NoiDung?.Trim(),
            DanhSachAnh = danhSachAnhJson,
            NgayTao = DateTime.UtcNow,
            TrangThaiHienThi = "HienThi"
        };

        _context.DanhGias.Add(danhGia);
        await _context.SaveChangesAsync();

        var response = MapToResponse(danhGia, chiTiet.SanPham.TenSanPham, chiTiet.DonThue.KhachHang.HoTen, chiTiet.MaSanPham);
        return Result<DanhGiaResponse>.Ok(response);
    }

    public async Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaCuaToiAsync(int trang, int soMoiTrang, long maTaiKhoan)
    {
        var maKhachHang = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.DanhGias
            .AsNoTracking()
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.DonThue)
                    .ThenInclude(dt => dt.KhachHang)
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.SanPham)
            .Where(d => d.ChiTietDonThue.DonThue.MaKhachHang == maKhachHang)
            .OrderByDescending(d => d.NgayTao);

        var totalItems = await query.CountAsync();
        var items = await query
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync();

        var resItems = items.Select(d => MapToResponse(d, 
            d.ChiTietDonThue.SanPham.TenSanPham, 
            d.ChiTietDonThue.DonThue.KhachHang.HoTen, 
            d.ChiTietDonThue.MaSanPham)).ToList();

        return Result<PagedResult<DanhGiaResponse>>.Ok(new PagedResult<DanhGiaResponse>
        {
            Items = resItems,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    public async Task<Result<PagedResult<DanhGiaResponse>>> LayDanhGiaSanPhamAsync(LocDanhGiaRequest request)
    {
        var trang = request.Trang < 1 ? 1 : request.Trang;
        var soMoiTrang = Math.Clamp(request.SoMoiTrang, 1, 100);

        // Chỉ lấy các đánh giá đang hiển thị và liên kết đúng sản phẩm qua CHI_TIET_DON_THUE
        var query = _context.DanhGias
            .AsNoTracking()
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.DonThue)
                    .ThenInclude(dt => dt.KhachHang)
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.SanPham)
            .Where(d => d.TrangThaiHienThi == "HienThi" && d.ChiTietDonThue.MaSanPham == request.SanPhamId);

        if (request.SoSao.HasValue && request.SoSao.Value >= 1 && request.SoSao.Value <= 5)
        {
            query = query.Where(d => d.SoSao == request.SoSao.Value);
        }

        switch (request.ThuTu?.ToLower())
        {
            case "diemcao":
                query = query.OrderByDescending(d => d.SoSao).ThenByDescending(d => d.NgayTao);
                break;
            case "diemthap":
                query = query.OrderBy(d => d.SoSao).ThenByDescending(d => d.NgayTao);
                break;
            default:
                query = query.OrderByDescending(d => d.NgayTao);
                break;
        }

        var totalItems = await query.CountAsync();
        var items = await query
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync();

        var resItems = items.Select(d => MapToResponse(d, 
            d.ChiTietDonThue.SanPham.TenSanPham, 
            AnDanhTen(d.ChiTietDonThue.DonThue.KhachHang.HoTen), 
            d.ChiTietDonThue.MaSanPham)).ToList();

        return Result<PagedResult<DanhGiaResponse>>.Ok(new PagedResult<DanhGiaResponse>
        {
            Items = resItems,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    public async Task<Result<TongHopDanhGiaResponse>> LayTongHopDiemAsync(long sanPhamId)
    {
        // Lấy tất cả đánh giá đang hiển thị của sản phẩm
        var danhGias = await _context.DanhGias
            .AsNoTracking()
            .Where(d => d.TrangThaiHienThi == "HienThi" && d.ChiTietDonThue.MaSanPham == sanPhamId)
            .Select(d => d.SoSao)
            .ToListAsync();

        var response = new TongHopDanhGiaResponse
        {
            SoDanhGia = danhGias.Count
        };

        if (danhGias.Count == 0)
        {
            response.DiemTrungBinh = null;
            return Result<TongHopDanhGiaResponse>.Ok(response);
        }

        response.DiemTrungBinh = Math.Round(danhGias.Average(), 1);

        foreach (var sao in danhGias)
        {
            if (response.ThongKe1Den5Sao.ContainsKey(sao))
            {
                response.ThongKe1Den5Sao[sao]++;
            }
        }

        return Result<TongHopDanhGiaResponse>.Ok(response);
    }

    public async Task<Result<PagedResult<DanhGiaResponse>>> AdminLayDanhSachDanhGiaAsync(int trang, int soMoiTrang, string? trangThai)
    {
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.DanhGias
            .AsNoTracking()
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.DonThue)
                    .ThenInclude(dt => dt.KhachHang)
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.SanPham)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(trangThai))
        {
            query = query.Where(d => d.TrangThaiHienThi == trangThai);
        }

        query = query.OrderByDescending(d => d.NgayTao);

        var totalItems = await query.CountAsync();
        var items = await query
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .ToListAsync();

        var resItems = items.Select(d => MapToResponse(d, 
            d.ChiTietDonThue.SanPham.TenSanPham, 
            d.ChiTietDonThue.DonThue.KhachHang.HoTen, 
            d.ChiTietDonThue.MaSanPham)).ToList();

        return Result<PagedResult<DanhGiaResponse>>.Ok(new PagedResult<DanhGiaResponse>
        {
            Items = resItems,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        });
    }

    public async Task<Result<DanhGiaResponse>> AnDanhGiaAsync(long maDanhGia, AnDanhGiaRequest request, long maTaiKhoanAdmin)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin);
        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoanAdmin);

        var danhGia = await _context.DanhGias
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.SanPham)
            .Include(d => d.ChiTietDonThue.DonThue.KhachHang)
            .FirstOrDefaultAsync(d => d.MaDanhGia == maDanhGia);

        if (danhGia == null)
        {
            return Result<DanhGiaResponse>.Loi("DANH_GIA_NOT_FOUND", "Đánh giá không tồn tại.");
        }

        danhGia.TrangThaiHienThi = "BiAn";
        danhGia.LyDoAn = request.LyDo;
        danhGia.MaNguoiAn = maNhanVien;
        danhGia.NgayCapNhat = DateTime.UtcNow;

        // Ghi nhật ký thao tác
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin,
            HanhDong = "AN_DANH_GIA",
            LoaiDoiTuong = "DANH_GIA",
            MaDoiTuong = maDanhGia.ToString(),
            LyDo = request.LyDo,
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var response = MapToResponse(danhGia, 
            danhGia.ChiTietDonThue.SanPham.TenSanPham, 
            danhGia.ChiTietDonThue.DonThue.KhachHang.HoTen, 
            danhGia.ChiTietDonThue.MaSanPham);

        return Result<DanhGiaResponse>.Ok(response);
    }

    public async Task<Result<DanhGiaResponse>> KhoiPhucDanhGiaAsync(long maDanhGia, KhoiPhucDanhGiaRequest request, long maTaiKhoanAdmin)
    {
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin);

        var danhGia = await _context.DanhGias
            .Include(d => d.ChiTietDonThue)
                .ThenInclude(c => c.SanPham)
            .Include(d => d.ChiTietDonThue.DonThue.KhachHang)
            .FirstOrDefaultAsync(d => d.MaDanhGia == maDanhGia);

        if (danhGia == null)
        {
            return Result<DanhGiaResponse>.Loi("DANH_GIA_NOT_FOUND", "Đánh giá không tồn tại.");
        }

        danhGia.TrangThaiHienThi = "HienThi";
        danhGia.NgayCapNhat = DateTime.UtcNow;

        // Ghi nhật ký thao tác
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin,
            HanhDong = "KHOI_PHUC_DANH_GIA",
            LoaiDoiTuong = "DANH_GIA",
            MaDoiTuong = maDanhGia.ToString(),
            LyDo = request.LyDo ?? "Quản trị viên khôi phục hiển thị đánh giá",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var response = MapToResponse(danhGia, 
            danhGia.ChiTietDonThue.SanPham.TenSanPham, 
            danhGia.ChiTietDonThue.DonThue.KhachHang.HoTen, 
            danhGia.ChiTietDonThue.MaSanPham);

        return Result<DanhGiaResponse>.Ok(response);
    }

    #region Helper Methods

    private static DanhGiaResponse MapToResponse(DanhGia d, string tenSanPham, string tenNguoiDung, long maSanPham)
    {
        List<string> danhSachAnh = new();
        if (!string.IsNullOrWhiteSpace(d.DanhSachAnh))
        {
            try
            {
                danhSachAnh = JsonSerializer.Deserialize<List<string>>(d.DanhSachAnh) ?? new();
            }
            catch
            {
                danhSachAnh = new();
            }
        }

        return new DanhGiaResponse
        {
            MaDanhGia = d.MaDanhGia,
            MaChiTietDon = d.MaChiTietDon,
            MaSanPham = maSanPham,
            TenSanPham = tenSanPham,
            TenNguoiDung = tenNguoiDung,
            SoSao = d.SoSao,
            NoiDung = d.NoiDung,
            DanhSachAnh = danhSachAnh,
            NgayTao = d.NgayTao,
            TrangThaiHienThi = d.TrangThaiHienThi,
            LyDoAn = d.LyDoAn
        };
    }

    /// <summary>
    /// Ẩn danh tên khách hàng (vd: "Nguyễn Văn A" -> "Nguyễn V***")
    /// </summary>
    private static string AnDanhTen(string hoTen)
    {
        if (string.IsNullOrWhiteSpace(hoTen)) return "Khách hàng";
        var parts = hoTen.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 1) return parts[0].Length > 1 ? parts[0][0] + "***" : parts[0];
        return $"{parts[0]} {parts[^1][0]}***";
    }

    #endregion
}
