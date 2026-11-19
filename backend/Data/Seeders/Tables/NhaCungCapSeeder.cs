using GearGo.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Data.Seeders.Tables;

/// <summary>Seed bổ sung danh sách nhà cung cấp.</summary>
internal static class NhaCungCapSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var items = new[]
        {
            ("NCC-OUT-02", "Công ty CP Outdoor Pro Việt Nam", "Trần Thu Hà", "0912345678", "contact@outdoorpro.vn", "158 Cầu Giấy, Hà Nội", "0109876543", "DangHopTac"),
            ("NCC-OSP-03", "Nhà phân phối Osprey & BlackDiamond", "Nguyễn Hoàng Nam", "0934567890", "sales@ospreyvn.com", "72 Lê Thánh Tôn, Q.1, TP.HCM", "0314567890", "DangHopTac"),
            ("NCC-ECO-04", "EcoFlow Energy Việt Nam", "Phạm Minh Khoa", "0977112233", "b2b@ecoflow.vn", "24 Duy Tân, Cầu Giấy, Hà Nội", "0107788990", "DangHopTac"),
            ("NCC-KOV-05", "Kovea Camping Gear", "Phạm Quốc Hùng", "0938789012", "support@koveavietnam.com", "89 Nguyễn Văn Linh, Đà Nẵng", "0401239876", "NgungHopTac"),
            ("NCC-DEC-06", "Decathlon Quechua Partner", "Lê Thanh Tùng", "0988990011", "partner@decathlon.vn", "102 Trường Chinh, Hà Nội", "0105566778", "DangHopTac"),
        };

        foreach (var (ma, ten, lh, sdt, email, dc, mst, tt) in items)
        {
            if (await context.NhaCungCaps.AnyAsync(n => n.MaNhaCungCapHienThi == ma)) continue;
            context.NhaCungCaps.Add(new NhaCungCap
            {
                MaNhaCungCapHienThi = ma, TenNhaCungCap = ten, NguoiLienHe = lh,
                SoDienThoai = sdt, Email = email, DiaChi = dc, MaSoThue = mst, TrangThaiHopTac = tt
            });
        }
        await context.SaveChangesAsync();
    }
}
