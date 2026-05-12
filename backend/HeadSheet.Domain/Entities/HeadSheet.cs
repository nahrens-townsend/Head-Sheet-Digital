namespace HeadSheet.Domain.Entities;

public class HeadSheet
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "Untitled Sheet";
    public string? ClientName { get; set; }
    public string TemplateType { get; set; } = "front";
    /// <summary>JSON array of template types, e.g. ["front","back"]. Null = use legacy <see cref="TemplateType"/>.</summary>
    public string? TemplateTypesJson { get; set; }
    /// <summary>Canvas mode: "templates" or "image".</summary>
    public string CanvasMode { get; set; } = "templates";
    /// <summary>Base64 PNG data URL for image-mode canvases.</summary>
    public string? ImageDataUrl { get; set; }
    public string StrokesJson { get; set; } = "[]";
    public string? ThumbnailUrl { get; set; }
    public bool IsTemplate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public User User { get; set; } = null!;
}
