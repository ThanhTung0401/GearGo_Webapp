using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.BaoCao.Kho;

namespace GearGo.Services.Implements.Kho;

public partial class BaoCaoKhoService
{
    public async Task<Result<TepCsvKetQua>> XuatCsvAsync(XuatCsvKhoRequest request, long actorId)
    {
        // [REP-02]: chỉ yêu cầu QuanTriVien đối với báo cáo có cột giá vốn.
        // HienTrangKho và BaoTri KHÔNG chứa giá nhập → cho phép Staff xuất.
        var canAdmin = request.LoaiBaoCao == LoaiBaoCaoKhoXuat.NhapHang
            || request.LoaiBaoCao == LoaiBaoCaoKhoXuat.DieuChinhNhap
            || request.LoaiBaoCao == LoaiBaoCaoKhoXuat.LichSuDonGia;
        var chan = await ChanQuyenAsync<TepCsvKetQua>(actorId, canAdmin: canAdmin);
        if (chan != null) return chan;

        if (!LoaiBaoCaoKhoXuat.TatCa.Contains(request.LoaiBaoCao))
        {
            return Result<TepCsvKetQua>.Loi(
                DomainConstants.Errors.UnsupportedExportType,
                $"Loại báo cáo '{request.LoaiBaoCao}' không được hỗ trợ xuất. Cho phép: {string.Join(", ", LoaiBaoCaoKhoXuat.TatCa)}.");
        }

        var bang = await DungBangCsvTheoLoaiAsync(request, actorId);
        if (!bang.ThanhCong) return Result<TepCsvKetQua>.Loi(bang.MaLoi!, bang.ThongDiep!);

        var (tieuDe, dong) = bang.DuLieu!;
        if (dong.Count > SoDongXuatToiDa)
        {
            return Result<TepCsvKetQua>.Loi(
                DomainConstants.Errors.ExportRangeTooLarge,
                $"Báo cáo có {dong.Count} dòng, vượt giới hạn {SoDongXuatToiDa}. Hãy thu hẹp bộ lọc; hệ thống không tự cắt file.");
        }

        return Result<TepCsvKetQua>.Ok(new TepCsvKetQua
        {
            TenTep = $"bao-cao-kho-{request.LoaiBaoCao}-{(_clock.GetUtcNow().UtcDateTime + BaoCaoCsvHelper.LechGioVn):yyyyMMddHHmmss}.csv",
            NoiDung = BaoCaoCsvHelper.DungCsv(tieuDe, dong)
        });
    }

    private async Task<Result<(List<string> TieuDe, List<List<object?>> Dong)>> DungBangCsvTheoLoaiAsync(
        XuatCsvKhoRequest request, long actorId)
    {
        var locNhap = new LocNhapHangRequest
        {
            TuNgay = request.TuNgay, DenNgay = request.DenNgay,
            MaNhaCungCap = request.MaNhaCungCap, MaSanPhamNguon = request.MaSanPhamNguon, CheDo = request.CheDo
        };

        return request.LoaiBaoCao switch
        {
            LoaiBaoCaoKhoXuat.NhapHang => await DungCsvNhapHangAsync(request, locNhap),
            LoaiBaoCaoKhoXuat.DieuChinhNhap => await DungCsvDieuChinhNhapAsync(request, locNhap),
            LoaiBaoCaoKhoXuat.LichSuDonGia => await DungCsvLichSuDonGiaAsync(request, locNhap),
            LoaiBaoCaoKhoXuat.HienTrangKho => await DungCsvHienTrangKhoAsync(request, actorId),
            _ => await DungCsvBaoTriAsync(request)
        };
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> DungCsvNhapHangAsync(
        XuatCsvKhoRequest request, LocNhapHangRequest locNhap)
    {
        var kh = TinhKhoang(request.TuNgay, request.DenNgay);
        if (kh.Loi != null) return Result<(List<string>, List<List<object?>>)>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
        var du = await TaiDuLieuNhapAsync(locNhap, kh.Khoang!);
        var tieuDe = new List<string>
        {
            "Mã phiếu nhập", "Số chứng từ NCC", "Nhà cung cấp lúc nhập", "Ngày nhập thực tế (giờ VN)",
            "Mã sản phẩm nguồn", "Tên sản phẩm lúc nhập", "Số lượng gốc", "Đơn giá gốc (VND)",
            "Giá trị gốc (VND)", "Delta số lượng", "Delta giá trị (VND)", "Số lượng hiệu lực", "Giá trị hiệu lực (VND)"
        };
        var dong = du.Phieu.SelectMany(p => p.Dong.Select(d => new List<object?>
        {
            p.MaPhieuHienThi, p.SoChungTuNhaCungCap, p.NhaCungCapLucNhap ?? p.TenNhaCungCapHienTai,
            BaoCaoCsvHelper.DinhDangGioVn(p.NgayNhapThucTe), d.MaSanPhamNguon, d.TenSanPhamLucNhap,
            d.SoLuongGoc, d.DonGiaGoc, d.GiaTriGoc, d.DeltaSoLuong, d.DeltaGiaTri, d.SoLuongHieuLuc, d.GiaTriHieuLuc
        })).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> DungCsvDieuChinhNhapAsync(
        XuatCsvKhoRequest request, LocNhapHangRequest locNhap)
    {
        var kh = TinhKhoang(request.TuNgay, request.DenNgay);
        if (kh.Loi != null) return Result<(List<string>, List<List<object?>>)>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
        var items = await TaiDieuChinhNhapAsync(locNhap, kh.Khoang!);
        var tieuDe = new List<string>
        {
            "Mã phiếu điều chỉnh", "Mã phiếu nhập", "Loại điều chỉnh", "Lý do", "Thời điểm áp dụng (giờ VN)",
            "Người duyệt", "Delta số lượng", "Delta giá trị (VND)", "Phiếu nhập ngoài kỳ"
        };
        var dong = items.Select(i => new List<object?>
        {
            i.MaPhieuDieuChinh, i.MaPhieuNhapHienThi, i.LoaiDieuChinh, i.LyDo, BaoCaoCsvHelper.DinhDangGioVn(i.ThoiDiemApDung),
            i.NguoiDuyet, i.DeltaSoLuong, i.DeltaGiaTri, i.PhieuNhapNgoaiKy ? "Có" : "Không"
        }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> DungCsvLichSuDonGiaAsync(
        XuatCsvKhoRequest request, LocNhapHangRequest locNhap)
    {
        var kh = TinhKhoang(request.TuNgay, request.DenNgay);
        if (kh.Loi != null) return Result<(List<string>, List<List<object?>>)>.Loi(DomainConstants.Errors.ExportRangeTooLarge, kh.Loi);
        var ls = await DungLichSuDonGiaAsync(locNhap, kh.Khoang!);
        var tieuDe = new List<string>
        {
            "Mã sản phẩm nguồn", "Tên sản phẩm", "Thời điểm (giờ VN)", "Loại mốc", "Mã chứng từ", "Phiếu nhập nguồn",
            "Số lượng", "Đơn giá (VND)", "Delta số lượng", "Delta giá trị (VND)", "Đơn giá bình quân gốc (VND)",
            "Đơn giá bình quân hiệu lực (VND)"
        };
        var dong = ls.SanPham.SelectMany(sp => sp.Moc.Select(m => new List<object?>
        {
            sp.MaSanPhamNguon, sp.TenSanPham, BaoCaoCsvHelper.DinhDangGioVn(m.ThoiDiem), m.Loai, m.MaChungTu,
            m.NguonNhapHienThi, m.SoLuong, m.DonGia, m.DeltaSoLuong, m.DeltaGiaTri,
            sp.DonGiaBinhQuanGoc, sp.DonGiaBinhQuanHieuLuc
        })).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> DungCsvHienTrangKhoAsync(
        XuatCsvKhoRequest request, long actorId)
    {
        var r = await LayHienTrangKhoAsync(new LocHienTrangKhoRequest { MaSanPham = request.MaSanPham }, actorId);
        if (!r.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(r.MaLoi!, r.ThongDiep!);
        var tieuDe = new List<string>
        {
            "Mã sản phẩm hiện tại", "Tên sản phẩm", "Tổng hồ sơ", "Đang khai thác", "Sẵn sàng", "Đang thuê",
            "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"
        };
        var dong = r.DuLieu!.SanPham.Select(s => new List<object?>
        {
            s.MaSanPhamHienTai, s.TenSanPham, s.TongHoSo, s.DangKhaiThac, s.SanSang, s.DangThue,
            s.DangBaoTri, s.ThatLac, s.NgungSuDung
        }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }

    private async Task<Result<(List<string>, List<List<object?>>)>> DungCsvBaoTriAsync(XuatCsvKhoRequest request)
    {
        var r = await DungThongKeBaoTriAsync(
            new LocBaoTriRequest
            {
                TuNgay = request.TuNgay, DenNgay = request.DenNgay,
                MocLoc = request.MocLoc, LoaiXuLy = request.LoaiXuLy
            },
            laAdmin: true, topHayHong: int.MaxValue);
        if (!r.ThanhCong) return Result<(List<string>, List<List<object?>>)>.Loi(r.MaLoi!, r.ThongDiep!);
        var tieuDe = new List<string>
        {
            "Mã thiết bị", "Mã sản phẩm hiện tại", "Tên sản phẩm hiện tại", "Số đợt sửa chữa", "Số lần thuê",
            "Tổng giờ xử lý", "Tổng chi phí sửa (VND)"
        };
        var dong = r.DuLieu!.ThietBiHayHong.Select(t => new List<object?>
        {
            t.MaThietBiHienThi, t.MaSanPhamHienTai, t.TenSanPhamHienTai, t.SoDotSuaChua, t.SoLanThue,
            t.TongGioXuLy, t.TongChiPhiSua
        }).ToList();
        return Result<(List<string>, List<List<object?>>)>.Ok((tieuDe, dong));
    }
}
