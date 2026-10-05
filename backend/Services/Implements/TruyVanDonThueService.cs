using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.DonThue;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

public class TruyVanDonThueService : ITruyVanDonThueService
{
    private const string BanGiaoDaGiao = "DaGiao";
    private const string PhanCongDaPhanCong = "DaPhanCong";

    private readonly ApplicationDbContext _context;

    public TruyVanDonThueService(ApplicationDbContext context) => _context = context;

    // ───────────────────────── KHÁCH HÀNG ─────────────────────────

    public async Task<PagedResult<DonTomTatResponse>> LayDonCuaToiAsync(TimDonRequest filter, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        var (trang, soMoi) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        // Scope chủ đơn áp dụng ở query trước count/phân trang; mã khách không đến từ request.
        var q = _context.DonThues.AsNoTracking().Where(d => d.MaKhachHang == maKhach);
        q = LocChung(q, filter.MaDon, filter.TuNgay, filter.DenNgay, filter.TrangThai);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(d => d.NgayDat).ThenByDescending(d => d.MaDonThue)
            .Skip((trang - 1) * soMoi).Take(soMoi)
            .Select(d => new DonTomTatResponse(
                d.MaDonThue, d.MaDonHienThi, d.NgayDat, d.GioNhanDuKien, d.GioTraDuKien, d.TrangThai.ToString(),
                d.TongTienThueTruocGiam, d.TongTienGiam, d.TongTienCoc, d.ChiTietDonThues.Count))
            .ToListAsync();

        return new PagedResult<DonTomTatResponse> { Items = items, TotalItems = total, CurrentPage = trang, PageSize = soMoi };
    }

    public async Task<DonChiTietResponse> LayChiTietDonCuaToiAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach);
        return await XayDungChiTietAsync(maDonThue, laNoiBo: false, maTaiKhoan);
    }

    public async Task<List<SuKienDonResponse>> LayLichSuDonCuaToiAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach);
        return await LayLichSuAsync(maDonThue, laNoiBo: false, maTaiKhoan);
    }

    public async Task<PhieuBanGiaoKhachResponse> LayBienBanBanGiaoCuaKhachAsync(long maDonThue, long maTaiKhoan)
    {
        var maKhach = await ActorGuard.LayMaKhachHangAsync(_context, maTaiKhoan);
        await EnsureChuDonAsync(maDonThue, maKhach); // kiểm tra lại chủ đơn khi mở trực tiếp biên bản
        var ds = await LayBanGiaoKhachAsync(maDonThue);
        return ds.FirstOrDefault() ?? throw new KhongTimThayException("Đơn thuê này chưa có biên bản bàn giao đã chốt.");
    }

    // ───────────────────────── VẬN HÀNH ─────────────────────────

    public async Task<PagedResult<DonVanHanhTomTatResponse>> TimDonVanHanhAsync(TimDonVanHanhRequest filter, long maTaiKhoan)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan);
        var (trang, soMoi) = ChuanHoaPhanTrang(filter.Trang, filter.SoMoiTrang);

        var q = LocChung(_context.DonThues.AsNoTracking(), filter.MaDon, filter.TuNgay, filter.DenNgay, filter.TrangThai);

        if (!string.IsNullOrWhiteSpace(filter.TuKhoa))
        {
            var k = filter.TuKhoa.Trim();
            q = q.Where(d => (d.TenNguoiNhan != null && d.TenNguoiNhan.Contains(k))
                             || (d.SoDienThoaiNguoiNhan != null && d.SoDienThoaiNguoiNhan.Contains(k))
                             || (d.KhachHang.HoTen != null && d.KhachHang.HoTen.Contains(k))
                             || (d.KhachHang.TaiKhoan.SoDienThoai != null && d.KhachHang.TaiKhoan.SoDienThoai.Contains(k)));
        }
        if (filter.CanChuanBi == true)
            q = q.Where(d => d.TrangThai == TrangThaiDonThue.DaXacNhan || d.TrangThai == TrangThaiDonThue.DangChuanBi);
        if (filter.CanGiao == true)
            q = q.Where(d => d.TrangThai == TrangThaiDonThue.SanSangNhan);

        var total = await q.CountAsync();
        var items = await q
            .OrderBy(d => d.GioNhanDuKien).ThenBy(d => d.MaDonThue)
            .Skip((trang - 1) * soMoi).Take(soMoi)
            .Select(d => new DonVanHanhTomTatResponse(
                d.MaDonThue, d.MaDonHienThi, d.MaKhachHang, d.KhachHang.HoTen,
                d.TenNguoiNhan, d.SoDienThoaiNguoiNhan, d.NgayDat, d.GioNhanDuKien, d.GioTraDuKien,
                d.TrangThai.ToString(), d.ChiTietDonThues.Count,
                d.ChiTietDonThues.Sum(c => (int?)c.SoLuong) ?? 0,
                _context.PhanCongThietBis.Count(pc => pc.ChiTietDon.MaDonThue == d.MaDonThue && pc.TrangThai == PhanCongDaPhanCong)))
            .ToListAsync();

        return new PagedResult<DonVanHanhTomTatResponse> { Items = items, TotalItems = total, CurrentPage = trang, PageSize = soMoi };
    }

    public async Task<DonVanHanhChiTietResponse> LayChiTietDonVanHanhAsync(long maDonThue, long maTaiKhoan)
    {
        await ActorGuard.EnsureVanHanhAsync(_context, maTaiKhoan);
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue))
            throw new DonKhongTimThayException();

        var don = await XayDungChiTietAsync(maDonThue, laNoiBo: true, maTaiKhoan);
        var kh = await _context.DonThues.AsNoTracking().Where(d => d.MaDonThue == maDonThue)
            .Select(d => new { d.MaKhachHang, d.KhachHang.HoTen, d.GhiChu }).FirstAsync();

        var phanCong = await _context.PhanCongThietBis.AsNoTracking()
            .Where(pc => pc.ChiTietDon.MaDonThue == maDonThue)
            .OrderBy(pc => pc.MaPhanCong)
            .Select(pc => new PhanCongVanHanhResponse(
                pc.MaPhanCong, pc.MaChiTietDon, pc.MaThietBi, pc.ThietBi.MaThietBiHienThi, pc.TrangThai))
            .ToListAsync();

        var tong = don.Dong.Sum(d => d.SoLuong);
        var daGan = phanCong.Count(p => p.TrangThai == PhanCongDaPhanCong);
        var viec = new List<string>();
        switch (Enum.Parse<TrangThaiDonThue>(don.TrangThai))
        {
            case TrangThaiDonThue.DaXacNhan:
                viec.Add("Bắt đầu chuẩn bị đơn"); break;
            case TrangThaiDonThue.DangChuanBi:
                viec.Add(daGan < tong ? $"Gán đủ thiết bị ({daGan}/{tong})" : "Xác nhận sẵn sàng nhận"); break;
            case TrangThaiDonThue.SanSangNhan:
                viec.Add(don.BanGiao.Count == 0 ? "Lập phiếu bàn giao" : "Chốt bàn giao"); break;
        }

        return new DonVanHanhChiTietResponse(don, kh.MaKhachHang, kh.HoTen, kh.GhiChu, phanCong, viec);
    }

    // ───────────────────────── DÙNG CHUNG ─────────────────────────

    private async Task EnsureChuDonAsync(long maDonThue, long maKhach)
    {
        // Không phân biệt "không tồn tại" và "của người khác" để không lộ sự tồn tại của đơn.
        if (!await _context.DonThues.AnyAsync(d => d.MaDonThue == maDonThue && d.MaKhachHang == maKhach))
            throw new DonKhongTimThayException();
    }

    private static IQueryable<Models.Entities.DonThue> LocChung(
        IQueryable<Models.Entities.DonThue> q, string? maDon, DateTime? tuNgay, DateTime? denNgay, string? trangThai)
    {
        if (!string.IsNullOrWhiteSpace(maDon))
        {
            var m = maDon.Trim();
            q = q.Where(d => d.MaDonHienThi.Contains(m));
        }
        if (tuNgay.HasValue) q = q.Where(d => d.NgayDat >= tuNgay.Value);
        if (denNgay.HasValue)
        {
            var het = denNgay.Value.Date.AddDays(1);
            q = q.Where(d => d.NgayDat < het);
        }
        if (!string.IsNullOrWhiteSpace(trangThai))
        {
            if (!Enum.TryParse<TrangThaiDonThue>(trangThai, true, out var tt) || !Enum.IsDefined(tt))
                throw new HoSoKhongHopLeException("Trạng thái lọc không hợp lệ.", new { trangThai });
            q = q.Where(d => d.TrangThai == tt);
        }
        return q;
    }

    private static (int trang, int soMoi) ChuanHoaPhanTrang(int trang, int soMoi)
        => (Math.Max(1, trang), Math.Clamp(soMoi, 1, 100));

    private async Task<DonChiTietResponse> XayDungChiTietAsync(long maDonThue, bool laNoiBo, long maTaiKhoanXem)
    {
        // Các phần tải riêng từng query (không Include nhiều collection) để tránh nhân bản dữ liệu.
        var don = await _context.DonThues.AsNoTracking().FirstOrDefaultAsync(d => d.MaDonThue == maDonThue)
                  ?? throw new DonKhongTimThayException();

        var dong = await _context.ChiTietDonThues.AsNoTracking()
            .Where(c => c.MaDonThue == maDonThue).OrderBy(c => c.MaChiTietDon)
            .Select(c => new DongThueResponse(
                c.MaChiTietDon, c.MaSanPham, c.TenSanPhamLucDat, c.SoLuong, c.SoNgayTinhTien,
                c.DonGiaThueMoiNgay, c.TienGiam, c.MucCocMoiThietBi,
                c.SoLuong * c.SoNgayTinhTien * c.DonGiaThueMoiNgay - c.TienGiam))
            .ToListAsync();

        var thanhToan = await _context.ThanhToans.AsNoTracking()
            .Where(t => t.MaDonThue == maDonThue).OrderBy(t => t.ThoiDiemTao).ThenBy(t => t.MaThanhToan)
            .Select(t => new ThanhToanDonResponse(t.MaThanhToan, t.PhuongThuc, t.TrangThai, t.TongSoTien, t.ThoiDiemThanhCong))
            .ToListAsync();
        var daThu = thanhToan.Where(t => t.TrangThai == "ThanhCong").Sum(t => t.TongSoTien);

        var lichSu = await LayLichSuAsync(maDonThue, laNoiBo, maTaiKhoanXem);

        var banGiao = laNoiBo ? await LayBanGiaoKhachAsync(maDonThue, chiDaChot: false)
                              : await LayBanGiaoKhachAsync(maDonThue);

        var nhanTra = await _context.PhieuNhanTras.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue && p.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .OrderBy(p => p.LanTra)
            .Select(p => new PhieuNhanTraTomTatResponse(p.MaPhieuNhanTra, p.MaPhieuHienThi, p.LanTra, p.TrangThai.ToString(), p.ThoiDiemChot))
            .ToListAsync();

        // Phụ phí còn chờ duyệt là dữ liệu nội bộ, khách chỉ thấy khoản đã duyệt.
        var phuPhiQ = _context.PhuPhis.AsNoTracking().Where(p => p.MaDonThue == maDonThue);
        if (!laNoiBo) phuPhiQ = phuPhiQ.Where(p => p.TrangThaiDuyet == "DaDuyet");
        var phuPhi = await phuPhiQ.OrderBy(p => p.MaPhuPhi)
            .Select(p => new PhuPhiKhachResponse(p.MaPhuPhi, p.LoaiPhi, p.SoTien, p.LyDo, p.TrangThaiDuyet))
            .ToListAsync();

        var hoanTien = await _context.HoanTiens.AsNoTracking()
            .Where(h => h.ChiTietThanhToanGoc.ThanhToan.MaDonThue == maDonThue)
            .OrderBy(h => h.MaHoanTien)
            .Select(h => new HoanTienKhachResponse(h.MaHoanTien, h.LoaiHoan, h.SoTien, h.TrangThai, h.ThoiDiemThanhCong))
            .ToListAsync();

        var thaoTac = new List<string>();
        if (!laNoiBo && don.TrangThai == TrangThaiDonThue.ChoThanhToan)
        {
            thaoTac.Add("ThanhToan");
            thaoTac.Add("HuyDon");
        }

        return new DonChiTietResponse(
            don.MaDonThue, don.MaDonHienThi, don.TrangThai.ToString(), don.NgayDat, don.GioNhanDuKien, don.GioTraDuKien,
            don.HanThanhToan, don.TenNguoiNhan, don.SoDienThoaiNguoiNhan, don.EmailLienHe,
            don.TongTienThueTruocGiam, don.TongTienGiam, don.TongTienCoc, daThu,
            dong, thanhToan, lichSu, banGiao, nhanTra, phuPhi, hoanTien, thaoTac);
    }

    private async Task<List<SuKienDonResponse>> LayLichSuAsync(long maDonThue, bool laNoiBo, long maTaiKhoanXem)
    {
        var rows = await _context.LichSuTrangThaiDons.AsNoTracking()
            .Where(l => l.MaDonThue == maDonThue)
            .OrderBy(l => l.ThoiDiem).ThenBy(l => l.MaLichSuDon)
            .Select(l => new { l.ThoiDiem, l.TrangThaiTruoc, l.TrangThaiSau, l.LyDo, l.MaNguoiThucHien })
            .ToListAsync();

        // Khách chỉ thấy lý do do chính mình nhập (vd. lý do hủy); ghi chú của nhân viên là nội bộ.
        return rows.Select(r => new SuKienDonResponse(
                r.ThoiDiem, r.TrangThaiTruoc, r.TrangThaiSau,
                laNoiBo || r.MaNguoiThucHien == maTaiKhoanXem ? r.LyDo : null))
            .ToList();
    }

    /// <summary>
    /// Biên bản bàn giao dạng DTO an toàn cho khách: bỏ bằng chứng xác nhận, ghi chú nội bộ.
    /// Khách chỉ thấy phiếu đã chốt; vận hành thấy cả phiếu nháp.
    /// </summary>
    private async Task<List<PhieuBanGiaoKhachResponse>> LayBanGiaoKhachAsync(long maDonThue, bool chiDaChot = true)
    {
        var phieus = await _context.PhieuBanGiaos.AsNoTracking()
            .Where(p => p.MaDonThue == maDonThue && (!chiDaChot || p.TrangThai == BanGiaoDaGiao))
            .Select(p => new { p.MaPhieuBanGiao, p.TrangThai, p.ThoiDiemGiaoThucTe, p.TenNhanVienLucGiao, p.TenNguoiNhanThucTe })
            .ToListAsync();
        if (phieus.Count == 0) return new();

        var ids = phieus.Select(p => p.MaPhieuBanGiao).ToList();
        var chiTiet = await _context.ChiTietBanGiaos.AsNoTracking()
            .Where(c => ids.Contains(c.MaPhieuBanGiao))
            .OrderBy(c => c.MaChiTietBanGiao)
            .Select(c => new
            {
                c.MaPhieuBanGiao,
                Dto = new ChiTietBanGiaoKhachResponse(
                    c.MaChiTietBanGiao, c.PhanCongThietBi.ThietBi.MaThietBiHienThi,
                    c.PhanCongThietBi.ChiTietDon.TenSanPhamLucDat,
                    c.TinhTrangTruocThue, c.PhuKienThucGiao, c.DanhSachAnh)
            })
            .ToListAsync();

        return phieus.Select(p => new PhieuBanGiaoKhachResponse(
                p.MaPhieuBanGiao, p.TrangThai, p.ThoiDiemGiaoThucTe, p.TenNhanVienLucGiao, p.TenNguoiNhanThucTe,
                chiTiet.Where(c => c.MaPhieuBanGiao == p.MaPhieuBanGiao).Select(c => c.Dto).ToList()))
            .ToList();
    }
}
