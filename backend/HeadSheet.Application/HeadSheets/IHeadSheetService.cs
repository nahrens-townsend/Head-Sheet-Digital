namespace HeadSheet.Application.HeadSheets;

public record HeadSheetDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    string StrokesJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record HeadSheetSummaryDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    DateTime UpdatedAt);

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

public record CreateHeadSheetRequest(string Name, string? ClientName, string TemplateType);
public record UpdateHeadSheetRequest(string Name, string? ClientName);

public interface IHeadSheetService
{
    Task<PagedResult<HeadSheetSummaryDto>> ListAsync(
        Guid userId, string? clientName, int page, int pageSize, CancellationToken ct = default);

    Task<HeadSheetDto?> GetAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<HeadSheetDto> CreateAsync(Guid userId, CreateHeadSheetRequest request, CancellationToken ct = default);

    Task<HeadSheetDto?> UpdateAsync(Guid userId, Guid id, UpdateHeadSheetRequest request, CancellationToken ct = default);

    Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
