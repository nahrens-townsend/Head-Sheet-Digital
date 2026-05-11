using System.ComponentModel.DataAnnotations;

namespace HeadSheet.Api.Models.HeadSheets;

public record CreateHeadSheetRequestDto(
    [MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName,
    [Required, RegularExpression("^(front|back|side|top)$", ErrorMessage = "templateType must be front, back, side, or top.")] string TemplateType,
    Guid? TemplateId);

public record UpdateHeadSheetRequestDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName);

public record HeadSheetResponseDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    string StrokesJson,
    string? ThumbnailUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record HeadSheetSummaryResponseDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    string? ThumbnailUrl,
    DateTime UpdatedAt);

public record PagedResponseDto<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);

// 5 MB cap: ~2,500 strokes of 200 points each — well beyond any real session.
public record SaveStrokesRequestDto([Required, MaxLength(5_000_000)] string StrokesJson);

public record SaveThumbnailRequestDto(
    [Required, MaxLength(200_000)] string ThumbnailDataUrl,
    [Required] DateTime ExpectedUpdatedAt);
