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

    [Column("ma_nguoi_ghi_nhan")]
    public long? MaNguoiGhiNhan { get; set; }

    [Column("ma_yeu_cau")]
    [MaxLength(100)]
    public string MaYeuCau { get; set; } = string.Empty;

    [Column("cong_thanh_toan")]
    [MaxLength(50)]
    public string? CongThanhToan { get; set; }

    [Column("ma_giao_dich_cong")]
    [MaxLength(255)]
    public string? MaGiaoDichCong { get; set; }

    [Column("tong_so_tien", TypeName = "decimal(18,2)")]
    public decimal TongSoTien { get; set; }

    [Column("phuong_thuc")]
    [MaxLength(50)]
    public string PhuongThuc { get; set; } = string.Empty;

    [Column("thoi_diem_tao")]
    public DateTime ThoiDiemTao { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_thanh_cong")]
    public DateTime? ThoiDiemThanhCong { get; set; }

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = string.Empty;

    [Column("trang_thai_doi_chieu")]
    [MaxLength(50)]
    public string? TrangThaiDoiChieu { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // -- Navigation Property --
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiGhiNhan))]
    public NhanVien? NguoiGhiNhan { get; set; }

    public ICollection<ChiTietThanhToan> ChiTietThanhToans { get; set; } = new List<ChiTietThanhToan>();
}
