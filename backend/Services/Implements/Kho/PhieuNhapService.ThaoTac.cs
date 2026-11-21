using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Helpers;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.Kho;

public partial class PhieuNhapService
{
    public async Task<PhieuNhapResponse> TaoNhapAsync(TaoPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var nhanVien = await ActorGuard.LayNhanVienDangLamViecAsync(_context, maTaiKhoan, ct);
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == request.MaNhaCungCap, ct);
        if (ncc == null)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{request.MaNhaCungCap}.");
        if (ncc.TrangThaiHopTac == "NgungHopTac")
            throw new XungDotDuLieuException("NCC_NGUNG_HOP_TAC", "Nhà cung cấp đã ngừng hợp tác, không thể tạo phiếu nhập mới.");

        var phieu = new PhieuNhapHang
        {
            MaNhaCungCap = ncc.MaNhaCungCap,
            MaNguoiLap = nhanVien.MaNhanVien,
            MaPhieuHienThi = await SinhMaPhieuHienThiAsync(ct),
            SoChungTuNhaCungCap = request.SoChungTuNhaCungCap?.Trim(),
            NgayLap = DateTime.UtcNow,
            NgayNhapDuKien = request.NgayNhapDuKien,
            TongTien = 0,
            TrangThai = TrangThaiPhieuNhap.Nhap,
            TenNguoiLapLucNhap = nhanVien.HoTen,
            ThongTinNhaCungCapLucNhap = $"{ncc.TenNhaCungCap} (SĐT: {ncc.SoDienThoai ?? "N/A"}, Email: {ncc.Email ?? "N/A"})",
            GhiChu = request.GhiChu?.Trim()
        };

        _context.PhieuNhapHangs.Add(phieu);
        // Lưu trước để lấy MaPhieuNhap tự tăng thật rồi mới ghi nhật ký (tránh MaDoiTuong = "0" — UC7.5)
        await _context.SaveChangesAsync(ct);

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "TAO_PHIEU_NHAP_NHAP",
            LoaiDoiTuong = nameof(PhieuNhapHang),
            MaDoiTuong = phieu.MaPhieuNhap.ToString(),
            LyDo = $"Lập phiếu nhập nháp {phieu.MaPhieuHienThi} từ NCC '{ncc.TenNhaCungCap}'",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Đã lập phiếu nhập nháp {MaPhieu} bởi nhân viên #{MaNV}", phieu.MaPhieuHienThi, nhanVien.MaNhanVien);
        return await LayChiTietAsync(phieu.MaPhieuNhap, ct);
    }

    public async Task<PhieuNhapResponse> CapNhatNhapAsync(long id, CapNhatPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.FirstOrDefaultAsync(x => x.MaPhieuNhap == id, ct);
        if (phieu == null) throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        if (phieu.MaNhaCungCap != request.MaNhaCungCap)
        {
            var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == request.MaNhaCungCap, ct);
            if (ncc == null) throw new KhongTimThayException($"Không tìm thấy nhà cung cấp #{request.MaNhaCungCap}.");
            if (ncc.TrangThaiHopTac == "NgungHopTac")
                throw new XungDotDuLieuException("NCC_NGUNG_HOP_TAC", "Nhà cung cấp đã ngừng hợp tác, không thể chọn cho phiếu nhập.");

            phieu.MaNhaCungCap = ncc.MaNhaCungCap;
            phieu.ThongTinNhaCungCapLucNhap = $"{ncc.TenNhaCungCap} (SĐT: {ncc.SoDienThoai ?? "N/A"}, Email: {ncc.Email ?? "N/A"})";
        }

        phieu.NgayNhapDuKien = request.NgayNhapDuKien;
        phieu.SoChungTuNhaCungCap = request.SoChungTuNhaCungCap?.Trim();
        phieu.GhiChu = request.GhiChu?.Trim();

        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "CAP_NHAT_PHIEU_NHAP_NHAP",
            LoaiDoiTuong = nameof(PhieuNhapHang),
            MaDoiTuong = id.ToString(),
            LyDo = $"Cập nhật đầu phiếu nhập nháp {phieu.MaPhieuHienThi}",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        return await LayChiTietAsync(phieu.MaPhieuNhap, ct);
    }

    public async Task<PhieuNhapResponse> ThemDongAsync(long phieuId, DongNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await TaiPhieuVaKiemTraQuyenAsync(phieuId, maTaiKhoan, ct);
        ValidateDongNhap(request);

        var sp = await _context.SanPhams.FindAsync(new object[] { request.MaSanPham }, ct);
        if (sp == null) throw new KhongTimThayException($"Không tìm thấy sản phẩm với mã #{request.MaSanPham}.");

        var tinhTrangChuan = request.TinhTrangKhiNhap.Trim();
        var dongTrung = phieu.ChiTietPhieuNhaps.FirstOrDefault(ctPn =>
            ctPn.MaSanPham == request.MaSanPham &&
            ctPn.DonGiaNhap == request.DonGiaNhap &&
            string.Equals(ctPn.TinhTrangKhiNhap, tinhTrangChuan, StringComparison.OrdinalIgnoreCase));

        if (dongTrung != null)
        {
            dongTrung.SoLuong += request.SoLuong;
            if (!string.IsNullOrWhiteSpace(request.GhiChu)) dongTrung.GhiChu = request.GhiChu.Trim();
            _logger.LogInformation("Gộp dòng sản phẩm #{MaSP} trong phiếu #{PhieuId}, số lượng mới: {SoLuong}",
                request.MaSanPham, phieuId, dongTrung.SoLuong);
        }
        else
        {
            _context.ChiTietPhieuNhaps.Add(new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieuId, MaSanPham = request.MaSanPham, TenSanPhamLucNhap = sp.TenSanPham,
                SoLuong = request.SoLuong, DonGiaNhap = request.DonGiaNhap,
                TinhTrangKhiNhap = tinhTrangChuan, GhiChu = request.GhiChu?.Trim()
            });
        }

        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);
        await _context.SaveChangesAsync(ct);
        return await LayChiTietAsync(phieuId, ct);
    }

    public async Task<PhieuNhapResponse> SuaDongAsync(long phieuId, long chiTietId, DongNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await TaiPhieuVaKiemTraQuyenAsync(phieuId, maTaiKhoan, ct);
        var dongHienTai = phieu.ChiTietPhieuNhaps.FirstOrDefault(x => x.MaChiTietPhieuNhap == chiTietId)
            ?? throw new DongKhongThuocPhieuException($"Dòng chi tiết #{chiTietId} không tồn tại hoặc không thuộc phiếu nhập #{phieuId}.");

        ValidateDongNhap(request);
        var sp = await _context.SanPhams.FindAsync(new object[] { request.MaSanPham }, ct);
        if (sp == null) throw new KhongTimThayException($"Không tìm thấy sản phẩm với mã #{request.MaSanPham}.");

        var tinhTrangChuan = request.TinhTrangKhiNhap.Trim();
        var dongTrungKhac = phieu.ChiTietPhieuNhaps.FirstOrDefault(ctPn =>
            ctPn.MaChiTietPhieuNhap != chiTietId &&
            ctPn.MaSanPham == request.MaSanPham &&
            ctPn.DonGiaNhap == request.DonGiaNhap &&
            string.Equals(ctPn.TinhTrangKhiNhap, tinhTrangChuan, StringComparison.OrdinalIgnoreCase));

        if (dongTrungKhac != null)
        {
            dongTrungKhac.SoLuong += request.SoLuong;
            _context.ChiTietPhieuNhaps.Remove(dongHienTai);
            phieu.ChiTietPhieuNhaps.Remove(dongHienTai);
            _logger.LogInformation("Sửa dòng #{ChiTietId} trùng với dòng #{DongKhacId}, tiến hành gộp số lượng và xóa dòng thừa",
                chiTietId, dongTrungKhac.MaChiTietPhieuNhap);
        }
        else
        {
            dongHienTai.MaSanPham = request.MaSanPham;
            dongHienTai.TenSanPhamLucNhap = sp.TenSanPham;
            dongHienTai.SoLuong = request.SoLuong;
            dongHienTai.DonGiaNhap = request.DonGiaNhap;
            dongHienTai.TinhTrangKhiNhap = tinhTrangChuan;
            dongHienTai.GhiChu = request.GhiChu?.Trim();
        }

        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);
        await _context.SaveChangesAsync(ct);
        return await LayChiTietAsync(phieuId, ct);
    }

    public async Task<PhieuNhapResponse> XoaDongAsync(long phieuId, long chiTietId, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await TaiPhieuVaKiemTraQuyenAsync(phieuId, maTaiKhoan, ct);
        var dong = phieu.ChiTietPhieuNhaps.FirstOrDefault(x => x.MaChiTietPhieuNhap == chiTietId)
            ?? throw new DongKhongThuocPhieuException($"Dòng chi tiết #{chiTietId} không tồn tại hoặc không thuộc phiếu nhập #{phieuId}.");

        _context.ChiTietPhieuNhaps.Remove(dong);
        phieu.ChiTietPhieuNhaps.Remove(dong);
        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Đã xóa dòng chi tiết #{ChiTietId} khỏi phiếu #{PhieuId}", chiTietId, phieuId);
        return await LayChiTietAsync(phieuId, ct);
    }

    public async Task<PhieuNhapResponse> HuyNhapAsync(long id, HuyNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.FirstOrDefaultAsync(x => x.MaPhieuNhap == id, ct);
        if (phieu == null) throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("THIEU_LY_DO_HUY", "Lý do hủy phiếu nhập là bắt buộc.");

        phieu.TrangThai = TrangThaiPhieuNhap.DaHuy;
        phieu.LyDoHuy = request.LyDo.Trim();
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan, HanhDong = "HUY_PHIEU_NHAP_NHAP",
            LoaiDoiTuong = nameof(PhieuNhapHang), MaDoiTuong = id.ToString(),
            LyDo = $"Hủy phiếu nhập nháp {phieu.MaPhieuHienThi}. Lý do: {phieu.LyDoHuy}",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Phiếu nhập {MaPhieu} đã bị hủy bởi tài khoản #{MaTaiKhoan}", phieu.MaPhieuHienThi, maTaiKhoan);
        return await LayChiTietAsync(id, ct);
    }

    private async Task<PhieuNhapHang> TaiPhieuVaKiemTraQuyenAsync(long phieuId, long maTaiKhoan, CancellationToken ct)
    {
        var phieu = await _context.PhieuNhapHangs.Include(p => p.ChiTietPhieuNhaps)
            .FirstOrDefaultAsync(x => x.MaPhieuNhap == phieuId, ct);
        if (phieu == null) throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{phieuId}.");
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);
        return phieu;
    }

    private async Task KiemTraQuyenSuaPhieuAsync(PhieuNhapHang phieu, long maTaiKhoan, CancellationToken ct)
    {
        if (phieu.TrangThai != TrangThaiPhieuNhap.Nhap)
            throw new XungDotDuLieuException("PHIEU_KHONG_CON_NHAP",
                $"Phiếu nhập đang ở trạng thái '{phieu.TrangThai}', không thể chỉnh sửa hoặc hủy.");

        var taiKhoan = await _context.TaiKhoans.FindAsync(new object[] { maTaiKhoan }, ct)
            ?? throw new KhongCoQuyenException("Không tìm thấy thông tin tài khoản người thực hiện.");
        if (taiKhoan.VaiTro == "QuanTriVien") return;

        var nhanVien = await ActorGuard.LayNhanVienDangLamViecAsync(_context, maTaiKhoan, ct);
        if (phieu.MaNguoiLap != nhanVien.MaNhanVien)
            throw new KhongCoQuyenException("Bạn chỉ có quyền sửa hoặc hủy phiếu nhập nháp do chính mình tạo.");
    }

    private static void ValidateDongNhap(DongNhapRequest request)
    {
        if (request.SoLuong <= 0)
            throw new DuLieuKhongHopLeException("SO_LUONG_KHONG_HOP_LE", "Số lượng nhập phải lớn hơn 0.");
        if (request.DonGiaNhap < 0)
            throw new DuLieuKhongHopLeException("GIA_NHAP_KHONG_HOP_LE", "Đơn giá nhập không được âm.");
        if (request.DonGiaNhap == 0 && string.IsNullOrWhiteSpace(request.GhiChu))
            throw new DuLieuKhongHopLeException("GIA_NHAP_KHONG_HOP_LE", "Đơn giá nhập bằng 0đ bắt buộc phải có lý do trong ghi chú.");
    }

    private async Task<string> SinhMaPhieuHienThiAsync(CancellationToken ct)
    {
        var prefix = $"PN{DateTime.UtcNow:yyyyMMdd}";
        var count = await _context.PhieuNhapHangs.CountAsync(x => x.MaPhieuHienThi.StartsWith(prefix), ct);
        return $"{prefix}-{(count + 1):D4}";
    }
}
