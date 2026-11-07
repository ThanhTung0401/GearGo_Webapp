using System.Collections.Generic;
using System.Text.Json;
using GearGo.Models.DTOs.ChinhSach;

namespace GearGo.Services;

/// <summary>
/// Validator thuần cho nội dung chính sách (W6-T1 - UC26).
/// Báo lỗi theo đường dẫn khóa JSON; không ném exception, không I/O.
/// Dùng chung cho endpoint /kiem-tra và luồng TaoPhienBan.
/// </summary>
public static class ChinhSachValidator
{
    public static List<LoiDuongDan> KiemTra(NoiDungChinhSachDto dto)
    {
        var loi = new List<LoiDuongDan>();

        if (dto.ThoiGianGiuChoPhut is int tgc && tgc <= 0)
            loi.Add(new LoiDuongDan { DuongDan = "thoiGianGiuChoPhut", ThongDiep = "Phải lớn hơn 0." });

        if (dto.HeSoTre is decimal heSo && heSo < 0)
            loi.Add(new LoiDuongDan { DuongDan = "heSoTre", ThongDiep = "Không được âm." });

        if (dto.TyLeCocPhanTram is decimal tlc && (tlc < 0 || tlc > 100))
            loi.Add(new LoiDuongDan { DuongDan = "tyLeCocPhanTram", ThongDiep = "Phải trong khoảng 0..100." });

        if (dto.HanMucNhanVien is decimal hmnv && hmnv < 0)
            loi.Add(new LoiDuongDan { DuongDan = "hanMucNhanVien", ThongDiep = "Không được âm." });

        if (dto.HuyDon is null)
        {
            loi.Add(new LoiDuongDan { DuongDan = "huyDon", ThongDiep = "Thiếu quy tắc hủy đơn." });
        }
        else
        {
            KiemTraTyLe(dto.HuyDon.TyLeGiuLaiTu24Den48Gio, "huyDon.tyLeGiuLaiTu24Den48Gio", loi);
            KiemTraTyLe(dto.HuyDon.TyLeGiuLaiDuoi24Gio, "huyDon.tyLeGiuLaiDuoi24Gio", loi);

            if (dto.HuyDon.TyLeGiuLaiTu24Den48Gio is decimal a &&
                dto.HuyDon.TyLeGiuLaiDuoi24Gio is decimal b &&
                a >= 0 && a <= 1 && b >= 0 && b <= 1 && b < a)
            {
                loi.Add(new LoiDuongDan
                {
                    DuongDan = "huyDon.tyLeGiuLaiDuoi24Gio",
                    ThongDiep = "Mức giữ lại khi hủy dưới 24h không được nhỏ hơn mức 24–48h."
                });
            }
        }

        if (dto.KhongDenNhan is null)
        {
            loi.Add(new LoiDuongDan { DuongDan = "khongDenNhan", ThongDiep = "Thiếu quy tắc xử lý khách không đến nhận." });
        }
        else
        {
            if (dto.KhongDenNhan.SoPhutChoSauGioNhan is null)
                loi.Add(new LoiDuongDan { DuongDan = "khongDenNhan.soPhutChoSauGioNhan", ThongDiep = "Bắt buộc." });
            else if (dto.KhongDenNhan.SoPhutChoSauGioNhan < 0)
                loi.Add(new LoiDuongDan { DuongDan = "khongDenNhan.soPhutChoSauGioNhan", ThongDiep = "Không được âm." });

            KiemTraTyLe(dto.KhongDenNhan.TyLeGiuLaiTienThue, "khongDenNhan.tyLeGiuLaiTienThue", loi);
        }

        if (dto.MocNhac is not null)
        {
            for (int i = 0; i < dto.MocNhac.Count; i++)
            {
                var m = dto.MocNhac[i];
                if (string.IsNullOrWhiteSpace(m.Loai))
                    loi.Add(new LoiDuongDan { DuongDan = $"mocNhac[{i}].loai", ThongDiep = "Bắt buộc." });
                if (m.SoGioTruoc is null)
                    loi.Add(new LoiDuongDan { DuongDan = $"mocNhac[{i}].soGioTruoc", ThongDiep = "Bắt buộc." });
            }
        }

        return loi;
    }

    private static void KiemTraTyLe(decimal? v, string duongDan, List<LoiDuongDan> loi)
    {
        if (v is null)
        {
            loi.Add(new LoiDuongDan { DuongDan = duongDan, ThongDiep = "Bắt buộc." });
            return;
        }
        if (v < 0 || v > 1)
            loi.Add(new LoiDuongDan { DuongDan = duongDan, ThongDiep = "Phải trong khoảng 0..1 (hệ số)." });
    }

    /// <summary>
    /// Parse chuỗi JSON đã lưu (có thể từ bản cũ) thành DTO. Trả null nếu JSON không hợp lệ.
    /// </summary>
    public static NoiDungChinhSachDto? DocJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<NoiDungChinhSachDto>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Serialize DTO thành JSON lưu trong <c>CHINH_SACH.noi_dung_chinh_sach</c> (camelCase).</summary>
    public static string VietJson(NoiDungChinhSachDto dto)
        => JsonSerializer.Serialize(dto, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
}
