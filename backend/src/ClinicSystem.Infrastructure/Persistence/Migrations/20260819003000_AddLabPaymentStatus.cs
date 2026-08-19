using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ClinicDbContext))]
[Migration("20260819003000_AddLabPaymentStatus")]
public partial class AddLabPaymentStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsPaid",
            table: "LabExpenses",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "PaidAtUtc",
            table: "LabExpenses",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "PaidByUserId",
            table: "LabExpenses",
            type: "uuid",
            nullable: true);

        // Existing lab expenses were already included in financial totals before
        // this migration, so preserve that accounting history as paid.
        migrationBuilder.Sql(
            """
            UPDATE "LabExpenses"
            SET "IsPaid" = TRUE,
                "PaidAtUtc" = "ExpenseDateUtc",
                "PaidByUserId" = "CreatedByUserId"
            WHERE "PaidAtUtc" IS NULL;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_LabExpenses_DoctorId_IsPaid_PaidAtUtc",
            table: "LabExpenses",
            columns: new[] { "DoctorId", "IsPaid", "PaidAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_LabExpenses_DoctorId_IsPaid_PaidAtUtc",
            table: "LabExpenses");

        migrationBuilder.DropColumn(
            name: "IsPaid",
            table: "LabExpenses");

        migrationBuilder.DropColumn(
            name: "PaidAtUtc",
            table: "LabExpenses");

        migrationBuilder.DropColumn(
            name: "PaidByUserId",
            table: "LabExpenses");
    }
}
