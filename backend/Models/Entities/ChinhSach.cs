using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace GearGo.Models.Entities;
[Table("CHINH_SACH")]
public class ChinhSach {
    [Key] [Column("ma_chinh_sach")] public long MaChinhSach { get; set; }
    [Column("ma_nguoi_tao")] public long MaNguoiTao { get; set; }
    [Column("phien_ban")] [MaxLength(50)] public string PhienBan { get; set; } = null!;
    [Column("thoi_diem_ap_dung")] public DateTime ThoiDiemApDung { get; set; }
    [Column("noi_dung_quy_dinh")] public string NoiDungQuyDinh { get; set; } = null!;
    [ForeignKey(nameof(MaNguoiTao))] public NhanVien NguoiTao { get; set; } = null!;
}
