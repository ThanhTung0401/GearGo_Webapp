using System;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GearGo.Helpers;
using GearGo.Models.Common;
using GearGo.Models.DTOs.VongDoiThietBi;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Services.Implements.Kho;

public partial class VongDoiThietBiService
{
    public async Task<Result<DeNghiVongDoiResponse>> DeNghiGiangCapAsync(long thietBiId, DeNghiGiangCapRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.InvalidData, "Phải có lý do đề nghị giáng cấp.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis.AsNoTracking().FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);
            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");

            var spDich = await _context.SanPhams.FirstOrDefaultAsync(s => s.MaSanPham == request.MaSanPhamDich);
            if (spDich == null || spDich.TrangThaiKinhDoanh != TrangThaiKinhDoanh.DangKinhDoanh || spDich.MaSanPham == thietBi.MaSanPhamHienTai)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.TargetProductMismatch, "Sản phẩm đích không hợp lệ hoặc trùng sản phẩm hiện tại.");

            return await TaoDeNghiDieuChinhVongDoiInternalAsync(
                thietBiId, actorId, DomainConstants.Lifecycle.Downgrade, request.LyDo, request.BangChung,
                new { MaSanPhamHienTai = request.MaSanPhamDich, TinhTrang = request.TinhTrang, TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(), thietBi.MaChiTietPhieuNhap },
                $"Đề nghị giáng cấp từ SP #{thietBi.MaSanPhamHienTai} sang SP #{request.MaSanPhamDich}");
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<DeNghiVongDoiResponse>> DeNghiNgungSuDungAsync(long thietBiId, DeNghiNgungSuDungRequest request, long actorId)
    {
        if (string.IsNullOrWhiteSpace(request.LyDo))
            return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.InvalidData, "Phải có lý do đề nghị ngừng sử dụng.");

        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var thietBi = await _context.ThietBis.AsNoTracking().FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);
            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");
            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.NgungSuDung)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.InvalidState, "Thiết bị đã ở trạng thái Ngừng sử dụng.");

            return await TaoDeNghiDieuChinhVongDoiInternalAsync(
                thietBiId, actorId, DomainConstants.Lifecycle.Decommission, request.LyDo, request.BangChung,
                new { thietBi.MaSanPhamHienTai, TinhTrang = request.KetLuanKiemTra ?? thietBi.TinhTrang, TrangThaiSuDung = TrangThaiThietBi.NgungSuDung.ToString() },
                $"Đề nghị ngừng sử dụng thiết bị #{thietBi.MaThietBiHienThi}: {request.LyDo}");
        }, _logger, IsolationLevel.Serializable);
    }

    public async Task<Result<DeNghiVongDoiResponse>> DuyetDeNghiVongDoiAsync(long maPhieuDieuChinh, long actorId)
    {
        return await TransactionExecutionWrapper.ExecuteInTransactionAsync(_context, async () =>
        {
            var phieu = await _context.PhieuDieuChinhKhos.Include(p => p.ChiTietDieuChinhKhos)
                .FirstOrDefaultAsync(p => p.MaPhieuDieuChinh == maPhieuDieuChinh);
            if (phieu == null)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.ReceiptNotFound, "Không tìm thấy phiếu đề nghị điều chỉnh.");

            var chiTiet = phieu.ChiTietDieuChinhKhos.FirstOrDefault();
            if (chiTiet == null || !chiTiet.MaThietBi.HasValue)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.InvalidData, "Phiếu điều chỉnh không gắn thiết bị hợp lệ.");
            if (phieu.TrangThai == DomainConstants.Status.Applied)
                return Result<DeNghiVongDoiResponse>.Ok(MapDeNghiResponse(phieu, chiTiet.MaThietBi.Value));
            if (phieu.TrangThai == "TuChoi")
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.InvalidState, "Phiếu đề nghị đã bị từ chối, không thể duyệt áp dụng.");

            var thietBi = await _context.ThietBis.FirstOrDefaultAsync(tb => tb.MaThietBi == chiTiet.MaThietBi.Value);
            if (thietBi == null)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");
            if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered, "Thiết bị đang phục vụ khách, không thể duyệt áp dụng.");

            var anhHuong = await PhanTichCamKetThietBiAsync(thietBi, phieu.LoaiDieuChinh ?? DomainConstants.Lifecycle.Downgrade);
            if (!anhHuong.CoTheApDungHienTai || anhHuong.CamKetCuThe.Count > 0 || anhHuong.ThieuSoLuongTheoLich.Count > 0)
                return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.ChangeViolatesCommitment,
                    $"Không thể duyệt áp dụng do phát sinh thiếu cam kết: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}");

            var nvResult = await _context.LayNhanVienDangHoatDongAsync(actorId);
            if (!nvResult.ThanhCong)
                return Result<DeNghiVongDoiResponse>.Loi(nvResult.MaLoi!, "Không tìm thấy hồ sơ quản trị viên duyệt.");

            ApDungThayDoiVongDoiLenThietBi(phieu, chiTiet, thietBi, nvResult.DuLieu!, actorId);
            await _context.SaveChangesAsync();
            return Result<DeNghiVongDoiResponse>.Ok(MapDeNghiResponse(phieu, thietBi.MaThietBi));
        }, _logger, IsolationLevel.Serializable);
    }

    private void ApDungThayDoiVongDoiLenThietBi(
        PhieuDieuChinhKho phieu, ChiTietDieuChinhKho chiTiet, ThietBi thietBi, NhanVien nhanVien, long actorId)
    {
        var trangThaiCu = thietBi.TrangThaiSuDung;
        var tinhTrangCu = thietBi.TinhTrang;

        if (phieu.LoaiDieuChinh == DomainConstants.Lifecycle.Downgrade && !string.IsNullOrWhiteSpace(chiTiet.GiaTriSau))
        {
            using var doc = JsonDocument.Parse(chiTiet.GiaTriSau);
            if (doc.RootElement.TryGetProperty("MaSanPhamHienTai", out var spProp))
                thietBi.MaSanPhamHienTai = spProp.GetInt64();
            if (doc.RootElement.TryGetProperty("TinhTrang", out var ttProp) && ttProp.ValueKind == JsonValueKind.String)
                thietBi.TinhTrang = ttProp.GetString();
        }
        else if (phieu.LoaiDieuChinh == DomainConstants.Lifecycle.Decommission)
        {
            thietBi.TrangThaiSuDung = TrangThaiThietBi.NgungSuDung;
        }

        phieu.MaNguoiDuyet = nhanVien.MaNhanVien;
        phieu.TenNguoiDuyetLucDuyet = nhanVien.HoTen;
        phieu.ThoiDiemDuyet = DateTime.UtcNow;
        phieu.ThoiDiemApDung = DateTime.UtcNow;
        phieu.TrangThai = DomainConstants.Status.Applied;

        AuditLogHelper.GhiLichSuThietBi(_context, thietBi.MaThietBi, actorId, trangThaiCu.ToString(),
            thietBi.TrangThaiSuDung.ToString(), tinhTrangCu, thietBi.TinhTrang,
            $"Duyệt áp dụng vòng đời ({phieu.LoaiDieuChinh}) theo phiếu #{phieu.MaPhieuDieuChinh}: {phieu.LyDo}");
    }

    private async Task<Result<DeNghiVongDoiResponse>> TaoDeNghiDieuChinhVongDoiInternalAsync(
        long thietBiId, long actorId, string loaiThayDoi, string lyDo,
        string? bangChung, object giaTriSauPayload, string ghiChuChiTiet)
    {
        var thietBi = await _context.ThietBis.FirstOrDefaultAsync(tb => tb.MaThietBi == thietBiId);
        if (thietBi == null)
            return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotFound, "Không tìm thấy thiết bị.");
        if (thietBi.TrangThaiSuDung == TrangThaiThietBi.DangThue)
            return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.EquipmentNotRecovered,
                loaiThayDoi == DomainConstants.Lifecycle.Downgrade
                    ? "Thiết bị đang phục vụ khách hàng, chưa thể giáng cấp."
                    : "Thiết bị đang phục vụ khách hàng, không được ngừng sử dụng.");

        var anhHuong = await PhanTichCamKetThietBiAsync(thietBi, loaiThayDoi);
        if (!anhHuong.CoTheDeNghi || anhHuong.CamKetCuThe.Count > 0 || anhHuong.ThieuSoLuongTheoLich.Count > 0)
            return Result<DeNghiVongDoiResponse>.Loi(DomainConstants.Errors.ChangeViolatesCommitment,
                loaiThayDoi == DomainConstants.Lifecycle.Downgrade
                    ? $"Không thể giáng cấp do vướng cam kết đơn thuê: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}"
                    : $"Không thể ngừng sử dụng: {string.Join("; ", anhHuong.VuongMac.Concat(anhHuong.ThieuSoLuongTheoLich))}");

        var nvCheck = await _context.LayNhanVienDangHoatDongAsync(actorId);
        if (!nvCheck.ThanhCong)
            return Result<DeNghiVongDoiResponse>.Loi(nvCheck.MaLoi!, "Không tìm thấy hồ sơ nhân viên đề nghị.");
        var nhanVien = nvCheck.DuLieu!;

        var phieu = new PhieuDieuChinhKho
        {
            MaNguoiLap = nhanVien.MaNhanVien, TenNguoiLapLucLap = nhanVien.HoTen,
            LoaiDieuChinh = loaiThayDoi, LyDo = lyDo, BangChung = bangChung,
            ThoiDiemLap = DateTime.UtcNow, TrangThai = DomainConstants.Status.PendingApproval
        };
        _context.PhieuDieuChinhKhos.Add(phieu);
        _context.ChiTietDieuChinhKhos.Add(new ChiTietDieuChinhKho
        {
            PhieuDieuChinhKho = phieu, MaThietBi = thietBi.MaThietBi, MaChiTietPhieuNhap = thietBi.MaChiTietPhieuNhap,
            GiaTriTruoc = JsonSerializer.Serialize(new
            {
                thietBi.MaSanPhamHienTai, thietBi.TinhTrang,
                TrangThaiSuDung = thietBi.TrangThaiSuDung.ToString(), thietBi.MaChiTietPhieuNhap
            }),
            GiaTriSau = JsonSerializer.Serialize(giaTriSauPayload), GhiChu = ghiChuChiTiet
        });
        await _context.SaveChangesAsync();

        return Result<DeNghiVongDoiResponse>.Ok(MapDeNghiResponse(phieu, thietBi.MaThietBi));
    }

    private static DeNghiVongDoiResponse MapDeNghiResponse(PhieuDieuChinhKho phieu, long maThietBi) => new()
    {
        MaPhieuDieuChinh = phieu.MaPhieuDieuChinh, MaThietBi = maThietBi,
        LoaiDieuChinh = phieu.LoaiDieuChinh ?? "", TrangThai = phieu.TrangThai,
        LyDo = phieu.LyDo, ThoiDiemLap = phieu.ThoiDiemLap, ThoiDiemApDung = phieu.ThoiDiemApDung
    };
}
