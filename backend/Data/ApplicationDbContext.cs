using GearGo.Models.Entities;
using GearGo.Models.Enums;
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

    // ── Giỏ thuê và đơn thuê ── (uncomment khi tạo entity ở Task 2)
    public DbSet<GioThue> GioThues { get; set; }
    public DbSet<ChiTietGioThue> ChiTietGioThues { get; set; }
    public DbSet<ChinhSach> ChinhSachs { get; set; }
    public DbSet<DonThue> DonThues { get; set; }
    public DbSet<ChiTietDonThue> ChiTietDonThues { get; set; }
    public DbSet<GiuCho> GiuChos { get; set; }
    public DbSet<KhuyenMai> KhuyenMais { get; set; }
    public DbSet<KhuyenMaiSanPham> KhuyenMaiSanPhams { get; set; }
    public DbSet<KhuyenMaiDanhMuc> KhuyenMaiDanhMucs { get; set; }
    public DbSet<LuotSuDungKhuyenMai> LuotSuDungKhuyenMais { get; set; }
    // public DbSet<ThanhToan> ThanhToans { get; set; }
    // public DbSet<ChiTietThanhToan> ChiTietThanhToans { get; set; }

    // ── Task 3+ ──
    public DbSet<PhanCongThietBi> PhanCongThietBis { get; set; }
    // public DbSet<PhieuBanGiao> PhieuBanGiaos { get; set; }
    // public DbSet<ChiTietBanGiao> ChiTietBanGiaos { get; set; }
    // public DbSet<PhieuNhanTra> PhieuNhanTras { get; set; }
    // public DbSet<ChiTietNhanTra> ChiTietNhanTras { get; set; }
    // public DbSet<PhuPhi> PhuPhis { get; set; }
    // public DbSet<DoiSoatTienCoc> DoiSoatTienCocs { get; set; }
    // public DbSet<HoanTien> HoanTiens { get; set; }
    // public DbSet<PhieuBaoTri> PhieuBaoTris { get; set; }
    // public DbSet<PhieuDieuChinhKho> PhieuDieuChinhKhos { get; set; }
    // public DbSet<DanhGia> DanhGias { get; set; }
    // public DbSet<ThongBao> ThongBaos { get; set; }
    // public DbSet<LichSuTrangThaiDon> LichSuTrangThaiDons { get; set; }
    // public DbSet<LichSuTinhTrangThietBi> LichSuTinhTrangThietBis { get; set; }
    // public DbSet<NhatKyThaoTac> NhatKyThaoTacs { get; set; }

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
    }
}
