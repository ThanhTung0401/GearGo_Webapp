using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GearGo.Models.Entities;

/// <summary>
/// Đối soát tiền cọc sau khi hoàn tất trả thiết bị và tính toán phụ phí
/// </summary>
[Table("DOI_SOAT_TIEN_COC")]
public class DoiSoatTienCoc
{
    [Key]
    [Column("ma_doi_soat")]
    public long MaDoiSoat { get; set; }

    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_doi_soat_goc")]
    public long? MaDoiSoatGoc { get; set; }

    [Column("ma_nguoi_lap")]
    public long MaNguoiLap { get; set; }

    [Column("ma_nguoi_chot")]
    public long? MaNguoiChot { get; set; }

    [Column("loai_doi_soat")]
    [MaxLength(50)]
    public string LoaiDoiSoat { get; set; } = null!;

    [Column("tien_coc_duoc_doi_soat")]
    public decimal TienCocDuocDoiSoat { get; set; }

    [Column("tong_phu_phi_duoc_duyet")]
    public decimal TongPhuPhiDuocDuyet { get; set; }

    [Column("so_tien_can_hoan")]
    public decimal SoTienCanHoan { get; set; }

    [Column("so_tien_can_thu_them")]
    public decimal SoTienCanThuThem { get; set; }

    [Column("bang_tinh_doi_soat", TypeName = "nvarchar(max)")]
    public string? BangTinhDoiSoat { get; set; } // JSON

    [Column("ten_nguoi_chot_luc_doi_soat")]
    [MaxLength(255)]
    public string? TenNguoiChotLucDoiSoat { get; set; }

    [Column("thoi_diem_lap")]
    public DateTime ThoiDiemLap { get; set; } = DateTime.UtcNow;

    [Column("thoi_diem_chot")]
    public DateTime? ThoiDiemChot { get; set; }

    [Column("trang_thai")]
    [MaxLength(50)]
    public string TrangThai { get; set; } = "ChoChot";

    [Column("ly_do_dieu_chinh")]
    public string? LyDoDieuChinh { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MaDonThue))]
    public DonThue DonThue { get; set; } = null!;

    [ForeignKey(nameof(MaDoiSoatGoc))]
    public DoiSoatTienCoc? DoiSoatGoc { get; set; }

    [ForeignKey(nameof(MaNguoiLap))]
    public NhanVien NguoiLap { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiChot))]
    public NhanVien? NguoiChot { get; set; }

    public ICollection<PhuPhi> PhuPhis { get; set; } = new List<PhuPhi>();
    public ICollection<GiaoDichDoiSoat> GiaoDichDoiSoats { get; set; } = new List<GiaoDichDoiSoat>();
    public ICollection<HoanTien> HoanTiens { get; set; } = new List<HoanTien>();
}
