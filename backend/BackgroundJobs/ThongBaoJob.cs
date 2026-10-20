using System;
using System.Threading;
using System.Threading.Tasks;
using GearGo.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GearGo.BackgroundJobs;

/// <summary>
/// Background Worker xử lý hàng chờ gửi thông báo (W5-T8):
/// Quét định kỳ các bản ghi Email ở trạng thái ChuaGui hoặc DangXuLy quá hạn (crash recovery),
/// thực hiện gửi qua Adapter ngoài và cập nhật trạng thái kết quả.
/// </summary>
public class ThongBaoJob : BackgroundService
{
    private static readonly TimeSpan ChuKy = TimeSpan.FromSeconds(15);
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ThongBaoJob> _logger;

    public ThongBaoJob(IServiceProvider serviceProvider, ILogger<ThongBaoJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ThongBaoJob đã khởi động.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var guiThongBaoService = scope.ServiceProvider.GetRequiredService<IGuiThongBaoService>();
                
                int daGui = await guiThongBaoService.XuLyHangChoAsync(20, stoppingToken);
                if (daGui > 0)
                {
                    _logger.LogInformation("ThongBaoJob: Đã gửi thành công {Count} thông báo email trong đợt.", daGui);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ThongBaoJob gặp lỗi trong chu kỳ quét hàng chờ.");
            }

            try
            {
                await Task.Delay(ChuKy, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("ThongBaoJob đã dừng an toàn.");
    }
}
