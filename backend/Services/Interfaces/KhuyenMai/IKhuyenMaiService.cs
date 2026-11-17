using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GearGo.Models.DTOs.KhuyenMai;

namespace GearGo.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ kiểm tra áp mã, phân bổ tiền giảm và kiểm soát lượt khuyến mãi (W6-T3 - Kiện Minh)
/// </summary>
public interface IKhuyenMaiService
{
    /// <summary>
    /// Kiểm tra áp dụng mã cơ bản (tương thích Week 2)
    /// </summary>
    Task<KhuyenMaiHopLe> KiemTraApDungAsync(string maGiamGia, long maKhachHang, List<long> sanPhamIds, decimal tienThueTruocGiam);

    /// <summary>
    /// Kiểm tra áp dụng mã chi tiết theo danh sách dòng giỏ hàng (báo giá hiển thị, Read-only không giữ lượt)
    /// </summary>
    Task<KiemTraMaResult> KiemTraApDungChiTietAsync(string maGiamGia, long maKhachHang, List<DongBaoGiaItem> items);

    /// <summary>
    /// Thuật toán phân bổ số tiền giảm VND xuống từng dòng đơn thuê (bảo đảm không âm dòng, không giảm cọc, dồn dư ổn định)
    /// </summary>
    List<PhanBoDongResult> PhanBoGiamGia(List<DongBaoGiaItem> lines, decimal tongGiam);

    /// <summary>
    /// Giữ lượt khuyến mãi trong transaction tạo đơn (tương thích Week 2)
    /// </summary>
    Task GiuLuotAsync(long maKhuyenMai, long maDonThue, DateTime thoiDiemHetHan);

    /// <summary>
    /// Giữ lượt khuyến mãi mở rộng (với snapshot số tiền giảm và kiểm soát concurrency)
    /// </summary>
    Task<KetQuaLuotResponse> GiuLuotV2Async(GiuLuotCommand command);

    /// <summary>
    /// Xác nhận đã sử dụng mã khi thanh toán thành công (idempotent, chuyển DangGiu -> DaSuDung)
    /// </summary>
    Task XacNhanDaSuDungAsync(long maDonThue);

    /// <summary>
    /// Giải phóng lượt khuyến mãi (chỉ giải phóng khi hủy/hết hạn trước thanh toán)
    /// </summary>
    Task GiaiPhongLuotAsync(long maDonThue, string? lyDo = null);
}
