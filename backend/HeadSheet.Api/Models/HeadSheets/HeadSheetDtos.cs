using System.ComponentModel.DataAnnotations;

namespace HeadSheet.Api.Models.HeadSheets;

public record CreateHeadSheetRequestDto(
    [MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName,
    [Required, RegularExpression("^(front|back|side)$", ErrorMessage = "templateType must be front, back, or side.")] string TemplateType);

public record UpdateHeadSheetRequestDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(200)] string? ClientName);

public record HeadSheetResponseDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    string StrokesJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record HeadSheetSummaryResponseDto(
    Guid Id,
    string Name,
    string? ClientName,
    string TemplateType,
    DateTime UpdatedAt);

public record PagedResponseDto<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);
