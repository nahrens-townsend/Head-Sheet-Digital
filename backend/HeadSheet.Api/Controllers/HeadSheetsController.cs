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

        return Ok(ApiResponse.Ok(new HeadSheetResponseDto(
            sheet.Id, sheet.Name, sheet.ClientName, sheet.TemplateType,
            sheet.StrokesJson, sheet.ThumbnailUrl, sheet.CreatedAt, sheet.UpdatedAt)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateHeadSheetRequestDto dto, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var sheet = await headSheetService.CreateAsync(
            userId.Value,
            new CreateHeadSheetRequest(dto.Name ?? "Untitled Sheet", dto.ClientName, dto.TemplateType ?? "front", dto.TemplateId),
            ct);

        if (sheet is null && dto.TemplateId is not null)
        {
            return NotFound(ApiResponse.Fail<HeadSheetResponseDto>("Template not found."));
        }

        if (sheet is null)
        {
            return BadRequest(ApiResponse.Fail<HeadSheetResponseDto>("Could not create head sheet."));
        }

        var response = new HeadSheetResponseDto(
            sheet.Id, sheet.Name, sheet.ClientName, sheet.TemplateType,
            sheet.StrokesJson, sheet.ThumbnailUrl, sheet.CreatedAt, sheet.UpdatedAt);

        return CreatedAtAction(nameof(Get), new { id = sheet.Id }, ApiResponse.Ok(response));
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

        return Ok(ApiResponse.Ok(new HeadSheetResponseDto(
            sheet.Id, sheet.Name, sheet.ClientName, sheet.TemplateType,
            sheet.StrokesJson, sheet.ThumbnailUrl, sheet.CreatedAt, sheet.UpdatedAt)));
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

        return Ok(ApiResponse.Ok(new HeadSheetResponseDto(
            sheet.Id, sheet.Name, sheet.ClientName, sheet.TemplateType,
            sheet.StrokesJson, sheet.ThumbnailUrl, sheet.CreatedAt, sheet.UpdatedAt)));
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

        return Ok(ApiResponse.Ok(new HeadSheetResponseDto(
            result.Sheet!.Id, result.Sheet.Name, result.Sheet.ClientName, result.Sheet.TemplateType,
            result.Sheet.StrokesJson, result.Sheet.ThumbnailUrl, result.Sheet.CreatedAt, result.Sheet.UpdatedAt)));
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
