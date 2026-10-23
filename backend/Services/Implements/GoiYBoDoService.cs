using GearGo.Models.DTOs.TuVan;
using GearGo.Services.Interfaces;

namespace GearGo.Services.Implements;

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

        var soNguoi = request.SoNguoi;
        var selectedItems = new List<DongGoiYResponse>();

        // 1. Tìm lều đủ sức chứa
        var leuCandidates = candidates
            .Where(c => (c.TenDanhMuc.Contains("Lều", StringComparison.OrdinalIgnoreCase) ||
                         c.TenSanPham.Contains("Lều", StringComparison.OrdinalIgnoreCase)) &&
                        c.SucChua.HasValue && c.SucChua.Value > 0)
            .OrderBy(c => c.SucChua!.Value)
            .ToList();

        if (!leuCandidates.Any())
        {
            response.TrangThai = "KhongTimThayPhuongAn";
            response.ThongBaoPhanThieu = "Không tìm thấy lều cắm trại khả dụng trong hệ thống.";
            return response;
        }

        // Chọn lều đơn hoặc kết hợp để đạt đủ sức chứa
        var leuChinh = leuCandidates.FirstOrDefault(l => l.SucChua!.Value >= soNguoi);
        if (leuChinh != null)
        {
            selectedItems.Add(TaoDong(leuChinh, 1, thoiGianThueNgay, $"Lều {leuChinh.SucChua} người đảm bảo đủ chỗ cho {soNguoi} người"));
        }
        else
        {
            // Kết hợp nhiều lều lớn nhất
            var leuLonNhat = leuCandidates.Last();
            var soLuongLeu = (int)Math.Ceiling((double)soNguoi / leuLonNhat.SucChua!.Value);
            selectedItems.Add(TaoDong(leuLonNhat, soLuongLeu, thoiGianThueNgay, $"{soLuongLeu} lều {leuLonNhat.SucChua} người đảm bảo đủ chỗ cho {soNguoi} người"));
        }

        // 2. Ghế dã ngoại (mỗi người 1 ghế nếu còn khả dụng)
        var ghe = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Ghế", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Ghế", StringComparison.OrdinalIgnoreCase));
        if (ghe != null)
        {
            var soLuongGhe = soNguoi;
            if (request.GioNhan.HasValue && request.GioTra.HasValue && ghe.SoLuongKhaDung > 0 && ghe.SoLuongKhaDung < soLuongGhe)
            {
                soLuongGhe = ghe.SoLuongKhaDung;
            }
            if (soLuongGhe > 0)
            {
                selectedItems.Add(TaoDong(ghe, soLuongGhe, thoiGianThueNgay, $"{soLuongGhe} ghế xếp ngồi thư giãn và sinh hoạt"));
            }
        }

        // 3. Bàn dã ngoại (cứ 4-6 người 1 bàn)
        var ban = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Bàn", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Bàn", StringComparison.OrdinalIgnoreCase));
        if (ban != null)
        {
            var soLuongBan = (int)Math.Ceiling((double)soNguoi / 6);
            if (request.GioNhan.HasValue && request.GioTra.HasValue && ban.SoLuongKhaDung > 0 && ban.SoLuongKhaDung < soLuongBan)
            {
                soLuongBan = ban.SoLuongKhaDung;
            }
            if (soLuongBan > 0)
            {
                selectedItems.Add(TaoDong(ban, soLuongBan, thoiGianThueNgay, "Bàn gấp gọn sinh hoạt chung"));
            }
        }

        // 4. Đèn dã ngoại
        var den = candidates.FirstOrDefault(c => c.TenDanhMuc.Contains("Đèn", StringComparison.OrdinalIgnoreCase) ||
                                                 c.TenSanPham.Contains("Đèn", StringComparison.OrdinalIgnoreCase));
        if (den != null)
        {
            selectedItems.Add(TaoDong(den, 1, thoiGianThueNgay, "Đèn lều chiếu sáng ban đêm"));
        }

        // 5. Kiểm tra ngân sách
        var isTongBanDau = string.Equals(request.LoaiNganSach, "TongBanDau", StringComparison.OrdinalIgnoreCase);
        var ngayTinh = request.GioNhan.HasValue && request.GioTra.HasValue ? Math.Max(1, thoiGianThueNgay) : 1;

        if (request.NganSach.HasValue && request.NganSach.Value > 0)
        {
            // Nếu vượt ngân sách, thử loại bỏ các món phụ kiện không thiết yếu (giữ lều)
            decimal TinhChiPhi(List<DongGoiYResponse> list) =>
                isTongBanDau
                    ? list.Sum(x => x.DonGiaThueMoiNgay * x.SoLuong * ngayTinh + x.MucCocMoiThietBi * x.SoLuong)
                    : list.Sum(x => x.DonGiaThueMoiNgay * x.SoLuong * ngayTinh);

            while (selectedItems.Count > 1 && TinhChiPhi(selectedItems) > request.NganSach.Value)
            {
                // Bỏ món cuối cùng (phụ kiện ít quan trọng nhất)
                selectedItems.RemoveAt(selectedItems.Count - 1);
            }

            if (TinhChiPhi(selectedItems) > request.NganSach.Value)
            {
                response.TrangThai = "KhongTimThayPhuongAn";
                response.ThongBaoPhanThieu = $"Ngân sách {request.NganSach:N0} đ không đủ cho bộ đồ cơ bản (cần tối thiểu {TinhChiPhi(selectedItems):N0} đ).";
                return response;
            }
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
            // Chưa có ngày thuê -> giá tham khảo theo 1 ngày, không chốt tổng
            response.TongTienThue = null;
            response.TongTienCoc = selectedItems.Sum(x => x.MucCocMoiThietBi * x.SoLuong);
            response.TongBanDau = null;
            response.TrangThai = "CanBoSungThongTin";
            response.ThongBaoPhanThieu = "Vui lòng chọn thời gian nhận và trả đồ để xác định số ngày thuê và tình trạng còn hàng chính xác.";
        }

        return response;
    }

    private static DongGoiYResponse TaoDong(AiCandidate c, int soLuong, int soNgay, string lyDo)
    {
        var ngay = Math.Max(1, soNgay);
        return new DongGoiYResponse
        {
            MaSanPham = c.MaSanPham,
            MaSanPhamHienThi = c.MaSanPhamHienThi,
            TenSanPham = c.TenSanPham,
            SoLuong = soLuong,
            SucChua = c.SucChua,
            DonGiaThueMoiNgay = c.GiaThueMoiNgay,
            MucCocMoiThietBi = c.MucCocMoiThietBi,
            TienThue = c.GiaThueMoiNgay * soLuong * ngay,
            TienCoc = c.MucCocMoiThietBi * soLuong,
            SoLuongKhaDung = c.SoLuongKhaDung,
            LyDo = lyDo
        };
    }
}
