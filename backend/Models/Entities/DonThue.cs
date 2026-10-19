using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;

namespace GearGo.Models.Entities;

[Table("DON_THUE")]
public class DonThue
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ma_don_thue")]
    public long MaDonThue { get; set; }

    [Column("ma_khach_hang")]
    public long MaKhachHang { get; set; }

    [Column("ma_chinh_sach")]
    public long MaChinhSach { get; set; }

    [Column("ma_nguoi_huy")]
    public long? MaNguoiHuy { get; set; }

    [Column("ma_don_hien_thi")]
    [MaxLength(50)]
    public string MaDonHienThi { get; set; } = string.Empty;

    [Column("ngay_dat")]
    public DateTime NgayDat { get; set; } = DateTime.UtcNow;

    [Column("gio_nhan_du_kien")]
    public DateTime GioNhanDuKien { get; set; }

    [Column("gio_tra_du_kien")]
    public DateTime GioTraDuKien { get; set; }

    [Column("han_thanh_toan")]
    public DateTime? HanThanhToan { get; set; }

    [Column("ten_nguoi_nhan")]
    [MaxLength(255)]
    public string? TenNguoiNhan { get; set; }

    [Column("so_dien_thoai_nguoi_nhan")]
    [MaxLength(20)]
    public string? SoDienThoaiNguoiNhan { get; set; }

    [Column("email_lien_he")]
    [MaxLength(255)]
    public string? EmailLienHe { get; set; }

    [Column("tong_tien_thue_truoc_giam", TypeName = "decimal(18,2)")]
    public decimal TongTienThueTruocGiam { get; set; }

    [Column("tong_tien_giam", TypeName = "decimal(18,2)")]
    public decimal TongTienGiam { get; set; }

    [Column("tong_tien_coc", TypeName = "decimal(18,2)")]
    public decimal TongTienCoc { get; set; }

    [Column("khuyen_mai_luc_dat", TypeName = "nvarchar(max)")]
    public string? KhuyenMaiLucDat { get; set; }

    [Column("trang_thai")]
    public TrangThaiDonThue TrangThai { get; set; }

    [Column("thoi_diem_huy")]
    public DateTime? ThoiDiemHuy { get; set; }

    [Column("ly_do_huy")]
    public string? LyDoHuy { get; set; }

    [Column("tien_thue_giu_lai_khi_huy", TypeName = "decimal(18,2)")]
    public decimal TienThueGiuLaiKhiHuy { get; set; }

    [Column("thoi_diem_hoan_tat")]
    public DateTime? ThoiDiemHoanTat { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // ─── NAVIGATION PROPERTIES ───
    [ForeignKey(nameof(MaKhachHang))]
    public KhachHang KhachHang { get; set; } = null!;

    [ForeignKey(nameof(MaChinhSach))]
    public ChinhSach ChinhSach { get; set; } = null!;

    [ForeignKey(nameof(MaNguoiHuy))]
    public TaiKhoan? NguoiHuy { get; set; }

    // @OneToOne
    public LuotSuDungKhuyenMai? LuotSuDungKhuyenMai { get; set; }

    // @OneToMany
    [InverseProperty(nameof(ChiTietDonThue.DonThue))]
    public ICollection<ChiTietDonThue> ChiTietDonThues { get; set; } = new List<ChiTietDonThue>();

    // @OneToMany: Một đơn thuê có thể có nhiều phiếu nhận trả (trả nhiều lần)
    public ICollection<PhieuNhanTra> PhieuNhanTras { get; set; } = new List<PhieuNhanTra>();

    // @OneToOne: Một đơn thuê có 1 phiếu bàn giao
    public PhieuBanGiao? PhieuBanGiao { get; set; }

    // ----- RICH DOMAIN -----

    public static DonThue KhoiTao(
        TaoDonThueRequest req,
        long maChinhSach,
        DateTime now,
        decimal tienThue,
        decimal tienGiam,
        decimal tienCoc,
        KhuyenMai? km = null)
    {
        return new DonThue
        {
            MaKhachHang = req.MaKhachHang,
            MaChinhSach = maChinhSach,
            MaDonHienThi = DisplayCodeHelper.SinhMaDonHienThi(now),
            NgayDat = now,
            GioNhanDuKien = req.GioNhanDuKien,
            GioTraDuKien = req.GioTraDuKien,
            HanThanhToan = now.AddMinutes(KietDomainConstants.PolicyConfig.ThoiGianGiuChoPhut),
            TenNguoiNhan = req.TenNguoiNhan,
            SoDienThoaiNguoiNhan = req.SoDienThoaiNguoiNhan,
            EmailLienHe = req.EmailLienHe,
            GhiChu = req.GhiChu,
            TongTienThueTruocGiam = tienThue,
            TongTienGiam = tienGiam,
            TongTienCoc = tienCoc,
            TrangThai = TrangThaiDonThue.ChoThanhToan,
            KhuyenMaiLucDat = km != null ? JsonSerializer.Serialize(new
            {
                km.MaGiamGia,
                km.TenKhuyenMai,
                km.LoaiGiam,
                km.GiaTriGiam,
                SoTienGiam = tienGiam
            }) : null
        };
    }

    public (List<ChiTietDonThue> ChiTiets, List<GiuCho> GiuChos) TaoDanhSachChiTietVaGiuCho(
        IReadOnlyList<ChiTietDonThueDto> items,
        Dictionary<long, SanPham> sanPhams,
        int soNgayThue,
        DateTime now)
    {
        var chiTiets = new List<ChiTietDonThue>();
        var giuChos = new List<GiuCho>();
        var hanThanhToan = HanThanhToan ?? now.AddMinutes(KietDomainConstants.PolicyConfig.ThoiGianGiuChoPhut);
        decimal tienGiamConLai = TongTienGiam;

        for (int i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var sp = sanPhams[item.MaSanPham];
            var tienThueDong = sp.GiaThueMoiNgay * item.SoLuong * soNgayThue;

            decimal tienGiamDong = 0;
            if (TongTienThueTruocGiam > 0 && TongTienGiam > 0)
            {
                if (i == items.Count - 1)
                {
                    tienGiamDong = tienGiamConLai;
                }
                else
                {
                    tienGiamDong = Math.Round((tienThueDong / TongTienThueTruocGiam) * TongTienGiam, 0);
                    tienGiamConLai -= tienGiamDong;
                }
            }

            var chiTiet = ChiTietDonThue.KhoiTao(MaDonThue, sp, item.SoLuong, soNgayThue, tienGiamDong);
            var giuCho = chiTiet.TaoGiuCho(now, hanThanhToan);

            chiTiets.Add(chiTiet);
            giuChos.Add(giuCho);
        }

        return (chiTiets, giuChos);
    }

    public TrangThaiDonThue HuyDon(long maTaiKhoan, bool laNoiBo, string lyDo, DateTime now)
    {
        var trangThaiSau = laNoiBo ? TrangThaiDonThue.CuaHangHuy : TrangThaiDonThue.KhachHuy;
        TrangThai = trangThaiSau;
        ThoiDiemHuy = now;
        LyDoHuy = lyDo;
        MaNguoiHuy = maTaiKhoan;

        foreach (var ct in ChiTietDonThues)
        {
            if (ct.GiuCho != null && ct.GiuCho.TrangThai == TrangThaiGiuCho.DangGiu)
            {
                ct.GiuCho.TrangThai = TrangThaiGiuCho.DaGiaiPhong;
                ct.GiuCho.ThoiDiemGiaiPhong = now;
            }
        }

        return trangThaiSau;
    }

    public void BatDauThue()
    {
        if (TrangThai != TrangThaiDonThue.SanSangNhan)
            throw new TrangThaiKhongHopLeException("Đơn chưa sẵn sàng để giao.");

        TrangThai = TrangThaiDonThue.DangThue;
    }

    public void XacNhanThanhToan()
    {
        if (TrangThai != TrangThaiDonThue.ChoThanhToan)
            throw new TrangThaiKhongHopLeException("Đơn chưa sẵn sàng để thanh toán.");

        TrangThai = TrangThaiDonThue.DaXacNhan;
        foreach (var chiTiet in ChiTietDonThues)
        {
            if (chiTiet.GiuCho != null)
            {
                chiTiet.GiuCho.TrangThai = TrangThaiGiuCho.DaXacNhan;
            }
        }
    }
}
