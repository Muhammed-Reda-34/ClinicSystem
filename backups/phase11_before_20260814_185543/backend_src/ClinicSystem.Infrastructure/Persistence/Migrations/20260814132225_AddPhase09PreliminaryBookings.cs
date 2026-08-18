using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase09PreliminaryBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PreliminaryBookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "date", nullable: true),
                    VisitTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    AttendanceStatus = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreliminaryBookings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_AttendanceStatus",
                table: "PreliminaryBookings",
                column: "AttendanceStatus");

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_VisitDate",
                table: "PreliminaryBookings",
                column: "VisitDate");

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_VisitDate_VisitTime",
                table: "PreliminaryBookings",
                columns: new[] { "VisitDate", "VisitTime" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreliminaryBookings");
        }
    }
}
