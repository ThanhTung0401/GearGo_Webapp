using GearGo.Data.Seeders;
using GearGo.Data.Seeders.Tables;

namespace GearGo.Data;

/// <summary>
/// Điều phối khởi tạo và đồng bộ dữ liệu Seed mẫu cho toàn hệ thống GearGo.
/// Đảm bảo thứ tự phụ thuộc khóa ngoại (Foreign Keys) và tính idempotent.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAllAsync(ApplicationDbContext context)
    {
        var actors = await NguoiDungNhanSuSeeder.SeedAsync(context);
        var catalog = await DanhMucSanPhamSeeder.SeedAsync(context, actors.NhanVien1);
        var orderCtx = await DonThueNghiepVuSeeder.SeedAsync(context, actors, catalog);

        await TaiChinhDoiSoatSeeder.SeedAsync(context, actors, catalog, orderCtx);
        await KichBanHoanTatSeeder.SeedAsync(context, actors, catalog, orderCtx.ChinhSach1);
        await KichBanVanHanhSeeder.SeedAsync(context, actors, catalog, orderCtx.ChinhSach1);

        // Seeder mở rộng theo từng bảng (Table-level seeders)
        await TaiKhoanSeeder.SeedAsync(context);
        await DanhMucSanPhamTableSeeder.SeedAsync(context);
        await NhaCungCapSeeder.SeedAsync(context);
        await PhieuNhapHangSeeder.SeedAsync(context);
        await ThietBiSeeder.SeedAsync(context);
        await ChinhSachSeeder.SeedAsync(context);
        await KhuyenMaiSeeder.SeedAsync(context);
        await DonThueSeeder.SeedAsync(context);
        await BaoTriSeeder.SeedAsync(context);
        await DieuChinhKhoSeeder.SeedAsync(context);
        await DanhGiaSeeder.SeedAsync(context);
        await ThongBaoSeeder.SeedAsync(context);
        await NhatKyHeThongSeeder.SeedAsync(context);

        await NguoiDungNhanSuSeeder.SeedRolesAndPermissionsAsync(context);
    }
}
