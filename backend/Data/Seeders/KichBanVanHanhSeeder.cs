using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Seed các kịch bản vận hành: đã xác nhận, trả một phần, quá hạn và khách hủy.</summary>
internal static class KichBanVanHanhSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, ChinhSach cs1)
    {
        await SeedDonDaXacNhanAsync(context, actors, catalog, cs1);
        await SeedDonTraMotPhanAsync(context, actors, catalog, cs1);
        await SeedDonQuaHanAsync(context, actors, catalog, cs1);
        await SeedDonKhachHuyAsync(context, actors, cs1);
    }

    private static async Task SeedDonDaXacNhanAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, ChinhSach cs1)
    {
        if (await context.DonThues.AnyAsync(d => d.MaDonHienThi == "DT-20241210-042")) return;

        var don = new DonThue
        {
            MaKhachHang = actors.Khach1.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaDonHienThi = "DT-20241210-042",
            NgayDat = DateTime.UtcNow.AddDays(-1), GioNhanDuKien = DateTime.UtcNow.AddDays(2), GioTraDuKien = DateTime.UtcNow.AddDays(5),
            TenNguoiNhan = actors.Khach1.HoTen, SoDienThoaiNguoiNhan = "0901000003", EmailLienHe = actors.CustomerTk1.Email,
            TongTienThueTruocGiam = 900000, TongTienGiam = 90000, TongTienCoc = 1000000, KhuyenMaiLucDat = "CAMPGO10",
            TrangThai = TrangThaiDonThue.DaXacNhan, TienThueGiuLaiKhiHuy = 0, GhiChu = "Đã thanh toán cọc và tiền thuê, chờ chuẩn bị thiết bị"
        };
        context.DonThues.Add(don);
        await context.SaveChangesAsync();

        var ctd = new ChiTietDonThue { MaDonThue = don.MaDonThue, MaSanPham = catalog.SpLeu4.MaSanPham, TenSanPhamLucDat = catalog.SpLeu4.TenSanPham, SoLuong = 2, SoNgayTinhTien = 3, DonGiaThueMoiNgay = 150000, TienGiam = 90000, MucCocMoiThietBi = 500000, GiaTriBoiThuongMoiThietBi = 2500000 };
        context.ChiTietDonThues.Add(ctd);
        await context.SaveChangesAsync();

        context.GiuChos.Add(new GiuCho { MaChiTietDon = ctd.MaChiTietDon, ThoiDiemTao = DateTime.UtcNow.AddDays(-1), ThoiDiemHetHan = DateTime.UtcNow.AddDays(5), TrangThai = TrangThaiGiuCho.DaXacNhan });
        var tt = new ThanhToan
        {
            MaDonThue = don.MaDonThue, MaNguoiGhiNhan = actors.NhanVien2.MaNhanVien, MaYeuCau = "PAY_INIT_DT042",
            CongThanhToan = "VNPay", MaGiaoDichCong = "VNP_202412_042", TongSoTien = 1810000, PhuongThuc = "VNPayQR",
            ThoiDiemTao = DateTime.UtcNow.AddDays(-1), ThoiDiemThanhCong = DateTime.UtcNow.AddDays(-1), TrangThai = "ThanhCong"
        };
        context.ThanhToans.Add(tt);
        await context.SaveChangesAsync();

        context.ChiTietThanhToans.AddRange(
            new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienThue", SoTien = 810000 },
            new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienCoc", SoTien = 1000000 }
        );
        await context.SaveChangesAsync();
    }

    private static async Task SeedDonTraMotPhanAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, ChinhSach cs1)
    {
        var existing = await context.DonThues.FirstOrDefaultAsync(d => d.MaDonHienThi == "DT-20241208-015");
        if (existing != null)
        {
            // Vá dữ liệu cũ: đảm bảo đơn trả 1 phần có đủ ChiTietBanGiao cho cả thiết bị chưa trả (pc1)
            var pbgOld = await context.PhieuBanGiaos.FirstOrDefaultAsync(p => p.MaDonThue == existing.MaDonThue);
            if (pbgOld != null)
            {
                if (pbgOld.TrangThai == "DaBanGiao") pbgOld.TrangThai = "DaGiao";
                var pcs = await context.PhanCongThietBis
                    .Where(pc => pc.ChiTietDon.MaDonThue == existing.MaDonThue)
                    .ToListAsync();
                foreach (var pc in pcs)
                {
                    var hasCtbg = await context.ChiTietBanGiaos.AnyAsync(c => c.MaPhieuBanGiao == pbgOld.MaPhieuBanGiao && c.MaPhanCong == pc.MaPhanCong);
                    if (!hasCtbg)
                    {
                        context.ChiTietBanGiaos.Add(new ChiTietBanGiao
                        {
                            MaPhieuBanGiao = pbgOld.MaPhieuBanGiao,
                            MaPhanCong = pc.MaPhanCong,
                            TinhTrangTruocThue = "Ngoại quan tốt, đầy đủ phụ kiện",
                            GhiChu = "Bàn giao đợt 1"
                        });
                    }
                }
                await context.SaveChangesAsync();
            }
            return;
        }

        var don = new DonThue
        {
            MaKhachHang = actors.Khach2.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaDonHienThi = "DT-20241208-015",
            NgayDat = DateTime.UtcNow.AddDays(-4), GioNhanDuKien = DateTime.UtcNow.AddDays(-3), GioTraDuKien = DateTime.UtcNow.AddDays(2),
            TenNguoiNhan = actors.Khach2.HoTen, SoDienThoaiNguoiNhan = "0918765432", EmailLienHe = actors.CustomerTk2.Email,
            TongTienThueTruocGiam = 760000, TongTienGiam = 0, TongTienCoc = 600000,
            TrangThai = TrangThaiDonThue.DangThue, GhiChu = "Đang thuê có trả 1 phần đèn trước đợt 1"
        };
        context.DonThues.Add(don);
        await context.SaveChangesAsync();

        var ctd1 = new ChiTietDonThue { MaDonThue = don.MaDonThue, MaSanPham = catalog.SpLeu4.MaSanPham, TenSanPhamLucDat = catalog.SpLeu4.TenSanPham, SoLuong = 1, SoNgayTinhTien = 4, DonGiaThueMoiNgay = 150000, MucCocMoiThietBi = 500000, GiaTriBoiThuongMoiThietBi = 2500000 };
        var ctd2 = new ChiTietDonThue { MaDonThue = don.MaDonThue, MaSanPham = catalog.SpDen.MaSanPham, TenSanPhamLucDat = catalog.SpDen.TenSanPham, SoLuong = 1, SoNgayTinhTien = 4, DonGiaThueMoiNgay = 40000, MucCocMoiThietBi = 100000, GiaTriBoiThuongMoiThietBi = 400000 };
        context.ChiTietDonThues.AddRange(ctd1, ctd2);
        await context.SaveChangesAsync();

        var pc1 = new PhanCongThietBi { MaChiTietDon = ctd1.MaChiTietDon, MaThietBi = 1, MaNguoiPhanCong = actors.NhanVien2.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-3), TrangThai = "DaBanGiao" };
        var pc2 = new PhanCongThietBi { MaChiTietDon = ctd2.MaChiTietDon, MaThietBi = catalog.TbDen1.MaThietBi, MaNguoiPhanCong = actors.NhanVien2.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-3), TrangThai = "DaBanGiao" };
        context.PhanCongThietBis.AddRange(pc1, pc2);
        await context.SaveChangesAsync();

        var pbg = new PhieuBanGiao { MaDonThue = don.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien, ThoiDiemLap = DateTime.UtcNow.AddDays(-3), ThoiDiemGiaoThucTe = DateTime.UtcNow.AddDays(-3), TenNhanVienLucGiao = actors.NhanVien2.HoTen, TenNguoiNhanThucTe = actors.Khach2.HoTen, ThoiDiemKhachXacNhan = DateTime.UtcNow.AddDays(-3), TrangThai = "DaGiao" };
        context.PhieuBanGiaos.Add(pbg);
        await context.SaveChangesAsync();

        var ctbg1 = new ChiTietBanGiao { MaPhieuBanGiao = pbg.MaPhieuBanGiao, MaPhanCong = pc1.MaPhanCong, TinhTrangTruocThue = "Lều nguyên vẹn, đủ khung cọc", GhiChu = "Túi đựng chính hãng" };
        var ctbg2 = new ChiTietBanGiao { MaPhieuBanGiao = pbg.MaPhieuBanGiao, MaPhanCong = pc2.MaPhanCong, TinhTrangTruocThue = "Đèn pin đầy", GhiChu = "Cáp Type-C" };
        context.ChiTietBanGiaos.AddRange(ctbg1, ctbg2);
        await context.SaveChangesAsync();

        var pnt = new PhieuNhanTra { MaDonThue = don.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien, MaPhieuHienThi = "PNT-DT015-01", LanTra = 1, LaLanTraCuoi = false, ThoiDiemLap = DateTime.UtcNow.AddDays(-1), TenNhanVienLucNhan = actors.NhanVien2.HoTen, TrangThai = TrangThaiPhieuNhanTra.DaChot };
        context.PhieuNhanTras.Add(pnt);
        await context.SaveChangesAsync();

        context.ChiTietNhanTras.Add(new ChiTietNhanTra { MaPhieuNhanTra = pnt.MaPhieuNhanTra, MaChiTietBanGiao = ctbg2.MaChiTietBanGiao, ThoiDiemTraThucTe = DateTime.UtcNow.AddDays(-1), KetLuan = "DatChuan", TinhTrangSauThue = "Khách trả trước đèn LED, hoạt động tốt", TrangThaiXuLy = "DaXuLy" });
        await context.SaveChangesAsync();
    }

    private static async Task SeedDonQuaHanAsync(ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, ChinhSach cs1)
    {
        var don = await context.DonThues.FirstOrDefaultAsync(d => d.MaDonHienThi == "DT-20241201-099");
        if (don == null)
        {
            don = new DonThue
            {
                MaKhachHang = actors.Khach2.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaDonHienThi = "DT-20241201-099",
                NgayDat = DateTime.UtcNow.AddDays(-7), GioNhanDuKien = DateTime.UtcNow.AddDays(-5), GioTraDuKien = DateTime.UtcNow.AddDays(-2),
                TenNguoiNhan = actors.Khach2.HoTen, SoDienThoaiNguoiNhan = "0918765432", EmailLienHe = actors.CustomerTk2.Email,
                TongTienThueTruocGiam = 240000, TongTienGiam = 0, TongTienCoc = 500000,
                TrangThai = TrangThaiDonThue.DangThue, GhiChu = "Quá hạn trả 48 giờ chưa liên hệ"
            };
            context.DonThues.Add(don);
            await context.SaveChangesAsync();

            context.ThongBaos.Add(new ThongBao
            {
                MaTaiKhoan = actors.CustomerTk2.MaTaiKhoan, MaDonThue = don.MaDonThue, MaSuKien = "EVT_DT099_OVERDUE",
                LoaiSuKien = "CanhBaoQuaHan", TieuDe = "Cảnh báo: Đơn thuê DT-20241201-099 đã quá hạn",
                NoiDung = "Đơn thuê của bạn đã quá hạn trả 48 giờ. Vui lòng mang thiết bị hoàn trả ngay để tránh phụ phí trễ 150%.",
                KenhGui = "InApp", TrangThaiGui = "DaGui", ThoiDiemTao = DateTime.UtcNow.AddDays(-2), ThoiDiemGui = DateTime.UtcNow.AddDays(-2)
            });
            await context.SaveChangesAsync();
        }

        // Đảm bảo đơn quá hạn luôn có đủ ChiTietDonThue + PhanCongThietBi + PhieuBanGiao (DaGiao) để tính đúng nợ & phạt trễ
        var ctd = await context.ChiTietDonThues.FirstOrDefaultAsync(c => c.MaDonThue == don.MaDonThue);
        if (ctd == null)
        {
            ctd = new ChiTietDonThue
            {
                MaDonThue = don.MaDonThue,
                MaSanPham = catalog.SpLeu4.MaSanPham,
                TenSanPhamLucDat = catalog.SpLeu4.TenSanPham,
                SoLuong = 1,
                SoNgayTinhTien = 3,
                DonGiaThueMoiNgay = 80000,
                MucCocMoiThietBi = 500000,
                GiaTriBoiThuongMoiThietBi = 2500000
            };
            context.ChiTietDonThues.Add(ctd);
            await context.SaveChangesAsync();
        }

        var pc = await context.PhanCongThietBis.FirstOrDefaultAsync(p => p.MaChiTietDon == ctd.MaChiTietDon);
        if (pc == null)
        {
            var tb = await context.ThietBis
                .Where(t => t.MaSanPhamHienTai == ctd.MaSanPham)
                .OrderByDescending(t => t.MaThietBi)
                .FirstOrDefaultAsync()
                ?? await context.ThietBis.OrderBy(t => t.MaThietBi).FirstAsync();

            pc = new PhanCongThietBi
            {
                MaChiTietDon = ctd.MaChiTietDon,
                MaThietBi = tb.MaThietBi,
                MaNguoiPhanCong = actors.NhanVien2.MaNhanVien,
                ThoiDiemPhanCong = don.GioNhanDuKien,
                TrangThai = "DaBanGiao"
            };
            context.PhanCongThietBis.Add(pc);
            await context.SaveChangesAsync();
        }

        var pbg = await context.PhieuBanGiaos.FirstOrDefaultAsync(p => p.MaDonThue == don.MaDonThue);
        if (pbg == null)
        {
            pbg = new PhieuBanGiao
            {
                MaDonThue = don.MaDonThue,
                MaNhanVien = actors.NhanVien2.MaNhanVien,
                ThoiDiemLap = don.GioNhanDuKien,
                ThoiDiemGiaoThucTe = don.GioNhanDuKien,
                TenNhanVienLucGiao = actors.NhanVien2.HoTen,
                TenNguoiNhanThucTe = don.TenNguoiNhan ?? actors.Khach2.HoTen,
                ThoiDiemKhachXacNhan = don.GioNhanDuKien,
                TrangThai = "DaGiao"
            };
            context.PhieuBanGiaos.Add(pbg);
            await context.SaveChangesAsync();
        }
        else if (pbg.TrangThai != "DaGiao")
        {
            pbg.TrangThai = "DaGiao";
            await context.SaveChangesAsync();
        }

        if (!await context.ChiTietBanGiaos.AnyAsync(c => c.MaPhieuBanGiao == pbg.MaPhieuBanGiao && c.MaPhanCong == pc.MaPhanCong))
        {
            context.ChiTietBanGiaos.Add(new ChiTietBanGiao
            {
                MaPhieuBanGiao = pbg.MaPhieuBanGiao,
                MaPhanCong = pc.MaPhanCong,
                TinhTrangTruocThue = "Ngoại quan tốt, đầy đủ phụ kiện",
                GhiChu = "Bàn giao đầy đủ trước khi quá hạn"
            });
            await context.SaveChangesAsync();
        }
    }

    private static async Task SeedDonKhachHuyAsync(ApplicationDbContext context, SeedActors actors, ChinhSach cs1)
    {
        if (await context.DonThues.AnyAsync(d => d.MaDonHienThi == "DT-20241205-003")) return;

        context.DonThues.Add(new DonThue
        {
            MaKhachHang = actors.Khach1.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaNguoiHuy = actors.CustomerTk1.MaTaiKhoan,
            MaDonHienThi = "DT-20241205-003", NgayDat = DateTime.UtcNow.AddDays(-6), GioNhanDuKien = DateTime.UtcNow.AddDays(-2),
            GioTraDuKien = DateTime.UtcNow.AddDays(1), TenNguoiNhan = actors.Khach1.HoTen, SoDienThoaiNguoiNhan = "0901000003",
            EmailLienHe = actors.CustomerTk1.Email, TongTienThueTruocGiam = 350000, TongTienGiam = 0, TongTienCoc = 300000,
            TrangThai = TrangThaiDonThue.KhachHuy, ThoiDiemHuy = DateTime.UtcNow.AddDays(-5),
            LyDoHuy = "Khách bận việc gia đình đột xuất", TienThueGiuLaiKhiHuy = 0,
            GhiChu = "Khách hủy trước 48h được hoàn 100% tiền cọc"
        });
        await context.SaveChangesAsync();
    }
}
