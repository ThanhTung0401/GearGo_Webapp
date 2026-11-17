using GearGo.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace GearGo.Tests;

/// <summary>
/// Tạo DbContext InMemory cô lập cho từng unit test (bỏ qua TransactionIgnoredWarning).
/// </summary>
public static class TestDbFactory
{
    public static ApplicationDbContext CreateDb(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }
}
