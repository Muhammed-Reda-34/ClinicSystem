using System;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ClinicDbContext))]
    [Migration("20260818134500_AddPhase14VisitRevisionAndTreatmentSessions")]
    public partial class AddPhase14VisitRevisionAndTreatmentSessions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVoided",
                table: "PatientVisits",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "VoidedAtUtc",
                table: "PatientVisits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VoidedByUserId",
                table: "PatientVisits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoidReason",
                table: "PatientVisits",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TreatmentCaseId",
                table: "VisitTreatmentItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionNumber",
                table: "VisitTreatmentItems",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<bool>(
                name: "CompletesTreatmentCase",
                table: "VisitTreatmentItems",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Existing treatment rows become one-session completed cases.
            migrationBuilder.Sql(
                "UPDATE \"VisitTreatmentItems\" SET \"TreatmentCaseId\" = \"Id\" WHERE \"TreatmentCaseId\" IS NULL;");

            migrationBuilder.AlterColumn<Guid>(
                name: "TreatmentCaseId",
                table: "VisitTreatmentItems",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_IsVoided_DoctorId_VisitDateUtc",
                table: "PatientVisits",
                columns: new[] { "IsVoided", "DoctorId", "VisitDateUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_VisitTreatmentItems_TreatmentCaseId_SessionNumber",
                table: "VisitTreatmentItems",
                columns: new[] { "TreatmentCaseId", "SessionNumber" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PatientVisits_IsVoided_DoctorId_VisitDateUtc",
                table: "PatientVisits");

            migrationBuilder.DropIndex(
                name: "IX_VisitTreatmentItems_TreatmentCaseId_SessionNumber",
                table: "VisitTreatmentItems");

            migrationBuilder.DropColumn(
                name: "IsVoided",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "VoidedAtUtc",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "VoidedByUserId",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "VoidReason",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "TreatmentCaseId",
                table: "VisitTreatmentItems");

            migrationBuilder.DropColumn(
                name: "SessionNumber",
                table: "VisitTreatmentItems");

            migrationBuilder.DropColumn(
                name: "CompletesTreatmentCase",
                table: "VisitTreatmentItems");
        }
    }
}
