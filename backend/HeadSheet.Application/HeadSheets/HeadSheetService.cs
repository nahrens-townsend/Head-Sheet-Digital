using HeadSheet.Application.Interfaces;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HeadSheet.Application.HeadSheets;

public class HeadSheetService(IAppDbContext db) : IHeadSheetService
{
    public async Task<PagedResult<HeadSheetSummaryDto>> ListAsync(
        Guid userId, string? clientName, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.HeadSheets.Where(h => h.UserId == userId && !h.IsTemplate);

        if (!string.IsNullOrWhiteSpace(clientName))
            query = query.Where(h => h.ClientName != null &&
                EF.Functions.Like(h.ClientName.ToLower(), $"%{clientName.ToLower()}%"));

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(h => h.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new HeadSheetSummaryDto(h.Id, h.Name, h.ClientName, h.TemplateType, h.ThumbnailUrl, h.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<HeadSheetSummaryDto>(items, totalCount, page, pageSize);
    }

    public async Task<HeadSheetDto?> GetAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);

        return sheet is null ? null : ToDto(sheet);
    }

    private static readonly HashSet<string> AllowedTemplateTypes = ["front", "back", "side", "top"];

    public async Task<HeadSheetDto?> CreateAsync(
        Guid userId, CreateHeadSheetRequest request, CancellationToken ct = default)
    {
        HeadSheetEntity? template = null;
        if (request.TemplateId is not null)
        {
            template = await db.HeadSheets
                .FirstOrDefaultAsync(h => h.Id == request.TemplateId && h.UserId == userId && h.IsTemplate, ct);
            if (template is null) return null;
        }

        var now = NormalizeUtc(DateTime.UtcNow);

        // Determine effective TemplateType (legacy single) and TemplateTypesJson
        string effectiveTemplateType = template?.TemplateType ?? request.TemplateType;
        string? templateTypesJson = null;
        if (request.TemplateTypes is { Count: > 0 })
        {
            // Defense-in-depth: reject any item that is not a known template type.
            if (request.TemplateTypes.Any(t => !AllowedTemplateTypes.Contains(t)))
                return null;

            templateTypesJson = JsonSerializer.Serialize(request.TemplateTypes);
            effectiveTemplateType = request.TemplateTypes[0];
        }
        else if (template?.TemplateTypesJson is not null)
        {
            templateTypesJson = template.TemplateTypesJson;
        }

        var sheet = new HeadSheetEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Sheet" : request.Name.Trim(),
            ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName.Trim(),
            TemplateType = effectiveTemplateType,
            TemplateTypesJson = templateTypesJson,
            CanvasMode = request.CanvasMode ?? "templates",
            StrokesJson = "[]",
            ThumbnailUrl = null,
            IsTemplate = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (request.TemplateId is not null)
        {
            sheet.StrokesJson = template!.StrokesJson;
        }

        db.HeadSheets.Add(sheet);
        await db.SaveChangesAsync(ct);

        return ToDto(sheet);
    }

    public async Task<HeadSheetDto?> UpdateAsync(
        Guid userId, Guid id, UpdateHeadSheetRequest request, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);

        if (sheet is null) return null;

        sheet.Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Sheet" : request.Name.Trim();
        sheet.ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName.Trim();
        sheet.UpdatedAt = NormalizeUtc(DateTime.UtcNow);

        await db.SaveChangesAsync(ct);

        return ToDto(sheet);
    }

    public async Task<HeadSheetDto?> SaveStrokesAsync(
        Guid userId, Guid id, string strokesJson, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);

        if (sheet is null) return null;

        sheet.StrokesJson = strokesJson;
        sheet.UpdatedAt = NormalizeUtc(DateTime.UtcNow);

        await db.SaveChangesAsync(ct);
        return ToDto(sheet);
    }

    public async Task<SaveThumbnailResult> SaveThumbnailAsync(
        Guid userId, Guid id, string thumbnailUrl, DateTime expectedUpdatedAt, CancellationToken ct = default)
    {
        var expected = NormalizeUtc(expectedUpdatedAt);
        var now = NormalizeUtc(DateTime.UtcNow);
        var affected = await db.HeadSheets
            .Where(h => h.Id == id && h.UserId == userId && !h.IsTemplate && h.UpdatedAt == expected)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.ThumbnailUrl, thumbnailUrl)
                .SetProperty(h => h.UpdatedAt, now), ct);

        if (affected > 0)
        {
            var sheet = await db.HeadSheets
                .FirstAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);
            return new SaveThumbnailResult(SaveThumbnailStatus.Saved, ToDto(sheet));
        }

        var exists = await db.HeadSheets
            .AnyAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);
        if (!exists)
        {
            return new SaveThumbnailResult(SaveThumbnailStatus.NotFound, null);
        }

        var current = await db.HeadSheets
            .FirstAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate, ct);
        return new SaveThumbnailResult(SaveThumbnailStatus.Conflict, ToDto(current));
    }

    public async Task<HeadSheetDto?> SaveImageAsync(
        Guid userId, Guid id, string imageDataUrl, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId && !h.IsTemplate && h.CanvasMode == "image", ct);

        if (sheet is null) return null;

        sheet.ImageDataUrl = imageDataUrl;
        sheet.UpdatedAt = NormalizeUtc(DateTime.UtcNow);

        await db.SaveChangesAsync(ct);
        return ToDto(sheet);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var now = NormalizeUtc(DateTime.UtcNow);
        var affected = await db.HeadSheets
            .Where(h => h.Id == id && h.UserId == userId && !h.IsTemplate)
            .ExecuteUpdateAsync(s => s
                .SetProperty(h => h.IsDeleted, true)
                .SetProperty(h => h.UpdatedAt, now), ct);

        return affected > 0;
    }

    private static IReadOnlyList<string> ResolveTemplateTypes(HeadSheetEntity h)
    {
        if (h.TemplateTypesJson is not null)
        {
            try { return JsonSerializer.Deserialize<List<string>>(h.TemplateTypesJson) ?? [h.TemplateType]; }
            catch { /* fall through */ }
        }
        return [h.TemplateType];
    }

    private static HeadSheetDto ToDto(HeadSheetEntity h) =>
        new(h.Id, h.Name, h.ClientName, h.TemplateType, ResolveTemplateTypes(h),
            h.CanvasMode, h.ImageDataUrl, h.StrokesJson, h.ThumbnailUrl, h.CreatedAt, h.UpdatedAt);

    private static DateTime NormalizeUtc(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        return new DateTime(utc.Ticks / 10 * 10, DateTimeKind.Utc);
    }
}
