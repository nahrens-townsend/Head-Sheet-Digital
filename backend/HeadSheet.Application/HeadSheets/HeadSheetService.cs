using System.Text.Json;
using HeadSheet.Application.Interfaces;
using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;

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
        var sheet = new HeadSheetEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? "Untitled Sheet" : request.Name.Trim(),
            ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? null : request.ClientName.Trim(),
            TemplateType = request.TemplateTypes is { Length: > 0 } ? request.TemplateTypes[0] : request.TemplateType,
            TemplateTypesJson = request.TemplateTypes is { Length: > 0 }
                ? JsonSerializer.Serialize(request.TemplateTypes)
                : null,
            CanvasMode = string.IsNullOrWhiteSpace(request.CanvasMode) ? "templates" : request.CanvasMode,
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

    public async Task<HeadSheetDto?> SaveImageAsync(
        Guid userId, Guid id, string imageDataUrl, CancellationToken ct = default)
    {
        var sheet = await db.HeadSheets
            .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId, ct);

        if (sheet is null) return null;
        if (sheet.CanvasMode != "image") return null;

        sheet.ImageDataUrl = imageDataUrl;
        sheet.UpdatedAt = DateTime.UtcNow;

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

    private static string[] ComputeTemplateTypes(HeadSheetEntity h)
    {
        if (!string.IsNullOrEmpty(h.TemplateTypesJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<string[]>(h.TemplateTypesJson);
                if (parsed is { Length: > 0 }) return parsed;
            }
            catch { /* fall through to legacy */ }
        }
        return [h.TemplateType];
    }

    private static HeadSheetDto ToDto(HeadSheetEntity h) =>
        new(h.Id, h.Name, h.ClientName, h.TemplateType, ComputeTemplateTypes(h),
            h.CanvasMode, h.ImageDataUrl, h.StrokesJson, h.CreatedAt, h.UpdatedAt);
}
