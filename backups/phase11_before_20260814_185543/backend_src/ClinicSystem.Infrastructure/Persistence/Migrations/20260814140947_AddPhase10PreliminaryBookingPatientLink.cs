using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase10PreliminaryBookingPatientLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PatientId",
                table: "PreliminaryBookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_PatientId",
                table: "PreliminaryBookings",
                column: "PatientId");

            migrationBuilder.AddForeignKey(
                name: "FK_PreliminaryBookings_Patients_PatientId",
                table: "PreliminaryBookings",
                column: "PatientId",
                principalTable: "Patients",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreliminaryBookings_Patients_PatientId",
                table: "PreliminaryBookings");

            migrationBuilder.DropIndex(
                name: "IX_PreliminaryBookings_PatientId",
                table: "PreliminaryBookings");

            migrationBuilder.DropColumn(
                name: "PatientId",
                table: "PreliminaryBookings");
        }
    }
}
