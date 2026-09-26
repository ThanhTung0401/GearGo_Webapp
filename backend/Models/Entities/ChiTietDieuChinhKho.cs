using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Chi tiết điều chỉnh kho cho từng thiết bị hoặc chi tiết phiếu nhập
/// </summary>
[Table("CHI_TIET_DIEU_CHINH_KHO")]
public class ChiTietDieuChinhKho
{
    [Key]
    [Column("ma_chi_tiet_dieu_chinh")]
    public long MaChiTietDieuChinh { get; set; }

    [Column("ma_phieu_dieu_chinh")]
    public long MaPhieuDieuChinh { get; set; }

    [Column("ma_thiet_bi")]
    public long? MaThietBi { get; set; }

    [Column("ma_chi_tiet_phieu_nhap")]
    public long? MaChiTietPhieuNhap { get; set; }

    [Column("gia_tri_truoc", TypeName = "nvarchar(max)")]
    public string? GiaTriTruoc { get; set; } // JSON

    [Column("gia_tri_sau", TypeName = "nvarchar(max)")]
    public string? GiaTriSau { get; set; } // JSON

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaPhieuDieuChinh))]
    public PhieuDieuChinhKho PhieuDieuChinhKho { get; set; } = null!;

    [ForeignKey(nameof(MaThietBi))]
    public ThietBi? ThietBi { get; set; }

    [ForeignKey(nameof(MaChiTietPhieuNhap))]
    public ChiTietPhieuNhap? ChiTietPhieuNhap { get; set; }
}
