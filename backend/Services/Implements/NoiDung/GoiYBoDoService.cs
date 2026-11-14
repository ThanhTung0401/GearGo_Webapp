using GearGo.Models.DTOs.TuVan;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements.NoiDung;

public class GoiYBoDoService : IGoiYBoDoService
{
    public TuVanBoDoResponse GoiYTheoQuyTac(TuVanBoDoRequest request, List<AiCandidate> candidates, int thoiGianThueNgay)
    {
        var response = new TuVanBoDoResponse
        {
            NguonGoiY = "QuyTac",
            GioNhan = request.GioNhan,
            GioTra = request.GioTra,
            ThoiGianThueNgay = request.GioNhan.HasValue && request.GioTra.HasValue ? thoiGianThueNgay : null,
            ThoiDiemKiemTra = DateTime.UtcNow
        };

        var selectedItems = ChonBoDoCoBan(request, candidates, thoiGianThueNgay);
        if (selectedItems == null)
        {
            response.TrangThai = "KhongTimThayPhuongAn";
            response.ThongBaoPhanThieu = "Không tìm thấy lều cắm trại khả dụng trong hệ thống.";
            return response;
        }

        if (!DieuChinhTheoNganSach(request, selectedItems, thoiGianThueNgay, out decimal chiPhiToiThieu))
        {
            response.TrangThai = "KhongTimThayPhuongAn";
            response.ThongBaoPhanThieu = $"Ngân sách {request.NganSach:N0} đ không đủ cho bộ đồ cơ bản (cần tối thiểu {chiPhiToiThieu:N0} đ).";
            return response;
        }

        response.CacDong = selectedItems;
        if (request.GioNhan.HasValue && request.GioTra.HasValue)
        {
            response.TongTienThue = selectedItems.Sum(x => x.TienThue);
            response.TongTienCoc = selectedItems.Sum(x => x.TienCoc);
            response.TongBanDau = response.TongTienThue + response.TongTienCoc;
            response.TrangThai = "ThanhCong";
        }
        else
        {
            response.TongTienThue = null;
            response.TongTienCoc = selectedItems.Sum(x => x.MucCocMoiThietBi * x.SoLuong);
            response.TongBanDau = null;
            response.TrangThai = "CanBoSungThongTin";
            response.ThongBaoPhanThieu = "Vui lòng chọn thời gian nhận và trả đồ để xác định số ngày thuê và tình trạng còn hàng chính xác.";
        }
        return response;
    }

    private static List<DongGoiYResponse>? ChonBoDoCoBan(TuVanBoDoRequest request, List<AiCandidate> candidates, int thoiGianThueNgay)
    {
        int soNguoi = request.SoNguoi;
        var leuCandidates = candidates
            .Where(c => (c.TenDanhMuc.Contains("Lều", StringComparison.OrdinalIgnoreCase) ||
                         c.TenSanPham.Contains("Lều", StringComparison.OrdinalIgnoreCase)) &&
                        c.SucChua.HasValue && c.SucChua.Value > 0)
            .OrderBy(c => c.SucChua!.Value)
            .ToList();
        if (!leuCandidates.Any()) return null;

        var selectedItems = new List<DongGoiYResponse>();
        var leuChinh = leuCandidates.FirstOrDefault(l => l.SucChua!.Value >= soNguoi);
        if (leuChinh != null)
            selectedItems.Add(TaoDong(leuChinh, 1, thoiGianThueNgay, $"Lều {leuChinh.SucChua} người đảm bảo đủ chỗ cho {soNguoi} người"));
        else
        {
            var leuLonNhat = leuCandidates.Last();
            int soLuongLeu = (int)Math.Ceiling((double)soNguoi / leuLonNhat.SucChua!.Value);
            selectedItems.Add(TaoDong(leuLonNhat, soLuongLeu, thoiGianThueNgay, $"{soLuongLeu} lều {leuLonNhat.SucChua} người đảm bảo đủ chỗ cho {soNguoi} người"));
        }

        ThemPhuKien(request, candidates, selectedItems, "Ghế", soNguoi, thoiGianThueNgay, qty => $"{qty} ghế xếp ngồi thư giãn và sinh hoạt");
        ThemPhuKien(request, candidates, selectedItems, "Bàn", (int)Math.Ceiling((double)soNguoi / 6), thoiGianThueNgay, _ => "Bàn gấp gọn sinh hoạt chung");
        ThemPhuKien(request, candidates, selectedItems, "Đèn", 1, thoiGianThueNgay, _ => "Đèn lều chiếu sáng ban đêm", capTheoKhaDung: false);
        return selectedItems;
    }

    private static void ThemPhuKien(
        TuVanBoDoRequest request, List<AiCandidate> candidates, List<DongGoiYResponse> selected,
        string tuKhoa, int soLuongDeXuat, int soNgay, Func<int, string> taoLyDo, bool capTheoKhaDung = true)
    {
        var mon = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains(tuKhoa, StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains(tuKhoa, StringComparison.OrdinalIgnoreCase));
        if (mon == null) return;

        int soLuong = soLuongDeXuat;
        if (capTheoKhaDung && request.GioNhan.HasValue && request.GioTra.HasValue && mon.SoLuongKhaDung > 0 && mon.SoLuongKhaDung < soLuong)
            soLuong = mon.SoLuongKhaDung;
        if (soLuong > 0)
            selected.Add(TaoDong(mon, soLuong, soNgay, taoLyDo(soLuong)));
    }

    private static bool DieuChinhTheoNganSach(
        TuVanBoDoRequest request, List<DongGoiYResponse> selectedItems, int thoiGianThueNgay, out decimal chiPhi)
    {
        chiPhi = 0;
        if (request.NganSach is not > 0) return true;

        bool isTongBanDau = string.Equals(request.LoaiNganSach, "TongBanDau", StringComparison.OrdinalIgnoreCase);
        int ngayTinh = request.GioNhan.HasValue && request.GioTra.HasValue ? Math.Max(1, thoiGianThueNgay) : 1;

        decimal TinhChiPhi(List<DongGoiYResponse> list) => isTongBanDau
            ? list.Sum(x => x.DonGiaThueMoiNgay * x.SoLuong * ngayTinh + x.MucCocMoiThietBi * x.SoLuong)
            : list.Sum(x => x.DonGiaThueMoiNgay * x.SoLuong * ngayTinh);

        while (selectedItems.Count > 1 && TinhChiPhi(selectedItems) > request.NganSach.Value)
            selectedItems.RemoveAt(selectedItems.Count - 1);

        chiPhi = TinhChiPhi(selectedItems);
        return chiPhi <= request.NganSach.Value;
    }

    private static DongGoiYResponse TaoDong(AiCandidate c, int soLuong, int soNgay, string lyDo) => new()
    {
        MaSanPham = c.MaSanPham, MaSanPhamHienThi = c.MaSanPhamHienThi, TenSanPham = c.TenSanPham,
        SoLuong = soLuong, SucChua = c.SucChua, DonGiaThueMoiNgay = c.GiaThueMoiNgay,
        MucCocMoiThietBi = c.MucCocMoiThietBi,
        TienThue = c.GiaThueMoiNgay * soLuong * Math.Max(1, soNgay),
        TienCoc = c.MucCocMoiThietBi * soLuong,
        SoLuongKhaDung = c.SoLuongKhaDung, LyDo = lyDo
    };
}
