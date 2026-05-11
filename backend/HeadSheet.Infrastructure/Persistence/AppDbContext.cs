using HeadSheet.Application.Interfaces;
using HeadSheet.Domain.Entities;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;

namespace HeadSheet.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<HeadSheetEntity> HeadSheets => Set<HeadSheetEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
