namespace GearGo.Models.Enums;

/// <summary>
/// Giá trị chuỗi lưu trong các cột trạng thái/mục đích tài chính (ERD dùng nvarchar, không phải enum).
/// Dùng chung giữa HoanTienService, HuyDonService, truy vấn đơn và module đối soát/thu tiền.
/// </summary>
public static class TrangThaiHoanTien
{
    /// <summary>Intent đã lưu bền vững, chưa gửi gateway. Đang giữ hạn mức nguồn.</summary>
    public const string ChoXuLy = "ChoXuLy";
    /// <summary>Đã gửi/gateway đã tiếp nhận, chờ kết quả. Đang giữ hạn mức nguồn.</summary>
    public const string DangXuLy = "DangXuLy";
    /// <summary>Mất phản hồi/timeout: chưa biết tiền đã đi hay chưa. Vẫn giữ hạn mức; phải đối chiếu cùng mã.</summary>
    public const string ChuaRoKetQua = "ChuaRoKetQua";
    public const string ThanhCong = "ThanhCong";
    /// <summary>Gateway xác nhận chắc chắn không hoàn. Giải phóng hạn mức; có thể lập lần thử mới.</summary>
    public const string ThatBai = "ThatBai";

    public static readonly string[] GiuHanMuc = { ChoXuLy, DangXuLy, ChuaRoKetQua };
    public static readonly string[] TatCa = { ChoXuLy, DangXuLy, ChuaRoKetQua, ThanhCong, ThatBai };
}

public static class LoaiHoanTien
{
    /// <summary>Hoàn phần cọc còn dư theo bảng đối soát (có ma_doi_soat).</summary>
    public const string HoanCocDoiSoat = "HoanCocDoiSoat";
    /// <summary>Hoàn phần tiền thuê còn lại khi hủy trước bàn giao.</summary>
    public const string HoanHuyTienThue = "HoanHuyTienThue";
    /// <summary>Hoàn cọc khi hủy trước bàn giao.</summary>
    public const string HoanHuyTienCoc = "HoanHuyTienCoc";
    /// <summary>Hoàn khoản thu trùng/thu thừa/tiền về sau hủy (W4-T8).</summary>
    public const string HoanThuThua = "HoanThuThua";

    public static readonly string[] TatCa = { HoanCocDoiSoat, HoanHuyTienThue, HoanHuyTienCoc, HoanThuThua };

    /// <summary>Mục đích chi tiết thu gốc được phép làm nguồn cho từng loại hoàn; null = mọi mục đích hợp lệ.</summary>
    public static string? MucDichNguonBatBuoc(string loaiHoan) => loaiHoan switch
    {
        HoanCocDoiSoat => MucDichThanhToan.TienCoc,
        HoanHuyTienCoc => MucDichThanhToan.TienCoc,
        HoanHuyTienThue => MucDichThanhToan.TienThue,
        _ => null
    };
}

public static class MucDichThanhToan
{
    public const string TienThue = "TienThue";
    public const string TienCoc = "TienCoc";
    public const string ThuBoSung = "ThuBoSung";

    public static readonly string[] TatCa = { TienThue, TienCoc, ThuBoSung };
}

public static class TrangThaiThanhToan
{
    public const string ThanhCong = "ThanhCong";
    public const string ThatBai = "ThatBai";
}

public static class LoaiHuyDon
{
    public const string KhachHuy = "KhachHuy";
    public const string CuaHangHuy = "CuaHangHuy";
    /// <summary>Quản trị viên kết luận khách không đến nhận; trạng thái đơn vẫn là KhachHuy.</summary>
    public const string KhongDenNhan = "KhongDenNhan";
}
