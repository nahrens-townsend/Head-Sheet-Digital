using System.ComponentModel.DataAnnotations;

namespace HeadSheet.Api.Models.HeadSheets;

public record CreateHeadSheetRequestDto(
    [MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName,
    [Required, RegularExpression("^(front|back|side|top)$", ErrorMessage = "templateType must be front, back, side, or top.")] string TemplateType,
    Guid? TemplateId,
    IReadOnlyList<string>? TemplateTypes,
    [RegularExpression("^(templates|image)$", ErrorMessage = "canvasMode must be 'templates' or 'image'.")] string? CanvasMode,
    [MaxLength(10_000_000)] string? ImageDataUrl);

public record UpdateHeadSheetRequestDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName);

public record HeadSheetResponseDto(
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

// 10 MB cap for image data URLs
public record SaveImageRequestDto([Required, MaxLength(10_000_000)] string ImageDataUrl);
