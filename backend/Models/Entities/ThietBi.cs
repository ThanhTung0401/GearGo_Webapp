using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("THIET_BI")]
public class ThietBi {
    [Key] [Column("ma_thiet_bi")] public long MaThietBi { get; set; }
    [Column("ma_chi_tiet_phieu_nhap")] public long MaChiTietPhieuNhap { get; set; }
    // Mã sản phẩm mà thiết bị đang đại diện cho thuê (hỗ trợ giáng cấp/phân loại theo tình trạng)
    [Column("ma_san_pham_hien_tai")] public long MaSanPhamHienTai { get; set; }
    [Column("ma_thiet_bi_hien_thi")] [MaxLength(50)] public string MaThietBiHienThi { get; set; } = null!;
    [Column("ngay_nhap")] public DateTime NgayNhap { get; set; }
    [Column("gia_nhap")] public decimal GiaNhap { get; set; }
    [Column("tinh_trang")] public string? TinhTrang { get; set; }
    [Column("phu_kien_di_kem")] public string? PhuKienDiKem { get; set; }
    [Column("trang_thai_su_dung")] public GearGo.Models.Enums.TrangThaiThietBi TrangThaiSuDung { get; set; }
    [Column("ghi_chu")] public string? GhiChu { get; set; }
    
    [ForeignKey(nameof(MaChiTietPhieuNhap))] public ChiTietPhieuNhap ChiTietPhieuNhap { get; set; } = null!;
    [ForeignKey(nameof(MaSanPhamHienTai))] public SanPham SanPhamHienTai { get; set; } = null!;
}
