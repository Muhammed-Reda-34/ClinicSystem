using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase13PreliminaryBookingDoctorScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DoctorId",
                table: "PreliminaryBookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_DoctorId",
                table: "PreliminaryBookings",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_PreliminaryBookings_DoctorId_VisitDate_VisitTime",
                table: "PreliminaryBookings",
                columns: new[] { "DoctorId", "VisitDate", "VisitTime" });

            migrationBuilder.AddForeignKey(
                name: "FK_PreliminaryBookings_Doctors_DoctorId",
                table: "PreliminaryBookings",
                column: "DoctorId",
                principalTable: "Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreliminaryBookings_Doctors_DoctorId",
                table: "PreliminaryBookings");

            migrationBuilder.DropIndex(
                name: "IX_PreliminaryBookings_DoctorId",
                table: "PreliminaryBookings");

            migrationBuilder.DropIndex(
                name: "IX_PreliminaryBookings_DoctorId_VisitDate_VisitTime",
                table: "PreliminaryBookings");

            migrationBuilder.DropColumn(
                name: "DoctorId",
                table: "PreliminaryBookings");
        }
    }
}
