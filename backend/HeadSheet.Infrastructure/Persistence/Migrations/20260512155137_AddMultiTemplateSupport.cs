using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HeadSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTemplateSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "canvas_mode",
                table: "head_sheets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "templates");

            migrationBuilder.AddColumn<string>(
                name: "image_data_url",
                table: "head_sheets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "template_types_json",
                table: "head_sheets",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "canvas_mode",
                table: "head_sheets");

            migrationBuilder.DropColumn(
                name: "image_data_url",
                table: "head_sheets");

            migrationBuilder.DropColumn(
                name: "template_types_json",
                table: "head_sheets");
        }
    }
}
