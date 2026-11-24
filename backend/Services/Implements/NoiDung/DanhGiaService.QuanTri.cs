using System.Text.Json;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DanhGia;
using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.NoiDung;

public partial class DanhGiaService
{
    public async Task<Result<PagedResult<DanhGiaResponse>>> AdminLayDanhSachDanhGiaAsync(int trang, int soMoiTrang, string? trangThai)
    {
        trang = trang < 1 ? 1 : trang;
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = QueryDanhGiaKemChiTiet().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(trangThai))
            query = query.Where(d => d.TrangThaiHienThi == trangThai);

        return Result<PagedResult<DanhGiaResponse>>.Ok(
            await PhanTrangAsync(query.OrderByDescending(d => d.NgayTao), trang, soMoiTrang, anDanhTenKhach: false));
    }

    public async Task<Result<DanhGiaResponse>> AnDanhGiaAsync(long maDanhGia, AnDanhGiaRequest request, long maTaiKhoanAdmin)
    {
        // Chỉ Quản trị viên được ẩn đánh giá (khớp hợp đồng ApiM9M10AuthTests)
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin);
        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, maTaiKhoanAdmin);

        var danhGia = await QueryDanhGiaKemChiTiet().FirstOrDefaultAsync(d => d.MaDanhGia == maDanhGia);
        if (danhGia == null) return Result<DanhGiaResponse>.Loi("DANH_GIA_NOT_FOUND", "Đánh giá không tồn tại.");
        // Idempotent nếu đánh giá đã ở trạng thái BiAn (UC9.2 dòng phụ 4.1)
        if (danhGia.TrangThaiHienThi == "BiAn")
            return Result<DanhGiaResponse>.Ok(MapToResponse(danhGia,
                danhGia.ChiTietDonThue.SanPham.TenSanPham,
                danhGia.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng",
                danhGia.ChiTietDonThue.MaSanPham));

        danhGia.TrangThaiHienThi = "BiAn";
        danhGia.LyDoAn = request.LyDo;
        danhGia.MaNguoiAn = maNhanVien;
        danhGia.NgayCapNhat = DateTime.UtcNow;

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin, HanhDong = "AN_DANH_GIA", LoaiDoiTuong = "DANH_GIA",
            MaDoiTuong = maDanhGia.ToString(), LyDo = request.LyDo, ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Result<DanhGiaResponse>.Ok(MapToResponse(danhGia,
            danhGia.ChiTietDonThue.SanPham.TenSanPham,
            danhGia.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng",
            danhGia.ChiTietDonThue.MaSanPham));
    }

    public async Task<Result<DanhGiaResponse>> KhoiPhucDanhGiaAsync(long maDanhGia, KhoiPhucDanhGiaRequest request, long maTaiKhoanAdmin)
    {
        // Chỉ Quản trị viên được khôi phục đánh giá (khớp hợp đồng ApiM9M10AuthTests)
        await ActorGuard.EnsureQuanTriVienAsync(_context, maTaiKhoanAdmin);

        var danhGia = await QueryDanhGiaKemChiTiet().FirstOrDefaultAsync(d => d.MaDanhGia == maDanhGia);
        if (danhGia == null) return Result<DanhGiaResponse>.Loi("DANH_GIA_NOT_FOUND", "Đánh giá không tồn tại.");
        // Idempotent nếu đánh giá đã ở trạng thái HienThi (UC9.2 dòng phụ 4.1)
        if (danhGia.TrangThaiHienThi == "HienThi")
            return Result<DanhGiaResponse>.Ok(MapToResponse(danhGia,
                danhGia.ChiTietDonThue.SanPham.TenSanPham,
                danhGia.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng",
                danhGia.ChiTietDonThue.MaSanPham));

        danhGia.TrangThaiHienThi = "HienThi";
        // REV-02: Xóa LyDoAn & MaNguoiAn khi khôi phục để UI không hiển thị
        // dòng chữ đỏ "Lý do ẩn: ..." trên thẻ đánh giá đã bỏ ẩn.
        danhGia.LyDoAn = null;
        danhGia.MaNguoiAn = null;
        danhGia.NgayCapNhat = DateTime.UtcNow;

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoanAdmin, HanhDong = "KHOI_PHUC_DANH_GIA", LoaiDoiTuong = "DANH_GIA",
            MaDoiTuong = maDanhGia.ToString(),
            LyDo = request.LyDo ?? "Quản trị viên khôi phục hiển thị đánh giá", ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Result<DanhGiaResponse>.Ok(MapToResponse(danhGia,
            danhGia.ChiTietDonThue.SanPham.TenSanPham,
            danhGia.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng",
            danhGia.ChiTietDonThue.MaSanPham));
    }

    public async Task<Result<DanhGiaResponse>> PhanHoiDanhGiaAsync(long maDanhGia, PhanHoiDanhGiaRequest request, long maTaiKhoan)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan);

        var noiDung = request.NoiDung?.Trim();
        if (string.IsNullOrWhiteSpace(noiDung))
            return Result<DanhGiaResponse>.Loi("NOI_DUNG_PHAN_HOI_TRONG", "Nội dung phản hồi không được để trống.");

        var danhGia = await QueryDanhGiaKemChiTiet().FirstOrDefaultAsync(d => d.MaDanhGia == maDanhGia);
        if (danhGia == null) return Result<DanhGiaResponse>.Loi("DANH_GIA_NOT_FOUND", "Đánh giá không tồn tại.");

        var duLieuTruoc = JsonSerializer.Serialize(new
        {
            phanHoiCuaHang = danhGia.PhanHoiCuaHang,
            thoiDiemPhanHoi = danhGia.ThoiDiemPhanHoi,
            maNguoiPhanHoi = danhGia.MaNguoiPhanHoi
        });

        var thoiDiemPhanHoi = DateTime.UtcNow;
        danhGia.PhanHoiCuaHang = noiDung;
        danhGia.ThoiDiemPhanHoi = thoiDiemPhanHoi;
        danhGia.MaNguoiPhanHoi = maTaiKhoan;
        danhGia.NgayCapNhat = thoiDiemPhanHoi;

        var tenNguoiPhanHoi = await _context.TaiKhoans.AsNoTracking()
            .Where(t => t.MaTaiKhoan == maTaiKhoan)
            .Select(t => t.NhanVien != null && !string.IsNullOrWhiteSpace(t.NhanVien.HoTen) ? t.NhanVien.HoTen : t.Email)
            .FirstOrDefaultAsync();

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan, HanhDong = "PHAN_HOI_DANH_GIA", LoaiDoiTuong = "DANH_GIA",
            MaDoiTuong = maDanhGia.ToString(), DuLieuTruoc = duLieuTruoc,
            DuLieuSau = JsonSerializer.Serialize(new { phanHoiCuaHang = noiDung, thoiDiemPhanHoi, maNguoiPhanHoi = maTaiKhoan }),
            LyDo = noiDung, ThoiDiem = thoiDiemPhanHoi
        });

        await _context.SaveChangesAsync();
        return Result<DanhGiaResponse>.Ok(MapToResponse(danhGia,
            danhGia.ChiTietDonThue.SanPham.TenSanPham,
            danhGia.ChiTietDonThue.DonThue.KhachHang?.HoTen ?? "Khách hàng",
            danhGia.ChiTietDonThue.MaSanPham, tenNguoiPhanHoi));
    }

    private static DanhGiaResponse MapToResponse(
        DanhGia d, string tenSanPham, string tenNguoiDung, long maSanPham, string? tenNguoiPhanHoiOverride = null)
    {
        List<string> danhSachAnh = new();
        if (!string.IsNullOrWhiteSpace(d.DanhSachAnh))
        {
            try { danhSachAnh = JsonSerializer.Deserialize<List<string>>(d.DanhSachAnh) ?? new(); }
            catch { danhSachAnh = new(); }
        }

        string? nguoiPhanHoi = null;
        if (!string.IsNullOrWhiteSpace(d.PhanHoiCuaHang))
        {
            nguoiPhanHoi = tenNguoiPhanHoiOverride
                ?? (!string.IsNullOrWhiteSpace(d.NguoiPhanHoi?.NhanVien?.HoTen) ? d.NguoiPhanHoi!.NhanVien!.HoTen : d.NguoiPhanHoi?.Email)
                ?? "Cửa hàng GearGo";
        }

        return new DanhGiaResponse
        {
            MaDanhGia = d.MaDanhGia, MaChiTietDon = d.MaChiTietDon,
            MaDonThue = d.ChiTietDonThue?.MaDonThue ?? 0,
            MaDonHienThi = d.ChiTietDonThue?.DonThue?.MaDonHienThi,
            MaSanPham = maSanPham,
            // [REV-04] Gán mã khách hàng chủ đánh giá để UI không hiển thị dấu "()" trống.
            MaKhachHang = d.ChiTietDonThue?.DonThue?.MaKhachHang,
            TenSanPham = tenSanPham, TenNguoiDung = tenNguoiDung, SoSao = d.SoSao, NoiDung = d.NoiDung,
            DanhSachAnh = danhSachAnh, NgayTao = d.NgayTao, TrangThaiHienThi = d.TrangThaiHienThi,
            LyDoAn = d.LyDoAn, PhanHoiCuaHang = d.PhanHoiCuaHang, ThoiDiemPhanHoi = d.ThoiDiemPhanHoi,
            NguoiPhanHoi = nguoiPhanHoi
        };
    }

    private static string AnDanhTen(string hoTen)
    {
        if (string.IsNullOrWhiteSpace(hoTen)) return "Khách hàng";
        var parts = hoTen.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length == 1
            ? (parts[0].Length > 1 ? parts[0][0] + "***" : parts[0])
            : $"{parts[0]} {parts[^1][0]}***";
    }
}
