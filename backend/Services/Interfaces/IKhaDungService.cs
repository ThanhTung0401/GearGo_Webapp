namespace GearGo.Services.Interfaces
{
    public interface IKhaDungService
    {
        Task<int> LayKhaDungAsync(int sanPhamId, DateTime gioNhan, DateTime gioTra);
        Task<Dictionary<int, int>> LayKhaDungNhieuSanPhamAsync(IEnumerable<int> ids, DateTime gioNhan, DateTime gioTra);
    }
}