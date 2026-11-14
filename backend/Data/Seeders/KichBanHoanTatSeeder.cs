using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Seed kịch bản đơn hàng hoàn tất (DT-20241120-008) kèm đối soát hoàn cọc và đánh giá 5 sao.</summary>
internal static class KichBanHoanTatSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, ChinhSach cs1)
    {
        if (await context.DonThues.AnyAsync(d => d.MaDonHienThi == "DT-20241120-008")) return;

        var donComp = new DonThue
        {
            MaKhachHang = actors.Khach1.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaDonHienThi = "DT-20241120-008",
            NgayDat = DateTime.UtcNow.AddDays(-10), GioNhanDuKien = DateTime.UtcNow.AddDays(-8), GioTraDuKien = DateTime.UtcNow.AddDays(-5),
            TenNguoiNhan = actors.Khach1.HoTen, SoDienThoaiNguoiNhan = "0901000003", EmailLienHe = actors.CustomerTk1.Email,
            TongTienThueTruocGiam = 750000, TongTienGiam = 0, TongTienCoc = 900000,
            TrangThai = TrangThaiDonThue.HoanTat, TienThueGiuLaiKhiHuy = 0,
            ThoiDiemHoanTat = DateTime.UtcNow.AddDays(-5), GhiChu = "Đơn cắm trại Ba Vì đã đối soát hoàn tất 100% cọc"
        };
        context.DonThues.Add(donComp);
        await context.SaveChangesAsync();

        var ctd1 = new ChiTietDonThue { MaDonThue = donComp.MaDonThue, MaSanPham = catalog.SpLeu4.MaSanPham, TenSanPhamLucDat = catalog.SpLeu4.TenSanPham, SoLuong = 1, SoNgayTinhTien = 3, DonGiaThueMoiNgay = 150000, TienGiam = 0, MucCocMoiThietBi = 500000, GiaTriBoiThuongMoiThietBi = 2500000, PhuKienVaMucBoiThuongLucDat = "Cọc lều, dây chằng, bao đựng" };
        var ctd2 = new ChiTietDonThue { MaDonThue = donComp.MaDonThue, MaSanPham = catalog.SpTui.MaSanPham, TenSanPhamLucDat = catalog.SpTui.TenSanPham, SoLuong = 2, SoNgayTinhTien = 3, DonGiaThueMoiNgay = 50000, TienGiam = 0, MucCocMoiThietBi = 200000, GiaTriBoiThuongMoiThietBi = 800000, PhuKienVaMucBoiThuongLucDat = "Bao nén chống nước" };
        context.ChiTietDonThues.AddRange(ctd1, ctd2);
        await context.SaveChangesAsync();

        var ctttCoc = await SeedThanhToanAsync(context, donComp.MaDonThue, actors.NhanVien2.MaNhanVien);
        await SeedBanGiaoNhanTraAsync(context, donComp, ctd1, ctd2, actors, catalog);
        await SeedDoiSoatHoanCocVaDanhGiaAsync(context, donComp.MaDonThue, ctd1, ctd2, ctttCoc, actors);
    }

    private static async Task<ChiTietThanhToan> SeedThanhToanAsync(ApplicationDbContext context, long maDon, long maNv)
    {
        var tt = new ThanhToan
        {
            MaDonThue = maDon, MaNguoiGhiNhan = maNv, MaYeuCau = "PAY_INIT_DT008",
            CongThanhToan = "VNPay", MaGiaoDichCong = "VNP_202411_008", TongSoTien = 1650000,
            PhuongThuc = "VNPayQR", ThoiDiemTao = DateTime.UtcNow.AddDays(-10),
            ThoiDiemThanhCong = DateTime.UtcNow.AddDays(-10), TrangThai = "ThanhCong"
        };
        context.ThanhToans.Add(tt);
        await context.SaveChangesAsync();

        var ctttCoc = new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienCoc", SoTien = 900000 };
        context.ChiTietThanhToans.AddRange(new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienThue", SoTien = 750000 }, ctttCoc);
        await context.SaveChangesAsync();
        return ctttCoc;
    }

    private static async Task SeedBanGiaoNhanTraAsync(
        ApplicationDbContext context, DonThue don, ChiTietDonThue ctd1, ChiTietDonThue ctd2, SeedActors actors, SeedCatalog catalog)
    {
        var pc1 = new PhanCongThietBi { MaChiTietDon = ctd1.MaChiTietDon, MaThietBi = catalog.TbLeu2?.MaThietBi ?? 2, MaNguoiPhanCong = actors.NhanVien2.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-8), TrangThai = "DaBanGiao" };
        var pc2 = new PhanCongThietBi { MaChiTietDon = ctd2.MaChiTietDon, MaThietBi = catalog.TbTui1.MaThietBi, MaNguoiPhanCong = actors.NhanVien2.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-8), TrangThai = "DaBanGiao" };
        context.PhanCongThietBis.AddRange(pc1, pc2);
        await context.SaveChangesAsync();

        var pbg = new PhieuBanGiao
        {
            MaDonThue = don.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien,
            ThoiDiemLap = DateTime.UtcNow.AddDays(-8), ThoiDiemGiaoThucTe = DateTime.UtcNow.AddDays(-8),
            TenNhanVienLucGiao = actors.NhanVien2.HoTen, TenNguoiNhanThucTe = actors.Khach1.HoTen,
            ThoiDiemKhachXacNhan = DateTime.UtcNow.AddDays(-8), TrangThai = "DaGiao"
        };
        context.PhieuBanGiaos.Add(pbg);
        await context.SaveChangesAsync();

        var ctbg1 = new ChiTietBanGiao { MaPhieuBanGiao = pbg.MaPhieuBanGiao, MaPhanCong = pc1.MaPhanCong, TinhTrangTruocThue = "Lều tốt sạch sẽ", GhiChu = "Đủ 10 cọc và 4 dây" };
        var ctbg2 = new ChiTietBanGiao { MaPhieuBanGiao = pbg.MaPhieuBanGiao, MaPhanCong = pc2.MaPhanCong, TinhTrangTruocThue = "Túi ngủ tốt", GhiChu = "Kèm bao nén" };
        context.ChiTietBanGiaos.AddRange(ctbg1, ctbg2);
        await context.SaveChangesAsync();

        var pnt = new PhieuNhanTra
        {
            MaDonThue = don.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien, MaPhieuHienThi = "PNT-DT008-01",
            LanTra = 1, LaLanTraCuoi = true, ThoiDiemLap = DateTime.UtcNow.AddDays(-5),
            TenNhanVienLucNhan = actors.NhanVien2.HoTen, TrangThai = TrangThaiPhieuNhanTra.DaChot
        };
        context.PhieuNhanTras.Add(pnt);
        await context.SaveChangesAsync();

        context.ChiTietNhanTras.AddRange(
            new ChiTietNhanTra { MaPhieuNhanTra = pnt.MaPhieuNhanTra, MaChiTietBanGiao = ctbg1.MaChiTietBanGiao, ThoiDiemTraThucTe = DateTime.UtcNow.AddDays(-5), KetLuan = "DatChuan", TinhTrangSauThue = "Lều nguyên vẹn sạch sẽ", TrangThaiXuLy = "DaXuLy" },
            new ChiTietNhanTra { MaPhieuNhanTra = pnt.MaPhieuNhanTra, MaChiTietBanGiao = ctbg2.MaChiTietBanGiao, ThoiDiemTraThucTe = DateTime.UtcNow.AddDays(-5), KetLuan = "DatChuan", TinhTrangSauThue = "Túi ngủ sạch sẽ", TrangThaiXuLy = "DaXuLy" }
        );
        await context.SaveChangesAsync();
    }

    private static async Task SeedDoiSoatHoanCocVaDanhGiaAsync(
        ApplicationDbContext context, long maDon, ChiTietDonThue ctd1, ChiTietDonThue ctd2, ChiTietThanhToan ctttCoc, SeedActors actors)
    {
        var ds = new DoiSoatTienCoc
        {
            MaDonThue = maDon, MaNguoiLap = actors.NhanVien2.MaNhanVien, LoaiDoiSoat = "DoiSoatBanDau",
            TienCocDuocDoiSoat = 900000, TongPhuPhiDuocDuyet = 0, SoTienCanHoan = 900000, SoTienCanThuThem = 0,
            BangTinhDoiSoat = "{\"tienCoc\":900000,\"phuPhi\":0,\"hoan\":900000}", ThoiDiemLap = DateTime.UtcNow.AddDays(-5), TrangThai = "HoanTat"
        };
        context.DoiSoatTienCocs.Add(ds);
        await context.SaveChangesAsync();

        context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = ds.MaDoiSoat, MaChiTietThanhToan = ctttCoc.MaChiTietThanhToan });
        context.HoanTiens.Add(new HoanTien
        {
            MaChiTietThanhToanGoc = ctttCoc.MaChiTietThanhToan, MaDoiSoat = ds.MaDoiSoat, MaNguoiXuLy = actors.NhanVien1.MaNhanVien,
            MaYeuCau = $"HT:DS:{ds.MaDoiSoat}:{ctttCoc.MaChiTietThanhToan}:L1", LoaiHoan = LoaiHoanTien.HoanCocDoiSoat,
            SoTien = 900000, LyDo = "Hoàn 100% tiền cọc đơn hoàn tất", ThoiDiemYeuCau = DateTime.UtcNow.AddDays(-5),
            ThoiDiemThanhCong = DateTime.UtcNow.AddDays(-5), TrangThai = TrangThaiHoanTien.ThanhCong
        });

        context.DanhGias.AddRange(
            new DanhGia { MaChiTietDon = ctd1.MaChiTietDon, SoSao = 5, NoiDung = "Lều rất chắc chắn, chống mưa tốt trong chuyến đi Ba Vì. Đầy đủ cọc và dây chằng phụ kiện!", DanhSachAnh = "[\"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600\"]", NgayTao = DateTime.UtcNow.AddDays(-5), TrangThaiHienThi = "HienThi" },
            new DanhGia { MaChiTietDon = ctd2.MaChiTietDon, SoSao = 5, NoiDung = "Túi ngủ lông ngỗng rất ấm, giữ nhiệt ban đêm ở núi tuyệt vời, sạch sẽ và nén gọn gàng.", DanhSachAnh = "[\"https://images.unsplash.com/photo-1517824806704-9040b037703b?w=600\"]", NgayTao = DateTime.UtcNow.AddDays(-5), TrangThaiHienThi = "HienThi" }
        );
        await context.SaveChangesAsync();
    }
}
