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

        return Ok(ApiResponse.Ok(ToResponseDto(sheet)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateHeadSheetRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var sheet = await headSheetService.CreateAsync(
            userId.Value,
            new CreateHeadSheetRequest(
                dto.Name ?? "Untitled Sheet",
                dto.ClientName,
                dto.TemplateType ?? "front",
                dto.TemplateTypes,
                dto.CanvasMode),
            ct);

        return CreatedAtAction(nameof(Get), new { id = sheet.Id }, ApiResponse.Ok(ToResponseDto(sheet)));
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

        return Ok(ApiResponse.Ok(ToResponseDto(sheet)));
    }

    [HttpPut("{id:guid}/strokes")]
    public async Task<IActionResult> SaveStrokes(
        Guid id, [FromBody] SaveStrokesRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        try { using var _ = System.Text.Json.JsonDocument.Parse(dto.StrokesJson); }
        catch (System.Text.Json.JsonException)
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("strokesJson must be valid JSON."));
        }

        var sheet = await headSheetService.SaveStrokesAsync(userId.Value, id, dto.StrokesJson, ct);
        if (sheet is null) return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));

        return Ok(ApiResponse.Ok(ToResponseDto(sheet)));
    }

    [HttpPut("{id:guid}/image")]
    public async Task<IActionResult> SaveImage(
        Guid id, [FromBody] SaveImageRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        if (!dto.ImageDataUrl.StartsWith("data:image/", StringComparison.Ordinal))
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("imageDataUrl must be an image data URL."));

        var sheet = await headSheetService.SaveImageAsync(userId.Value, id, dto.ImageDataUrl, ct);

        if (sheet is null)
        {
            var exists = await headSheetService.GetAsync(userId.Value, id, ct);
            if (exists is null)
                return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Head sheet not found."));
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("This head sheet is not in image mode."));
        }

        return Ok(ApiResponse.Ok(ToResponseDto(sheet)));
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

    private static HeadSheetResponseDto ToResponseDto(HeadSheetDto sheet) =>
        new(sheet.Id, sheet.Name, sheet.ClientName, sheet.TemplateType,
            sheet.TemplateTypes, sheet.CanvasMode, sheet.ImageDataUrl,
            sheet.StrokesJson, sheet.CreatedAt, sheet.UpdatedAt);
}
