using GearGo.Models.DTOs.BanGiao;
using GearGo.Models.DTOs.BaoTri;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.NhanTra;
using GearGo.Models.Entities;

namespace GearGo.Helpers;

public static class MappingExtensions
{
    public static DonThueResponse ToResponse(this DonThue d, DateTime defaultHanThanhToan)
    {
        return new DonThueResponse(
            d.MaDonThue,
            d.MaDonHienThi,
            d.TongTienThueTruocGiam - d.TongTienGiam,
            d.TongTienCoc,
            d.TrangThai.ToString(),
            d.HanThanhToan ?? defaultHanThanhToan
        );
    }

    public static NhanTraResponse ToResponse(this PhieuNhanTra p, int soConNo = 0, List<string>? canhBao = null)
    {
        return new NhanTraResponse
        {
            MaPhieu = p.MaPhieuNhanTra,
            MaDonThue = p.MaDonThue,
            MaPhieuHienThi = p.MaPhieuHienThi,
            LanTra = p.LanTra,
            TrangThai = p.TrangThai.ToString(),
            ThoiDiemLap = p.ThoiDiemLap,
            ThoiDiemChot = p.ThoiDiemChot,
            TenNhanVienLucNhan = p.TenNhanVienLucNhan,
            GhiChu = p.GhiChu,
            LaLanTraCuoi = p.LaLanTraCuoi,
            SoThietBiConNo = soConNo,
            CanhBaoDonSau = canhBao ?? new List<string>(),
            ChiTiet = p.ChiTietNhanTras.Select(ToResponse).ToList()
        };
    }

    public static ChiTietNhanTraResponse ToResponse(this ChiTietNhanTra ct)
    {
        var tb = ct.ChiTietBanGiao?.PhanCongThietBi?.ThietBi;
        return new ChiTietNhanTraResponse
        {
            MaChiTietNhanTra = ct.MaChiTietNhanTra,
            MaChiTietBanGiao = ct.MaChiTietBanGiao,
            MaThietBi = tb?.MaThietBi ?? 0,
            MaThietBiHienThi = tb?.MaThietBiHienThi ?? "",
            TenSanPham = tb?.SanPhamHienTai?.TenSanPham ?? "",
            ThoiDiemTraThucTe = ct.ThoiDiemTraThucTe,
            KetLuan = ct.KetLuan,
            TinhTrangSauThue = ct.TinhTrangSauThue,
            PhuKienThucNhan = ct.PhuKienThucNhan,
            PhuKienConThieu = ct.PhuKienConThieu,
            DanhSachAnh = ct.DanhSachAnh,
            BienBanMat = ct.BienBanMat,
            TrangThaiXuLy = ct.TrangThaiXuLy,
            MaNguoiDuyetMat = ct.MaNguoiDuyetMat,
            TenNguoiDuyetMat = ct.NguoiDuyetMat?.HoTen,
            ThoiDiemDuyetMat = ct.ThoiDiemDuyetMat,
            GhiChu = ct.GhiChu
        };
    }

    public static PhieuBanGiaoResponse ToResponse(this PhieuBanGiao entity)
    {
        return new PhieuBanGiaoResponse(
            entity.MaPhieuBanGiao,
            entity.MaDonThue,
            entity.MaNhanVien,
            entity.ThoiDiemLap,
            entity.ThoiDiemGiaoThucTe,
            entity.TenNhanVienLucGiao,
            entity.TenNguoiNhanThucTe,
            entity.TrangThai,
            entity.ChiTietBanGiaos.Select(c => new ChiTietBanGiaoResponse(
                c.MaChiTietBanGiao,
                c.MaPhanCong,
                c.TinhTrangTruocThue,
                c.PhuKienThucGiao,
                c.DanhSachAnh
            )).ToList()
        );
    }

    public static BaoTriResponse ToResponse(this PhieuBaoTri p, List<string>? canhBao = null)
    {
        return new BaoTriResponse
        {
            MaPhieuBaoTri = p.MaPhieuBaoTri,
            MaThietBi = p.MaThietBi,
            MaThietBiHienThi = p.ThietBi?.MaThietBiHienThi ?? "",
            TenSanPham = p.ThietBi?.SanPhamHienTai?.TenSanPham ?? "",
            MaDonThue = p.MaDonThue,
            MaNguoiLap = p.MaNguoiLap,
            TenNguoiLap = p.NguoiLap?.HoTen,
            MaNguoiXuLy = p.MaNguoiXuLy,
            TenNguoiXuLy = p.NguoiXuLy?.HoTen,
            MaNguoiXacNhanHoanThanh = p.MaNguoiXacNhanHoanThanh,
            TenNguoiXacNhanHoanThanh = p.NguoiXacNhanHoanThanh?.HoTen,
            LoaiXuLy = p.LoaiXuLy,
            MoTaLoi = p.MoTaLoi,
            MucDo = p.MucDo,
            NgayBatDau = p.NgayBatDau,
            NgayDuKienHoanThanh = p.NgayDuKienHoanThanh,
            NgayHoanThanhThucTe = p.NgayHoanThanhThucTe,
            ChiPhi = p.ChiPhi,
            KetQua = p.KetQua,
            BangChung = p.BangChung,
            TrangThai = p.TrangThai,
            CanhBaoDonSau = canhBao ?? new List<string>()
        };
    }
}
