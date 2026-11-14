using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GearGo.Models.Common;
using GearGo.Models.DTOs.QuaHan;
using GearGo.Models.DTOs.ThongBao;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GearGo.Services.Implements.DonThue;

public partial class QuaHanService
{
    public async Task<Result<List<DonBiAnhHuongResponse>>> LayDonBiAnhHuongAsync(long donId, long actorId)
    {
        var don = await _context.DonThues.FindAsync(donId);
        if (don == null) return Result<List<DonBiAnhHuongResponse>>.Loi("DON_NOT_FOUND", "Không tìm thấy đơn thuê.");

        var chiTietBanGiaos = await _context.ChiTietBanGiaos
            .Include(c => c.PhanCongThietBi).ThenInclude(p => p.ThietBi).ThenInclude(tb => tb.SanPhamHienTai)
            .Where(c => c.PhieuBanGiao.MaDonThue == donId && c.PhieuBanGiao.TrangThai == "DaGiao")
            .ToListAsync();

        var settledCtbIds = await _context.ChiTietNhanTras
            .Where(nt => nt.PhieuNhanTra.MaDonThue == donId && nt.PhieuNhanTra.TrangThai == TrangThaiPhieuNhanTra.DaChot)
            .Select(nt => nt.MaChiTietBanGiao).ToListAsync();

        var unreturned = chiTietBanGiaos.Where(c => !settledCtbIds.Contains(c.MaChiTietBanGiao)).ToList();
        var unreturnedTbIds = unreturned.Select(c => c.PhanCongThietBi.MaThietBi).Distinct().ToList();
        var resultList = new List<DonBiAnhHuongResponse>();
        if (!unreturnedTbIds.Any()) return Result<List<DonBiAnhHuongResponse>>.Ok(resultList);

        var futureAssigned = await _context.PhanCongThietBis
            .Include(pc => pc.ThietBi).ThenInclude(tb => tb.SanPhamHienTai)
            .Include(pc => pc.ChiTietDon).ThenInclude(cd => cd.DonThue).ThenInclude(d => d.KhachHang)
            .Where(pc => unreturnedTbIds.Contains(pc.MaThietBi) &&
                         pc.ChiTietDon.DonThue.MaDonThue != donId &&
                         pc.TrangThai == "DaPhanCong" &&
                         (pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DaXacNhan ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.DangChuanBi ||
                          pc.ChiTietDon.DonThue.TrangThai == TrangThaiDonThue.SanSangNhan) &&
                         pc.ChiTietDon.DonThue.GioNhanDuKien >= don.GioTraDuKien)
            .ToListAsync();

        foreach (var fa in futureAssigned)
        {
            var futureDon = fa.ChiTietDon.DonThue;
            resultList.Add(new DonBiAnhHuongResponse
            {
                MaDonBiAnhHuong = futureDon.MaDonThue, MaDonHienThi = $"DH-{futureDon.MaDonThue:D6}",
                TenKhachHang = futureDon.KhachHang?.HoTen ?? "Khách hàng",
                GioNhanDuKien = futureDon.GioNhanDuKien, GioTraDuKien = futureDon.GioTraDuKien,
                MaThietBiVung = fa.MaThietBi, MaThietBiHienThi = fa.ThietBi.MaThietBiHienThi,
                MaSanPham = fa.ThietBi.MaSanPhamHienTai, TenSanPham = fa.ThietBi.SanPhamHienTai.TenSanPham,
                SoLuongThieu = 1, NguyenNhan = "ThietBiDangBiGiuQuaHan"
            });
        }

        var affectedProductIds = unreturned.Select(c => c.PhanCongThietBi.ThietBi.MaSanPhamHienTai).Distinct().ToList();
        await ThemDonThieuSoLuongAsync(don, affectedProductIds, resultList);
        return Result<List<DonBiAnhHuongResponse>>.Ok(resultList);
    }

    private async Task ThemDonThieuSoLuongAsync(
        Models.Entities.DonThue don, List<long> affectedProductIds, List<DonBiAnhHuongResponse> resultList)
    {
        var futureOrders = await _context.DonThues
            .Include(d => d.KhachHang)
            .Include(d => d.ChiTietDonThues).ThenInclude(cd => cd.SanPham)
            .Where(d => d.MaDonThue != don.MaDonThue &&
                        (d.TrangThai == TrangThaiDonThue.DaXacNhan ||
                         d.TrangThai == TrangThaiDonThue.DangChuanBi ||
                         d.TrangThai == TrangThaiDonThue.SanSangNhan) &&
                        d.GioNhanDuKien >= don.GioTraDuKien &&
                        d.GioNhanDuKien <= DateTime.UtcNow.AddDays(7) &&
                        d.ChiTietDonThues.Any(cd => affectedProductIds.Contains(cd.MaSanPham)))
            .ToListAsync();

        foreach (var fo in futureOrders)
        {
            foreach (var cd in fo.ChiTietDonThues.Where(cd => affectedProductIds.Contains(cd.MaSanPham)))
            {
                if (resultList.Any(r => r.MaDonBiAnhHuong == fo.MaDonThue && r.MaSanPham == cd.MaSanPham)) continue;
                int khaDung = await _khaDungService.LayKhaDungAsync(cd.MaSanPham, fo.GioNhanDuKien, fo.GioTraDuKien);
                if (khaDung >= cd.SoLuong) continue;

                resultList.Add(new DonBiAnhHuongResponse
                {
                    MaDonBiAnhHuong = fo.MaDonThue, MaDonHienThi = $"DH-{fo.MaDonThue:D6}",
                    TenKhachHang = fo.KhachHang?.HoTen ?? "Khách hàng",
                    GioNhanDuKien = fo.GioNhanDuKien, GioTraDuKien = fo.GioTraDuKien,
                    MaThietBiVung = null, MaThietBiHienThi = null, MaSanPham = cd.MaSanPham,
                    TenSanPham = cd.SanPham?.TenSanPham ?? "", SoLuongThieu = cd.SoLuong - Math.Max(0, khaDung),
                    NguyenNhan = "NguyCoThieuSoLuongSanPham"
                });
            }
        }
    }

    public async Task<Result<KetQuaQuetNhacResponse>> QuetVaTaoNhacQuaHanAsync(DateTime? mocQuet)
    {
        var moc = mocQuet ?? DateTime.UtcNow;
        var donQuaHanRes = await LayDonQuaHanAsync(new LocQuaHanRequest { DenThoiDiem = moc, Trang = 1, SoMoiTrang = 1000 }, 0);
        if (!donQuaHanRes.ThanhCong || donQuaHanRes.DuLieu == null)
            return Result<KetQuaQuetNhacResponse>.Loi("LOI_LAY_DON_QUA_HAN", "Không thể lấy danh sách đơn quá hạn.");

        int soMoi = 0, soBoQua = 0, soLoi = 0;
        foreach (var item in donQuaHanRes.DuLieu.Items)
        {
            try
            {
                var eventKey = MaSuKienThongBao.NhacQuaHan(item.MaDonThue, moc);
                if (await _context.ThongBaos.AnyAsync(tb => tb.MaSuKien == eventKey))
                {
                    soBoQua++;
                    continue;
                }

                await _thongBaoService.TaoThongBaoSuKienAsync(new SuKienThongBaoCommand(
                    item.MaDonThue, LoaiSuKienThongBao.NhacQuaHan, eventKey,
                    $"Nhắc nhở đơn thuê {item.MaDonHienThi} đã quá hạn",
                    $"Đơn thuê {item.MaDonHienThi} của bạn hiện có {item.SoThietBiChuaTra} thiết bị chưa trả (trễ {item.SoNgayTreMax} ngày). Phí trễ ước tính: {item.TongPhiTreDuKien:N0} đ. Vui lòng hoàn trả sớm nhất có thể."));
                await _context.SaveChangesAsync();
                soMoi++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo thông báo nhắc quá hạn cho đơn #{MaDon}", item.MaDonThue);
                soLoi++;
            }
        }

        return Result<KetQuaQuetNhacResponse>.Ok(new KetQuaQuetNhacResponse
        {
            TongSoDonQuet = donQuaHanRes.DuLieu.TotalItems, SoNhacNhoMoi = soMoi, SoBoQua = soBoQua, SoLoi = soLoi
        });
    }
}
