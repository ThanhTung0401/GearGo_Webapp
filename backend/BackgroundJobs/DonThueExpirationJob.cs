using GearGo.Data;
using GearGo.Models.Entities;
using GearGo.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace GearGo.BackgroundJobs;

public class DonThueExpirationJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DonThueExpirationJob> _logger;

    public DonThueExpirationJob(IServiceProvider serviceProvider,
                                ILogger<DonThueExpirationJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Job quét đơn hết hạn bắt đầu...");

        // Chạy vòng lặp cho đến khi tắt Server
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await QuetDonHetHan(stoppingToken);
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Dừng vòng lặp khi server tắt bình thường
                break;
            }
            catch (ObjectDisposedException) when (stoppingToken.IsCancellationRequested)
            {
                // DI Container đang được giải phóng khi dừng server
                break;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Lỗi xảy ra trong quá trình quét đơn hết hạn.");
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }

    private async Task QuetDonHetHan(CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested) return;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var thoiDiemHienTai = DateTime.UtcNow;

        // Tìm các đơn chưa thanh toán và đã quá hạn
        var donHetHan = await context.DonThues
            .Include(d => d.ChiTietDonThues)
            .ThenInclude(c => c.GiuCho)
            .Where(d => d.TrangThai == TrangThaiDonThue.ChoThanhToan
                        && d.HanThanhToan < thoiDiemHienTai)
            .ToListAsync(stoppingToken);

        if (donHetHan.Count == 0 || stoppingToken.IsCancellationRequested) return;

        _logger.LogInformation($"Tìm thấy {donHetHan.Count} đơn đã hết hạn. Đang xử lý...");

        foreach (var don in donHetHan)
        {
            // Cập nhật trạng thái Đơn
            don.TrangThai = TrangThaiDonThue.HetHan;
            don.ThoiDiemHuy = thoiDiemHienTai;
            don.LyDoHuy = "Hệ thống tự động hủy do quá hạn thanh toán 15 phút.";

            // Cập nhật trạng thái Giữ chỗ để nhả hàng ra
            foreach (var chiTiet in don.ChiTietDonThues)
            {
                if (chiTiet.GiuCho != null)
                {
                    chiTiet.GiuCho.TrangThai = TrangThaiGiuCho.HetHan;
                    chiTiet.GiuCho.ThoiDiemGiaiPhong = thoiDiemHienTai;
                }
            }

            // Ghi vào Lịch sử trạng thái đơn
            var lichSu = new LichSuTrangThaiDon
            {
                MaDonThue = don.MaDonThue,
                TrangThaiTruoc = TrangThaiDonThue.ChoThanhToan.ToString(),
                TrangThaiSau = TrangThaiDonThue.HetHan.ToString(),
                ThoiDiem = thoiDiemHienTai,
                LyDo = "Quá hạn thanh toán"
            };

            context.LichSuTrangThaiDons.Add(lichSu);
        }

        await context.SaveChangesAsync(stoppingToken);
        _logger.LogInformation($"Đã xử lý hủy thành công {donHetHan.Count} đơn.");
    }
}
