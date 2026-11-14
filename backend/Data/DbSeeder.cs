using GearGo.Data.Seeders;

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
        await NguoiDungNhanSuSeeder.SeedRolesAndPermissionsAsync(context);
    }
}
