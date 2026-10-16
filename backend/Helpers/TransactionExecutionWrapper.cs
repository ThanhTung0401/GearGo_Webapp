using System.Data;
using GearGo.Data;
using GearGo.Models.Common;
using Microsoft.EntityFrameworkCore;

namespace GearGo.Helpers;

public static class TransactionExecutionWrapper
{
    public static async Task<Result<T>> ExecuteInTransactionAsync<T>(
        ApplicationDbContext context,
        Func<Task<Result<T>>> operation,
        ILogger? logger = null,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted)
    {
        using var transaction = await context.Database.BeginTransactionAsync(isolationLevel);
        try
        {
            var result = await operation();
            if (!result.ThanhCong)
            {
                await transaction.RollbackAsync();
                return result;
            }

            await context.SaveChangesAsync();
            await transaction.CommitAsync();
            return result;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger?.LogError(ex, "Lỗi thực thi giao dịch ACID: {Message}", ex.Message);
            return Result<T>.Loi("SYS_ERROR", ex.Message);
        }
    }
}
