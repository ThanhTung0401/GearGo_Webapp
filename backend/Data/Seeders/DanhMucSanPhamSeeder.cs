using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders;

/// <summary>Kết quả seed danh mục, sản phẩm, phiếu nhập và thiết bị dùng chung cho các seeder khác.</summary>
internal sealed record SeedCatalog(
    DanhMucSanPham DmLeu,
    SanPham SpLeu4,
    SanPham SpBepGa,
    SanPham SpDen,
    SanPham SpTui,
    ThietBi TbLeu1,
    ThietBi? TbLeu2,
    ThietBi TbBep1,
    ThietBi TbHong,
    ThietBi TbDen1,
    ThietBi TbTui1);

/// <summary>Seed danh mục, sản phẩm, nhà cung cấp, phiếu nhập và thiết bị vật lý.</summary>
internal static class DanhMucSanPhamSeeder
{
    public static async Task<SeedCatalog> SeedAsync(ApplicationDbContext context, NhanVien nhanVien1)
    {
        var dmLeu = await EnsureDanhMucAsync(context, "Lều & Bạt dã ngoại", "Lều cắm trại 2-6 người, tăng che mưa nắng, bạt trải dã ngoại cao cấp.", 1);
        var dmBep = await EnsureDanhMucAsync(context, "Bếp & Dụng cụ nấu nướng", "Bếp ga dã ngoại gấp gọn, bộ nồi nhôm Anodized, bình giữ nhiệt.", 2);
        var dmBanGhe = await EnsureDanhMucAsync(context, "Bàn ghế & Đèn cắm trại", "Bàn cuộn nhôm, ghế xếp Kermit, đèn LED vintage dã ngoại.", 3);
        var dmSleep = await EnsureDanhMucAsync(context, "Túi ngủ & Đệm hơi", "Túi ngủ lông vũ mùa đông, đệm tự bơm hơi cách nhiệt", 4);
        await context.SaveChangesAsync();

        var spLeu4 = await EnsureSanPhamAsync(context, dmLeu.MaDanhMuc, "SP-LEU-001", "Lều Cắm Trại 4 Người Naturehike P-Series",
            "Naturehike", "Lều chống mưa gió UPF50+, chống thấm 3000mm, khung hợp kim nhôm 7001 siêu nhẹ.", 4,
            "210 x 210 x 130 cm", "Trọng lượng 2.8kg, vải 210T Polyester", 120000, 500000, 1600000,
            ("https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600", true, 1),
            ("https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600", false, 2));

        var spBepGa = await EnsureSanPhamAsync(context, dmBep.MaDanhMuc, "SP-BEP-001", "Bếp Ga Dã Ngoại Gấp Gọn Kovea Spider",
            "Kovea", "Bếp ga mini công suất cao, đầu đốt tỏa nhiệt đều, chân đế chống trượt gập gọn.", 2,
            "10 x 10 x 12 cm", "Trọng lượng 168g, công suất 2800W", 50000, 200000, 750000,
            ("https://images.unsplash.com/photo-1571863533956-01c88e79957e?w=600", true, 1));

        var spGhe = await EnsureSanPhamAsync(context, dmBanGhe.MaDanhMuc, "SP-GHE-001", "Ghế Xếp Dã Ngoại Kermit Naturehike",
            "Naturehike", "Ghế cắm trại khung vân gỗ cao cấp, vải Oxford 600D chịu lực 120kg.", 1,
            "62 x 52 x 43 cm", "Chịu tải 120kg", 35000, 150000, 450000,
            ("https://images.unsplash.com/photo-1537905569824-f89f14cceb68?w=600", true, 1));

        var spDen = await EnsureSanPhamAsync(context, dmBanGhe.MaDanhMuc, "SP-DEN-001", "Đèn Bão LED Vintage Dã Ngoại Barebones",
            "Barebones", "Đèn LED ánh sáng vàng ấm vintage, pin dùng liên tục 20 giờ, chống nước nhẹ IPX4", 1,
            "15 x 15 x 24 cm", "Độ sáng 200 Lumens, cổng sạc Type-C", 40000, 100000, 400000,
            ("https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600", true, 1));

        var spTui = await EnsureSanPhamAsync(context, dmSleep.MaDanhMuc, "SP-TUI-001", "Túi Ngủ Mùa Đông Naturehike Goose Down",
            "Naturehike", "Túi ngủ lông ngỗng siêu nhẹ, giữ nhiệt nhiệt độ -5°C đến 5°C, chống thấm ẩm ngoài", 1,
            "210 x 80 cm", "Trọng lượng 800g, nén nhỏ gọn", 60000, 200000, 800000,
            ("https://images.unsplash.com/photo-1517824806704-9040b037703b?w=600", true, 1));

        var ncc1 = await EnsureNhaCungCapAsync(context);
        var ctpnFirst = await EnsurePhieuNhapVaThietBiAsync(context, ncc1, nhanVien1, spLeu4, spBepGa, spGhe);

        await EnsureThietBiAsync(context, ctpnFirst.MaChiTietPhieuNhap, spLeu4.MaSanPham, "TB-LEU-003", 1200000, "Mới 100%", "Đầy đủ phụ kiện tiêu chuẩn", "Thiết bị dự phòng sẵn sàng cho thuê");
        var tbDen1 = await EnsureThietBiAsync(context, ctpnFirst.MaChiTietPhieuNhap, spDen.MaSanPham, "TB-DEN-001", 280000, "Tốt", "Cáp sạc Type-C, móc treo", "Sẵn sàng");
        var tbTui1 = await EnsureThietBiAsync(context, ctpnFirst.MaChiTietPhieuNhap, spTui.MaSanPham, "TB-TUI-001", 500000, "Tốt", "Bao nén chống nước", "Đã giặt sấy thơm tho");
        await EnsureThietBiAsync(context, ctpnFirst.MaChiTietPhieuNhap, spTui.MaSanPham, "TB-TUI-002", 500000, "Tốt", "Bao nén chống nước", "Sẵn sàng");

        var tbLeu1 = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-LEU-001");
        var tbLeu2 = await context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBiHienThi == "TB-LEU-002");
        var tbBep1 = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-BEP-001");
        var tbHong = await context.ThietBis.FirstAsync(t => t.MaThietBiHienThi == "TB-BEP-002");

        return new SeedCatalog(dmLeu, spLeu4, spBepGa, spDen, spTui, tbLeu1, tbLeu2, tbBep1, tbHong, tbDen1, tbTui1);
    }

    private static async Task<DanhMucSanPham> EnsureDanhMucAsync(ApplicationDbContext context, string ten, string moTa, int thuTu)
    {
        var dm = await context.DanhMucSanPhams.FirstOrDefaultAsync(d => d.TenDanhMuc == ten);
        if (dm != null) return dm;
        // Dùng chuẩn "HienThi" để đồng bộ với bộ lọc công khai của DanhMucService và SanPhamService
        dm = new DanhMucSanPham { TenDanhMuc = ten, MoTa = moTa, ThuTuHienThi = thuTu, TrangThai = "HienThi" };
        context.DanhMucSanPhams.Add(dm);
        return dm;
    }

    private static async Task<SanPham> EnsureSanPhamAsync(
        ApplicationDbContext context, long maDanhMuc, string maHienThi, string ten, string thuongHieu,
        string moTa, int sucChua, string kichThuoc, string thongSo,
        decimal giaThue, decimal mucCoc, decimal boiThuong,
        params (string Url, bool Chinh, int ThuTu)[] anhList)
    {
        var sp = await context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPhamHienThi == maHienThi);
        if (sp != null) return sp;

        sp = new SanPham
        {
            MaDanhMuc = maDanhMuc, MaSanPhamHienThi = maHienThi, TenSanPham = ten, ThuongHieu = thuongHieu,
            MoTa = moTa, SucChua = sucChua, KichThuoc = kichThuoc, ThongSo = thongSo,
            GiaThueMoiNgay = giaThue, MucCocMoiThietBi = mucCoc, GiaTriBoiThuong = boiThuong,
            TrangThaiKinhDoanh = TrangThaiKinhDoanh.DangKinhDoanh
        };
        context.SanPhams.Add(sp);
        await context.SaveChangesAsync();

        foreach (var (url, chinh, thuTu) in anhList)
            context.HinhAnhSanPhams.Add(new HinhAnhSanPham { MaSanPham = sp.MaSanPham, DuongDan = url, LaAnhChinh = chinh, ThuTu = thuTu });
        await context.SaveChangesAsync();
        return sp;
    }

    private static async Task<NhaCungCap> EnsureNhaCungCapAsync(ApplicationDbContext context)
    {
        var ncc = await context.NhaCungCaps.FirstOrDefaultAsync(n => n.MaNhaCungCapHienThi == "NCC-NAT-01");
        if (ncc != null) return ncc;

        ncc = new NhaCungCap
        {
            MaNhaCungCapHienThi = "NCC-NAT-01", TenNhaCungCap = "Công ty TNHH Thiết bị Dã ngoại Naturehike Việt Nam",
            NguoiLienHe = "Trần Minh Quân", SoDienThoai = "02438889999", Email = "contact@naturehike.vn",
            DiaChi = "Tòa nhà Keangnam, Nam Từ Liêm, Hà Nội", MaSoThue = "0108889999", TrangThaiHopTac = "DangHopTac"
        };
        context.NhaCungCaps.Add(ncc);
        await context.SaveChangesAsync();
        return ncc;
    }

    private static async Task<ChiTietPhieuNhap> EnsurePhieuNhapVaThietBiAsync(
        ApplicationDbContext context, NhaCungCap ncc1, NhanVien nhanVien1,
        SanPham spLeu4, SanPham spBepGa, SanPham spGhe)
    {
        var phieu = await context.PhieuNhapHangs.FirstOrDefaultAsync(p => p.MaPhieuHienThi == "PN-2026-001");
        if (phieu != null) return await context.ChiTietPhieuNhaps.FirstAsync();

        phieu = new PhieuNhapHang
        {
            MaNhaCungCap = ncc1.MaNhaCungCap, MaNguoiLap = nhanVien1.MaNhanVien, MaNguoiXacNhan = nhanVien1.MaNhanVien,
            MaPhieuHienThi = "PN-2026-001", SoChungTuNhaCungCap = "HD-NAT-202601",
            NgayLap = DateTime.UtcNow.AddMonths(-2), NgayNhapThucTe = DateTime.UtcNow.AddMonths(-2), NgayXacNhan = DateTime.UtcNow.AddMonths(-2),
            TongTien = 18000000, TenNguoiLapLucNhap = nhanVien1.HoTen, TenNguoiXacNhanLucNhap = nhanVien1.HoTen,
            TrangThai = TrangThaiPhieuNhap.DaNhapKho
        };
        context.PhieuNhapHangs.Add(phieu);
        await context.SaveChangesAsync();

        var ctpnLeu = new ChiTietPhieuNhap { MaPhieuNhap = phieu.MaPhieuNhap, MaSanPham = spLeu4.MaSanPham, TenSanPhamLucNhap = spLeu4.TenSanPham, SoLuong = 10, DonGiaNhap = 1200000, TinhTrangKhiNhap = "Mới 100%" };
        var ctpnBep = new ChiTietPhieuNhap { MaPhieuNhap = phieu.MaPhieuNhap, MaSanPham = spBepGa.MaSanPham, TenSanPhamLucNhap = spBepGa.TenSanPham, SoLuong = 10, DonGiaNhap = 450000, TinhTrangKhiNhap = "Mới 100%" };
        var ctpnGhe = new ChiTietPhieuNhap { MaPhieuNhap = phieu.MaPhieuNhap, MaSanPham = spGhe.MaSanPham, TenSanPhamLucNhap = spGhe.TenSanPham, SoLuong = 10, DonGiaNhap = 250000, TinhTrangKhiNhap = "Mới 100%" };
        context.ChiTietPhieuNhaps.AddRange(ctpnLeu, ctpnBep, ctpnGhe);
        await context.SaveChangesAsync();

        context.ThietBis.AddRange(
            new ThietBi { MaChiTietPhieuNhap = ctpnLeu.MaChiTietPhieuNhap, MaSanPhamHienTai = spLeu4.MaSanPham, MaThietBiHienThi = "TB-LEU-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 1200000, TinhTrang = "Mới", TrangThaiSuDung = TrangThaiThietBi.DangThue },
            new ThietBi { MaChiTietPhieuNhap = ctpnLeu.MaChiTietPhieuNhap, MaSanPhamHienTai = spLeu4.MaSanPham, MaThietBiHienThi = "TB-LEU-002", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 1200000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.SanSang },
            new ThietBi { MaChiTietPhieuNhap = ctpnBep.MaChiTietPhieuNhap, MaSanPhamHienTai = spBepGa.MaSanPham, MaThietBiHienThi = "TB-BEP-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 450000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.DangThue },
            new ThietBi { MaChiTietPhieuNhap = ctpnBep.MaChiTietPhieuNhap, MaSanPhamHienTai = spBepGa.MaSanPham, MaThietBiHienThi = "TB-BEP-002", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 450000, TinhTrang = "Gãy chân đế", TrangThaiSuDung = TrangThaiThietBi.DangBaoTri },
            new ThietBi { MaChiTietPhieuNhap = ctpnGhe.MaChiTietPhieuNhap, MaSanPhamHienTai = spGhe.MaSanPham, MaThietBiHienThi = "TB-GHE-001", NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = 250000, TinhTrang = "Tốt", TrangThaiSuDung = TrangThaiThietBi.SanSang }
        );
        await context.SaveChangesAsync();
        return ctpnLeu;
    }

    private static async Task<ThietBi> EnsureThietBiAsync(
        ApplicationDbContext context, long maCtpn, long maSanPham, string maHienThi,
        decimal giaNhap, string tinhTrang, string phuKien, string ghiChu)
    {
        var tb = await context.ThietBis.FirstOrDefaultAsync(t => t.MaThietBiHienThi == maHienThi);
        if (tb != null) return tb;

        tb = new ThietBi
        {
            MaChiTietPhieuNhap = maCtpn, MaSanPhamHienTai = maSanPham, MaThietBiHienThi = maHienThi,
            NgayNhap = DateTime.UtcNow.AddMonths(-2), GiaNhap = giaNhap, TinhTrang = tinhTrang,
            PhuKienDiKem = phuKien, TrangThaiSuDung = TrangThaiThietBi.SanSang, GhiChu = ghiChu
        };
        context.ThietBis.Add(tb);
        await context.SaveChangesAsync();
        return tb;
    }
}
