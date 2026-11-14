using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Kết quả seed chính sách và đơn thuê mẫu ban đầu.</summary>
internal sealed record SeedOrderContext(
    ChinhSach ChinhSach1,
    DonThue DonThue1,
    ChiTietDonThue Ctd1,
    ChiTietBanGiao Ctbg1);

/// <summary>Seed chính sách thuê, giỏ thuê, khuyến mãi, đơn mẫu ORD-202610-001, bàn giao/nhận trả và nội dung.</summary>
internal static class DonThueNghiepVuSeeder
{
    public static async Task<SeedOrderContext> SeedAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog)
    {
        var chinhSach1 = await EnsureChinhSachAsync(context, actors.NhanVien1);
        await EnsureGioThueAsync(context, actors.Khach1, catalog.SpLeu4);
        var km1 = await EnsureKhuyenMaiAsync(context, catalog.DmLeu, catalog.SpLeu4);
        var (don1, ctd1, ctd2) = await EnsureDonThueMauAsync(context, actors, chinhSach1, catalog, km1);
        var ctbg1 = await EnsureBanGiaoVaNhanTraAsync(context, actors, catalog, don1, ctd1, ctd2);
        await EnsureDanhGiaThongBaoLichSuAsync(context, actors, catalog, don1, ctd1);
        return new SeedOrderContext(chinhSach1, don1, ctd1, ctbg1);
    }

    private static async Task<ChinhSach> EnsureChinhSachAsync(ApplicationDbContext context, NhanVien nv1)
    {
        var cs = await context.ChinhSachs.FirstOrDefaultAsync(c => c.PhienBan == 1)
                 ?? await context.ChinhSachs.FirstOrDefaultAsync();
        if (cs != null) return cs;

        cs = new ChinhSach
        {
            MaNguoiTao = nv1.MaNhanVien,
            TenChinhSach = "Chính sách thuê tiêu chuẩn 2026",
            PhienBan = 1,
            ThoiDiemApDung = DateTime.UtcNow.AddMonths(-3),
            // huyDon/khongDenNhan: khóa HuyDonService (W4-T7) đọc — xem docs/contracts/week4.md mục 4.1.
            NoiDungChinhSach = "{\"heSoTre\": 1.5, \"hanMucStaff\": 500000, \"tyLeCoc\": 100, "
                               + "\"huyDon\": {\"tyLeGiuLaiTu24Den48Gio\": 0.5, \"tyLeGiuLaiDuoi24Gio\": 1.0}, "
                               + "\"khongDenNhan\": {\"soPhutChoSauGioNhan\": 120, \"tyLeGiuLaiTienThue\": 1.0}}",
            NgayTao = DateTime.UtcNow.AddMonths(-3)
        };
        context.ChinhSachs.Add(cs);
        await context.SaveChangesAsync();
        return cs;
    }

    private static async Task EnsureGioThueAsync(ApplicationDbContext context, KhachHang khach1, SanPham spLeu4)
    {
        if (await context.GioThues.AnyAsync(g => g.MaKhachHang == khach1.MaKhachHang)) return;
        var gio = new GioThue
        {
            MaKhachHang = khach1.MaKhachHang,
            GioNhanDuKien = DateTime.UtcNow.AddDays(5),
            GioTraDuKien = DateTime.UtcNow.AddDays(7),
            NgayCapNhat = DateTime.UtcNow
        };
        context.GioThues.Add(gio);
        await context.SaveChangesAsync();
        context.ChiTietGioThues.Add(new ChiTietGioThue { MaGioThue = gio.MaGioThue, MaSanPham = spLeu4.MaSanPham, SoLuong = 1 });
        await context.SaveChangesAsync();
    }

    private static async Task<KhuyenMai> EnsureKhuyenMaiAsync(
        ApplicationDbContext context, DanhMucSanPham dmLeu, SanPham spLeu4)
    {
        var km = await context.KhuyenMais.FirstOrDefaultAsync(k => k.MaGiamGia == "GEARGOHE2026");
        if (km != null) return km;

        km = new KhuyenMai
        {
            MaGiamGia = "GEARGOHE2026", TenKhuyenMai = "Chào hè rực rỡ - Giảm 10%",
            LoaiGiam = LoaiKhuyenMai.PhanTram, GiaTriGiam = 10, MucGiamToiDa = 100000,
            TienThueToiThieu = 200000, PhamVi = PhamViApDung.TheoDanhMuc,
            BatDau = DateTime.UtcNow.AddMonths(-1), KetThuc = DateTime.UtcNow.AddMonths(2),
            GioiHanTongLuot = 500, GioiHanMoiKhach = 2, TrangThai = TrangThaiKhuyenMai.HienThi
        };
        context.KhuyenMais.Add(km);
        await context.SaveChangesAsync();

        context.KhuyenMaiDanhMucs.Add(new KhuyenMaiDanhMuc { MaKhuyenMai = km.MaKhuyenMai, MaDanhMuc = dmLeu.MaDanhMuc });
        context.KhuyenMaiSanPhams.Add(new KhuyenMaiSanPham { MaKhuyenMai = km.MaKhuyenMai, MaSanPham = spLeu4.MaSanPham });
        await context.SaveChangesAsync();
        return km;
    }

    private static async Task<(DonThue Don, ChiTietDonThue Ctd1, ChiTietDonThue Ctd2)> EnsureDonThueMauAsync(
        ApplicationDbContext context, SeedActors actors, ChinhSach cs1, SeedCatalog catalog, KhuyenMai km1)
    {
        var don = await context.DonThues.FirstOrDefaultAsync(d => d.MaDonHienThi == "ORD-202610-001");
        if (don == null)
        {
            don = new DonThue
            {
                MaKhachHang = actors.Khach1.MaKhachHang, MaChinhSach = cs1.MaChinhSach, MaDonHienThi = "ORD-202610-001",
                NgayDat = DateTime.UtcNow.AddDays(-3), GioNhanDuKien = DateTime.UtcNow.AddDays(-2), GioTraDuKien = DateTime.UtcNow.AddDays(-1),
                TenNguoiNhan = actors.Khach1.HoTen, SoDienThoaiNguoiNhan = "0901000003", EmailLienHe = actors.CustomerTk1.Email,
                TongTienThueTruocGiam = 340000, TongTienGiam = 34000, TongTienCoc = 700000,
                TrangThai = TrangThaiDonThue.DangThue, TienThueGiuLaiKhiHuy = 0
            };
            context.DonThues.Add(don);
            await context.SaveChangesAsync();
        }

        var ctd1 = await EnsureChiTietDonAsync(context, don.MaDonThue, catalog.SpLeu4, 120000, 24000, 500000, 1600000);
        var ctd2 = await EnsureChiTietDonAsync(context, don.MaDonThue, catalog.SpBepGa, 50000, 10000, 200000, 750000);

        if (!await context.GiuChos.AnyAsync(g => g.MaChiTietDon == ctd1.MaChiTietDon))
        {
            context.GiuChos.AddRange(
                new GiuCho { MaChiTietDon = ctd1.MaChiTietDon, ThoiDiemTao = DateTime.UtcNow.AddDays(-3), ThoiDiemHetHan = DateTime.UtcNow.AddDays(2), TrangThai = TrangThaiGiuCho.DaXacNhan },
                new GiuCho { MaChiTietDon = ctd2.MaChiTietDon, ThoiDiemTao = DateTime.UtcNow.AddDays(-3), ThoiDiemHetHan = DateTime.UtcNow.AddDays(2), TrangThai = TrangThaiGiuCho.DaXacNhan }
            );
            await context.SaveChangesAsync();
        }

        if (!await context.LuotSuDungKhuyenMais.AnyAsync(l => l.MaDonThue == don.MaDonThue))
        {
            context.LuotSuDungKhuyenMais.Add(new LuotSuDungKhuyenMai
            {
                MaKhuyenMai = km1.MaKhuyenMai, MaDonThue = don.MaDonThue,
                ThoiDiemGiuLuot = DateTime.UtcNow.AddDays(-3), ThoiDiemHetHan = DateTime.UtcNow.AddDays(2),
                ThoiDiemSuDung = DateTime.UtcNow.AddDays(-3), SoTienGiam = 34000, TrangThai = "DaSuDung"
            });
            await context.SaveChangesAsync();
        }

        if (!await context.LichSuTrangThaiDons.AnyAsync(l => l.MaDonThue == don.MaDonThue))
        {
            context.LichSuTrangThaiDons.AddRange(
                new LichSuTrangThaiDon { MaDonThue = don.MaDonThue, MaNguoiThucHien = actors.CustomerTk1.MaTaiKhoan, TrangThaiTruoc = "TaoMoi", TrangThaiSau = "ChoThanhToan", ThoiDiem = DateTime.UtcNow.AddDays(-3), LyDo = "Đặt đơn trực tuyến" },
                new LichSuTrangThaiDon { MaDonThue = don.MaDonThue, MaNguoiThucHien = actors.AdminTk.MaTaiKhoan, TrangThaiTruoc = "ChoThanhToan", TrangThaiSau = "DangThue", ThoiDiem = DateTime.UtcNow.AddDays(-2), LyDo = "Thanh toán thành công và đã bàn giao đồ" }
            );
            await context.SaveChangesAsync();
        }

        return (don, ctd1, ctd2);
    }

    private static async Task<ChiTietDonThue> EnsureChiTietDonAsync(
        ApplicationDbContext context, long maDon, SanPham sp, decimal gia, decimal giam, decimal coc, decimal boiThuong)
    {
        var ctd = await context.ChiTietDonThues.FirstOrDefaultAsync(c => c.MaDonThue == maDon && c.MaSanPham == sp.MaSanPham);
        if (ctd != null) return ctd;

        ctd = new ChiTietDonThue
        {
            MaDonThue = maDon, MaSanPham = sp.MaSanPham, TenSanPhamLucDat = sp.TenSanPham,
            SoLuong = 1, SoNgayTinhTien = 2, DonGiaThueMoiNgay = gia, TienGiam = giam,
            MucCocMoiThietBi = coc, GiaTriBoiThuongMoiThietBi = boiThuong
        };
        context.ChiTietDonThues.Add(ctd);
        await context.SaveChangesAsync();
        return ctd;
    }

    private static async Task<ChiTietBanGiao> EnsureBanGiaoVaNhanTraAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog,
        DonThue don1, ChiTietDonThue ctd1, ChiTietDonThue ctd2)
    {
        var pc1 = await EnsurePhanCongAsync(context, ctd1.MaChiTietDon, catalog.TbLeu1.MaThietBi, actors.NhanVien2.MaNhanVien);
        var pc2 = await EnsurePhanCongAsync(context, ctd2.MaChiTietDon, catalog.TbBep1.MaThietBi, actors.NhanVien2.MaNhanVien);

        var pbg = await context.PhieuBanGiaos.FirstOrDefaultAsync(p => p.MaDonThue == don1.MaDonThue);
        if (pbg == null)
        {
            pbg = new PhieuBanGiao
            {
                MaDonThue = don1.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien,
                ThoiDiemLap = DateTime.UtcNow.AddDays(-2), ThoiDiemGiaoThucTe = DateTime.UtcNow.AddDays(-2),
                TenNhanVienLucGiao = actors.NhanVien2.HoTen, TenNguoiNhanThucTe = actors.Khach1.HoTen,
                ThoiDiemKhachXacNhan = DateTime.UtcNow.AddDays(-2), TrangThai = "DaGiao"
            };
            context.PhieuBanGiaos.Add(pbg);
            await context.SaveChangesAsync();
        }

        var ctbg1 = await EnsureCtbgAsync(context, pbg.MaPhieuBanGiao, pc1.MaPhanCong, "Lều mới, đầy đủ cọc ghim và dây căng", "Đã kiểm tra đủ phụ kiện");
        await EnsureCtbgAsync(context, pbg.MaPhieuBanGiao, pc2.MaPhanCong, "Bếp ga hoạt động tốt, đánh lửa nhạy", "Đã thử lửa tại quầy");

        var pnt = await context.PhieuNhanTras.FirstOrDefaultAsync(p => p.MaDonThue == don1.MaDonThue);
        if (pnt == null)
        {
            pnt = new PhieuNhanTra
            {
                MaDonThue = don1.MaDonThue, MaNhanVien = actors.NhanVien2.MaNhanVien,
                MaPhieuHienThi = "PNT-ORD001-01", LanTra = 1, LaLanTraCuoi = false,
                ThoiDiemLap = DateTime.UtcNow, TenNhanVienLucNhan = actors.NhanVien2.HoTen, TrangThai = TrangThaiPhieuNhanTra.Nhap
            };
            context.PhieuNhanTras.Add(pnt);
            await context.SaveChangesAsync();
        }

        if (!await context.ChiTietNhanTras.AnyAsync(c => c.MaPhieuNhanTra == pnt.MaPhieuNhanTra))
        {
            context.ChiTietNhanTras.Add(new ChiTietNhanTra
            {
                MaPhieuNhanTra = pnt.MaPhieuNhanTra, MaChiTietBanGiao = ctbg1.MaChiTietBanGiao,
                ThoiDiemTraThucTe = DateTime.UtcNow, KetLuan = "CanVeSinh",
                TinhTrangSauThue = "Lều bị dính bùn đất cần vệ sinh chuyên sâu", TrangThaiXuLy = "ChoXuLy"
            });
            await context.SaveChangesAsync();
        }
        return ctbg1;
    }

    private static async Task<PhanCongThietBi> EnsurePhanCongAsync(ApplicationDbContext context, long maCtd, long maTb, long maNv)
    {
        var pc = await context.PhanCongThietBis.FirstOrDefaultAsync(p => p.MaChiTietDon == maCtd && p.MaThietBi == maTb);
        if (pc != null) return pc;
        pc = new PhanCongThietBi { MaChiTietDon = maCtd, MaThietBi = maTb, MaNguoiPhanCong = maNv, ThoiDiemPhanCong = DateTime.UtcNow.AddDays(-2), TrangThai = "DaBanGiao" };
        context.PhanCongThietBis.Add(pc);
        await context.SaveChangesAsync();
        return pc;
    }

    private static async Task<ChiTietBanGiao> EnsureCtbgAsync(ApplicationDbContext context, long maPbg, long maPc, string tinhTrang, string ghiChu)
    {
        var ct = await context.ChiTietBanGiaos.FirstOrDefaultAsync(c => c.MaPhieuBanGiao == maPbg && c.MaPhanCong == maPc);
        if (ct != null) return ct;
        ct = new ChiTietBanGiao { MaPhieuBanGiao = maPbg, MaPhanCong = maPc, TinhTrangTruocThue = tinhTrang, GhiChu = ghiChu };
        context.ChiTietBanGiaos.Add(ct);
        await context.SaveChangesAsync();
        return ct;
    }

    private static async Task EnsureDanhGiaThongBaoLichSuAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, DonThue don1, ChiTietDonThue ctd1)
    {
        if (!await context.DanhGias.AnyAsync(d => d.MaChiTietDon == ctd1.MaChiTietDon))
        {
            context.DanhGias.Add(new DanhGia
            {
                MaChiTietDon = ctd1.MaChiTietDon, SoSao = 5,
                NoiDung = "Lều rất tốt, chống gió chống mưa tuyệt vời, đầy đủ phụ kiện!",
                DanhSachAnh = "[\"https://storage.geargo.vn/reviews/tent_camp.jpg\"]",
                NgayTao = DateTime.UtcNow, TrangThaiHienThi = "HienThi"
            });
            await context.SaveChangesAsync();
        }

        if (!await context.ThongBaos.AnyAsync(t => t.MaDonThue == don1.MaDonThue))
        {
            context.ThongBaos.AddRange(
                new ThongBao { MaTaiKhoan = actors.CustomerTk1.MaTaiKhoan, MaDonThue = don1.MaDonThue, MaSuKien = "EVT_ORD001_CONFIRMED", LoaiSuKien = "XacNhanDon", TieuDe = "Đơn thuê ORD-202610-001 đã được xác nhận", NoiDung = "Cửa hàng đã chuẩn bị xong thiết bị. Bạn có thể đến nhận lều và bếp dã ngoại.", KenhGui = "InApp", TrangThaiGui = "DaGui", ThoiDiemTao = DateTime.UtcNow.AddDays(-2), ThoiDiemGui = DateTime.UtcNow.AddDays(-2) },
                new ThongBao { MaTaiKhoan = actors.CustomerTk1.MaTaiKhoan, MaDonThue = don1.MaDonThue, MaSuKien = "EVT_ORD001_FEE", LoaiSuKien = "ThongBaoPhuPhi", TieuDe = "Thông báo phụ phí vệ sinh đơn thuê ORD-202610-001", NoiDung = "Phát sinh khoản phụ phí vệ sinh đặc biệt 100.000 VNĐ cho lều Naturehike.", KenhGui = "InApp", TrangThaiGui = "DaGui", ThoiDiemTao = DateTime.UtcNow, ThoiDiemGui = DateTime.UtcNow }
            );
            await context.SaveChangesAsync();
        }

        if (!await context.LichSuTinhTrangThietBis.AnyAsync(l => l.MaThietBi == catalog.TbLeu1.MaThietBi))
        {
            context.LichSuTinhTrangThietBis.Add(new LichSuTinhTrangThietBi
            {
                MaThietBi = catalog.TbLeu1.MaThietBi, MaNguoiThucHien = actors.StaffTk.MaTaiKhoan,
                TrangThaiTruoc = "SanSang", TrangThaiSau = "DangThue", TinhTrangTruoc = "Mới",
                TinhTrangSau = "Bàn giao cho khách", ThoiDiem = DateTime.UtcNow.AddDays(-2),
                LyDo = "Bàn giao thiết bị cho đơn thuê ORD-202610-001"
            });
            await context.SaveChangesAsync();
        }
    }
}
