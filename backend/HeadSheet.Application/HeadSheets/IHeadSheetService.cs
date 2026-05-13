namespace HeadSheet.Application.HeadSheets;

public record HeadSheetDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    IReadOnlyList<string> TemplateTypes,
    string CanvasMode,
    string? ImageDataUrl,
    string StrokesJson,
    string? ThumbnailUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record HeadSheetSummaryDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    string? ThumbnailUrl,
    DateTime UpdatedAt);

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

public record CreateHeadSheetRequest(
    string Name,
    string? ClientName,
    string TemplateType,
    Guid? TemplateId,
    IReadOnlyList<string>? TemplateTypes = null,
    string? CanvasMode = null,
    string? ImageDataUrl = null);
public record UpdateHeadSheetRequest(string Name, string? ClientName);
public record SaveStrokesRequest(string StrokesJson);

public enum SaveThumbnailStatus
{
    Saved,
    NotFound,
    Conflict,
}

public record SaveThumbnailResult(SaveThumbnailStatus Status, HeadSheetDto? Sheet);

public interface IHeadSheetService
{
    Task<PagedResult<HeadSheetSummaryDto>> ListAsync(
        Guid userId, string? clientName, int page, int pageSize, CancellationToken ct = default);

    Task<HeadSheetDto?> GetAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<HeadSheetDto?> CreateAsync(Guid userId, CreateHeadSheetRequest request, CancellationToken ct = default);

    Task<HeadSheetDto?> UpdateAsync(Guid userId, Guid id, UpdateHeadSheetRequest request, CancellationToken ct = default);

    Task<HeadSheetDto?> SaveStrokesAsync(Guid userId, Guid id, string strokesJson, CancellationToken ct = default);

    Task<SaveThumbnailResult> SaveThumbnailAsync(
        Guid userId, Guid id, string thumbnailUrl, DateTime expectedUpdatedAt, CancellationToken ct = default);

    Task<HeadSheetDto?> SaveImageAsync(Guid userId, Guid id, string imageDataUrl, CancellationToken ct = default);

    Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
