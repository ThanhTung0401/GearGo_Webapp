using GearGo.Data;
using GearGo.Models.Entities;
using GearGo.Models.Enums;

namespace GearGo.Tests.Infrastructure;

/// <summary>Dữ liệu nền: tài khoản khách A/B, nhân viên, quản trị viên, chính sách và một sản phẩm.</summary>
public sealed class DuLieuMau
{
    public long TkKhachA, KhachA, TkKhachB, KhachB, TkNhanVien, NhanVien, TkQuanTri, ChinhSach, ChinhSachRong, SanPham;
}

public static class Seed
{
    /// <summary>Chính sách dùng trong dữ liệu kiểm tra (ví dụ 13.3): giữ 50% khi 24–48 giờ, 100% dưới 24 giờ.</summary>
    public const string ChinhSachMau =
        """{"huyDon":{"tyLeGiuLaiTu24Den48Gio":0.5,"tyLeGiuLaiDuoi24Gio":1.0},"khongDenNhan":{"soPhutChoSauGioNhan":120,"tyLeGiuLaiTienThue":1.0}}""";

    private static int _dem;
    private static string Ma(string tienTo) => $"{tienTo}{Interlocked.Increment(ref _dem):D6}";

    public static DuLieuMau CoBan(ApplicationDbContext ctx)
    {
        var tkA = new TaiKhoan { Email = Ma("a") + "@t.vn", SoDienThoai = Ma("09"), VaiTro = "KhachHang", TrangThai = "HoatDong" };
        var tkB = new TaiKhoan { Email = Ma("b") + "@t.vn", SoDienThoai = Ma("08"), VaiTro = "KhachHang", TrangThai = "HoatDong" };
        var tkNv = new TaiKhoan { Email = Ma("nv") + "@t.vn", SoDienThoai = Ma("07"), VaiTro = "NhanVien", TrangThai = "HoatDong" };
        var tkQt = new TaiKhoan { Email = Ma("qt") + "@t.vn", SoDienThoai = Ma("06"), VaiTro = "QuanTriVien", TrangThai = "HoatDong" };
        ctx.TaiKhoans.AddRange(tkA, tkB, tkNv, tkQt);
        ctx.SaveChanges();

        var khA = new KhachHang { MaTaiKhoan = tkA.MaTaiKhoan, HoTen = "Khách A" };
        var khB = new KhachHang { MaTaiKhoan = tkB.MaTaiKhoan, HoTen = "Khách B" };
        var nv = new NhanVien { MaTaiKhoan = tkNv.MaTaiKhoan, HoTen = "Nhân viên" };
        ctx.AddRange(khA, khB, nv);
        ctx.SaveChanges();

        var cs = new ChinhSach { MaNguoiTao = nv.MaNhanVien, PhienBan = Interlocked.Increment(ref _dem), ThoiDiemApDung = new DateTime(2026, 1, 1), NoiDungChinhSach = ChinhSachMau, NgayTao = new DateTime(2026, 1, 1) };
        var csRong = new ChinhSach { MaNguoiTao = nv.MaNhanVien, PhienBan = Interlocked.Increment(ref _dem), ThoiDiemApDung = new DateTime(2026, 1, 1), NoiDungChinhSach = "{}", NgayTao = new DateTime(2026, 1, 1) };
        var dm = new DanhMucSanPham { TenDanhMuc = "Lều", TrangThai = "HienThi" };
        ctx.AddRange(cs, csRong, dm);
        ctx.SaveChanges();

        var sp = new SanPham { MaDanhMuc = dm.MaDanhMuc, MaSanPhamHienThi = Ma("SP"), TenSanPham = "Lều 4 người", GiaThueMoiNgay = 100_000, MucCocMoiThietBi = 500_000, GiaTriBoiThuong = 2_000_000, TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh };
        ctx.SanPhams.Add(sp);
        ctx.SaveChanges();

        return new DuLieuMau
        {
            TkKhachA = tkA.MaTaiKhoan, KhachA = khA.MaKhachHang, TkKhachB = tkB.MaTaiKhoan, KhachB = khB.MaKhachHang,
            TkNhanVien = tkNv.MaTaiKhoan, NhanVien = nv.MaNhanVien, TkQuanTri = tkQt.MaTaiKhoan,
            ChinhSach = cs.MaChinhSach, ChinhSachRong = csRong.MaChinhSach, SanPham = sp.MaSanPham
        };
    }

    public sealed record DonMau(long MaDon, long MaChiTietDon, long? NguonThue, long? NguonCoc);

    /// <summary>
    /// Đơn 1 dòng. Khi <paramref name="tienThue"/>/<paramref name="tienCoc"/> &gt; 0 và <paramref name="daThanhToan"/>,
    /// tạo một THANH_TOAN thành công với hai chi tiết thu TienThue/TienCoc (nguồn hoàn).
    /// </summary>
    public static DonMau Don(ApplicationDbContext ctx, DuLieuMau du, DateTime gioNhan, TrangThaiDonThue trangThai,
        decimal tienThue = 600_000, decimal tienCoc = 1_000_000, bool daThanhToan = true, long? maKhach = null,
        long? maChinhSach = null, int soLuong = 1)
    {
        var don = new DonThue
        {
            MaKhachHang = maKhach ?? du.KhachA,
            MaChinhSach = maChinhSach ?? du.ChinhSach,
            MaDonHienThi = Ma("DH"),
            NgayDat = gioNhan.AddDays(-5),
            GioNhanDuKien = gioNhan,
            GioTraDuKien = gioNhan.AddDays(2),
            TongTienThueTruocGiam = tienThue,
            TongTienCoc = tienCoc,
            TrangThai = trangThai
        };
        ctx.DonThues.Add(don);
        ctx.SaveChanges();

        var ctd = new ChiTietDonThue
        {
            MaDonThue = don.MaDonThue, MaSanPham = du.SanPham, TenSanPhamLucDat = "Lều 4 người", SoLuong = soLuong,
            SoNgayTinhTien = 2, DonGiaThueMoiNgay = tienThue / 2 / soLuong, MucCocMoiThietBi = tienCoc / soLuong
        };
        ctx.ChiTietDonThues.Add(ctd);
        ctx.SaveChanges();
        ctx.GiuChos.Add(new GiuCho
        {
            MaChiTietDon = ctd.MaChiTietDon, ThoiDiemHetHan = gioNhan.AddDays(-4),
            TrangThai = trangThai == TrangThaiDonThue.ChoThanhToan ? TrangThaiGiuCho.DangGiu : TrangThaiGiuCho.DaXacNhan
        });
        ctx.SaveChanges();

        long? nguonThue = null, nguonCoc = null;
        if (daThanhToan && tienThue + tienCoc > 0)
        {
            var tt = new ThanhToan
            {
                MaDonThue = don.MaDonThue, MaYeuCau = Ma("PAY"), PhuongThuc = "ChuyenKhoan", CongThanhToan = "Mock",
                MaGiaoDichCong = Ma("GDTHU"), TongSoTien = tienThue + tienCoc, TrangThai = "ThanhCong", ThoiDiemThanhCong = gioNhan.AddDays(-5)
            };
            ctx.ThanhToans.Add(tt);
            ctx.SaveChanges();
            if (tienThue > 0)
            {
                var c = new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = MucDichThanhToan.TienThue, SoTien = tienThue };
                ctx.ChiTietThanhToans.Add(c);
                ctx.SaveChanges();
                nguonThue = c.MaChiTietThanhToan;
            }
            if (tienCoc > 0)
            {
                var c = new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = MucDichThanhToan.TienCoc, SoTien = tienCoc };
                ctx.ChiTietThanhToans.Add(c);
                ctx.SaveChanges();
                nguonCoc = c.MaChiTietThanhToan;
            }
        }
        return new DonMau(don.MaDonThue, ctd.MaChiTietDon, nguonThue, nguonCoc);
    }

    /// <summary>Thêm một giao dịch thu riêng cho đơn với một chi tiết (vd. nguồn cọc thứ hai).</summary>
    public static long Nguon(ApplicationDbContext ctx, long maDon, string mucDich, decimal soTien, string trangThai = "ThanhCong")
    {
        var tt = new ThanhToan
        {
            MaDonThue = maDon, MaYeuCau = Ma("PAY"), PhuongThuc = "ChuyenKhoan", TongSoTien = soTien, TrangThai = trangThai,
            ThoiDiemThanhCong = trangThai == "ThanhCong" ? new DateTime(2026, 9, 1) : null
        };
        ctx.ThanhToans.Add(tt);
        ctx.SaveChanges();
        var c = new ChiTietThanhToan { MaThanhToan = tt.MaThanhToan, MucDich = mucDich, SoTien = soTien };
        ctx.ChiTietThanhToans.Add(c);
        ctx.SaveChanges();
        return c.MaChiTietThanhToan;
    }

    /// <summary>Thêm sẵn một dòng HOAN_TIEN (dữ liệu lịch sử) trên nguồn.</summary>
    public static long Hoan(ApplicationDbContext ctx, long nguon, decimal soTien, string trangThai, string? maYeuCau = null,
        DateTime? thoiDiem = null, string loai = LoaiHoanTien.HoanThuThua)
    {
        var h = new HoanTien
        {
            MaChiTietThanhToanGoc = nguon, MaYeuCau = maYeuCau ?? Ma("HT:SEED:") + ":L1", LoaiHoan = loai, SoTien = soTien,
            TrangThai = trangThai, ThoiDiemYeuCau = thoiDiem ?? new DateTime(2026, 9, 1),
            ThoiDiemThanhCong = trangThai == TrangThaiHoanTien.ThanhCong ? new DateTime(2026, 9, 2) : null
        };
        ctx.HoanTiens.Add(h);
        ctx.SaveChanges();
        return h.MaHoanTien;
    }

    public sealed record ThietBiGiao(long MaPhanCong, long MaThietBi, long MaChiTietBanGiao, long MaPhieuBanGiao);

    /// <summary>Phân công <paramref name="soThietBi"/> thiết bị cho dòng đơn và lập phiếu bàn giao (nháp hoặc đã giao).</summary>
    public static List<ThietBiGiao> BanGiao(ApplicationDbContext ctx, DuLieuMau du, long maDon, long maChiTietDon, int soThietBi, bool daGiao)
    {
        var ncc = new NhaCungCap { MaNhaCungCapHienThi = Ma("NCC"), TenNhaCungCap = "NCC" };
        ctx.NhaCungCaps.Add(ncc);
        ctx.SaveChanges();
        var pn = new PhieuNhapHang { MaNhaCungCap = ncc.MaNhaCungCap, MaNguoiLap = du.NhanVien, MaPhieuHienThi = Ma("PN"), TrangThai = TrangThaiPhieuNhap.DaNhapKho };
        ctx.PhieuNhapHangs.Add(pn);
        ctx.SaveChanges();
        var ctpn = new ChiTietPhieuNhap { MaPhieuNhap = pn.MaPhieuNhap, MaSanPham = du.SanPham, SoLuong = soThietBi, DonGiaNhap = 1_000_000 };
        ctx.ChiTietPhieuNhaps.Add(ctpn);
        ctx.SaveChanges();

        // Khách đã xác nhận + có bằng chứng: điều kiện chốt bàn giao từ Tuần 3 (PhieuBanGiao.ChotPhieu).
        var phieu = new PhieuBanGiao
        {
            MaDonThue = maDon, MaNhanVien = du.NhanVien, TrangThai = daGiao ? "DaGiao" : "ChoGiao",
            ThoiDiemGiaoThucTe = daGiao ? new DateTime(2026, 9, 20) : null,
            ThoiDiemKhachXacNhan = new DateTime(2026, 9, 20), BangChungXacNhan = """{"chuKy":"khach.png"}"""
        };
        ctx.PhieuBanGiaos.Add(phieu);
        ctx.SaveChanges();

        var kq = new List<ThietBiGiao>();
        for (var i = 0; i < soThietBi; i++)
        {
            var tb = new ThietBi
            {
                MaChiTietPhieuNhap = ctpn.MaChiTietPhieuNhap, MaSanPhamHienTai = du.SanPham, MaThietBiHienThi = Ma("TB"),
                NgayNhap = new DateTime(2026, 1, 1), GiaNhap = 1_000_000,
                TrangThaiSuDung = daGiao ? TrangThaiThietBi.DangThue : TrangThaiThietBi.SanSang
            };
            ctx.ThietBis.Add(tb);
            ctx.SaveChanges();
            var pc = new PhanCongThietBi { MaChiTietDon = maChiTietDon, MaThietBi = tb.MaThietBi, MaNguoiPhanCong = du.NhanVien, TrangThai = "DaPhanCong" };
            ctx.PhanCongThietBis.Add(pc);
            ctx.SaveChanges();
            var ctbg = new ChiTietBanGiao { MaPhieuBanGiao = phieu.MaPhieuBanGiao, MaPhanCong = pc.MaPhanCong, TinhTrangTruocThue = "Tốt" };
            ctx.ChiTietBanGiaos.Add(ctbg);
            ctx.SaveChanges();
            kq.Add(new ThietBiGiao(pc.MaPhanCong, tb.MaThietBi, ctbg.MaChiTietBanGiao, phieu.MaPhieuBanGiao));
        }
        return kq;
    }

    /// <summary>Một đợt nhận trả với các dòng (chi tiết bàn giao, kết luận, đã duyệt mất?).</summary>
    public static long NhanTra(ApplicationDbContext ctx, DuLieuMau du, long maDon, int lanTra, bool daChot,
        params (long MaChiTietBanGiao, string KetLuan, bool DaDuyetMat)[] dong)
    {
        var p = new PhieuNhanTra
        {
            MaDonThue = maDon, MaNhanVien = du.NhanVien, MaPhieuHienThi = Ma("PNT"), LanTra = lanTra,
            TrangThai = daChot ? TrangThaiPhieuNhanTra.DaChot : TrangThaiPhieuNhanTra.Nhap,
            ThoiDiemChot = daChot ? new DateTime(2026, 9, 25).AddHours(lanTra) : null
        };
        ctx.PhieuNhanTras.Add(p);
        ctx.SaveChanges();
        foreach (var d in dong)
        {
            var laMat = d.KetLuan == "Mất thiết bị";
            ctx.ChiTietNhanTras.Add(new ChiTietNhanTra
            {
                MaPhieuNhanTra = p.MaPhieuNhanTra, MaChiTietBanGiao = d.MaChiTietBanGiao, KetLuan = d.KetLuan,
                ThoiDiemTraThucTe = laMat ? null : new DateTime(2026, 9, 25),
                BienBanMat = laMat ? """{"moTa":"mất"}""" : null,
                ThoiDiemDuyetMat = laMat && d.DaDuyetMat ? new DateTime(2026, 9, 26) : null,
                MaNguoiDuyetMat = laMat && d.DaDuyetMat ? du.NhanVien : null
            });
        }
        ctx.SaveChanges();
        return p.MaPhieuNhanTra;
    }

    public static long PhuPhi(ApplicationDbContext ctx, DuLieuMau du, long maDon, decimal soTien, string trangThaiDuyet,
        string? tranhChap = null, string? ketQua = null, string loai = "PhiTre")
    {
        var p = new PhuPhi
        {
            MaDonThue = maDon, MaNguoiLap = du.NhanVien, LoaiPhi = loai, SoTien = soTien, TrangThaiDuyet = trangThaiDuyet,
            TrangThaiTranhChap = tranhChap, KetQuaGiaiQuyet = ketQua, LyDo = "Phí kiểm tra"
        };
        ctx.PhuPhis.Add(p);
        ctx.SaveChanges();
        return p.MaPhuPhi;
    }

    public static long DoiSoat(ApplicationDbContext ctx, DuLieuMau du, long maDon, decimal coc, decimal phi, decimal canHoan,
        decimal canThu, string trangThai, DateTime lap, DateTime? chot, long? goc = null)
    {
        var d = new DoiSoatTienCoc
        {
            MaDonThue = maDon, MaNguoiLap = du.NhanVien, MaDoiSoatGoc = goc, LoaiDoiSoat = goc == null ? "BanDau" : "DieuChinh",
            TienCocDuocDoiSoat = coc, TongPhuPhiDuocDuyet = phi, SoTienCanHoan = canHoan, SoTienCanThuThem = canThu,
            TrangThai = trangThai, ThoiDiemLap = lap, ThoiDiemChot = chot, LyDoDieuChinh = goc == null ? null : "Giảm phí"
        };
        ctx.DoiSoatTienCocs.Add(d);
        ctx.SaveChanges();
        return d.MaDoiSoat;
    }
}
