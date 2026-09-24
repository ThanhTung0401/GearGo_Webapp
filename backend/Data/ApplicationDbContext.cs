using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ── Tài khoản và hồ sơ ──────────────────────────────────────────────
    public DbSet<TaiKhoan> TaiKhoans { get; set; }
    public DbSet<KhachHang> KhachHangs { get; set; }
    public DbSet<NhanVien> NhanViens { get; set; }

    // ── Sản phẩm và nhập kho ── (uncomment khi tạo entity ở Task 1)
    public DbSet<DanhMucSanPham> DanhMucSanPhams { get; set; }
    public DbSet<SanPham> SanPhams { get; set; }
    public DbSet<HinhAnhSanPham> HinhAnhSanPhams { get; set; }
    public DbSet<ThietBi> ThietBis { get; set; }
    public DbSet<NhaCungCap> NhaCungCaps { get; set; }
    public DbSet<PhieuNhapHang> PhieuNhapHangs { get; set; }
    public DbSet<ChiTietPhieuNhap> ChiTietPhieuNhaps { get; set; }

    // ── Giỏ thuê và đơn thuê ──
    public DbSet<GioThue> GioThues { get; set; }
    public DbSet<ChiTietGioThue> ChiTietGioThues { get; set; }
    public DbSet<ChinhSach> ChinhSachs { get; set; }
    public DbSet<DonThue> DonThues { get; set; }
    public DbSet<ChiTietDonThue> ChiTietDonThues { get; set; }
    public DbSet<GiuCho> GiuChos { get; set; }
    public DbSet<LuotSuDungKhuyenMai> LuotSuDungKhuyenMais { get; set; }
    public DbSet<LichSuTrangThaiDon> LichSuTrangThaiDons { get; set; }
    public DbSet<KhuyenMai> KhuyenMais { get; set; }
    public DbSet<KhuyenMaiSanPham> KhuyenMaiSanPhams { get; set; }
    public DbSet<KhuyenMaiDanhMuc> KhuyenMaiDanhMucs { get; set; }
    public DbSet<ThanhToan> ThanhToans { get; set; }
    public DbSet<ChiTietThanhToan> ChiTietThanhToans { get; set; }

    // ── Phân công, bàn giao, nhận trả ──
    public DbSet<PhanCongThietBi> PhanCongThietBis { get; set; }
    public DbSet<PhieuBanGiao> PhieuBanGiaos { get; set; }
    public DbSet<ChiTietBanGiao> ChiTietBanGiaos { get; set; }
    public DbSet<PhieuNhanTra> PhieuNhanTras { get; set; }
    public DbSet<ChiTietNhanTra> ChiTietNhanTras { get; set; }

    // ── Phụ phí, đối soát, hoàn tiền, bảo trì, điều chỉnh kho ──
    public DbSet<PhuPhi> PhuPhis { get; set; }
    public DbSet<DoiSoatTienCoc> DoiSoatTienCocs { get; set; }
    public DbSet<GiaoDichDoiSoat> GiaoDichDoiSoats { get; set; }
    public DbSet<HoanTien> HoanTiens { get; set; }
    public DbSet<PhieuBaoTri> PhieuBaoTris { get; set; }
    public DbSet<PhieuDieuChinhKho> PhieuDieuChinhKhos { get; set; }
    public DbSet<ChiTietDieuChinhKho> ChiTietDieuChinhKhos { get; set; }

    // ── Đánh giá, thông báo, nhật ký ──
    public DbSet<DanhGia> DanhGias { get; set; }
    public DbSet<ThongBao> ThongBaos { get; set; }
    public DbSet<LichSuTinhTrangThietBi> LichSuTinhTrangThietBis { get; set; }
    public DbSet<NhatKyThaoTac> NhatKyThaoTacs { get; set; }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Tự động cấu hình toàn bộ thuộc tính decimal thành decimal(18, 2) tránh cảnh báo truncating
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
        base.ConfigureConventions(configurationBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TaiKhoan>(e =>
        {
            e.HasIndex(t => t.Email).IsUnique();
            e.HasIndex(t => t.SoDienThoai).IsUnique();
        });

        modelBuilder.Entity<KhachHang>(e =>
        {
            e.HasIndex(k => k.MaTaiKhoan).IsUnique();
            e.HasOne(k => k.TaiKhoan)
             .WithOne(t => t.KhachHang)
             .HasForeignKey<KhachHang>(k => k.MaTaiKhoan)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<NhanVien>(e =>
        {
            e.HasIndex(n => n.MaTaiKhoan).IsUnique();
            e.HasOne(n => n.TaiKhoan)
             .WithOne(t => t.NhanVien)
             .HasForeignKey<NhanVien>(n => n.MaTaiKhoan)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Danh Mục Sản Phẩm ──
        modelBuilder.Entity<DanhMucSanPham>(e =>
        {
            e.HasOne(d => d.DanhMucCha)
             .WithMany(d => d.DanhMucCon)
             .HasForeignKey(d => d.MaDanhMucCha)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Sản Phẩm ──
        modelBuilder.Entity<SanPham>(e =>
        {
            e.HasIndex(s => s.MaSanPhamHienThi).IsUnique();

            e.Property(s => s.TrangThaiKinhDoanh)
             .HasConversion<string>();

            e.HasOne(s => s.DanhMuc)
             .WithMany(d => d.SanPhams)
             .HasForeignKey(s => s.MaDanhMuc)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Hình Ảnh Sản Phẩm ──
        modelBuilder.Entity<HinhAnhSanPham>(e =>
        {
            e.HasOne(h => h.SanPham)
             .WithMany(s => s.HinhAnhs)
             .HasForeignKey(h => h.MaSanPham)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── TASK 7: Cấu hình cho Đơn Thuê & Các Entity liên quan ──

        modelBuilder.Entity<ChinhSach>(e =>
        {
            e.HasIndex(c => c.PhienBan).IsUnique();
        });

        modelBuilder.Entity<DonThue>(e =>
        {
            e.HasIndex(d => d.MaDonHienThi).IsUnique();

            // Ép Enum lưu xuống DB dạng String thay vì số nguyên
            e.Property(d => d.TrangThai).HasConversion<string>();

            // Cấu hình Khóa ngoại MaKhachHang: Ngăn không cho xóa Khách hàng nếu họ có đơn thuê
            e.HasOne(d => d.KhachHang)
                .WithMany()
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChiTietDonThue>(e =>
        {
            // Đơn thuê (1) - Nhiều Chi tiết đơn (N)
            e.HasOne(c => c.DonThue)
                .WithMany()
                .HasForeignKey(c => c.MaDonThue)
                .OnDelete(DeleteBehavior.Cascade); // Xóa đơn thuê thì xóa luôn chi tiết
        });

        modelBuilder.Entity<GiuCho>(e =>
        {
            e.Property(g => g.TrangThai).HasConversion<string>();

            // Quan hệ 1-1: Một ChiTietDonThue chỉ có Một GiuCho
            e.HasOne(g => g.ChiTietDonThue)
                .WithOne(c => c.GiuCho)
                .HasForeignKey<GiuCho>(g => g.MaChiTietDon)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LuotSuDungKhuyenMai>(e =>
        {
            // Quan hệ 1-1: Một DonThue chỉ có Một LuotSuDungKhuyenMai
            e.HasOne(l => l.DonThue)
                .WithOne(d => d.LuotSuDungKhuyenMai)
                .HasForeignKey<LuotSuDungKhuyenMai>(l => l.MaDonThue)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Composite keys & Unique constraints ──
        modelBuilder.Entity<KhuyenMaiSanPham>(e =>
        {
            e.HasKey(x => new { x.MaKhuyenMai, x.MaSanPham });
        });

        modelBuilder.Entity<KhuyenMaiDanhMuc>(e =>
        {
            e.HasKey(x => new { x.MaKhuyenMai, x.MaDanhMuc });
        });

        // Khuyến mãi mã giảm giá duy nhất
        modelBuilder.Entity<KhuyenMai>(e =>
        {
            e.HasIndex(x => x.MaGiamGia).IsUnique();
        });

        // Unique constraints cho các đối tượng kho
        modelBuilder.Entity<NhaCungCap>(e =>
        {
            e.HasIndex(x => x.MaNhaCungCapHienThi).IsUnique();
        });

        modelBuilder.Entity<PhieuNhapHang>(e =>
        {
            e.HasIndex(x => x.MaPhieuHienThi).IsUnique();
        });

        modelBuilder.Entity<ThietBi>(e =>
        {
            e.HasIndex(x => x.MaThietBiHienThi).IsUnique();

            // Quan hệ Thiết bị - Sản phẩm hiện tại (Hỗ trợ giáng cấp/đổi phân loại cho thuê)
            e.HasOne(t => t.SanPhamHienTai)
             .WithMany(s => s.ThietBis)
             .HasForeignKey(t => t.MaSanPhamHienTai)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // 1 chi tiết đơn có tối đa 1 phiếu Giữ chỗ
        modelBuilder.Entity<GiuCho>(e =>
        {
            e.HasIndex(x => x.MaChiTietDon).IsUnique();
        });

        // Mỗi khách hàng có duy nhất 1 Giỏ thuê
        modelBuilder.Entity<GioThue>(e =>
        {
            e.HasIndex(x => x.MaKhachHang).IsUnique();
        });

        // Mỗi đơn thuê sử dụng 1 lượt khuyến mãi nhất định
        modelBuilder.Entity<LuotSuDungKhuyenMai>(e =>
        {
            e.HasIndex(x => x.MaDonThue).IsUnique();
        });

        // TẮT CASCADE DELETE CHO PHAN_CONG_THIET_BI
        modelBuilder.Entity<PhanCongThietBi>(e =>
        {
            // Tắt nhánh từ Nhân Viên
            e.HasOne(p => p.NguoiPhanCong)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiPhanCong)
                .OnDelete(DeleteBehavior.Restrict);

            // TẮT THÊM nhánh từ Thiết Bị
            e.HasOne(p => p.ThietBi)
                .WithMany()
                .HasForeignKey(p => p.MaThietBi)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ThanhToan>(e =>
        {
            e.HasIndex(t => t.MaYeuCau).IsUnique();

            e.HasOne(t => t.NguoiGhiNhan)
                .WithMany()
                .HasForeignKey(t => t.MaNguoiGhiNhan)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── NHẬN TRẢ (Hỗ trợ 1 đơn thuê có nhiều đợt nhận trả) ──
        modelBuilder.Entity<PhieuNhanTra>(e =>
        {
            e.HasIndex(p => p.MaPhieuHienThi).IsUnique();

            // Ràng buộc Unique trên (MaDonThue, LanTra) - Đảm bảo mỗi đơn không có 2 đợt trả cùng số thứ tự
            e.HasIndex(p => new { p.MaDonThue, p.LanTra }).IsUnique();

            e.Property(p => p.TrangThai).HasConversion<string>();

            // Quan hệ 1-N: 1 Đơn thuê có Nhiều phiếu nhận trả
            e.HasOne(p => p.DonThue)
                .WithMany(d => d.PhieuNhanTras)
                .HasForeignKey(p => p.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NhanVien)
                .WithMany()
                .HasForeignKey(p => p.MaNhanVien)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChiTietNhanTra>(e =>
        {
            // 1 thiết bị bàn giao chỉ được ghi nhận trả 1 lần duy nhất trong toàn bộ các đợt trả
            e.HasIndex(c => c.MaChiTietBanGiao).IsUnique();

            e.HasOne(c => c.PhieuNhanTra)
                .WithMany(p => p.ChiTietNhanTras)
                .HasForeignKey(c => c.MaPhieuNhanTra)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.NguoiDuyetMat)
                .WithMany()
                .HasForeignKey(c => c.MaNguoiDuyetMat)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BÀN GIAO (1 DonThue - 1 PhieuBanGiao, 1 PhieuBanGiao - N ChiTietBanGiao, 1-1 PhanCong - ChiTietBanGiao) ──
        modelBuilder.Entity<PhieuBanGiao>(e =>
        {
            e.HasIndex(p => p.MaDonThue).IsUnique();

            e.HasOne(p => p.DonThue)
                .WithOne(d => d.PhieuBanGiao)
                .HasForeignKey<PhieuBanGiao>(p => p.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NhanVien)
                .WithMany()
                .HasForeignKey(p => p.MaNhanVien)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChiTietBanGiao>(e =>
        {
            e.HasIndex(c => c.MaPhanCong).IsUnique();

            e.HasOne(c => c.PhieuBanGiao)
                .WithMany(p => p.ChiTietBanGiaos)
                .HasForeignKey(c => c.MaPhieuBanGiao)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.PhanCongThietBi)
                .WithOne()
                .HasForeignKey<ChiTietBanGiao>(c => c.MaPhanCong)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PHỤ PHÍ ──
        modelBuilder.Entity<PhuPhi>(e =>
        {
            e.HasOne(p => p.DonThue)
                .WithMany()
                .HasForeignKey(p => p.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.ChiTietBanGiao)
                .WithMany()
                .HasForeignKey(p => p.MaChiTietBanGiao)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiLap)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiLap)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiDuyet)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiDuyet)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.PhuPhiGoc)
                .WithMany()
                .HasForeignKey(p => p.MaPhuPhiGoc)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.DoiSoatTienCoc)
                .WithMany(d => d.PhuPhis)
                .HasForeignKey(p => p.MaDoiSoat)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ĐỐI SOÁT TIỀN CỌC ──
        modelBuilder.Entity<DoiSoatTienCoc>(e =>
        {
            e.HasOne(d => d.DonThue)
                .WithMany()
                .HasForeignKey(d => d.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(d => d.DoiSoatGoc)
                .WithMany()
                .HasForeignKey(d => d.MaDoiSoatGoc)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(d => d.NguoiLap)
                .WithMany()
                .HasForeignKey(d => d.MaNguoiLap)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(d => d.NguoiChot)
                .WithMany()
                .HasForeignKey(d => d.MaNguoiChot)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── GIAO DỊCH ĐỐI SOÁT ──
        modelBuilder.Entity<GiaoDichDoiSoat>(e =>
        {
            e.HasIndex(g => g.MaChiTietThanhToan).IsUnique();

            e.HasOne(g => g.DoiSoatTienCoc)
                .WithMany(d => d.GiaoDichDoiSoats)
                .HasForeignKey(g => g.MaDoiSoat)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(g => g.ChiTietThanhToan)
                .WithOne(c => c.GiaoDichDoiSoat)
                .HasForeignKey<GiaoDichDoiSoat>(g => g.MaChiTietThanhToan)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── HOÀN TIỀN ──
        modelBuilder.Entity<HoanTien>(e =>
        {
            e.HasIndex(h => h.MaYeuCau).IsUnique();

            e.HasOne(h => h.ChiTietThanhToanGoc)
                .WithMany(c => c.HoanTiens)
                .HasForeignKey(h => h.MaChiTietThanhToanGoc)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(h => h.DoiSoatTienCoc)
                .WithMany(d => d.HoanTiens)
                .HasForeignKey(h => h.MaDoiSoat)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(h => h.NguoiXuLy)
                .WithMany()
                .HasForeignKey(h => h.MaNguoiXuLy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── BẢO TRÌ ──
        modelBuilder.Entity<PhieuBaoTri>(e =>
        {
            e.HasOne(p => p.ThietBi)
                .WithMany()
                .HasForeignKey(p => p.MaThietBi)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.DonThue)
                .WithMany()
                .HasForeignKey(p => p.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiLap)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiLap)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiXuLy)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiXuLy)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiXacNhanHoanThanh)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiXacNhanHoanThanh)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ĐIỀU CHỈNH KHO ──
        modelBuilder.Entity<PhieuDieuChinhKho>(e =>
        {
            e.HasOne(p => p.PhieuNhapLienQuan)
                .WithMany()
                .HasForeignKey(p => p.MaPhieuNhapLienQuan)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiLap)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiLap)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.NguoiDuyet)
                .WithMany()
                .HasForeignKey(p => p.MaNguoiDuyet)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChiTietDieuChinhKho>(e =>
        {
            e.HasOne(c => c.PhieuDieuChinhKho)
                .WithMany(p => p.ChiTietDieuChinhKhos)
                .HasForeignKey(c => c.MaPhieuDieuChinh)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.ThietBi)
                .WithMany()
                .HasForeignKey(c => c.MaThietBi)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(c => c.ChiTietPhieuNhap)
                .WithMany()
                .HasForeignKey(c => c.MaChiTietPhieuNhap)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ĐÁNH GIÁ ──
        modelBuilder.Entity<DanhGia>(e =>
        {
            e.HasIndex(d => d.MaChiTietDon).IsUnique();

            e.HasOne(d => d.ChiTietDonThue)
                .WithOne(c => c.DanhGia)
                .HasForeignKey<DanhGia>(d => d.MaChiTietDon)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(d => d.NguoiAn)
                .WithMany()
                .HasForeignKey(d => d.MaNguoiAn)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── THÔNG BÁO ──
        modelBuilder.Entity<ThongBao>(e =>
        {
            e.HasOne(t => t.TaiKhoan)
                .WithMany()
                .HasForeignKey(t => t.MaTaiKhoan)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.DonThue)
                .WithMany()
                .HasForeignKey(t => t.MaDonThue)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── LỊCH SỬ TRẠNG THÁI ĐƠN ──
        modelBuilder.Entity<LichSuTrangThaiDon>(e =>
        {
            e.HasOne(l => l.DonThue)
                .WithMany()
                .HasForeignKey(l => l.MaDonThue)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.NguoiThucHien)
                .WithMany()
                .HasForeignKey(l => l.MaNguoiThucHien)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── LỊCH SỬ TÌNH TRẠNG THIẾT BỊ ──
        modelBuilder.Entity<LichSuTinhTrangThietBi>(e =>
        {
            e.HasOne(l => l.ThietBi)
                .WithMany()
                .HasForeignKey(l => l.MaThietBi)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.NguoiThucHien)
                .WithMany()
                .HasForeignKey(l => l.MaNguoiThucHien)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── NHẬT KÝ THAO TÁC ──
        modelBuilder.Entity<NhatKyThaoTac>(e =>
        {
            e.HasOne(n => n.TaiKhoan)
                .WithMany()
                .HasForeignKey(n => n.MaTaiKhoan)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
