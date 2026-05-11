using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HeadSheet.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHeadSheets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "head_sheets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false, defaultValue: "Untitled Sheet"),
                    client_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    template_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "front"),
                    strokes_json = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_head_sheets", x => x.id);
                    table.ForeignKey(
                        name: "FK_head_sheets_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_head_sheets_client_name",
                table: "head_sheets",
                columns: new[] { "user_id", "client_name" });

            migrationBuilder.CreateIndex(
                name: "IX_head_sheets_updated_at",
                table: "head_sheets",
                columns: new[] { "user_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_head_sheets_user_id",
                table: "head_sheets",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "head_sheets");
        }
    }
}
