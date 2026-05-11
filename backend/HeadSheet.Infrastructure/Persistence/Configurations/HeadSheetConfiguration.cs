using HeadSheetEntity = HeadSheet.Domain.Entities.HeadSheet;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HeadSheet.Infrastructure.Persistence.Configurations;

public class HeadSheetConfiguration : IEntityTypeConfiguration<HeadSheetEntity>
{
    public void Configure(EntityTypeBuilder<HeadSheetEntity> builder)
    {
        builder.ToTable("head_sheets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Name).HasColumnName("name").IsRequired().HasMaxLength(200).HasDefaultValue("Untitled Sheet");
        builder.Property(x => x.ClientName).HasColumnName("client_name").HasMaxLength(200);
        builder.Property(x => x.TemplateType).HasColumnName("template_type").IsRequired().HasMaxLength(20).HasDefaultValue("front");
        builder.Property(x => x.StrokesJson).HasColumnName("strokes_json").HasColumnType("jsonb").IsRequired().HasDefaultValueSql("'[]'::jsonb");
        builder.Property(x => x.ThumbnailUrl).HasColumnName("thumbnail_url");
        builder.Property(x => x.IsTemplate).HasColumnName("is_template").IsRequired().HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.IsDeleted).HasColumnName("is_deleted");

        builder.HasIndex(x => x.UserId).HasDatabaseName("IX_head_sheets_user_id");
        builder.HasIndex(x => new { x.UserId, x.ClientName }).HasDatabaseName("IX_head_sheets_client_name");
        builder.HasIndex(x => new { x.UserId, x.UpdatedAt }).HasDatabaseName("IX_head_sheets_updated_at");
        builder.HasIndex(x => new { x.UserId, x.IsTemplate, x.UpdatedAt }).HasDatabaseName("IX_head_sheets_templates");

        builder.HasQueryFilter(x => !x.IsDeleted);

        builder.HasOne(x => x.User)
               .WithMany()
               .HasForeignKey(x => x.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
