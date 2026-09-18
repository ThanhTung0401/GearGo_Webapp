namespace GearGo.Models.Common;

public class Result<T>
{
    public bool ThanhCong { get; init; }
    public T? DuLieu { get; init; }
    public string? MaLoi { get; init; }
    public string? ThongDiep { get; init; }
    public object? ChiTiet { get; init; }

    public static Result<T> Ok(T data) => new() { ThanhCong = true, DuLieu = data };
    public static Result<T> Loi(string maLoi, string thongDiep, object? chiTiet = null)
        => new() { ThanhCong = false, MaLoi = maLoi, ThongDiep = thongDiep, ChiTiet = chiTiet };
}

public class Result
{
    public bool ThanhCong { get; init; }
    public string? MaLoi { get; init; }
    public string? ThongDiep { get; init; }
    public object? ChiTiet { get; init; }

    public static Result Ok() => new() { ThanhCong = true };
    public static Result Loi(string maLoi, string thongDiep, object? chiTiet = null)
        => new() { ThanhCong = false, MaLoi = maLoi, ThongDiep = thongDiep, ChiTiet = chiTiet };
}
