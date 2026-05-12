using System.ComponentModel.DataAnnotations;

namespace HeadSheet.Api.Models.Templates;

public record CreateTemplateRequestDto(
    [Required, MaxLength(200)] string Name,
    [Required, RegularExpression("^(front|back|side|top)$", ErrorMessage = "templateType must be front, back, side, or top.")] string TemplateType,
    [Required, MaxLength(5_000_000)] string StrokesJson,
    [MaxLength(200_000)] string? ThumbnailDataUrl);
