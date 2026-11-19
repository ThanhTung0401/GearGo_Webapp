using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung nhật ký thao tác hệ thống gần hiện tại để tra cứu Audit Log.</summary>
internal static class NhatKyHeThongSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var admin = await context.TaiKhoans.FirstOrDefaultAsync(t => t.VaiTro == "QuanTriVien");
        var staff = await context.TaiKhoans.FirstOrDefaultAsync(t => t.VaiTro == "NhanVien");
        if (admin == null) return;
        var staffId = staff?.MaTaiKhoan ?? admin.MaTaiKhoan;

        var logs = new[]
        {
            (admin.MaTaiKhoan, "CapNhatChinhSach", "ChinhSach", "CS-V2", "Cập nhật chính sách thuê mùa cao điểm v2", -6),
            (admin.MaTaiKhoan, "TaoKhuyenMai", "KhuyenMai", "CAMPGO10", "Phát hành mã khuyến mãi CAMPGO10 giảm 10%", -5),
            (staffId, "XacNhanNhapKho", "PhieuNhapHang", "PN-2026-002", "Kiểm nhận phiếu nhập lô hàng Outdoor Pro", -4),
            (staffId, "PhanCongThietBi", "DonThue", "ORD-202611-102", "Gán serial TB-LEU-004 cho đơn thuê", -3),
            (admin.MaTaiKhoan, "DuyetDieuChinhKho", "PhieuDieuChinhKho", "DCK-002", "Duyệt điều chỉnh hao mòn phụ kiện cọc lều", -2),
            (staffId, "LapPhieuBaoTri", "PhieuBaoTri", "PBT-001", "Tạo phiếu vệ sinh khử khuẩn lều", -1),
            (admin.MaTaiKhoan, "CapNhatPhanQuyen", "PhanQuyen", "NhanVien", "Đồng bộ phân quyền RBAC động cho vai trò NhanVien", 0),
        };

        foreach (var (maTk, hanhDong, loai, maDt, lyDo, daysOff) in logs)
        {
            if (await context.NhatKyThaoTacs.AnyAsync(n => n.LyDo == lyDo)) continue;
            context.NhatKyThaoTacs.Add(new NhatKyThaoTac
            {
                MaTaiKhoan = maTk,
                HanhDong = hanhDong,
                LoaiDoiTuong = loai,
                MaDoiTuong = maDt,
                ThoiDiem = DateTime.UtcNow.AddDays(daysOff),
                LyDo = lyDo
            });
        }
        await context.SaveChangesAsync();
    }
}
