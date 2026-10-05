using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.PhieuNhap;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements;

/// <summary>
/// Triển khai dịch vụ quản lý Phiếu nhập nháp và tra cứu (W3-T4 - Kiện Minh)
/// </summary>
public class PhieuNhapService : IPhieuNhapService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PhieuNhapService> _logger;

    public PhieuNhapService(ApplicationDbContext context, ILogger<PhieuNhapService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Tìm kiếm và phân trang danh sách phiếu nhập
    /// </summary>
    public async Task<PagedResult<PhieuNhapResponse>> TimKiemAsync(
        string? tuKhoa, 
        long? maNhaCungCap, 
        TrangThaiPhieuNhap? trangThai, 
        DateTime? tuNgay, 
        DateTime? denNgay, 
        int trang = 1, 
        int soMoiTrang = 20, 
        CancellationToken ct = default)
    {
        trang = Math.Max(1, trang);
        soMoiTrang = Math.Clamp(soMoiTrang, 1, 100);

        var query = _context.PhieuNhapHangs.AsNoTracking().AsQueryable();

        // 1. Lọc theo nhà cung cấp
        if (maNhaCungCap.HasValue)
        {
            query = query.Where(x => x.MaNhaCungCap == maNhaCungCap.Value);
        }

        // 2. Lọc theo trạng thái phiếu
        if (trangThai.HasValue)
        {
            query = query.Where(x => x.TrangThai == trangThai.Value);
        }

        // 3. Lọc theo khoảng ngày lập
        if (tuNgay.HasValue)
        {
            query = query.Where(x => x.NgayLap >= tuNgay.Value);
        }
        if (denNgay.HasValue)
        {
            query = query.Where(x => x.NgayLap <= denNgay.Value);
        }

        // 4. Lọc theo từ khóa (Mã hiển thị, số chứng từ NCC, tên NCC)
        if (!string.IsNullOrWhiteSpace(tuKhoa))
        {
            var keyword = tuKhoa.Trim();
            query = query.Where(x => 
                x.MaPhieuHienThi.Contains(keyword) ||
                (x.SoChungTuNhaCungCap != null && x.SoChungTuNhaCungCap.Contains(keyword)) ||
                x.NhaCungCap.TenNhaCungCap.Contains(keyword) ||
                (x.TenNguoiLapLucNhap != null && x.TenNguoiLapLucNhap.Contains(keyword)));
        }

        var totalItems = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(x => x.NgayLap)
            .ThenByDescending(x => x.MaPhieuNhap)
            .Skip((trang - 1) * soMoiTrang)
            .Take(soMoiTrang)
            .Select(p => new PhieuNhapResponse
            {
                MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuHienThi = p.MaPhieuHienThi,
                MaNhaCungCap = p.MaNhaCungCap,
                TenNhaCungCap = p.NhaCungCap.TenNhaCungCap,
                MaNguoiLap = p.MaNguoiLap,
                TenNguoiLap = p.TenNguoiLapLucNhap ?? p.NguoiLap.HoTen,
                MaNguoiXacNhan = p.MaNguoiXacNhan,
                TenNguoiXacNhan = p.TenNguoiXacNhanLucNhap ?? (p.NguoiXacNhan != null ? p.NguoiXacNhan.HoTen : null),
                NgayLap = p.NgayLap,
                NgayNhapDuKien = p.NgayNhapDuKien,
                NgayNhapThucTe = p.NgayNhapThucTe,
                NgayXacNhan = p.NgayXacNhan,
                SoChungTuNhaCungCap = p.SoChungTuNhaCungCap,
                TongTien = p.TongTien,
                TrangThai = p.TrangThai,
                LyDoHuy = p.LyDoHuy,
                GhiChu = p.GhiChu,
                CoTheSua = p.TrangThai == TrangThaiPhieuNhap.Nhap,
                ChiTietPhieuNhaps = p.ChiTietPhieuNhaps.Select(ctPn => new ChiTietPhieuNhapResponse
                {
                    MaChiTietPhieuNhap = ctPn.MaChiTietPhieuNhap,
                    MaPhieuNhap = ctPn.MaPhieuNhap,
                    MaSanPham = ctPn.MaSanPham,
                    TenSanPham = ctPn.SanPham.TenSanPham,
                    SoLuong = ctPn.SoLuong,
                    DonGiaNhap = ctPn.DonGiaNhap,
                    TinhTrangKhiNhap = ctPn.TinhTrangKhiNhap ?? "",
                    GhiChu = ctPn.GhiChu
                }).ToList()
            })
            .ToListAsync(ct);

        return new PagedResult<PhieuNhapResponse>
        {
            Items = items,
            TotalItems = totalItems,
            CurrentPage = trang,
            PageSize = soMoiTrang
        };
    }

    /// <summary>
    /// Xem chi tiết một phiếu nhập kèm các dòng sản phẩm
    /// </summary>
    public async Task<PhieuNhapResponse> LayChiTietAsync(long id, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.AsNoTracking()
            .Where(x => x.MaPhieuNhap == id)
            .Select(p => new PhieuNhapResponse
            {
                MaPhieuNhap = p.MaPhieuNhap,
                MaPhieuHienThi = p.MaPhieuHienThi,
                MaNhaCungCap = p.MaNhaCungCap,
                TenNhaCungCap = p.NhaCungCap.TenNhaCungCap,
                MaNguoiLap = p.MaNguoiLap,
                TenNguoiLap = p.TenNguoiLapLucNhap ?? p.NguoiLap.HoTen,
                MaNguoiXacNhan = p.MaNguoiXacNhan,
                TenNguoiXacNhan = p.TenNguoiXacNhanLucNhap ?? (p.NguoiXacNhan != null ? p.NguoiXacNhan.HoTen : null),
                NgayLap = p.NgayLap,
                NgayNhapDuKien = p.NgayNhapDuKien,
                NgayNhapThucTe = p.NgayNhapThucTe,
                NgayXacNhan = p.NgayXacNhan,
                SoChungTuNhaCungCap = p.SoChungTuNhaCungCap,
                TongTien = p.TongTien,
                TrangThai = p.TrangThai,
                LyDoHuy = p.LyDoHuy,
                GhiChu = p.GhiChu,
                CoTheSua = p.TrangThai == TrangThaiPhieuNhap.Nhap,
                ChiTietPhieuNhaps = p.ChiTietPhieuNhaps.Select(ctPn => new ChiTietPhieuNhapResponse
                {
                    MaChiTietPhieuNhap = ctPn.MaChiTietPhieuNhap,
                    MaPhieuNhap = ctPn.MaPhieuNhap,
                    MaSanPham = ctPn.MaSanPham,
                    TenSanPham = ctPn.SanPham.TenSanPham,
                    SoLuong = ctPn.SoLuong,
                    DonGiaNhap = ctPn.DonGiaNhap,
                    TinhTrangKhiNhap = ctPn.TinhTrangKhiNhap ?? "",
                    GhiChu = ctPn.GhiChu
                }).ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");

        return phieu;
    }

    /// <summary>
    /// Tạo mới một phiếu nhập ở trạng thái Nháp (chưa tạo thiết bị, chưa tăng khả dụng)
    /// </summary>
    public async Task<PhieuNhapResponse> TaoNhapAsync(TaoPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        // 1. Xác định nhân viên đang làm việc từ tài khoản hiện tại
        var nhanVien = await LayNhanVienDangLamViecAsync(maTaiKhoan, ct);

        // 2. Kiểm tra tính hợp lệ của Nhà cung cấp
        var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == request.MaNhaCungCap, ct);
        if (ncc == null)
            throw new KhongTimThayException($"Không tìm thấy nhà cung cấp với mã #{request.MaNhaCungCap}.");

        if (ncc.TrangThaiHopTac == "NgungHopTac")
            throw new XungDotDuLieuException("NCC_NGUNG_HOP_TAC", "Nhà cung cấp đã ngừng hợp tác, không thể tạo phiếu nhập mới.");

        // 3. Sinh mã hiển thị duy nhất theo ngày: PN-yyyyMMdd-XXXX
        var maHienThi = await SinhMaPhieuHienThiAsync(ct);

        // 4. Tạo thực thể phiếu nhập nháp với snapshot thông tin NCC và người lập
        var phieu = new PhieuNhapHang
        {
            MaNhaCungCap = ncc.MaNhaCungCap,
            MaNguoiLap = nhanVien.MaNhanVien,
            MaPhieuHienThi = maHienThi,
            SoChungTuNhaCungCap = request.SoChungTuNhaCungCap?.Trim(),
            NgayLap = DateTime.UtcNow,
            NgayNhapDuKien = request.NgayNhapDuKien,
            TongTien = 0,
            TrangThai = TrangThaiPhieuNhap.Nhap, // Luôn khởi tạo ở trạng thái Nháp
            TenNguoiLapLucNhap = nhanVien.HoTen,
            ThongTinNhaCungCapLucNhap = $"{ncc.TenNhaCungCap} (SĐT: {ncc.SoDienThoai ?? "N/A"}, Email: {ncc.Email ?? "N/A"})",
            GhiChu = request.GhiChu?.Trim()
        };

        _context.PhieuNhapHangs.Add(phieu);

        // 5. Ghi nhật ký thao tác kiểm toán
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

    /// <summary>
    /// Cập nhật thông tin đầu phiếu nhập nháp
    /// </summary>
    public async Task<PhieuNhapResponse> CapNhatNhapAsync(long id, CapNhatPhieuNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.FirstOrDefaultAsync(x => x.MaPhieuNhap == id, ct);
        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");

        // 1. Kiểm tra trạng thái phiếu và quyền sửa
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        // 2. Nếu đổi nhà cung cấp, kiểm tra nhà cung cấp mới
        if (phieu.MaNhaCungCap != request.MaNhaCungCap)
        {
            var ncc = await _context.NhaCungCaps.FirstOrDefaultAsync(x => x.MaNhaCungCap == request.MaNhaCungCap, ct);
            if (ncc == null)
                throw new KhongTimThayException($"Không tìm thấy nhà cung cấp #{request.MaNhaCungCap}.");

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

    /// <summary>
    /// Thêm dòng sản phẩm vào phiếu nhập nháp. Tự động gộp dòng nếu trùng sản phẩm, đơn giá và tình trạng.
    /// </summary>
    public async Task<PhieuNhapResponse> ThemDongAsync(long phieuId, DongNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs
            .Include(p => p.ChiTietPhieuNhaps)
            .FirstOrDefaultAsync(x => x.MaPhieuNhap == phieuId, ct);

        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{phieuId}.");

        // 1. Kiểm tra trạng thái phiếu và quyền sửa
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        // 2. Kiểm tra ràng buộc dữ liệu dòng nhập
        ValidateDongNhap(request);

        var sp = await _context.SanPhams.FindAsync(new object[] { request.MaSanPham }, ct);
        if (sp == null)
            throw new KhongTimThayException($"Không tìm thấy sản phẩm với mã #{request.MaSanPham}.");

        var tinhTrangChuan = request.TinhTrangKhiNhap.Trim();

        // 3. Logic gộp dòng: nếu cùng sản phẩm, cùng đơn giá và cùng tình trạng khi nhập
        var dongTrung = phieu.ChiTietPhieuNhaps.FirstOrDefault(ctPn =>
            ctPn.MaSanPham == request.MaSanPham &&
            ctPn.DonGiaNhap == request.DonGiaNhap &&
            string.Equals(ctPn.TinhTrangKhiNhap, tinhTrangChuan, StringComparison.OrdinalIgnoreCase));

        if (dongTrung != null)
        {
            dongTrung.SoLuong += request.SoLuong;
            if (!string.IsNullOrWhiteSpace(request.GhiChu))
            {
                dongTrung.GhiChu = request.GhiChu.Trim();
            }
            _logger.LogInformation("Gộp dòng sản phẩm #{MaSP} trong phiếu #{PhieuId}, số lượng mới: {SoLuong}", 
                request.MaSanPham, phieuId, dongTrung.SoLuong);
        }
        else
        {
            var chiTietMoi = new ChiTietPhieuNhap
            {
                MaPhieuNhap = phieuId,
                MaSanPham = request.MaSanPham,
                TenSanPhamLucNhap = sp.TenSanPham,
                SoLuong = request.SoLuong,
                DonGiaNhap = request.DonGiaNhap,
                TinhTrangKhiNhap = tinhTrangChuan,
                GhiChu = request.GhiChu?.Trim()
            };
            _context.ChiTietPhieuNhaps.Add(chiTietMoi);
        }

        // 4. Tính toán lại tổng tiền phiếu ở server
        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);

        await _context.SaveChangesAsync(ct);
        return await LayChiTietAsync(phieuId, ct);
    }

    /// <summary>
    /// Cập nhật một dòng sản phẩm trong phiếu nhập nháp. Tự động gộp nếu sửa thành trùng bộ khóa với dòng khác.
    /// </summary>
    public async Task<PhieuNhapResponse> SuaDongAsync(
        long phieuId, 
        long chiTietId, 
        DongNhapRequest request, 
        long maTaiKhoan, 
        CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs
            .Include(p => p.ChiTietPhieuNhaps)
            .FirstOrDefaultAsync(x => x.MaPhieuNhap == phieuId, ct);

        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{phieuId}.");

        // 1. Kiểm tra trạng thái phiếu và quyền sửa
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        // 2. Kiểm tra dòng chi tiết có thuộc phiếu nhập này không
        var dongHienTai = phieu.ChiTietPhieuNhaps.FirstOrDefault(x => x.MaChiTietPhieuNhap == chiTietId);
        if (dongHienTai == null)
        {
            throw new DongKhongThuocPhieuException(
                $"Dòng chi tiết #{chiTietId} không tồn tại hoặc không thuộc phiếu nhập #{phieuId}.");
        }

        // 3. Kiểm tra dữ liệu đầu vào
        ValidateDongNhap(request);

        var sp = await _context.SanPhams.FindAsync(new object[] { request.MaSanPham }, ct);
        if (sp == null)
            throw new KhongTimThayException($"Không tìm thấy sản phẩm với mã #{request.MaSanPham}.");

        var tinhTrangChuan = request.TinhTrangKhiNhap.Trim();

        // 4. Kiểm tra trường hợp sửa làm phát sinh trùng bộ khóa với một dòng khác trong cùng phiếu
        var dongTrungKhac = phieu.ChiTietPhieuNhaps.FirstOrDefault(ctPn =>
            ctPn.MaChiTietPhieuNhap != chiTietId &&
            ctPn.MaSanPham == request.MaSanPham &&
            ctPn.DonGiaNhap == request.DonGiaNhap &&
            string.Equals(ctPn.TinhTrangKhiNhap, tinhTrangChuan, StringComparison.OrdinalIgnoreCase));

        if (dongTrungKhac != null)
        {
            // Gộp số lượng vào dòng trùng khác và xóa dòng hiện tại
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

        // 5. Cập nhật lại tổng tiền phiếu
        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);

        await _context.SaveChangesAsync(ct);
        return await LayChiTietAsync(phieuId, ct);
    }

    /// <summary>
    /// Xóa một dòng chi tiết khỏi phiếu nhập nháp và tính lại tổng tiền
    /// </summary>
    public async Task<PhieuNhapResponse> XoaDongAsync(long phieuId, long chiTietId, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs
            .Include(p => p.ChiTietPhieuNhaps)
            .FirstOrDefaultAsync(x => x.MaPhieuNhap == phieuId, ct);

        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{phieuId}.");

        // 1. Kiểm tra trạng thái phiếu và quyền sửa
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        // 2. Tìm dòng chi tiết
        var dong = phieu.ChiTietPhieuNhaps.FirstOrDefault(x => x.MaChiTietPhieuNhap == chiTietId);
        if (dong == null)
        {
            throw new DongKhongThuocPhieuException(
                $"Dòng chi tiết #{chiTietId} không tồn tại hoặc không thuộc phiếu nhập #{phieuId}.");
        }

        // 3. Xóa dòng chi tiết
        _context.ChiTietPhieuNhaps.Remove(dong);
        phieu.ChiTietPhieuNhaps.Remove(dong);

        // 4. Tính lại tổng tiền phiếu từ các dòng còn lại
        phieu.TongTien = phieu.ChiTietPhieuNhaps.Sum(x => x.SoLuong * x.DonGiaNhap);

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Đã xóa dòng chi tiết #{ChiTietId} khỏi phiếu #{PhieuId}", chiTietId, phieuId);

        return await LayChiTietAsync(phieuId, ct);
    }

    /// <summary>
    /// Hủy phiếu nhập nháp kèm lý do
    /// </summary>
    public async Task<PhieuNhapResponse> HuyNhapAsync(long id, HuyNhapRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var phieu = await _context.PhieuNhapHangs.FirstOrDefaultAsync(x => x.MaPhieuNhap == id, ct);
        if (phieu == null)
            throw new KhongTimThayException($"Không tìm thấy phiếu nhập với mã #{id}.");

        // 1. Kiểm tra quyền và trạng thái
        await KiemTraQuyenSuaPhieuAsync(phieu, maTaiKhoan, ct);

        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("THIEU_LY_DO_HUY", "Lý do hủy phiếu nhập là bắt buộc.");

        // 2. Đổi trạng thái sang DaHuy, giữ nguyên các dòng chi tiết để bảo toàn lịch sử chứng từ
        phieu.TrangThai = TrangThaiPhieuNhap.DaHuy;
        phieu.LyDoHuy = request.LyDo.Trim();

        // 3. Ghi nhật ký thao tác
        _context.NhatKyThaoTacs.Add(new NhatKyThaoTac
        {
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "HUY_PHIEU_NHAP_NHAP",
            LoaiDoiTuong = nameof(PhieuNhapHang),
            MaDoiTuong = id.ToString(),
            LyDo = $"Hủy phiếu nhập nháp {phieu.MaPhieuHienThi}. Lý do: {phieu.LyDoHuy}",
            ThoiDiem = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Phiếu nhập {MaPhieu} đã bị hủy bởi tài khoản #{MaTaiKhoan}", phieu.MaPhieuHienThi, maTaiKhoan);

        return await LayChiTietAsync(id, ct);
    }

    // ── Helper nội bộ ──────────────────────────────────────────────────────────

    private async Task<NhanVien> LayNhanVienDangLamViecAsync(long maTaiKhoan, CancellationToken ct)
    {
        var nhanVien = await _context.NhanViens
            .FirstOrDefaultAsync(nv => nv.MaTaiKhoan == maTaiKhoan && nv.TrangThaiLamViec == "DangLamViec", ct);

        if (nhanVien == null)
            throw new KhongCoQuyenException("Tài khoản chưa được liên kết với nhân viên đang làm việc.");

        return nhanVien;
    }

    private async Task KiemTraQuyenSuaPhieuAsync(PhieuNhapHang phieu, long maTaiKhoan, CancellationToken ct)
    {
        // 1. Phiếu đã nhập kho hoặc đã hủy tuyệt đối không được sửa
        if (phieu.TrangThai != TrangThaiPhieuNhap.Nhap)
        {
            throw new XungDotDuLieuException("PHIEU_KHONG_CON_NHAP", 
                $"Phiếu nhập đang ở trạng thái '{phieu.TrangThai}', không thể chỉnh sửa hoặc hủy.");
        }

        // 2. Kiểm tra vai trò: Quản trị viên sửa được mọi phiếu nháp; Nhân viên chỉ sửa phiếu do chính mình lập
        var taiKhoan = await _context.TaiKhoans.FindAsync(new object[] { maTaiKhoan }, ct);
        if (taiKhoan == null)
            throw new KhongCoQuyenException("Không tìm thấy thông tin tài khoản người thực hiện.");

        if (taiKhoan.VaiTro == "QuanTriVien")
            return;

        var nhanVien = await LayNhanVienDangLamViecAsync(maTaiKhoan, ct);
        if (phieu.MaNguoiLap != nhanVien.MaNhanVien)
        {
            throw new KhongCoQuyenException("Bạn chỉ có quyền sửa hoặc hủy phiếu nhập nháp do chính mình tạo.");
        }
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
