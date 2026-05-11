using HeadSheet.Application.HeadSheets;

namespace HeadSheet.Application.Templates;

public interface ITemplateService
{
    Task<IReadOnlyList<HeadSheetSummaryDto>> ListAsync(Guid userId, CancellationToken ct = default);

    Task<HeadSheetDto> CreateAsync(Guid userId, CreateTemplateRequest request, CancellationToken ct = default);

    Task<bool> DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}

public record CreateTemplateRequest(string Name, string TemplateType, string StrokesJson, string? ThumbnailUrl);
