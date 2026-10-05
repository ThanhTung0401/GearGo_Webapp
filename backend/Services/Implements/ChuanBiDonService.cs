using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Data;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements;

/// <summary>
/// Service chuẩn bị đơn và phân công thiết bị (W3-T7 - Kim Xuyến)
/// </summary>
public class ChuanBiDonService : IChuanBiDonService
{
    private readonly ApplicationDbContext _db;
    private readonly IThietBiService _thietBiService;

    // TODO: Inject ILichSuNghiepVuService và IThongBaoService khi Thanh Tùng bàn giao interface
    // private readonly ILichSuNghiepVuService _lichSuService;
    // private readonly IThongBaoService _thongBaoService;

    public ChuanBiDonService(ApplicationDbContext db, IThietBiService thietBiService)
    {
        _db = db;
        _thietBiService = thietBiService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET: Tình trạng chuẩn bị
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> LayTinhTrangChuanBiAsync(
        long donId, long maTaiKhoan, CancellationToken ct = default)
    {
        var don = await _db.DonThues
            .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
            .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
            ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

        var phanCongs = await _db.PhanCongThietBis
            .Include(pc => pc.ThietBi)
            .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
            .ToListAsync(ct);

        return Result<ChuanBiResponse>.Ok(XayDungResponse(don, phanCongs));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST: Bắt đầu chuẩn bị (DaXacNhan → DangChuanBi)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> BatDauChuanBiAsync(
        long donId, long maTaiKhoan, CancellationToken ct = default)
    {
        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DaXacNhan)
                throw new TrangThaiKhongHopLeException(
                    $"Chỉ bắt đầu chuẩn bị được đơn ở trạng thái DaXacNhan. Hiện tại: {don.TrangThai}.");

            don.TrangThai = TrangThaiDonThue.DangChuanBi;

            // Ghi lịch sử chuyển trạng thái đơn (Mục 10.0, W3-T2)
            _db.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donId,
                MaNguoiThucHien = maTaiKhoan,
                TrangThaiTruoc = TrangThaiDonThue.DaXacNhan.ToString(),
                TrangThaiSau = TrangThaiDonThue.DangChuanBi.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = "Bắt đầu chuẩn bị đơn thuê"
            });

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, new List<PhanCongThietBi>()));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST: Gán thiết bị vào dòng đơn
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> GanThietBiAsync(
        long donId, GanThietBiRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (request.ThietBiIds == null || !request.ThietBiIds.Any())
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Danh sách thiết bị không được rỗng.");

        if (request.ThietBiIds.Distinct().Count() != request.ThietBiIds.Count)
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Danh sách thiết bị có mã trùng nhau.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            // Tải đơn kèm dòng đặt
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DangChuanBi)
                throw new TrangThaiKhongHopLeException(
                    $"Đơn phải ở trạng thái DangChuanBi để gán thiết bị. Hiện tại: {don.TrangThai}.");

            // Kiểm tra dòng đặt thuộc đơn
            var dong = don.ChiTietDonThues.FirstOrDefault(c => c.MaChiTietDon == request.DongDonId)
                ?? throw new KhongTimThayException($"Dòng đặt #{request.DongDonId} không thuộc đơn #{donId}.");

            // Đếm số đã gán hiệu lực của dòng hiện tại
            var soDaPhanCong = await _db.PhanCongThietBis
                .CountAsync(pc => pc.MaChiTietDon == dong.MaChiTietDon && pc.TrangThai == "DaPhanCong", ct);

            if (soDaPhanCong + request.ThietBiIds.Count > dong.SoLuong)
                throw new XungDotDuLieuException("PHAN_CONG_VUOT_SO_LUONG",
                    $"Số lượng gán ({soDaPhanCong + request.ThietBiIds.Count}) vượt quá số lượng đặt ({dong.SoLuong}).",
                    new { CanGan = dong.SoLuong, DaGan = soDaPhanCong, CoTheGanThem = dong.SoLuong - soDaPhanCong });

            // Chống gán trùng thiết bị trong cùng đơn
            var daGanTrongDon = await _db.PhanCongThietBis
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .Select(pc => pc.MaThietBi)
                .ToListAsync(ct);

            var trungTrongDon = request.ThietBiIds.Intersect(daGanTrongDon).ToList();
            if (trungTrongDon.Any())
                throw new XungDotDuLieuException("PHAN_CONG_VUOT_SO_LUONG",
                    $"Thiết bị đã được gán trong đơn này: {string.Join(", ", trungTrongDon)}.");

            // Xử lý từng thiết bị theo thứ tự ID tăng dần (tránh deadlock)
            var phanCongsMoi = new List<PhanCongThietBi>();
            foreach (var thietBiId in request.ThietBiIds.Order())
            {
                var thietBi = await _db.ThietBis
                    .FirstOrDefaultAsync(t => t.MaThietBi == thietBiId, ct)
                    ?? throw new KhongTimThayException($"Không tìm thấy thiết bị #{thietBiId}.");

                // Đúng sản phẩm hiện tại (ERD: ma_san_pham_hien_tai)
                if (thietBi.MaSanPhamHienTai != dong.MaSanPham)
                    throw new XungDotDuLieuException("SAI_SAN_PHAM_THIET_BI",
                        $"Thiết bị #{thietBiId} (SP#{thietBi.MaSanPhamHienTai}) không khớp dòng đơn (SP#{dong.MaSanPham}).");

                // Trạng thái phải SanSang
                if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                    throw new XungDotDuLieuException("THIET_BI_CHUA_SAN_SANG",
                        $"Thiết bị #{thietBiId} không ở trạng thái SanSang (hiện: {thietBi.TrangThaiSuDung}).");

                // Kiểm tra lịch xung đột qua service Minh Tú
                var lich = await _thietBiService.KiemTraLichThietBiAsync(new KiemTraLichRequest
                {
                    MaThietBi = thietBiId,
                    GioNhan = don.GioNhanDuKien,
                    GioTra = don.GioTraDuKien,
                    MaPhanCongLoaiTru = null
                });

                if (lich.DuLieu != null && !lich.DuLieu.DuDieuKien)
                    throw new XungDotDuLieuException("THIET_BI_XUNG_DOT_LICH",
                        $"Thiết bị #{thietBiId} bị xung đột lịch: {string.Join("; ", lich.DuLieu.LyDo)}",
                        lich.DuLieu.ChungTuXungDot);

                phanCongsMoi.Add(new PhanCongThietBi
                {
                    MaChiTietDon = dong.MaChiTietDon,
                    MaThietBi = thietBiId,
                    MaNguoiPhanCong = nhanVien.MaNhanVien,
                    ThoiDiemPhanCong = DateTime.UtcNow,
                    TrangThai = "DaPhanCong"
                });
            }

            _db.PhanCongThietBis.AddRange(phanCongsMoi);
            await _db.SaveChangesAsync(ct);

            // TODO: Ghi lịch sử khi Thanh Tùng bàn giao

            await tx.CommitAsync(ct);

            var tatCa = await _db.PhanCongThietBis
                .Include(pc => pc.ThietBi)
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .ToListAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, tatCa));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST: Hủy phân công
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> HuyPhanCongAsync(
        long donId, long phanCongId, HuyPhanCongRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Lý do hủy phân công là bắt buộc.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DangChuanBi && don.TrangThai != TrangThaiDonThue.SanSangNhan)
                throw new TrangThaiKhongHopLeException($"Không thể hủy phân công khi đơn ở trạng thái {don.TrangThai}.");

            // Kiểm tra phân công thuộc đúng đơn
            var phanCong = await _db.PhanCongThietBis
                .FirstOrDefaultAsync(pc => pc.MaPhanCong == phanCongId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy phân công #{phanCongId}.");

            if (!don.ChiTietDonThues.Any(c => c.MaChiTietDon == phanCong.MaChiTietDon))
                throw new PhanCongKhongThuocDonException($"Phân công #{phanCongId} không thuộc đơn #{donId}.");

            if (phanCong.TrangThai != "DaPhanCong")
                throw new TrangThaiKhongHopLeException($"Phân công #{phanCongId} đã bị hủy trước đó.");

            // Ghi hủy — giữ bản ghi, không xóa
            phanCong.TrangThai = "DaHuy";
            phanCong.MaNguoiHuyPhanCong = nhanVien.MaNhanVien;
            phanCong.ThoiDiemHuyPhanCong = DateTime.UtcNow;
            phanCong.LyDoHuyPhanCong = request.LyDo;

            // Xử lý phiếu bàn giao nháp (W3-T7 & W3-T8): nếu có phiếu bàn giao nháp ("ChoGiao")
            // tham chiếu phân công này, cần xóa chi tiết bàn giao và vô hiệu hóa xác nhận cũ của khách
            var phieuBanGiaoNhapHuy = await _db.PhieuBanGiaos
                .Include(p => p.ChiTietBanGiaos)
                .FirstOrDefaultAsync(p => p.MaDonThue == donId && p.TrangThai == "ChoGiao", ct);

            if (phieuBanGiaoNhapHuy != null)
            {
                var chiTietCanXoa = phieuBanGiaoNhapHuy.ChiTietBanGiaos
                    .Where(ctbg => ctbg.MaPhanCong == phanCongId)
                    .ToList();
                if (chiTietCanXoa.Any())
                {
                    _db.ChiTietBanGiaos.RemoveRange(chiTietCanXoa);
                    phieuBanGiaoNhapHuy.ThoiDiemKhachXacNhan = null;
                    phieuBanGiaoNhapHuy.BangChungXacNhan = null;
                }
            }

            // Nếu đơn SanSangNhan → quay về DangChuanBi (Mục 10.0: đơn sẵn sàng đổi thiết bị phải quay về kiểm tra)
            if (don.TrangThai == TrangThaiDonThue.SanSangNhan)
            {
                don.TrangThai = TrangThaiDonThue.DangChuanBi;
                _db.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
                {
                    MaDonThue = donId,
                    MaNguoiThucHien = maTaiKhoan,
                    TrangThaiTruoc = TrangThaiDonThue.SanSangNhan.ToString(),
                    TrangThaiSau = TrangThaiDonThue.DangChuanBi.ToString(),
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = $"Hủy phân công #{phanCongId}: {request.LyDo}"
                });
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            var tatCa = await _db.PhanCongThietBis
                .Include(pc => pc.ThietBi)
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .ToListAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, tatCa));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST: Thay thế thiết bị (hủy cũ + tạo mới trong 1 transaction)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> ThayTheThietBiAsync(
        long donId, long phanCongId, ThayTheRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Lý do thay thế là bắt buộc.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DangChuanBi && don.TrangThai != TrangThaiDonThue.SanSangNhan)
                throw new TrangThaiKhongHopLeException($"Không thể thay thiết bị khi đơn ở trạng thái {don.TrangThai}.");

            // Lấy phân công cũ và kiểm tra thuộc đơn
            var phanCongCu = await _db.PhanCongThietBis
                .FirstOrDefaultAsync(pc => pc.MaPhanCong == phanCongId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy phân công #{phanCongId}.");

            var dong = don.ChiTietDonThues.FirstOrDefault(c => c.MaChiTietDon == phanCongCu.MaChiTietDon)
                ?? throw new PhanCongKhongThuocDonException($"Phân công #{phanCongId} không thuộc đơn #{donId}.");

            if (phanCongCu.TrangThai != "DaPhanCong")
                throw new TrangThaiKhongHopLeException($"Phân công #{phanCongId} đã bị hủy, không thể thay thế.");

            // Kiểm tra thiết bị mới
            var thietBiMoi = await _db.ThietBis
                .FirstOrDefaultAsync(t => t.MaThietBi == request.ThietBiMoiId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy thiết bị mới #{request.ThietBiMoiId}.");

            if (thietBiMoi.MaSanPhamHienTai != dong.MaSanPham)
                throw new XungDotDuLieuException("SAI_SAN_PHAM_THIET_BI",
                    $"Thiết bị mới #{request.ThietBiMoiId} không khớp sản phẩm dòng đơn.");

            if (thietBiMoi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                throw new XungDotDuLieuException("THIET_BI_CHUA_SAN_SANG",
                    $"Thiết bị mới #{request.ThietBiMoiId} không ở trạng thái SanSang.");

            // Kiểm tra lịch thiết bị mới — loại trừ chính phân công đang thay
            var lich = await _thietBiService.KiemTraLichThietBiAsync(new KiemTraLichRequest
            {
                MaThietBi = request.ThietBiMoiId,
                GioNhan = don.GioNhanDuKien,
                GioTra = don.GioTraDuKien,
                MaPhanCongLoaiTru = phanCongId
            });

            if (lich.DuLieu != null && !lich.DuLieu.DuDieuKien)
                throw new XungDotDuLieuException("THIET_BI_XUNG_DOT_LICH",
                    $"Thiết bị mới bị xung đột lịch: {string.Join("; ", lich.DuLieu.LyDo)}",
                    lich.DuLieu.ChungTuXungDot);

            // Hủy phân công cũ (không xóa)
            phanCongCu.TrangThai = "DaHuy";
            phanCongCu.MaNguoiHuyPhanCong = nhanVien.MaNhanVien;
            phanCongCu.ThoiDiemHuyPhanCong = DateTime.UtcNow;
            phanCongCu.LyDoHuyPhanCong = $"[Thay thế] {request.LyDo}";

            // Đơn SanSangNhan → quay về DangChuanBi trước khi gán chiếc mới
            if (don.TrangThai == TrangThaiDonThue.SanSangNhan)
            {
                don.TrangThai = TrangThaiDonThue.DangChuanBi;
                _db.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
                {
                    MaDonThue = donId,
                    MaNguoiThucHien = maTaiKhoan,
                    TrangThaiTruoc = TrangThaiDonThue.SanSangNhan.ToString(),
                    TrangThaiSau = TrangThaiDonThue.DangChuanBi.ToString(),
                    ThoiDiem = DateTime.UtcNow,
                    LyDo = $"Thay thế thiết bị phân công #{phanCongId}: {request.LyDo}"
                });
            }

            // Tạo phân công mới
            var phanCongMoi = new PhanCongThietBi
            {
                MaChiTietDon = dong.MaChiTietDon,
                MaThietBi = request.ThietBiMoiId,
                MaNguoiPhanCong = nhanVien.MaNhanVien,
                ThoiDiemPhanCong = DateTime.UtcNow,
                TrangThai = "DaPhanCong"
            };
            _db.PhanCongThietBis.Add(phanCongMoi);
            await _db.SaveChangesAsync(ct);

            // Xử lý phiếu bàn giao nháp (W3-T7-A03): nếu có phiếu bàn giao nháp ("ChoGiao")
            // tham chiếu phân công cũ, cập nhật sang phân công mới và vô hiệu hóa xác nhận cũ của khách
            var phieuBanGiaoNhapThayThe = await _db.PhieuBanGiaos
                .Include(p => p.ChiTietBanGiaos)
                .FirstOrDefaultAsync(p => p.MaDonThue == donId && p.TrangThai == "ChoGiao", ct);

            if (phieuBanGiaoNhapThayThe != null)
            {
                var chiTietCu = phieuBanGiaoNhapThayThe.ChiTietBanGiaos
                    .FirstOrDefault(ctbg => ctbg.MaPhanCong == phanCongId);
                if (chiTietCu != null)
                {
                    chiTietCu.MaPhanCong = phanCongMoi.MaPhanCong;
                    phieuBanGiaoNhapThayThe.ThoiDiemKhachXacNhan = null;
                    phieuBanGiaoNhapThayThe.BangChungXacNhan = null;
                    await _db.SaveChangesAsync(ct);
                }
            }

            // TODO: Ghi lịch sử khi Thanh Tùng bàn giao

            await tx.CommitAsync(ct);

            var tatCa = await _db.PhanCongThietBis
                .Include(pc => pc.ThietBi)
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .ToListAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, tatCa));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST: Xác nhận sẵn sàng (DangChuanBi → SanSangNhan)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<Result<ChuanBiResponse>> XacNhanSanSangAsync(
        long donId, XacNhanSanSangRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues
                .Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");

            if (don.TrangThai != TrangThaiDonThue.DangChuanBi)
                throw new TrangThaiKhongHopLeException(
                    $"Chỉ xác nhận sẵn sàng được khi đơn ở DangChuanBi. Hiện tại: {don.TrangThai}.");

            // Load phân công hiệu lực sau khi đã vào transaction
            var phanCongs = await _db.PhanCongThietBis
                .Include(pc => pc.ThietBi)
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .ToListAsync(ct);

            // Kiểm tra từng dòng đặt
            var lyDoChuaDu = new List<string>();
            foreach (var chiTiet in don.ChiTietDonThues)
            {
                var pcsOfDong = phanCongs.Where(pc => pc.MaChiTietDon == chiTiet.MaChiTietDon).ToList();
                var soGan = pcsOfDong.Count;

                if (soGan < chiTiet.SoLuong)
                    lyDoChuaDu.Add($"Dòng '{chiTiet.TenSanPhamLucDat ?? $"#{chiTiet.MaChiTietDon}"}': cần {chiTiet.SoLuong}, mới gán {soGan}.");

                if (soGan > chiTiet.SoLuong)
                    lyDoChuaDu.Add($"Dòng '{chiTiet.TenSanPhamLucDat ?? $"#{chiTiet.MaChiTietDon}"}': gán thừa ({soGan}/{chiTiet.SoLuong}).");

                // Kiểm tra từng thiết bị còn đủ điều kiện
                foreach (var pc in pcsOfDong)
                {
                    if (pc.ThietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
                        lyDoChuaDu.Add($"Thiết bị #{pc.MaThietBi} không còn ở trạng thái SanSang ({pc.ThietBi.TrangThaiSuDung}).");

                    if (pc.ThietBi.MaSanPhamHienTai != chiTiet.MaSanPham)
                        lyDoChuaDu.Add($"Thiết bị #{pc.MaThietBi} không còn khớp sản phẩm dòng đơn.");
                }
            }

            if (lyDoChuaDu.Any())
                throw new KhongDuDieuKienSanSangException(
                    "Chưa đủ điều kiện xác nhận sẵn sàng: " + string.Join("; ", lyDoChuaDu), lyDoChuaDu);

            don.TrangThai = TrangThaiDonThue.SanSangNhan;

            // Ghi lịch sử chuyển trạng thái đơn (Mục 10.0)
            _db.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
            {
                MaDonThue = donId,
                MaNguoiThucHien = maTaiKhoan,
                TrangThaiTruoc = TrangThaiDonThue.DangChuanBi.ToString(),
                TrangThaiSau = TrangThaiDonThue.SanSangNhan.ToString(),
                ThoiDiem = DateTime.UtcNow,
                LyDo = request.GhiChu ?? "Đã chuẩn bị đủ thiết bị và sẵn sàng bàn giao"
            });

            // Ghi thông báo trong ứng dụng cho khách hàng (Mục 10.0, W3-T2)
            var khachHang = await _db.KhachHangs.FirstOrDefaultAsync(k => k.MaKhachHang == don.MaKhachHang, ct);
            if (khachHang != null)
            {
                _db.ThongBaos.Add(new ThongBao
                {
                    MaTaiKhoan = khachHang.MaTaiKhoan,
                    MaDonThue = donId,
                    MaSuKien = $"SAN_SANG_{donId}_{DateTime.UtcNow.Ticks}",
                    LoaiSuKien = "DonThueSanSang",
                    TieuDe = "Đơn thuê đã sẵn sàng nhận hàng",
                    NoiDung = $"Đơn thuê #{don.MaDonHienThi} của bạn đã được chuẩn bị đầy đủ thiết bị và sẵn sàng bàn giao.",
                    KenhGui = "InApp",
                    TrangThaiGui = "DaGui",
                    ThoiDiemTao = DateTime.UtcNow,
                    ThoiDiemGui = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, phanCongs));
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<NhanVien> LayNhanVienAsync(long maTaiKhoan, CancellationToken ct)
    {
        return await _db.NhanViens
            .FirstOrDefaultAsync(nv => nv.MaTaiKhoan == maTaiKhoan && nv.TrangThaiLamViec == "DangLamViec", ct)
            ?? throw new KhongCoQuyenException("Tài khoản không liên kết với nhân viên đang làm việc.");
    }

    private static ChuanBiResponse XayDungResponse(DonThue don, List<PhanCongThietBi> phanCongs)
    {
        var danhSachDong = don.ChiTietDonThues.Select(ct =>
        {
            var pcsOfDong = phanCongs.Where(pc => pc.MaChiTietDon == ct.MaChiTietDon).ToList();
            return new DongChuanBiResponse
            {
                MaChiTietDon = ct.MaChiTietDon,
                MaSanPham = ct.MaSanPham,
                TenSanPham = ct.TenSanPhamLucDat ?? $"Sản phẩm #{ct.MaSanPham}",
                SoLuongCanGan = ct.SoLuong,
                SoLuongDaGan = pcsOfDong.Count,
                SoLuongConThieu = Math.Max(0, ct.SoLuong - pcsOfDong.Count),
                DanhSachPhanCong = pcsOfDong.Select(pc => new PhanCongChiTietResponse
                {
                    MaPhanCong = pc.MaPhanCong,
                    MaThietBi = pc.MaThietBi,
                    MaThietBiHienThi = pc.ThietBi?.MaThietBiHienThi ?? string.Empty,
                    TrangThaiThietBi = pc.ThietBi?.TrangThaiSuDung.ToString() ?? string.Empty,
                    TrangThaiPhanCong = pc.TrangThai,
                    ThoiDiemGan = pc.ThoiDiemPhanCong,
                }).ToList()
            };
        }).ToList();

        var duDieuKien = danhSachDong.All(d => d.SoLuongConThieu == 0);
        var lyDo = danhSachDong
            .Where(d => d.SoLuongConThieu > 0)
            .Select(d => $"Dòng '{d.TenSanPham}': còn thiếu {d.SoLuongConThieu} thiết bị.")
            .ToList();

        return new ChuanBiResponse
        {
            MaDonThue = don.MaDonThue,
            TrangThaiDon = don.TrangThai.ToString(),
            DuDieuKienSanSang = duDieuKien,
            DanhSachDong = danhSachDong,
            LyDoChuaDuDieuKien = lyDo
        };
    }
}
