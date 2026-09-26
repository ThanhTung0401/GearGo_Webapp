using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Nhật ký ghi nhận các thao tác/audit log người dùng thực hiện
/// </summary>
[Table("NHAT_KY_THAO_TAC")]
public class NhatKyThaoTac
{
    [Key]
    [Column("ma_nhat_ky")]
    public long MaNhatKy { get; set; }

    [Column("ma_tai_khoan")]
    public long? MaTaiKhoan { get; set; }

    [Column("hanh_dong")]
    [MaxLength(100)]
    public string? HanhDong { get; set; }

    [Column("loai_doi_tuong")]
    [MaxLength(100)]
    public string? LoaiDoiTuong { get; set; }

    [Column("ma_doi_tuong")]
    [MaxLength(100)]
    public string? MaDoiTuong { get; set; }

    [Column("du_lieu_truoc", TypeName = "nvarchar(max)")]
    public string? DuLieuTruoc { get; set; } // JSON

    [Column("du_lieu_sau", TypeName = "nvarchar(max)")]
    public string? DuLieuSau { get; set; } // JSON

    [Column("thoi_diem")]
    public DateTime ThoiDiem { get; set; } = DateTime.UtcNow;

    [Column("ly_do")]
    public string? LyDo { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaTaiKhoan))]
    public TaiKhoan? TaiKhoan { get; set; }
}
