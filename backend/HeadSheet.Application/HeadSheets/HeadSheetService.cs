using HeadSheet.Application.Interfaces;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;

namespace HeadSheet.Application.HeadSheets;

public class HeadSheetService(IAppDbContext db) : IHeadSheetService
{
    public async Task<PagedResult<HeadSheetSummaryDto>> ListAsync(
        Guid userId, string? clientName, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.HeadSheets.Where(h => h.UserId == userId);

        if (!string.IsNullOrWhiteSpace(clientName))
            query = query.Where(h => h.ClientName != null &&
                EF.Functions.Like(h.ClientName.ToLower(), $"%{clientName.ToLower()}%"));

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(h => h.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new HeadSheetSummaryDto(h.Id, h.Name, h.ClientName, h.TemplateType, h.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<HeadSheetSummaryDto>(items, totalCount, page, pageSize);
    }

    public async Task<HeadSheetDto?> GetAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId, ct);

        return sheet is null ? null : ToDto(sheet);
    }

    public async Task<HeadSheetDto> CreateAsync(
        Guid userId, CreateHeadSheetRequest request, CancellationToken ct = default)
    {
        var sheet = new HeadSheetEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Sheet" : request.Name.Trim(),
            ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName.Trim(),
            TemplateType = request.TemplateType,
            StrokesJson = "[]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.HeadSheets.Add(sheet);
        await db.SaveChangesAsync(ct);

        return ToDto(sheet);
    }

    public async Task<HeadSheetDto?> UpdateAsync(
        Guid userId, Guid id, UpdateHeadSheetRequest request, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId, ct);

        if (sheet is null) return null;

        sheet.Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Sheet" : request.Name.Trim();
        sheet.ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName.Trim();
        sheet.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return ToDto(sheet);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var affected = await db.HeadSheets
            .Where(h => h.Id == id && h.UserId == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.IsDeleted, true)
                .SetProperty(h => h.UpdatedAt, DateTime.UtcNow), ct);

        return affected > 0;
    }

    private static HeadSheetDto ToDto(HeadSheetEntity h) =>
        new(h.Id, h.Name, h.ClientName, h.TemplateType, h.StrokesJson, h.CreatedAt, h.UpdatedAt);
}
