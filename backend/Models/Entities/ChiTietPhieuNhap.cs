using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("CHI_TIET_PHIEU_NHAP")]
public class ChiTietPhieuNhap {
    [Key] [Column("ma_chi_tiet_phieu_nhap")] public long MaChiTietPhieuNhap { get; set; }
    [Column("ma_phieu_nhap")] public long MaPhieuNhap { get; set; }
    [Column("ma_san_pham")] public long MaSanPham { get; set; }
    [Column("ten_san_pham_luc_nhap")] [MaxLength(255)] public string? TenSanPhamLucNhap { get; set; }
    [Column("so_luong")] public int SoLuong { get; set; }
    [Column("don_gia_nhap")] public decimal DonGiaNhap { get; set; }
    [Column("tinh_trang_khi_nhap")] public string? TinhTrangKhiNhap { get; set; }
    [Column("ghi_chu")] public string? GhiChu { get; set; }
    
    [ForeignKey(nameof(MaPhieuNhap))] public PhieuNhapHang PhieuNhapHang { get; set; } = null!;
    [ForeignKey(nameof(MaSanPham))] public SanPham SanPham { get; set; } = null!;
    public ICollection<ThietBi> ThietBis { get; set; } = new List<ThietBi>();
}
