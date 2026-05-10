using HeadSheet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HeadSheet.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
