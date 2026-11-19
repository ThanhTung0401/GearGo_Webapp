using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung đơn thuê đa trạng thái, chi tiết đơn, giữ chỗ, lịch sử trạng thái và thanh toán.</summary>
internal static class DonThueSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var khachs = await context.KhachHangs.OrderBy(k => k.MaKhachHang).ToListAsync();
        var sps = await context.SanPhams.OrderBy(s => s.MaSanPham).ToListAsync();
        var cs = await context.ChinhSachs.OrderByDescending(c => c.PhienBan).FirstOrDefaultAsync();
        var nv = await context.NhanViens.OrderBy(n => n.MaNhanVien).FirstOrDefaultAsync();
        if (khachs.Count == 0 || sps.Count == 0 || cs == null || nv == null) return;

        var orders = new[]
        {
            ("ORD-202611-101", TrangThaiDonThue.ChoThanhToan, 2, 4, 360000m, 0m, 1000000m, false),
            ("ORD-202611-102", TrangThaiDonThue.DaXacNhan, 1, 3, 280000m, 28000m, 800000m, true),
            ("ORD-202611-103", TrangThaiDonThue.DangChuanBi, 0, 2, 450000m, 0m, 1200000m, true),
            ("ORD-202611-104", TrangThaiDonThue.DangThue, -1, 2, 320000m, 50000m, 700000m, true),
            ("ORD-202611-105", TrangThaiDonThue.HoanTat, -7, -5, 560000m, 0m, 1000000m, true),
            ("ORD-202611-106", TrangThaiDonThue.KhachHuy, -4, -2, 240000m, 0m, 500000m, false),
        };

        for (var i = 0; i < orders.Length; i++)
        {
            var (maDon, tt, nhanOff, traOff, tongThue, giam, coc, daThanhToan) = orders[i];
            if (await context.DonThues.AnyAsync(d => d.MaDonHienThi == maDon)) continue;

            var kh = khachs[i % khachs.Count];
            var sp = sps[i % sps.Count];
            var don = new DonThue
            {
                MaKhachHang = kh.MaKhachHang,
                MaChinhSach = cs.MaChinhSach,
                MaDonHienThi = maDon,
                NgayDat = DateTime.UtcNow.AddDays(nhanOff - 1),
                GioNhanDuKien = DateTime.UtcNow.AddDays(nhanOff),
                GioTraDuKien = DateTime.UtcNow.AddDays(traOff),
                TenNguoiNhan = kh.HoTen,
                SoDienThoaiNguoiNhan = $"090200001{i}",
                EmailLienHe = $"khach{i + 1}@geargo.vn",
                TongTienThueTruocGiam = tongThue,
                TongTienGiam = giam,
                TongTienCoc = coc,
                TrangThai = tt,
                TienThueGiuLaiKhiHuy = tt == TrangThaiDonThue.KhachHuy ? 50000m : 0m
            };
            context.DonThues.Add(don);
            await context.SaveChangesAsync();

            var ctd = new ChiTietDonThue
            {
                MaDonThue = don.MaDonThue,
                MaSanPham = sp.MaSanPham,
                TenSanPhamLucDat = sp.TenSanPham,
                SoLuong = 1,
                SoNgayTinhTien = 2,
                DonGiaThueMoiNgay = sp.GiaThueMoiNgay,
                TienGiam = giam,
                MucCocMoiThietBi = sp.MucCocMoiThietBi,
                GiaTriBoiThuongMoiThietBi = sp.GiaTriBoiThuong
            };
            context.ChiTietDonThues.Add(ctd);
            await context.SaveChangesAsync();

            context.GiuChos.Add(new GiuCho
            {
                MaChiTietDon = ctd.MaChiTietDon,
                ThoiDiemTao = don.NgayDat,
                ThoiDiemHetHan = don.GioTraDuKien.AddDays(1),
                TrangThai = tt == TrangThaiDonThue.KhachHuy ? TrangThaiGiuCho.DaGiaiPhong : TrangThaiGiuCho.DaXacNhan
            });

            context.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = don.MaDonThue,
                MaNguoiThucHien = kh.MaTaiKhoan,
                TrangThaiTruoc = "TaoMoi",
                TrangThaiSau = tt.ToString(),
                ThoiDiem = don.NgayDat,
                LyDo = $"Khởi tạo đơn mẫu {maDon}"
            });

            if (daThanhToan)
            {
                var pay = new ThanhToan
                {
                    MaDonThue = don.MaDonThue,
                    MaNguoiGhiNhan = nv.MaNhanVien,
                    MaYeuCau = $"PAY_{maDon}",
                    CongThanhToan = "VNPay",
                    MaGiaoDichCong = $"VNP_{maDon}",
                    TongSoTien = (tongThue - giam) + coc,
                    PhuongThuc = "VNPayQR",
                    ThoiDiemTao = don.NgayDat,
                    ThoiDiemThanhCong = don.NgayDat.AddMinutes(5),
                    TrangThai = "ThanhCong"
                };
                context.ThanhToans.Add(pay);
                await context.SaveChangesAsync();

                context.ChiTietThanhToans.AddRange(
                    new ChiTietThanhToan { MaThanhToan = pay.MaThanhToan, MucDich = "TienThue", SoTien = tongThue - giam },
                    new ChiTietThanhToan { MaThanhToan = pay.MaThanhToan, MucDich = "TienCoc", SoTien = coc }
                );
            }
            await context.SaveChangesAsync();
        }
    }
}
