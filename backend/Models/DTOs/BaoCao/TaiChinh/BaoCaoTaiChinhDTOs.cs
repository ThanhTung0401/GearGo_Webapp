using System;
using System.Collections.Generic;

namespace GearGo.Models.DTOs.BaoCao.TaiChinh;

/// <summary>
/// Siêu dữ liệu chuẩn cho báo cáo tài chính (W6-T5 - UC25 - Kim Xuyến).
/// Minh bạch về bộ lọc thời gian, múi giờ, mốc lấy dữ liệu để tránh hiểu nhầm số liệu.
/// </summary>
public class BaoCaoTaiChinhMeta
{
    public DateTime ThoiDiemLayDuLieu { get; set; }
    public string MuiGioHienThi { get; set; } = "Asia/Ho_Chi_Minh (UTC+7)";
    public string DonViTien { get; set; } = "VND";

    /// <summary>Ngày đầu kỳ theo giờ Việt Nam (bao gồm). Null với báo cáo số dư hiện tại.</summary>
    public DateTime? TuNgay { get; set; }

    /// <summary>Ngày cuối kỳ theo giờ Việt Nam (bao gồm). Null với báo cáo số dư hiện tại.</summary>
    public DateTime? DenNgay { get; set; }

    /// <summary>Mốc UTC đầu kỳ, bao gồm: [00:00 ngày bắt đầu VN).</summary>
    public DateTime? TuUtc { get; set; }

    /// <summary>Mốc UTC cuối kỳ, KHÔNG bao gồm: [00:00 ngày sau ngày kết thúc VN).</summary>
    public DateTime? DenUtcKhongBaoGom { get; set; }

    /// <summary>Mốc ngày nghiệp vụ được dùng để lọc (ví dụ ThoiDiemHoanTat, ThoiDiemThanhCong, ThoiDiemHuy, ThoiDiemChot).</summary>
    public string MocLoc { get; set; } = string.Empty;

    public List<string> GhiChu { get; set; } = new();
}

/// <summary>
/// Bộ lọc báo cáo tài chính chung.
/// </summary>
public class LocTaiChinhRequest
{
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public long? MaDon { get; set; }
    public int Trang { get; set; } = 1;
    public int SoMoiTrang { get; set; } = 20;
}

// ───────────────────────────── 1. Doanh thu hoàn tất ─────────────────────────────

public class DoanhThuHoanTatBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();
    public decimal TongDoanhThuThueSauGiam { get; set; }
    public decimal TongPhuPhiDoiSoatBanDau { get; set; }
    public decimal TongDoanhThuHoanTat { get; set; }
    public int SoDonHoanTat { get; set; }
    public List<DoanhThuHoanTatDongItem> Items { get; set; } = new();
    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
    public int TongSo { get; set; }
}

public class DoanhThuHoanTatDongItem
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime? ThoiDiemHoanTat { get; set; }
    public decimal TienThueTruocGiam { get; set; }
    public decimal TienGiam { get; set; }
    public decimal TienThueSauGiam { get; set; }
    public decimal PhuPhiDoiSoatBanDau { get; set; }
    public decimal TongDoanhThu { get; set; }
    public long? MaDoiSoatGoc { get; set; }
    public bool CoNgoaiLeThieuDoiSoat { get; set; }
    public string? GhiChu { get; set; }
}

// ───────────────────────────── 2. Phí hủy giữ lại ─────────────────────────────

public class PhiHuyBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();
    public decimal TongPhiHuyGiuLai { get; set; }
    public int SoDonHuyCoPhi { get; set; }
    public List<PhiHuyDongItem> Items { get; set; } = new();
    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
    public int TongSo { get; set; }
}

public class PhiHuyDongItem
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime? ThoiDiemHuy { get; set; }
    public string? LyDoHuy { get; set; }
    public decimal TienThueGiuLai { get; set; }
    public decimal TienThueTruocGiam { get; set; }
    public decimal TienGiam { get; set; }
    public decimal TienCoc { get; set; }
}

// ───────────────────────────── 3. Điều chỉnh doanh thu ─────────────────────────────

public class DieuChinhDoanhThuBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();
    public decimal TongDeltaDoanhThu { get; set; }
    public int SoPhieuDieuChinh { get; set; }
    public List<DieuChinhDoanhThuDongItem> Items { get; set; } = new();
    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
    public int TongSo { get; set; }
}

public class DieuChinhDoanhThuDongItem
{
    public long MaDoiSoatDieuChinh { get; set; }
    public long MaDoiSoatGoc { get; set; }
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime? ThoiDiemChotDieuChinh { get; set; }
    public string? LyDoDieuChinh { get; set; }
    public decimal PhuPhiGoc { get; set; }
    public decimal PhuPhiSauDieuChinh { get; set; }
    public decimal DeltaPhuPhi { get; set; }
    public string? TenNguoiChot { get; set; }
}

// ───────────────────────────── 4. Thu / Hoàn thực tế ─────────────────────────────

public class ThuHoanBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();

    // Thu thực tế
    public decimal TongThuThucTe { get; set; }
    public decimal ThuTienThue { get; set; }
    public decimal ThuTienCoc { get; set; }
    public decimal ThuBoSung { get; set; }
    public decimal ThuChoPhanLoai { get; set; }
    public int SoGiaoDichThu { get; set; }

    // Hoàn thực tế
    public decimal TongHoanThucTe { get; set; }
    public decimal HoanTienThue { get; set; }
    public decimal HoanTienCoc { get; set; }
    public decimal HoanThuBoSung { get; set; }
    public int SoKhoanHoan { get; set; }

    // Dòng tiền ròng
    public decimal DongTienRong { get; set; }

    // Danh sách giao dịch
    public List<GiaoDichThuItem> GiaoDichThus { get; set; } = new();
    public List<KhoanHoanItem> KhoanHoans { get; set; } = new();

    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
    public int TongSoThu { get; set; }
    public int TongSoHoan { get; set; }
}

public class GiaoDichThuItem
{
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public string PhuongThuc { get; set; } = string.Empty;
    public string? CongThanhToan { get; set; }
    public DateTime? ThoiDiemThanhCong { get; set; }
    public decimal TongSoTien { get; set; }
    public decimal TienThue { get; set; }
    public decimal TienCoc { get; set; }
    public decimal ThuBoSung { get; set; }
    public decimal ChoPhanLoai { get; set; }
    public string? TrangThaiDoiChieu { get; set; }
}

public class KhoanHoanItem
{
    public long MaHoanTien { get; set; }
    public string? MaYeuCau { get; set; }
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public long MaChiTietThanhToanGoc { get; set; }
    public string MucDichThuGoc { get; set; } = string.Empty;
    public string? LoaiHoan { get; set; }
    public string? LyDo { get; set; }
    public decimal SoTien { get; set; }
    public DateTime? ThoiDiemThanhCong { get; set; }
    public string? NguoiXuLy { get; set; }
}

// ───────────────────────────── 5. Cọc chưa tất toán (Số dư hiện tại) ─────────────────────────────

public class CocChuaTatToanBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();
    public decimal TongCocDaThu { get; set; }
    public decimal TongCocDaHoan { get; set; }
    public decimal TongCocDaBuPhuPhi { get; set; }
    public decimal TongCocChuaTatToan { get; set; }
    public int SoDonConGiuCoc { get; set; }
    public List<CocChuaTatToanDongItem> Items { get; set; } = new();
    public int Trang { get; set; }
    public int SoMoiTrang { get; set; }
    public int TongSo { get; set; }
}

public class CocChuaTatToanDongItem
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public string? TenKhachHang { get; set; }
    public string TrangThaiDon { get; set; } = string.Empty;
    public DateTime NgayDat { get; set; }
    public decimal CocDaThu { get; set; }
    public decimal CocDaHoan { get; set; }
    public decimal CocDaBuPhuPhi { get; set; }
    public decimal CocConGiu { get; set; }
    public string? TrangThaiDoiSoat { get; set; }
}

// ───────────────────────────── 6. Khoản cần xử lý / Ngoại lệ ─────────────────────────────

public class KhoanCanXuLyBaoCaoResponse
{
    public BaoCaoTaiChinhMeta Meta { get; set; } = new();

    // Thống kê tổng hợp
    public int SoKhoanThuCanDoiChieu { get; set; }
    public decimal TongTienThuCanDoiChieu { get; set; }

    public int SoKhoanThuChoPhanLoai { get; set; }
    public decimal TongTienThuChoPhanLoai { get; set; }

    public int SoKhoanHoanDangCho { get; set; }
    public decimal TongTienHoanDangCho { get; set; }

    public int SoDoiSoatDieuChinhDangXuLy { get; set; }
    public int SoDonHoanTatThieuDoiSoat { get; set; }

    // Chi tiết từng nhóm
    public List<ThuCanDoiChieuItem> ThuCanDoiChieuItems { get; set; } = new();
    public List<ThuChoPhanLoaiItem> ThuChoPhanLoaiItems { get; set; } = new();
    public List<HoanDangChoItem> HoanDangChoItems { get; set; } = new();
    public List<DoiSoatDieuChinhDangXuLyItem> DoiSoatDieuChinhDangXuLyItems { get; set; } = new();
    public List<DonHoanTatThieuDoiSoatItem> DonHoanTatThieuDoiSoatItems { get; set; } = new();
}

public class ThuCanDoiChieuItem
{
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public decimal TongSoTien { get; set; }
    public DateTime? ThoiDiemThanhCong { get; set; }
    public string? TrangThaiDoiChieu { get; set; }
    public string? GhiChu { get; set; }
}

public class ThuChoPhanLoaiItem
{
    public long MaThanhToan { get; set; }
    public string MaYeuCau { get; set; } = string.Empty;
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public decimal TongSoTien { get; set; }
    public decimal TienDaPhanLoai { get; set; }
    public decimal TienChoPhanLoai { get; set; }
    public DateTime? ThoiDiemThanhCong { get; set; }
}

public class HoanDangChoItem
{
    public long MaHoanTien { get; set; }
    public string? MaYeuCau { get; set; }
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public string MucDichThuGoc { get; set; } = string.Empty;
    public decimal SoTien { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public DateTime ThoiDiemYeuCau { get; set; }
    public string? LyDo { get; set; }
}

public class DoiSoatDieuChinhDangXuLyItem
{
    public long MaDoiSoatDieuChinh { get; set; }
    public long MaDoiSoatGoc { get; set; }
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime ThoiDiemLap { get; set; }
    public string TrangThai { get; set; } = string.Empty;
    public string? LyDoDieuChinh { get; set; }
}

public class DonHoanTatThieuDoiSoatItem
{
    public long MaDonThue { get; set; }
    public string MaDonHienThi { get; set; } = string.Empty;
    public DateTime? ThoiDiemHoanTat { get; set; }
    public decimal TienThueSauGiam { get; set; }
    public string GhiChu { get; set; } = "Đơn có trạng thái Hoàn Tất nhưng chưa có bảng đối soát gốc đã chốt hợp lệ.";
}

// ───────────────────────────── 7. Xuất CSV ─────────────────────────────

public static class LoaiBaoCaoTaiChinhXuat
{
    public const string DoanhThuHoanTat = "DoanhThuHoanTat";
    public const string PhiHuy = "PhiHuy";
    public const string DieuChinhDoanhThu = "DieuChinhDoanhThu";
    public const string ThuHoan = "ThuHoan";
    public const string CocChuaTatToan = "CocChuaTatToan";
    public const string CanXuLy = "CanXuLy";

    public static readonly IReadOnlyList<string> TatCa = new[]
    {
        DoanhThuHoanTat,
        PhiHuy,
        DieuChinhDoanhThu,
        ThuHoan,
        CocChuaTatToan,
        CanXuLy
    };
}

public class XuatCsvTaiChinhRequest
{
    public string LoaiBaoCao { get; set; } = string.Empty;
    public DateTime? TuNgay { get; set; }
    public DateTime? DenNgay { get; set; }
    public long? MaDon { get; set; }
}

public class TepCsvKetQua
{
    public string TenTep { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv; charset=utf-8";
    public byte[] NoiDung { get; set; } = Array.Empty<byte>();
}
