using GearGo.Exceptions;
  using System.Text.Json;

  namespace GearGo.Middleware;

  public class ExceptionHandlingMiddleware
  {
      private readonly RequestDelegate _next;
      private readonly ILogger<ExceptionHandlingMiddleware> _logger;

      public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
      { _next = next; _logger = logger; }

      public async Task InvokeAsync(HttpContext context)
      {
          try { await _next(context); }
          catch (NghiepVuException ex)
          {
              _logger.LogWarning("NghiepVuException {MaLoi}: {Message}", ex.MaLoi, ex.Message);
              context.Response.StatusCode = GetStatusCode(ex);
              context.Response.ContentType = "application/json";
              await context.Response.WriteAsync(JsonSerializer.Serialize(
                  new { maLoi = ex.MaLoi, thongDiep = ex.Message, chiTiet = ex.ChiTiet }));
          }
          catch (Exception ex)
          {
              _logger.LogError(ex, "Unhandled exception");
              context.Response.StatusCode = 500;
              context.Response.ContentType = "application/json";
              await context.Response.WriteAsync(JsonSerializer.Serialize(
                  new { maLoi = "LOI_HE_THONG", thongDiep = "Đã xảy ra lỗi hệ thống." }));
          }
      }

      private static int GetStatusCode(NghiepVuException ex) => ex switch
      {
          KhongTimThayException      => 404,
          DonKhongTimThayException   => 404,
          ThongBaoKhongTimThayException => 404,
          LienHeDaTonTaiException    => 409,
          XungDotSuKienException     => 409,
          KhongCoQuyenException      => 403,
          TaiKhoanBiKhoaException    => 403,
          KhongDuHangException       => 409,
          BaogiaThayDoiException     => 409,
          TrangThaiKhongHopLeException => 409,
          KhuyenMaiKhongHopLeException => 409,
          HoanTienKhongTimThayException => 404,
          NguonHoanKhongHopLeException => 409,
          VuotHanMucHoanException    => 409,
          HoanChuaRoKetQuaException  => 409,
          KetQuaHoanKhongKhopException => 400,
          DonDaBanGiaoException      => 409,
          ChiPhiHuyDaThayDoiException => 409,
          KhongCoQuyenHuyException   => 403,
          ChinhSachHuyChuaDuException => 409,
          DonDaHuyKhacYDinhException => 409,
          _                          => 400
      };
  }