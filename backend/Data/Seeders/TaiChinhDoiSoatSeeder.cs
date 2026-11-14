using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Seed thanh toán, phụ phí, đối soát, hoàn tiền, bảo trì, điều chỉnh kho và nhật ký hệ thống.</summary>
internal static class TaiChinhDoiSoatSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context, SeedActors actors, SeedCatalog catalog, SeedOrderContext orderCtx)
    {
        var don1 = orderCtx.DonThue1;
        var thanhToan1 = await EnsureThanhToanAsync(context, don1.MaDonThue, actors.NhanVien2.MaNhanVien);
        var ctttCoc = await context.ChiTietThanhToans.FirstOrDefaultAsync(c => c.MaThanhToan == thanhToan1.MaThanhToan && c.MucDich == "TienCoc")
                      ?? await context.ChiTietThanhToans.FirstOrDefaultAsync(c => c.MaThanhToan == thanhToan1.MaThanhToan);

        var phuPhi1 = await EnsurePhuPhiAsync(context, don1.MaDonThue, orderCtx.Ctbg1.MaChiTietBanGiao, actors);
        await EnsureDoiSoatVaHoanTienAsync(context, don1.MaDonThue, actors, ctttCoc);
        await EnsureBaoTriVaDieuChinhKhoAsync(context, don1.MaDonThue, catalog.TbHong.MaThietBi, actors);
        await EnsureAuditLogsAsync(context, actors, phuPhi1);
    }

    private static async Task<ThanhToan> EnsureThanhToanAsync(ApplicationDbContext context, long maDon, long maNv)
    {
        var tt = await context.ThanhToans.FirstOrDefaultAsync(t => t.MaDonThue == maDon);
        if (tt != null) return tt;

        tt = new ThanhToan
        {
            MaDonThue = maDon, MaNguoiGhiNhan = maNv, MaYeuCau = "PAY_INIT_ORD001",
            CongThanhToan = "VNPay", MaGiaoDichCong = "VNP_202610_001", TongSoTien = 1006000,
            PhuongThuc = "VNPayQR", ThoiDiemTao = DateTime.UtcNow.AddDays(-3),
            ThoiDiemThanhCong = DateTime.UtcNow.AddDays(-3), TrangThai = "ThanhCong"
        };
        context.ThanhToans.Add(tt);
        await context.SaveChangesAsync();

        context.ChiTietThanhToans.AddRange(
            new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienThue", SoTien = 306000 },
            new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = "TienCoc", SoTien = 700000 }
        );
        await context.SaveChangesAsync();
        return tt;
    }

    private static async Task<PhuPhi> EnsurePhuPhiAsync(
        ApplicationDbContext context, long maDon, long maCtbg, SeedActors actors)
    {
        var pp = await context.PhuPhis.FirstOrDefaultAsync(p => p.MaDonThue == maDon);
        if (pp != null) return pp;

        pp = new PhuPhi
        {
            MaDonThue = maDon, MaChiTietBanGiao = maCtbg, MaNguoiLap = actors.NhanVien2.MaNhanVien,
            MaNguoiDuyet = actors.NhanVien1.MaNhanVien, LoaiPhi = "VeSinhDacBiet", SoTien = 100000,
            LyDo = "Phí vệ sinh lều bám bùn đất",
            CanCuTinhPhi = "{\"loaiPhi\":\"VeSinhDacBiet\",\"congThuc\":\"DinhMucVeSinhChuan\"}",
            ThoiDiemLap = DateTime.UtcNow, ThoiDiemDuyet = DateTime.UtcNow,
            TrangThaiDuyet = "DaDuyet", TrangThaiTranhChap = null
        };
        context.PhuPhis.Add(pp);
        await context.SaveChangesAsync();
        return pp;
    }

    private static async Task EnsureDoiSoatVaHoanTienAsync(
        ApplicationDbContext context, long maDon, SeedActors actors, ChiTietThanhToan? ctttCoc)
    {
        if (await context.DoiSoatTienCocs.AnyAsync(d => d.MaDonThue == maDon)) return;

        var ds = new DoiSoatTienCoc
        {
            MaDonThue = maDon, MaNguoiLap = actors.NhanVien2.MaNhanVien, LoaiDoiSoat = "DoiSoatBanDau",
            TienCocDuocDoiSoat = 700000, TongPhuPhiDuocDuyet = 100000, SoTienCanHoan = 600000,
            SoTienCanThuThem = 0, BangTinhDoiSoat = "{\"tienCoc\":700000,\"phuPhi\":100000,\"hoan\":600000}",
            ThoiDiemLap = DateTime.UtcNow, TrangThai = "ChoXuLyTien"
        };
        context.DoiSoatTienCocs.Add(ds);
        await context.SaveChangesAsync();

        if (ctttCoc == null) return;
        context.GiaoDichDoiSoats.Add(new GiaoDichDoiSoat { MaDoiSoat = ds.MaDoiSoat, MaChiTietThanhToan = ctttCoc.MaChiTietThanhToan });
        context.HoanTiens.Add(new HoanTien
        {
            MaChiTietThanhToanGoc = ctttCoc.MaChiTietThanhToan, MaDoiSoat = ds.MaDoiSoat, MaNguoiXuLy = actors.NhanVien1.MaNhanVien,
            MaYeuCau = $"HT:DS:{ds.MaDoiSoat}:{ctttCoc.MaChiTietThanhToan}:L1",
            LoaiHoan = LoaiHoanTien.HoanCocDoiSoat, SoTien = 600000,
            LyDo = "Hoàn cọc sau đối soát trừ phí vệ sinh", ThoiDiemYeuCau = DateTime.UtcNow, TrangThai = "ChoXuLy"
        });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureBaoTriVaDieuChinhKhoAsync(
        ApplicationDbContext context, long maDon, long maTbHong, SeedActors actors)
    {
        if (!await context.PhieuBaoTris.AnyAsync(p => p.MaThietBi == maTbHong))
        {
            context.PhieuBaoTris.Add(new PhieuBaoTri
            {
                MaThietBi = maTbHong, MaDonThue = maDon, MaNguoiLap = actors.NhanVien2.MaNhanVien,
                LoaiXuLy = "SuaChua", MoTaLoi = "Chân đế bếp ga bị gãy khớp gập",
                MucDo = "TrungBinh", NgayBatDau = DateTime.UtcNow, TrangThai = "DangXuLy"
            });
            await context.SaveChangesAsync();
        }

        if (await context.PhieuDieuChinhKhos.AnyAsync(p => p.LyDo == "Kiểm kê kho tháng 10/2026")) return;
        var pdc = new PhieuDieuChinhKho
        {
            MaNguoiLap = actors.NhanVien1.MaNhanVien, MaNguoiDuyet = actors.NhanVien1.MaNhanVien,
            LoaiDieuChinh = "KiemKeDinhKy", LyDo = "Kiểm kê kho tháng 10/2026",
            ThoiDiemLap = DateTime.UtcNow, ThoiDiemDuyet = DateTime.UtcNow, TrangThai = "DaDuyet"
        };
        context.PhieuDieuChinhKhos.Add(pdc);
        await context.SaveChangesAsync();

        context.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
        {
            MaPhieuDieuChinh = pdc.MaPhieuDieuChinh, MaThietBi = maTbHong,
            GiaTriTruoc = "{\"trangThai\":\"SanSang\"}", GiaTriSau = "{\"trangThai\":\"DangBaoTri\"}",
            GhiChu = "Chuyển sang bảo trì sau kiểm kê"
        });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureAuditLogsAsync(ApplicationDbContext context, SeedActors actors, PhuPhi? pp)
    {
        if (await context.NhatKyThaoTacs.AnyAsync(n => n.LoaiDoiTuong == "HeThong")) return;
        context.NhatKyThaoTacs.AddRange(
            new NhatKyThaoTac { MaTaiKhoan = actors.AdminTk.MaTaiKhoan, HanhDong = "KhoiTaoHeThong", LoaiDoiTuong = "HeThong", MaDoiTuong = "SYS_INIT", ThoiDiem = DateTime.UtcNow.AddMonths(-3), LyDo = "Khởi tạo hệ thống quản trị GearGo" },
            new NhatKyThaoTac { MaTaiKhoan = actors.StaffTk.MaTaiKhoan, HanhDong = "LapPhuPhi", LoaiDoiTuong = "PhuPhi", MaDoiTuong = pp?.MaPhuPhi.ToString() ?? "1", ThoiDiem = DateTime.UtcNow, LyDo = "Lập phụ phí vệ sinh đặc biệt" }
        );
        await context.SaveChangesAsync();
    }
}
