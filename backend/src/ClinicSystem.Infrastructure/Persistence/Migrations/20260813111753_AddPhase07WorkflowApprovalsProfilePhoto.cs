using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase07WorkflowApprovalsProfilePhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FollowUpCompletedAtUtc",
                table: "PatientVisits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FollowUpCompletedByUserId",
                table: "PatientVisits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneCountryIso2",
                table: "Patients",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneE164",
                table: "Patients",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoContentType",
                table: "Doctors",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "ProfilePhotoData",
                table: "Doctors",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfilePhotoUpdatedAtUtc",
                table: "Doctors",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApprovalRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    RequestedAction = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PayloadJson = table.Column<string>(type: "jsonb", nullable: true),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequiredDoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_FollowUpAtUtc_FollowUpCompletedAtUtc",
                table: "PatientVisits",
                columns: new[] { "FollowUpAtUtc", "FollowUpCompletedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Patients_IsArchived_UpdatedAtUtc",
                table: "Patients",
                columns: new[] { "IsArchived", "UpdatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PhoneE164",
                table: "Patients",
                column: "PhoneE164");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_RequestType_EntityId_Status",
                table: "ApprovalRequests",
                columns: new[] { "RequestType", "EntityId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_RequiredDoctorId_Status_ExpiresAtUtc",
                table: "ApprovalRequests",
                columns: new[] { "RequiredDoctorId", "Status", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalRequests_Status_ExpiresAtUtc",
                table: "ApprovalRequests",
                columns: new[] { "Status", "ExpiresAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApprovalRequests");

            migrationBuilder.DropIndex(
                name: "IX_PatientVisits_FollowUpAtUtc_FollowUpCompletedAtUtc",
                table: "PatientVisits");

            migrationBuilder.DropIndex(
                name: "IX_Patients_IsArchived_UpdatedAtUtc",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_PhoneE164",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "FollowUpCompletedAtUtc",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "FollowUpCompletedByUserId",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "PhoneCountryIso2",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "PhoneE164",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoContentType",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoData",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoUpdatedAtUtc",
                table: "Doctors");
        }
    }
}
