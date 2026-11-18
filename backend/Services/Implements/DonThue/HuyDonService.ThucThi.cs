using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.DTOs.HoanTien;
using GearGo.Models.DTOs.HuyDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class HuyDonService
{
    private sealed record ThuDaPhanLoai(decimal TienThue, decimal TienCoc, List<long> NguonThue, List<long> NguonCoc, decimal ChuaPhanLoai);

    /// <summary>
    /// Hủy đơn nguyên tử trong transaction: khóa đơn, tính lại chi phí hủy, giải phóng tài nguyên và lập yêu cầu hoàn.
    /// </summary>
    private async Task<HuyDonResponse> HuyAsync(
        long maDonThue, string loaiHuy, string lyDoNhap, bool xacNhan, string? dauVanTay,
        TaiKhoan actor, object? bangChung, CancellationToken ct)
    {
        var lyDo = KiemTraLyDo(lyDoNhap);
        var trangThaiDich = loaiHuy == LoaiHuyDon.CuaHangHuy ? TrangThaiDonThue.CuaHangHuy : TrangThaiDonThue.KhachHuy;
        var maNhanVien = await ActorGuard.LayMaNhanVienAsync(_context, actor.MaTaiKhoan, ct);
        var laNoiBo = actor.VaiTro != "KhachHang";
        var yeuCauHoan = new List<HoanTien>();

        await using (var tx = await _context.Database.BeginTransactionAsync(ct))
        {
            await KhoaDonAsync(maDonThue, ct);
            var don = await _context.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.GiuCho)
                .FirstAsync(d => d.MaDonThue == maDonThue, ct);
            await _context.Entry(don).ReloadAsync(ct);

            if (DaKetThucHuy.Contains(don.TrangThai))
            {
                if (don.TrangThai == trangThaiDich && don.MaNguoiHuy == actor.MaTaiKhoan)
                {
                    await tx.CommitAsync(ct);
                    return await TaoKetQuaAsync(maDonThue, loaiHuy, actor.MaTaiKhoan, laNoiBo, ct);
                }
                throw new DonDaHuyKhacYDinhException("Đơn đã kết thúc bởi một quyết định khác; không ghi đè lý do/phí.",
                    new { trangThai = don.TrangThai.ToString(), don.ThoiDiemHuy });
            }
            KiemTraConTruocBanGiao(don);
            if (await _context.PhieuBanGiaos.AnyAsync(p => p.MaDonThue == maDonThue && p.TrangThai == BanGiaoDaGiao, ct))
                throw new DonDaBanGiaoException();

            var thu = await DocThuAsync(maDonThue, ct);
            if (thu.ChuaPhanLoai != 0)
                throw new NguonHoanKhongHopLeException("Đơn có khoản thu thành công chưa phân loại tiền thuê/cọc; cần đối chiếu thanh toán trước khi hủy.",
                    new { chuaPhanLoai = thu.ChuaPhanLoai });

            var now = Now;
            var cs = await DocChinhSachAsync(don.MaChinhSach, ct);
            var bang = BangTinhHuy.Tinh(TaoDauVao(don, loaiHuy, now, thu, cs));
            KiemTraDauVanTayChiPhiHuy(don, loaiHuy, now, thu, cs, bang, xacNhan, dauVanTay);

            var truoc = don.TrangThai;
            don.TrangThai = trangThaiDich;
            don.MaNguoiHuy = actor.MaTaiKhoan;
            don.ThoiDiemHuy = now;
            don.LyDoHuy = lyDo;
            don.TienThueGiuLaiKhiHuy = bang.TienThueGiuLai;

            await GiaiPhongTaiNguyenKhiHuyAsync(don, loaiHuy, lyDo, actor.MaTaiKhoan, now, ct);
            await TaoYeuCauHoanKhiHuyAsync(don, loaiHuy, bang, thu, actor.MaTaiKhoan, yeuCauHoan, ct);
            await GhiNhatKyVaThongBaoHuyAsync(don, truoc, trangThaiDich, loaiHuy, lyDo, bang, bangChung, actor.MaTaiKhoan, ct);
            await tx.CommitAsync(ct);
        }

        await _hoanTien.GuiYeuCauDaLapAsync(yeuCauHoan.Select(h => h.MaHoanTien), maNhanVien, ct);
        return await TaoKetQuaAsync(maDonThue, loaiHuy, actor.MaTaiKhoan, laNoiBo, ct);
    }

    private static void KiemTraDauVanTayChiPhiHuy(
        Models.Entities.DonThue don, string loaiHuy, DateTime now, ThuDaPhanLoai thu,
        ChinhSachHuy cs, BangHuy bang, bool xacNhan, string? dauVanTay)
    {
        if (!bang.CoTien) return;
        if (!xacNhan || string.IsNullOrWhiteSpace(dauVanTay))
            throw new ChiPhiHuyDaThayDoiException("Cần xác nhận bảng chi phí hủy trước khi hủy.", TaoXemTruoc(don, loaiHuy, now, thu, cs, bang));
        if (!string.Equals(dauVanTay, bang.DauVanTay, StringComparison.OrdinalIgnoreCase))
            throw new ChiPhiHuyDaThayDoiException("Chi phí hủy đã thay đổi so với bảng đã xem; vui lòng xác nhận bảng mới.", TaoXemTruoc(don, loaiHuy, now, thu, cs, bang));
    }

    private async Task GiaiPhongTaiNguyenKhiHuyAsync(
        Models.Entities.DonThue don, string loaiHuy, string lyDo, long maTaiKhoan, DateTime now, CancellationToken ct)
    {
        foreach (var gc in don.ChiTietDonThues.Select(c => c.GiuCho).OfType<GiuCho>())
            if (gc.TrangThai is TrangThaiGiuCho.DangGiu or TrangThaiGiuCho.DaXacNhan)
            {
                gc.TrangThai = TrangThaiGiuCho.DaGiaiPhong;
                gc.ThoiDiemGiaiPhong = now;
            }

        var giaiPhong = await _chuanBiDon.GiaiPhongPhanCongKhiHuyDonAsync(don.MaDonThue, maTaiKhoan, $"Hủy đơn ({loaiHuy}): {lyDo}", ct);
        if (!giaiPhong.ThanhCong)
            throw new TrangThaiKhongHopLeException(giaiPhong.ThongDiep ?? "Không giải phóng được phân công thiết bị.", giaiPhong.ChiTiet);

        var nhapBanGiao = await _context.PhieuBanGiaos
            .Where(p => p.MaDonThue == don.MaDonThue && p.TrangThai != BanGiaoDaGiao && p.TrangThai != BanGiaoDaHuy).ToListAsync(ct);
        foreach (var p in nhapBanGiao)
        {
            p.TrangThai = BanGiaoDaHuy;
            p.GhiChu = string.IsNullOrWhiteSpace(p.GhiChu) ? $"Vô hiệu do hủy đơn lúc {now:u}" : $"{p.GhiChu}\nVô hiệu do hủy đơn lúc {now:u}";
        }

        var luot = await _context.LuotSuDungKhuyenMais.FirstOrDefaultAsync(l => l.MaDonThue == don.MaDonThue, ct);
        if (luot is { TrangThai: LuotDangGiu })
        {
            luot.TrangThai = LuotDaGiaiPhong;
            luot.ThoiDiemGiaiPhong = now;
        }
    }

    private async Task TaoYeuCauHoanKhiHuyAsync(
        Models.Entities.DonThue don, string loaiHuy, BangHuy bang, ThuDaPhanLoai thu,
        long maTaiKhoan, List<HoanTien> yeuCauHoan, CancellationToken ct)
    {
        var lyDoHoan = $"Hoàn do hủy đơn {don.MaDonHienThi} ({loaiHuy})";
        if (bang.TienThueHoan > 0)
            yeuCauHoan.AddRange(await _hoanTien.LapYeuCauHoanAsync(new LapHoanCommand(
                don.MaDonThue, LoaiHoanTien.HoanHuyTienThue, $"HUY:{don.MaDonThue}:THUE",
                bang.TienThueHoan, thu.NguonThue, null, lyDoHoan), maTaiKhoan, ct));
        if (bang.TienCocHoan > 0)
            yeuCauHoan.AddRange(await _hoanTien.LapYeuCauHoanAsync(new LapHoanCommand(
                don.MaDonThue, LoaiHoanTien.HoanHuyTienCoc, $"HUY:{don.MaDonThue}:COC",
                bang.TienCocHoan, thu.NguonCoc, null, lyDoHoan), maTaiKhoan, ct));
    }

    private async Task GhiNhatKyVaThongBaoHuyAsync(
        Models.Entities.DonThue don, TrangThaiDonThue truoc, TrangThaiDonThue trangThaiDich,
        string loaiHuy, string lyDo, BangHuy bang, object? bangChung, long maTaiKhoan, CancellationToken ct)
    {
        var ls = _lichSu.GhiChuyenTrangThaiDon(new GhiLichSuDonCommand(don.MaDonThue, truoc.ToString(), trangThaiDich.ToString(), maTaiKhoan, lyDo));
        _lichSu.GhiNhatKyThaoTac(new GhiNhatKyCommand(maTaiKhoan, "HUY_DON", "DON_THUE", don.MaDonThue.ToString(),
            new { TrangThai = truoc.ToString() },
            new { TrangThai = trangThaiDich.ToString(), loaiHuy, bang.Nhanh, bang.TyLe, bang.TienThueGiuLai, bang.TienThueHoan, bang.TienCocHoan, bangChung },
            lyDo));
        await _context.SaveChangesAsync(ct);

        await _thongBao.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(don.MaDonThue, LoaiSuKienThongBao.HuyDon,
            MaSuKienThongBao.HuyDon(don.MaDonThue, ls.MaLichSuDon),
            trangThaiDich == TrangThaiDonThue.CuaHangHuy ? "Cửa hàng đã hủy đơn" : "Đơn thuê đã được hủy",
            bang.TongHoan > 0
                ? $"Đơn {don.MaDonHienThi} đã hủy. Tiền thuê giữ lại {CalculationHelpers.HienThiVnd(bang.TienThueGiuLai)}; khoản hoàn {CalculationHelpers.HienThiVnd(bang.TongHoan)} đang được xử lý."
                : $"Đơn {don.MaDonHienThi} đã hủy. Không phát sinh khoản hoàn."));
        await _context.SaveChangesAsync(ct);
    }

    private async Task<ThuDaPhanLoai> DocThuAsync(long maDonThue, CancellationToken ct)
    {
        var tongThu = (await _context.ThanhToans.AsNoTracking()
            .Where(t => t.MaDonThue == maDonThue && t.TrangThai == TrangThaiThanhToan.ThanhCong)
            .Select(t => t.TongSoTien).ToListAsync(ct)).Sum();
        var chiTiet = await _context.ChiTietThanhToans.AsNoTracking()
            .Where(c => c.ThanhToan.MaDonThue == maDonThue && c.ThanhToan.TrangThai == TrangThaiThanhToan.ThanhCong)
            .Select(c => new { c.MaChiTietThanhToan, c.MucDich, c.SoTien }).ToListAsync(ct);
        var ids = chiTiet.Select(c => c.MaChiTietThanhToan).ToList();
        var daDung = (await _context.HoanTiens.AsNoTracking()
                .Where(h => ids.Contains(h.MaChiTietThanhToanGoc) && h.TrangThai != TrangThaiHoanTien.ThatBai)
                .Select(h => new { h.MaChiTietThanhToanGoc, h.SoTien }).ToListAsync(ct))
            .GroupBy(h => h.MaChiTietThanhToanGoc).ToDictionary(g => g.Key, g => g.Sum(h => h.SoTien));
        decimal Rong(long id, decimal soTien) => soTien - daDung.GetValueOrDefault(id);

        var thue = chiTiet.Where(c => c.MucDich == MucDichThanhToan.TienThue).ToList();
        var coc = chiTiet.Where(c => c.MucDich == MucDichThanhToan.TienCoc).ToList();
        return new ThuDaPhanLoai(thue.Sum(c => Rong(c.MaChiTietThanhToan, c.SoTien)), coc.Sum(c => Rong(c.MaChiTietThanhToan, c.SoTien)),
            thue.Select(c => c.MaChiTietThanhToan).ToList(), coc.Select(c => c.MaChiTietThanhToan).ToList(),
            tongThu - chiTiet.Sum(c => c.SoTien));
    }

    private async Task<ChinhSachHuy> DocChinhSachAsync(long maChinhSach, CancellationToken ct)
    {
        var noiDung = await _context.ChinhSachs.AsNoTracking().Where(c => c.MaChinhSach == maChinhSach)
            .Select(c => c.NoiDungChinhSach).FirstOrDefaultAsync(ct);
        return ChinhSachHuy.Doc(noiDung, maChinhSach);
    }

    private static DauVaoBangHuy TaoDauVao(Models.Entities.DonThue don, string loaiHuy, DateTime now, ThuDaPhanLoai thu, ChinhSachHuy cs) =>
        new(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, don.GioNhanDuKien, now, thu.TienThue + thu.TienCoc > 0,
            thu.TienThue, thu.TienCoc, Math.Max(0, don.TongTienThueTruocGiam - don.TongTienGiam), don.TongTienCoc, cs, don.MaChinhSach);

    private async Task<XemTruocHuyResponse> TaoXemTruocAsync(Models.Entities.DonThue don, string loaiHuy, DateTime now, CancellationToken ct)
    {
        if (DaKetThucHuy.Contains(don.TrangThai)) return KhongTheHuy(don, loaiHuy, now, "Đơn đã hủy hoặc hết hạn.");
        if (!TruocBanGiao.Contains(don.TrangThai)
            || await _context.PhieuBanGiaos.AnyAsync(p => p.MaDonThue == don.MaDonThue && p.TrangThai == BanGiaoDaGiao, ct))
            return KhongTheHuy(don, loaiHuy, now, "Đơn đã bàn giao; phải xử lý nhận trả/đối soát.");

        var thu = await DocThuAsync(don.MaDonThue, ct);
        if (thu.ChuaPhanLoai != 0)
            return KhongTheHuy(don, loaiHuy, now, "Đơn có khoản thu chưa phân loại tiền thuê/cọc; cần đối chiếu thanh toán trước.");
        var cs = await DocChinhSachAsync(don.MaChinhSach, ct);
        return TaoXemTruoc(don, loaiHuy, now, thu, cs, BangTinhHuy.Tinh(TaoDauVao(don, loaiHuy, now, thu, cs)));
    }

    private static XemTruocHuyResponse TaoXemTruoc(
        Models.Entities.DonThue don, string loaiHuy, DateTime now, ThuDaPhanLoai thu, ChinhSachHuy cs, BangHuy b)
    {
        var canhBao = new List<string>();
        if (b.TienThuVuot > 0)
            canhBao.Add($"Có {CalculationHelpers.HienThiVnd(b.TienThuVuot)} thu vượt nghĩa vụ đơn; khoản này xử lý theo luồng thu thừa, không nằm trong bảng hủy.");
        if (b.TongHoan > 0)
            canhBao.Add("Số tiền hoàn là dự kiến; tiền về tài khoản sau khi cổng thanh toán xác nhận.");
        return new XemTruocHuyResponse(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, true, null, now, don.GioNhanDuKien,
            b.SoGioTruocNhan, b.Nhanh, don.MaChinhSach, b.TyLe, thu.TienThue, thu.TienCoc,
            b.TienThueGiuLai, b.TienThueHoan, b.TienCocHoan, b.TongHoan, b.TienThuVuot, b.DauVanTay, canhBao);
    }

    private static XemTruocHuyResponse KhongTheHuy(Models.Entities.DonThue don, string loaiHuy, DateTime now, string lyDo) =>
        new(don.MaDonThue, don.TrangThai.ToString(), loaiHuy, false, lyDo, now, don.GioNhanDuKien,
            Math.Round((don.GioNhanDuKien - now).TotalHours, 2), "", don.MaChinhSach, null, 0, 0, 0, 0, 0, 0, 0, "", new());

    private async Task<HuyDonResponse> TaoKetQuaAsync(long maDonThue, string loaiHuy, long maTaiKhoanXem, bool laNoiBo, CancellationToken ct)
    {
        var don = await _context.DonThues.AsNoTracking().FirstAsync(d => d.MaDonThue == maDonThue, ct);
        var hoan = await _hoanTien.TongHopTheoDonAsync(maDonThue, laNoiBo, ct);
        var lichSu = (await _context.LichSuTrangThaiDons.AsNoTracking()
                .Where(l => l.MaDonThue == maDonThue).OrderBy(l => l.ThoiDiem).ThenBy(l => l.MaLichSuDon)
                .Select(l => new { l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau, l.LyDo, l.MaNguoiThucHien }).ToListAsync(ct))
            .Select(l => new SuKienDonResponse(l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau,
                laNoiBo || l.MaNguoiThucHien == maTaiKhoanXem ? l.LyDo : null)).ToList();
        return new HuyDonResponse(maDonThue, don.TrangThai.ToString(), loaiHuy, don.ThoiDiemHuy, don.LyDoHuy,
            don.TienThueGiuLaiKhiHuy, hoan.Items, hoan.TongDuKien + hoan.TongDangXuLy + hoan.TongCanXuLyLai, hoan.TongDaHoan,
            hoan.Items.Count(i => i.TrangThai != TrangThaiHoanTien.ThanhCong && i.NhanHienThi != "DaThayThe"), lichSu);
    }
}
