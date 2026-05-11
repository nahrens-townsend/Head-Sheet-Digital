using HeadSheet.Domain.Entities;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;

namespace HeadSheet.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<HeadSheetEntity> HeadSheets { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
