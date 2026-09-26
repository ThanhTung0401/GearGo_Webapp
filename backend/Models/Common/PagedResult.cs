namespace GearGo.Models.Common;

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; init; } = new List<T>();
    public int TotalItems { get; init; }
    public int CurrentPage { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalItems / (double)PageSize) : 0;
}
