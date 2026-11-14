using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.NhaCungCap;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class NhaCungCapService
{
    public async Task<LichSuNhapResponse> LayLichSuNhapAsync(long id, int trang = 1, int soMoiTrang = 20, CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        if (!await _context.NhaCungCaps.AnyAsync(x => x.MaNhaCungCap == id, ct))
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{id}.");

        var queryPhieu = _context.PhieuNhapHangs.AsNoTracking()
            .Where(x => x.MaNhaCungCap == id && x.TrangThai == TrangThaiPhieuNhap.DaNhapKho);

        var tongSoPhieu = await queryPhieu.CountAsync(ct);
        var tongGiaTri = await queryPhieu.SumAsync(x => x.TongTien, ct);
        var tongSoLuongThietBi = await _context.ChiTietPhieuNhaps.AsNoTracking()
            .Where(ctPn => queryPhieu.Select(p => p.MaPhieuNhap).Contains(ctPn.MaPhieuNhap))
            .SumAsync(ctPn => ctPn.SoLuong, ct);

        var danhSachPhieu = await queryPhieu
            .OrderByDescending(x => x.NgayNhapThucTe ?? x.NgayLap).ThenByDescending(x => x.MaPhieuNhap)
            .Skip((trang - 1) * soMoiTrang).Take(soMoiTrang)
            .Select(p => new LichSuNhapItemResponse
            {
                MaPhieuNhap = p.MaPhieuNhap, MaPhieuHienThi = p.MaPhieuHienThi,
                SoChungTuNhaCungCap = p.SoChungTuNhaCungCap, NgayLap = p.NgayLap,
                NgayNhapThucTe = p.NgayNhapThucTe, NgayXacNhan = p.NgayXacNhan, TongTien = p.TongTien,
                TenNguoiLap = p.TenNguoiLapLucNhap ?? p.NguoiLap.HoTen,
                TenNguoiXacNhan = p.TenNguoiXacNhanLucNhap ?? (p.NguoiXacNhan != null ? p.NguoiXacNhan.HoTen : null),
                ChiTietSanPham = p.ChiTietPhieuNhaps.Select(ctPn => new SanPhamNhapItemResponse
                {
                    MaChiTietPhieuNhap = ctPn.MaChiTietPhieuNhap, MaSanPham = ctPn.MaSanPham,
                    TenSanPham = ctPn.SanPham.TenSanPham, SoLuong = ctPn.SoLuong,
                    DonGiaNhap = ctPn.DonGiaNhap, TinhTrangKhiNhap = ctPn.TinhTrangKhiNhap ?? ""
                }).ToList()
            }).ToListAsync(ct);

        return new LichSuNhapResponse
        {
            TongSoPhieuDaNhap = tongSoPhieu, TongGiaTriNhap = tongGiaTri, TongSoLuongThietBi = tongSoLuongThietBi,
            PhieuNhaps = new PagedResult<LichSuNhapItemResponse>
            {
                Items = danhSachPhieu, TotalItems = tongSoPhieu, CurrentPage = trang, PageSize = soMoiTrang
            }
        };
    }
}
