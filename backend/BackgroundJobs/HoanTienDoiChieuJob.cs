using GearGo.Services.Interfaces;

namespace GearGo.BackgroundJobs;

/// <summary>
/// Tiếp tục các khoản hoàn sau khi ứng dụng khởi động lại hoặc mất phản hồi gateway:
/// gửi intent ChoXuLy bị bỏ dở và tra cứu các yêu cầu DangXuLy/ChuaRoKetQua bằng CÙNG mã yêu cầu.
/// Danh sách đọc lại từ HOAN_TIEN, không giữ trong RAM.
/// </summary>
public class HoanTienDoiChieuJob : BackgroundService
{
    private static readonly TimeSpan ChuKy = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan DoTre = TimeSpan.FromMinutes(2);

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<HoanTienDoiChieuJob> _logger;

    public HoanTienDoiChieuJob(IServiceProvider serviceProvider, ILogger<HoanTienDoiChieuJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var kq = await scope.ServiceProvider.GetRequiredService<IHoanTienService>()
                    .TiepTucCacYeuCauDangChoAsync(DoTre, stoppingToken);
                if (kq.SoDaGui + kq.SoDaDoiChieu > 0)
                    _logger.LogInformation("Job hoàn tiền: gửi {Gui}, đối chiếu {DoiChieu}.", kq.SoDaGui, kq.SoDaDoiChieu);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (ObjectDisposedException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception e)
            {
                _logger.LogError(e, "Lỗi job đối chiếu hoàn tiền.");
            }

            try { await Task.Delay(ChuKy, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
