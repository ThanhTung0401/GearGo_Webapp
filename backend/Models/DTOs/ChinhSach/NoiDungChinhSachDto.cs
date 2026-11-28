using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GearGo.Models.DTOs.ChinhSach;

/// <summary>
/// Nội dung chính sách có cấu trúc (W6-T1 - UC26).
/// Map 1:1 với JSON lưu trong <c>CHINH_SACH.noi_dung_chinh_sach</c>.
/// Các khóa phải tương thích với reader sẵn có ở Week 2–5
/// (<see cref="GearGo.Helpers.ChinhSachHuy"/>, <c>QuaHanService</c>, <c>HuyDonService</c>).
/// </summary>
public class NoiDungChinhSachDto
{
    /// <summary>Thời gian giữ chỗ (phút) kể từ lúc tạo đơn.</summary>
    public int? ThoiGianGiuChoPhut { get; set; }

    /// <summary>Hệ số phí trễ áp lên đơn giá/ngày (ví dụ 1.5 = 150%).</summary>
    public decimal? HeSoTre { get; set; }

    /// <summary>Tỷ lệ cọc theo phần trăm (0..100).</summary>
    public decimal? TyLeCocPhanTram { get; set; }

    /// <summary>Hạn mức nhân viên tự duyệt phí (VND, không âm).</summary>
    public decimal? HanMucNhanVien { get; set; }

    /// <summary>Quy tắc hủy đơn theo ba khoảng chuẩn (trên 48h / 24–48h / dưới 24h).</summary>
    public HuyDonDto? HuyDon { get; set; }

    /// <summary>Quy tắc xử lý khách không đến nhận.</summary>
    public KhongDenNhanDto? KhongDenNhan { get; set; }

    /// <summary>Danh sách mốc nhắc khách (tùy chọn).</summary>
    public List<MocNhacDto>? MocNhac { get; set; }

    /// <summary>Giờ nhận thiết bị tiêu chuẩn (HH:mm — UC8.1).</summary>
    public string? GioNhanChuan { get; set; }

    /// <summary>Giờ trả thiết bị tiêu chuẩn (HH:mm — UC8.1).</summary>
    public string? GioTraChuan { get; set; }

    /// <summary>Tỷ lệ bồi thường hư hỏng/mất thiết bị (%) (UC8.1).</summary>
    public decimal? TyLeBoiThuongHuHong { get; set; }

    /// <summary>Biểu phí mất/hỏng phụ kiện (UC8.1).</summary>
    [JsonConverter(typeof(FlexibleJsonStringConverter))]
    public string? BieuPhiPhuKien { get; set; }

    public class HuyDonDto
    {
        /// <summary>Tỷ lệ giữ lại khi khách hủy trong 24–48h trước nhận (0..1).</summary>
        public decimal? TyLeGiuLaiTu24Den48Gio { get; set; }

        /// <summary>Tỷ lệ giữ lại khi khách hủy dưới 24h trước nhận (0..1).</summary>
        public decimal? TyLeGiuLaiDuoi24Gio { get; set; }
    }

    public class KhongDenNhanDto
    {
        /// <summary>Số phút chờ sau giờ nhận trước khi coi là không đến (không âm).</summary>
        public int? SoPhutChoSauGioNhan { get; set; }

        /// <summary>Tỷ lệ giữ lại tiền thuê khi khách không đến (0..1).</summary>
        public decimal? TyLeGiuLaiTienThue { get; set; }
    }

    public class MocNhacDto
    {
        /// <summary>Loại mốc: TruocNhan, TruocTra, SauTra...</summary>
        public string? Loai { get; set; }

        /// <summary>Số giờ tham chiếu (dương; âm = sau mốc).</summary>
        public int? SoGioTruoc { get; set; }
    }
}

/// <summary>
/// Chấp nhận giá trị vừa có thể là chuỗi JSON vừa có thể là mảng/object JSON thô trong DB.
/// </summary>
internal sealed class FlexibleJsonStringConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String) return reader.GetString();
        using var doc = JsonDocument.ParseValue(ref reader);
        return doc.RootElement.GetRawText();
    }

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value == null) writer.WriteNullValue();
        else writer.WriteStringValue(value);
    }
}
