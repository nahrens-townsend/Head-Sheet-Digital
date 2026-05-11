using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HeadSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHeadSheetTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_template",
                table: "head_sheets",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_head_sheets_templates",
                table: "head_sheets",
                columns: new[] { "user_id", "is_template", "updated_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_head_sheets_templates",
                table: "head_sheets");

            migrationBuilder.DropColumn(
                name: "is_template",
                table: "head_sheets");
        }
    }
}
