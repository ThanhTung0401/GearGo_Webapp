using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Exceptions;
using GearGo.Models.Common;
using GearGo.Models.DTOs.ChuanBiDon;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.DTOs.ThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using GearGo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.DonThue;

public partial class ChuanBiDonService
{
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
            var don = await _db.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn thuê #{donId}.");
            if (don.TrangThai != TrangThaiDonThue.DangChuanBi)
                throw new TrangThaiKhongHopLeException($"Đơn phải ở trạng thái DangChuanBi để gán thiết bị. Hiện tại: {don.TrangThai}.");

            var dong = don.ChiTietDonThues.FirstOrDefault(c => c.MaChiTietDon == request.DongDonId)
                ?? throw new KhongTimThayException($"Dòng đặt #{request.DongDonId} không thuộc đơn #{donId}.");

            var soDaPhanCong = await _db.PhanCongThietBis
                .CountAsync(pc => pc.MaChiTietDon == dong.MaChiTietDon && pc.TrangThai == "DaPhanCong", ct);
            if (soDaPhanCong + request.ThietBiIds.Count > dong.SoLuong)
                throw new XungDotDuLieuException("PHAN_CONG_VUOT_SO_LUONG",
                    $"Số lượng gán ({soDaPhanCong + request.ThietBiIds.Count}) vượt quá số lượng đặt ({dong.SoLuong}).",
                    new { CanGan = dong.SoLuong, DaGan = soDaPhanCong, CoTheGanThem = dong.SoLuong - soDaPhanCong });

            var daGanTrongDon = await _db.PhanCongThietBis
                .Where(pc => pc.ChiTietDon.MaDonThue == donId && pc.TrangThai == "DaPhanCong")
                .Select(pc => pc.MaThietBi).ToListAsync(ct);
            var trungTrongDon = request.ThietBiIds.Intersect(daGanTrongDon).ToList();
            if (trungTrongDon.Any())
                throw new XungDotDuLieuException("PHAN_CONG_VUOT_SO_LUONG", $"Thiết bị đã được gán trong đơn này: {string.Join(", ", trungTrongDon)}.");

            var phanCongsMoi = new List<PhanCongThietBi>();
            // Duyệt theo thứ tự ID tăng dần để tránh deadlock khi khóa thiết bị.
            foreach (var thietBiId in request.ThietBiIds.Order())
            {
                await KiemTraThietBiHopLeChoDongAsync(don, dong, thietBiId, null, ct);
                phanCongsMoi.Add(new PhanCongThietBi
                {
                    MaChiTietDon = dong.MaChiTietDon, MaThietBi = thietBiId,
                    MaNguoiPhanCong = nhanVien.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow, TrangThai = "DaPhanCong"
                });
            }

            _db.PhanCongThietBis.AddRange(phanCongsMoi);
            await _db.SaveChangesAsync(ct);
            _lichSuService.GhiNhatKyThaoTac(new GhiNhatKyCommand(
                maTaiKhoan, "PhanCongThietBi", "DonThue", donId.ToString(), null,
                new { request.DongDonId, request.ThietBiIds }, $"Phân công {phanCongsMoi.Count} thiết bị cho dòng đơn #{request.DongDonId}"));
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, await TaiPhanCongHieuLucAsync(donId, ct)));
        }
        catch { await tx.RollbackAsync(ct); throw; }
    }

    public async Task<Result<ChuanBiResponse>> HuyPhanCongAsync(
        long donId, long phanCongId, HuyPhanCongRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Lý do hủy phân công là bắt buộc.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");
            if (don.TrangThai != TrangThaiDonThue.DangChuanBi && don.TrangThai != TrangThaiDonThue.SanSangNhan)
                throw new TrangThaiKhongHopLeException($"Không thể hủy phân công khi đơn ở trạng thái {don.TrangThai}.");

            var phanCong = await _db.PhanCongThietBis.FirstOrDefaultAsync(pc => pc.MaPhanCong == phanCongId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy phân công #{phanCongId}.");
            if (!don.ChiTietDonThues.Any(c => c.MaChiTietDon == phanCong.MaChiTietDon))
                throw new PhanCongKhongThuocDonException($"Phân công #{phanCongId} không thuộc đơn #{donId}.");
            if (phanCong.TrangThai != "DaPhanCong")
                throw new TrangThaiKhongHopLeException($"Phân công #{phanCongId} đã bị hủy trước đó.");

            phanCong.TrangThai = "DaHuy";
            phanCong.MaNguoiHuyPhanCong = nhanVien.MaNhanVien;
            phanCong.ThoiDiemHuyPhanCong = DateTime.UtcNow;
            phanCong.LyDoHuyPhanCong = request.LyDo;

            await CapNhatPhieuBanGiaoNhapKhiDoiPhanCongAsync(donId, phanCongId, null, ct);
            HaTrangThaiSanSangVeDangChuanBi(don, maTaiKhoan, $"Hủy phân công #{phanCongId}: {request.LyDo}");

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, await TaiPhanCongHieuLucAsync(donId, ct)));
        }
        catch { await tx.RollbackAsync(ct); throw; }
    }

    public async Task<Result<ChuanBiResponse>> ThayTheThietBiAsync(
        long donId, long phanCongId, ThayTheRequest request, long maTaiKhoan, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            throw new DuLieuKhongHopLeException("DU_LIEU_KHONG_HOP_LE", "Lý do thay thế là bắt buộc.");

        var nhanVien = await LayNhanVienAsync(maTaiKhoan, ct);
        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        try
        {
            var don = await _db.DonThues.Include(d => d.ChiTietDonThues).ThenInclude(c => c.SanPham)
                .FirstOrDefaultAsync(d => d.MaDonThue == donId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy đơn #{donId}.");
            if (don.TrangThai != TrangThaiDonThue.DangChuanBi && don.TrangThai != TrangThaiDonThue.SanSangNhan)
                throw new TrangThaiKhongHopLeException($"Không thể thay thiết bị khi đơn ở trạng thái {don.TrangThai}.");

            var phanCongCu = await _db.PhanCongThietBis.FirstOrDefaultAsync(pc => pc.MaPhanCong == phanCongId, ct)
                ?? throw new KhongTimThayException($"Không tìm thấy phân công #{phanCongId}.");
            var dong = don.ChiTietDonThues.FirstOrDefault(c => c.MaChiTietDon == phanCongCu.MaChiTietDon)
                ?? throw new PhanCongKhongThuocDonException($"Phân công #{phanCongId} không thuộc đơn #{donId}.");
            if (phanCongCu.TrangThai != "DaPhanCong")
                throw new TrangThaiKhongHopLeException($"Phân công #{phanCongId} đã bị hủy, không thể thay thế.");

            await KiemTraThietBiHopLeChoDongAsync(don, dong, request.ThietBiMoiId, phanCongId, ct);

            phanCongCu.TrangThai = "DaHuy";
            phanCongCu.MaNguoiHuyPhanCong = nhanVien.MaNhanVien;
            phanCongCu.ThoiDiemHuyPhanCong = DateTime.UtcNow;
            phanCongCu.LyDoHuyPhanCong = $"[Thay thế] {request.LyDo}";
            HaTrangThaiSanSangVeDangChuanBi(don, maTaiKhoan, $"Thay thế thiết bị phân công #{phanCongId}: {request.LyDo}");

            var phanCongMoi = new PhanCongThietBi
            {
                MaChiTietDon = dong.MaChiTietDon, MaThietBi = request.ThietBiMoiId,
                MaNguoiPhanCong = nhanVien.MaNhanVien, ThoiDiemPhanCong = DateTime.UtcNow, TrangThai = "DaPhanCong"
            };
            _db.PhanCongThietBis.Add(phanCongMoi);
            await _db.SaveChangesAsync(ct);

            await CapNhatPhieuBanGiaoNhapKhiDoiPhanCongAsync(donId, phanCongId, phanCongMoi.MaPhanCong, ct);
            _lichSuService.GhiNhatKyThaoTac(new GhiNhatKyCommand(
                maTaiKhoan, "ThayTheThietBi", "PhanCongThietBi", phanCongId.ToString(),
                new { MaThietBiCu = phanCongCu.MaThietBi },
                new { MaPhanCongMoi = phanCongMoi.MaPhanCong, MaThietBiMoi = request.ThietBiMoiId }, request.LyDo));
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return Result<ChuanBiResponse>.Ok(XayDungResponse(don, await TaiPhanCongHieuLucAsync(donId, ct)));
        }
        catch { await tx.RollbackAsync(ct); throw; }
    }

    private async Task KiemTraThietBiHopLeChoDongAsync(
        Models.Entities.DonThue don, ChiTietDonThue dong, long thietBiId, long? maPhanCongLoaiTru, CancellationToken ct)
    {
        var thietBi = await _db.ThietBis.FirstOrDefaultAsync(t => t.MaThietBi == thietBiId, ct)
            ?? throw new KhongTimThayException(maPhanCongLoaiTru.HasValue ? $"Không tìm thấy thiết bị mới #{thietBiId}." : $"Không tìm thấy thiết bị #{thietBiId}.");

        if (thietBi.MaSanPhamHienTai != dong.MaSanPham)
            throw new XungDotDuLieuException("SAI_SAN_PHAM_THIET_BI",
                maPhanCongLoaiTru.HasValue
                    ? $"Thiết bị mới #{thietBiId} không khớp sản phẩm dòng đơn."
                    : $"Thiết bị #{thietBiId} (SP#{thietBi.MaSanPhamHienTai}) không khớp dòng đơn (SP#{dong.MaSanPham}).");

        if (thietBi.TrangThaiSuDung != TrangThaiThietBi.SanSang)
            throw new XungDotDuLieuException("THIET_BI_CHUA_SAN_SANG",
                maPhanCongLoaiTru.HasValue
                    ? $"Thiết bị mới #{thietBiId} không ở trạng thái SanSang."
                    : $"Thiết bị #{thietBiId} không ở trạng thái SanSang (hiện: {thietBi.TrangThaiSuDung}).");

        var lich = await _thietBiService.KiemTraLichThietBiAsync(new KiemTraLichRequest
        {
            MaThietBi = thietBiId, GioNhan = don.GioNhanDuKien, GioTra = don.GioTraDuKien,
            MaPhanCongLoaiTru = maPhanCongLoaiTru
        });
        if (lich.DuLieu != null && !lich.DuLieu.DuDieuKien)
            throw new XungDotDuLieuException("THIET_BI_XUNG_DOT_LICH",
                $"{(maPhanCongLoaiTru.HasValue ? "Thiết bị mới" : $"Thiết bị #{thietBiId}")} bị xung đột lịch: {string.Join("; ", lich.DuLieu.LyDo)}",
                lich.DuLieu.ChungTuXungDot);
    }

    private async Task CapNhatPhieuBanGiaoNhapKhiDoiPhanCongAsync(
        long donId, long phanCongCuId, long? phanCongMoiId, CancellationToken ct)
    {
        var phieuBgNhap = await _db.PhieuBanGiaos.Include(p => p.ChiTietBanGiaos)
            .FirstOrDefaultAsync(p => p.MaDonThue == donId && p.TrangThai == "ChoGiao", ct);
        if (phieuBgNhap == null) return;

        var chiTietCu = phieuBgNhap.ChiTietBanGiaos.Where(ctbg => ctbg.MaPhanCong == phanCongCuId).ToList();
        if (!chiTietCu.Any()) return;

        if (phanCongMoiId.HasValue)
            chiTietCu.ForEach(c => c.MaPhanCong = phanCongMoiId.Value);
        else
            _db.ChiTietBanGiaos.RemoveRange(chiTietCu);

        // Vô hiệu hóa xác nhận cũ của khách khi danh sách thiết bị thay đổi.
        phieuBgNhap.ThoiDiemKhachXacNhan = null;
        phieuBgNhap.BangChungXacNhan = null;
        if (phanCongMoiId.HasValue) await _db.SaveChangesAsync(ct);
    }

    private void HaTrangThaiSanSangVeDangChuanBi(Models.Entities.DonThue don, long maTaiKhoan, string lyDo)
    {
        if (don.TrangThai != TrangThaiDonThue.SanSangNhan) return;
        don.TrangThai = TrangThaiDonThue.DangChuanBi;
        _db.LichSuTrangThaiDons.Add(new LichSuTrangThaiDon
        {
            MaDonThue = don.MaDonThue, MaNguoiThucHien = maTaiKhoan,
            TrangThaiTruoc = TrangThaiDonThue.SanSangNhan.ToString(),
            TrangThaiSau = TrangThaiDonThue.DangChuanBi.ToString(),
            ThoiDiem = DateTime.UtcNow, LyDo = lyDo
        });
    }
}
