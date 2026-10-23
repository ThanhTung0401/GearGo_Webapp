using GearGo.Models.DTOs.TuVan;

namespace GearGo.Services.Interfaces;

public interface ITuVanAIService
{
    Task<TuVanBoDoResponse> TuVanAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default);
    Task<TuVanBoDoResponse> KiemTraVaTinhLaiBoDoAsync(TuVanBoDoRequest request, CancellationToken cancellationToken = default);
    Task<bool> ThemBoDoVaoGioAsync(long maKhachHang, ThemBoDoRequest request, CancellationToken cancellationToken = default);
}
