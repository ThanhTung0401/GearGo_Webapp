using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.Kho;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class KhoService
{
    public async Task<Result<DoiChieuKiemKeResponse>> LayDoiChieuKiemKeAsync(DoiChieuKiemKeRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<DoiChieuKiemKeResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);
        if (request.DanhSachMaQuet == null)
            return Result<DoiChieuKiemKeResponse>.Loi(DomainConstants.Errors.InvalidData, "Danh sách mã quét không được null.");

        var baseQuery = _context.ThietBis.AsNoTracking().Include(tb => tb.SanPhamHienTai).AsQueryable();
        if (request.PhamViMaSanPham != null && request.PhamViMaSanPham.Count > 0)
            baseQuery = baseQuery.Where(tb => request.PhamViMaSanPham.Contains(tb.MaSanPhamHienTai));

        var allScopedDevices = await baseQuery.ToListAsync();
        var expectedInWarehouse = allScopedDevices.Where(tb => tb.TrangThaiSuDung == TrangThaiThietBi.SanSang).ToList();
        var expectedMap = expectedInWarehouse.ToDictionary(tb => tb.MaThietBiHienThi.Trim(), tb => tb, StringComparer.OrdinalIgnoreCase);

        // Thiết bị đang thuê hoặc đang bảo trì ngoài kho không tính là thiếu tại kho.
        var outsideDevices = allScopedDevices
            .Where(tb => tb.TrangThaiSuDung is TrangThaiThietBi.DangThue or TrangThaiThietBi.DangBaoTri)
            .Select(tb => new ThietBiNgoaiKhoDto
            {
                MaThietBi = tb.MaThietBi, MaThietBiHienThi = tb.MaThietBiHienThi,
                TenSanPham = tb.SanPhamHienTai?.TenSanPham ?? "", LyDoNgoaiKho = tb.TrangThaiSuDung.ToString()
            }).ToList();

        var rawScans = request.DanhSachMaQuet.Select(m => (m ?? "").Trim()).Where(m => !string.IsNullOrEmpty(m)).ToList();
        var duplicateScans = rawScans.GroupBy(m => m, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1).Select(g => $"{g.Key} (quét {g.Count()} lần)").ToList();
        var distinctScans = new HashSet<string>(rawScans, StringComparer.OrdinalIgnoreCase);

        var allSystemCodes = await _context.ThietBis.AsNoTracking().Select(tb => tb.MaThietBiHienThi).ToListAsync();
        var systemCodeSet = new HashSet<string>(allSystemCodes.Select(c => c.Trim()), StringComparer.OrdinalIgnoreCase);

        return Result<DoiChieuKiemKeResponse>.Ok(new DoiChieuKiemKeResponse
        {
            ThoiDiemDoiChieu = request.ThoiDiemKiemKe,
            TongSoKyVongTaiKho = expectedInWarehouse.Count,
            TongSoQuetThucTe = distinctScans.Count,
            DanhSachKhop = distinctScans.Where(expectedMap.ContainsKey).ToList(),
            DanhSachThieu = expectedInWarehouse
                .Where(tb => !distinctScans.Contains(tb.MaThietBiHienThi.Trim()))
                .Select(tb => new ThietBiThieuDto
                {
                    MaThietBi = tb.MaThietBi, MaThietBiHienThi = tb.MaThietBiHienThi,
                    TenSanPham = tb.SanPhamHienTai?.TenSanPham ?? "", TinhTrang = tb.TinhTrang
                }).ToList(),
            DanhSachQuetTrung = duplicateScans,
            DanhSachMaLa = distinctScans.Where(code => !systemCodeSet.Contains(code)).ToList(),
            DanhSachDangLuuHanhNgoaiKho = outsideDevices
        });
    }

    public async Task<Result<PhanTichAnhHuongResponse>> PhanTichAnhHuongAsync(PhanTichAnhHuongRequest request, long actorId)
    {
        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong) return Result<PhanTichAnhHuongResponse>.Loi(nvCheck.MaLoi!, nvCheck.ThongDiep!);

        var thietBi = await _context.ThietBis.AsNoTracking().Include(tb => tb.SanPhamHienTai)
            .FirstOrDefaultAsync(tb => tb.MaThietBi == request.MaThietBi);
        if (thietBi == null)
            return Result<PhanTichAnhHuongResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");

        var res = new PhanTichAnhHuongResponse { CoTheApDungHienTai = true };
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
        {
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add("Thiết bị đang được khách thuê (chưa thu hồi tại kho).");
        }

        if (request.LoaiThayDoi == DomainConstants.Lifecycle.Decommission)
        {
            bool coBaoTriMo = await _context.PhieuBaoTris.AnyAsync(p =>
                p.MaThietBi == thietBi.MaThietBi &&
                (p.TrangThai == DomainConstants.Status.PendingProcessing ||
                 p.TrangThai == DomainConstants.Status.InProgress ||
                 p.TrangThai == DomainConstants.Status.PendingInspection));
            if (coBaoTriMo)
            {
                res.CoTheApDungHienTai = false;
                res.VuongMac.Add("Thiết bị đang có phiếu bảo trì mở chưa hoàn thành; phải kết thúc phiếu bảo trì trước khi ngừng sử dụng.");
            }
        }

        var camKetCuThe = await _context.PhanCongThietBis
            .Include(pc => pc.ChiTietDon).ThenInclude(ct => ct.DonThue)
            .Where(pc => pc.MaThietBi == thietBi.MaThietBi && pc.TrangThai == DomainConstants.Status.Assigned &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(pc => pc.ChiTietDon.DonThue.MaDonHienThi ?? pc.ChiTietDon.MaDonThue.ToString())
            .Distinct().ToListAsync();

        if (camKetCuThe.Count > 0)
        {
            res.CamKetCuThe.AddRange(camKetCuThe);
            res.CoTheApDungHienTai = false;
            res.VuongMac.Add($"Thiết bị đã được phân công đích danh cho các đơn: {string.Join(", ", camKetCuThe)}.");
        }

        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.SanSang && _khaDungService != null)
            await KiemTraCamKetSoLuongAsync(thietBi, res);

        return Result<PhanTichAnhHuongResponse>.Ok(res);
    }

    private async Task KiemTraCamKetSoLuongAsync(ThietBi thietBi, PhanTichAnhHuongResponse res)
    {
        var donTuongLai = await _context.ChiTietDonThues.Include(ct => ct.DonThue)
            .Where(ct => ct.MaSanPham == thietBi.MaSanPhamHienTai &&
                         (ct.DonThue.TrangThai == TrangThaiDonThue.ChoThanhToan ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          ct.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan))
            .Select(ct => new
            {
                ct.MaDonThue,
                MaDonHienThi = ct.DonThue.MaDonHienThi ?? ct.MaDonThue.ToString(),
                ct.DonThue.GioNhanDuKien, ct.DonThue.GioTraDuKien
            }).Distinct().ToListAsync();

        foreach (var don in donTuongLai)
        {
            // SA-05: Bỏ qua các đơn đã qua giờ trả (không còn tranh chấp kho),
            // và kẹp startCheck = Max(don.GioNhanDuKien, UtcNow) để các đơn cũ
            // quá giờ nhận không làm KhaDungService.LayKhaDungNhieu trả về 0
            // (chặn duyệt oan mọi phiếu điều chỉnh giảm kho).
            if (don.GioTraDuKien <= DateTime.UtcNow) continue;
            var startCheck = don.GioNhanDuKien < DateTime.UtcNow ? DateTime.UtcNow : don.GioNhanDuKien;
            var khaDungMap = await _khaDungService!.LayKhaDungNhieuAsync(
                new List<long> { thietBi.MaSanPhamHienTai }, startCheck, don.GioTraDuKien);
            int khaDungConLai = khaDungMap.TryGetValue(thietBi.MaSanPhamHienTai, out int sl) ? sl : 0;
            if (khaDungConLai < 1)
            {
                res.CoTheApDungHienTai = false;
                res.ThieuSoLuongTheoLich.Add(
                    $"Đơn {don.MaDonHienThi} ({don.GioNhanDuKien:yyyy-MM-dd} -> {don.GioTraDuKien:yyyy-MM-dd}) sẽ bị thiếu hàng nếu giảm nguồn sản phẩm #{thietBi.MaSanPhamHienTai}.");
            }
        }
    }
}
