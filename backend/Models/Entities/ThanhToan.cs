using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

[Table("THANH_TOAN")]
public class ThanhToan
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_thanh_toan")]
    public long MaThanhToan { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_thanh_toan_hien_thi")]
    [MaxLength(50)]
    public string MaThanhToanHienThi { get; set; } = string.Empty;

    [Column("phuong_thuc_thanh_toan")]
    [MaxLength(50)]
    public string PhuongThucThanhToan { get; set; } = string.Empty;

    [Column("so_tien", TypeName = "decimal(18,2)")]
    public decimal SoTien { get; set; }

    [Column("thoi_gian_thanh_toan")]
    public DateTime ThoiGianThanhToan { get; set; } = DateTime.UtcNow;

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = string.Empty; // ThanhCong, ThatBai, DaHoanTien

    [Column("ma_giao_dich_doi_tac")]
    [MaxLength(255)]
    public string? MaGiaoDichDoiTac { get; set; } // Mã GD trả về từ VNPay/Momo

    // -- Navigation Property --
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;
}
