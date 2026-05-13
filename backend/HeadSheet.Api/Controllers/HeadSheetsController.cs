using HeadSheet.Api.Extensions;
using HeadSheet.Api.Models;
using HeadSheet.Api.Models.HeadSheets;
using HeadSheet.Application.HeadSheets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeadSheet.Api.Controllers;

[ApiController]
[Route("api/v1/head-sheets")]
[Authorize]
public class HeadSheetsController(IHeadSheetService headSheetService) : ControllerBase
{
    private static HeadSheetResponseDto ToResponse(HeadSheetDto s) =>
        new(s.Id, s.Name, s.ClientName, s.TemplateType, s.TemplateTypes,
            s.CanvasMode, s.ImageDataUrl, s.StrokesJson, s.ThumbnailUrl, s.CreatedAt, s.UpdatedAt);

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? clientName,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var result = await headSheetService.ListAsync(userId.Value, clientName, page, pageSize, ct);

        var dto = new PagedResponseDto<HeadSheetSummaryResponseDto>(
            result.Items.Select(x => new HeadSheetSummaryResponseDto(x.Id, x.Name, x.ClientName, x.TemplateType, x.ThumbnailUrl, x.UpdatedAt)).ToList(),
            result.TotalCount, result.Page, result.PageSize);

        return Ok(ApiResponse.Ok(dto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var sheet = await headSheetService.GetAsync(userId.Value, id, ct);
        if (sheet is null) return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));

        return Ok(ApiResponse.Ok(ToResponse(sheet)));
    }

    private static readonly string[] ValidTemplateTypes = ["front", "back", "side", "top"];

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateHeadSheetRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var canvasMode = dto.CanvasMode ?? "templates";

        if (dto.TemplateTypes is not null)
        {
            if (dto.TemplateTypes.Count == 0 || dto.TemplateTypes.Count > 4 ||
                dto.TemplateTypes.Any(t => !ValidTemplateTypes.Contains(t)))
            {
                return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>(
                    "Each templateType must be one of: front, back, side, top. At least 1 and at most 4."));
            }
        }

        if (canvasMode == "image")
        {
            if (string.IsNullOrWhiteSpace(dto.ImageDataUrl))
            {
                return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>(
                    "imageDataUrl is required when canvasMode is 'image'."));
            }
            if (!dto.ImageDataUrl.StartsWith("data:image/", StringComparison.Ordinal))
            {
                return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>(
                    "imageDataUrl must be an image data URL."));
            }
        }
        else
        {
            if (dto.TemplateTypes is null || dto.TemplateTypes.Count == 0)
            {
                return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>(
                    "templateTypes must be provided and non-empty when canvasMode is 'templates'."));
            }
        }

        var sheet = await headSheetService.CreateAsync(
            userId.Value,
            new CreateHeadSheetRequest(
                dto.Name ?? "Untitled Sheet",
                dto.ClientName,
                dto.TemplateType ?? "front",
                dto.TemplateId,
                dto.TemplateTypes,
                dto.CanvasMode,
                dto.ImageDataUrl),
            ct);

        if (sheet is null && dto.TemplateId is not null)
        {
            return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Template not found."));
        }

        if (sheet is null)
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("Could not create head sheet."));
        }

        return CreatedAtAction(nameof(Get), new { id = sheet.Id }, ApiResponse.Ok(ToResponse(sheet)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] UpdateHeadSheetRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var sheet = await headSheetService.UpdateAsync(
            userId.Value, id, new UpdateHeadSheetRequest(dto.Name, dto.ClientName), ct);

        if (sheet is null) return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));

        return Ok(ApiResponse.Ok(ToResponse(sheet)));
    }

    [HttpPut("{id:guid}/strokes")]
    public async Task<IActionResult> SaveStrokes(
        Guid id, [FromBody] SaveStrokesRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        // Validate JSON before hitting the jsonb column — malformed input would 500.
        try { using var _ = System.Text.Json.JsonDocument.Parse(dto.StrokesJson); }
        catch (System.Text.Json.JsonException)
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("strokesJson must be valid JSON."));
        }

        var sheet = await headSheetService.SaveStrokesAsync(userId.Value, id, dto.StrokesJson, ct);
        if (sheet is null) return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));

        return Ok(ApiResponse.Ok(ToResponse(sheet)));
    }

    [HttpPut("{id:guid}/thumbnail")]
    public async Task<IActionResult> SaveThumbnail(
        Guid id, [FromBody] SaveThumbnailRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        if (!dto.ThumbnailDataUrl.StartsWith("data:image/png;base64,", StringComparison.Ordinal))
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("thumbnailDataUrl must be a PNG data URL."));
        }

        var result = await headSheetService.SaveThumbnailAsync(
            userId.Value, id, dto.ThumbnailDataUrl, dto.ExpectedUpdatedAt, ct);

        if (result.Status == SaveThumbnailStatus.NotFound)
        {
            return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));
        }

        if (result.Status == SaveThumbnailStatus.Conflict)
        {
            return Conflict(ApiResponse.Fail<HeadSheetResponseDto>("Thumbnail is out of date."));
        }

        return Ok(ApiResponse.Ok(ToResponse(result.Sheet!)));
    }

    [HttpPut("{id:guid}/image")]
    public async Task<IActionResult> SaveImage(
        Guid id, [FromBody] SaveImageRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var existing = await headSheetService.GetAsync(userId.Value, id, ct);
        if (existing is null)
        {
            return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));
        }
        if (!string.Equals(existing.CanvasMode, "image", StringComparison.Ordinal))
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>(
                "Cannot update image unless canvasMode is 'image'."));
        }

        if (!dto.ImageDataUrl.StartsWith("data:image/", StringComparison.Ordinal))
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("imageDataUrl must be an image data URL."));
        }

        var sheet = await headSheetService.SaveImageAsync(userId.Value, id, dto.ImageDataUrl, ct);

        if (sheet is null)
        {
            return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));
        }

        return Ok(ApiResponse.Ok(ToResponse(sheet)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var deleted = await headSheetService.DeleteAsync(userId.Value, id, ct);
        if (!deleted) return NotFound(ApiResponse.Fail<object>("Head sheet not found."));

        return Ok(ApiResponse.Ok<object>(new { message = "Deleted." }));
    }
}
