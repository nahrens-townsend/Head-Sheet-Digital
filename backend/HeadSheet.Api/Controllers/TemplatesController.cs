using HeadSheet.Api.Extensions;
using HeadSheet.Api.Models;
using HeadSheet.Api.Models.HeadSheets;
using HeadSheet.Api.Models.Templates;
using HeadSheet.Application.Templates;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeadSheet.Api.Controllers;

[ApiController]
[Route("api/v1/templates")]
[Authorize]
public class TemplatesController(ITemplateService templateService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var templates = await templateService.ListAsync(userId.Value, ct);
        var dto = templates
            .Select(x => new HeadSheetSummaryResponseDto(x.Id, x.Name, x.ClientName, x.TemplateType, x.ThumbnailUrl, x.UpdatedAt))
            .ToList();

        return Ok(ApiResponse.Ok(dto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTemplateRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        try { using var _ = System.Text.Json.JsonDocument.Parse(dto.StrokesJson); }
        catch (System.Text.Json.JsonException)
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("strokesJson must be valid JSON."));
        }

        if (!string.IsNullOrWhiteSpace(dto.ThumbnailDataUrl) &&
            !dto.ThumbnailDataUrl.StartsWith("data:image/png;base64,", StringComparison.Ordinal))
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("thumbnailDataUrl must be a PNG data URL."));
        }

        var template = await templateService.CreateAsync(
            userId.Value,
            new CreateTemplateRequest(dto.Name, dto.TemplateType, dto.StrokesJson, dto.ThumbnailDataUrl),
            ct);

        return Ok(ApiResponse.Ok(new HeadSheetResponseDto(
            template.Id, template.Name, template.ClientName, template.TemplateType,
            template.StrokesJson, template.ThumbnailUrl, template.CreatedAt, template.UpdatedAt)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var deleted = await templateService.DeleteAsync(userId.Value, id, ct);
        if (!deleted) return NotFound(ApiResponse.Fail<object>("Template not found."));

        return Ok(ApiResponse.Ok<object>(new { message = "Deleted." }));
    }
}
