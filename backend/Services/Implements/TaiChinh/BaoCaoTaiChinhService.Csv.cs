using System.Globalization;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.TaiChinh;

namespace GearGo.Services.Implements.TaiChinh;

public partial class BaoCaoTaiChinhService
{
    public async Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvTaiChinhRequest request, long actorId)
    {
        var loiQuyen = await KiemTraQuyenQuanTriAsync<TepCsvKetQua>(actorId);
        if (loiQuyen != null) return loiQuyen;

        if (!LoaiBaoCaoTaiChinhXuat.TatCa.Contains(request.LoaiBaoCao))
            return Result<TepCsvKetQua>.Loi("LOAI_XUAT_KHONG_HO_TRO",
                $"Loại báo cáo '{request.LoaiBaoCao}' không được hỗ trợ. Các loại hợp lệ: {string.Join(", ", LoaiBaoCaoTaiChinhXuat.TatCa)}.");

        var filter = new LocTaiChinhRequest
        {
            TuNgay = request.TuNgay, DenNgay = request.DenNgay, MaDon = request.MaDon,
            Trang = 1, SoMoiTrang = SoDongXuatToiDa
        };

        var buildResult = request.LoaiBaoCao switch
        {
            LoaiBaoCaoTaiChinhXuat.DoanhThuHoanTat => await BuildCsvDoanhThuAsync(filter, actorId),
            LoaiBaoCaoTaiChinhXuat.PhiHuy => await BuildCsvPhiHuyAsync(filter, actorId),
            LoaiBaoCaoTaiChinhXuat.DieuChinhDoanhThu => await BuildCsvDieuChinhAsync(filter, actorId),
            LoaiBaoCaoTaiChinhXuat.ThuHoan => await BuildCsvThuHoanAsync(filter, actorId),
            LoaiBaoCaoTaiChinhXuat.CocChuaTatToan => await BuildCsvCocAsync(filter, actorId),
            LoaiBaoCaoTaiChinhXuat.CanXuLy => await BuildCsvCanXuLyAsync(filter, actorId),
            _ => Result<(List<string> TieuDe, List<List<object?>> Dong)>.Loi("LOAI_XUAT_KHONG_HO_TRO", "Loại không hỗ trợ.")
        };

        if (!buildResult.ThanhCong)
            return Result<TepCsvKetQua>.Loi(buildResult.MaLoi!, buildResult.ThongDiep!);

        var (tieuDe, dong) = buildResult.DuLieu;
        if (dong.Count > SoDongXuatToiDa)
            return Result<TepCsvKetQua>.Loi("VUOT_GIOI_HAN_XUAT",
                $"Báo cáo có {dong.Count} dòng, vượt giới hạn {SoDongXuatToiDa}. Vui lòng thu hẹp bộ lọc ngày hoặc mã đơn.");

        var ts = (_clock.GetUtcNow().UtcDateTime + BaoCaoCsvHelper.LechGioVn).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        return Result<TepCsvKetQua>.Ok(new TepCsvKetQua
        {
            TenTep = $"bao-cao-tai-chinh-{request.LoaiBaoCao}-{ts}.csv",
            NoiDung = BaoCaoCsvHelper.DungCsv(tieuDe, dong)
        });
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvDoanhThuAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayDoanhThuHoanTatAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var tieuDe = new List<string> { "Mã đơn", "Mã đơn hiển thị", "Thời điểm hoàn tất (VN)", "Tiền thuê trước giảm", "Tiền giảm", "Tiền thuê sau giảm", "Phụ phí đối soát ban đầu", "Tổng doanh thu", "Mã đối soát gốc", "Ngoại lệ thiếu đối soát" };
        var dong = res.DuLieu!.Items.Select(i => new List<object?> { i.MaDonThue, i.MaDonHienThi, BaoCaoCsvHelper.DinhDangGioVn(i.ThoiDiemHoanTat), i.TienThueTruocGiam, i.TienGiam, i.TienThueSauGiam, i.PhuPhiDoiSoatBanDau, i.TongDoanhThu, i.MaDoiSoatGoc, i.CoNgoaiLeThieuDoiSoat }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvPhiHuyAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayPhiHuyAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var tieuDe = new List<string> { "Mã đơn", "Mã đơn hiển thị", "Thời điểm hủy (VN)", "Lý do hủy", "Phí thuê giữ lại", "Tiền thuê trước giảm", "Tiền giảm", "Tiền cọc" };
        var dong = res.DuLieu!.Items.Select(i => new List<object?> { i.MaDonThue, i.MaDonHienThi, BaoCaoCsvHelper.DinhDangGioVn(i.ThoiDiemHuy), i.LyDoHuy, i.TienThueGiuLai, i.TienThueTruocGiam, i.TienGiam, i.TienCoc }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvDieuChinhAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayDieuChinhDoanhThuAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var tieuDe = new List<string> { "Mã đối soát điều chỉnh", "Mã đối soát gốc", "Mã đơn", "Mã đơn hiển thị", "Thời điểm chốt (VN)", "Lý do điều chỉnh", "Phụ phí gốc", "Phụ phí sau điều chỉnh", "Delta phụ phí", "Người chốt" };
        var dong = res.DuLieu!.Items.Select(i => new List<object?> { i.MaDoiSoatDieuChinh, i.MaDoiSoatGoc, i.MaDonThue, i.MaDonHienThi, BaoCaoCsvHelper.DinhDangGioVn(i.ThoiDiemChotDieuChinh), i.LyDoDieuChinh, i.PhuPhiGoc, i.PhuPhiSauDieuChinh, i.DeltaPhuPhi, i.TenNguoiChot }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvThuHoanAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayThuHoanAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var tieuDe = new List<string> { "Loại giao dịch", "Mã giao dịch", "Mã yêu cầu", "Mã đơn", "Mã đơn hiển thị", "Thời điểm thành công (VN)", "Số tiền", "Phân loại nguồn", "Trạng thái đối chiếu" };
        var dong = res.DuLieu!.GiaoDichThus.Select(t => new List<object?> { "Thu", t.MaThanhToan, t.MaYeuCau, t.MaDonThue, t.MaDonHienThi, BaoCaoCsvHelper.DinhDangGioVn(t.ThoiDiemThanhCong), t.TongSoTien, $"Thuê:{t.TienThue} Cọc:{t.TienCoc} BổSung:{t.ThuBoSung} Chờ:{t.ChoPhanLoai}", t.TrangThaiDoiChieu }).ToList();
        dong.AddRange(res.DuLieu!.KhoanHoans.Select(h => new List<object?> { "Hoàn", h.MaHoanTien, h.MaYeuCau, h.MaDonThue, h.MaDonHienThi, BaoCaoCsvHelper.DinhDangGioVn(h.ThoiDiemThanhCong), -h.SoTien, h.MucDichThuGoc, h.LoaiHoan }));
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvCocAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayCocChuaTatToanAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var tieuDe = new List<string> { "Mã đơn", "Mã đơn hiển thị", "Khách hàng", "Trạng thái đơn", "Ngày đặt (VN)", "Cọc đã thu", "Cọc đã hoàn", "Cọc đã bù phụ phí", "Cọc còn giữ", "Trạng thái đối soát" };
        var dong = res.DuLieu!.Items.Select(i => new List<object?> { i.MaDonThue, i.MaDonHienThi, i.TenKhachHang, i.TrangThaiDon, BaoCaoCsvHelper.DinhDangGioVn(i.NgayDat), i.CocDaThu, i.CocDaHoan, i.CocDaBuPhuPhi, i.CocConGiu, i.TrangThaiDoiSoat }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> BuildCsvCanXuLyAsync(LocTaiChinhRequest f, long actorId)
    {
        var res = await LayKhoanCanXuLyAsync(f, actorId);
        if (!res.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(res.MaLoi!, res.ThongDiep!);
        var d = res.DuLieu!;
        var tieuDe = new List<string> { "Nhóm khoản mục", "Mã ID", "Mã đơn hiển thị", "Số tiền", "Mô tả / Trạng thái" };
        var dong = new List<List<object?>>();
        dong.AddRange(d.ThuCanDoiChieuItems.Select(t => new List<object?> { "Thu cần đối chiếu", t.MaThanhToan, t.MaDonHienThi, t.TongSoTien, t.TrangThaiDoiChieu }));
        dong.AddRange(d.ThuChoPhanLoaiItems.Select(t => new List<object?> { "Thu chờ phân loại", t.MaThanhToan, t.MaDonHienThi, t.TienChoPhanLoai, "Chưa phân bổ đủ chi tiết" }));
        dong.AddRange(d.HoanDangChoItems.Select(h => new List<object?> { "Hoàn tiền đang chờ", h.MaHoanTien, h.MaDonHienThi, h.SoTien, h.TrangThai }));
        dong.AddRange(d.DoiSoatDieuChinhDangXuLyItems.Select(x => new List<object?> { "Đối soát điều chỉnh chờ chốt", x.MaDoiSoatDieuChinh, x.MaDonHienThi, 0, x.LyDoDieuChinh }));
        dong.AddRange(d.DonHoanTatThieuDoiSoatItems.Select(x => new List<object?> { "Đơn hoàn tất thiếu đối soát", x.MaDonThue, x.MaDonHienThi, x.TienThueSauGiam, x.GhiChu }));
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }
}
