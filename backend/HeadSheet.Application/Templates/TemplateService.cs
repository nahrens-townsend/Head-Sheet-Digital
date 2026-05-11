using HeadSheet.Application.HeadSheets;
using HeadSheet.Application.Interfaces;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;

namespace HeadSheet.Application.Templates;

public class TemplateService(IAppDbContext db) : ITemplateService
{
    public async Task<IReadOnlyList<HeadSheetSummaryDto>> ListAsync(Guid userId, CancellationToken ct = default)
    {
        return await db.HeadSheets
            .Where(h => h.UserId == userId && h.IsTemplate)
            .OrderByDescending(h => h.UpdatedAt)
            .Select(h => new HeadSheetSummaryDto(h.Id, h.Name, h.ClientName, h.TemplateType, h.ThumbnailUrl, h.UpdatedAt))
            .ToListAsync(ct);
    }

    public async Task<HeadSheetDto> CreateAsync(Guid userId, CreateTemplateRequest request, CancellationToken ct = default)
    {
        var template = new HeadSheetEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Template" : request.Name.Trim(),
            ClientName = null,
            TemplateType = request.TemplateType,
            StrokesJson = request.StrokesJson,
            ThumbnailUrl = string.IsNullOrWhiteSpace(request.ThumbnailUrl) ? null : request.ThumbnailUrl,
            IsTemplate = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.HeadSheets.Add(template);
        await db.SaveChangesAsync(ct);

        return new HeadSheetDto(
            template.Id,
            template.Name,
            template.ClientName,
            template.TemplateType,
            template.StrokesJson,
            template.ThumbnailUrl,
            template.CreatedAt,
            template.UpdatedAt);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var affected = await db.HeadSheets
            .Where(h => h.Id == id && h.UserId == userId && h.IsTemplate)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.IsDeleted, true)
                .SetProperty(h => h.UpdatedAt, DateTime.UtcNow), ct);

        return affected > 0;
    }
}
